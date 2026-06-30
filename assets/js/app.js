/* ====================================================================
   app.js — School Connect Gen v9 (RBAC Fixed)
   ====================================================================
   KEY FIX in v9: Proper role hierarchy in roleSet() and applyRoleDashboard().
   
   Role hierarchy chain (users inherit permissions DOWN the chain):
     super_admin / admin / principal / proprietor / head_teacher / bursar
       ↓ inherits → staff + admin
     staff / teacher
       ↓ inherits → staff (for module access)
     parent
       ↓ inherits → parent (for family module access)
     student
       ↓ inherits → student
   
   Previously, roleSet('admin') only returned {'admin'}, so admin users
   failed the canAccessAllowList check for 'staff teacher parent student'
   allow-text, making all staff/teacher/parent/student modules inaccessible.
   
   Now, roleSet('admin') returns {'admin','staff','teacher'} so admin users
   pass EVERY module permission check.
   ==================================================================== */

const PUBLIC_PAGES = ['login','index','about','contact','apply','register','signup','cbt-exam','offline',''];

function currentPage() {
  return (location.pathname.split('/').pop() || 'index.html').replace('.html','');
}

/* SC.esc — global HTML escaper (also available as window.esc) */
if (typeof window.SC !== 'undefined' && !window.SC.esc) {
  window.SC.esc = function(s) {
    return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  };
}

