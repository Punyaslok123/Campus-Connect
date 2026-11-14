# Campus Connect — Multi-Tenant College SaaS

A full-stack SaaS platform built for colleges. Multi-tenant, role-based, with real-time messaging and subscription billing.

---

## Tech Stack

| Layer        | Technology                                          |
|--------------|-----------------------------------------------------|
| Frontend     | React 18, Vite, Tailwind CSS, Zustand, React Query  |
| Backend      | Node.js, Express.js (MVC), Socket.io                |
| Database     | MongoDB + Mongoose                                  |
| Auth         | JWT (access 15m + refresh 7d httpOnly cookie)       |
| Payments     | Razorpay (order → verify → activate)                |
| Media        | Cloudinary (stream upload, no disk writes)          |
| Cron Jobs    | node-cron                                           |

---

## Project Structure

```
campus-connect/
├── models/              # 11 Mongoose schemas (shared between backend modules)
│   ├── College.model.js
│   ├── User.model.js
│   ├── Subscription.model.js
│   ├── Department.model.js
│   ├── Event.model.js
│   ├── Note.model.js
│   ├── Message.model.js
│   ├── Job.model.js
│   ├── MentorshipSession.model.js
│   ├── AuditLog.model.js
│   └── Notification.model.js
│
├── backend/
│   ├── server.js             # Entry point: DB → app → Socket.io → jobs → listen
│   ├── app.js                # Express factory with full security stack
│   ├── config/
│   │   ├── db.js             # Mongoose connection
│   │   ├── socket.js         # Socket.io init + JWT auth + event handlers
│   │   ├── cors.js           # Dynamic CORS with college domain cache
│   │   ├── helmet.js         # Hardened CSP + all security headers
│   │   ├── cloudinary.js     # Cloudinary SDK init
│   │   └── razorpay.js       # Razorpay SDK init
│   ├── middlewares/
│   │   ├── authenticate.js   # JWT → req.user
│   │   ├── checkRole.js      # RBAC factory: checkRole(['student','faculty'])
│   │   ├── checkSubscription.js  # 402 if expired (bypasses auth/renewal routes)
│   │   ├── rateLimiter.js    # global/auth/upload/strict limiters
│   │   ├── errorHandler.js   # Catch-all → standard { success, message, data, error }
│   │   ├── validateBody.js   # express-validator wrapper
│   │   ├── mongoSanitize.js  # NoSQL injection + HPP prevention
│   │   └── razorpayWebhook.js  # HMAC signature + replay attack guard
│   ├── modules/
│   │   ├── auth/             # register · login · refresh · logout · me
│   │   ├── subscription/     # create-order · verify-payment · status · history
│   │   └── notes/            # upload · list · my · getById · delete
│   ├── services/
│   │   └── socketService.js  # Singleton emitter (controllers never import io directly)
│   ├── jobs/
│   │   ├── subscriptionExpiry.job.js  # Daily 00:05 UTC: expire + notify + emit
│   │   └── ownerWeeklySummary.job.js  # Monday 08:00 UTC: email digest to Owner
│   └── utils/
│       ├── AppError.js           # Typed error classes
│       ├── asyncHandler.js       # Async route wrapper
│       ├── cloudinaryUpload.js   # Stream upload + delete helpers
│       ├── pagination.js         # skip/limit/meta helpers
│       ├── response.js           # sendSuccess / sendError
│       └── token.js              # JWT sign/verify + cookie helpers
│
└── frontend/
    └── src/
        ├── App.jsx               # Root: socket mount + sub warning banner + router
        ├── routes/AppRouter.jsx  # All role-gated routes
        ├── store/
        │   ├── authStore.js      # Zustand: user, accessToken, isAuth
        │   └── uiStore.js        # Zustand: sidebar, unreadCount, socket status
        ├── services/
        │   ├── api.js            # Axios + auto-refresh interceptors
        │   └── index.js          # All API service functions by domain
        ├── hooks/
        │   ├── useAuth.js        # useLogin, useRegister, useLogout, useMe
        │   ├── useSocket.js      # Socket.io lifecycle + all event handlers
        │   ├── useSubscription.js# isActive, daysRemaining, isWarning, isExpired
        │   └── useUtils.js       # usePagination, useDebounce
        ├── layouts/              # One layout per role (sidebar + topbar + outlet)
        │   ├── OwnerLayout.jsx   → deep navy sidebar
        │   ├── AdminLayout.jsx   → brand gradient sidebar + sub status footer
        │   ├── DeptAdminLayout.jsx → white + indigo, pending badge
        │   ├── StudentLayout.jsx → white + green
        │   ├── FacultyLayout.jsx → white + amber
        │   └── AlumniLayout.jsx  → white + purple
        ├── pages/                # One directory per role
        │   ├── auth/             # LoginPage, RegisterPage
        │   ├── owner/            # OwnerDashboard, CollegesList, OwnerAuditLogs
        │   ├── collegeAdmin/     # AdminDashboard, Departments, BillingPage
        │   ├── deptAdmin/        # DeptDashboard, PendingUsers
        │   ├── student/          # StudentDashboard, BrowseNotes, UploadNote
        │   ├── faculty/          # FacultyDashboard, ModerateNotes
        │   └── alumni/           # AlumniDashboard, PostJob, HostSession
        ├── components/
        │   ├── ui/index.jsx      # Button, Input, Badge, Modal, Table, EmptyState
        │   └── shared/           # NavItem, Topbar, NotificationCenter
        └── utils/helpers.js      # formatDate, formatINR, initials, timeAgo…
```

