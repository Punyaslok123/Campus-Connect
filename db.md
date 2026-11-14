# Campus Connect — Demo Database Documentation (`db.md`)

This document provides the complete inventory of all seeded colleges, departments, users, login credentials, and demonstration workflows available in the freshly initialized demonstration database.

---

## 🔑 Master Platform Super-Administrator (Owner)

The **Owner** is the multi-tenant SaaS administrator who manages colleges, approves custom domains, oversees subscription billing across tenants, responds to support tickets, and configures global subscription plans.

| Name | Email / Login | Password | Role | Scope | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Platform Owner** | `owner@campusconnect.dev` | `Admin@123456` | `owner` | Global Platform | Full SaaS Super-Admin Access |

---

## 🏫 College 1: Apex Institute of Technology (`apex.campusconnect.io` / Domain: `apex`)

* **Status**: `Active` (Active 1-Year Subscription with ~11 months remaining)
* **Features Enabled**: Messaging, Job Board, Mentorship, Analytics
* **Address**: Tech Park Road, Bangalore, Karnataka - 560100

### User Credentials & Roles

| Role | Name | Email / Login | Demo Password | Department / Association | State / Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **College Admin** | Sanjay Verma | `admin@apex.edu` | `Password@123` | Apex Main Campus | Active & Verified |
| **HOD (Dept Admin)** | Dr. Rajesh Sharma | `hod.cse@apex.edu` | `Password@123` | Computer Science & Engineering (`CSE`) | Active & Verified |
| **HOD (Dept Admin)** | Dr. Meera Krishnan | `hod.ece@apex.edu` | `Password@123` | Electronics & Communication (`ECE`) | Active & Verified |
| **Faculty** | Prof. Ananya Iyer | `faculty.cse1@apex.edu` | `Password@123` | CSE (DSA, Operating Systems) | Active & Verified |
| **Faculty** | Prof. Vikram Malhotra | `faculty.cse2@apex.edu` | `Password@123` | CSE (Database Systems) | Active & Verified |
| **Faculty** | Prof. Suresh Nair | `faculty.ece@apex.edu` | `Password@123` | ECE (Digital Signal Processing) | Active & Verified |
| **Student** | Aarav Patel | `student.cse1@apex.edu` | `Password@123` | CSE (Semester 3, Roll: `CS2101`) | **Active & Verified** |
| **Student** | Diya Sen | `student.cse2@apex.edu` | `Password@123` | CSE (Semester 5, Roll: `CS2004`) | **Active & Verified** |
| **Student (Pending)** | Rohan Gupta | `student.pending@apex.edu` | `Password@123` | CSE (Semester 3, Roll: `CS2145`) | **Pending Verification** (In HOD Queue) |
| **Student (Blocked)** | Karan Mehra | `student.blocked@apex.edu` | `Password@123` | CSE (Semester 5, Roll: `CS2099`) | **Deactivated / Inactive** (Access Blocked) |
| **Student** | Pooja Verma | `student.ece@apex.edu` | `Password@123` | ECE (Semester 5, Roll: `EC2012`) | **Active & Verified** |
| **Alumni** | Neha Kapoor | `alumni1@apex.edu` | `Password@123` | Google (SDE-II, Class of 2022) | Active & Verified |
| **Alumni** | Amitabh Roy | `alumni2@apex.edu` | `Password@123` | Microsoft (Senior Cloud Architect, 2020) | Active & Verified |

### Pre-Populated Resources for Apex
* **Departments**: `CSE` (Computer Science & Engineering), `ECE` (Electronics & Communication Engineering)
* **Subjects**: `CS301` (DSA - Sem 3), `CS401` (OS - Sem 4), `CS501` (DBMS - Sem 5), `EC501` (DSP - Sem 5)
* **Notes**:
  1. *Data Structures & Algorithms — Complete Unit 1 to 4 Notes* (Uploaded by Prof. Ananya Iyer)
  2. *Operating Systems — Concurrency, Virtual Memory & Deadlocks* (Uploaded by Diya Sen)
  3. *Digital Signal Processing — FFT, IIR & FIR Filter Design* (Uploaded by Prof. Suresh Nair)
* **Jobs & Internships**:
  1. *Software Development Engineer I (Cloud)* @ Google (Posted by Neha Kapoor)
  2. *Azure Cloud DevOps & Platform Engineering Intern* @ Microsoft (Posted by Amitabh Roy)
* **Mentorship Sessions**:
  1. *Cracking Tier-1 Tech Interviews & System Design Foundations* (Hosted by Neha Kapoor, Google)
  2. *From College Graduate to Senior Cloud Architect: Career Roadmap* (Hosted by Amitabh Roy, Microsoft)