const App = {

  // SAFETY: Ensure sb is always available as a global fallback
  sb: window.sb || null,

  init() {
    // Debug: log Supabase status
    console.log('[App.init] sb available:', !!sb, '| SUPABASE_URL:', window.SUPABASE_URL);
    // Sync window.sb if not set
    if (!window.sb && sb) window.sb = sb;

  init() {
    App.bindUI();
    App.applyStoredTheme();
    const page = currentPage();
    if (PUBLIC_PAGES.includes(page)) {
      App.initAuthTabs();
      try { if (window.PWAInstall) PWAInstall.init(); } catch(_) {}
      try { if (window.Notifications) {
        if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').then(reg => Notifications.init(sb, reg));
        else Notifications.init(sb);
      }} catch(_) {}
      try { if (window.Super) Super.init(sb, window.SCHOOL); } catch(_) {}
      try { if (window.Enterprise) Enterprise.init(sb); } catch(_) {}
      try { if (window.CRUD) CRUD.init(sb); } catch(_) {}
      return;
    }
    App.applyRoleVisibility();
  },

  applyStoredTheme() {
    const saved = localStorage.getItem('sc-theme');
    if (saved) document.body.dataset.theme = saved;
  },

  initAuthTabs() {
    if (document.getElementById('signin-form')) App.switchAuthTab('signin');
  },

  /* =================================================================
     CORE RBAC — Fixed role hierarchy in v9
     ================================================================= */
  applyRoleVisibility() {
    if (!sb) {
      // S-04: Show "Setup Required" banner when Supabase is not configured
      const setupBanner = document.getElementById('sc-setup-required');
      if (setupBanner) setupBanner.style.display = 'flex';
      const setupDetail = document.getElementById('sc-setup-detail');
      if (setupDetail) setupDetail.textContent = ' Edit assets/js/config.js with your Supabase URL and anon key.';

      // S-05: Show guest sign-in card on dashboard for unauthenticated users
      const page = currentPage();
      const effectiveRole = (page === 'dashboard') ? 'guest' : 'demo';
      App.applyRoleDashboard(effectiveRole, { full_name: effectiveRole === 'guest' ? 'Guest' : 'Demo User', role: effectiveRole });
      App.applyRoleNav(effectiveRole);
      App.loadPageData();
      return;
    }

    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) { location.href = 'login.html'; return; }
      sb.from('profiles').select('full_name,email,role,status').eq('id', user.id).maybeSingle().then(({ data, error }) => {
        if (error) console.warn('Profile lookup failed:', error.message || error);
        const role = (data && data.role) || user.user_metadata?.role || 'student';
        const status = (data && data.status) || 'active';
        const name = (data && data.full_name) || user.user_metadata?.full_name || user.email || 'User';

        if (status === 'pending') {
          document.body.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:40px"><div style="max-width:440px;text-align:center;background:white;padding:40px;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.1)"><h2 style="margin-bottom:12px">⏳ Account pending approval</h2><p style="color:var(--gray-600)">Your account is awaiting admin approval. You will receive an email once it is activated.</p></div></div>';
          return;
        }
        if (status === 'suspended') {
          document.body.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:40px"><div style="max-width:440px;text-align:center;background:white;padding:40px;border-radius:16px"><h2>🚫 Account suspended</h2><p>Please contact the school administrator.</p></div></div>';
          return;
        }

        // Store profile globally
        App.currentRole = role;
        App.currentUserName = name;
        App.currentProfile = data || {};
        window.SC_PROFILE = Object.assign({ id: user.id, email: user.email }, data || {}, { role, status, full_name: name });

        // Apply visibility for role-based UI tokens (data-admin-only, data-staff-only, etc.)
        App.applyVisibilityTokens(role);
        App.applyRoleDashboard(role, { full_name: name, email: user.email, role });
        App.applyRoleNav(role);
        App.loadPageData();
      }).catch((err) => {
        console.warn('Profile load failed:', err && err.message ? err.message : err);
        const fallbackRole = user.user_metadata?.role || 'student';
        const fallbackName = user.user_metadata?.full_name || user.email || 'User';
        App.currentRole = fallbackRole;
        App.currentUserName = fallbackName;
        window.SC_PROFILE = { id: user.id, email: user.email, role: fallbackRole, status: 'active', full_name: fallbackName };
        App.applyVisibilityTokens(fallbackRole);
        App.applyRoleDashboard(fallbackRole, { full_name: fallbackName, email: user.email, role: fallbackRole });
        App.applyRoleNav(fallbackRole);
        App.loadPageData();
      });
    });
  },

  /* ================================================================
     FIX: applyRoleDashboard — proper effective role resolution
     
     The dashboard uses data-dash-role="admin", "staff", "parent", "student"
     but database roles are 'admin', 'super_admin', 'principal', 'staff', etc.
     
     This function maps every database role variant to the effective role
     used by the dashboard sections.
     ================================================================ */
  applyRoleDashboard(role, profile) {
    const name = (profile && (profile.full_name || profile.email)) || 'User';
    const prettyRole = String(role || 'user').replace(/_/g,' ').replace(/\bw/g, c => c.toUpperCase());

    // FIX v9: Complete role hierarchy — every admin variant maps to 'admin'
    // This ensures admin users (including super_admin, principal, proprietor,
    // head_teacher, bursar) see the admin dashboard section.
    const roleMap = {
      // Admin variants → 'admin' (sees admin dashboard)
      super_admin: ['admin'],
      admin:      ['admin'],
      principal:  ['admin'],
      proprietor: ['admin'],
      head_teacher: ['admin'],
      bursar:     ['admin'],
      // Staff variants → 'staff' (sees staff dashboard)
      staff:      ['staff'],
      teacher:    ['staff'],
      // Individual roles → themselves
      parent:     ['parent'],
      student:    ['student'],
      // Demo/guest → themselves
      demo:       ['admin'],
      guest:      ['guest']
    };
    const effectiveRoles = new Set(roleMap[role] || [role]);

    // Update user name and role display in the topbar
    ['user-display-name','dash-user-name'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = name;
    });
    ['user-display-role','dash-user-role'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = prettyRole;
    });

    // Show the correct dashboard section based on effective role
    const groups = document.querySelectorAll('[data-dash-role]');
    if (groups.length) {
      groups.forEach(el => {
        const roles = (el.getAttribute('data-dash-role') || '').split(/\s+/).filter(Boolean);
        const show = roles.some(r => effectiveRoles.has(r));
        el.style.display = show ? '' : 'none';
      });
      // If nothing visible (no match), fall back to student section
      if (![...groups].some(el => el.style.display !== 'none')) {
        const fallback = role === 'guest'
          ? document.querySelector('[data-dash-role="guest"]')
          : document.querySelector('[data-dash-role="student"]');
        if (fallback) fallback.style.display = '';
      }
    }

    // Quick links in the welcome banner
    const q = document.getElementById('dash-quick-links');
    if (q) {
      const links = role === 'parent' ? [
        ['Child Dashboard','student-profile.html'],['Fees','fees.html'],['Results','results.html'],
        ['Report Cards','report-cards.html'],['Attendance','attendance.html'],
        ['Assignments','assignments.html'],['Diary','diary.html'],['Timetable','timetable.html'],
        ['Messages','messages.html'],['Announcements','announcements.html'],
        ['Complaints','complaints.html'],['Apply / Admissions','apply.html']
      ] : role === 'student' ? [
        ['Take CBT','cbt-exam.html'],['Assignments','assignments.html'],['Timetable','timetable.html'],
        ['Digital Library','digital_library.html'],['E-Resources','eresources.html'],
        ['My Results','results.html'],['Report Cards','report-cards.html'],
        ['My Profile','student-profile.html'],['Announcements','announcements.html'],
        ['Inbox','inbox.html'],['Certificates','certificates.html']
      ] : (['staff','teacher'].includes(role)) ? [
        ['Attendance','attendance.html'],['Results','results.html'],['CBT Manager','cbt.html'],
        ['Report Cards','report-cards.html'],['Broadsheets','academic_records.html'],
        ['Lesson Plans','lesson_plans.html'],['Scheme of Work','sow.html'],
        ['Timetable','timetable.html'],['Digital Library','digital_library.html'],
        ['Announcements','announcements.html'],['Inbox','inbox.html']
      ] : [
        // Admin: full quick links
        ['Students','students.html'],['Staff','staff.html'],['Parents','parents.html'],
        ['Classes','classes.html'],['Fees','fees.html'],['Results','results.html'],
        ['Attendance','attendance.html'],['Announcements','announcements.html'],
        ['Analytics','analytics.html'],['Admin Data','admin-data.html']
      ];
      q.innerHTML = links.map(x =>
        '<a class="btn btn-outline btn-sm" href="'+x[1]+'">'+x[0]+'</a>'
      ).join('');
    }
  },

  /* ================================================================
     isAdminRole — checks if a database role is an admin variant
     Used throughout to gate admin-only functionality
     ================================================================ */
  isAdminRole(role) {
    return ['super_admin','admin','principal','proprietor','head_teacher','bursar'].includes(
      String(role || '').toLowerCase()
    );
  },

  /* ================================================================
     FIX v9: roleSet — proper role hierarchy chain
     
     Users inherit permissions DOWN the hierarchy:
       admin variants → {admin, staff, teacher}   ← can access EVERYTHING
       staff/teacher  → {staff, teacher}         ← can access staff + own
       parent         → {parent}                 ← family modules only
       student        → {student}                ← student modules only
       guest          → {guest}                  ← sign-in page only
     
     Previously roleSet('admin') only returned {'admin'}, so admin users
     failed checks for 'staff teacher parent student' allow-text.
     Now roleSet('admin') returns {'admin','staff','teacher'} so admin
     passes EVERY module permission check.
     ================================================================ */
  roleSet(role) {
    const r = String(role || '').toLowerCase();
    const set = new Set([r]);
    // Teacher inherits staff permissions
    if (r === 'teacher') set.add('staff');
    // Staff inherits teacher (bi-directional for flexibility)
    if (r === 'staff') set.add('teacher');
    // Admin variants (super_admin, admin, principal, proprietor, head_teacher, bursar)
    // inherit both admin AND staff AND teacher — can access everything
    if (App.isAdminRole(r)) {
      ['admin','staff','teacher','parent','student'].forEach(x => set.add(x));
    }
    return set;
  },

  /* ================================================================
     FIX v9: canAccessAllowList — uses role hierarchy for access checks
     
     Now properly checks: does the user's roleSet intersect with the
     module's allowed roles? With the role hierarchy fix, admin users
     have 'admin' + 'staff' + 'teacher' in their roleSet, so they pass
     every permission check (students, staff, classes, results, etc.).
     ================================================================ */
  canAccessAllowList(allowText, role) {
    const allow = String(allowText || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (!allow.length) return App.isAdminRole(role);
    // 'any' / 'all' / 'public' → accessible to everyone
    if (allow.some(x => ['any','all','public'].includes(x))) return true;
    // Use the full role hierarchy (admin includes staff, etc.)
    const roles = App.roleSet(role);
    return allow.some(a => roles.has(a));
  },

  /* ================================================================
     FIX v9: applyRoleNav — admin sees ALL nav items, never hides them
     
     Admin users should see all modules in the nav. Non-admin users
     only see modules their role is allowed to access.
     Modules they can't access are shown with a 🔒 lock icon.
     ================================================================ */
  applyRoleNav(role) {
    document.body.dataset.roleReady = '1';
    document.body.dataset.currentRole = String(role || '').toLowerCase();
    const links = [...document.querySelectorAll('[data-role-allow]')];
    const isAdmin = App.isAdminRole(role);

    links.forEach(el => {
      const ok = App.canAccessAllowList(el.getAttribute('data-role-allow'), role);
      if (isAdmin) {
        // Admin sees every item. Show lock icon on items they can view
        // but shouldn't write to (parent/student modules).
        el.style.display = '';
        el.classList.toggle('nav-locked', !ok);
      } else {
        // Non-admin: show only if allowed, no lock icon
        el.style.display = ok ? '' : 'none';
        el.classList.remove('nav-locked');
      }
      // Accessibility attributes
      if (!ok) {
        el.setAttribute('aria-disabled', 'true');
        el.setAttribute('title', 'Locked for your role (' + role + ')');
      } else {
        el.removeAttribute('aria-disabled');
        el.removeAttribute('title');
      }
    });

    App.applyVisibilityTokens(role);
    App.ensureNavNotBlank(role);
    App.enforceCurrentPageAccess(role);
  },

  /* ================================================================
     applyVisibilityTokens — show/hide role-gated UI elements
     
     Elements with data-admin-only, data-staff-only, data-parent-only,
     data-student-only, data-family-only are shown/hidden based on role.
     
     FIX v9: Admin variants (super_admin, principal, etc.) correctly get
     admin-level access for data-admin-only elements.
     ================================================================ */
  applyVisibilityTokens(role) {
    const allow = (selector, yes) =>
      document.querySelectorAll(selector).forEach(el => el.style.display = yes ? '' : 'none');

    const r = String(role || '').toLowerCase();
    const isAdmin = App.isAdminRole(r);
    const isStaff = ['staff','teacher'].includes(r);
    const isParent = r === 'parent';
    const isStudent = r === 'student';

    allow('[data-admin-only]', isAdmin);
    // FIX v9: Admin variants also get staff-level access for [data-staff-only]
    allow('[data-staff-only]', isAdmin || isStaff);
    allow('[data-parent-only]', isParent);
    allow('[data-student-only]', isStudent);
    allow('[data-family-only]', isParent || isStudent);
    allow('[data-nonadmin-only]', !isAdmin);
    // FIX: Sign out button visible to all logged-in users (not guests)
    const signoutBtns = document.querySelectorAll('[data-signout]');
    signoutBtns.forEach(el => {
      // Show for all authenticated roles, hide for guest/demo
      el.style.display = (r === 'guest' || r === 'demo') ? 'none' : '';
    });

    // Read-only enforcement: elements with data-readonly-role are disabled
    document.querySelectorAll('[data-readonly-role]').forEach(el => {
      const list = String(el.getAttribute('data-readonly-role') || '').split(/\s+/).filter(Boolean);
      const yes = list.includes(r) || (isStaff && list.includes('staff')) || (isAdmin && list.includes('admin'));
      el.disabled = !!yes;
      el.setAttribute('aria-disabled', yes ? 'true' : 'false');
      if (yes) el.title = 'Read-only for your role';
      else el.removeAttribute('title');
    });
  },

  ensureNavNotBlank(role) {
    const nav = document.querySelector('.app-nav');
    if (!nav) return;
    const links = [...nav.querySelectorAll('a')].filter(a => a.style.display !== 'none');
    if (links.length) return;
    // If nav is empty (no items visible), show safe public pages
    const safe = new Set(['dashboard.html','notifications.html','feature-guide.html','about.html','contact.html']);
    [...nav.querySelectorAll('a')].forEach(a => {
      if (safe.has((a.getAttribute('href') || '').toLowerCase())) {
        a.style.display = '';
        a.classList.remove('nav-locked');
      }
    });
  },

  /* ================================================================
     FIX v9: enforceCurrentPageAccess — prevent access to restricted pages
     
     If the current page's data-require-role doesn't allow the user's
     roleSet, show a "Restricted Page" message. With the role hierarchy
     fix, admin users will pass most checks since their roleSet includes
     'admin', 'staff', 'teacher', 'parent', 'student'.
     ================================================================ */
  enforceCurrentPageAccess(role) {
    const shell = document.querySelector('.app-layout[data-require-role]');
    if (!shell) return;
    const required = shell.getAttribute('data-require-role');
    const active = document.querySelector('.app-nav a.active');

    // Blocked if the active nav link is hidden (no access) or if the page
    // requires a role the user doesn't have
    const blockedByNav = active && active.style.display === 'none';
    const blockedByRole = required && !App.canAccessAllowList(required, role);

    if (!blockedByNav && !blockedByRole && !(active && active.classList.contains('nav-locked'))) return;

    const pageTitle = (active && active.textContent.trim()) || document.title || 'this page';
    const content = document.querySelector('.app-content');
    if (content) {
      content.innerHTML = '<div class="card" style="max-width:760px;margin:30px auto;text-align:center;border-color:#fecaca;background:#fff7f7;padding:40px;border-radius:18px">' +
        '<div style="font-size:3rem;margin-bottom:16px">🔒</div>' +
        '<h2 style="margin-bottom:12px">Restricted Page</h2>' +
        '<p style="color:var(--gray-700);margin-bottom:16px">Your role (<strong>'+esc(role)+'</strong>) does not have permission to access <strong>'+esc(pageTitle)+'</strong>.</p>' +
        '<p style="color:var(--gray-600);margin-bottom:20px">This protects student data, finance records, staff records and admin controls.</p>' +
        '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">' +
        '<a class="btn btn-primary" href="dashboard.html">Return to Dashboard</a>' +
        '<a class="btn btn-outline" href="feature-guide.html">Read Feature Guide</a>' +
        '<a class="btn btn-outline" href="login.html">Sign In</a></div>' +
        '<p style="margin-top:16px;font-size:.82rem;color:var(--gray-400)">If you believe you need access, ask an Admin/Super Admin to update your account role.</p></div>';
    }
  },

  /* ----- Auth ----- */
  async handleSignIn(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = (fd.get('email') || '').trim();
    const password = fd.get('password') || '';
    if (!sb) { toast('Database not configured. Edit assets/js/config.js with your Supabase URL and anon key.', 'warning', 7000); return; }
    const btn = e.target.querySelector('button[type=submit]');
    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Signing in…'; }
    // Use global sb (from config.js), fallback to App.sb
    const supabase = sb || App.sb || window.sb;
    if (!supabase) { toast('Database not configured. Check assets/js/config.js', 'danger', 7000); if(btn){btn.disabled=false;btn.textContent=btn.dataset.label||'Sign in';} return; }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('[App.handleSignIn] Login error:', error);
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || 'Sign in'; }
      toast(error.message || 'Sign-in failed. Check your email and password.', 'danger', 6000);
      return;
    }
    console.log('[App.handleSignIn] Success! User:', data.user?.email);
    App.logActivity('login', 'auth', email);
    location.href = 'dashboard.html';
  },

  async handleSignUp(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (!sb) { toast('Database not configured. Edit assets/js/config.js with your Supabase keys.', 'warning', 7000); return; }
    const btn = e.target.querySelector('button[type=submit]');
    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Submitting…'; }
    const { data, error } = await sb.auth.signUp({
      email: (fd.get('email') || '').trim(),
      password: fd.get('password') || '',
      options: { data: { full_name: fd.get('full_name'), phone: fd.get('phone'), role: fd.get('role') } }
    });
    if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || 'Request access'; }
    if (error) { toast(error.message || 'Could not create the request.', 'danger', 6000); return; }
    toast('✅ Request sent. Check your email to confirm, then wait for admin approval.', 'success', 7000);
    if (e.target.reset) e.target.reset();
    App.switchAuthTab('signin');
  },

  switchAuthTab(tab) {
    const s = document.getElementById('signin-form');
    const u = document.getElementById('signup-form');
    const ts = document.getElementById('tab-signin');
    const tu = document.getElementById('tab-signup');
    if (!s || !u) return;
    if (tab === 'signup') {
      s.style.display = 'none'; u.style.display = 'block';
      if (tu) tu.className = 'btn btn-primary'; if (ts) ts.className = 'btn btn-outline';
    } else {
      s.style.display = 'block'; u.style.display = 'none';
      if (ts) ts.className = 'btn btn-primary'; if (tu) tu.className = 'btn btn-outline';
    }
  },

  logActivity(action, entity, entityId, details) {
    if (!sb) return;
    try {
      sb.auth.getUser().then(({ data }) => {
        const u = data && data.user;
        sb.from('activity_log').insert({
          actor_id: u ? u.id : null,
          actor_email: u ? u.email : entityId,
          action, entity, entity_id: String(entityId || ''),
          details: details || null
        }).then(() => {}, () => {});
      });
    } catch (_) {}
  },

  bindUI() {
    document.addEventListener('click', e => {
      const a = e.target.closest('[data-app-action]');
      if (a) {
        const fn = a.dataset.appAction;
        if (App[fn]) App[fn](a);
      }
    });
  },

  toggleDarkMode() {
    const cur = document.body.dataset.theme || 'light';
    document.body.dataset.theme = cur === 'dark' ? 'light' : 'dark';
    localStorage.setItem('sc-theme', document.body.dataset.theme);
  },

  signOut() {
    if (!sb) { location.href = 'login.html'; return; }
    sb.auth.signOut().then(() => location.href = 'login.html');
  },

  toggleSidebar() {
    const el = document.getElementById('app-sidebar');
    if (el) el.classList.toggle('open');
  },

  switchCampus(name) {
    localStorage.setItem('sc-campus', name);
    location.reload();
  },

  /* Page-aware data loaders */
  async loadPageData() {
    const path = location.pathname.split('/').pop().replace('.html','') || 'dashboard';
    if (path === 'dashboard' && App.loadDashboard) App.loadDashboard();
    if (path === 'voting' && typeof VotingUI !== 'undefined') VotingUI.renderPollList();
    if (path === 'notifications' && typeof Notifications !== 'undefined') Notifications.loadDropdownItems();
    if (typeof CRUD !== 'undefined' && CRUD.def && CRUD.def(path)) { try { CRUD.renderList(path); } catch (e) {} }
    if (App['load_' + path]) App['load_' + path]();
  },

  async loadDashboard() {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const safeCount = async (table) => {
      if (!sb) return 0;
      try {
        const r = await sb.from(table).select('id', { count: 'exact', head: true });
        return r && !r.error ? (r.count || 0) : 0;
      } catch (_) { return 0; }
    };
    const safeRows = async (table, select='*', limit=5) => {
      if (!sb) return [];
      try {
        const r = await sb.from(table).select(select).order('created_at',{ascending:false}).limit(limit);
        return r && !r.error ? (r.data || []) : [];
      } catch (_) { return []; }
    };
    try {
      const [studentCount, staffCount, feeRows, announcements, openPolls,
             attendanceCount, cbtCount, resultCount, parentCount, complaintCount,
             applicationCount, messageCount, assignmentCount, behaviourCount,
             supportCount, libraryCount, payrollCount, inventoryCount] = await Promise.all([
        safeCount('students'), safeCount('staff'),
        safeRows('fee_payments', 'amount_paid', 500),
        safeRows('announcements', '*', 5),
        safeRows('polls', '*', 3),
        safeCount('attendance'), safeCount('cbt_exams'), safeCount('results'),
        safeCount('parent_student'), safeCount('complaints'),
        safeCount('admission_applications'), safeCount('messages'),
        safeCount('assignments'), safeCount('behaviour'),
        safeCount('support_plans'), safeCount('library'),
        safeCount('payroll'), safeCount('inventory')
      ]);
      const feesPaid = (feeRows || []).reduce((a,b) => a + (Number(b.amount_paid) || 0), 0);
      set('stat-students', studentCount);
      set('stat-staff', staffCount);
      set('stat-fees', feesPaid.toLocaleString());
      set('stat-announcements', announcements.length);
      set('ov-staff-count', staffCount);
      set('ov-attendance', attendanceCount);
      set('ov-cbt-open', cbtCount);
      set('ov-results', resultCount);
      set('ov-parent-fees', feeRows.length);
      set('ov-payroll', payrollCount);
      set('ov-inventory', inventoryCount);
      set('ov-parents', parentCount);
      set('ov-complaints', complaintCount);
      set('ov-applications', applicationCount);
      set('ov-messages', messageCount);
      set('ov-assignments', assignmentCount);
      set('ov-behaviour', behaviourCount);
      set('ov-support', supportCount);
      set('ov-library', libraryCount);
      const annEl = document.getElementById('dash-announcements');
      if (annEl) annEl.innerHTML = announcements.length
        ? announcements.map(a => '<div style="padding:10px 0;border-bottom:1px solid var(--gray-200)"><strong>'+esc(a.title)+'</strong><div style="font-size:0.82rem;color:var(--gray-500)">'+(a.created_at ? new Date(a.created_at).toLocaleString() : '')+'</div></div>').join('')
        : '<p style="color:var(--gray-500)">No announcements yet.</p>';
      const pollEl = document.getElementById('dash-polls');
      if (pollEl) pollEl.innerHTML = openPolls.length
        ? openPolls.map(p => '<div style="padding:10px 0;border-bottom:1px solid var(--gray-200)"><a href="voting.html?poll='+p.id+'"><strong>'+esc(p.title)+'</strong></a><span class="badge badge-success" style="margin-left:8px">open</span></div>').join('')
        : '<p style="color:var(--gray-500)">No active polls.</p>';
      const ctx = document.getElementById('dash-chart');
      if (ctx && window.Chart) {
        new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Students', 'Staff', 'Classes'],
            datasets: [{ data: [studentCount, staffCount, 0], backgroundColor: ['#4f46e5','#06b6d4','#d4af37'] }]
          },
          options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
      }
    } catch (e) { console.warn('Dashboard load failed:', e.message); }
  },

  openAddModal(type) {
    if (typeof CRUD !== 'undefined' && CRUD.def && CRUD.def(type)) { CRUD.openForm(type); return; }
    if (typeof openModal === 'function') openModal('Add ' + type, '<p>This module is view-only or has a dedicated page.</p>');
  }
};

/* ----- Modal helpers ----- */
function openModal(title, body, footer) {
  const b = document.getElementById('modal-backdrop');
  if (!b) return;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal-footer').innerHTML = footer || '<button class="btn btn-outline" onclick="closeModal()">Close</button>';
  b.classList.add('show');
}
function closeModal() {
  const b = document.getElementById('modal-backdrop');
  if (b) b.classList.remove('show');
}
function toast(msg, type='info', ms=3500) {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast toast-' + (type || 'info');
  t.innerHTML = '<div class="toast-msg">' + esc(msg) + '</div>';
  c.appendChild(t);
  setTimeout(() => { t.style.animation = 'slideOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }, ms);
}
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* Backwards-compatible global aliases */
function handleSignIn(e){ return App.handleSignIn(e); }
function handleSignUp(e){ return App.handleSignUp(e); }

/* Boot */
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', App.init);
else App.init();

console.log('%c[School Connect Gen v9] app.js loaded — RBAC role hierarchy fixed (admin→staff→teacher).', 'color:#10b981;font-weight:bold');