---

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd campus-connect
npm run install:all
```

### 2. Backend environment

```bash
cp backend/.env.example backend/.env
# Fill in: MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET,
#          CLOUDINARY_*, RAZORPAY_*, CLIENT_URL
```

### 3. Frontend environment

```bash
cp frontend/.env.example frontend/.env
# VITE_API_URL=http://localhost:5000/api
# VITE_SOCKET_URL=http://localhost:5000
```

### 4. Run

```bash
# Terminal 1 — Backend
npm run dev:backend

# Terminal 2 — Frontend
npm run dev:frontend
```

---

## Security layers (in order)

1. **Helmet** — CSP, HSTS, X-Frame, referrer, CORP headers
2. **CORS** — dynamic per-college domain allowlist, DB-cached for 10 min
3. **HPP** — collapses duplicate query params
4. **express-mongo-sanitize** — strips `$` / `.` keys (NoSQL injection)
5. **express-rate-limit** — 100/15min global, 10/15min auth, 5/15min strict
6. **authenticate** — JWT verify → `req.user = { _id, role, collegeId }`
7. **checkRole** — RBAC factory, validates role list at startup
8. **checkSubscription** — 402 if `endDate < now`, bypasses auth/renewal paths
9. **validateBody** — per-route express-validator chains
10. **Razorpay webhook** — HMAC-SHA256 + 5-min replay window + raw body guard

---

## API Response Shape

Every endpoint returns:

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": {},
  "error": null
}
```

---

## Subscription Plans

| Key  | Duration | Price (INR) | Per month |
|------|----------|-------------|-----------|
| `1m` | 1 month  | ₹499        | ₹499      |
| `6m` | 6 months | ₹2,499      | ₹417      |
| `1y` | 1 year   | ₹3,999      | ₹333      |
| `5y` | 5 years  | ₹14,999     | ₹250      |

---

## Cron Jobs

| Job                     | Schedule          | Action                                          |
|-------------------------|-------------------|-------------------------------------------------|
| Subscription Expiry     | Daily 00:05 UTC   | Expire subs, deactivate colleges, emit socket   |
| Expiry Warning          | Daily 00:05 UTC   | Push 14-day warning notifications               |
| Owner Weekly Summary    | Monday 08:00 UTC  | Email digest of platform health to all Owners   |

---

## Socket Events (server → client)

| Event                   | Room              | Trigger                              |
|-------------------------|-------------------|--------------------------------------|
| `notification:new`      | `room:user:{id}`  | Any new Notification document        |
| `message:receive`       | `room:user:{id}`  | New DM persisted                     |
| `message:status`        | `room:user:{id}`  | delivered / read receipt             |
| `event:published`       | `room:college:{id}` | New event created                  |
| `job:posted`            | `room:college:{id}` | New job/internship created          |
| `mentorship:new`        | `room:college:{id}` | New session scheduled               |
| `note:deleted`          | `room:college:{id}` | Note soft-deleted by faculty        |
| `subscription:expired`  | `room:college:{id}` | Cron marks subscription expired     |
| `subscription:warning`  | `room:college:{id}` | 14 days remaining                   |
| `auth:force_logout`     | `room:user:{id}`  | Owner deactivates user account       |
