/**
 * app.js — Express application factory
 */

import express               from 'express';
import cors                  from 'cors';
import helmet                from 'helmet';
import cookieParser          from 'cookie-parser';
import compression           from 'compression';
import mongoSanitize         from 'express-mongo-sanitize';
import hpp                   from 'hpp';

import path                  from 'path';
import { fileURLToPath }     from 'url';
import fs                    from 'fs';

import helmetConfig          from './config/helmet.js';
import corsOptions           from './config/cors.js';
import errorHandler          from './middlewares/errorHandler.js';

import authRoutes            from './modules/auth/auth.routes.js';
import subscriptionRoutes    from './modules/subscription/subscription.routes.js';
import notesRoutes           from './modules/notes/notes.routes.js';
import departmentsRoutes     from './modules/departments/departments.routes.js';
import usersRoutes           from './modules/users/users.routes.js';
import eventsRoutes          from './modules/events/events.routes.js';
import announcementsRoutes   from './modules/announcements/announcements.routes.js';
import settingsRoutes        from './modules/settings/settings.routes.js';
import messagesRoutes        from './modules/messages/messages.routes.js';
import supportRoutes         from './modules/support/support.routes.js';
import collegesRoutes        from './modules/colleges/colleges.routes.js';
import deptAdminRoutes       from './modules/deptAdmin/deptAdmin.routes.js';
import facultyRoutes         from './modules/faculty/faculty.routes.js';
import jobsRoutes            from './modules/jobs/jobs.routes.js';
import mentorshipRoutes      from './modules/mentorship/mentorship.routes.js';
import subjectsRoutes        from './modules/subjects/subjects.routes.js';

const { NODE_ENV } = process.env;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../frontend/dist');

const createApp = () => {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet(helmetConfig));
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  // Serve static assets from the frontend build if dist exists
  if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
  }

  app.use(express.json({ limit: '10mb', strict: true }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser(process.env.COOKIE_SECRET));

  app.use(mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) =>
      console.warn(`[Security] NoSQL injection sanitized. Key:"${key}" IP:${req.ip} Path:${req.originalUrl}`),
  }));

  app.use(hpp({ whitelist: ['tags', 'semester', 'sort'] }));
  app.use(compression({ threshold: 1024 }));

  app.get('/health', (_req, res) =>
    res.status(200).json({
      success: true, message: 'Campus Connect API is operational',
      timestamp: new Date().toISOString(), env: NODE_ENV,
    })
  );

  app.use('/api/auth',          authRoutes);
  app.use('/api/subscription',  subscriptionRoutes);
  app.use('/api/notes',         notesRoutes);
  app.use('/api/departments',   departmentsRoutes);
  app.use('/api/users',         usersRoutes);
  app.use('/api/events',        eventsRoutes);
  app.use('/api/announcements', announcementsRoutes);
  app.use('/api/settings',      settingsRoutes);
  app.use('/api/messages',      messagesRoutes);
  app.use('/api/support',       supportRoutes);
  app.use('/api/colleges',      collegesRoutes);
  app.use('/api/dept-admin',    deptAdminRoutes);
  app.use('/api/faculty',       facultyRoutes);
  app.use('/api/jobs',          jobsRoutes);
  app.use('/api/mentorship',    mentorshipRoutes);
  app.use('/api/subjects',      subjectsRoutes);

  // 404 for unhandled /api routes
  app.use('/api', (req, res) =>
    res.status(404).json({
      success: false,
      message: `Route ${req.method} ${req.originalUrl} not found`,
      data: null,
      error: { code: 'ROUTE_NOT_FOUND' },
    })
  );

  // SPA fallback for all frontend client-side routes
  if (fs.existsSync(frontendDistPath)) {
    app.get('*', (req, res) => {
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
  } else {
    app.use((req, res) =>
      res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
        data: null,
        error: { code: 'ROUTE_NOT_FOUND' },
      })
    );
  }

  app.use(errorHandler);
  return app;
};

export default createApp;
