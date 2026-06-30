/* ====================================================================
   catalog.js — School Connect FINAL v2 (cumulative)
   Themes, fonts, presets, modules, escaping helpers.
   Fixes D-03 (injection-safe escaping).
   ==================================================================== */

/* ---------- Escaping helpers (fix D-03) ---------- */
// HTML-escape (defence-in-depth)
function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
// Single-quoted JS string
function jsStr(s) {
  if (s == null) return '';
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
// Template-literal safe
function tplStr(s) {
  if (s == null) return '';
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}
// Slug for filenames/IDs
function slugify(s) {
  if (s == null) return '';
  return String(s).toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'school';
}

// HTML-attr safe
function attr(s) { return esc(s); }

// JSON safe (prevent </script> and CDATA breaks)
function jsonSafe(s) {
  return String(s)
    .replace(/<\/script/gi, '<\\/script')
    .replace(/<!--/g, '<\\!--');
}

/* ---------- 14 Themes ---------- */
const THEMES = [
  { id:'theme1', name:'Executive Navy & Gold', primary:'#0f2a43', accent:'#d4af37', bg:'#f8fafc' },
  { id:'theme2', name:'Royal Blue & Emerald', primary:'#1d4ed8', accent:'#059669', bg:'#f8fafc' },
  { id:'theme3', name:'Oxford Indigo & Sky', primary:'#3730a3', accent:'#0284c7', bg:'#f8fafc' },
  { id:'theme4', name:'Charcoal & Teal', primary:'#1f2937', accent:'#14b8a6', bg:'#f9fafb' },
  { id:'theme5', name:'Burgundy & Champagne', primary:'#7f1d1d', accent:'#c6a15b', bg:'#fff7ed' },
  { id:'theme6', name:'Forest & Brass', primary:'#14532d', accent:'#b45309', bg:'#f7fee7' },
  { id:'theme7', name:'Slate & Cyan', primary:'#334155', accent:'#0891b2', bg:'#f8fafc' },
  { id:'theme8', name:'Plum & Rose Gold', primary:'#581c87', accent:'#be7c4d', bg:'#faf5ff' },
  { id:'theme9', name:'Midnight & Electric Blue', primary:'#0f172a', accent:'#2563eb', bg:'#f8fafc' },
  { id:'theme10', name:'Academic Green & Navy', primary:'#166534', accent:'#1e3a8a', bg:'#f8fafc' },
  { id:'theme11', name:'Gold Light', primary:'#66e684', accent:'#ea4bc3', bg:'#ffffff' },
  { id:'theme12', name:'Emerald Frost', primary:'#77ce61', accent:'#cd2b47', bg:'#ffffff' },
  { id:'theme13', name:'Crimson Storm', primary:'#d8155d', accent:'#62e269', bg:'#ffffff' },
  { id:'theme14', name:'Jade Shadow', primary:'#1036f8', accent:'#79c51d', bg:'#ffffff' },
  { id:'theme15', name:'Pearl Standard', primary:'#0506ae', accent:'#964eec', bg:'#ffffff' },
  { id:'theme16', name:'Teal Wave', primary:'#da135a', accent:'#58f302', bg:'#ffffff' },
  { id:'theme17', name:'Teal Dust', primary:'#5310f1', accent:'#2366b2', bg:'#ffffff' },
  { id:'theme18', name:'Ruby Standard', primary:'#4c70cd', accent:'#09b45c', bg:'#ffffff' },
  { id:'theme19', name:'Gold Pro', primary:'#d2d16f', accent:'#34c732', bg:'#ffffff' },
  { id:'theme20', name:'Coral Elite', primary:'#0ffe2e', accent:'#02b3a8', bg:'#0f172a' },
  { id:'theme21', name:'Slate Peak', primary:'#5ec93c', accent:'#a2d1e0', bg:'#ffffff' },
  { id:'theme22', name:'Crimson Aura', primary:'#3caaaa', accent:'#6a0da2', bg:'#ffffff' },
  { id:'theme23', name:'Emerald Modern', primary:'#ffe822', accent:'#38b1da', bg:'#ffffff' },
  { id:'theme24', name:'Ocean Ultra', primary:'#201bb8', accent:'#1ffb00', bg:'#ffffff' },
  { id:'theme25', name:'Gold Elite', primary:'#73c1dd', accent:'#3ad379', bg:'#ffffff' },
  { id:'theme26', name:'Amber Dust', primary:'#49b574', accent:'#3dd43e', bg:'#0f172a' },
  { id:'theme27', name:'Amethyst Shadow', primary:'#b6f204', accent:'#6b1482', bg:'#ffffff' },
  { id:'theme28', name:'Forest Shadow', primary:'#e378e6', accent:'#53abae', bg:'#ffffff' },
  { id:'theme29', name:'Topaz Ultra', primary:'#5283c5', accent:'#fafeed', bg:'#ffffff' },
  { id:'theme30', name:'Amber Storm', primary:'#6e40d9', accent:'#be3dcd', bg:'#ffffff' },
  { id:'theme31', name:'Coral Dust', primary:'#acf792', accent:'#647254', bg:'#ffffff' },
  { id:'theme32', name:'Teal Glow', primary:'#5207d4', accent:'#da62bd', bg:'#ffffff' },
  { id:'theme33', name:'Midnight Peak', primary:'#c671e4', accent:'#ed3fdc', bg:'#ffffff' },
  { id:'theme34', name:'Ocean Elite', primary:'#8f7e7f', accent:'#9c58b6', bg:'#0f172a' },
  { id:'theme35', name:'Ruby Elite', primary:'#eccea3', accent:'#83a95a', bg:'#ffffff' },
  { id:'theme36', name:'Emerald Dust', primary:'#8d4bca', accent:'#b3ecc9', bg:'#ffffff' },
  { id:'theme37', name:'Topaz Peak', primary:'#02b766', accent:'#1e5bd8', bg:'#ffffff' },
  { id:'theme38', name:'Teal Breeze', primary:'#bda3ea', accent:'#03802d', bg:'#ffffff' },
  { id:'theme39', name:'Ivory Aura', primary:'#6b5d6b', accent:'#add3ae', bg:'#ffffff' },
  { id:'theme40', name:'Rose Elite', primary:'#dd14c6', accent:'#7860bb', bg:'#ffffff' },
  { id:'theme41', name:'Ivory Frost', primary:'#f49359', accent:'#fbe273', bg:'#ffffff' },
  { id:'theme42', name:'Crimson Dust', primary:'#52d6af', accent:'#5a4b46', bg:'#ffffff' },
  { id:'theme43', name:'Sapphire Flame', primary:'#c38925', accent:'#b90f90', bg:'#ffffff' },
  { id:'theme44', name:'Midnight Aura', primary:'#e0483d', accent:'#3e53e6', bg:'#ffffff' },
  { id:'theme45', name:'Sunset Storm', primary:'#83e845', accent:'#4cdea2', bg:'#ffffff' },
  { id:'theme46', name:'Ocean Dust', primary:'#c3f7cd', accent:'#a31be1', bg:'#ffffff' },
  { id:'theme47', name:'Sunset Glow', primary:'#59cfd0', accent:'#b6f9a3', bg:'#0f172a' },
  { id:'theme48', name:'Emerald Frost', primary:'#bbabcd', accent:'#0bd0c2', bg:'#ffffff' },
  { id:'theme49', name:'Forest Pro', primary:'#a5c8d8', accent:'#1829a0', bg:'#ffffff' },
  { id:'theme50', name:'Ocean Breeze', primary:'#de2ecc', accent:'#35d1e1', bg:'#ffffff' },
  { id:'theme51', name:'Midnight Elite', primary:'#8ca502', accent:'#793e18', bg:'#0f172a' },
  { id:'theme52', name:'Onyx Aura', primary:'#0b8a71', accent:'#bee388', bg:'#ffffff' },
  { id:'theme53', name:'Amethyst Pro', primary:'#b9e294', accent:'#be4557', bg:'#ffffff' },
  { id:'theme54', name:'Jade Light', primary:'#8cae64', accent:'#0f5cf6', bg:'#ffffff' },
  { id:'theme55', name:'Rose Elite', primary:'#7b500c', accent:'#736bbd', bg:'#ffffff' },
  { id:'theme56', name:'Sapphire Wave', primary:'#cd3a8c', accent:'#7cc2b6', bg:'#ffffff' },
  { id:'theme57', name:'Ruby Sky', primary:'#ec25d7', accent:'#033ad0', bg:'#ffffff' },
  { id:'theme58', name:'Amethyst Frost', primary:'#f3f6be', accent:'#386083', bg:'#ffffff' },
  { id:'theme59', name:'Emerald Pro', primary:'#ae3338', accent:'#6d8b16', bg:'#ffffff' },
  { id:'theme60', name:'Pearl Modern', primary:'#14ca94', accent:'#d05ead', bg:'#ffffff' },
  { id:'theme61', name:'Midnight Flame', primary:'#c56f7c', accent:'#506824', bg:'#ffffff' },
  { id:'theme62', name:'Forest Breeze', primary:'#5f9e35', accent:'#5c0d71', bg:'#ffffff' },
  { id:'theme63', name:'Forest Wave', primary:'#bbc1ea', accent:'#b8f9aa', bg:'#ffffff' },
  { id:'theme64', name:'Ivory Standard', primary:'#bb471e', accent:'#08ce99', bg:'#ffffff' },
  { id:'theme65', name:'Slate Sky', primary:'#1bb5a3', accent:'#922d09', bg:'#ffffff' },
  { id:'theme66', name:'Ruby Dust', primary:'#f9d111', accent:'#509913', bg:'#0f172a' },
  { id:'theme67', name:'Teal Modern', primary:'#f5b2f7', accent:'#eae144', bg:'#ffffff' },
  { id:'theme68', name:'Ocean Peak', primary:'#a54d74', accent:'#6daf59', bg:'#ffffff' },
  { id:'theme69', name:'Amber Frost', primary:'#153aed', accent:'#968230', bg:'#ffffff' },
  { id:'theme70', name:'Ivory Dust', primary:'#07cc8e', accent:'#06c17c', bg:'#ffffff' },
  { id:'theme71', name:'Ocean Flame', primary:'#94e643', accent:'#4a0911', bg:'#ffffff' },
  { id:'theme72', name:'Pearl Aura', primary:'#b4b169', accent:'#ab4cdc', bg:'#ffffff' },
  { id:'theme73', name:'Ivory Glow', primary:'#ff98fa', accent:'#b73ffc', bg:'#0f172a' },
  { id:'theme74', name:'Ocean Flame', primary:'#d408cd', accent:'#650962', bg:'#ffffff' },
  { id:'theme75', name:'Ruby Mist', primary:'#5c1068', accent:'#32c87d', bg:'#ffffff' },
  { id:'theme76', name:'Ruby Flame', primary:'#1dcf51', accent:'#ec57d4', bg:'#ffffff' },
  { id:'theme77', name:'Amethyst Modern', primary:'#c61d31', accent:'#cd8715', bg:'#ffffff' },
  { id:'theme78', name:'Coral Valley', primary:'#44e155', accent:'#1c0545', bg:'#ffffff' },
  { id:'theme79', name:'Rose Light', primary:'#2699dd', accent:'#d3c2cd', bg:'#ffffff' },
  { id:'theme80', name:'Forest Valley', primary:'#68638a', accent:'#309b52', bg:'#ffffff' },
  { id:'theme81', name:'Rose Modern', primary:'#a5df96', accent:'#483a40', bg:'#ffffff' },
  { id:'theme82', name:'Rose Ultra', primary:'#cf10bd', accent:'#4b6082', bg:'#ffffff' },
  { id:'theme83', name:'Gold Dust', primary:'#9f50fe', accent:'#89808d', bg:'#ffffff' },
  { id:'theme84', name:'Sunset Storm', primary:'#31b401', accent:'#eb837d', bg:'#ffffff' },
  { id:'theme85', name:'Ruby Standard', primary:'#80ca63', accent:'#6bf30e', bg:'#ffffff' },
  { id:'theme86', name:'Midnight Frost', primary:'#07ce27', accent:'#99b9c6', bg:'#ffffff' }
];

/* ---------- 8 Fonts ---------- */
const FONTS = [
  { id:'plusjakarta', name:'Plus Jakarta Sans (Premium UI)', css:'Plus+Jakarta+Sans:wght@300;400;500;600;700;800', family:'Plus Jakarta Sans' },
  { id:'manrope', name:'Manrope (Executive)', css:'Manrope:wght@300;400;500;600;700;800', family:'Manrope' },
  { id:'sora', name:'Sora (Modern)', css:'Sora:wght@300;400;500;600;700;800', family:'Sora' },
  { id:'inter', name:'Inter', css:'Inter:wght@300;400;500;600;700;800', family:'Inter' },
  { id:'roboto', name:'Roboto', css:'Roboto:wght@300;400;500;600;700', family:'Roboto' },
  { id:'opensans', name:'Open Sans', css:'Open+Sans:wght@300;400;500;600;700', family:'Open Sans' },
  { id:'lato', name:'Lato', css:'Lato:wght@300;400;500;600;700', family:'Lato' },
  { id:'montserrat', name:'Montserrat', css:'Montserrat:wght@300;400;500;600;700', family:'Montserrat' },
  { id:'oswald', name:'Oswald', css:'Oswald:wght@300;400;500;600;700', family:'Oswald' },
  { id:'sourcesanspro', name:'Source Sans Pro', css:'Source+Sans+Pro:wght@300;400;500;600;700', family:'Source Sans Pro' },
  { id:'slabo27px', name:'Slabo 27px', css:'Slabo+27px', family:'Slabo 27px' },
  { id:'raleway', name:'Raleway', css:'Raleway:wght@300;400;500;600;700', family:'Raleway' },
  { id:'ptsans', name:'PT Sans', css:'PT+Sans:wght@300;400;500;600;700', family:'PT Sans' },
  { id:'merriweather', name:'Merriweather', css:'Merriweather:wght@300;400;500;600;700', family:'Merriweather' },
  { id:'notosans', name:'Noto Sans', css:'Noto+Sans:wght@300;400;500;600;700', family:'Noto Sans' },
  { id:'nunito', name:'Nunito', css:'Nunito:wght@300;400;500;600;700', family:'Nunito' },
  { id:'concertone', name:'Concert One', css:'Concert+One', family:'Concert One' },
  { id:'prompt', name:'Prompt', css:'Prompt:wght@300;400;500;600;700', family:'Prompt' },
  { id:'worksans', name:'Work Sans', css:'Work+Sans:wght@300;400;500;600;700', family:'Work Sans' },
  { id:'firasans', name:'Fira Sans', css:'Fira+Sans:wght@300;400;500;600;700', family:'Fira Sans' },
  { id:'quicksand', name:'Quicksand', css:'Quicksand:wght@300;400;500;600;700', family:'Quicksand' },
  { id:'barlow', name:'Barlow', css:'Barlow:wght@300;400;500;600;700', family:'Barlow' },
  { id:'mulish', name:'Mulish', css:'Mulish:wght@300;400;500;600;700', family:'Mulish' },
  { id:'inconsolata', name:'Inconsolata', css:'Inconsolata:wght@300;400;500;600;700', family:'Inconsolata' },
  { id:'josefinsans', name:'Josefin Sans', css:'Josefin+Sans:wght@300;400;500;600;700', family:'Josefin Sans' },
  { id:'cabin', name:'Cabin', css:'Cabin:wght@300;400;500;600;700', family:'Cabin' },
  { id:'oxygen', name:'Oxygen', css:'Oxygen:wght@300;400;500;600;700', family:'Oxygen' },
  { id:'anton', name:'Anton', css:'Anton', family:'Anton' },
  { id:'titilliumweb', name:'Titillium Web', css:'Titillium+Web:wght@300;400;500;600;700', family:'Titillium Web' },
  { id:'asap', name:'Asap', css:'Asap:wght@300;400;500;600;700', family:'Asap' },
  { id:'karla', name:'Karla', css:'Karla:wght@300;400;500;600;700', family:'Karla' },
  { id:'bitter', name:'Bitter', css:'Bitter:wght@300;400;500;600;700', family:'Bitter' },
  { id:'arimo', name:'Arimo', css:'Arimo:wght@300;400;500;600;700', family:'Arimo' },
  { id:'dosis', name:'Dosis', css:'Dosis:wght@300;400;500;600;700', family:'Dosis' },
  { id:'hind', name:'Hind', css:'Hind:wght@300;400;500;600;700', family:'Hind' },
  { id:'varelaround', name:'Varela Round', css:'Varela+Round:wght@300;400;500;600;700', family:'Varela Round' },
  { id:'mavenpro', name:'Maven Pro', css:'Maven+Pro:wght@300;400;500;600;700', family:'Maven Pro' },
  { id:'teko', name:'Teko', css:'Teko:wght@300;400;500;600;700', family:'Teko' },
  { id:'exo2', name:'Exo 2', css:'Exo+2:wght@300;400;500;600;700', family:'Exo 2' },
  { id:'zillaslab', name:'Zilla Slab', css:'Zilla+Slab:wght@300;400;500;600;700', family:'Zilla Slab' },
  { id:'play', name:'Play', css:'Play:wght@300;400;500;600;700', family:'Play' },
  { id:'signika', name:'Signika', css:'Signika:wght@300;400;500;600;700', family:'Signika' },
  { id:'righteous', name:'Righteous', css:'Righteous', family:'Righteous' },
  { id:'overpass', name:'Overpass', css:'Overpass:wght@300;400;500;600;700', family:'Overpass' },
  { id:'fjallaone', name:'Fjalla One', css:'Fjalla+One', family:'Fjalla One' }
];

/* ---------- 3 Layouts ---------- */
const LAYOUTS = [
  { id:'layout0', name:'Sidebar', icon:'◧', desc:'Enterprise Sidebar layout style' },
  { id:'layout1', name:'Top Nav', icon:'▭', desc:'Enterprise Top Nav layout style' },
  { id:'layout2', name:'Card Hub', icon:'▦', desc:'Enterprise Card Hub layout style' },
  { id:'layout3', name:'Bottom Nav', icon:'◨', desc:'Enterprise Bottom Nav layout style' },
  { id:'layout4', name:'Dual Sidebar', icon:'◫', desc:'Enterprise Dual Sidebar layout style' },
  { id:'layout5', name:'Mega Menu', icon:'▤', desc:'Enterprise Mega Menu layout style' },
  { id:'layout6', name:'Minimalist', icon:'▥', desc:'Enterprise Minimalist layout style' },
  { id:'layout7', name:'Split View', icon:'▧', desc:'Enterprise Split View layout style' },
  { id:'layout8', name:'Tabbed', icon:'▨', desc:'Enterprise Tabbed layout style' },
  { id:'layout9', name:'Masonry', icon:'▩', desc:'Enterprise Masonry layout style' },
  { id:'layout10', name:'Dashboard Pro', icon:'☰', desc:'Enterprise Dashboard Pro layout style' },
  { id:'layout11', name:'Compact', icon:'☱', desc:'Enterprise Compact layout style' },
  { id:'layout12', name:'Expanded', icon:'☲', desc:'Enterprise Expanded layout style' },
  { id:'layout13', name:'Floating', icon:'☳', desc:'Enterprise Floating layout style' },
  { id:'layout14', name:'Dock', icon:'☴', desc:'Enterprise Dock layout style' },
  { id:'layout15', name:'Vertical Hub', icon:'☵', desc:'Enterprise Vertical Hub layout style' },
  { id:'layout16', name:'Grid Master', icon:'☶', desc:'Enterprise Grid Master layout style' }
];

/* ---------- 7 Presets ---------- */
const PRESETS = {
  'nurseryprimary': {
    name:'Nursery & Primary', emoji:'🏠',
    modules: ['academic_setup','students','staff','classes','subjects','attendance','cbt-prompts','entrance','results','certificates','flyer','cbt','report-cards','analytics','admin-data','academic_records','storage','approvals','timetable-generator','checkin','diary','surveys','menu','settings','fees','messages','parents','gallery','birthdays','idcards','directory','developer'],
    levels:['Pre-Nursery','Nursery 1','Nursery 2','Primary 1','Primary 2','Primary 3','Primary 4','Primary 5','Primary 6']
  },
  'secondary': {
    name:'Secondary / High School', emoji:'🏫',
    modules: ['academic_setup','students','staff','classes','subjects','attendance','cbt-prompts','entrance','results','certificates','flyer','report-cards','analytics','admin-data','academic_records','storage','approvals','timetable-generator','checkin','diary','surveys','menu','settings','fees','timetable','cbt','sow','messages','announcements','events','gallery','library','digital_library','assignments','parents','idcards','directory','departments','broadcast','complaints','leave','visitors','developer'],
    levels:['JSS 1','JSS 2','JSS 3','SSS 1','SSS 2','SSS 3']
  },
  'fullschool': {
    name:'Group of Schools (K–12)', emoji:'🏢',
    modules: ['academic_setup','students','staff','classes','subjects','attendance','cbt-prompts','entrance','results','flyer','report-cards','analytics','admin-data','academic_records','storage','approvals','timetable-generator','checkin','diary','surveys','menu','settings','fees','timetable','cbt','sow','messages','announcements','events','gallery','library','digital_library','assignments','parents','idcards','directory','departments','broadcast','complaints','leave','visitors','hostel','transport','alumni','certificates','admissions','promotion','finance','inventory','hr','payroll','staff_loans','staff_bonus','appraisals','rubrics','transcripts','transfer_cert','counselling','voting','health','conduct','eresources','birthdays','lms','gamification','cafeteria','financial_aid','front_desk','career_counseling','document_builder','fleet_tracking','facility_booking','compliance','developer'],
    levels:['Pre-Nursery','Nursery 1','Nursery 2','Primary 1','Primary 2','Primary 3','Primary 4','Primary 5','Primary 6','JSS 1','JSS 2','JSS 3','SSS 1','SSS 2','SSS 3']
  },
  'tutorial': {
    name:'Tutorial / Lesson Centre', emoji:'📝',
    modules: ['academic_setup','students','staff','attendance','results','idcards','certificates','flyer','cbt','report-cards','analytics','admin-data','academic_records','storage','approvals','timetable-generator','checkin','diary','surveys','menu','settings','fees','messages','gallery','eresources','directory','broadcast','voting','developer'],
    levels:['JAMB Prep','WAEC Prep','GCE Prep','SAT Prep','IELTS Prep','A-Level Prep']
  },
  'tertiary': {
    name:'College / Tertiary', emoji:'🎓',
    modules: ['academic_setup','students','staff','classes','subjects','attendance','cbt-prompts','entrance','results','idcards','certificates','flyer','report-cards','analytics','admin-data','academic_records','storage','approvals','timetable-generator','checkin','diary','surveys','menu','settings','fees','cbt','library','digital_library','eresources','announcements','events','gallery','directory','broadcast','hostel','voting','developer'],
    levels:['ND 1','ND 2','HND 1','HND 2','BSc 1','BSc 2','BSc 3','BSc 4']
  },
  'enterprise': {
    name:'Enterprise (every module)', emoji:'🌟',
    modules: ['academic_setup','students','staff','classes','subjects','attendance','cbt-prompts','entrance','results','flyer','report-cards','analytics','admin-data','academic_records','storage','approvals','timetable-generator','checkin','diary','surveys','menu','settings','fees','timetable','cbt','sow','messages','announcements','events','gallery','library','digital_library','assignments','parents','idcards','directory','departments','broadcast','complaints','leave','visitors','hostel','transport','alumni','certificates','admissions','promotion','finance','inventory','hr','payroll','staff_loans','staff_bonus','appraisals','rubrics','transcripts','transfer_cert','counselling','voting','health','conduct','eresources','birthdays','lms','gamification','cafeteria','financial_aid','front_desk','career_counseling','document_builder','fleet_tracking','facility_booking','compliance','developer'],
    levels:['Pre-Nursery','Nursery 1','Nursery 2','Primary 1','Primary 2','Primary 3','Primary 4','Primary 5','Primary 6','JSS 1','JSS 2','JSS 3','SSS 1','SSS 2','SSS 3']
  },
  'custom': { name:'Custom', emoji:'🛠️', modules: [], levels: [] }
};

/* ---------- Module Registry (71 modules) ---------- */
const MODULES = [
  // Core academic (13)
  { id:'academic_setup', name:'Academic Setup', group:'Core', desc:'Enter/manage departments, terms, sessions, arms and academic periods used across the platform.', free:true, new:true },
  { id:'students',     name:'Students & Profiles',     group:'Core',  desc:'Central student information system with guardian info and Drive-linked photos.', free:true },
  { id:'staff',        name:'Staff / Teachers',        group:'Core',  desc:'Full staff records: teaching/non-teaching, subject taught, qualification, religion, marital status, photo (Drive link) and auto staff number. Approved teacher sign-ups are auto-added here.', free:true },
  { id:'classes',      name:'Classes',                 group:'Core',  desc:'Create each class/arm and assign a class teacher by choosing from a staff dropdown — no typing. Set level and capacity.', free:true },
  { id:'subjects',     name:'Subjects',                group:'Core',  desc:'Register every subject once, give it a code/department/level, and map it to a teacher (chosen from staff). Used everywhere subjects are picked.', free:true, new:true },
  { id:'attendance',   name:'Attendance',              group:'Core',  desc:'Daily/class attendance. Pull a whole class PRESENT automatically from QR check-ins — no one-by-one typing. Parent alerts.', free:true, new:true },
  { id:'results',      name:'Results / Scores',        group:'Core',  desc:'Enter CA + exam scores per student/subject/term/session (all chosen from dropdowns). Grades auto-suggested. Feeds report cards & promotion.', free:true },
  { id:'timetable',    name:'Timetable',               group:'Core',  desc:'Class & exam timetables with auto-conflict detection.', free:true, new:true },
  { id:'sow',          name:'Scheme of Work',          group:'Core',  desc:'Termly planning + weekly progress tracking with proprietor dashboard.', free:true, new:true },
  { id:'cbt',          name:'CBT / Online Exams',      group:'Core',  desc:'Full embedded CBT engine: 17 question types, CSV upload, timer, randomisation, negative marking, anti-cheat, certificates, link/code access — results auto-flow into report cards.', free:true, popular:true },
  { id:'cbt-prompts',  name:'AI Question Prompts',     group:'Core',  desc:'Ready-made Simple/Intermediate/Advanced prompts you paste into any free AI chat to draft CBT questions in the exact CSV format — copy, edit, upload. The platform itself uses no paid AI.', free:true, new:true },
  { id:'entrance',     name:'Entrance & Assessments',  group:'Enterprise', desc:'Run entrance/common-entrance/placement exams that anonymous candidates can sit. Instant result slips, certificates and admission letters — single or bulk.', free:true, enterprise:true, new:true },
  { id:'storage',      name:'Storage Manager',         group:'Enterprise', desc:'See how much Supabase space each table uses and safely purge old, low-value rows (after exporting) to make room — keeps you on the free tier.', free:true, enterprise:true, new:true },
  { id:'report-cards', name:'Report Cards (flexible)',  group:'Core',  desc:'Define custom assessment columns per subject (CA1, CA2, Assignment, Project, Exam) with apportioned max marks. CBT/online results auto-map into the right column. Totals, grades & positions computed.', free:true, new:true },
  { id:'analytics',    name:'Analytics Dashboard',     group:'Enterprise', desc:'Live, platform-wide KPIs & charts across every module to support informed decisions.', free:true, enterprise:true, new:true },
  { id:'approvals',    name:'Approvals',               group:'Enterprise', desc:'Approve/reject prospective students, parents and staff (and admissions applications) right from the admin dashboard. Set roles, approve, suspend or delete.', free:true, enterprise:true, new:true },
  { id:'admin-data',   name:'Admin Data Console',      group:'Enterprise', desc:'Admin-only: read, delete, full backup (JSON) and restore of every table on the client site. All actions logged.', free:true, enterprise:true, new:true },
  { id:'timetable-generator', name:'Timetable Generator', group:'Core', desc:'Auto-builds a conflict-free timetable (no class/teacher double-booking) from each subject weekly period demand — deterministic, no AI.', free:true, new:true },
  { id:'checkin',      name:'QR Check-in',             group:'Core', desc:'Students self-check-in by scanning their ID-card QR (or typing admission no). No biometric hardware needed.', free:true, new:true },
  { id:'diary',        name:'Student Diary',           group:'Comm', desc:'Daily homework/classwork/behaviour log; parents view & acknowledge.', free:true, new:true },
  { id:'surveys',      name:'Surveys & Forms',         group:'Comm', desc:'Anonymous-optional feedback forms & surveys with response collection.', free:true, new:true },
  { id:'menu',         name:'Menu / Meal Planner',     group:'Media', desc:'Weekly meal planner with allergen notes for parents.', free:true, new:true },
  { id:'settings',     name:'Settings (2FA · Language · A11y)', group:'Enterprise', desc:'Free email-OTP 2FA, multi-language UI (incl. Hausa/Yoruba/Igbo), and accessibility (font scaling, high contrast).', free:true, enterprise:true, new:true },
  { id:'assignments',  name:'Assignments / Homework',  group:'Core',  desc:'Post & track assignments with submission and grading.', free:true, popular:true },
  { id:'library',      name:'Library',                 group:'Core',  desc:'Book catalogue, lending records, barcode scanning, due-date alerts.', free:true, new:true },
  { id:'digital_library', name:'Digital Library',      group:'Core',  desc:'Teachers assign online books/links + optional comprehension questions; auto-scored marks count toward grades.', free:true, new:true },
  { id:'conduct',      name:'Conduct / Behaviour',     group:'Core',  desc:'Merit/demerit, incidents, pattern tracking.', free:true, new:true },
  { id:'health',       name:'Health / Clinic',         group:'Core',  desc:'Sick-bay visits, medical history, allergy alerts.', free:true, new:true },
  { id:'promotion',    name:'Promotion / Graduation',  group:'Core',  desc:'Automated promotion: from each student\'s term average vs a benchmark you set, the system drafts promote/repeat/graduate decisions. Admin reviews/edits, then applies. Graduates move to Alumni.', free:true, new:true },
  // Financial & admin (5)
  { id:'fees',         name:'Fees & Payments',         group:'Finance',desc:'Fee structures, balances, print-ready receipts, payment tracking.', free:true },
  { id:'finance',      name:'School Finance',          group:'Finance',desc:'Income/expense ledger with charts and KPI analytics.', free:true, new:true },
  { id:'leave',        name:'Leave Management',        group:'Finance',desc:'Staff leave requests with approval workflows and calendar.', free:true, new:true },
  { id:'visitors',     name:'Visitor Management',      group:'Finance',desc:'Gate-pass, check-in/out, host notifications, badges.', free:true, new:true },
  { id:'transport',    name:'Transport / Bus',         group:'Finance',desc:'Routes, GPS tracking, pick-up records.', free:true, new:true },
  // Communication (7 incl voting & notifications)
  { id:'announcements',name:'Announcements',           group:'Comm',  desc:'School-wide notices with priority levels and pinning.', free:true },
  { id:'events',       name:'Events & Calendar',       group:'Comm',  desc:'Term calendar with RSVP, venue booking.', free:true, popular:true },
  { id:'messages',     name:'Messaging (WA/Email)',    group:'Comm',  desc:'Free bulk WhatsApp + email + SMS to parents/staff.', free:true },
  { id:'inbox',        name:'In-App Inbox',            group:'Comm',  desc:'Private staff↔admin↔parent threaded messaging.', free:true },
  { id:'complaints',   name:'Complaints & Grievance',  group:'Comm',  desc:'Submit→route→track→resolve with evidence and status.', free:true, new:true },
  { id:'broadcast',    name:'Results Broadcast',       group:'Comm',  desc:'One-click send results to parents via free channels.', free:true, popular:true },
  { id:'voting',       name:'Voting & Polls',          group:'Comm',  desc:'Class prefects, head boy/girl, staff polls, anonymous ballots.', free:true, new:true },
  // Media & utility (8)
  { id:'gallery',      name:'Photo & Video Gallery',   group:'Media', desc:'Albums, Google Drive image linking, YouTube embeds.', free:true },
  { id:'eresources',   name:'E-Resources / Notes',     group:'Media', desc:'Lesson notes, past questions, Drive-linked documents.', free:true, new:true },
  { id:'birthdays',    name:'Birthdays',               group:'Media', desc:'Celebrate with auto-reminders and wish lists.', free:true },
  { id:'idcards',      name:'Digital ID Cards',        group:'Media', desc:'Generate & print branded student/staff cards with a scannable QR code (encodes the ID for attendance). Pick a student or enter manually.', free:true, new:true },
  { id:'flyer',        name:'Marketing Flyer',         group:'Media', desc:'Generate a printable, branded promotional flyer/poster for admissions and parent outreach — free lead-gen.', free:true, new:true },
  { id:'reports',      name:'Reports & Export',        group:'Media', desc:'CSV / PDF / Excel exports + analytics dashboard.', free:true },
  { id:'directory',    name:'Directory',               group:'Media', desc:'Searchable people directory with role filters.', free:true },
  { id:'departments',  name:'Departments & Offices',   group:'Media', desc:'Per-department coordination, resource management.', free:true },
  { id:'parents',      name:'Parent–Child Mapping',    group:'Media', desc:'Link parents to children for results, fees, complaints.', free:true, new:true },
  // Enterprise (7)
  { id:'admissions',   name:'Admissions & Enrollment', group:'Enterprise', desc:'Public application form → review funnel → enrollment.', free:true, enterprise:true },
  { id:'hr',           name:'Salary & Payslips',       group:'Enterprise', desc:'Run staff salaries: basic, allowances, bonus, overtime, tax, pension & loan deductions with AUTO net-pay and printable professional payslips.', free:true, enterprise:true },
  { id:'payroll',      name:'Payroll Register',        group:'Enterprise', desc:'The full salary register — pick staff from a list, auto-compute net pay, approve/pay status, and print a payslip for every month.', free:true, enterprise:true, new:true },
  { id:'staff_loans',  name:'Staff Loans & Advances',  group:'Enterprise', desc:'Track staff loans/salary advances with monthly EMI repayment schedules, amount repaid and status (active/completed/defaulted).', free:true, enterprise:true, new:true },
  { id:'staff_bonus',  name:'Staff Bonuses',           group:'Enterprise', desc:'Record performance, 13th-month, holiday and long-service bonuses per staff with citations and pay status.', free:true, enterprise:true, new:true },
  { id:'appraisals',   name:'Staff Appraisals',        group:'Enterprise', desc:'Structured performance appraisals with weighted 1–10 criteria (punctuality, teaching quality, results, teamwork, conduct), AUTO score & band, and a recommendation.', free:true, enterprise:true, new:true },
  { id:'rubrics',      name:'Grading Rubrics',         group:'Academics', desc:'Standards-based rubrics (PowerSchool/Edsby parity): define skills/criteria and a scale so assessment aligns to learning objectives.', free:true, enterprise:true, new:true },
  { id:'transcripts',  name:'Academic Transcripts',    group:'Academics', desc:'Cumulative academic records / transcripts per student across sessions — international standard for transfers and applications.', free:true, enterprise:true, new:true },
  { id:'transfer_cert',name:'Transfer Certificates',   group:'Academics', desc:'Issue transfer/leaving certificates (National Records Exchange parity) with conduct and reason for leaving.', free:true, enterprise:true, new:true },
  { id:'counselling',  name:'Counselling & Wellbeing', group:'Academics', desc:'Confidential student counselling/wellbeing session log with status tracking and referrals.', free:true, enterprise:true, new:true },
  { id:'hostel',       name:'Hostel / Boarding',       group:'Enterprise', desc:'Block/room/bed tracking with active/vacated status.', free:true, enterprise:true },
  { id:'alumni',       name:'Alumni Network',          group:'Enterprise', desc:'Graduation-year directory, mentorship, fundraising.', free:true, enterprise:true },
  { id:'inventory',    name:'Inventory & Assets',      group:'Enterprise', desc:'Equipment/supplies register with location and condition.', free:true, enterprise:true },
  { id:'certificates', name:'Certificates & Documents',group:'Enterprise', desc:'Issue branded, printable certificates (achievement, graduation, testimonial) with a unique verification code.', free:true, enterprise:true },
  // Extra utility (4 more — total: 54)
  { id:'school_calendar', name:'School Calendar',     group:'Media', desc:'Academic calendar with holidays, mid-terms and term dates.', free:true, new:true },
  { id:'lost_found',      name:'Lost & Found',        group:'Media', desc:'Log lost & found items, claim with photo evidence.', free:true, new:true },
  { id:'parent_meeting',  name:'PTA Meeting Scheduler',group:'Comm', desc:'Schedule parent-teacher meetings, send reminders, log minutes.', free:true, new:true },
  { id:'book_request',    name:'Book Reservation',    group:'Media', desc:'Students reserve library books; auto-queue when returned.', free:true, new:true }
,
  // Advanced Enterprise 2024 Additions (10 more)
  { id:'lms',            name:'Integrated LMS',          group:'Core',  desc:'Unified learning platform for course tracking, video lessons, and online assignment submissions.', free:true, enterprise:true },
  { id:'gamification',   name:'Rewards & Badges (PBIS)', group:'Core',  desc:'Give students points for good behaviour/effort and award badges. A simple, transparent positive-reinforcement tracker — every point is logged and visible.', free:true, enterprise:true },
  { id:'cafeteria',      name:'Cafeteria & Meals',       group:'Finance',desc:'Student meal plans, dietary restrictions tracking, and pre-paid wallets.', free:true, enterprise:true },
  { id:'financial_aid',  name:'Scholarships & Aid',      group:'Finance',desc:'Manage fee waivers, sponsor tracking, and scholarship renewals.', free:true, enterprise:true },
  { id:'front_desk',     name:'Front Desk / Dispatch',   group:'Comm',  desc:'Track postal dispatch, calls, and walk-in admission inquiries.', free:true, enterprise:true },
  { id:'career_counseling',name:'Career & Placement',    group:'Core',  desc:'Track college applications, university offers, and career guidance.', free:true, enterprise:true },
  { id:'document_builder',name:'Custom Document Builder',group:'Enterprise', desc:'Drag-and-drop builder for hall tickets, bonafide letters, and custom IDs.', free:true, enterprise:true },
  { id:'fleet_tracking', name:'Advanced Fleet GPS',      group:'Enterprise', desc:'Bus route optimization, live tracking placeholder, driver logs.', free:true, enterprise:true },
  { id:'facility_booking',name:'Facility Booking',       group:'Enterprise', desc:'Schedule science labs, sports fields, and auditorium usage.', free:true, enterprise:true },
  { id:'compliance',     name:'Compliance & Audit',      group:'Enterprise', desc:'Track accreditation metrics, fire drills, and statutory inspections.', free:true, enterprise:true }
,
  // ✨ Gen v8 — competitor-parity & enterprise additions (free tools only)
  { id:'activity_log',   name:'Audit / Activity Log',    group:'Enterprise', desc:'Tamper-evident log of every create/update/delete/login — who did what, when (PowerSchool/Infinite Campus parity).', free:true, enterprise:true, new:true },
  { id:'academic_records', name:'Academic Records & Broadsheets', group:'Enterprise', desc:'Generate student record cards, class broadsheets and subject broadsheets for print/PDF.', free:true, enterprise:true, new:true },
  { id:'developer',      name:'About the Developer',     group:'Enterprise', desc:'The developer & HMG Concepts brand bio — the last page of the site.', free:true, new:true },
  { id:'lesson_plans',   name:'Lesson Plans & Curriculum', group:'Core',     desc:'Teachers author weekly lesson plans with objectives & resources; HODs approve (Chalk parity).', free:true, new:true },
  { id:'behaviour',      name:'Behaviour & PBIS Points', group:'Core',       desc:'Award merit points and badges for positive behaviour; live leaderboards (ClassDojo parity).', free:true, new:true },
  { id:'support_plans',  name:'Special Education / Support', group:'Core',    desc:'Track learning needs, interventions, goals and review dates per student (Provision Map parity).', free:true, enterprise:true, new:true },
  { id:'donations',      name:'Fundraising & Donations', group:'Finance',     desc:'Run campaigns, log donor pledges & gifts, generate thank-you receipts (Blackbaud/FreshSchools parity).', free:true, enterprise:true, new:true },
  { id:'substitutions',  name:'Substitute / Cover',      group:'Core',        desc:'Assign cover teachers when staff are absent; daily cover sheet & history.', free:true, new:true },
  { id:'helpdesk',       name:'IT / Help Desk',          group:'Comm',        desc:'Internal ticketing for IT, maintenance and admin requests with priority & status.', free:true, new:true },
  { id:'payments_online',name:'Online Fee Payments',     group:'Finance',     desc:'Generate Paystack/Flutterwave checkout links or bank-transfer instructions — free integrations, no monthly fee.', free:true, enterprise:true, new:true }
];

/* ---------- Department Templates ---------- */
const DEPT_TEMPLATES = {
  primary: ['Pre-Nursery','Nursery','Lower Primary','Upper Primary'],
  secondary: ['Junior Secondary','Senior Secondary','Science','Arts','Commercial','Technical','Vocational'],
  general: ['Administration','Academics','Bursary','Library','Clinic','Security','Maintenance','Transport']
};

/* ---------- Activity Templates ---------- */
const ACTIVITY_TEMPLATES = {
  primary: ['PTA Meetings','Inter-House Sports','Cultural Day','Quiz Competition','Spelling Bee'],
  secondary: ['JAMB Coaching','WAEC Prep','Debate Club','Coding Club','Press Club','Career Day'],
  general: ['Open Day','Graduation','Award Ceremony','Excursion','Fundraising']
};

/* ---------- Chatbot knowledge base ---------- */
const CHATBOT_KB = [
  { match: ['build','start','how','begin','wizard'], reply: 'Open the **Start Building** button to launch the 6-step wizard. Each step takes about a minute. You can save your progress and come back any time.' },
  { match: ['deploy','publish','host','github','live'], reply: 'Deployment is 100% free. After downloading your ZIP:\n1. Create a free **GitHub Pages** repo\n2. Upload all unzipped files\n3. Enable Pages in Settings\n4. Add your **Supabase** keys to `assets/js/config.js`\n5. Run `database/schema.sql` in Supabase SQL editor\n\nFull steps in the **DEPLOYMENT-GUIDE.md**.' },
  { match: ['supabase','database','db'], reply: 'We use **Supabase** (free tier: 50,000 rows/mo, includes auth + RLS + storage). Steps:\n1. supabase.com → New project\n2. SQL editor → paste `database/schema.sql` → Run\n3. Copy your URL + anon key into `assets/js/config.js`' },
  { match: ['cost','price','free','pay'], reply: 'The platform itself is **free forever**. Free tools used:\n• GitHub Pages (hosting)\n• Supabase (database + auth)\n• Google Drive (unlimited media)\n• Chart.js CDN (charts)\n• WhatsApp + mailto (messaging)\n\nOnly pay if you want us to deploy it for you.' },
  { match: ['voting','poll','elect','prefect'], reply: 'Yes — the **Voting & Polls** module is built in! Features:\n• Class prefect, head boy/girl elections\n• Anonymous ballots\n• Live results with auto-refresh\n• Vote from phone or desktop\n• Email + push notifications when a poll opens/closes' },
  { match: ['notification','push','alert'], reply: 'Multi-channel notifications are built in:\n• In-app bell with unread count\n• Browser push (after install)\n• Email (free SMTP via Supabase Auth)\n• WhatsApp via wa.me deep-link\n• SMS via the school\'s gateway\n\nFirst install the app — the **PWA install banner** appears on every page.' },
  { match: ['install','pwa','app'], reply: 'Yes — School Connect is a **Progressive Web App**. When you first visit, a small banner at the bottom invites you to install it on your phone or desktop. After install, you get offline access, push notifications and a full-screen experience.' },
  { match: ['feature','module','what'], reply: 'You get **65 modules** covering academics, finance, communication, media, and enterprise. The full list with explanations is in **FEATURES.md**. Pick the modules you want in Step 5 of the wizard.' },
  { match: ['bug','error','fix','issue'], reply: 'See **DIAGNOSIS.md** for the full bug report. Gen v8 fixes every bug found in v6 and v7, plus adds new enterprise features and SEO/lead-gen. No AI API is used anywhere.' },
  { match: ['ai','gpt','chatgpt','llm'], reply: 'No AI APIs are used — they are not cost-effective. All logic is deterministic, runs in the browser, and works fully offline. The "assistant" is a rules-based helper.' },
  { match: ['lead','seo','google','search'], reply: 'Each generated platform is **SEO-optimized** for lead generation:\n• Schema.org JSON-LD structured data\n• Open Graph + Twitter Card tags\n• `robots.txt` + `sitemap.xml`\n• Auto-generated `about.html` with HMG Concepts attribution\n• LinkedIn & Facebook preview images' },
  { match: ['hmg','ecosystem','brand'], reply: 'HMG Concepts (His Marvellous Grace) — **EdTech · DataTech · FaithTech**. The School Connect footer always links back to **hmgconcepts.pages.dev** for lead generation. The full ecosystem includes School, Church, Business Connect generators.' }
];

/* Export to window */
window.SC = {
  THEMES, FONTS, LAYOUTS, PRESETS, MODULES,
  DEPT_TEMPLATES, ACTIVITY_TEMPLATES, CHATBOT_KB,
  esc, jsStr, tplStr, slugify, attr, jsonSafe
};

console.log('%c[School Connect Gen v3] catalog loaded — 86 themes, 42 fonts, 7 presets, 65 modules (CBT engine + super features: chatbot, command palette, ID cards, certificates, flyer).', 'color:#4f46e5;font-weight:bold;font-size:13px');
