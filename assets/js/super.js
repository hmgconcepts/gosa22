/* ====================================================================
   super.js — School Connect Gen v3 "Super Features" engine
   --------------------------------------------------------------------
   Ports the standout features from the original School Connect builder
   into EVERY generated school site, and adds new enterprise super
   features. 100% free tools, NO AI APIs. Everything is interconnected
   through the single shared Supabase database (window.sb) and the
   shared school config (window.SCHOOL).

   Provides (all attached to window):
     • Super.chatbot   — rules-based help assistant (per-school)
     • Super.palette    — global command palette / cross-module search (Ctrl+K)
     • Super.notify     — multi-channel notification fan-out hooks
     • Super.idcard     — printable QR ID-card generator
     • Super.cert       — printable, verifiable certificate generator
     • Super.flyer       — printable marketing flyer generator
     • Super.data        — per-school export / import / draft autosave
   ==================================================================== */

const Super = {
  sb: null,
  school: null,

  init(supabaseClient, school) {
    this.sb = supabaseClient || (typeof sb !== 'undefined' ? sb : null);
    this.school = school || (typeof window !== 'undefined' ? window.SCHOOL : null) || {};
    this.chatbot.mount();
    this.palette.mount();
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); Super.palette.toggle(true); }
      });
    }
  },

  esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); },

  /* ==================================================================
     1) SCHOOL HELP CHATBOT (rules-based, no AI, per-school)
     ================================================================== */
  chatbot: {
    open: false, history: [],
    /* Enhanced knowledge base: each entry has keywords (m), a reply (r), an
       optional page link (p) and optional follow-up chips (chips). */
    KB: [
      { m: ['role based navigation', 'menu security', 'why hidden', 'navigation', 'permission', 'not safe', 'roles'], r: 'School Connect uses role-based navigation for safety. **Admin/Super Admin** can see all modules plus oversight panels because they manage payments, staff, parents and students. **Staff/Teacher** see teaching/operation pages only. **Parents** see child/payment/communication pages only. **Students** see learning/exam/result pages only. Hidden menu items are intentional data protection, not a bug.', p: 'dashboard.html', chips: ['Admin overview', 'Staff dashboard', 'Parent dashboard', 'Student dashboard'] },
      { m: ['login', 'sign in', 'signin', 'password', 'cannot log', "can't log", 'access account'], r: 'To sign in, open the **Login** page and use your registered email + password. New here? Choose **Request access** — an admin approves you first. Forgot your password? Use the reset link on the login page.', p: 'login.html', chips: ['How do I get approved?', 'Enable 2FA'] },
      { m: ['approve', 'pending', 'activate account', 'admin approval'], r: 'New accounts start as **pending**. An admin opens **Admin Data → profiles** (or Settings) and sets your status to *approved*. Then you can sign in.', p: 'admin-data.html' },
      { m: ['2fa', 'two factor', 'two-factor', 'otp', 'secure my account'], r: 'Turn on **2-Factor Authentication** in **Settings** — it uses a free email one-time code (no SMS/AI cost).', p: 'settings.html' },
      { m: ['cbt', 'exam', 'test', 'quiz', 'online exam', 'set exam'], r: 'Open **CBT / Online Exams**. Create an exam, upload questions by CSV (17 question types), then share a 6-character **code** or link. Map the exam to a report-card column and scores flow into the report card automatically.', p: 'cbt.html', chips: ['How do students take it?', 'How are CBT scores graded?'] },
      { m: ['take exam', 'student exam', 'exam code', 'join exam', 'write exam'], r: 'Students open the exam link or go to **Take Exam**, enter the **6-character code** and their name — no account needed (open mode). A timer, navigator and anti-cheat run during the exam.', p: 'cbt-exam.html' },
      { m: ['grade', 'scoring', 'mark scheme', 'how are scores', 'negative marking'], r: 'CBT auto-grades all 17 question types (with partial credit and optional **negative marking**). Essays use rule-based keyword scoring. No AI is used.', p: 'cbt.html' },
      { m: ['report', 'result', 'report card', 'grades', 'ca1', 'ca2'], r: 'Open **Report Cards**. Add custom columns (CA1, CA2, Assignment, Project, Exam), apportion a max mark to each, and enter scores. CBT/online results auto-fill their mapped columns; totals, % and grades compute live.', p: 'report-cards.html', chips: ['Pull CBT into report card', 'Export report cards'] },
      { m: ['fee', 'pay', 'invoice', 'balance', 'receipt', 'school fees'], r: 'Open **Fees** to view balances, record payments and print receipts. For online payment links use **Online Fee Payments** (Paystack/Flutterwave/bank transfer — free to integrate; you pay only the gateway transaction fee).', p: 'fees.html' },
      { m: ['attendance', 'register', 'present', 'absent', 'mark attendance'], r: 'Open **Attendance** to mark daily/class attendance (present/absent/late/excused). Parents see only their own children. For self check-in, use **QR Check-in**.', p: 'attendance.html', chips: ['QR check-in', 'Attendance report'] },
      { m: ['qr', 'check in', 'check-in', 'checkin', 'scan'], r: 'Open **QR Check-in**. Students scan their ID-card QR (or type their admission number) to check in — no biometric hardware needed.', p: 'checkin.html' },
      { m: ['timetable', 'schedule', 'periods', 'time table'], r: 'Open **Auto-Timetable** to build a conflict-free timetable from each subject weekly period demand. It supports **part-time teachers** — tick *Part-time* and choose the days they attend; they are only scheduled on those days.', p: 'timetable-generator.html', chips: ['Add a part-time teacher', 'Why are some periods unplaced?'] },
      { m: ['part time', 'part-time', 'visiting teacher', 'specific day'], r: 'In **Auto-Timetable**, tick **Part-time teacher** and select the weekdays that teacher attends (e.g. Tue & Thu). The generator will only place their periods on those days. If their periods cannot all fit, it tells you how many are *unplaced*.', p: 'timetable-generator.html' },
      { m: ['vote', 'poll', 'prefect', 'election', 'head boy', 'head girl'], r: 'Open **Voting & Polls** to run prefect / head-boy / head-girl elections and staff polls with live, anonymous results.', p: 'voting.html' },
      { m: ['survey', 'feedback', 'form', 'questionnaire'], r: 'Open **Surveys** to create anonymous-optional feedback forms and collect responses (separate from elections).', p: 'surveys.html' },
      { m: ['notif', 'alert', 'announce', 'broadcast', 'message parent'], r: 'Notifications fan out in-app + browser push + email + WhatsApp + SMS. Staff post via **Announcements** / **Result Broadcast**; everyone receives them.', p: 'announcements.html' },
      { m: ['diary', 'homework', 'home work', 'assignment log'], r: 'Open **Diary** to log daily homework, classwork and behaviour notes; parents can view and acknowledge them.', p: 'diary.html' },
      { m: ['install', 'app', 'pwa', 'offline', 'home screen'], r: 'This portal is an installable app (PWA). Tap the **Install** banner, or your browser menu → *Install / Add to Home Screen* for offline access and push notifications.' },
      { m: ['id card', 'idcard', 'badge', 'student card'], r: 'Open **ID Cards** to generate branded student/staff cards with a scannable QR code — printable straight from the browser.', p: 'idcards.html' },
      { m: ['certificate', 'cert', 'testimonial'], r: 'Open **Certificates** to issue branded, printable certificates with a verification code. CBT exams also issue certificate codes automatically.', p: 'certificates.html' },
      { m: ['library', 'book', 'borrow'], r: 'Open **Library** to catalogue books and track lending and returns.', p: 'library.html' },
      { m: ['menu', 'meal', 'food', 'canteen', 'cafeteria'], r: 'Open **Menu** to plan weekly meals with allergen notes for parents.', p: 'menu.html' },
      { m: ['backup', 'export', 'delete', 'restore', 'data console'], r: 'Admins open **Admin Data** to read, delete, back up (JSON) and restore every table, and export any table to CSV. Every action is logged.', p: 'admin-data.html' },
      { m: ['analytics', 'kpi', 'chart', 'dashboard stats', 'insight'], r: 'Open **Analytics** for live, platform-wide KPIs and charts (enrollment, CBT performance, fees, attendance) to support decisions.', p: 'analytics.html' },
      { m: ['language', 'translate', 'french', 'hausa', 'yoruba', 'igbo', 'accessibility', 'font size', 'contrast'], r: 'Open **Settings** to switch language (English/French/Kiswahili/Hausa/Yoruba/Igbo) and adjust accessibility (font size, high contrast).', p: 'settings.html' },
      { m: ['search', 'find', 'where is', 'go to', 'command'], r: 'Press **Ctrl/Cmd + K** anywhere to open the global command palette and jump to any module or search students, staff and exams.' },
      { m: ['dark mode', 'theme', 'night'], r: 'Click the **🌙 button** in the top bar to toggle dark mode. Your choice is remembered.' },
      { m: ['cost', 'price', 'free', 'subscription', 'monthly'], r: 'The platform is **free to run forever** on free Supabase + free hosting. No monthly fees, no AI-API costs. You own all your data.' },
      { m: ['deploy', 'host', 'supabase', 'go live', 'setup'], r: 'See **DEPLOYMENT-GUIDE.md** in your download: create a free Supabase project, run the SQL files in order, paste your keys into `assets/js/config.js`, and host the folder on GitHub Pages / Netlify / Vercel / Cloudflare.' },
      { m: ['contact', 'support', 'help me', 'human', 'whatsapp'], r: 'Need a human? Use the **WhatsApp** / email contact in the footer, or reach HMG Concepts. I can answer questions about any module here too.' },
      { m: ['ai prompt', 'generate questions', 'csv questions', 'question prompt', 'make questions', 'prompt'], r: 'Open **AI Question Prompts**. Copy a Simple/Intermediate/Advanced prompt, paste it into any **free** AI chat (ChatGPT, Gemini, Copilot), fill in the topic/number/class, and it returns questions in the exact CSV format. Edit them, save as a .csv, then upload on the **CBT** page. The platform itself uses no paid AI.', p: 'cbt-prompts.html', chips: ['Upload CSV to CBT', 'What question types are supported?'] },
      { m: ['entrance', 'common entrance', 'placement', 'assessment exam', 'admission test', 'anonymous exam'], r: 'Open **Entrance & Assessments**. Create the exam on the CBT page (tick *entrance*), share the code — anyone can sit it without an account. Results show here instantly and you can generate **result slips, certificates and admission letters** per candidate or in bulk.', p: 'entrance.html', chips: ['Generate admission letters', 'Set the pass mark'] },
      { m: ['admission letter', 'offer letter', 'letter of admission'], r: 'On the **Entrance & Assessments** page, set the pass mark, then click **Generate ALL admission letters** (or *Letter* on a single candidate). Letters are branded with your school logo, address and motto.', p: 'entrance.html' },
      { m: ['storage', 'full', 'database full', 'space', 'quota', 'limit', 'free up', 'purge'], r: 'Open **Storage Manager**. It shows each table\'s size and lets an admin **purge old, low-value rows** (audit logs, old results, read notifications) to free space. Export them first on **Admin Data** so nothing is lost.', p: 'storage.html' },
      { m: ['developer', 'who built', 'about developer', 'brand', 'hmg', 'adewale'], r: 'This platform was built by **Adewale Samson Adeagbo**, founder of **HMG Concepts** (Academy · Technologies · Media · Gospel). See the **About the Developer** page for the full bio and links.', p: 'developer.html' },
      { m: ['digital library', 'read book', 'online book', 'reading', 'comprehension'], r: 'Open **Digital Library**. Teachers post a reading **link** (Drive/web — no upload) with optional questions; students read and take the auto-marked quiz, and the score can be **pulled into Results** so it counts toward the grade.', p: 'digital_library.html', chips: ['Pull reading marks to report card'] },
      { m: ['pull marks', 'pull reading', 'reading score to report', 'count toward grade'], r: 'On the **Results** page, use **Pull reading scores** to bring Digital-Library quiz marks into Results (scaled to a CA column). They then count toward the report card.', p: 'results.html' },
      { m: ['promote', 'promotion', 'graduate', 'next class', 'repeat'], r: 'Open **Promotion**. Click **Auto-promote (by exam)**, set a benchmark and the graduating class; the system drafts promote/repeat/graduate decisions from term averages. Review/edit, then **Apply**.', p: 'promotion.html' },
      { m: ['super admin', 'proprietor', 'owner', 'highest access'], r: 'The **proprietor/proprietress is the super-admin** — full access to every module, all dashboards, role management and storage control. An existing super-admin assigns the role on the **Approvals** page (set role to *super_admin*).', p: 'approvals.html' },
      { m: ['student dashboard', 'parent dashboard', 'my child', 'view student', 'see dashboard'], r: 'Each student/parent dashboard shows the student\'s name, DOB, class, fees & payment history, awards, records and report card. Admins can open **any** student or parent dashboard from the **Students** page (View → Dashboard).', p: 'students.html' },
      { m: ['track fees', 'payment history', 'salary', 'who paid', 'fees overview'], r: 'Admins can track every student\'s fee/payment history on **Fees**, and staff salary on **HR/Payroll**. The **Analytics** page gives a school-wide overview.', p: 'fees.html' },
      { m: ['birthday month', 'group birthday', 'this month birthday'], r: 'On the **Birthdays** page, click **Group by month** to see students grouped by birth month, each with their name and class.', p: 'birthdays.html' },
      { m: ['render link', 'thumbnail', 'show image', 'video link', 'drive link'], r: 'When you paste a Google-Drive/YouTube/image/video **link** into a record, the list automatically renders it as an **image or video thumbnail** — no upload needed, saving Supabase space.' },
      { m: ['bulk', 'download all', 'export all', 'print all'], r: 'Most pages support **single and bulk** actions: Export CSV/PDF on every module, **Print ALL** ID cards (students or staff), and **bulk** admission letters/certificates on the Entrance page.' },
      { m: ['add new error', 'no editable form', 'cannot add', 'activity log error'], r: 'The **Activity Log** is read-only (the system writes it automatically), so it has no *Add new* button. If a page truly should be editable but isn\'t, tell an admin to check the module configuration.' }
    ],
    QUICK: ['What is this page?', 'How do I create a CBT exam?', 'Set up report cards', 'Add a part-time teacher', 'Record fees'],
    /* Per-page explanations (issue 3): the assistant explains the current page,
       and the topbar "ℹ️ About this page" button opens this. */
    PAGE_HELP: {
      dashboard: 'The **Dashboard** is your home overview — live counts of students, staff, fees and notices, latest announcements, active polls and quick analytics. Use the sidebar to open any module.',
      students: 'The **Students** page is your student register. Click **+ Add new** to register a student (admission numbers are **auto-generated**). You can edit, delete and export to CSV. Other modules pull student names from here via dropdowns.',
      staff: 'The **Staff** page lists teachers and non-teaching staff. Add staff, set roles and departments, and mark part-time. Member IDs are auto-generated when an account is approved.',
      classes: 'The **Classes** page defines the classes/arms your school runs. These appear as dropdown options across results, attendance, timetable and more.',
      subjects: 'The **Subjects** page lists subjects offered. They appear as dropdowns in results, scheme of work, assignments and the timetable.',
      attendance: 'The **Attendance** page records daily/class attendance. Pick the student from the dropdown (class auto-fills), choose present/absent/late/excused and the time. Parents see only their own children.',
      results: 'The **Results** page records CA and exam scores per student per subject. Pick the student, subject, class, term and session from dropdowns. Totals and grades feed the report card and broadsheet.',
      'report-cards': 'The **Report Cards** page builds termly report cards: define assessment columns (CA1/CA2/Exam…) with max marks, enter scores, then generate each student\'s report card, the class broadsheet and a teacher scoresheet.',
      timetable: 'The **Timetable** page shows class timetables. Use **Auto-Timetable** to generate a conflict-free timetable (with break periods and part-time-teacher days).',
      'timetable-generator': 'The **Auto-Timetable** page first lets you set the daily periods, their times and breaks, then generates a conflict-free timetable. Part-time teachers are only scheduled on the days they attend.',
      sow: 'The **Scheme of Work** page lets each teacher enter their term plan (week → topic) at the start of term, then tick each topic as **taught** weekly so admin can monitor covered vs uncovered topics.',
      cbt: 'The **CBT** page lets teachers create online exams (17 question types), share a code/link, and view results. Exams can be mapped to a report-card column so scores flow in automatically.',
      fees: 'The **Fees** page records payments per student (pick the student from the dropdown). View balances, print receipts; use Online Fee Payments for gateway links.',
      announcements: 'The **Announcements** page posts notices. Choose the **audience** from the dropdown (all/students/parents/staff/a class) and a priority.',
      birthdays: 'The **Birthdays** page celebrates students/staff. Student birthdays are pulled automatically from the students\' dates of birth.',
      idcards: 'The **ID Cards** page generates branded student/staff cards with a QR code and the student\'s photo (from the student record / Google Drive). Print one or all.',
      certificates: 'The **Certificates** page designs branded certificates — pick colours, fonts, layout and append a signature — each with a verification code.',
      admissions: 'The **Admissions** page manages applications. Generate an **application link** to send to prospective parents; when an application is accepted, **extract** it to create the student record automatically.',
      approvals: 'The **Approvals** page is where admins approve prospective students, parents and staff (and admissions applications). Approving generates their member ID.',
      analytics: 'The **Analytics** page shows comprehensive, live KPIs and charts across every module to support decisions.',
      checkin: 'The **QR Check-in** page lets students check in by scanning their ID-card QR with the device camera, or by typing their admission number.',
      voting: 'The **Voting** page runs elections and polls with live, optionally anonymous results.',
      settings: 'The **Settings** page controls 2-factor authentication, language and accessibility (font size, contrast).',
      subjects: 'The **Subjects** page registers every subject once and maps each to a teacher (chosen from the staff list). Subjects then appear as dropdowns in results, scheme of work, assignments and the timetable.',
      digital_library: 'The **Digital Library** lets a teacher post an online book/resource (a Google-Drive or web **link** — no upload) with optional comprehension questions. Students read it, take the auto-marked quiz, and their score can be **pulled into Results** so it counts toward their grade.',
      promotion: 'The **Promotion** page moves students up automatically. Click **Auto-promote (by exam)**, set a pass benchmark and the graduating class; the system drafts promote/repeat/graduate decisions from each student\'s term average. Review/edit, then **Apply**.',
      'cbt-prompts': 'The **AI Question Prompts** page gives you ready-made Simple/Intermediate/Advanced prompts. Copy one, paste it into any free AI chat (ChatGPT/Gemini/Copilot), fill in [TOPIC]/[NUMBER]/[CLASS], and it returns questions in the exact CSV format the CBT page accepts. Edit, save as .csv, and upload on the CBT page. The platform itself uses no paid AI.',
      entrance: 'The **Entrance & Assessments** page handles exams that anyone can sit without an account (entrance, common-entrance, placement). Create the exam on the CBT page (tick entrance), share the code, and candidates take it. Results appear here instantly and you can generate each candidate\'s result slip, certificate and admission letter — one at a time or in bulk.',
      storage: 'The **Storage Manager** shows how much Supabase space each table uses and lets an admin safely purge old, low-value rows (audit logs, old results, read notifications) to make room. Always export first on Admin Data so nothing is truly lost.',
      developer: 'The **About the Developer** page is the site\'s last page — the bio of the developer (Adewale Samson Adeagbo) and the HMG Concepts ecosystem (Academy, Technologies, Media, Gospel).',
      activity_log: 'The **Activity Log** is a read-only audit trail: every create, update, delete, import and login is recorded automatically (who did what, when). You cannot add rows by hand — the system writes them.'
    },
    /* Issue 1: rich, structured per-page knowledge — purpose, what it does,
       who uses it, advantages, and the benefit to the school. The assistant
       renders these as a full explanation so a brand-new user understands
       everything about the page at a glance. */
    PAGE_INFO: {
      dashboard: { purpose:'Your home overview of the whole school at a glance.', does:'Shows live counts (students, staff, fees, notices), latest announcements, active polls and quick analytics, with one-click access to every module.', who:'Everyone — admins, staff, teachers, parents and students (each sees what their role allows).', advantages:['One screen for the day\'s key numbers','No digging through menus','Role-aware so each person sees what matters to them'], benefit:'Leaders make faster, data-driven decisions and everyone starts the day informed.' },
      students: { purpose:'The single, authoritative register of every enrolled learner.', does:'Add/edit students (admission numbers auto-generate), import many at once by CSV, open any student\'s 360° dashboard, and export to CSV/PDF.', who:'Admins & office staff manage it; teachers reference it; parents see only their own children.', advantages:['No re-typing — every other page pulls names from here','Auto admission numbers prevent duplicates','Bulk CSV import saves hours at enrolment'], benefit:'One reliable source of truth for all student data, eliminating scattered spreadsheets.' },
      staff: { purpose:'The complete directory and HR record of every teaching & non-teaching staff member.', does:'Capture full details (role, subject, qualification, etc.), auto-generate staff numbers, and feed the payroll, appraisal, loan and timetable modules. Approved teacher sign-ups appear here automatically.', who:'Admin/HR/proprietor manage; teachers appear as options elsewhere.', advantages:['Privacy-aware (staff DOB stored as day/month only)','Approved sign-ups auto-create staff records','Drives payroll, appraisals & timetabling'], benefit:'Professional, centralised workforce management with less paperwork.' },
      classes: { purpose:'Defines each class/arm the school runs.', does:'Create classes, assign a class teacher from a dropdown, set level and capacity. These then appear as options everywhere a class is needed.', who:'Admin sets these up at the start of each session.', advantages:['Class teacher chosen from staff — no typos','Consistent class names across the whole platform'], benefit:'Clean, consistent class structure that powers attendance, results and promotion.' },
      subjects: { purpose:'The catalogue of every subject the school offers.', does:'Register each subject once with code/department/level and map it to a teacher.', who:'Admin/HOD set up; teachers are mapped to subjects.', advantages:['Subjects reused everywhere as dropdowns','Each subject mapped to its teacher'], benefit:'Accurate curriculum data feeding results, scheme of work and the timetable.' },
      attendance: { purpose:'Records who is present, absent, late or excused.', does:'Mark attendance per student/class, or pull a whole class PRESENT from QR check-ins in one click. Parents see only their own children.', who:'Class teachers record; parents and admins view.', advantages:['QR pull removes one-by-one typing','Per-class accuracy (better than daily-only systems)','Exportable for audits'], benefit:'Faster, more accurate attendance and early warning on truancy.' },
      results: { purpose:'Captures CA and exam scores per student, subject, term and session.', does:'Enter scores from dropdowns; grades auto-suggest; pull CBT and Digital-Library marks; feeds report cards and automated promotion.', who:'Subject teachers enter; admins oversee.', advantages:['Auto-grading reduces marking errors','CBT & reading marks flow in automatically','Drives report cards and promotion'], benefit:'Trustworthy academic records produced with far less manual work.' },
      'report-cards': { purpose:'Builds termly report cards, broadsheets and scoresheets.', does:'Define custom assessment columns with max marks, auto-pull scores, and generate printable, branded report cards, class broadsheets and teacher scoresheets.', who:'Teachers and admins at term end.', advantages:['Fully customisable columns','Auto totals, %, grades & positions','Print or save as PDF'], benefit:'Professional, consistent reporting that parents trust — in minutes, not days.' },
      cbt: { purpose:'A complete computer-based testing engine.', does:'Create exams (17 question types), upload questions by CSV, share a code/link, auto-grade, and flow results into report cards and certificates.', who:'Teachers create; students (even anonymous) take.', advantages:['17 question types with partial credit','Anti-cheat, timer, randomisation','Free — no per-student cost'], benefit:'Run reliable online exams on any device with zero exam-software fees.' },
      'cbt-prompts': { purpose:'A library of ready-made AI prompts to draft CBT questions fast.', does:'Provides Simple/Intermediate/Advanced prompts you paste into any free AI chat; it returns questions in the exact CSV format the CBT page accepts.', who:'Teachers and exam officers.', advantages:['Three difficulty levels','Exact CSV format — no reformatting','Platform uses no paid AI'], benefit:'Teachers build large, varied question banks in minutes for free.' },
      entrance: { purpose:'Runs entrance/placement assessments open to anyone.', does:'Anonymous candidates sit a CBT entrance exam; results appear instantly and you generate result slips, certificates and admission letters — single or bulk.', who:'Admissions officers and admins.', advantages:['No account needed for candidates','Instant, branded admission letters','Single or bulk generation'], benefit:'A complete, professional admissions-testing pipeline at no cost.' },
      promotion: { purpose:'Moves students to the next class automatically by exam result.', does:'Drafts promote/repeat/graduate decisions from each student\'s term average vs a benchmark you set; admin reviews/edits then applies.', who:'Admin/proprietor at session end.', advantages:['Automated, consistent decisions','Admin override before applying','Graduates flow to Alumni'], benefit:'End-of-session promotion done fairly in minutes instead of days.' },
      fees: { purpose:'Records school-fee payments and balances.', does:'Record payments per student, view full payment history on the student dashboard, and export statements.', who:'Bursar/admin record; parents view their own.', advantages:['Per-student payment history','Exportable statements','Feeds the student 360 dashboard'], benefit:'Transparent fee tracking and fewer payment disputes.' },
      hr: { purpose:'Runs staff salaries and produces professional payslips.', does:'Compute basic+allowances+bonus+overtime minus tax/pension/loans to AUTO net pay, set pay status, and print a payslip for each staff member.', who:'Bursar/HR/proprietor.', advantages:['Auto net-pay calculation','Printable, professional payslips','Pick staff from a list — no typos'], benefit:'Accurate, on-time salaries that boost staff morale and ensure compliance.' },
      payroll: { purpose:'The full monthly salary register.', does:'List every staff salary record, auto-compute net pay, approve/pay, and print payslips in bulk.', who:'Bursar/HR/proprietor.', advantages:['Monthly register view','Bulk payslips','Audit-friendly records'], benefit:'A single, reliable salary ledger for budgeting and audits.' },
      staff_loans: { purpose:'Tracks staff loans and salary advances.', does:'Record principal, monthly EMI, months, amount repaid and status; the repayment links to payroll deductions.', who:'Bursar/HR.', advantages:['EMI repayment schedules','Live balance tracking','Status (active/completed/defaulted)'], benefit:'Controlled staff lending with no missed repayments.' },
      staff_bonus: { purpose:'Records bonuses and special allowances.', does:'Log performance, 13th-month, holiday and long-service bonuses per staff with citations and pay status.', who:'HR/proprietor.', advantages:['Categorised bonuses','Citations for transparency','Feeds payroll'], benefit:'Fair, documented rewards that motivate staff.' },
      appraisals: { purpose:'Structured staff performance appraisals.', does:'Score weighted criteria (punctuality, teaching quality, results, teamwork, conduct) 1–10; auto-compute average & band and record a recommendation.', who:'Heads of department, principal, proprietor.', advantages:['Objective, weighted scoring','Auto grade band','Clear recommendation (promote/train/etc.)'], benefit:'Evidence-based staff development and promotion decisions.' },
      idcards: { purpose:'Generates professional digital ID cards.', does:'Produce branded student/staff cards with photo, QR, full school contact details and several professional templates; print one or all.', who:'Admin/office staff.', advantages:['Multiple professional templates','Staff & student cards','QR for check-in'], benefit:'Smart, secure identity cards that look world-class — printed in-house for free.' },
      certificates: { purpose:'Issues verifiable, branded certificates.', does:'Design certificates (colours/fonts/layout/signature) each with a verification code; CBT exams auto-issue codes.', who:'Admin/teachers.', advantages:['Verification codes','Custom designs','Bulk issuance'], benefit:'Credible, tamper-evident certificates without a print shop.' },
      flyer: { purpose:'Designs professional marketing flyers.', does:'Choose premium templates, colours, fonts, sizes (A4/A5/social), badges and decorations, edit all text, and print or save as PDF/image.', who:'Admin/marketing.', advantages:['International-standard templates','Full design control','Print & social-ready sizes'], benefit:'Attractive admissions marketing produced in-house, saving design fees.' },
      digital_library: { purpose:'An online reading library with auto-marked quizzes.', does:'Teachers post a reading link (no upload) with optional questions; students read and take the quiz; scores can be pulled into Results.', who:'Teachers post; students read.', advantages:['Link-based (saves storage)','Auto-marked comprehension','Counts toward grades'], benefit:'Encourages reading and adds assessment data with no extra cost.' },
      birthdays: { purpose:'Celebrates student & staff birthdays.', does:'Auto-imports dates from records and groups people by birth month with name and class.', who:'Everyone views; staff manage.', advantages:['Auto-import','Grouped by month','Name + class shown'], benefit:'A warmer school community and never a missed celebration.' },
      'student-profile': { purpose:'A 360° dashboard for a single student/parent.', does:'Shows bio, class, fees & payment history, attendance, awards and results/report card; admins can open any student\'s dashboard.', who:'Students/parents (their own); admins/staff (any).', advantages:['Everything about a student in one place','Admin can view any dashboard','Parent-friendly'], benefit:'Total transparency for parents and instant context for staff.' },
      analytics: { purpose:'School-wide insight and KPIs.', does:'Live charts across enrolment, results, fees and attendance for decision-making.', who:'Leadership and admins.', advantages:['Live KPIs','Multiple modules in one view','Free'], benefit:'Data-driven leadership without an expensive BI tool.' },
      storage: { purpose:'Keeps the free database lean.', does:'Shows each table\'s size and lets admins safely purge old, low-value rows after exporting.', who:'Admins/super-admin.', advantages:['See space usage','Safe, guarded purge','Stays on the free tier'], benefit:'The platform keeps running free even as data grows.' },
      approvals: { purpose:'Gatekeeps who can access the platform.', does:'Approve/suspend students, parents and staff, assign roles (incl. super-admin), and review admissions.', who:'Admins/proprietor.', advantages:['Role assignment','Suspend instantly','Admissions review in one place'], benefit:'Strong access control and security for the whole school.' },
      parents: { purpose:'Links parents to their children.', does:'Pick a registered parent and a student from dropdowns to create the link (works both directions).', who:'Admin/office staff.', advantages:['No typing IDs','Searchable parent & student pickers','Bi-directional link'], benefit:'Accurate parent–child relationships that power the parent portal.' },
      developer: { purpose:'The site\'s last page — about the developer & brand.', does:'Presents Adewale Samson Adeagbo and the HMG Concepts ecosystem with links.', who:'Anyone curious about who built the platform.', advantages:['Professional credit','Direct links','Contact for support'], benefit:'Trust and a clear support channel.' }
    ,
      "activity_log":{purpose:"Tamper-evident audit trail.",does:"A secure, read-only system log recording every login, database creation, update, deletion, and bulk import. Designed for administrative oversight, compliance auditing, and security forensic reviews. Manual row creation is completely blocked by database triggers.",who:"Admin & Super Admin only.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "sow":{purpose:"Curriculum tracking and teacher delivery sign-off.",does:"Digitises the school curriculum per subject and class arm. Teachers enter weekly lesson topics and check the confirmation box upon completing classroom instruction. Administrators receive live visual telemetry on academic progress.",who:"Teachers enter topics; Admins monitor coverage.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "gamification":{purpose:"Positive behavior reinforcement and reward badges.",does:"A transparent reward tracking engine where teachers allocate positive behavior points and achievement badges to students. Scores accumulate directly on the student 360° dashboard to encourage exemplary conduct.",who:"Teachers award points; Students/Parents view.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "announcements":{purpose:"Institutional communication broadcasting.",does:"A centralized noticeboard allowing staff to publish announcements to targeted audiences (All, Students, Parents, Staff, or specific classes). Urgent notices can be pinned to the top of user dashboards.",who:"Staff post; All users view.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "eresources":{purpose:"Curriculum document and past paper repository.",does:"A secure digital filing system allowing teachers to share class study materials, revision guides, and exam syllabi via direct web links or Google Drive URLs without consuming database storage.",who:"Teachers upload; Students/Parents view.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "reports":{purpose:"Custom administrative and departmental summaries.",does:"A flexible reporting log where heads of department and administrators file official termly summaries, inspection notes, and executive status briefs for institutional governance.",who:"Staff and Admin.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "directory":{purpose:"Searchable contact registry for staff and students.",does:"Aggregates active database profiles into a searchable, read-only contact directory. Displays full names, institutional email addresses, phone contacts, roles, and current academic standing.",who:"Staff and Admin.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "departments":{purpose:"Academic faculty and HOD structure setup.",does:"Defines the institutional academic architecture by establishing distinct academic departments (e.g., Sciences, Arts, Languages) and assigning official Heads of Department (HOD) for faculty governance.",who:"Admin and Super Admin.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "rubrics":{purpose:"Standardized student conduct evaluation matrices.",does:"Provides standardized grading criteria for evaluating student affective traits and behavioral conduct. Establishes uniform benchmarks for punctuality, respect, neatness, and teamwork across all class arms.",who:"Staff and Admin.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "transcripts":{purpose:"Comprehensive multi-term academic record synthesis.",does:"Compiles student continuous assessments and examination results across multiple academic terms and sessions into official, printable academic transcripts suitable for university applications and transfers.",who:"Admin and Staff.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "transfer_cert":{purpose:"Official student departure and clearance documentation.",does:"Generates official school leaving certificates and clearance documentation for departing students. Records academic standing, final attendance summaries, conduct ratings, and official release authorization.",who:"Admin and Staff.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "counselling":{purpose:"Confidential academic and psychological guidance tracking.",does:"A secure logging facility where school guidance counsellors record confidential student guidance sessions, psychological intervention notes, university placement advice, and career action plans.",who:"Staff and Admin.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "hostel":{purpose:"Student accommodation and dormitory wing management.",does:"Manages residential student housing by tracking dormitory wings, specific room numbers, bed allocations, and supervising boarding housemasters/mistresses.",who:"Staff and Admin.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "alumni":{purpose:"Past student tracking and institutional network archiving.",does:"Preserves the institutional heritage by maintaining an active database of graduated students. Records graduation cohorts, higher education placements, career achievements, and alumni association contact details.",who:"Admin and Super Admin.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "inventory":{purpose:"Asset tracking and physical facility logging.",does:"A dedicated physical asset ledger tracking institutional equipment, laboratory apparatus, classroom furniture, and maintenance supplies. Records initial quantities, unit valuations, storage locations, and current asset conditions.",who:"Admin and Super Admin.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "lms":{purpose:"Structured digital courseware and video lesson delivery.",does:"A complete digital courseware hub where teachers structure academic lessons, embed instructional lecture videos, upload study notes, and assign interactive assignments for self-paced student learning.",who:"Teachers upload; Students learn.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "cafeteria":{purpose:"Weekly school meal menus and allergen tracking.",does:"Manages the institutional cafeteria by publishing daily and weekly student dining menus. Captures meal descriptions, nutritional notes, and mandatory allergen warnings to ensure student dining safety.",who:"Staff manage; Students/Parents view.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "financial_aid":{purpose:"Fee waiver tracking and student sponsorship logging.",does:"Maintains official records of institutional scholarships, fee discounts, bursaries, and corporate sponsorships awarded to deserving students. Interconnects with the fee management engine for accurate balance calculations.",who:"Admin and Bursar.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "front_desk":{purpose:"Gatekeeper logging for walk-ins, dispatches, and calls.",does:"A comprehensive administrative reception ledger tracking institutional visitors, daily package dispatches, walk-in inquiries, and official phone logs to enforce rigorous campus security.",who:"Staff and Admin.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "career_counseling":{purpose:"Higher education tracking and career placement logs.",does:"Maintains longitudinal tracking of senior student higher education applications, university admission offers, aptitude test results, and professional career placement milestones.",who:"Staff and Admin.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "document_builder":{purpose:"Custom administrative certificate and letter publishing.",does:"A dynamic publishing engine allowing administrators to format and print official school correspondence, bonafide certificates, examination hall passes, and custom testimonials instantly.",who:"Staff and Admin.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "fleet_tracking":{purpose:"Bus route logistics, driver tracking, and maintenance logs.",does:"Manages institutional transportation logistics by maintaining active ledgers of school bus routes, assigned transport vehicles, authorized drivers, daily pick-up schedules, and scheduled fleet maintenance.",who:"Staff and Admin.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "facility_booking":{purpose:"Resource reservation for auditoriums, labs, and grounds.",does:"A scheduling console for reserving shared campus infrastructure such as science laboratories, auditoriums, sports grounds, and conference rooms. Prevents double-booking via conflict checking.",who:"Staff and Admin.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "compliance":{purpose:"Institutional certification and government regulation tracking.",does:"An executive governance dashboard tracking mandatory government accreditations, ministry inspection timelines, safety audit certificates, and statutory operational compliance milestones.",who:"Admin and Super Admin.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "lesson_plans":{purpose:"Structured instructional planning and HOD vetting.",does:"Provides a structured digital template where teachers author daily and weekly lesson plans, establishing core learning objectives, teaching methodologies, and assessment strategies for HOD vetting.",who:"Teachers author; HODs vet.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "behaviour":{purpose:"Behavioral tracking and disciplinary action recording.",does:"A specialized pastoral care ledger for tracking student behavioral milestones, positive conduct citations, disciplinary infractions, and administrative intervention measures.",who:"Staff and Admin.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "support_plans":{purpose:"Individualized Education Plans and academic interventions.",does:"Manages Individualized Education Plans (IEP) and specialized learning accommodations for students requiring academic remediation, specialized therapy, or behavioral support.",who:"Staff and Admin.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "donations":{purpose:"Philanthropic endowment tracking and benefactor logging.",does:"A secure financial ledger maintaining comprehensive records of institutional endowments, alumni donations, corporate grants, and charitable contributions complete with benefactor metadata.",who:"Admin and Super Admin.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "substitutions":{purpose:"Emergency class cover and absentee teacher replacement.",does:"Maintains operational continuity by managing emergency teacher substitutions. Reassigns available teaching staff to cover classes for absent colleagues based on active availability rosters.",who:"Staff and Admin.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "helpdesk":{purpose:"Institutional ticketing for repairs, IT, and maintenance.",does:"A complete institutional service desk where staff and students lodge repair tickets for broken campus hardware, IT network issues, plumbing faults, and physical facility maintenance.",who:"All users submit; Admin resolves.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "payments_online":{purpose:"Digital payment tracking and secure fee gateways.",does:"Integrates electronic fee transactions, digital bank transfers, and online payment gateway logs into the master school financial dashboard, generating verified instant e-receipts.",who:"Admin manage; Parents/Students pay.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "school_calendar":{purpose:"Master academic event schedule and holiday tracking.",does:"The definitive institutional calendar displaying term start dates, examination timeframes, public holidays, sports events, and parent-teacher meeting schedules for the entire school community.",who:"Staff manage; All users view.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "lost_found":{purpose:"Campus property logging for lost items and claims.",does:"A campus property ledger where staff and students log found personal items, textbooks, and electronic devices. Records item descriptions, finding locations, and successful property claims.",who:"All users view; Staff manage.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "parent_meeting":{purpose:"PTA assembly logging, scheduling, and official minutes.",does:"Manages institutional Parent-Teacher Association (PTA) assemblies, individual teacher consultation schedules, official meeting agendas, and published assembly minutes.",who:"Staff manage; Parents view.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."},
      "book_request":{purpose:"Student book reservation and lending requests.",does:"A dedicated library service portal where students and staff request physical book reservations, track lending availability, and lodge requests for new curriculum textbooks.",who:"Students/Staff request; Librarian manages.",advantages:["Full RLS security", "Easy export & reporting", "Instant search & dropdowns"],benefit:"Streamlined digital operations with complete accountability."}},
    renderPageInfo(id) {
      if (window.SC_HELP && SC_HELP.get && SC_HELP.format) return SC_HELP.format(SC_HELP.get(id));
      const i = this.PAGE_INFO[id];
      if (!i) return this.PAGE_HELP[id] || ('This is the **' + id.replace(/-/g, ' ') + '** page. Ask me anything specific about it!');
      return '📖 **' + (id.charAt(0).toUpperCase() + id.slice(1)).replace(/-/g, ' ').replace(/_/g, ' ') + ' page**\n\n' +
        '**What it is:** ' + i.purpose + '\n\n' +
        '**What it does:** ' + i.does + '\n\n' +
        '**Who uses it:** ' + i.who + '\n\n' +
        '**Advantages:** ' + i.advantages.map(a => '• ' + a).join('  ') + '\n\n' +
        '**Benefit to the school:** ' + i.benefit;
    },
    currentPageId() { return (location.pathname.split('/').pop() || 'dashboard').replace('.html', '') || 'dashboard'; },
    explainPage() {
      const id = this.currentPageId();
      const msg = this.renderPageInfo(id);
      Super.chatbot.toggle(true);
      this.history.push({ from: 'bot', msg: msg, chips: ['How do I add a record?', 'Who can use this?', 'What are the benefits?', 'Back to topics'] });
      this.render();
    },
    mount() {
      if (typeof document === 'undefined' || document.getElementById('sc-chatbot')) return;
      const wrap = document.createElement('div');
      wrap.id = 'sc-chatbot';
      wrap.innerHTML = `
        <button id="sc-chat-fab" title="Help" aria-label="Open help assistant"
          style="position:fixed;right:18px;bottom:18px;z-index:9998;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;background:var(--primary,#4f46e5);color:#fff;font-size:24px;box-shadow:0 8px 24px rgba(0,0,0,.25)">💬</button>
        <div id="sc-chat-win" style="display:none;position:fixed;right:18px;bottom:84px;z-index:9999;width:340px;max-width:92vw;height:460px;max-height:75vh;background:#fff;border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,.3);flex-direction:column;overflow:hidden">
          <div style="background:var(--primary,#4f46e5);color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:center">
            <strong>School Assistant</strong><button id="sc-chat-x" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer">×</button>
          </div>
          <div id="sc-chat-msgs" style="flex:1;overflow-y:auto;padding:14px;background:#f8fafc;font-size:.9rem"></div>
          <div style="display:flex;gap:6px;padding:10px;border-top:1px solid #e2e8f0">
            <input id="sc-chat-in" placeholder="Ask about CBT, results, fees…" style="flex:1;padding:9px 12px;border:1px solid #cbd5e1;border-radius:10px;font-size:.9rem">
            <button id="sc-chat-send" style="background:var(--primary,#4f46e5);color:#fff;border:none;border-radius:10px;padding:0 14px;cursor:pointer">➤</button>
          </div>
        </div>`;
      document.body.appendChild(wrap);
      document.getElementById('sc-chat-fab').onclick = () => Super.chatbot.toggle();
      document.getElementById('sc-chat-x').onclick = () => Super.chatbot.toggle(false);
      document.getElementById('sc-chat-send').onclick = () => Super.chatbot.send();
      document.getElementById('sc-chat-in').addEventListener('keydown', e => { if (e.key === 'Enter') Super.chatbot.send(); });
      this.history.push({ from: 'bot', msg: 'Hi! 👋 I\'m the ' + ((Super.school && Super.school.name) || 'school') + ' assistant. I explain pages in simple first-time-user language: what a feature means, who should use it, how to use it step by step, security/role rules, and the benefit to the school. Ask me about CBT, fees, results, attendance, dashboards, deployment, or tap a suggestion. Tip: press **Ctrl+K** to search permitted pages.', chips: ['Explain this page','Role based navigation','CBT exams','Fees','Report cards','Deployment'] });
    },
    toggle(force) {
      const w = document.getElementById('sc-chat-win'); if (!w) return;
      this.open = force !== undefined ? force : !this.open;
      w.style.display = this.open ? 'flex' : 'none';
      if (this.open) { this.render(); const i = document.getElementById('sc-chat-in'); if (i) i.focus(); }
    },
    ask(text) { const i = document.getElementById('sc-chat-in'); if (i) i.value = text; this.send(); },
    send() {
      const i = document.getElementById('sc-chat-in'); if (!i) return;
      const msg = i.value.trim(); if (!msg) return;
      this.history.push({ from: 'user', msg }); i.value = ''; this.render();
      setTimeout(() => { const a = this.answer(msg); this.history.push({ from: 'bot', msg: a.r, link: a.p, chips: a.chips }); this.render(); }, 220);
    },
    /* Scored, fuzzy keyword matching — picks the BEST entry, not just the first.
       Returns { r: replyText, p: pageLink, chips: [followups] }. */
    answer(msg) {
      const l = ' ' + msg.toLowerCase().replace(/[^a-z0-9 ]/g, ' ') + ' ';
      // Per-page contextual help (issue 3)
      if (/(what is|about|explain|help with|how does|details|guide|use).*(this|the)?\s*(page|section|screen|module)?|^\s*this page\s*$|^\s*about\s*$/.test(l) || /\bback to topics\b/.test(l)) {
        if (/back to topics/.test(l)) return { r: 'Sure — pick a topic:', chips: this.QUICK };
        const id = this.currentPageId();
        return { r: this.renderPageInfo(id), chips: ['How do I add a record?', 'Who can use this?', 'What are the benefits?', 'Back to topics'] };
      }
      if (/where.*(dropdown|options|come from)|how.*dropdown/.test(l)) return { r: 'Dropdowns are populated from your own data: students from the **Students** page, classes from **Classes**, subjects from **Subjects**, and lists like *audience* from **Settings → lookups**. Register them once and pick them everywhere — no retyping.', chips: this.QUICK };
      if (/how.*(add|create).*(record|entry|new)/.test(l)) return { r: 'Click **+ Add new** on the page. A form opens — fields with dropdowns let you pick existing students/classes/subjects/terms instead of typing. Fill it and click **Save**.', chips: this.QUICK };
      let best = null, bestScore = 0;
      for (const e of this.KB) {
        let score = 0;
        for (const k of e.m) {
          if (l.includes(' ' + k + ' ') || l.includes(k)) score += k.split(' ').length + k.length / 10;
        }
        if (score > bestScore) { bestScore = score; best = e; }
      }
      if (best && bestScore > 0) return { r: best.r, p: best.p, chips: best.chips };
      if (/\b(thanks|thank you|thx)\b/.test(l)) return { r: 'You\'re welcome! 🎉 Anything else?', chips: this.QUICK };
      if (/\b(hi|hello|hey|good (morning|afternoon|evening))\b/.test(l)) return { r: 'Hello! How can I help? Pick a topic:', chips: this.QUICK };
      if (/\b(bye|goodbye)\b/.test(l)) return { r: 'Goodbye! 👋 Reopen me anytime from the 💬 button.' };
      if (window.SC_HELP && SC_HELP.pages) {
        for (const key in SC_HELP.pages) {
          const h = SC_HELP.pages[key];
          const hay = (key + ' ' + (h.title||'') + ' ' + (h.purpose||'')).toLowerCase();
          if (hay && l.length > 2 && hay.includes(l.replace(/page|module|explain|what is|how to|open/g,'').trim())) {
            return { r: SC_HELP.format(h), chips: ['How do I use it?', 'Who can use this?', 'Back to topics'] };
          }
        }
      }

      // No match → suggest closest topics + Ctrl+K
      return { r: 'I\'m not sure about that exact wording, but here are things I can help with — tap one, or press **Ctrl+K** to search the whole portal.', chips: ['CBT exams', 'Report cards', 'Fees', 'Attendance', 'Timetable', 'Voting'] };
    },
    render() {
      const box = document.getElementById('sc-chat-msgs'); if (!box) return;
      box.innerHTML = this.history.map(m => {
        const bubble = `<div style="margin:8px 0;display:flex;${m.from === 'user' ? 'justify-content:flex-end' : ''}">
          <div style="max-width:82%;padding:9px 12px;border-radius:12px;${m.from === 'user' ? 'background:var(--primary,#4f46e5);color:#fff' : 'background:#fff;border:1px solid #e2e8f0'}">${Super.esc(m.msg).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}${m.link ? '<div style="margin-top:8px"><a href="' + Super.esc(m.link) + '" style="color:var(--primary,#4f46e5);font-weight:700;text-decoration:none">Open page →</a></div>' : ''}</div></div>`;
        const chips = (m.chips && m.chips.length) ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 10px">${m.chips.map(c => `<button onclick="Super.chatbot.ask('${Super.esc(c).replace(/'/g, "\\'")}')" style="background:#eef2ff;color:var(--primary,#4f46e5);border:1px solid #c7d2fe;border-radius:14px;padding:5px 11px;font-size:.78rem;cursor:pointer">${Super.esc(c)}</button>`).join('')}</div>` : '';
        return bubble + chips;
      }).join('');
      box.scrollTop = box.scrollHeight;
    }
  },

  /* ==================================================================
     2) GLOBAL COMMAND PALETTE / CROSS-MODULE SEARCH (Ctrl+K)
        Interconnects every module: jump to pages AND search live data.
     ================================================================== */
  palette: {
    open: false,
    PAGES: [
      ['Dashboard', 'dashboard.html', '🏠'], ['Students', 'students.html', '👨‍🎓'],
      ['Staff', 'staff.html', '👨‍🏫'], ['Attendance', 'attendance.html', '📋'],
      ['Results', 'results.html', '📊'], ['Report Cards', 'report-cards.html', '🧾'],
      ['CBT / Exams', 'cbt.html', '🧠'], ['Fees', 'fees.html', '💰'],
      ['Analytics', 'analytics.html', '📈'], ['Voting', 'voting.html', '🗳️'],
      ['Notifications', 'notifications.html', '🔔'], ['ID Cards', 'idcards.html', '🪪'],
      ['Certificates', 'certificates.html', '📜'], ['Admin Data', 'admin-data.html', '🗄️'],
      ['Announcements', 'announcements.html', '📢'], ['Events', 'events.html', '🎭'],
      ['Timetable Generator', 'timetable-generator.html', '🗓️'], ['QR Check-in', 'checkin.html', '📲'],
      ['Student Diary', 'diary.html', '📔'], ['Surveys', 'surveys.html', '🗒️'], ['Menu Planner', 'menu.html', '🍽️'], ['Settings', 'settings.html', '⚙️']
    ],
    mount() {
      if (typeof document === 'undefined' || document.getElementById('sc-palette')) return;
      const el = document.createElement('div');
      el.id = 'sc-palette';
      el.style.cssText = 'display:none;position:fixed;inset:0;z-index:10000;background:rgba(15,23,42,.5);align-items:flex-start;justify-content:center;padding-top:12vh';
      el.innerHTML = `<div style="width:560px;max-width:94vw;background:#fff;border-radius:14px;box-shadow:0 30px 60px rgba(0,0,0,.4);overflow:hidden">
        <input id="sc-pal-in" placeholder="Search modules, students, staff, exams…  (Esc to close)" style="width:100%;padding:16px 18px;border:none;border-bottom:1px solid #e2e8f0;font-size:1rem;outline:none">
        <div id="sc-pal-res" style="max-height:50vh;overflow-y:auto"></div>
      </div>`;
      document.body.appendChild(el);
      el.addEventListener('click', e => { if (e.target === el) Super.palette.toggle(false); });
      document.getElementById('sc-pal-in').addEventListener('input', e => Super.palette.search(e.target.value));
      document.getElementById('sc-pal-in').addEventListener('keydown', e => { if (e.key === 'Escape') Super.palette.toggle(false); });
    },
    toggle(force) {
      const el = document.getElementById('sc-palette'); if (!el) return;
      this.open = force !== undefined ? force : !this.open;
      el.style.display = this.open ? 'flex' : 'none';
      if (this.open) { const i = document.getElementById('sc-pal-in'); if (i) { i.value = ''; i.focus(); } this.render(this.PAGES.map(p => ({ label: p[0], href: p[1], icon: p[2] }))); }
    },
    async search(q) {
      q = (q || '').trim();
      const pages = this.PAGES.filter(p => p[0].toLowerCase().includes(q.toLowerCase())).map(p => ({ label: p[0], href: p[1], icon: p[2] }));
      if (q.length < 2 || !Super.sb) { this.render(pages); return; }
      const results = pages.slice();
      try {
        const [st, sf, ex] = await Promise.all([
          Super.sb.from('students').select('id,full_name,class,admission_no').ilike('full_name', '%' + q + '%').limit(5),
          Super.sb.from('staff').select('id,full_name,role').ilike('full_name', '%' + q + '%').limit(5),
          Super.sb.from('cbt_exams').select('id,subject,code').or('subject.ilike.%' + q + '%,code.ilike.%' + q + '%').limit(5)
        ]);
        (st.data || []).forEach(s => results.push({ label: '👨‍🎓 ' + s.full_name + ' — ' + (s.class || ''), href: 'students.html?q=' + encodeURIComponent(s.full_name) }));
        (sf.data || []).forEach(s => results.push({ label: '👨‍🏫 ' + s.full_name + ' — ' + (s.role || ''), href: 'staff.html?q=' + encodeURIComponent(s.full_name) }));
        (ex.data || []).forEach(e => results.push({ label: '🧠 ' + e.subject + ' (' + e.code + ')', href: 'cbt.html?code=' + e.code }));
      } catch (e) { /* offline / demo */ }
      this.render(results);
    },
    render(items) {
      const box = document.getElementById('sc-pal-res'); if (!box) return;
      if (!items.length) { box.innerHTML = '<div style="padding:18px;color:#64748b">No matches.</div>'; return; }
      box.innerHTML = items.map(i => `<a href="${i.href}" style="display:flex;gap:10px;padding:12px 18px;text-decoration:none;color:#0f172a;border-bottom:1px solid #f1f5f9">${i.icon ? '<span>' + i.icon + '</span>' : ''}<span>${Super.esc(i.label)}</span></a>`).join('');
    }
  },

  /* ==================================================================
     3) MULTI-CHANNEL NOTIFICATION FAN-OUT (interconnection hooks)
        Call Super.notify.fire(...) from any module after an event.
        Writes an in-app notification row and offers free WA/email/SMS.
     ================================================================== */
  notify: {
    async fire(title, body, opts) {
      opts = opts || {};
      if (Super.sb) {
        try {
          await Super.sb.from('notifications').insert({
            title, body: body || '', url: opts.url || '',
            audience: opts.audience || 'all', priority: opts.priority || 'normal',
            channels: opts.channels || ['inapp']
          });
        } catch (e) { /* table optional */ }
      }
      // Browser push (if the SW + permission exist)
      try { if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body: body || '' }); } catch (e) {}
      // Free deep links the caller can present to the user
      return {
        whatsapp: 'https://wa.me/?text=' + encodeURIComponent(title + '\n' + (body || '')),
        email: 'mailto:?subject=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(body || ''),
        sms: 'sms:?body=' + encodeURIComponent(title + ' ' + (body || ''))
      };
    }
  },

  /* ==================================================================
     4) ID-CARD GENERATOR (QR via free Google Chart API fallback + canvas)
     ================================================================== */
  /* Issue 11: render a pasted link (Google Drive image/video, YouTube, direct
     image/video URL) as a clickable thumbnail. No upload, no AI. */
  media: {
    driveId(url) {
      let m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/) || url.match(/drive\.google\.com\/open\?id=([^&]+)/);
      return m ? m[1] : '';
    },
    ytId(url) {
      let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
      return m ? m[1] : '';
    },
    kind(url) {
      if (!url) return 'none';
      if (this.ytId(url)) return 'youtube';
      if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) return 'video';
      if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url)) return 'image';
      const did = this.driveId(url);
      if (did) return 'drive';
      return 'link';
    },
    thumb(url, opts) {
      opts = opts || {}; const w = opts.w || 120, h = opts.h || 80;
      if (!url) return '';
      const k = this.kind(url);
      const box = 'width:' + w + 'px;height:' + h + 'px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0;background:#f1f5f9';
      if (k === 'youtube') {
        const id = this.ytId(url);
        return '<a href="' + Super.esc(url) + '" target="_blank" rel="noopener" title="Play video"><img src="https://img.youtube.com/vi/' + id + '/mqdefault.jpg" style="' + box + '" alt="video"><span style="margin-left:-' + (w / 2 + 8) + 'px;color:#fff;font-size:1.2rem;text-shadow:0 1px 3px #000">▶</span></a>';
      }
      if (k === 'drive') {
        const id = this.driveId(url);
        return '<a href="' + Super.esc(url) + '" target="_blank" rel="noopener"><img src="https://drive.google.com/uc?export=view&id=' + id + '" referrerpolicy="no-referrer" style="' + box + '" alt="media" onerror="this.onerror=null;this.outerHTML=\'<a href=&quot;' + Super.esc(url) + '&quot; target=_blank>🔗 open link</a>\'"></a>';
      }
      if (k === 'image') return '<a href="' + Super.esc(url) + '" target="_blank" rel="noopener"><img src="' + Super.esc(url) + '" style="' + box + '" alt="img" loading="lazy"></a>';
      if (k === 'video') return '<video src="' + Super.esc(url) + '" style="' + box + '" muted controls preload="metadata"></video>';
      return '<a href="' + Super.esc(url) + '" target="_blank" rel="noopener">🔗 open link</a>';
    }
  },

  idcard: {
    qrUrl(data, size) { size = size || 120; return 'https://api.qrserver.com/v1/create-qr-code/?size=' + size + 'x' + size + '&data=' + encodeURIComponent(data); },
    /* Convert a Google-Drive share link to a direct-image URL so student
       photos stored on Drive actually render on the ID card (issue 11). */
    driveDirect(url) {
      if (!url) return '';
      let m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
      if (m) return 'https://drive.google.com/uc?export=view&id=' + m[1];
      m = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
      if (m) return 'https://drive.google.com/uc?export=view&id=' + m[1];
      return url;
    },
    html(person) {
      const s = Super.school || {};
      const photo = this.driveDirect(person.photo_url || '');
      const initial = (person.full_name || person.name || 'S').charAt(0).toUpperCase();
      const photoImg = photo
        ? `<img src="${Super.esc(photo)}" referrerpolicy="no-referrer" style="width:70px;height:70px;border-radius:10px;object-fit:cover;background:#f1f5f9" alt="photo" onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='flex'"><div style="display:none;width:70px;height:70px;border-radius:10px;background:var(--primary,#4f46e5);color:#fff;align-items:center;justify-content:center;font-weight:900;font-size:1.6rem">${initial}</div>`
        : `<div style="width:70px;height:70px;border-radius:10px;background:var(--primary,#4f46e5);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1.6rem">${initial}</div>`;
      const isStaff = (person.type === 'staff');
      const idNo = person.admission_no || person.staff_no || person.id || '';
      const qr = this.qrUrl(JSON.stringify({ id: idNo, name: person.full_name || person.name || '', type: person.type || 'student' }));
      const tag = isStaff ? 'STAFF IDENTITY CARD' : 'STUDENT IDENTITY CARD';
      // build the detail rows (professional, complete — issue 14)
      const rows = [];
      const add = (k, v) => { if (v) rows.push('<tr><td style="color:#64748b;padding:1px 8px 1px 0;white-space:nowrap">' + Super.esc(k) + '</td><td style="font-weight:600">' + Super.esc(v) + '</td></tr>'); };
      add('ID No', idNo);
      if (isStaff) { add('Designation', person.role); add('Department', person.department); add('Type', person.staff_type); }
      else { add('Class', person.class); add('Arm', person.arm); }
      add('Gender', person.gender); add('Phone', person.phone);
      add('Blood', person.blood_group);
      const session = (s.session || (new Date().getFullYear() + '/' + (new Date().getFullYear() + 1)));
      const pc = person.pc || s.primary || 'var(--primary,#4f46e5)';
      const ac = person.ac || s.accent || 'var(--accent,#0ea5e9)';
      const tpl = person.template || 'horizontal';
      const logo = 'assets/img/logo.' + (s.logoExt || 'svg');
      const contactFooter = '<div style="background:#f1f5f9;padding:7px 14px;font-size:.62rem;color:#475569;text-align:center;line-height:1.5">' +
        (s.address ? '📍 ' + Super.esc(s.address) + '<br>' : '') +
        [s.phone ? '📞 ' + Super.esc(s.phone) : '', s.email ? '✉️ ' + Super.esc(s.email) : ''].filter(Boolean).join(' · ') +
        (s.motto ? '<br><em style="color:#64748b">"' + Super.esc(s.motto) + '"</em>' : '') + '</div>';
      const credit = '<div style="background:#0f172a;color:#94a3b8;font-size:.56rem;text-align:center;padding:3px 0">If found, please return to the school office · Powered by HMG Concepts</div>';
      const bigPhoto = photo
        ? '<img src="' + Super.esc(photo) + '" referrerpolicy="no-referrer" style="width:110px;height:110px;border-radius:12px;object-fit:cover;border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.2);background:#f1f5f9" alt="photo" onerror="this.onerror=null;this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><div style="display:none;width:110px;height:110px;border-radius:12px;background:' + pc + ';color:#fff;align-items:center;justify-content:center;font-weight:900;font-size:2.4rem;border:3px solid #fff">' + initial + '</div>'
        : '<div style="width:110px;height:110px;border-radius:12px;background:' + pc + ';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:2.4rem;border:3px solid #fff">' + initial + '</div>';

      // VERTICAL (portrait, lanyard-style) professional template (issue 3)
      if (tpl === 'vertical') {
        return '<div class="sc-idcard" style="position:relative;width:300px;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;font-family:\'Segoe UI\',Arial,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.18);background:#fff">' +
          '<div style="height:14px;background:linear-gradient(90deg,' + pc + ',' + ac + ')"></div>' +
          '<div style="text-align:center;padding:14px 14px 0"><img src="' + logo + '" style="width:46px;height:46px;border-radius:10px;object-fit:contain" onerror="this.style.display=\'none\'">' +
          '<div style="font-weight:800;color:#0f172a;margin-top:4px;line-height:1.15">' + Super.esc(s.name || 'School') + '</div>' +
          '<div style="font-size:.62rem;color:#64748b">' + Super.esc(s.motto || '') + '</div></div>' +
          '<div style="background:' + (isStaff ? '#0f766e' : pc) + ';color:#fff;font-size:.62rem;letter-spacing:1.5px;text-align:center;padding:4px 0;font-weight:700;margin:10px 0">' + tag + '</div>' +
          '<div style="text-align:center;padding:0 14px">' + bigPhoto + '<div style="font-weight:800;font-size:1.05rem;margin-top:8px;color:#0f172a">' + Super.esc(person.full_name || person.name || '') + '</div>' +
          '<table style="font-size:.74rem;margin:6px auto 0;border-collapse:collapse;text-align:left">' + rows.join('') + '</table></div>' +
          '<div style="display:flex;justify-content:center;padding:10px 0 6px"><img src="' + qr + '" style="width:74px;height:74px"></div>' +
          '<div style="text-align:center;font-size:.6rem;color:#64748b;margin-bottom:6px">Session: <strong>' + Super.esc(session) + '</strong></div>' +
          contactFooter + credit + '</div>';
      }
      // CORPORATE (dark, premium) horizontal template
      if (tpl === 'corporate') {
        return '<div class="sc-idcard" style="width:360px;border-radius:16px;overflow:hidden;font-family:\'Segoe UI\',Arial,sans-serif;box-shadow:0 12px 30px rgba(0,0,0,.25);background:#0f172a;color:#e2e8f0">' +
          '<div style="padding:14px 16px;display:flex;align-items:center;gap:10px;border-bottom:2px solid ' + ac + '">' +
          '<img src="' + logo + '" style="width:40px;height:40px;border-radius:9px;background:#fff;padding:3px;object-fit:contain" onerror="this.style.display=\'none\'">' +
          '<div style="flex:1"><strong style="font-size:.98rem;color:#fff">' + Super.esc(s.name || 'School') + '</strong><div style="font-size:.64rem;color:#94a3b8">' + Super.esc(s.motto || '') + '</div></div>' +
          '<span style="font-size:.58rem;letter-spacing:1px;color:' + ac + ';font-weight:700">' + tag + '</span></div>' +
          '<div style="display:flex;gap:14px;padding:16px;align-items:center">' + bigPhoto.replace('110px;height:110px', '92px;height:92px') +
          '<div style="flex:1"><div style="font-weight:800;font-size:1.05rem;color:#fff">' + Super.esc(person.full_name || person.name || '') + '</div>' +
          '<table style="font-size:.73rem;margin-top:5px;border-collapse:collapse;color:#cbd5e1">' + rows.join('').replace(/#64748b/g, '#94a3b8').replace(/font-weight:600/g, 'font-weight:600;color:#fff') + '</table></div>' +
          '<img src="' + qr + '" style="width:66px;height:66px;background:#fff;padding:3px;border-radius:6px"></div>' +
          '<div style="background:#1e293b;padding:7px 14px;font-size:.6rem;color:#94a3b8;text-align:center">' + Super.esc(s.address || '') + ' · ' + Super.esc(s.phone || '') + ' · ' + Super.esc(s.email || '') + '</div>' +
          '<div style="background:' + ac + ';color:#0f172a;font-size:.56rem;text-align:center;padding:3px 0;font-weight:700">Session ' + Super.esc(session) + ' · Powered by HMG Concepts</div></div>';
      }
      // HORIZONTAL (default, enhanced)
      return `<div class="sc-idcard" style="width:340px;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;font-family:'Segoe UI',Arial,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.12);background:#fff">
        <div style="background:linear-gradient(135deg,${pc},${ac});color:#fff;padding:12px 14px;display:flex;align-items:center;gap:10px">
          <img src="${logo}" style="width:38px;height:38px;border-radius:9px;background:#fff;padding:3px;object-fit:contain" alt="" onerror="this.style.display='none'">
          <div style="flex:1;min-width:0"><strong style="font-size:.95rem;display:block;line-height:1.15">${Super.esc(s.name || 'School')}</strong><div style="font-size:.66rem;opacity:.92">${Super.esc(s.motto || '')}</div></div>
        </div>
        <div style="background:${isStaff ? '#0f766e' : '#1d4ed8'};color:#fff;font-size:.64rem;letter-spacing:1.5px;text-align:center;padding:3px 0;font-weight:700">${tag}</div>
        <div style="display:flex;gap:12px;padding:14px 14px 6px;align-items:flex-start">
          <div style="flex-shrink:0">${photoImg}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:800;font-size:1rem;line-height:1.2;color:#0f172a">${Super.esc(person.full_name || person.name || '')}</div>
            <table style="font-size:.74rem;margin-top:5px;border-collapse:collapse">${rows.join('')}</table>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;padding:0 14px 10px">
          <div style="font-size:.62rem;color:#64748b">
            <div>Session: <strong>${Super.esc(session)}</strong></div>
            <div style="margin-top:10px;border-top:1px solid #cbd5e1;width:90px;text-align:center;font-size:.58rem;padding-top:1px">Signature</div>
          </div>
          <img src="${qr}" style="width:64px;height:64px" alt="QR">
        </div>
        ${contactFooter}${credit}
      </div>`;
    },
    print(person) {
      const w = window.open('', '_blank');
      w.document.write('<html><head><title>ID Card</title></head><body style="display:flex;justify-content:center;padding:30px">' + this.html(person) + '<script>window.onload=()=>window.print()<\/script></body></html>');
      w.document.close();
    }
  },

  /* ==================================================================
     5) CERTIFICATE GENERATOR (printable, verifiable code)
     ================================================================== */
  cert: {
    code() { const c = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = 'SC-'; for (let i = 0; i < 8; i++) s += c[Math.floor(Math.random() * c.length)]; return s; },
    html(opts) {
      const s = Super.school || {}; const code = opts.code || this.code();
      return `<div class="sc-cert" style="width:800px;max-width:96vw;border:10px solid var(--primary,#4f46e5);padding:40px;text-align:center;font-family:Georgia,serif;background:#fff">
        <img src="assets/img/logo.${(s.logoExt || 'svg')}" style="width:70px;height:70px;border-radius:12px;object-fit:contain" alt="">
        <h1 style="margin:10px 0 4px">${Super.esc(s.name || 'School')}</h1>
        <p style="color:#64748b;margin:0 0 20px">${Super.esc(s.motto || '')}</p>
        <h2 style="letter-spacing:2px;color:var(--primary,#4f46e5)">${Super.esc(opts.title || 'CERTIFICATE OF ACHIEVEMENT')}</h2>
        <p style="margin:18px 0 6px">This is to certify that</p>
        <h2 style="margin:0;border-bottom:2px solid #e2e8f0;display:inline-block;padding:0 30px 6px">${Super.esc(opts.name || '')}</h2>
        <p style="max-width:560px;margin:18px auto;line-height:1.6">${Super.esc(opts.body || 'has successfully met the requirements and is hereby recognised for outstanding achievement.')}</p>
        <div style="display:flex;justify-content:space-between;margin-top:40px;font-size:.85rem">
          <div>____________________<br>Date: ${Super.esc(opts.date || new Date().toLocaleDateString())}</div>
          <div>____________________<br>${Super.esc(opts.signatory || 'Head of School')}</div>
        </div>
        <p style="margin-top:24px;font-size:.72rem;color:#94a3b8">Verification code: <strong>${Super.esc(code)}</strong> · Verify at ${Super.esc((typeof location!=='undefined'?location.origin:''))}</p>
      </div>`;
    },
    print(opts) {
      const w = window.open('', '_blank');
      w.document.write('<html><head><title>Certificate</title></head><body style="display:flex;justify-content:center;padding:20px">' + this.html(opts) + '<script>window.onload=()=>window.print()<\/script></body></html>');
      w.document.close();
    }
  },

  /* ==================================================================
     6) FLYER / MARKETING GENERATOR (printable promo poster — lead gen)
     ================================================================== */
  flyer: {
    // Fully customisable (issue 15): colours, fonts, layouts, headline, bullets,
    // CTA. Pass an options object; sensible defaults pull from the school config.
    // Professional palettes (issue 2) for one-click international-standard looks.
    PALETTES: {
      royal:   { pc:'#1e3a8a', ac:'#f59e0b', text:'#ffffff' },
      emerald: { pc:'#065f46', ac:'#fbbf24', text:'#ffffff' },
      crimson: { pc:'#7f1d1d', ac:'#fca5a5', text:'#ffffff' },
      violet:  { pc:'#4f46e5', ac:'#a78bfa', text:'#ffffff' },
      teal:    { pc:'#0f766e', ac:'#5eead4', text:'#ffffff' },
      slate:   { pc:'#0f172a', ac:'#38bdf8', text:'#ffffff' },
      sunset:  { pc:'#b45309', ac:'#fde047', text:'#ffffff' }
    },
    SIZES: { a4portrait:{w:620,minh:860}, a5portrait:{w:520,minh:720}, square:{w:600,minh:600}, story:{w:480,minh:850}, landscape:{w:760,minh:480} },
    defaults() {
      const s = Super.school || {};
      return {
        title: s.name || 'Our School',
        tagline: s.motto || 'Excellence in Education',
        headline: 'ADMISSION IN PROGRESS',
        bullets: ['Online results & report cards', 'CBT / online exams from any device', 'Fees, attendance & parent updates', 'Installable app + instant notifications'],
        cta: 'Apply today — limited spaces!',
        pc: '#4f46e5', ac: '#7c3aed', text: '#ffffff',
        font: "system-ui,'Segoe UI',Arial,sans-serif",
        layout: 'gradient', // gradient | banner | minimal | sidebar | poster | elegant
        size: 'a4portrait', badge: 'NEW SESSION', ribbon: true, pattern: true, contactBar: true,
        year: (new Date().getFullYear()) + '/' + (new Date().getFullYear() + 1)
      };
    },
    html(o) {
      o = Object.assign(this.defaults(), o || {});
      const s = Super.school || {};
      const logo = `assets/img/logo.${(s.logoExt || 'svg')}`;
      const bullets = (o.bullets || []).map(b => `<p style="margin:7px 0;display:flex;align-items:flex-start;gap:8px"><span style="color:${o.ac};font-weight:900">✓</span><span>${Super.esc(b)}</span></p>`).join('');
      const contact = o.contactBar !== false ? `<div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.25)"><p style="font-weight:700;margin:4px 0">📞 ${Super.esc(s.phone || '')} &nbsp; ✉️ ${Super.esc(s.email || '')}</p><p style="font-size:.78rem;opacity:.9;margin:0">📍 ${Super.esc(s.address || '')}</p></div>` : '';
      const credit = '<p style="margin-top:14px;font-size:.68rem;opacity:.75">Powered by HMG Concepts</p>';
      const sz = this.SIZES[o.size] || this.SIZES.a4portrait;
      // professional decorations
      const ribbon = o.ribbon ? `<div style="position:absolute;top:18px;right:-42px;transform:rotate(45deg);background:${o.ac};color:#1f2937;font-weight:800;font-size:.7rem;padding:6px 50px;box-shadow:0 2px 6px rgba(0,0,0,.2)">${Super.esc(o.year || '')}</div>` : '';
      const badge = o.badge ? `<div style="display:inline-block;background:${o.ac};color:#1f2937;font-weight:800;font-size:.72rem;letter-spacing:1px;padding:5px 14px;border-radius:20px;margin-bottom:10px">${Super.esc(o.badge)}</div>` : '';
      const pattern = o.pattern ? `background-image:radial-gradient(circle at 20% 10%,rgba(255,255,255,.10) 0,transparent 40%),radial-gradient(circle at 90% 80%,rgba(255,255,255,.08) 0,transparent 35%);` : '';
      const base = `position:relative;overflow:hidden;width:${sz.w}px;min-height:${sz.minh}px;max-width:96vw;border-radius:18px;padding:40px;font-family:${o.font};color:${o.text};box-shadow:0 18px 50px rgba(0,0,0,.25)`;

      if (o.layout === 'poster') {
        return `<div class="sc-flyer" style="${base};background:linear-gradient(160deg,${o.pc},${o.ac});${pattern};text-align:center">
          ${ribbon}
          <img src="${logo}" style="width:90px;height:90px;border-radius:18px;background:#fff;padding:6px;object-fit:contain;box-shadow:0 6px 16px rgba(0,0,0,.2)" onerror="this.style.display='none'">
          <h1 style="font-size:2.3rem;margin:16px 0 2px;letter-spacing:.5px">${Super.esc(o.title)}</h1>
          <p style="opacity:.95;margin:0 0 6px;font-style:italic">${Super.esc(o.tagline)}</p>
          ${badge}
          <div style="background:rgba(255,255,255,.12);backdrop-filter:blur(2px);border:1px solid rgba(255,255,255,.25);border-radius:16px;padding:22px;margin:16px 0">
            <h2 style="letter-spacing:2px;margin:0 0 14px">${Super.esc(o.headline)}</h2>
            <div style="text-align:left;max-width:380px;margin:0 auto">${bullets}</div>
          </div>
          <div style="background:#fff;color:${o.pc};font-weight:800;border-radius:30px;padding:12px 18px;display:inline-block;font-size:1.05rem;box-shadow:0 6px 16px rgba(0,0,0,.2)">${Super.esc(o.cta)}</div>
          ${contact}${credit}</div>`;
      }
      if (o.layout === 'elegant') {
        return `<div class="sc-flyer" style="${base};background:#fffdf7;color:#1f2937;border:1px solid #e7e2d0;font-family:Georgia,serif">
          <div style="border:2px solid ${o.pc};border-radius:12px;padding:30px;min-height:${sz.minh - 84}px;text-align:center">
            <img src="${logo}" style="width:76px;height:76px;border-radius:12px;object-fit:contain" onerror="this.style.display='none'">
            <h1 style="font-size:2rem;margin:12px 0 2px;color:${o.pc}">${Super.esc(o.title)}</h1>
            <p style="color:#6b7280;margin:0 0 10px;font-style:italic">${Super.esc(o.tagline)}</p>
            <div style="height:2px;width:80px;background:${o.ac};margin:12px auto"></div>
            <span style="display:inline-block;color:${o.ac};font-weight:700;letter-spacing:2px;margin-bottom:10px">${Super.esc(o.badge || '')}</span>
            <h2 style="letter-spacing:2px;color:${o.pc};margin:8px 0 16px">${Super.esc(o.headline)}</h2>
            <div style="text-align:left;max-width:400px;margin:0 auto;color:#1f2937">${bullets}</div>
            <p style="font-weight:800;margin:18px 0;color:${o.pc};font-size:1.1rem">${Super.esc(o.cta)}</p>
            <div style="border-top:1px solid #e7e2d0;padding-top:12px;color:#6b7280;font-size:.8rem">📞 ${Super.esc(s.phone || '')} · ✉️ ${Super.esc(s.email || '')}<br>📍 ${Super.esc(s.address || '')}</div>
          </div></div>`;
      }
      if (o.layout === 'minimal') {
        return `<div class="sc-flyer" style="${base};background:#fff;color:#0f172a;border:3px solid ${o.pc};text-align:center">
          <img src="${logo}" style="width:80px;height:80px;border-radius:16px;object-fit:contain" onerror="this.style.display='none'">
          <h1 style="font-size:2rem;margin:14px 0 2px;color:${o.pc}">${Super.esc(o.title)}</h1>
          <p style="color:#64748b">${Super.esc(o.tagline)}</p>
          <h2 style="letter-spacing:2px;color:${o.ac};margin:18px 0">${Super.esc(o.headline)}</h2>
          <div style="text-align:left;max-width:420px;margin:0 auto;color:#0f172a">${bullets}</div>
          <p style="font-weight:800;margin:20px 0;color:${o.pc}">${Super.esc(o.cta)}</p>${contact}${credit}</div>`;
      }
      if (o.layout === 'banner') {
        return `<div class="sc-flyer" style="${base};background:#fff;color:#0f172a;overflow:hidden;padding:0">
          <div style="background:linear-gradient(135deg,${o.pc},${o.ac});color:${o.text};padding:28px;text-align:center">
            <img src="${logo}" style="width:70px;height:70px;border-radius:14px;background:#fff;object-fit:contain" onerror="this.style.display='none'">
            <h1 style="font-size:1.9rem;margin:10px 0 2px">${Super.esc(o.title)}</h1>
            <p style="opacity:.95;margin:0">${Super.esc(o.tagline)}</p></div>
          <div style="padding:28px;text-align:center"><h2 style="letter-spacing:2px;color:${o.ac};margin:0 0 14px">${Super.esc(o.headline)}</h2>
          <div style="text-align:left;max-width:420px;margin:0 auto">${bullets}</div>
          <p style="font-weight:800;margin:18px 0;color:${o.pc}">${Super.esc(o.cta)}</p>${contact}${credit}</div></div>`;
      }
      if (o.layout === 'sidebar') {
        return `<div class="sc-flyer" style="${base};background:#fff;color:#0f172a;padding:0;display:flex;overflow:hidden">
          <div style="width:34%;background:linear-gradient(160deg,${o.pc},${o.ac});color:${o.text};padding:24px;text-align:center;display:flex;flex-direction:column;justify-content:center">
            <img src="${logo}" style="width:64px;height:64px;border-radius:12px;background:#fff;object-fit:contain;margin:0 auto" onerror="this.style.display='none'">
            <h1 style="font-size:1.3rem;margin:10px 0 4px">${Super.esc(o.title)}</h1><p style="font-size:.78rem;opacity:.95">${Super.esc(o.tagline)}</p></div>
          <div style="flex:1;padding:26px"><h2 style="letter-spacing:1.5px;color:${o.ac};margin:0 0 12px">${Super.esc(o.headline)}</h2>${bullets}
          <p style="font-weight:800;margin:16px 0;color:${o.pc}">${Super.esc(o.cta)}</p>${contact}${credit}</div></div>`;
      }
      // gradient (default)
      return `<div class="sc-flyer" style="${base};background:linear-gradient(135deg,${o.pc},${o.ac});text-align:center">
        <img src="${logo}" style="width:80px;height:80px;border-radius:16px;background:#fff;object-fit:contain" onerror="this.style.display='none'">
        <h1 style="font-size:2rem;margin:14px 0 4px">${Super.esc(o.title)}</h1>
        <p style="opacity:.95">${Super.esc(o.tagline)}</p>
        <h2 style="letter-spacing:2px;margin:16px 0 0">${Super.esc(o.headline)}</h2>
        <div style="background:rgba(255,255,255,.15);border-radius:14px;padding:20px;margin:18px 0;text-align:left">${bullets}</div>
        <p style="font-weight:800;margin:0 0 12px">${Super.esc(o.cta)}</p>${contact}${credit}</div>`;
    },
    print(o) {
      const w = window.open('', '_blank');
      w.document.write('<html><head><title>Flyer</title></head><body style="display:flex;justify-content:center;padding:20px">' + this.html(o) + '<script>window.onload=()=>window.print()<\/script></body></html>');
      w.document.close();
    }
  },

  /* ==================================================================
     7) PER-SCHOOL DATA EXPORT / IMPORT + DRAFT AUTOSAVE (from "Projects")
     ================================================================== */
  data: {
    autosaveKey(form) { return 'sc-draft-' + (form || location.pathname); },
    bindAutosave(formEl, key) {
      if (!formEl) return;
      key = key || this.autosaveKey();
      try { const saved = JSON.parse(localStorage.getItem(key) || '{}'); Object.keys(saved).forEach(n => { const f = formEl.elements[n]; if (f) f.value = saved[n]; }); } catch (e) {}
      formEl.addEventListener('input', () => {
        const obj = {}; [...formEl.elements].forEach(f => { if (f.name) obj[f.name] = f.value; });
        try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {}
      });
      formEl.addEventListener('submit', () => { try { localStorage.removeItem(key); } catch (e) {} });
    }
  }
};

if (typeof window !== 'undefined') window.Super = Super;
if (typeof console !== 'undefined') console.log('%c[School Connect Gen v3] super features loaded — chatbot, command palette (Ctrl+K), notify hooks, ID cards, certificates, flyer, autosave. No AI.', 'color:#db2777;font-weight:bold');