* **Events**: *Apex Annual Hackathon 2026 — Innovate AI*, *CSE Workshop on Large Language Models & GenAI*
* **Announcements**: *End-Semester Examination Schedule Published*, *CSE Department Minor Project Phase-1 Presentation*
* **Support Ticket**: Ticket `#1` created by College Admin Sanjay Verma requesting SSL verification for `portal.apex.edu` (Status: `in_progress`).

---

## 🏫 College 2: Horizon University (`horizon.campusconnect.io` / Domain: `horizon`)

* **Status**: `Active` (Active 6-Month Subscription)
* **Features Enabled**: Messaging, Job Board, Mentorship
* **Address**: Knowledge Corridor, Pune, Maharashtra - 411057

### User Credentials & Roles

| Role | Name | Email / Login | Demo Password | Department / Association | State / Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **College Admin** | Dr. K.V. Ramanathan | `admin@horizon.edu` | `Password@123` | Horizon Main Campus | Active & Verified |
| **HOD (Dept Admin)** | Dr. Aruna Reddy | `hod.it@horizon.edu` | `Password@123` | Information Technology (`IT`) | Active & Verified |
| **Faculty** | Prof. Sunil Joshi | `faculty.it@horizon.edu` | `Password@123` | IT (Cloud Computing & DevOps) | Active & Verified |
| **Student** | Tanvi Deshmukh | `student.it1@horizon.edu` | `Password@123` | IT (Semester 4, Roll: `IT2208`) | **Active & Verified** |
| **Student (Pending)** | Aditya Rao | `student.it2@horizon.edu` | `Password@123` | IT (Semester 6, Roll: `IT2102`) | **Pending Verification** (In HOD Queue) |
| **Alumni** | Priyanka Chopra | `alumni.it@horizon.edu` | `Password@123` | AWS (Senior DevOps Lead, Class of 2021) | Active & Verified |

### Pre-Populated Resources for Horizon
* **Departments**: `IT` (Information Technology), `MECH` (Mechanical Engineering)
* **Jobs**: *Cloud & DevOps Engineer* @ Amazon (Posted by Priyanka Chopra)

---

## 🏫 College 3: Beacon Valley College (`beacon.campusconnect.io` / Domain: `beacon`)

* **Status**: `Inactive` / **Subscription Expired Demo** (Plan expired 15 days ago)
* **Purpose**: Demonstrates the subscription warning/expiry workflow, billing renewal flow, and locked feature states.
* **Address**: Hill View Campus, Dehradun, Uttarakhand - 248001

### User Credentials & Roles

| Role | Name | Email / Login | Demo Password | Department / Association | State / Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **College Admin** | Dr. H.S. Bhatia | `admin@beacon.edu` | `Password@123` | Beacon Valley Campus | **Expired Subscription State** |
| **HOD (Dept Admin)** | Dr. Sandeep Nair | `hod.bca@beacon.edu` | `Password@123` | Computer Applications (`BCA`) | Active |
| **Student** | Nikhil Bansal | `student.bca@beacon.edu` | `Password@123` | BCA (Semester 2, Roll: `BCA2301`) | Active |

---

## 🎯 Key Demonstration Scenarios to Test

### 1. Department Member Verification Flow
1. Log in as **HOD CSE** (`hod.cse@apex.edu` / `Password@123`).
2. Navigate to **Department Members / Pending Verifications**.
3. View student **Rohan Gupta** (`student.pending@apex.edu`), who is currently unverified.
4. Click **Approve / Verify** to activate the student account.

### 2. Subscription Expiry & Renewal Flow
1. Log in as **Beacon College Admin** (`admin@beacon.edu` / `Password@123`).
2. Notice the prominent **Subscription Expired** banner and restricted access indicators.
3. Navigate to **Billing & Subscriptions** to view plans and test renewal initiation.

### 3. Alumni Job Board & Mentorship Session Booking
1. Log in as **Student** (`student.cse1@apex.edu` / `Password@123`).
2. Navigate to **Mentorship Sessions** → View upcoming session *"Cracking Tier-1 Tech Interviews"* hosted by Google Engineer Neha Kapoor.
3. Navigate to **Job Opportunities** → View active listings with salary ranges and direct application links.
4. Download notes for **Data Structures** and **Operating Systems**.

### 4. Real-Time Chat & Direct Messaging
1. Open an incognito browser window and log in as **Aarav Patel** (`student.cse1@apex.edu`).
2. Open another window and log in as **Neha Kapoor** (`alumni1@apex.edu`).
3. Open the **Messages** screen to observe instant WebSocket messaging with delivery and read receipts.

### 5. Platform Super-Administrator (Owner) Overview
1. Log in as **Platform Owner** (`owner@campusconnect.dev` / `Admin@123456`).
2. View tenant statistics across **Apex**, **Horizon**, and **Beacon Valley**.
3. Manage support tickets, inspect subscriptions, and manage global plan pricing.
