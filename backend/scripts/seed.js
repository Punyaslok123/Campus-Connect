/**
 * scripts/seed.js
 * Database Reset and Comprehensive Initial Seed Script for Campus Connect.
 * Uses 100% Cloudinary-compliant image URLs and complete, interconnected data.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import {
  College,
  Plan,
  User,
  Subscription,
  Department,
  Subject,
  Note,
  Event,
  Announcement,
  Message,
  Job,
  MentorshipSession,
  SupportTicket,
  Notification,
  AuditLog,
} from '../models/index.js';

const { MONGODB_URI = 'mongodb://127.0.0.1:27017/campus-connect' } = process.env;

const DEMO_PASSWORD = 'Password@123';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'Admin@123456';
const OWNER_EMAIL    = process.env.OWNER_EMAIL || 'owner@campusconnect.dev';

// Standard Cloudinary Demo Assets (100% CSP Allowed & 200 HTTP Verified)
const IMAGES = {
  avatarFemale1: { url: 'https://res.cloudinary.com/demo/image/upload/c_thumb,g_face,w_300,h_300/r_max/lady.jpg', publicId: 'demo/lady' },
  avatarMale1:   { url: 'https://res.cloudinary.com/demo/image/upload/c_thumb,g_face,w_300,h_300/r_max/smiling_man.jpg', publicId: 'demo/smiling_man' },
  avatarNeutral: { url: 'https://res.cloudinary.com/demo/image/upload/c_thumb,g_face,w_300,h_300/r_max/face_left.png', publicId: 'demo/face_left' },
  collegeLogo:   { url: 'https://res.cloudinary.com/demo/image/upload/c_thumb,w_200,h_200/sample.jpg', publicId: 'demo/college_logo' },
  collegeCover:  { url: 'https://res.cloudinary.com/demo/image/upload/w_1200,h_400,c_fill/sample.jpg', publicId: 'demo/college_cover' },
  eventCover:    { url: 'https://res.cloudinary.com/demo/image/upload/w_800,h_450,c_fill/sample.jpg', publicId: 'demo/event_cover' },
  noteCover:     { url: 'https://res.cloudinary.com/demo/image/upload/w_800,h_450,c_fill/sample.jpg', publicId: 'demo/note_cover' },
};

async function seed() {
  console.log('[Seed] Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('[Seed] Connected.');

  console.log('[Seed] Resetting existing database collections...');
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    try {
      await collections[key].deleteMany({});
    } catch (err) {
      console.warn(`[Seed] Could not clear collection ${key}:`, err.message);
    }
  }
  console.log('[Seed] All collections cleared.');

  // ───────────────────────────────────────────────────────────────────────────
  // 1. SEED PLANS
  // ───────────────────────────────────────────────────────────────────────────
  console.log('[Seed] Seeding subscription plans...');
  await Plan.insertMany([
    { key: '1m', label: '1 Month',  durationMonths: 1,  priceINR: 499,   pricePaise: 49900,   highlight: false, sortOrder: 0, isActive: true },
    { key: '6m', label: '6 Months', durationMonths: 6,  priceINR: 2499,  pricePaise: 249900,  highlight: false, sortOrder: 1, isActive: true },
    { key: '1y', label: '1 Year',   durationMonths: 12, priceINR: 3999,  pricePaise: 399900,  highlight: true,  sortOrder: 2, isActive: true },
    { key: '5y', label: '5 Years',  durationMonths: 60, priceINR: 14999, pricePaise: 1499900, highlight: false, sortOrder: 3, isActive: true },
  ]);

  // ───────────────────────────────────────────────────────────────────────────
  // 2. SEED OWNER (SUPER-ADMIN)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('[Seed] Seeding platform owner...');
  const owner = await User.create({
    firstName:    'Platform',
    lastName:     'Owner',
    email:        OWNER_EMAIL,
    passwordHash: OWNER_PASSWORD,
    role:         'owner',
    collegeId:    null,
    departmentId: null,
    isVerified:   true,
    isActive:     true,
    profileImage: IMAGES.avatarMale1,
    bio:          'Campus Connect SaaS Super-Administrator',
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. SEED COLLEGE 1: Apex Institute of Technology (Active 1-Year Sub)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('[Seed] Seeding Apex Institute of Technology...');
  const collegeApex = await College.create({
    name:         'Apex Institute of Technology',
    domain:       'apex',
    contactEmail: 'contact@apex.edu',
    address:      'Tech Park Road, Bangalore, Karnataka - 560100',
    status:       'active',
    logo:         IMAGES.collegeLogo,
    coverImage:   IMAGES.collegeCover,
    features:     { messaging: true, jobBoard: true, mentorship: true, analytics: true },
  });

  // College Admin
  const adminApex = await User.create({
    firstName:    'Sanjay',
    lastName:     'Verma',
    email:        'admin@apex.edu',
    passwordHash: DEMO_PASSWORD,
    role:         'collegeAdmin',
    collegeId:    collegeApex._id,
    departmentId: null,
    isVerified:   true,
    isActive:     true,
    phone:        '+91 9876543210',
    bio:          'Dean & Administrator at Apex Institute of Technology',
    profileImage: IMAGES.avatarMale1,
  });

  // Active Subscription for Apex (~11 months remaining)
  const subApexStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const subApexEnd   = new Date(Date.now() + 335 * 24 * 60 * 60 * 1000);
  const subApex = await Subscription.create({
    collegeId:         collegeApex._id,
    purchasedBy:       adminApex._id,
    planType:          '1y',
    planLabel:         '1 Year',
    durationMonths:    12,
    amount:            399900,
    currency:          'INR',
    startDate:         subApexStart,
    endDate:           subApexEnd,
    status:            'active',
    razorpayOrderId:   'order_apex_demo_1y',
    razorpayPaymentId: 'pay_apex_demo_1y_success',
    razorpaySignature: 'sig_apex_demo_valid_hmac',
    gracePeriodDays:   0,
  });

  collegeApex.activeSubscriptionId = subApex._id;
  await collegeApex.save();

  // Departments for Apex
  const deptApexCSE = await Department.create({
    collegeId:   collegeApex._id,
    name:        'Computer Science & Engineering',
    code:        'CSE',
    description: 'Department of Computer Science, Software Engineering & AI',
    memberCount: 6,
    isActive:    true,
    isDeleted:   false,
  });

  const deptApexECE = await Department.create({
    collegeId:   collegeApex._id,
    name:        'Electronics & Communication Engineering',
    code:        'ECE',
    description: 'Department of Embedded Systems, VLSI & Signal Processing',
    memberCount: 3,
    isActive:    true,
    isDeleted:   false,
  });

  // Subjects for CSE
  await Subject.create({
    collegeId:    collegeApex._id,
    departmentId: deptApexCSE._id,
    name:         'Data Structures & Algorithms',
    code:         'CS301',
    semester:     3,
    isActive:     true,
  });
  await Subject.create({
    collegeId:    collegeApex._id,
    departmentId: deptApexCSE._id,
    name:         'Operating Systems',
    code:         'CS401',
    semester:     4,
    isActive:     true,
  });
  await Subject.create({
    collegeId:    collegeApex._id,
    departmentId: deptApexCSE._id,
    name:         'Database Management Systems',
    code:         'CS501',
    semester:     5,
    isActive:     true,
  });

  // Subjects for ECE
  await Subject.create({
    collegeId:    collegeApex._id,
    departmentId: deptApexECE._id,
    name:         'Digital Signal Processing',
    code:         'EC501',
    semester:     5,
    isActive:     true,
  });

  // HOD CSE
  const hodApexCSE = await User.create({
    firstName:    'Dr. Rajesh',
    lastName:     'Sharma',
    email:        'hod.cse@apex.edu',
    passwordHash: DEMO_PASSWORD,
    role:         'deptAdmin',
    collegeId:    collegeApex._id,
    departmentId: deptApexCSE._id,
    isVerified:   true,
    isActive:     true,
    designation:  'Professor & Head of Department',
    profileImage: IMAGES.avatarMale1,
    bio:          '20+ years of research and teaching in Distributed Systems and Algorithms.',
  });
  deptApexCSE.adminUserId = hodApexCSE._id;
  await deptApexCSE.save();

  // HOD ECE
  const hodApexECE = await User.create({
    firstName:    'Dr. Meera',
    lastName:     'Krishnan',
    email:        'hod.ece@apex.edu',
    passwordHash: DEMO_PASSWORD,
    role:         'deptAdmin',
    collegeId:    collegeApex._id,
    departmentId: deptApexECE._id,
    isVerified:   true,
    isActive:     true,
    designation:  'Professor & HOD (ECE)',
    profileImage: IMAGES.avatarFemale1,
    bio:          'Specialist in VLSI Architectures and Embedded IoT Systems.',
  });
  deptApexECE.adminUserId = hodApexECE._id;
  await deptApexECE.save();

  // Faculty Members
  const facultyApex1 = await User.create({
    firstName:        'Prof. Ananya',
    lastName:         'Iyer',
    email:            'faculty.cse1@apex.edu',
    passwordHash:     DEMO_PASSWORD,
    role:             'faculty',
    collegeId:        collegeApex._id,
    departmentId:     deptApexCSE._id,
    isVerified:       true,
    isActive:         true,
    designation:      'Associate Professor',
    assignedSubjects: [
      { name: 'Data Structures & Algorithms', code: 'CS301', semester: 3 },
      { name: 'Operating Systems', code: 'CS401', semester: 4 },
    ],
    profileImage:     IMAGES.avatarFemale1,
  });

  await User.create({
    firstName:        'Prof. Vikram',
    lastName:         'Malhotra',
    email:            'faculty.cse2@apex.edu',
    passwordHash:     DEMO_PASSWORD,
    role:             'faculty',
    collegeId:        collegeApex._id,
    departmentId:     deptApexCSE._id,
    isVerified:       true,
    isActive:         true,
    designation:      'Assistant Professor',
    assignedSubjects: [
      { name: 'Database Management Systems', code: 'CS501', semester: 5 },
    ],
    profileImage:     IMAGES.avatarMale1,
  });

  const facultyApexECE = await User.create({
    firstName:        'Prof. Suresh',
    lastName:         'Nair',
    email:            'faculty.ece@apex.edu',
    passwordHash:     DEMO_PASSWORD,
    role:             'faculty',
    collegeId:        collegeApex._id,
    departmentId:     deptApexECE._id,
    isVerified:       true,
    isActive:         true,
    designation:      'Assistant Professor',
    assignedSubjects: [
      { name: 'Digital Signal Processing', code: 'EC501', semester: 5 },
    ],
    profileImage:     IMAGES.avatarMale1,
  });

  // Students (CSE)
  const studentApex1 = await User.create({
    firstName:    'Aarav',
    lastName:     'Patel',
    email:        'student.cse1@apex.edu',
    passwordHash: DEMO_PASSWORD,
    role:         'student',
    collegeId:    collegeApex._id,
    departmentId: deptApexCSE._id,
    isVerified:   true,
    isActive:     true,
    semester:     3,
    rollNumber:   'CS2101',
    profileImage: IMAGES.avatarMale1,
  });

  const studentApex2 = await User.create({
    firstName:    'Diya',
    lastName:     'Sen',
    email:        'student.cse2@apex.edu',
    passwordHash: DEMO_PASSWORD,
    role:         'student',
    collegeId:    collegeApex._id,
    departmentId: deptApexCSE._id,
    isVerified:   true,
    isActive:     true,
    semester:     5,
    rollNumber:   'CS2004',
    profileImage: IMAGES.avatarFemale1,
  });

  // Pending Student
  await User.create({
    firstName:    'Rohan',
    lastName:     'Gupta',
    email:        'student.pending@apex.edu',
    passwordHash: DEMO_PASSWORD,
    role:         'student',
    collegeId:    collegeApex._id,
    departmentId: deptApexCSE._id,
    isVerified:   false, // PENDING
    isActive:     true,
    semester:     3,
    rollNumber:   'CS2145',
    profileImage: IMAGES.avatarNeutral,
  });

  // Blocked Student
  await User.create({
    firstName:    'Karan',
    lastName:     'Mehra',
    email:        'student.blocked@apex.edu',
    passwordHash: DEMO_PASSWORD,
    role:         'student',
    collegeId:    collegeApex._id,
    departmentId: deptApexCSE._id,
    isVerified:   true,
    isActive:     false, // DEACTIVATED
    semester:     5,
    rollNumber:   'CS2099',
    profileImage: IMAGES.avatarNeutral,
  });

  // Student (ECE)
  const studentApexECE = await User.create({
    firstName:    'Pooja',
    lastName:     'Verma',
    email:        'student.ece@apex.edu',
    passwordHash: DEMO_PASSWORD,
    role:         'student',
    collegeId:    collegeApex._id,
    departmentId: deptApexECE._id,
    isVerified:   true,
    isActive:     true,
    semester:     5,
    rollNumber:   'EC2012',
    profileImage: IMAGES.avatarFemale1,
  });

  // Alumni (Apex)
  const alumniApex1 = await User.create({
    firstName:      'Neha',
    lastName:       'Kapoor',
    email:          'alumni1@apex.edu',
    passwordHash:   DEMO_PASSWORD,
    role:           'alumni',
    collegeId:      collegeApex._id,
    departmentId:   deptApexCSE._id,
    isVerified:     true,
    isActive:       true,
    graduationYear: 2022,
    currentCompany: 'Google',
    currentRole:    'Software Engineer II',
    linkedInUrl:    'https://linkedin.com/in/demo-neha-kapoor',
    bio:            'Apex CSE Alum (2022). Working on Google Cloud Networking. Passionate about mentoring students in DSA and System Design.',
    profileImage:   IMAGES.avatarFemale1,
  });

  const alumniApex2 = await User.create({
    firstName:      'Amitabh',
    lastName:       'Roy',
    email:          'alumni2@apex.edu',
    passwordHash:   DEMO_PASSWORD,
    role:           'alumni',
    collegeId:      collegeApex._id,
    departmentId:   deptApexCSE._id,
    isVerified:     true,
    isActive:       true,
    graduationYear: 2020,
    currentCompany: 'Microsoft',
    currentRole:    'Senior Cloud Architect',
    linkedInUrl:    'https://linkedin.com/in/demo-amitabh-roy',
    bio:            'Apex Alum (2020). Helping undergraduates break into cloud engineering and distributed computing.',
    profileImage:   IMAGES.avatarMale1,
  });

  // Notes for Apex
  await Note.create({
    title:        'Data Structures & Algorithms — Complete Unit 1 to 4 Notes',
    subject:      'Data Structures & Algorithms',
    subjectCode:  'CS301',
    semester:     3,
    departmentId: deptApexCSE._id,
    collegeId:    collegeApex._id,
    uploadedBy:   facultyApex1._id,
    uploaderRole: 'faculty',
    description:  'Comprehensive handwritten notes covering Trees, Graphs, Dynamic Programming, and Heap algorithms with time-complexity proofs.',
    tags:         ['DSA', 'Trees', 'Graphs', 'DP', 'Algorithms'],
    units:        [1, 2, 3, 4],
    fileUrl: {
      url:          'https://res.cloudinary.com/demo/image/upload/sample.pdf',
      publicId:     'seed/notes/dsa_unit14',
      format:       'pdf',
      bytes:        4829100,
      pages:        42,
      resourceType: 'raw',
      originalName: 'DSA_Comprehensive_Units_1-4.pdf',
      mimetype:     'application/pdf',
    },
    coverImage:    IMAGES.noteCover,
    downloadCount: 48,
    viewCount:     192,
    isDeleted:     false,
  });

  await Note.create({
    title:        'Operating Systems — Concurrency, Virtual Memory & Deadlocks',
    subject:      'Operating Systems',
    subjectCode:  'CS401',
    semester:     4,
    departmentId: deptApexCSE._id,
    collegeId:    collegeApex._id,
    uploadedBy:   studentApex2._id,
    uploaderRole: 'student',
    description:  'Summary cheat-sheet on Process Synchronization, Semaphores, Page Replacement Algorithms, and Bankers Algorithm.',
    tags:         ['OS', 'Concurrency', 'Deadlocks', 'Paging'],
    units:        [2, 3],
    fileUrl: {
      url:          'https://res.cloudinary.com/demo/image/upload/sample.pdf',
      publicId:     'seed/notes/os_notes',
      format:       'pdf',
      bytes:        2105000,
      pages:        24,
      resourceType: 'raw',
      originalName: 'OS_Concurrency_Notes.pdf',
      mimetype:     'application/pdf',
    },
    coverImage:    IMAGES.noteCover,
    downloadCount: 29,
    viewCount:     115,
    isDeleted:     false,
  });

  await Note.create({
    title:        'Digital Signal Processing — FFT, IIR & FIR Filter Design',
    subject:      'Digital Signal Processing',
    subjectCode:  'EC501',
    semester:     5,
    departmentId: deptApexECE._id,
    collegeId:    collegeApex._id,
    uploadedBy:   facultyApexECE._id,
    uploaderRole: 'faculty',
    description:  'Complete derivations and MATLAB simulation code for Butterworth and Chebyshev filter designs.',
    tags:         ['DSP', 'Filters', 'FFT', 'MATLAB'],
    units:        [1, 2, 3],
    fileUrl: {
      url:          'https://res.cloudinary.com/demo/image/upload/sample.pdf',
      publicId:     'seed/notes/dsp_notes',
      format:       'pdf',
      bytes:        3400000,
      pages:        30,
      resourceType: 'raw',
      originalName: 'DSP_Filter_Design_Notes.pdf',
      mimetype:     'application/pdf',
    },
    coverImage:    IMAGES.noteCover,
    downloadCount: 16,
    viewCount:     74,
    isDeleted:     false,
  });

  // Jobs posted by Alumni
  await Job.create({
    collegeId:   collegeApex._id,
    departmentId: deptApexCSE._id,
    postedBy:    alumniApex1._id,
    title:       'Software Development Engineer I (Cloud)',
    company:     'Google',
    type:        'job',
    location:    'Bangalore, India (Hybrid)',
    isRemote:    false,
    salaryRange: { min: 2400000, max: 3200000, currency: 'INR', period: 'annually' },
    deadline:    new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    applyLink:   'https://careers.google.com/jobs/results',
    description: 'Looking for 2024/2025 graduates with strong problem-solving skills in C++, Java, or Go. Deep understanding of data structures, algorithms, and distributed systems required.',
    skills:      ['C++', 'Java', 'Algorithms', 'Distributed Systems', 'GCP'],
    status:      'active',
    viewCount:   85,
  });

  await Job.create({
    collegeId:   collegeApex._id,
    departmentId: deptApexCSE._id,
    postedBy:    alumniApex2._id,
    title:       'Azure Cloud DevOps & Platform Engineering Intern',
    company:     'Microsoft',
    type:        'internship',
    location:    'Hyderabad, India',
    isRemote:    true,
    duration:    '6 months',
    salaryRange: { min: 60000, max: 75000, currency: 'INR', period: 'monthly' },
    deadline:    new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    applyLink:   'https://careers.microsoft.com',
    description: '6-month summer internship for 3rd/4th year students. Hands-on experience with Azure, Docker, Kubernetes, and CI/CD pipelines.',
    skills:      ['Azure', 'Docker', 'Kubernetes', 'Linux', 'Python'],
    status:      'active',
    viewCount:   120,
  });

  // Mentorship Sessions hosted by Alumni (scheduled)
  await MentorshipSession.create({
    collegeId:        collegeApex._id,
    hostId:           alumniApex1._id,
    departmentId:     deptApexCSE._id,
    title:            'Cracking Tier-1 Tech Interviews & System Design Foundations',
    description:      'In this 90-minute live session, I will walk you through real FAANG interview loops, dynamic programming patterns, and how to structure your resume for maximum shortlisting.',
    topics:           ['Interview Prep', 'DSA', 'System Design', 'Resume Building'],
    scheduledAt:      new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    durationMinutes:  90,
    meetingLink:      'https://meet.google.com/abc-demo-session',
    meetingPlatform:  'google_meet',
    maxAttendees:     50,
    attendees: [
      { userId: studentApex1._id, registeredAt: new Date() },
      { userId: studentApex2._id, registeredAt: new Date() },
    ],
    status:           'scheduled',
  });

  await MentorshipSession.create({
    collegeId:        collegeApex._id,
    hostId:           alumniApex2._id,
    departmentId:     deptApexCSE._id,
    title:            'From College Graduate to Senior Cloud Architect: Career Roadmap',
    description:      'A comprehensive session on certifications (AWS/Azure), open-source contributions, and landing high-paying cloud roles straight out of campus.',
    topics:           ['Cloud Architecture', 'AWS', 'Azure', 'Career Growth'],
    scheduledAt:      new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    durationMinutes:  60,
    meetingLink:      'https://teams.microsoft.com/l/meetup-join/demo',
    meetingPlatform:  'ms_teams',
    maxAttendees:     75,
    attendees: [
      { userId: studentApex1._id, registeredAt: new Date() },
      { userId: studentApexECE._id, registeredAt: new Date() },
    ],
    status:           'scheduled',
  });

  // Events (Apex)
  await Event.create({
    title:          'Apex Annual Hackathon 2026 — Innovate AI',
    description:    '36-hour flagship hackathon organized for all engineering departments. Grand prize pool of ₹1,50,000.',
    scheduledAt:    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    endsAt:         new Date(Date.now() + 17 * 24 * 60 * 60 * 1000),
    venue:          'Main Campus Auditorium & Innovation Labs',
    meetingLink:    null,
    isOnline:       false,
    collegeId:      collegeApex._id,
    organizerType:  'college',
    organizerId:    collegeApex._id,
    organizerModel: 'College',
    departmentId:   null,
    createdBy:      adminApex._id,
    status:         'published',
    coverImage:     IMAGES.eventCover,
  });

  await Event.create({
    title:          'CSE Workshop on Large Language Models & GenAI',
    description:    'Hands-on workshop on LangChain, vector databases, and fine-tuning open-source models with PyTorch.',
    scheduledAt:    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    endsAt:         new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 3600 * 1000),
    venue:          'CSE Seminar Hall 2',
    isOnline:       false,
    collegeId:      collegeApex._id,
    organizerType:  'department',
    organizerId:    deptApexCSE._id,
    organizerModel: 'Department',
    departmentId:   deptApexCSE._id,
    createdBy:      hodApexCSE._id,
    status:         'published',
    coverImage:     IMAGES.eventCover,
  });

  // Announcements (Apex)
  await Announcement.create({
    title:        'End-Semester Examination Schedule & Hall Ticket Download',
    body:         'All students are hereby notified that the end-semester theoretical and practical examinations will commence next month. Please verify your attendance percentage before applying for hall tickets.',
    audience:     'college',
    departmentId: null,
    isPinned:     true,
    collegeId:    collegeApex._id,
    postedBy:     adminApex._id,
  });

  await Announcement.create({
    title:        'CSE Department Minor Project Phase-1 Presentation',
    body:         '3rd year CSE students must submit their project synopsis and guide approval by Friday 5:00 PM.',
    audience:     'department',
    departmentId: deptApexCSE._id,
    isPinned:     false,
    collegeId:    collegeApex._id,
    postedBy:     hodApexCSE._id,
  });

  // Support Ticket
  await SupportTicket.create({
    collegeId:   collegeApex._id,
    raisedBy:    adminApex._id,
    subject:     'Requesting assistance with Custom Domain SSL setup (portal.apex.edu)',
    description: 'We have updated our CNAME records to point to campusconnect.io. Could the platform team verify whether the SSL certificate provision is complete?',
    status:      'in_progress',
    messages: [
      {
        senderId:   adminApex._id,
        senderRole: 'collegeAdmin',
        body:       'We pointed portal.apex.edu CNAME to your cluster 24 hours ago.',
        createdAt:  new Date(Date.now() - 24 * 3600 * 1000),
      },
      {
        senderId:   owner._id,
        senderRole: 'owner',
        body:       'We have verified the CNAME record. The SSL certificate is being provisioned via Cloudflare and will be live within 2 hours.',
        createdAt:  new Date(Date.now() - 12 * 3600 * 1000),
      },
    ],
  });

  // Direct Messages (Student <-> Alumni)
  const convKey1 = [studentApex1._id.toString(), alumniApex1._id.toString()].sort().join('_');
  await Message.create([
    {
      senderId:        studentApex1._id,
      receiverId:      alumniApex1._id,
      collegeId:       collegeApex._id,
      conversationKey: convKey1,
      content:         'Hello Neha maam! I registered for your interview workshop. Could you share which LeetCode list I should practice first?',
      isRead:          true,
      readAt:          new Date(),
      createdAt:       new Date(Date.now() - 2 * 3600 * 1000),
    },
    {
      senderId:        alumniApex1._id,
      receiverId:      studentApex1._id,
      collegeId:       collegeApex._id,
      conversationKey: convKey1,
      content:         'Hi Aarav! Focus on the Blind 75 list, specifically Tree traversals, Graph BFS/DFS, and 2-pointer problems. We will cover dynamic programming live!',
      isRead:          false,
      createdAt:       new Date(Date.now() - 30 * 60 * 1000),
    },
  ]);

  // Notifications
  await Notification.create([
    {
      userId:    studentApex1._id,
      collegeId: collegeApex._id,
      type:      'NEW_EVENT',
      title:     'New Event Published',
      message:   'Apex Annual Hackathon 2026 registration is now open.',
      actionUrl: '/student/events',
      isRead:    false,
      priority:  'normal',
    },
    {
      userId:    adminApex._id,
      collegeId: collegeApex._id,
      type:      'WELCOME',
      title:     'Welcome to Campus Connect',
      message:   'Your college subscription has been initialized and activated.',
      actionUrl: '/billing',
      isRead:    true,
      priority:  'normal',
    },
  ]);

  // ───────────────────────────────────────────────────────────────────────────
  // 4. SEED COLLEGE 2: Horizon University (Active 6-Month Sub)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('[Seed] Seeding Horizon University...');
  const collegeHorizon = await College.create({
    name:         'Horizon University',
    domain:       'horizon',
    contactEmail: 'info@horizon.edu',
    address:      'Knowledge Corridor, Pune, Maharashtra - 411057',
    status:       'active',
    logo:         IMAGES.collegeLogo,
    coverImage:   IMAGES.collegeCover,
    features:     { messaging: true, jobBoard: true, mentorship: true, analytics: false },
  });

  const adminHorizon = await User.create({
    firstName:    'Dr. K.V.',
    lastName:     'Ramanathan',
    email:        'admin@horizon.edu',
    passwordHash: DEMO_PASSWORD,
    role:         'collegeAdmin',
    collegeId:    collegeHorizon._id,
    departmentId: null,
    isVerified:   true,
    isActive:     true,
    phone:        '+91 9123456789',
    bio:          'Registrar & Administrator at Horizon University',
    profileImage: IMAGES.avatarMale1,
  });

  const subHorizon = await Subscription.create({
    collegeId:         collegeHorizon._id,
    purchasedBy:       adminHorizon._id,
    planType:          '6m',
    planLabel:         '6 Months',
    durationMonths:    6,
    amount:            249900,
    currency:          'INR',
    startDate:         new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    endDate:           new Date(Date.now() + 165 * 24 * 60 * 60 * 1000),
    status:            'active',
    razorpayOrderId:   'order_horizon_demo_6m',
    razorpayPaymentId: 'pay_horizon_demo_6m_success',
    razorpaySignature: 'sig_horizon_demo_valid',
    gracePeriodDays:   0,
  });

  collegeHorizon.activeSubscriptionId = subHorizon._id;
  await collegeHorizon.save();

  const deptHorizonIT = await Department.create({
    collegeId:   collegeHorizon._id,
    name:        'Information Technology',
    code:        'IT',
    description: 'Department of Software Systems, Web Engineering & Cybersecurity',
    memberCount: 3,
    isActive:    true,
  });

  const deptHorizonMech = await Department.create({
    collegeId:   collegeHorizon._id,
    name:        'Mechanical Engineering',
    code:        'MECH',
    description: 'Department of Thermal, Robotics & Automobile Design',
    memberCount: 2,
    isActive:    true,
  });

  // HOD IT
  const hodHorizonIT = await User.create({
    firstName:    'Dr. Aruna',
    lastName:     'Reddy',
    email:        'hod.it@horizon.edu',
    passwordHash: DEMO_PASSWORD,
    role:         'deptAdmin',
    collegeId:    collegeHorizon._id,
    departmentId: deptHorizonIT._id,
    isVerified:   true,
    isActive:     true,
    designation:  'Professor & HOD (IT)',
    profileImage: IMAGES.avatarFemale1,
  });
  deptHorizonIT.adminUserId = hodHorizonIT._id;
  await deptHorizonIT.save();

  // Faculty IT
  await User.create({
    firstName:        'Prof. Sunil',
    lastName:         'Joshi',
    email:            'faculty.it@horizon.edu',
    passwordHash:     DEMO_PASSWORD,
    role:             'faculty',
    collegeId:        collegeHorizon._id,
    departmentId:     deptHorizonIT._id,
    isVerified:       true,
    isActive:         true,
    designation:      'Assistant Professor',
    assignedSubjects: [
      { name: 'Cloud Computing & DevOps', code: 'IT401', semester: 4 },
    ],
    profileImage:     IMAGES.avatarMale1,
  });

  // Student IT
  await User.create({
    firstName:    'Tanvi',
    lastName:     'Deshmukh',
    email:        'student.it1@horizon.edu',
    passwordHash: DEMO_PASSWORD,
    role:         'student',
    collegeId:    collegeHorizon._id,
    departmentId: deptHorizonIT._id,
    isVerified:   true,
    isActive:     true,
    semester:     4,
    rollNumber:   'IT2208',
    profileImage: IMAGES.avatarFemale1,
  });

  // Student IT (Pending Queue)
  await User.create({
    firstName:    'Aditya',
    lastName:     'Rao',
    email:        'student.it2@horizon.edu',
    passwordHash: DEMO_PASSWORD,
    role:         'student',
    collegeId:    collegeHorizon._id,
    departmentId: deptHorizonIT._id,
    isVerified:   false, // PENDING
    isActive:     true,
    semester:     6,
    rollNumber:   'IT2102',
    profileImage: IMAGES.avatarNeutral,
  });

  // Alumni IT
  const alumniHorizon = await User.create({
    firstName:      'Priyanka',
    lastName:       'Chopra',
    email:          'alumni.it@horizon.edu',
    passwordHash:   DEMO_PASSWORD,
    role:           'alumni',
    collegeId:      collegeHorizon._id,
    departmentId:   deptHorizonIT._id,
    isVerified:     true,
    isActive:       true,
    graduationYear: 2021,
    currentCompany: 'Amazon Web Services (AWS)',
    currentRole:    'Senior DevOps Lead',
    linkedInUrl:    'https://linkedin.com/in/demo-priyanka-chopra',
    profileImage:   IMAGES.avatarFemale1,
  });

  // Job by Horizon Alumni
  await Job.create({
    collegeId:    collegeHorizon._id,
    departmentId: deptHorizonIT._id,
    postedBy:     alumniHorizon._id,
    title:        'Cloud & DevOps Engineer',
    company:      'Amazon',
    type:         'job',
    location:     'Hyderabad (Hybrid)',
    isRemote:     true,
    salaryRange:  { min: 1800000, max: 2600000, currency: 'INR', period: 'annually' },
    deadline:     new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    applyLink:    'https://amazon.jobs',
    description:  'Join the AWS infrastructure automation team. Experience in Terraform, Python scripting, and Kubernetes is highly valued.',
    skills:       ['Terraform', 'AWS', 'Kubernetes', 'Python', 'CI/CD'],
    status:       'active',
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. SEED COLLEGE 3: Beacon Valley College (Expired / Restricted State)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('[Seed] Seeding Beacon Valley College (Expired Plan)...');
  const collegeBeacon = await College.create({
    name:         'Beacon Valley College',
    domain:       'beacon',
    contactEmail: 'dean@beacon.edu',
    address:      'Hill View Campus, Dehradun, Uttarakhand - 248001',
    status:       'inactive', // EXPIRED / INACTIVE
    statusReason: 'Subscription expired',
    logo:         IMAGES.collegeLogo,
    coverImage:   IMAGES.collegeCover,
  });

  const adminBeacon = await User.create({
    firstName:    'Dr. H.S.',
    lastName:     'Bhatia',
    email:        'admin@beacon.edu',
    passwordHash: DEMO_PASSWORD,
    role:         'collegeAdmin',
    collegeId:    collegeBeacon._id,
    departmentId: null,
    isVerified:   true,
    isActive:     true,
    bio:          'Administrator at Beacon Valley College',
    profileImage: IMAGES.avatarMale1,
  });

  // Expired subscription from 15 days ago
  const subBeacon = await Subscription.create({
    collegeId:         collegeBeacon._id,
    purchasedBy:       adminBeacon._id,
    planType:          '1m',
    planLabel:         '1 Month',
    durationMonths:    1,
    amount:            49900,
    currency:          'INR',
    startDate:         new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    endDate:           new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    status:            'expired',
    razorpayOrderId:   'order_beacon_demo_expired',
    razorpayPaymentId: 'pay_beacon_demo_expired',
    gracePeriodDays:   0,
  });

  const deptBeaconBCA = await Department.create({
    collegeId:   collegeBeacon._id,
    name:        'Computer Applications',
    code:        'BCA',
    description: 'BCA & Information Systems',
    memberCount: 2,
    isActive:    true,
  });

  const hodBeacon = await User.create({
    firstName:    'Dr. Sandeep',
    lastName:     'Nair',
    email:        'hod.bca@beacon.edu',
    passwordHash: DEMO_PASSWORD,
    role:         'deptAdmin',
    collegeId:    collegeBeacon._id,
    departmentId: deptBeaconBCA._id,
    isVerified:   true,
    isActive:     true,
    profileImage: IMAGES.avatarMale1,
  });
  deptBeaconBCA.adminUserId = hodBeacon._id;
  await deptBeaconBCA.save();

  await User.create({
    firstName:    'Nikhil',
    lastName:     'Bansal',
    email:        'student.bca@beacon.edu',
    passwordHash: DEMO_PASSWORD,
    role:         'student',
    collegeId:    collegeBeacon._id,
    departmentId: deptBeaconBCA._id,
    isVerified:   true,
    isActive:     true,
    semester:     2,
    rollNumber:   'BCA2301',
    profileImage: IMAGES.avatarNeutral,
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. SEED AUDIT LOGS
  // ───────────────────────────────────────────────────────────────────────────
  console.log('[Seed] Seeding sample audit logs...');
  await AuditLog.create([
    {
      action:          'SUBSCRIPTION_ACTIVATED',
      collegeId:       collegeApex._id,
      performedBy:     adminApex._id,
      performedByRole: 'collegeAdmin',
      targetId:        subApex._id,
      targetModel:     'Subscription',
      metadata:        { planType: '1y', amount: 399900 },
      outcome:         'success',
      createdAt:       subApexStart,
    },
    {
      action:          'DEPARTMENT_CREATED',
      collegeId:       collegeApex._id,
      performedBy:     adminApex._id,
      performedByRole: 'collegeAdmin',
      targetId:        deptApexCSE._id,
      targetModel:     'Department',
      metadata:        { name: 'Computer Science & Engineering', code: 'CSE' },
      outcome:         'success',
      createdAt:       new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
    },
    {
      action:          'USER_VERIFIED',
      collegeId:       collegeApex._id,
      performedBy:     hodApexCSE._id,
      performedByRole: 'deptAdmin',
      targetId:        studentApex1._id,
      targetModel:     'User',
      metadata:        { email: 'student.cse1@apex.edu', role: 'student' },
      outcome:         'success',
      createdAt:       new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    },
  ]);

  console.log('[Seed] Seeding complete! All collections populated successfully.');
  await mongoose.connection.close();
}

seed().catch(err => {
  console.error('[Seed] Fatal error:', err);
  process.exit(1);
});
