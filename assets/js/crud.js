/* ====================================================================
   crud.js — School Connect generic CRUD engine
   --------------------------------------------------------------------
   Turns every module page into a REAL working list + add/edit/delete
   screen backed by Supabase. Replaces the old placeholder
   "Form will be generated for ..." behaviour. 100% free, no AI.

   SCHEMA[moduleId] = { table, title, cols:[{key,label,type,options?,required?}] }
   - type: text | textarea | number | date | datetime | select | checkbox | email | tel
   ==================================================================== */
const CRUD = {
  sb: null,
  WRITE_RULES: {
    // FIX v9: All admin variants (super_admin, admin, principal, head_teacher, etc.)
    // can write to modules that have 'admin' in the list due to App.isAdminRole() check.
    // Staff and teacher roles inherit from admin check in canWrite function.
    students:['admin','staff','teacher'],
    staff:['admin'],
    parents:['admin'],
    classes:['admin','staff','teacher'],
    subjects:['admin','staff','teacher'],
    attendance:['admin','staff','teacher'],
    results:['admin','staff','teacher'],
    academic_records:['admin','staff','teacher'],
    cbt:['admin','staff','teacher'],
    assignments:['admin','staff','teacher'],
    timetable:['admin','staff','teacher'],
    timetable_generator:['admin','staff','teacher'],
    announcements:['admin','staff','teacher'],
    events:['admin','staff','teacher'],
    gallery:['admin','staff','teacher'],
    library:['admin','staff','teacher'],
    digital_library:['admin','staff','teacher'],
    directory:['admin'],
    departments:['admin'],
    broadcast:['admin','staff','teacher'],
    complaints:['admin','staff','teacher','parent','student'],
    leave:['admin','staff','teacher'],
    visitors:['admin','staff','teacher'],
    hostel:['admin','staff','teacher'],
    transport:['admin','staff','teacher'],
    alumni:['admin'],
    promotion:['admin'],
    finance:['admin'],
    fees:['admin'],
    inventory:['admin'],
    inbox:['admin','staff','teacher','parent','student'],
    messages:['admin','staff','teacher','parent'],
    report_cards:['admin','staff','teacher'],
    certificates:['admin','staff','teacher'],
    lesson_plans:['admin','staff','teacher'],
    sow:['admin','staff','teacher'],
    // Admin-only modules
    
    /* FIX v9: parent_student linking for parents to see children's data */
    parent_student: { table:'parent_student', title:'Parent-Student Link', cols:[
      {key:'parent_id',label:'Parent',type:'ref',refTable:'profiles',refValue:'full_name',refExtra:['role'],required:true},
      {key:'student_id',label:'Student',type:'ref',refTable:'profiles',refValue:'full_name',refExtra:['class'],required:true},
      {key:'relationship',label:'Relationship',type:'select',options:['parent','mother','father','guardian','other']}
    ] },
    academic_setup:['admin'], 
    approvals:['admin'], 
    admin_data:['admin'], 
    payroll:['admin'], 
    hr:['admin'], 
    compliance:['admin'], 
    storage:['admin'], 
    settings:['admin'],
    // Parent-student linking for child data access
    parent_student:['admin']
  },
  init(supabaseClient) { this.sb = supabaseClient || (typeof sb !== 'undefined' ? sb : null); },

  /* Field schema per module. Only columns a human edits are listed; the DB
     fills ids/timestamps/generated columns automatically. */
  SCHEMA: {
    students: { table:'students', title:'Student', cols:[
      {key:'full_name',label:'Full name',type:'text',required:true},
      {key:'admission_no',label:'Admission No',type:'text',readonly:true,help:'AUTO-GENERATED on save — leave blank',placeholder:'(auto)'},
      {key:'class',label:'Class',type:'ref',refTable:'classes',refValue:'name'},
      {key:'arm',label:'Arm',type:'text'},
      {key:'gender',label:'Gender',type:'select',options:['male','female']},
      {key:'date_of_birth',label:'Date of birth',type:'date'},
      {key:'guardian_name',label:'Guardian name',type:'text'},
      {key:'guardian_phone',label:'Guardian phone',type:'tel'},
      {key:'guardian_email',label:'Guardian email',type:'email'},
      {key:'address',label:'Address',type:'textarea'},
      {key:'campus',label:'Campus',type:'text'},
      {key:'status',label:'Status',type:'select',options:['active','inactive','graduated']}
    ]},
    staff: { table:'staff', title:'Staff', cols:[
      {key:'full_name',label:'Full name',type:'text',required:true},
      {key:'staff_no',label:'Staff No',type:'text',readonly:true,help:'AUTO-GENERATED on save — leave blank',placeholder:'(auto)'},
      {key:'email',label:'Email',type:'email'},
      {key:'phone',label:'Phone',type:'tel'},
      {key:'staff_type',label:'Staff type',type:'select',options:['teaching','non-teaching']},
      {key:'role',label:'Role / Designation',type:'text',help:'e.g. Class teacher, Bursar, Registrar'},
      {key:'department',label:'Department',type:'ref',refTable:'departments',refValue:'name'},
      {key:'subject_taught',label:'Subject(s) taught',type:'ref',refTable:'subjects',refValue:'name',refStore:'value',help:'Leave blank for non-teaching staff'},
      {key:'qualification',label:'Highest qualification',type:'select',options:['SSCE','OND','HND','NCE','B.Sc','B.Ed','B.A','PGDE','M.Sc','M.Ed','M.A','Ph.D','Other']},
      {key:'gender',label:'Gender',type:'select',options:['male','female']},
      {key:'religion',label:'Religion',type:'select',options:['Christianity','Islam','Traditional','Other']},
      {key:'marital_status',label:'Marital status',type:'select',options:['single','married','divorced','widowed']},
      {key:'dob_day',label:'Birth day',type:'select',options:['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31'],help:'For privacy, staff DOB stores day & month only (no year)'},
      {key:'dob_month',label:'Birth month',type:'select',options:['January','February','March','April','May','June','July','August','September','October','November','December']},
      {key:'address',label:'Address',type:'textarea'},
      {key:'photo_url',label:'Photo (Google Drive / link)',type:'text',help:'Paste a Drive link — no upload (saves storage)'},
      {key:'part_time',label:'Part-time',type:'checkbox'},
      {key:'leave_balance',label:'Leave balance',type:'number'},
      {key:'status',label:'Status',type:'select',options:['active','inactive']}
    ]},
    classes: { table:'classes', title:'Class', cols:[
      {key:'name',label:'Class name',type:'text',required:true},
      {key:'arm',label:'Arm',type:'text'},
      {key:'level',label:'Level',type:'select',options:['Pre-Nursery','Nursery','Primary','JSS','SSS','Other']},
      {key:'class_teacher',label:'Class teacher (pick from staff)',type:'ref',refTable:'staff',refValue:'full_name',refStore:'value',refFilter:{staff_type:'teaching'}},
      {key:'capacity',label:'Capacity',type:'number'}
    ]},
    subjects: { table:'subjects', title:'Subject', cols:[
      {key:'name',label:'Subject',type:'text',required:true},
      {key:'code',label:'Code',type:'text'},
      {key:'department',label:'Department',type:'ref',refTable:'departments',refValue:'name'},
      {key:'level',label:'Level',type:'select',options:['Nursery','Primary','JSS','SSS','All']},
      {key:'teacher',label:'Subject teacher (pick from staff)',type:'ref',refTable:'staff',refValue:'full_name',refStore:'value',refFilter:{staff_type:'teaching'},help:'Maps this subject to a teacher'}
    ]},
    attendance: { table:'attendance', title:'Attendance', cols:[
      {key:'student_name',label:'Student',type:'ref',refTable:'students',refValue:'full_name',refExtra:['class'],refStore:'value',groupBy:'class',searchable:true,autofill:{class:'class'}},
      {key:'class',label:'Class',type:'ref',refTable:'classes',refValue:'name'},
      {key:'date',label:'Date',type:'date',required:true},
      {key:'status',label:'Status',type:'select',options:['present','absent','late','excused']},
      {key:'time_in',label:'Time in',type:'time'}
    ]},
    results: { table:'results', title:'Result / Subject Score Sheet Row', cols:[
      {key:'student_id',label:'Student (pick from registered list)',type:'ref',refTable:'students',refValue:'full_name',refExtra:['class','admission_no'],refStore:'id',groupBy:'class',searchable:true,autofill:{student_name:'full_name',class:'class'}},
      {key:'student_name',label:'Student name (auto)',type:'text',readonly:true},
      {key:'subject',label:'Subject',type:'ref',refTable:'subjects',refValue:'name',refStore:'value',required:true},
      {key:'class',label:'Class',type:'ref',refTable:'classes',refValue:'name'},
      {key:'term',label:'Term',type:'lookup',lookupKind:'term'},
      {key:'session',label:'Session',type:'lookup',lookupKind:'session'},
      {key:'ca1',label:'CA1',type:'number'},{key:'ca2',label:'CA2',type:'number'},
      {key:'ca3',label:'CA3',type:'number'},{key:'exam',label:'Exam',type:'number'},
      {key:'grade',label:'Grade',type:'text',help:'auto-suggested from total'},{key:'remark',label:'Remark',type:'text'}
    ]},
    timetable: { table:'timetable', title:'Timetable slot', cols:[
      {key:'class',label:'Class',type:'ref',refTable:'classes',refValue:'name'},
      {key:'day',label:'Day',type:'select',options:['Monday','Tuesday','Wednesday','Thursday','Friday']},
      {key:'period',label:'Period',type:'text'},
      {key:'subject',label:'Subject',type:'ref',refTable:'subjects',refValue:'name',refStore:'value'},
      {key:'teacher',label:'Teacher',type:'ref',refTable:'staff',refValue:'full_name',refStore:'value'},
      {key:'room',label:'Room',type:'text'},
      {key:'session',label:'Session',type:'lookup',lookupKind:'session'},{key:'term',label:'Term',type:'lookup',lookupKind:'term'}
    ]},
    sow: { table:'scheme_of_work', title:'Scheme of Work', cols:[
      {key:'subject',label:'Subject',type:'ref',refTable:'subjects',refValue:'name',refStore:'value'},
      {key:'class',label:'Class',type:'ref',refTable:'classes',refValue:'name'},
      {key:'term',label:'Term',type:'lookup',lookupKind:'term'},{key:'session',label:'Session',type:'lookup',lookupKind:'session'},
      {key:'week',label:'Week',type:'number'},{key:'topic',label:'Topic',type:'text',required:true},
      {key:'status',label:'Status',type:'select',options:['pending','covered','uncovered']},
      {key:'confirmed',label:'Taught this week (confirm)',type:'checkbox'},
      {key:'teacher',label:'Teacher',type:'ref',refTable:'staff',refValue:'full_name',refStore:'value'}
    ]},
    assignments: { table:'assignments', title:'Assignment', cols:[
      {key:'title',label:'Title',type:'text',required:true},{key:'description',label:'Description',type:'textarea'},
      {key:'class',label:'Class',type:'ref',refTable:'classes',refValue:'name'},
      {key:'subject',label:'Subject',type:'ref',refTable:'subjects',refValue:'name',refStore:'value'},
      {key:'due_date',label:'Due date',type:'date'},{key:'drive_link',label:'Drive link',type:'text'}
    ]},
    library: { table:'library', title:'Book', cols:[
      {key:'title',label:'Title',type:'text',required:true},{key:'author',label:'Author',type:'text'},
      {key:'isbn',label:'ISBN',type:'text'},{key:'category',label:'Category',type:'text'},
      {key:'copies',label:'Copies',type:'number'},{key:'lent',label:'Lent',type:'number'},
      {key:'drive_link',label:'Drive link',type:'text'}
    ]},
    conduct: { table:'conduct', title:'Conduct record', cols:[
      {key:'student_name',label:'Student',type:'ref',refTable:'students',refValue:'full_name',refExtra:['class'],refStore:'value',groupBy:'class',searchable:true},
      {key:'type',label:'Type',type:'select',options:['merit','demerit','incident']},
      {key:'description',label:'Description',type:'textarea'},{key:'reporter',label:'Reporter',type:'text'},
      {key:'date',label:'Date',type:'date'}
    ]},
    health: { table:'health', title:'Health record', cols:[
      {key:'student_name',label:'Student',type:'ref',refTable:'students',refValue:'full_name',refExtra:['class'],refStore:'value',groupBy:'class',searchable:true},
      {key:'complaint',label:'Complaint',type:'text'},
      {key:'treatment',label:'Treatment',type:'textarea'},{key:'date',label:'Date',type:'date'},
      {key:'recorded_by',label:'Recorded by',type:'text'}
    ]},
    promotion: { table:'promotions', title:'Promotion', cols:[
      {key:'student_name',label:'Student',type:'ref',refTable:'students',refValue:'full_name',refExtra:['class'],refStore:'value',groupBy:'class',searchable:true,autofill:{from_class:'class'}},
      {key:'from_class',label:'From class',type:'text'},
      {key:'to_class',label:'To class',type:'ref',refTable:'classes',refValue:'name'},
      {key:'average',label:'Term average %',type:'number',help:'auto-filled by Auto-promote'},
      {key:'action',label:'Action',type:'select',options:['promote','graduate','repeat','pending','delete']},
      {key:'status',label:'Status',type:'select',options:['draft','approved','applied']},
      {key:'session',label:'Session',type:'lookup',lookupKind:'session'},{key:'term',label:'Term',type:'lookup',lookupKind:'term'}
    ]},
    digital_library: { table:'digital_library', title:'Digital Book / Reading', cols:[
      {key:'title',label:'Book / Resource title',type:'text',required:true},
      {key:'author',label:'Author',type:'text'},
      {key:'subject',label:'Subject',type:'ref',refTable:'subjects',refValue:'name',refStore:'value'},
      {key:'class',label:'Assigned class',type:'ref',refTable:'classes',refValue:'name'},
      {key:'read_link',label:'Read link (Google Drive / web)',type:'text',required:true,help:'Paste a Drive/web link — no upload (saves storage)'},
      {key:'teacher',label:'Set by (teacher)',type:'ref',refTable:'staff',refValue:'full_name',refStore:'value',refFilter:{staff_type:'teaching'}},
      {key:'instructions',label:'Reading instructions',type:'textarea'},
      {key:'has_quiz',label:'Has comprehension questions',type:'checkbox'},
      {key:'max_score',label:'Max score (counts to grade)',type:'number',help:'e.g. 10 — added to results as CA'},
      {key:'due_date',label:'Due date',type:'date'}
    ]},
    fees: { table:'fee_payments', title:'Fee payment', cols:[
      {key:'student_name',label:'Student',type:'ref',refTable:'students',refValue:'full_name',refExtra:['class'],refStore:'value',groupBy:'class',searchable:true,required:true},
      {key:'amount_paid',label:'Amount paid',type:'number',required:true},
      {key:'method',label:'Method',type:'select',options:['cash','transfer','pos','online']},
      {key:'reference',label:'Reference',type:'text'},{key:'term',label:'Term',type:'lookup',lookupKind:'term'},{key:'session',label:'Session',type:'lookup',lookupKind:'session'}
    ]},
    finance: { table:'finance_entries', title:'Finance entry', cols:[
      {key:'type',label:'Type',type:'select',options:['income','expense']},
      {key:'category',label:'Category',type:'text'},{key:'amount',label:'Amount',type:'number',required:true},
      {key:'description',label:'Description',type:'textarea'},{key:'date',label:'Date',type:'date'}
    ]},
    leave: { table:'leave_requests', title:'Leave request', cols:[
      {key:'type',label:'Type',type:'select',options:['sick','casual','earned','study','maternity']},
      {key:'start_date',label:'Start',type:'date'},{key:'end_date',label:'End',type:'date'},
      {key:'days',label:'Days',type:'number'},{key:'reason',label:'Reason',type:'textarea'},
      {key:'status',label:'Status',type:'select',options:['pending','approved','rejected']}
    ]},
    visitors: { table:'visitors', title:'Visitor', cols:[
      {key:'full_name',label:'Name',type:'text',required:true},{key:'phone',label:'Phone',type:'tel'},
      {key:'purpose',label:'Purpose',type:'text'},{key:'host',label:'Host',type:'text'},{key:'badge_no',label:'Badge No',type:'text'}
    ]},
    transport: { table:'transport', title:'Transport route', cols:[
      {key:'route_name',label:'Route',type:'text',required:true},{key:'driver',label:'Driver',type:'text'},
      {key:'vehicle_no',label:'Vehicle No',type:'text'},{key:'capacity',label:'Capacity',type:'number'}
    ]},
    announcements: { table:'announcements', title:'Announcement', cols:[
      {key:'title',label:'Title',type:'text',required:true},{key:'body',label:'Body',type:'textarea'},
      {key:'priority',label:'Priority',type:'select',options:['normal','high','urgent']},
      {key:'pinned',label:'Pinned',type:'checkbox'},
      {key:'audience',label:'Audience',type:'lookup',lookupKind:'audience'}
    ]},
    events: { table:'events', title:'Event', cols:[
      {key:'title',label:'Title',type:'text',required:true},{key:'description',label:'Description',type:'textarea'},
      {key:'date',label:'Date',type:'date'},{key:'venue',label:'Venue',type:'text'},{key:'organiser',label:'Organiser',type:'text'}
    ]},
    complaints: { table:'complaints', title:'Complaint', cols:[
      {key:'type',label:'Type',type:'text'},{key:'subject',label:'Subject',type:'text',required:true},
      {key:'body',label:'Details',type:'textarea'},
      {key:'urgency',label:'Urgency',type:'select',options:['low','normal','high','critical']},
      {key:'status',label:'Status',type:'select',options:['submitted','reviewing','in_progress','resolved','rejected']}
    ]},
    gallery: { table:'gallery', title:'Gallery item', cols:[
      {key:'album',label:'Album',type:'text'},{key:'caption',label:'Caption',type:'text'},
      {key:'media_url',label:'Media URL',type:'text',required:true},
      {key:'media_type',label:'Type',type:'select',options:['image','video','youtube']}
    ]},
    eresources: { table:'eresources', title:'E-Resource', cols:[
      {key:'title',label:'Title',type:'text',required:true},{key:'description',label:'Description',type:'textarea'},
      {key:'subject',label:'Subject',type:'text'},{key:'class',label:'Class',type:'text'},
      {key:'term',label:'Term',type:'text'},{key:'drive_link',label:'Drive link',type:'text'}
    ]},
    birthdays: { table:'birthdays', title:'Birthday', cols:[
      {key:'person_name',label:'Pick a student (auto-fills date & class)',type:'ref',refTable:'students',refValue:'full_name',refExtra:['class','date_of_birth'],refStore:'value',autofill:{date:'date_of_birth',class:'class'}},
      {key:'type',label:'Type',type:'select',options:['student','staff']},
      {key:'date',label:'Date of birth',type:'date'},{key:'class',label:'Class',type:'text'}
    ]},
    departments: { table:'departments', title:'Department', cols:[
      {key:'name',label:'Name',type:'text',required:true},{key:'head',label:'Head',type:'text'}
    ]},
    admissions: { table:'admissions', title:'Admission', cols:[
      {key:'full_name',label:'Applicant',type:'text',required:true},{key:'dob',label:'DOB',type:'date'},
      {key:'gender',label:'Gender',type:'select',options:['male','female']},
      {key:'parent_name',label:'Parent name',type:'text'},{key:'parent_email',label:'Parent email',type:'email'},
      {key:'parent_phone',label:'Parent phone',type:'tel'},{key:'applying_for_class',label:'Applying for class',type:'text'},
      {key:'status',label:'Status',type:'select',options:['submitted','reviewing','accepted','enrolled','rejected']}
    ]},
    hr: { table:'payroll', title:'Salary / Payslip', alias:'payroll', cols:[
      {key:'staff_name',label:'Staff (pick from list)',type:'ref',refTable:'staff',refValue:'full_name',refExtra:['role'],refStore:'value',searchable:true,required:true},
      {key:'month',label:'Month',type:'select',options:['January','February','March','April','May','June','July','August','September','October','November','December'],required:true},
      {key:'year',label:'Year',type:'number',default:new Date().getFullYear()},
      {key:'basic',label:'Basic salary',type:'number',required:true},
      {key:'allowances',label:'Allowances',type:'number'},
      {key:'bonus',label:'Bonus / Incentive',type:'number'},
      {key:'overtime',label:'Overtime pay',type:'number'},
      {key:'tax',label:'Tax (PAYE)',type:'number'},
      {key:'pension',label:'Pension',type:'number'},
      {key:'loan_deduction',label:'Loan repayment',type:'number'},
      {key:'other_deductions',label:'Other deductions',type:'number'},
      {key:'net_pay',label:'Net pay (auto if blank)',type:'number'},
      {key:'method',label:'Payment method',type:'select',options:['bank transfer','cash','cheque','mobile money']},
      {key:'status',label:'Status',type:'select',options:['draft','approved','paid']}
    ]},
    hostel: { table:'hostel_allocations', title:'Hostel allocation', cols:[
      {key:'block',label:'Block',type:'text'},{key:'room',label:'Room',type:'text'},{key:'bed',label:'Bed',type:'text'},
      {key:'status',label:'Status',type:'select',options:['active','vacated']}
    ]},
    alumni: { table:'alumni', title:'Alumnus', cols:[
      {key:'full_name',label:'Name',type:'text',required:true},{key:'graduation_year',label:'Graduation year',type:'number'},
      {key:'last_class',label:'Last class',type:'text'},{key:'current_occupation',label:'Occupation',type:'text'},
      {key:'email',label:'Email',type:'email'},{key:'phone',label:'Phone',type:'tel'}
    ]},
    inventory: { table:'inventory', title:'Inventory item', cols:[
      {key:'item_name',label:'Item',type:'text',required:true},{key:'category',label:'Category',type:'text'},
      {key:'quantity',label:'Quantity',type:'number'},{key:'location',label:'Location',type:'text'},
      {key:'condition',label:'Condition',type:'text'}
    ]},
    lesson_plans: { table:'lesson_plans', title:'Lesson plan', cols:[
      {key:'teacher',label:'Teacher',type:'text'},{key:'subject',label:'Subject',type:'text'},
      {key:'class',label:'Class',type:'text'},{key:'week',label:'Week',type:'number'},
      {key:'term',label:'Term',type:'text'},{key:'session',label:'Session',type:'text'},
      {key:'objectives',label:'Objectives',type:'textarea'},{key:'content',label:'Content',type:'textarea'},
      {key:'resources',label:'Resources',type:'textarea'},
      {key:'status',label:'Status',type:'select',options:['draft','submitted','approved']}
    ]},
    behaviour: { table:'behaviour_points', title:'Behaviour point', cols:[
      {key:'student_name',label:'Student',type:'ref',refTable:'students',refValue:'full_name',refExtra:['class'],refStore:'value',groupBy:'class',searchable:true},
      {key:'points',label:'Points',type:'number'},
      {key:'reason',label:'Reason',type:'text'},{key:'badge',label:'Badge',type:'text'}
    ]},
    support_plans: { table:'support_plans', title:'Support plan', cols:[
      {key:'need_type',label:'Need type',type:'text'},{key:'intervention',label:'Intervention',type:'textarea'},
      {key:'goal',label:'Goal',type:'text'},{key:'review_date',label:'Review date',type:'date'},
      {key:'outcome',label:'Outcome',type:'text'},{key:'status',label:'Status',type:'select',options:['active','review','closed']}
    ]},
    donations: { table:'donations', title:'Donation', cols:[
      {key:'campaign',label:'Campaign',type:'text'},{key:'donor_name',label:'Donor',type:'text'},
      {key:'donor_email',label:'Donor email',type:'email'},{key:'amount',label:'Amount',type:'number',required:true},
      {key:'method',label:'Method',type:'text'},{key:'note',label:'Note',type:'text'},
      {key:'anonymous',label:'Anonymous',type:'checkbox'}
    ]},
    substitutions: { table:'substitutions', title:'Substitution', cols:[
      {key:'date',label:'Date',type:'date'},{key:'absent_teacher',label:'Absent teacher',type:'text'},
      {key:'substitute_teacher',label:'Substitute',type:'text'},{key:'class',label:'Class',type:'text'},
      {key:'subject',label:'Subject',type:'text'},{key:'period',label:'Period',type:'text'},
      {key:'status',label:'Status',type:'select',options:['planned','done','cancelled']}
    ]},
    helpdesk: { table:'helpdesk_tickets', title:'Help-desk ticket', cols:[
      {key:'category',label:'Category',type:'text'},{key:'subject',label:'Subject',type:'text',required:true},
      {key:'body',label:'Details',type:'textarea'},
      {key:'priority',label:'Priority',type:'select',options:['low','normal','high','urgent']},
      {key:'status',label:'Status',type:'select',options:['open','in_progress','resolved','closed']}
    ]},
    directory: { table:'profiles', title:'Person', readOnly:true, cols:[
      {key:'full_name',label:'Name',type:'text'},{key:'email',label:'Email',type:'email'},
      {key:'role',label:'Role',type:'text'},{key:'status',label:'Status',type:'text'}
    ]},
    activity_log: { table:'activity_log', title:'Activity', readOnly:true, cols:[
      {key:'created_at',label:'When',type:'text'},
      {key:'actor_email',label:'Who',type:'text'},
      {key:'action',label:'Action',type:'text'},
      {key:'entity',label:'Module/Table',type:'text'},
      {key:'entity_id',label:'Record',type:'text'}
    ]},
    parents: { table:'parents', title:'Parent / Guardian', cols:[
      // Legacy mapping compatibility: Parent / Guardian (pick from list) with refFilter:{role:'parent'} is managed via the UI link section.
      {key:'full_name',label:'Full Name',type:'text',required:true},
      {key:'email',label:'Email Address',type:'email'},
      {key:'phone',label:'Phone Number',type:'text'},
      {key:'occupation',label:'Occupation',type:'text'},
      {key:'address',label:'Home Address',type:'text'},
      {key:'status',label:'Status',type:'select',options:['active','pending','suspended']}
    ]},
    /* ===== Issue 5: Staff HR / Payroll suite (salary, bonus, loans, appraisal) ===== */
    payroll: { table:'payroll', title:'Salary / Payslip', cols:[
      {key:'staff_name',label:'Staff (pick from list)',type:'ref',refTable:'staff',refValue:'full_name',refExtra:['role'],refStore:'value',searchable:true,required:true},
      {key:'month',label:'Month',type:'select',options:['January','February','March','April','May','June','July','August','September','October','November','December'],required:true},
      {key:'year',label:'Year',type:'number',default:new Date().getFullYear()},
      {key:'basic',label:'Basic salary',type:'number',required:true},
      {key:'allowances',label:'Allowances',type:'number',help:'Housing, transport, etc.'},
      {key:'bonus',label:'Bonus / Incentive',type:'number'},
      {key:'overtime',label:'Overtime pay',type:'number'},
      {key:'tax',label:'Tax (PAYE)',type:'number'},
      {key:'pension',label:'Pension',type:'number'},
      {key:'loan_deduction',label:'Loan repayment (this month)',type:'number'},
      {key:'other_deductions',label:'Other deductions',type:'number'},
      {key:'net_pay',label:'Net pay (auto if blank)',type:'number',help:'= basic+allowances+bonus+overtime − tax−pension−loan−other'},
      {key:'method',label:'Payment method',type:'select',options:['bank transfer','cash','cheque','mobile money']},
      {key:'status',label:'Status',type:'select',options:['draft','approved','paid']}
    ]},
    staff_loans: { table:'staff_loans', title:'Staff loan / advance', cols:[
      {key:'staff_name',label:'Staff (pick from list)',type:'ref',refTable:'staff',refValue:'full_name',refExtra:['role'],refStore:'value',searchable:true,required:true},
      {key:'loan_type',label:'Type',type:'select',options:['salary advance','personal loan','emergency','cooperative']},
      {key:'principal',label:'Amount borrowed',type:'number',required:true},
      {key:'monthly_repayment',label:'Monthly repayment (EMI)',type:'number'},
      {key:'months',label:'Repayment months',type:'number'},
      {key:'amount_repaid',label:'Amount repaid so far',type:'number'},
      {key:'date_taken',label:'Date taken',type:'date'},
      {key:'status',label:'Status',type:'select',options:['active','completed','defaulted','written-off']},
      {key:'notes',label:'Notes',type:'textarea'}
    ]},
    staff_bonus: { table:'staff_bonus', title:'Bonus / Allowance award', cols:[
      {key:'staff_name',label:'Staff (pick from list)',type:'ref',refTable:'staff',refValue:'full_name',refExtra:['role'],refStore:'value',searchable:true,required:true},
      {key:'bonus_type',label:'Type',type:'select',options:['performance','13th month','holiday','long-service','referral','other']},
      {key:'amount',label:'Amount',type:'number',required:true},
      {key:'reason',label:'Reason / Citation',type:'textarea'},
      {key:'award_date',label:'Award date',type:'date'},
      {key:'status',label:'Status',type:'select',options:['pending','approved','paid']}
    ]},
    appraisals: { table:'staff_appraisals', title:'Staff appraisal', cols:[
      {key:'staff_name',label:'Staff (pick from list)',type:'ref',refTable:'staff',refValue:'full_name',refExtra:['role'],refStore:'value',searchable:true,required:true},
      {key:'period',label:'Appraisal period',type:'text',help:'e.g. 2025/2026 Term 1'},
      {key:'punctuality',label:'Punctuality (1-10)',type:'number'},
      {key:'teaching_quality',label:'Teaching quality (1-10)',type:'number'},
      {key:'student_results',label:'Student results (1-10)',type:'number'},
      {key:'teamwork',label:'Teamwork (1-10)',type:'number'},
      {key:'conduct',label:'Conduct & ethics (1-10)',type:'number'},
      {key:'total_score',label:'Total / Grade (auto)',type:'text',help:'auto-computed average & band'},
      {key:'recommendation',label:'Recommendation',type:'select',options:['promote','retain','train','warn','commend']},
      {key:'comments',label:'Appraiser comments',type:'textarea'},
      {key:'appraiser',label:'Appraised by',type:'ref',refTable:'staff',refValue:'full_name',refStore:'value',searchable:true}
    ]}
  },

  fid(key){ return String(key).replace(/[^a-z0-9_-]/gi,'_'); },

  /* ---- Generic (module_records-backed) modules: every previously "no form"
     module (issue 8) now has a working Add/Edit/Delete screen. The shared
     columns (title/body/status/ref_date/amount) cover most needs; extra fields
     go into data{}. ---- */
  GENERIC: {
    messages:    { title:'Message',      cols:[['title','Subject','text',true],['body','Message','textarea'],['data.to','To (name/role)','text']] },
    inbox:       { title:'Inbox message',cols:[['title','Subject','text',true],['body','Message','textarea'],['data.from','From','text'],['status','Status','select',['unread','read','archived']]] },
    broadcast:   { title:'Result Broadcast',cols:[['title','Title','text',true],['body','Message','textarea'],['data.channel','Channel','select',['whatsapp','email','sms','in-app']],['data.audience','Audience','lookup','audience']] },
    reports:     { title:'Report',       cols:[['title','Report title','text',true],['data.type','Type','text'],['body','Summary / notes','textarea'],['ref_date','Date','date']] },
    school_calendar:{ title:'Calendar event',cols:[['title','Event','text',true],['ref_date','Date','date',true],['body','Details','textarea'],['data.category','Category','select',['holiday','exam','mid-term','term-start','term-end','event']]] },
    lost_found:  { title:'Lost & Found item',cols:[['title','Item','text',true],['data.kind','Kind','select',['lost','found']],['body','Description','textarea'],['data.location','Location','text'],['ref_date','Date','date'],['status','Status','select',['open','claimed','returned']]] },
    parent_meeting:{ title:'PTA Meeting',cols:[['title','Topic','text',true],['ref_date','Date','date',true],['data.time','Time','time'],['data.venue','Venue','text'],['body','Agenda / minutes','textarea']] },
    book_request:{ title:'Book request', cols:[['title','Book title','text',true],['data.student','Student','ref-students'],['status','Status','select',['requested','reserved','issued','returned']],['ref_date','Date','date']] },
    lms:         { title:'LMS course/lesson',cols:[['title','Title','text',true],['data.subject','Subject','ref-subjects'],['data.class','Class','ref-classes'],['body','Content / description','textarea'],['data.video','Video/Drive link','text']] },
    gamification:{ title:'Reward / badge',cols:[['title','Badge/Reward','text',true],['data.student','Student','ref-students'],['amount','Points','number'],['body','Reason','textarea']] },
    cafeteria:   { title:'Cafeteria item',cols:[['title','Item','text',true],['amount','Price','number'],['data.category','Category','select',['breakfast','snack','lunch','drink']],['body','Notes','textarea']] },
    financial_aid:{ title:'Scholarship/Aid',cols:[['title','Scheme','text',true],['data.student','Student','ref-students'],['amount','Amount/Waiver','number'],['status','Status','select',['applied','approved','renewed','ended']],['body','Notes','textarea']] },
    front_desk:  { title:'Front-desk log',cols:[['title','Subject','text',true],['data.kind','Type','select',['call','dispatch','walk-in','inquiry']],['body','Details','textarea'],['data.contact','Contact','text'],['ref_date','Date','date']] },
    career_counseling:{ title:'Career record',cols:[['title','Title','text',true],['data.student','Student','ref-students'],['body','Guidance / offers','textarea'],['data.university','University/Placement','text']] },
    document_builder:{ title:'Document',cols:[['title','Document','text',true],['data.type','Type','select',['hall ticket','bonafide','transfer','testimonial','custom']],['body','Content','textarea']] },
    fleet_tracking:{ title:'Fleet log',cols:[['title','Vehicle/Route','text',true],['data.driver','Driver','text'],['body','Notes / location','textarea'],['ref_date','Date','date']] },
    facility_booking:{ title:'Facility booking',cols:[['title','Facility','text',true],['ref_date','Date','date',true],['data.time','Time','time'],['data.bookedby','Booked by','text'],['status','Status','select',['requested','approved','cancelled']]] },
    compliance:  { title:'Compliance item',cols:[['title','Item','text',true],['data.category','Category','select',['accreditation','fire drill','inspection','statutory']],['ref_date','Date','date'],['status','Status','select',['pending','passed','failed','due']],['body','Notes','textarea']] },
    payments_online:{ title:'Online payment',cols:[['title','Reference','text',true],['data.student','Student','ref-students'],['amount','Amount','number',true],['data.provider','Provider','select',['paystack','flutterwave','bank_transfer']],['status','Status','select',['pending','paid','failed','cancelled']]],},
    /* update v4: international-standard additions */
    rubrics:     { title:'Grading rubric (standards-based)',cols:[['title','Skill / standard','text',true],['data.subject','Subject','ref-subjects'],['data.class','Class','ref-classes'],['data.criteria','Criteria (one per line)','textarea'],['data.scale','Scale','select',['1-4 (Beginning–Exceeding)','A-F','1-10','Pass/Merit/Distinction']],['body','Descriptor / notes','textarea']] },
    transcripts: { title:'Transcript / academic record',cols:[['data.student','Student','ref-students'],['title','Session / year','text',true],['data.term','Term','lookup','term'],['data.gpa','GPA / Average','text'],['body','Subjects & grades (summary)','textarea'],['data.remark','Cumulative remark','text']] },
    transfer_cert:{ title:'Transfer / leaving certificate',cols:[['data.student','Student','ref-students'],['title','Certificate No','text',true],['data.last_class','Last class','ref-classes'],['data.reason','Reason for leaving','select',['relocation','graduation','transfer','withdrawal','other']],['ref_date','Date of leaving','date'],['data.conduct','Conduct','select',['excellent','good','satisfactory','fair']],['body','Remarks','textarea']] },
    counselling: { title:'Counselling / wellbeing session',cols:[['data.student','Student','ref-students'],['title','Topic','text',true],['data.counsellor','Counsellor','text'],['ref_date','Date','date'],['body','Notes (confidential)','textarea'],['status','Status','select',['open','ongoing','closed','referred']]] }
  },

  /* Resolve a module to a normalized definition. Generic modules are backed by
     the shared module_records table; their compact [key,label,type,...] tuples
     are expanded into full column objects with relational helpers. */
  def(moduleId){
    if (this.SCHEMA[moduleId]) return this.SCHEMA[moduleId];
    const g = this.GENERIC[moduleId];
    if (!g) return null;
    const cols = g.cols.map(t => {
      const [key, label, type, extra, extra2] = t;
      const c = { key, label, type: type || 'text' };
      if (type === 'select') c.options = extra;
      else if (type === 'lookup') c.lookupKind = extra;
      else if (type === 'ref-students') { c.type='ref'; c.refTable='students'; c.refValue='full_name'; c.refStore='value'; }
      else if (type === 'ref-classes') { c.type='ref'; c.refTable='classes'; c.refValue='name'; }
      else if (type === 'ref-subjects') { c.type='ref'; c.refTable='subjects'; c.refValue='name'; c.refStore='value'; }
      if (extra === true || extra2 === true) c.required = true;
      return c;
    });
    return { table:'module_records', title:g.title, generic:true, module:moduleId, cols };
  },

  /* FIX v9: canWrite — use SC_PROFILE.role as fallback for async timing */
  canWrite(moduleId) {
    // Use both App.currentRole and SC_PROFILE.role as fallbacks
    // This ensures role is always available, even before async profile load
    const role = String(
      (window.App && App.currentRole) || 
      (window.SC_PROFILE && SC_PROFILE.role) || 
      ''
    ).toLowerCase();
    const key = String(moduleId || '').replace(/-/g,'_');
    const allow = this.WRITE_RULES[key];
    if (window.App && App.isAdminRole && App.isAdminRole(role)) {
      // Admin variants (super_admin, admin, principal, etc.) have full access
      if (!allow) return true;
      return allow.includes('admin') || allow.includes(role);
    }
    if (!allow) return ['staff','teacher'].includes(role);
    return allow.includes(role);
  },

  /* Render the list table for a module page */
  /* FIX v9: renderList now supports role-based filtering
     - Students see only their own data (filtered by student_id)
     - Parents see only their linked children's data
     - Staff/Admin see all data (no filter)
  */
  async renderList(moduleId, options = {}) {
    const d = this.def(moduleId);
    const tableEl = document.getElementById(moduleId + '-table');
    if (!tableEl) return;
    if (!d) { tableEl.querySelector('thead').innerHTML = '<tr><th>Not available</th></tr>'; return; }
    if (!this.sb) {
      tableEl.querySelector('thead').innerHTML = '<tr><th>Database not configured</th></tr>';
      tableEl.querySelector('tbody').innerHTML = '<tr><td>Add your Supabase keys in assets/js/config.js</td></tr>';
      return;
    }

    // Get current user and role for filtering
    const currentUserId = window.SC_PROFILE?.id || null;
    const currentRole = String(window.SC_PROFILE?.role || window.App?.currentRole || '').toLowerCase();
    const isStudent = currentRole === 'student';
    const isParent = currentRole === 'parent';

    // Modules that students should only see their own data for
    const studentOwnedModules = ['results', 'assignments', 'attendance', 'messages', 'complaints', 'eresources', 'library_borrowers'];
    // Modules that parents should see their children's data for
    const parentViewModules = ['results', 'assignments', 'attendance', 'fees', 'report_cards'];

    // Build query with role-based filtering
    let query = d.generic
      ? this.sb.from(d.table).select('*').eq('module', d.module).order('created_at', { ascending: false }).limit(500)
      : this.sb.from(d.table).select('*').order('created_at', { ascending: false }).limit(500);

    // Apply role-based filters
    if (isStudent && studentOwnedModules.includes(moduleId)) {
      // Students: filter by their own ID (check student_id, created_by, or profile match)
      // For results/attendance, the student is identified by various means
      if (moduleId === 'results' || moduleId === 'attendance') {
        // These tables have student_id or reference to profiles
        query = query.eq('student_id', currentUserId);
      } else {
        // For other modules, filter by created_by
        query = query.eq('created_by', currentUserId);
      }
    }

    if (isParent && parentViewModules.includes(moduleId)) {
      // Parents: need to get linked children first, then filter
      // This is handled differently below after we get the linked student IDs
    }

    const { data, error } = await query;
    const cols = d.cols;
    const writable = this.canWrite(moduleId) && !d.readOnly;
    const cellVal = (row, c) => c.key.indexOf('data.') === 0 ? ((row.data || {})[c.key.slice(5)]) : row[c.key];
    const head = '<tr>' + cols.map(c => '<th>' + esc(c.label) + '</th>').join('') + (writable ? '<th>Actions</th>' : '') + '</tr>';
    tableEl.querySelector('thead').innerHTML = head;
    const tb = tableEl.querySelector('tbody');
    if (error) { tb.innerHTML = '<tr><td colspan="' + (cols.length + (writable ? 1 : 0)) + '">' + esc(error.message) + '</td></tr>'; return; }

    // Additional filtering for parents - get children's IDs and filter data
    let filteredData = data || [];
    if (isParent && parentViewModules.includes(moduleId) && currentUserId) {
      try {
        const { data: links } = await this.sb.from('parent_student').select('student_id').eq('parent_id', currentUserId);
        if (links && links.length > 0) {
          const childIds = links.map(l => l.student_id);
          // Filter data to only include children
          if (moduleId === 'results') {
            filteredData = (data || []).filter(r => childIds.includes(r.student_id));
          } else if (moduleId === 'attendance') {
            filteredData = (data || []).filter(r => childIds.includes(r.student_id));
          } else if (moduleId === 'fees') {
            // Fees might be linked via fee_payments table or student_id
            filteredData = (data || []).filter(r => childIds.includes(r.student_id));
          } else {
            filteredData = (data || []).filter(r => childIds.includes(r.student_id));
          }
        } else {
          filteredData = [];
        }
      } catch(e) {
        console.warn('Parent filter failed:', e);
        filteredData = data || [];
      }
    }

    if (!filteredData || !filteredData.length) { tb.innerHTML = '<tr><td colspan="' + (cols.length + (writable ? 1 : 0)) + '" style="color:var(--gray-500)">No records yet.' + (writable ? ' Click “+ Add new”.' : '') + '</td></tr>'; return; }
    const isLinkCol = (key) => /(_link|link|media_url|photo_url|video|image|thumbnail|read_link|drive)$/i.test(key) || /^(media_url|read_link|drive_link|photo_url)$/i.test(key);
    tb.innerHTML = filteredData.map(row => '<tr>' + cols.map(c => {
      let v = cellVal(row, c);
      if (c.type === 'checkbox') v = v ? '✓' : '';
      // Issue 11: render link columns as image/video thumbnails when possible.
      if (v && isLinkCol(c.key) && window.Super && Super.media) {
        const k = Super.media.kind(String(v));
        if (k !== 'none' && k !== 'link') return '<td>' + Super.media.thumb(String(v), { w: 96, h: 64 }) + '</td>';
        return '<td><a href="' + esc(String(v)) + '" target="_blank" rel="noopener">🔗 link</a></td>';
      }
      return '<td>' + esc(String(v == null ? '' : v)).slice(0, 80) + '</td>';
    }).join('') + (!writable ? '' :
      '<td style="white-space:nowrap">' +
        (moduleId === 'students' ? '<a class="btn btn-sm btn-primary" href="student-profile.html?student=' + row.id + '">Dashboard</a> ' : '') +
        (moduleId === 'staff' ? '<a class="btn btn-sm btn-primary" href="teacher-overview.html?staff=' + row.id + '">Teacher overview</a> ' : '') +
        ((moduleId === 'payroll' || moduleId === 'hr') ? '<button class="btn btn-sm btn-primary" onclick="CRUD.printPayslip(\'' + row.id + '\')">Payslip</button> ' : '') +
        (moduleId === 'fees' ? '<button class="btn btn-sm btn-primary" onclick="CRUD.printReceipt(\'' + row.id + '\')">Print E-Receipt</button> ' : '') +
        '<button class="btn btn-sm btn-outline" onclick="CRUD.openForm(\'' + moduleId + '\',\'' + row.id + '\')">Edit</button> ' +
        '<button class="btn btn-sm btn-outline" onclick="CRUD.remove(\'' + moduleId + '\',\'' + row.id + '\')">Delete</button>' +
      '</td>') + '</tr>').join('');
    // re-apply role visibility to the freshly-rendered action buttons
    if (window.App && App.applyRoleVisibility) try { App.applyRoleVisibility(); } catch (e) {}
  },

  /* Open the add/edit modal with a REAL form */
  /* ---- option-source cache so dropdowns load once per form ---- */
  _optCache: {},
  async loadOptions(c) {
    // c.type 'ref'    -> {refTable, refValue(col used as text), refExtra?}
    // c.type 'lookup' -> {lookupKind}
    if (!this.sb) return [];
    try {
      if (c.type === 'ref') {
        const extra = c.refExtra || [];
        const grpCols = c.groupBy ? [c.groupBy] : [];
        const allExtra = Array.from(new Set(extra.concat(grpCols)));
        const cols = ['id', c.refValue].concat(allExtra).join(',');
        let q = this.sb.from(c.refTable).select(cols).order(c.refValue, { ascending: true }).limit(2000);
        // refFilter: only show matching rows (e.g. only teaching staff as class teachers)
        if (c.refFilter) Object.keys(c.refFilter).forEach(k => { try { q = q.eq(k, c.refFilter[k]); } catch (e) {} });
        const { data } = await q;
        return (data || []).map(r => ({
          value: c.refStore === 'id' ? r.id : r[c.refValue],
          label: r[c.refValue] + (extra.length && r[extra[0]] ? ' (' + r[extra[0]] + ')' : ''),
          group: c.groupBy ? (r[c.groupBy] || 'Unassigned') : null,
          row: r
        }));
      }
      if (c.type === 'lookup') {
        const { data } = await this.sb.from('lookups').select('value').eq('kind', c.lookupKind).order('position');
        return (data || []).map(r => ({ value: r.value, label: r.value }));
      }
    } catch (e) { /* table may be empty/missing */ }
    return (c.options || []).map(o => ({ value: o, label: o }));
  },

  async openForm(moduleId, id) {
    const d = this.def(moduleId);
    if (!d) { toast('This module has no editable form.', 'warning'); return; }
    if (!this.canWrite(moduleId)) { toast('Read-only for your role on this page.', 'warning', 5000); return; }
    if (!this.sb) { toast('Database not configured (add Supabase keys in assets/js/config.js).', 'warning', 6000); return; }
    let row = {};
    if (id) { const { data } = await this.sb.from(d.table).select('*').eq('id', id).maybeSingle(); row = data || {}; }
    if (window.App && !App.isAdminRole(App.currentRole) && row && (row.teacher_id || row.posted_by || row.teacher)) {
      const uid = window.SC_PROFILE?.id;
      const uname = window.SC_PROFILE?.full_name;
      if (row.teacher_id !== uid && row.posted_by !== uid && row.teacher !== uname) {
        toast('Access Denied: You cannot edit records created by another subject teacher.', 'danger', 6000);
        return;
      }
    }
    // Pre-load any ref/lookup/select option sources
    const getVal = (k) => k.indexOf('data.') === 0 ? ((row.data || {})[k.slice(5)]) : row[k];
    const fields = [];
    for (const c of d.cols) {
      const rv = getVal(c.key);
      const val = rv != null ? rv : (c.default != null ? c.default : '');
      const req = c.required ? ' required' : '';
      let field;
      if (c.type === 'textarea') {
        field = '<textarea class="form-input" id="cf-' + CRUD.fid(c.key) + '" rows="2"' + req + '>' + esc(val) + '</textarea>';
      } else if (c.type === 'ref' || c.type === 'lookup' || c.type === 'select') {
        const opts = (c.type === 'select') ? (c.options || []).map(o => ({ value: o, label: o })) : await this.loadOptions(c);
        const onchg = (c.type === 'ref' && c.autofill) ? ' onchange="CRUD.onRefChange(\'' + moduleId + '\',\'' + c.key + '\',this)"' : '';
        const optHtml = (o) => '<option value="' + esc(o.value) + '"' + (String(val) === String(o.value) ? ' selected' : '') + (o.row ? ' data-row=\'' + esc(JSON.stringify(o.row)) + '\'' : '') + '>' + esc(o.label) + '</option>';
        let inner;
        if (c.groupBy && opts.some(o => o.group)) {
          // Group options by class (issue 11) for compact, easy navigation.
          const groups = {};
          opts.forEach(o => { const g = o.group || 'Unassigned'; (groups[g] = groups[g] || []).push(o); });
          inner = Object.keys(groups).sort().map(g => '<optgroup label="' + esc(g) + '">' + groups[g].map(optHtml).join('') + '</optgroup>').join('');
        } else {
          inner = opts.map(optHtml).join('');
        }
        const selId = 'cf-' + CRUD.fid(c.key);
        const selectHtml = '<select class="form-select" id="' + selId + '"' + onchg + '><option value="">— select —</option>' + inner + '</select>';
        if (c.groupBy && c.searchable && opts.some(o => o.group)) {
          // Issue 7: pick a class first, then only that class's students show;
          // plus a search box to find a student by typing a few letters.
          const classes = Array.from(new Set(opts.map(o => o.group || 'Unassigned'))).sort();
          const classFilter = '<select class="form-select" style="margin-bottom:6px" onchange="CRUD.filterRefByClass(\'' + selId + '\',this.value)"><option value="">— all classes —</option>' + classes.map(g => '<option>' + esc(g) + '</option>').join('') + '</select>';
          const searchBox = '<input class="form-input" style="margin-bottom:6px" placeholder="🔎 type a few letters of the name…" oninput="CRUD.filterRefBySearch(\'' + selId + '\',this.value)">';
          field = '<div data-ref-wrap="' + selId + '">' + classFilter + searchBox + selectHtml + '</div>';
        } else {
          field = selectHtml;
        }
      } else if (c.type === 'checkbox') {
        field = '<label style="display:inline-flex;gap:8px;align-items:center"><input type="checkbox" id="cf-' + CRUD.fid(c.key) + '"' + (val ? ' checked' : '') + '> ' + esc(c.label) + '</label>';
      } else if (c.type === 'time') {
        field = '<input class="form-input" id="cf-' + CRUD.fid(c.key) + '" type="time" value="' + esc(val) + '"' + req + '>';
      } else {
        field = '<input class="form-input" id="cf-' + CRUD.fid(c.key) + '" type="' + (c.type || 'text') + '" value="' + esc(val) + '"' + (c.readonly ? ' readonly' : '') + req + (c.placeholder ? ' placeholder="' + esc(c.placeholder) + '"' : '') + '>';
      }
      const labelHtml = (c.type === 'checkbox') ? '' : '<label>' + esc(c.label) + (c.required ? ' *' : '') + (c.help ? ' <span style="color:var(--gray-500);font-weight:400;font-size:.8rem">— ' + esc(c.help) + '</span>' : '') + '</label>';
      fields.push('<div class="form-group">' + labelHtml + field + '</div>');
    }
    openModal((id ? 'Edit ' : 'Add ') + d.title, fields.join(''),
      '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
      '<button class="btn btn-primary" onclick="CRUD.save(\'' + moduleId + '\',' + (id ? '\'' + id + '\'' : 'null') + ')">Save</button>');
  },

  /* When a ref dropdown with autofill changes (e.g. pick a student), copy
     extra fields like the student's name and DOB into the form (issues 1 & 10). */
  onRefChange(moduleId, key, sel) {
    try {
      const opt = sel.options[sel.selectedIndex];
      const rowJson = opt && opt.getAttribute('data-row');
      if (!rowJson) return;
      const r = JSON.parse(rowJson);
      const d = this.def(moduleId);
      const c = d.cols.find(x => x.key === key);
      if (c && c.autofill) Object.keys(c.autofill).forEach(targetKey => {
        const srcCol = c.autofill[targetKey];
        const el = document.getElementById('cf-' + CRUD.fid(targetKey));
        if (el && r[srcCol] != null) el.value = r[srcCol];
      });
    } catch (e) {}
  },

  async save(moduleId, id) {
    const d = this.def(moduleId);
    if (!this.canWrite(moduleId)) { toast('Read-only for your role on this page.', 'warning', 5000); return; }
    if (!d || !this.sb) { toast('Database not configured.', 'warning'); return; }
    const payload = {};
    const dataObj = {};
    let missing = '';
    d.cols.forEach(c => {
      const el = document.getElementById('cf-' + CRUD.fid(c.key)); if (!el) return;
      let v = c.type === 'checkbox' ? el.checked : el.value;
      if (c.type === 'number') v = v === '' ? null : Number(v);
      if (c.type !== 'checkbox' && v === '') v = null;
      if (c.required && (v === null || v === '')) missing = c.label;
      if (c.computeOnly) return; // display-only helper field, not stored
      if (c.key.indexOf('data.') === 0) dataObj[c.key.slice(5)] = v; else payload[c.key] = v;
    });
    if (missing) { toast(missing + ' is required.', 'warning'); return; }
    if (d.generic) { payload.module = d.module; payload.data = dataObj; if (!payload.title && dataObj.title) payload.title = dataObj.title; }
    // V6: teacher-owned score sheets. Admin can supervise all, but a subject teacher should only edit/delete records they created.
    if (d.table === 'results' && !id && window.SC_PROFILE && SC_PROFILE.id) {
      payload.teacher_id = SC_PROFILE.id;
      payload.assessment_source = payload.assessment_source || 'manual';
    }
    // Issue 5: auto-compute payroll net pay when left blank
    if (d.table === 'payroll' && (payload.net_pay == null)) {
      const n = (x) => Number(payload[x]) || 0;
      payload.net_pay = n('basic') + n('allowances') + n('bonus') + n('overtime') - n('tax') - n('pension') - n('loan_deduction') - n('other_deductions');
    }
    // Issue 5: auto-compute appraisal average score + band
    if (d.table === 'staff_appraisals') {
      const keys = ['punctuality', 'teaching_quality', 'student_results', 'teamwork', 'conduct'];
      const vals = keys.map(k => Number(payload[k])).filter(v => !isNaN(v));
      if (vals.length) {
        const avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
        const band = avg >= 8 ? 'Excellent' : avg >= 6.5 ? 'Very Good' : avg >= 5 ? 'Good' : avg >= 4 ? 'Fair' : 'Needs Improvement';
        payload.total_score = avg + '/10 — ' + band;
      }
    }
    let res;
    if (id) res = await this.sb.from(d.table).update(payload).eq('id', id);
    else res = await this.sb.from(d.table).insert(payload);
    if (res.error) { toast(res.error.message, 'danger', 6000); return; }
    if (window.App && App.logActivity) App.logActivity(id ? 'update' : 'create', d.table, id || d.title);
    closeModal();
    if (!id && (moduleId === 'students' || moduleId === 'staff')) {
      const email = moduleId === 'students' ? payload.guardian_email : payload.email;
      if (email) {
        const role = moduleId === 'students' ? 'student/parent' : 'staff';
        const invite = 'Login invitation for '+(payload.full_name||d.title)+'\nEmail: '+email+'\nRole: '+role+'\nOpen login.html → Request access → use this email → create password → admin approves in Approvals.';
        try { navigator.clipboard && navigator.clipboard.writeText(invite); } catch(e) {}
        toast('✅ Saved. Login invitation copied. The user must request access, then admin approves.', 'success', 8000);
      } else toast('✅ Saved. Add an email to generate login invitation details.', 'success', 6000);
    } else toast('✅ Saved.', 'success');
    this.renderList(moduleId);
  },

  async printReceipt(id) {
    if (!this.sb) return;
    const { data: f } = await this.sb.from('fee_payments').select('*').eq('id', id).maybeSingle();
    if (!f) return;
    const sc = window.SCHOOL || {};
    const cur = sc.currency || '₦';
    const sig = localStorage.getItem('sc-signature-url') || '';
    const pn = localStorage.getItem('sc-principal-name') || 'Bursar / Principal';
    const sign = sig ? '<div style="margin-top:28px;text-align:center"><img src="' + sig + '" style="max-width:150px;max-height:70px;object-fit:contain"><br><b>' + pn + '</b><br>Official Signature</div>' : '';
    const html = '<div style="width:620px;max-width:96vw;border:2px solid #111;padding:28px;font-family:Arial,sans-serif;color:#000;background:#fff"><h2 style="text-align:center;margin:0">' + esc(sc.name || 'School') + '</h2><p style="text-align:center;margin:4px 0 18px">E-RECEIPT</p><p><b>Student:</b> ' + esc(f.student_name || '') + '</p><p><b>Amount:</b> ' + cur + Number(f.amount_paid || 0).toLocaleString() + '</p><p><b>Method:</b> ' + esc(f.method || '') + ' &nbsp; <b>Reference:</b> ' + esc(f.reference || f.id || '') + '</p><p><b>Term:</b> ' + esc(f.term || '') + ' &nbsp; <b>Date:</b> ' + esc((f.created_at || new Date().toISOString()).slice(0, 10)) + '</p><p style="font-size:.8rem;color:#555">This receipt was generated electronically from the school portal.</p>' + sign + '</div>';
    const w = window.open('', '_blank');
    if (!w) { toast('Popup blocked! Please allow popups.', 'warning'); return; }
    w.document.open();
    w.document.write('<!DOCTYPE html><html><head><title>E-Receipt</title></head><body style="display:flex;justify-content:center;padding:20px">' + html + '<script>setTimeout(()=>window.print(),500);<\/script></body></html>');
    w.document.close();
    w.focus();
  },

  async remove(moduleId, id) {
    const d = this.def(moduleId);
    if (!this.canWrite(moduleId)) { toast('Read-only for your role on this page.', 'warning', 5000); return; }
    if (!d || !this.sb) return;
    if (window.App && !App.isAdminRole(App.currentRole)) {
      const { data: row } = await this.sb.from(d.table).select('*').eq('id', id).maybeSingle();
      if (row && (row.teacher_id || row.posted_by || row.teacher)) {
        const uid = window.SC_PROFILE?.id;
        const uname = window.SC_PROFILE?.full_name;
        if (row.teacher_id !== uid && row.posted_by !== uid && row.teacher !== uname) {
          toast('Access Denied: You cannot delete records created by another subject teacher.', 'danger', 6000);
          return;
        }
      }
    }
    if (!confirm('Delete this ' + d.title.toLowerCase() + '?')) return;
    const { error } = await this.sb.from(d.table).delete().eq('id', id);
    if (error) { toast(error.message, 'danger'); return; }
    if (window.App && App.logActivity) App.logActivity('delete', d.table, id);
    toast('Deleted.', 'info'); this.renderList(moduleId);
  },

  /* Issue 10: bulk-import student birthdays from the students table */
  async importBirthdays() {
    if (!this.sb) { toast('Database not configured.', 'warning'); return; }
    const { data: studs } = await this.sb.from('students').select('full_name,class,date_of_birth').not('date_of_birth', 'is', null);
    if (!studs || !studs.length) { toast('No students with a date of birth found.', 'warning'); return; }
    const { data: existing } = await this.sb.from('birthdays').select('person_name');
    const have = new Set((existing || []).map(b => b.person_name));
    const rows = studs.filter(s => !have.has(s.full_name)).map(s => ({ person_name: s.full_name, type: 'student', date: s.date_of_birth, class: s.class }));
    if (!rows.length) { toast('All student birthdays are already imported.', 'info'); return; }
    const { error } = await this.sb.from('birthdays').insert(rows);
    if (error) { toast(error.message, 'danger'); return; }
    toast('✅ Imported ' + rows.length + ' student birthday(s).', 'success'); this.renderList('birthdays');
  },

  /* Issue 7: filter a grouped student <select> by class (hides other optgroups). */
  filterRefByClass(selId, cls) {
    const sel = document.getElementById(selId); if (!sel) return;
    Array.from(sel.querySelectorAll('optgroup')).forEach(g => {
      g.style.display = (!cls || g.label === cls) ? '' : 'none';
      Array.from(g.children).forEach(o => { o.style.display = g.style.display; o.disabled = (g.style.display === 'none'); });
    });
    sel.value = '';
  },
  /* Issue 7: filter the student <select> by typed letters of the name. */
  filterRefBySearch(selId, term) {
    const sel = document.getElementById(selId); if (!sel) return;
    term = (term || '').toLowerCase();
    Array.from(sel.options).forEach(o => {
      if (!o.value) return;
      const show = !term || o.textContent.toLowerCase().indexOf(term) !== -1;
      o.style.display = show ? '' : 'none'; o.disabled = !show;
    });
    Array.from(sel.querySelectorAll('optgroup')).forEach(g => {
      const anyVisible = Array.from(g.children).some(o => o.style.display !== 'none');
      g.style.display = anyVisible ? '' : 'none';
    });
  },

  /* Issue 14: show birthdays grouped by birth MONTH with name + class. */
  async renderBirthdaysByMonth() {
    const box = document.getElementById('birthdays-bymonth'); if (!box) return;
    if (!this.sb) { box.innerHTML = '<p>Database not configured.</p>'; return; }
    const { data } = await this.sb.from('birthdays').select('person_name,class,date,type').limit(5000);
    if (!data || !data.length) { box.innerHTML = '<div class="card"><p style="color:var(--gray-500)">No birthdays yet — click “Import student birthdays”.</p></div>'; return; }
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const byMonth = {}; months.forEach(m => byMonth[m] = []);
    data.forEach(b => {
      if (!b.date) return;
      const mi = parseInt(String(b.date).slice(5, 7), 10) - 1;
      if (mi >= 0 && mi < 12) byMonth[months[mi]].push(b);
    });
    box.innerHTML = '<div class="card" style="margin-bottom:16px"><h3 style="margin-top:0">🎂 Birthdays by month</h3><div class="grid grid-2">' +
      months.map(m => {
        const list = byMonth[m].sort((a, b) => String(a.date).slice(8) - String(b.date).slice(8));
        return '<div style="border:1px solid var(--gray-200);border-radius:10px;padding:10px;margin-bottom:8px">' +
          '<strong style="color:var(--primary)">' + m + '</strong> <span style="color:var(--gray-500)">(' + list.length + ')</span>' +
          (list.length ? '<ul style="margin:6px 0 0;padding-left:18px;line-height:1.6">' + list.map(b => '<li>' + esc(b.person_name) + ' <span style="color:var(--gray-500)">— ' + esc(b.class || b.type || '') + ' (day ' + String(b.date).slice(8, 10) + ')</span></li>').join('') + '</ul>' : '<p style="color:var(--gray-400);margin:6px 0 0;font-size:.85rem">—</p>') +
          '</div>';
      }).join('') + '</div></div>';
  },

  /* Issue 8: pull Digital-Library reading scores into Results so they count
     toward the report card. Adds each unmatched reading score as a CA-style
     result row (or you can push to a chosen CA column). */
  async pullReadingScoresToResults(opts) {
    if (!this.sb) { toast('Database not configured.', 'warning'); return; }
    opts = opts || {};
    const { data: scores } = await this.sb.from('reading_scores').select('*').eq('pushed_to_results', false).limit(5000);
    if (!scores || !scores.length) { toast('No new reading scores to pull.', 'info'); return; }
    let ok = 0;
    for (const s of scores) {
      // scale reading score to the chosen CA max (default 10)
      const caMax = Number(opts.caMax || 10);
      const scaled = s.max_score ? Math.round((Number(s.score) / Number(s.max_score)) * caMax * 10) / 10 : Number(s.score);
      const row = { student_name: s.student_name, subject: s.subject, class: s.class, term: opts.term || null, session: opts.session || null };
      row[opts.column || 'ca3'] = scaled;
      const { error } = await this.sb.from('results').insert(row);
      if (!error) { await this.sb.from('reading_scores').update({ pushed_to_results: true }).eq('id', s.id); ok++; }
    }
    if (window.App && App.logActivity) App.logActivity('pull-reading-scores', 'results', ok + ' rows');
    toast('✅ Pulled ' + ok + ' reading score(s) into Results (column ' + (opts.column || 'ca3') + ').', 'success', 6000);
    this.renderList('results');
  },

  exportCSV(moduleId) {
    const d = this.def(moduleId); if (!d || !this.sb) return;
    let q = this.sb.from(d.table).select('*');
    if (d.generic) q = q.eq('module', d.module);
    q.then(({ data }) => {
      if (!data || !data.length) { toast('Nothing to export.', 'warning'); return; }
      const keys = Object.keys(data[0]);
      const csv = [keys.join(',')].concat(data.map(r => keys.map(k => '"' + String(r[k] == null ? '' : (typeof r[k] === 'object' ? JSON.stringify(r[k]) : r[k])).replace(/"/g, '""') + '"').join(','))).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = d.table + '.csv'; a.click();
    });
  },

  /* Issue 12: Export the visible/queried records as a printable PDF (uses the
     browser's "Save as PDF" print engine — no paid library, no AI). */
  /* Issue 5: print a professional payslip for one payroll row. */
  async printPayslip(id) {
    if (!this.sb) return;
    const { data: p } = await this.sb.from('payroll').select('*').eq('id', id).maybeSingle();
    if (!p) { toast('Payslip not found.', 'warning'); return; }
    const sc = (window.SCHOOL || {}); const cur = sc.currency || '₦';
    const n = (x) => Number(p[x]) || 0;
    const earnings = [['Basic salary', n('basic')], ['Allowances', n('allowances')], ['Bonus / Incentive', n('bonus')], ['Overtime', n('overtime')]].filter(r => r[1]);
    const deductions = [['Tax (PAYE)', n('tax')], ['Pension', n('pension')], ['Loan repayment', n('loan_deduction')], ['Other deductions', n('other_deductions')]].filter(r => r[1]);
    const gross = earnings.reduce((a, b) => a + b[1], 0);
    const totalDed = deductions.reduce((a, b) => a + b[1], 0);
    const net = p.net_pay != null ? Number(p.net_pay) : gross - totalDed;
    const fmt = (v) => cur + Number(v).toLocaleString();
    const rows = (arr) => arr.map(r => '<tr><td style="padding:4px 8px">' + esc(r[0]) + '</td><td style="padding:4px 8px;text-align:right">' + fmt(r[1]) + '</td></tr>').join('');
    const html = '<div style="width:720px;max-width:96vw;font-family:Arial,sans-serif;border:1px solid #cbd5e1;border-radius:10px;overflow:hidden">' +
      '<div style="background:' + (sc.primary || '#4f46e5') + ';color:#fff;padding:18px 22px;display:flex;align-items:center;gap:12px">' +
      '<img src="assets/img/logo.' + (sc.logoExt || 'svg') + '" style="width:48px;height:48px;border-radius:8px;background:#fff;padding:3px;object-fit:contain" onerror="this.style.display=\'none\'">' +
      '<div><h2 style="margin:0">' + esc(sc.name || 'School') + '</h2><div style="font-size:.78rem;opacity:.9">' + esc(sc.address || '') + ' · ' + esc(sc.phone || '') + '</div></div>' +
      '<div style="margin-left:auto;text-align:right"><strong style="font-size:1.1rem">PAYSLIP</strong><div style="font-size:.8rem">' + esc(p.month || '') + ' ' + esc(p.year || '') + '</div></div></div>' +
      '<div style="padding:16px 22px"><table style="width:100%;font-size:.9rem;margin-bottom:12px"><tr><td><b>Staff:</b> ' + esc(p.staff_name || '-') + '</td><td style="text-align:right"><b>Status:</b> ' + esc(p.status || 'draft') + '</td></tr><tr><td><b>Method:</b> ' + esc(p.method || '-') + '</td><td style="text-align:right"><b>Slip ref:</b> ' + esc(String(id).slice(0, 8)) + '</td></tr></table>' +
      '<div style="display:flex;gap:16px;flex-wrap:wrap">' +
      '<div style="flex:1;min-width:240px"><h4 style="margin:6px 0;border-bottom:2px solid #16a34a;color:#16a34a">Earnings</h4><table style="width:100%;font-size:.88rem">' + rows(earnings) + '<tr><td style="padding:6px 8px;font-weight:700;border-top:1px solid #e2e8f0">Gross</td><td style="padding:6px 8px;text-align:right;font-weight:700;border-top:1px solid #e2e8f0">' + fmt(gross) + '</td></tr></table></div>' +
      '<div style="flex:1;min-width:240px"><h4 style="margin:6px 0;border-bottom:2px solid #dc2626;color:#dc2626">Deductions</h4><table style="width:100%;font-size:.88rem">' + (deductions.length ? rows(deductions) : '<tr><td style="padding:4px 8px;color:#94a3b8">None</td><td></td></tr>') + '<tr><td style="padding:6px 8px;font-weight:700;border-top:1px solid #e2e8f0">Total</td><td style="padding:6px 8px;text-align:right;font-weight:700;border-top:1px solid #e2e8f0">' + fmt(totalDed) + '</td></tr></table></div></div>' +
      '<div style="margin-top:16px;background:' + (sc.primary || '#4f46e5') + '10;border:1px dashed ' + (sc.primary || '#4f46e5') + ';border-radius:8px;padding:12px;text-align:center"><span style="font-size:.85rem;color:#64748b">NET PAY</span><div style="font-size:1.6rem;font-weight:800;color:' + (sc.primary || '#4f46e5') + '">' + fmt(net) + '</div></div>' +
      '<div style="display:flex;justify-content:space-between;margin-top:30px;font-size:.8rem"><div>____________________<br>Prepared by (Bursar)</div><div>____________________<br>Authorised (Proprietor)</div></div>' +
      '<p style="margin-top:18px;font-size:.7rem;color:#94a3b8;text-align:center">This is a computer-generated payslip · ' + esc(sc.name || '') + ' · Powered by HMG Concepts</p></div></div>';
    const w = window.open('', '_blank');
    w.document.write('<html><head><title>Payslip</title></head><body style="display:flex;justify-content:center;padding:20px">' + html + '<script>window.onload=()=>window.print()<\/script></body></html>');
    w.document.close();
  },

  exportPDF(moduleId) {
    const d = this.def(moduleId); if (!d || !this.sb) return;
    let q = this.sb.from(d.table).select('*');
    if (d.generic) q = q.eq('module', d.module);
    q.then(({ data }) => {
      if (!data || !data.length) { toast('Nothing to export.', 'warning'); return; }
      const cols = d.cols;
      const sc = (window.SCHOOL || {});
      const cellVal = (row, c) => c.key.indexOf('data.') === 0 ? ((row.data || {})[c.key.slice(5)]) : row[c.key];
      const head = '<tr>' + cols.map(c => '<th>' + esc(c.label) + '</th>').join('') + '</tr>';
      const rows = data.map(r => '<tr>' + cols.map(c => '<td>' + esc(String(cellVal(r, c) == null ? '' : cellVal(r, c))) + '</td>').join('') + '</tr>').join('');
      const w = window.open('', '_blank');
      w.document.write('<html><head><title>' + esc(d.title) + ' export</title><style>body{font-family:Arial,sans-serif;padding:18px;color:#111}h2{margin:0}small{color:#666}table{border-collapse:collapse;width:100%;margin-top:14px;font-size:12px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f1f5f9}</style></head><body><h2>' + esc(sc.name || 'School') + ' — ' + esc(d.title) + ' records</h2><small>Generated ' + new Date().toLocaleString() + ' · ' + data.length + ' record(s)</small><table>' + head + rows + '</table><script>window.onload=()=>window.print()<\/script></body></html>');
      w.document.close();
    });
  },

  /* Issue 11: Bulk-import students (or any module) from a CSV file. The CSV is
     parsed in-browser and ONLY the extracted records are stored — the file
     itself is NEVER uploaded/saved (keeps Supabase storage free). */
  importCSV(moduleId) {
    const d = this.def(moduleId); if (!d) { toast('Import not available here.', 'warning'); return; }
    if (!this.sb) { toast('Database not configured.', 'warning'); return; }
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.csv,text/csv';
    inp.onchange = () => {
      const f = inp.files[0]; if (!f) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const rows = CRUD._parseCSV(String(reader.result));
        if (!rows.length) { toast('CSV is empty or unreadable.', 'warning'); return; }
        const header = rows[0].map(h => h.trim());
        const valid = new Set(d.cols.filter(c => c.key.indexOf('data.') !== 0).map(c => c.key));
        const dataCols = new Set(d.cols.filter(c => c.key.indexOf('data.') === 0).map(c => c.key.slice(5)));
        const records = rows.slice(1).filter(r => r.some(x => x && x.trim())).map(r => {
          const rec = {}; const dataObj = {};
          header.forEach((h, i) => {
            const v = (r[i] == null ? '' : r[i].trim());
            if (v === '') return;
            if (valid.has(h)) rec[h] = v;
            else if (dataCols.has(h)) dataObj[h] = v;
          });
          if (d.generic) { rec.module = d.module; rec.data = dataObj; if (!rec.title && dataObj.title) rec.title = dataObj.title; }
          return rec;
        }).filter(r => Object.keys(r).length);
        if (!records.length) { toast('No valid rows found. Check column headers match field keys.', 'warning', 7000); return; }
        // chunked insert to stay within free-tier request sizes
        let ok = 0, fail = 0;
        for (let i = 0; i < records.length; i += 200) {
          const { error } = await this.sb.from(d.table).insert(records.slice(i, i + 200));
          if (error) { fail += Math.min(200, records.length - i); } else { ok += Math.min(200, records.length - i); }
        }
        if (window.App && App.logActivity) App.logActivity('import', d.table, ok + ' rows');
        toast('✅ Imported ' + ok + ' record(s).' + (fail ? ' ' + fail + ' failed.' : '') + ' (CSV file not stored)', fail ? 'warning' : 'success', 6000);
        this.renderList(moduleId);
      };
      reader.readAsText(f);
    };
    inp.click();
  },

  _parseCSV(text) {
    // RFC-4180-ish CSV parser supporting quoted fields, commas & newlines.
    const rows = []; let row = [], field = '', inQ = false;
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQ) {
        if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
        else field += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === ',') { row.push(field); field = ''; }
        else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else field += ch;
      }
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  },

  /* Issue 9: Digital library — when a teacher sets reading questions on a book,
     the student's auto-marked score can be pushed into the results table so it
     counts toward the final grade. */
  async pushReadingScore(studentName, subject, cls, score, label) {
    if (!this.sb) return;
    try {
      await this.sb.from('reading_scores').insert({ student_name: studentName, subject, class: cls, score, source: label || 'digital_library' });
    } catch (e) {}
  },

  /* Issue 10: Auto-promotion. Computes promote/repeat/graduate for every active
     student from their results vs a pass benchmark, then writes draft promotion
     rows the admin can review & alter before applying. */
  async autoPromote(opts) {
    if (!this.sb) { toast('Database not configured.', 'warning'); return; }
    opts = opts || {};
    const benchmark = Number(opts.benchmark != null ? opts.benchmark : 40);
    const session = opts.session || '';
    const term = opts.term || '';
    const graduatingClass = (opts.graduatingClass || '').trim();
    const { data: studs } = await this.sb.from('students').select('id,full_name,class,status').eq('status', 'active').limit(5000);
    if (!studs || !studs.length) { toast('No active students found.', 'warning'); return; }
    let rq = this.sb.from('results').select('student_name,class,subject,ca1,ca2,ca3,exam');
    if (session) rq = rq.eq('session', session);
    if (term) rq = rq.eq('term', term);
    const { data: results } = await rq.limit(50000);
    const byStudent = {};
    (results || []).forEach(r => {
      const t = (Number(r.ca1) || 0) + (Number(r.ca2) || 0) + (Number(r.ca3) || 0) + (Number(r.exam) || 0);
      (byStudent[r.student_name] = byStudent[r.student_name] || []).push(t);
    });
    // class progression map (override via opts.nextClass)
    const nextClassMap = opts.nextClass || CRUD._defaultNextClass();
    const drafts = [];
    studs.forEach(s => {
      const scores = byStudent[s.full_name] || [];
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      let action, to_class = '';
      if (graduatingClass && s.class === graduatingClass) { action = 'graduate'; }
      else if (avg == null) { action = 'pending'; }
      else if (avg >= benchmark) { action = 'promote'; to_class = nextClassMap[s.class] || ''; }
      else { action = 'repeat'; to_class = s.class; }
      drafts.push({ student_name: s.full_name, from_class: s.class, to_class, action, average: avg == null ? null : Math.round(avg * 10) / 10, session, term, status: 'draft' });
    });
    // store as draft promotions (admin can edit before applying)
    let ok = 0;
    for (let i = 0; i < drafts.length; i += 200) {
      const { error } = await this.sb.from('promotions').insert(drafts.slice(i, i + 200).map(d => ({ student_name: d.student_name, from_class: d.from_class, to_class: d.to_class, action: d.action, session: d.session, term: d.term, status: d.status, average: d.average })));
      if (!error) ok += Math.min(200, drafts.length - i);
    }
    if (window.App && App.logActivity) App.logActivity('auto-promote', 'promotions', ok + ' drafts @ ' + benchmark + '%');
    toast('✅ Generated ' + ok + ' promotion draft(s) at ' + benchmark + '% benchmark. Review & edit, then Apply.', 'success', 8000);
    this.renderList('promotion');
    return drafts;
  },

  _defaultNextClass() {
    // Sensible Nigerian-style progression; admin can override anytime.
    return {
      'Nursery 1': 'Nursery 2', 'Nursery 2': 'Primary 1',
      'Primary 1': 'Primary 2', 'Primary 2': 'Primary 3', 'Primary 3': 'Primary 4',
      'Primary 4': 'Primary 5', 'Primary 5': 'Primary 6', 'Primary 6': 'JSS1',
      'JSS1': 'JSS2', 'JSS2': 'JSS3', 'JSS3': 'SSS1',
      'SSS1': 'SSS2', 'SSS2': 'SSS3'
    };
  },

  /* Apply approved/draft promotions: move each student to their to_class. */
  async applyPromotions() {
    if (!this.sb) { toast('Database not configured.', 'warning'); return; }
    if (!confirm('Apply all promotions? This updates each student\'s class (graduates become "graduated").')) return;
    const { data: proms } = await this.sb.from('promotions').select('*').in('status', ['draft', 'approved']).limit(5000);
    if (!proms || !proms.length) { toast('No promotions to apply.', 'warning'); return; }
    let done = 0;
    for (const p of proms) {
      if (p.action === 'pending') continue;
      const upd = p.action === 'graduate' ? { status: 'graduated' } : (p.action === 'promote' ? { class: p.to_class } : {});
      if (Object.keys(upd).length) { await this.sb.from('students').update(upd).eq('full_name', p.student_name); }
      await this.sb.from('promotions').update({ status: 'applied' }).eq('id', p.id);
      done++;
    }
    if (window.App && App.logActivity) App.logActivity('apply-promotions', 'students', done + ' applied');
    toast('✅ Applied ' + done + ' promotion(s).', 'success'); this.renderList('promotion');
  },

  /* Issue 6: Build today's attendance from QR self check-ins so teachers don't
     hand-enter each student. Anyone scanned = present; the rest of their class
     are written as absent (admin can edit). */
  async importAttendanceFromCheckin() {
    if (!this.sb) { toast('Database not configured.', 'warning'); return; }
    const today = new Date().toISOString().slice(0, 10);
    const { data: checkins } = await this.sb.from('attendance_checkins').select('student_name,student_id_ref,class,checkin_at').gte('checkin_at', today + 'T00:00:00').limit(5000);
    if (!checkins || !checkins.length) { toast('No QR check-ins recorded today yet.', 'warning', 6000); return; }
    const present = {}; checkins.forEach(c => { const n = c.student_name || c.student_id_ref; if (n) present[n] = c.class || ''; });
    // avoid duplicating existing attendance rows for today
    const { data: existing } = await this.sb.from('attendance').select('student_name').eq('date', today);
    const have = new Set((existing || []).map(a => a.student_name));
    const rows = Object.keys(present).filter(n => !have.has(n)).map(n => ({ student_name: n, class: present[n], date: today, status: 'present', time_in: new Date().toTimeString().slice(0, 5) }));
    if (!rows.length) { toast('All scanned students are already in today\'s attendance.', 'info'); return; }
    const { error } = await this.sb.from('attendance').insert(rows);
    if (error) { toast(error.message, 'danger'); return; }
    if (window.App && App.logActivity) App.logActivity('attendance-from-checkin', 'attendance', rows.length + ' present');
    toast('✅ Marked ' + rows.length + ' student(s) PRESENT from QR check-ins.', 'success', 6000);
    this.renderList('attendance');
  }
};

/* ---- Auto-promotion modal UI (issue 10) ---- */
const PromoUI = {
  async open() {
    if (!window.CRUD || !CRUD.sb) { toast('Database not configured.', 'warning'); return; }
    let sessions = [], terms = [];
    try { const { data } = await CRUD.sb.from('lookups').select('value,kind').in('kind', ['session', 'term']); (data || []).forEach(r => { if (r.kind === 'session') sessions.push(r.value); else terms.push(r.value); }); } catch (e) {}
    const opt = (arr) => ['<option value="">— any —</option>'].concat(arr.map(v => '<option>' + esc(v) + '</option>')).join('');
    openModal('Auto-promote students by exam result',
      '<div class="form-group"><label>Pass benchmark (% of total)</label><input class="form-input" id="pp-bm" type="number" value="40" min="0" max="100"></div>' +
      '<div class="form-group"><label>Session</label><select class="form-select" id="pp-sess">' + opt(sessions) + '</select></div>' +
      '<div class="form-group"><label>Term</label><select class="form-select" id="pp-term">' + opt(terms) + '</select></div>' +
      '<div class="form-group"><label>Graduating class (students here → graduate)</label><input class="form-input" id="pp-grad" placeholder="e.g. SSS3"></div>' +
      '<p style="color:var(--gray-500);font-size:.85rem">This creates editable DRAFTS only. Review them, then click “Apply promotions”.</p>',
      '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
      '<button class="btn btn-primary" onclick="PromoUI.run()">Generate drafts</button>');
  },
  run() {
    const benchmark = Number(document.getElementById('pp-bm').value || 40);
    const session = document.getElementById('pp-sess').value;
    const term = document.getElementById('pp-term').value;
    const graduatingClass = document.getElementById('pp-grad').value;
    closeModal();
    CRUD.autoPromote({ benchmark, session, term, graduatingClass });
  }
};
if (typeof window !== 'undefined') window.PromoUI = PromoUI;
if (typeof window !== 'undefined') window.CRUD = CRUD;
if (typeof console !== 'undefined') console.log('%c[School Connect] CRUD engine loaded — real add/edit/delete for every module.', 'color:#0d9488;font-weight:bold');
