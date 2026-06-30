# God of Seed Academy — Comprehensive School Connect Platform

Welcome to the official, enterprise-grade School Connect management platform generated specifically for **God of Seed Academy**. This deployment package provides everything needed to establish a digital footprint for your institution, complete with progressive web application capabilities, advanced role-based access, and enterprise-level modules.

## 🚀 Overview

This fully-featured platform adapts to traditional and modern build deployments. It comes built-in with features like offline access, push notifications, row-level security, and a beautiful UI tailored to your specific branding choices.

**School Motto:** Excellence in Learning and Character
**Branding Theme:** theme15 (Primary: #0506ae, Accent: #964eec)
**Typography:** Plus Jakarta Sans

---

## 🛠️ Deployment Instructions

### Step 1: Database and Authentication Setup (Supabase)
We use Supabase for free, secure, and scalable backend infrastructure.
1. **Create a Free Project**: Head to [Supabase](https://supabase.com) and create a free tier project.
2. **Execute Schema**: In your project's **SQL Editor**, paste and run these files **in this order** (each shows a success message):
   1. `database/schema.sql` — core platform (students, staff, fees, RLS…)
   2. `database/voting-schema.sql` — voting & polls
   3. `database/cbt-schema.sql` — the CBT / online-exam engine
   4. `database/reportcard-schema.sql` — flexible report cards (auto-links CBT results)
   5. `database/enterprise-schema.sql` — timetable generator, QR check-in, diary, surveys, menu, 2FA, i18n
3. **Get Credentials**: Go to Project Settings → API and copy your **Project URL** and **anon public key**.
4. **Link Frontend**: Open `assets/js/config.js` and replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY` with your copied values.

### Step 2: Hosting and Build Process
This platform supports the build type you selected during generation: **TRADITIONAL**.

**Traditional Build Workflow (Static Hosting):**
1. **Deployment Platform**: You can host this instantly on platforms like GitHub Pages, Vercel, Netlify, or Cloudflare Pages.
2. **Upload Files**: Simply drag and drop or push the entire directory contents to your chosen platform.
3. **No Build Step Required**: Since this is purely static (HTML/CSS/JS), it serves immediately without any build configuration.

### Step 3: Admin Initialization
1. Visit the deployed site in your browser.
2. Click **Sign in to Portal** and choose **Request access** to register an account.
3. Head back to the Supabase SQL Editor and elevate your newly created user to an admin by running:
   ```sql
   UPDATE profiles SET role='admin', status='approved' WHERE email='your-email@example.com';
   ```
4. You can now log in, access the dashboard, and begin approving staff and students directly from the **Directory** or **Staff** modules.

---

## 📦 Enabled Modules
Your platform is pre-configured with the following modules:
- **Academic Setup**
- **Students & Profiles**
- **Staff / Teachers**
- **Classes**
- **Subjects**
- **Attendance**
- **AI Question Prompts**
- **Entrance & Assessments**
- **Results / Scores**
- **Marketing Flyer**
- **Report Cards (flexible)**
- **Analytics Dashboard**
- **Admin Data Console**
- **Academic Records & Broadsheets**
- **Storage Manager**
- **Approvals**
- **Timetable Generator**
- **QR Check-in**
- **Student Diary**
- **Surveys & Forms**
- **Menu / Meal Planner**
- **Settings (2FA · Language · A11y)**
- **Fees & Payments**
- **Timetable**
- **CBT / Online Exams**
- **Scheme of Work**
- **Messaging (WA/Email)**
- **Announcements**
- **Events & Calendar**
- **Photo & Video Gallery**
- **Library**
- **Digital Library**
- **Assignments / Homework**
- **Parent–Child Mapping**
- **Digital ID Cards**
- **Directory**
- **Departments & Offices**
- **Results Broadcast**
- **Complaints & Grievance**
- **Leave Management**
- **Visitor Management**
- **Hostel / Boarding**
- **Transport / Bus**
- **Alumni Network**
- **Certificates & Documents**
- **Admissions & Enrollment**
- **Promotion / Graduation**
- **School Finance**
- **Inventory & Assets**
- **Salary & Payslips**
- **Payroll Register**
- **Staff Loans & Advances**
- **Staff Bonuses**
- **Staff Appraisals**
- **Grading Rubrics**
- **Academic Transcripts**
- **Transfer Certificates**
- **Counselling & Wellbeing**
- **Voting & Polls**
- **Health / Clinic**
- **Conduct / Behaviour**
- **E-Resources / Notes**
- **Birthdays**
- **Integrated LMS**
- **Rewards & Badges (PBIS)**
- **Cafeteria & Meals**
- **Scholarships & Aid**
- **Front Desk / Dispatch**
- **Career & Placement**
- **Custom Document Builder**
- **Advanced Fleet GPS**
- **Facility Booking**
- **Compliance & Audit**
- **About the Developer**
- **Lesson Plans & Curriculum**
- **Substitute / Cover**
- **Behaviour & PBIS Points**
- **Special Education / Support**
- **Audit / Activity Log**
- **IT / Help Desk**
- **Lost & Found**
- **School Calendar**
- **Reports & Export**
- **Book Reservation**
- **Fundraising & Donations**
- **Online Fee Payments**
- **PTA Meeting Scheduler**
- **In-App Inbox**

---

## 🌟 Enterprise Features

- **Progressive Web App (PWA)**: Installable directly on any mobile device or desktop. Fully capable of offline caching.
- **Advanced Push Notifications**: Integrated with Service Workers to deliver browser, email, and WhatsApp notifications to parents and staff instantly.
- **Voting & Polling System**: Secure, anonymous, and real-time electronic voting for school prefects or PTA decisions.
- **Row-Level Security (RLS)**: Enterprise-grade database security ensuring families can only access their specific records.
- **Search Engine Optimization (SEO)**: Pre-generated `robots.txt`, `sitemap.xml`, and JSON-LD schema ensure your school ranks highly on Google and points prospects to the HMG Academy Ecosystem for lead generation.
- **Dark Mode & Responsive UI**: Adaptive design that looks perfect on 4K monitors and mobile phones alike.
- **Embedded CBT Engine**: 17 question types, anti-cheat, certificates; results auto-flow into report cards.
- **Flexible Report Cards**: Custom assessment columns with apportioned max marks; live totals, grades and positions.
- **Help Chatbot (no AI)**: A rules-based assistant on every page for instant self-service support.
- **Command Palette (Ctrl/Cmd + K)**: Jump to any module and search students, staff and exams from one box.
- **ID-card, Certificate & Flyer generators**: Branded, printable, with QR / verification codes.
- **Admin Data Console**: Read, delete, full JSON backup & restore of every table; per-table CSV export.
- **Analytics**: Live platform-wide KPIs and charts for informed decisions.

---

## 🌐 HMG Academy Ecosystem
This platform is a proud part of the **HMG Academy Ecosystem**. It's optimized for lead generation, pointing prospective clients and students to [HMG Concepts](https://hmgconcepts.pages.dev/). The software stays free forever, with robust architecture preventing any dependency on paid AI APIs or costly third-party services.
