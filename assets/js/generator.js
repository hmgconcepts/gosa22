/* ====================================================================
   generator.js — School Connect Gen v8
   ZIP generator: builds a complete school portal from the wizard config.
   Loops through all selected modules, invokes the full templates.js page
   generation pipeline, and bundles every required asset into the ZIP.

   FIX G-01 (was: minimal stub that only injected 3 JS files):
   Now properly calls T.shell(), T.loginPage(), T.modulePage() for every
   page and includes ALL required JS/CSS/PWA/SQL assets.
   FIX G-04: Now includes voting.js, site-help.js, notifications.js,
              super.js, enterprise.js, pwa-install.js in generated output.
   ==================================================================== */

const Generator = {
  // Cache for loaded file contents
  _cache: {},

  /** Load a file from the local filesystem (builder runs from the same origin). */
  async loadFile(path) {
    if (Generator._cache[path]) return Generator._cache[path];
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
      const text = await res.text();
      Generator._cache[path] = text;
      return text;
    } catch (e) {
      console.warn('[Generator] Failed to load:', path, e.message);
      return '';
    }
  },

  /** Load and execute a JS file, returning its window-exported value. */
  async loadJS(path, globalKey) {
    const src = await Generator.loadFile(path);
    if (!src) return null;
    try {
      const fn = new Function('window', src + '\nreturn window["' + globalKey + '"];');
      return fn({});
    } catch (e) {
      console.warn('[Generator] JS exec failed for', path, e.message);
      return null;
    }
  },

  /** Inject SC globals (THEMES + MODULES) so templates.js can run server-side. */
  injectSCGlobals() {
    // Expose SC so T.esc() and T.labelFor() etc. work inside templates.js
    const scripts = document.querySelectorAll('script[src]');
    let templatesSrc = '';
    scripts.forEach(s => {
      if (s.src.includes('templates.js')) {
        // templates.js is already loaded; just ensure SC globals are set
      }
    });
    // Make SC available globally (builder has it from builder.html)
    if (!window.SC) window.SC = {};
    if (!window.SC.THEMES) window.SC.THEMES = [];
    if (!window.SC.MODULES) window.SC.MODULES = [];
  },

  /** Build the complete school portal ZIP from a wizard config.
   *  @param {Object} config - Wizard output config
   *  @returns {Promise<Blob>} - ZIP file blob */
  async build(config) {
    // Load JSZip lazily
    if (!window.JSZip) {
      await Generator.loadScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
    }
    const zip = new JSZip();

    // ---- 1. Resolve theme from config ----
    const themeId = config.themeId || 'theme15';
    // SC.THEMES is available in the builder (set by builder.html before loading generator.js)
    const THEMES = (window.SC && window.SC.THEMES) || [];
    const theme = THEMES.find(t => t.id === themeId) || THEMES[0] || {
      id: 'default', name: 'Navy & Gold', primary: '#0f172a',
      accent: '#d4af37', icon: '🏫', colors: { primary: '#0f172a', accent: '#d4af37' }
    };

    // Build the resolved config object passed to every template
    const resolvedConfig = {
      schoolName:    config.schoolName   || 'My School',
      shortName:     config.shortName    || config.schoolName || 'School',
      schoolMotto:   config.schoolMotto  || 'Excellence in Education',
      themeId:       themeId,
      themePrimary:  config.themePrimary || theme.primary  || theme.colors?.primary || '#0f172a',
      themeAccent:   config.themeAccent  || theme.accent   || theme.colors?.accent  || '#d4af37',
      layout:        config.layout       || 'layout0',
      font:          config.font         || { id: 'inter', family: 'Inter', css: 'Inter' },
      fontId:        config.fontId       || 'inter',
      logoExt:       config.logoExt      || 'svg',
      campuses:      config.campuses     || [],
      hmgLink:       config.hmgLink      || 'https://hmgconcepts.pages.dev/',
      modules:       Array.isArray(config.modules) ? config.modules : []
    };

    // ---- 2. Ensure T (templates.js) is available ----
    let T = window.T;
    if (!T) {
      // templates.js may not be loaded in the build context; load it
      const tplSrc = await Generator.loadFile('assets/js/templates.js');
      if (tplSrc) {
        const exec = new Function('window', 'document', 'location', tplSrc + '\nreturn window.T;');
        // Create a minimal DOM environment for templates.js
        Generator.mockDOM();
        T = exec(window);
      }
    }
    if (!T) {
      throw new Error('[Generator] templates.js failed to load. Cannot generate pages.');
    }

    // ---- 3. Fetch all required JS files ----
    const jsFiles = [
      'assets/js/app.js',
      'assets/js/crud.js',
      'assets/js/cbt-engine.js',
      'assets/js/notifications.js',
      'assets/js/voting.js',
      'assets/js/site-help.js',
      'assets/js/super.js',
      'assets/js/enterprise.js',
      'assets/js/pwa-install.js',
      'assets/js/analytics.js'
    ];

    const jsContents = {};
    for (const f of jsFiles) {
      jsContents[f] = await Generator.loadFile(f);
    }

    // ---- 4. Fetch CSS ----
    const CSS = await Generator.loadFile('assets/css/style.css');

    // ---- 5. Fetch SQL files ----
    const sqlFiles = [
      'database/schema.sql',
      'database/voting-schema.sql',
      'database/cbt-schema.sql',
      'database/reportcard-schema.sql',
      'database/enterprise-schema.sql',
      'database/enhancements-schema.sql'
    ];
    const sqlContents = {};
    for (const f of sqlFiles) {
      sqlContents[f] = await Generator.loadFile(f);
    }

    // ---- 6. Generate all JS files ----
    for (const [f, content] of Object.entries(jsContents)) {
      if (content) zip.file(f, content);
    }
    if (CSS) zip.file('assets/css/style.css', CSS);

    // ---- 7. Generate config.js ----
    const configJS = Generator.generateConfigJS(resolvedConfig, config);
    zip.file('assets/js/config.js', configJS);

    // ---- 8. Generate index.html (landing page) ----
    const indexPage = T.head(resolvedConfig, 'Home') + Generator.indexContent(resolvedConfig) +
      Generator.standardScripts() + Generator.standardBoot() + '</body></html>';
    zip.file('index.html', indexPage);

    // ---- 9. Generate login.html ----
    const loginPage = T.loginPage(resolvedConfig);
    zip.file('login.html', loginPage);

    // ---- 10. Generate dashboard.html ----
    const dashPage = T.dashboard(resolvedConfig);
    zip.file('dashboard.html', dashPage);

    // ---- 11. Generate dedicated pages (always included regardless of selection) ----
    const dedicatedPages = [
      { id: 'student-profile',    name: 'Student Profile',    fn: () => {
        // FIX v9: Use the dedicated studentProfile() function with role-aware content
        // instead of the generic modulePage, so admin/parent/student each see the right view
        if (window.T && window.T.studentProfile) return window.T.studentProfile(resolvedConfig);
        return T.shell(resolvedConfig, 'Student Profile', '<p>Loading…</p>');
      } },
      { id: 'cbt-exam',           name: 'Take Exam',           fn: () => T.modulePage(resolvedConfig, 'cbt-exam', { requireRole: 'all' }) },
      { id: 'verify-certificate', name: 'Verify Certificate',  fn: () => T.modulePage(resolvedConfig, 'verify-certificate', { requireRole: 'all' }) },
      { id: 'teacher-overview',   name: 'Teacher Overview',   fn: () => T.modulePage(resolvedConfig, 'teacher-overview') },
      { id: 'feature-guide',      name: 'Feature Guide',      fn: () => T.modulePage(resolvedConfig, 'feature-guide', { requireRole: 'all' }) },
      { id: 'about',              name: 'About',               fn: () => T.modulePage(resolvedConfig, 'about', { noShell: true }) },
      { id: 'contact',            name: 'Contact',             fn: () => T.modulePage(resolvedConfig, 'contact', { noShell: true }) },
      { id: 'apply',              name: 'Apply',               fn: () => T.modulePage(resolvedConfig, 'apply', { noShell: true }) },
      { id: 'notifications',      name: 'Notifications',       fn: () => T.modulePage(resolvedConfig, 'notifications', { requireRole: 'all' }) },
      { id: 'developer',          name: 'Developer',           fn: () => T.modulePage(resolvedConfig, 'developer', { requireRole: 'all' }) },
      { id: 'voting',             name: 'Voting & Polls',      fn: () => T.voting(resolvedConfig) },
      { id: 'timetable-generator',name: 'Auto-Timetable',      fn: () => T.modulePage(resolvedConfig, 'timetable-generator') },
    ];

    for (const p of dedicatedPages) {
      try {
        const html = p.fn();
        zip.file(p.id + '.html', html);
      } catch (e) {
        console.warn('[Generator] Failed to generate', p.id, e.message);
        // Fallback minimal page
        zip.file(p.id + '.html', Generator.fallbackPage(p.name));
      }
    }

    // ---- 12. Generate selected module pages ----
    const selectedModules = Array.isArray(config.modules) ? config.modules : [];
    // Deduplicate: some modules may appear twice (e.g. academic_records and academic-records)
    const seenModules = new Set();

    for (const modId of selectedModules) {
      // Normalize: prefer underscore version
      const normalized = modId.replace(/-/g, '_');
      if (seenModules.has(normalized)) continue;
      seenModules.add(normalized);

      try {
        const html = T.modulePage(resolvedConfig, normalized);
        zip.file(normalized + '.html', html);
      } catch (e) {
        console.warn('[Generator] Failed to generate module page:', modId, e.message);
      }
    }

    // ---- 13. Generate module-registry.json ----
    const modules = (window.SC && window.SC.MODULES) || [];
    const registry = modules.map(m => ({ id: m.id, name: m.name, category: m.category || 'General', desc: m.desc || '' }));
    zip.file('assets/js/module-registry.generated.json', JSON.stringify(registry, null, 2));

    // ---- 14. PWA assets ----
    zip.file('manifest.json', Generator.generateManifest(resolvedConfig));
    zip.file('sw.js', Generator.generateServiceWorker());
    zip.file('robots.txt', Generator.generateRobots());
    zip.file('sitemap.xml', Generator.generateSitemap(resolvedConfig));
    zip.file('.nojekyll', '');

    // ---- 15. Security headers (for Cloudflare Pages / Netlify) ----
    zip.file('_headers', Generator.generateHeaders());
    zip.file('vercel.json', Generator.generateVercelConfig());

    // ---- 16. Database SQL files ----
    for (const [f, content] of Object.entries(sqlContents)) {
      if (content) zip.file(f, content);
    }

    // ---- 17. README with setup instructions ----
    zip.file('README.md', Generator.generateREADME(resolvedConfig));

    // ---- 18. Logo placeholder (SVG) ----
    zip.file('assets/img/logo.svg', Generator.generateLogoSVG(resolvedConfig));

    console.log('[Generator] Build complete. ZIP entries:', Object.keys(zip.files).length);
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const schoolSlug = (cfg.schoolName || 'school').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const fileName = schoolSlug + '-school-connect.zip';
    return { blob, fileName };
  },

  /** Generate the school-specific config.js */
  generateConfigJS(cfg, wizardConfig) {
    return `/**
 * ${cfg.schoolName} — School Connect Configuration
 * Generated by School Connect Wizard (HMG Concepts)
 * ============================================================
 * SETUP: Replace YOUR_SUPABASE_URL and YOUR_SUPABASE_ANON_KEY
 * with your actual Supabase project credentials.
 * Enable Row-Level Security (RLS) on all tables in Supabase.
 * Run database/schema.sql in your Supabase SQL editor first.
 * ============================================================
 */
window.SC = window.SC || {};
window.SCHOOL = {
  name: ${JSON.stringify(cfg.schoolName)},
  shortName: ${JSON.stringify(cfg.shortName)},
  motto: ${JSON.stringify(cfg.schoolMotto)},
  theme: ${JSON.stringify({ id: cfg.themeId, primary: cfg.themePrimary, accent: cfg.themeAccent })},
  layout: ${JSON.stringify(cfg.layout)},
  font: ${JSON.stringify(cfg.font)},
  campuses: ${JSON.stringify(cfg.campuses || [])},
  hmgLink: ${JSON.stringify(cfg.hmgLink || 'https://hmgconcepts.pages.dev/')}
};
window.SC.THEMES = ${JSON.stringify(typeof SC !== 'undefined' && SC.THEMES ? SC.THEMES : [])};
window.SC.MODULES = ${JSON.stringify(typeof SC !== 'undefined' && SC.MODULES ? SC.MODULES : [])};
window.SC.esc = function(s) {
  return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
};
window.SC.jsStr = function(s) {
  return JSON.stringify(String(s==null?'':s));
};
window.SC.slugify = function(s) {
  return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
};

// Supabase client initialization
const SUPABASE_URL = ${JSON.stringify(wizardConfig.supabaseUrl || 'YOUR_SUPABASE_URL')};
const SUPABASE_ANON_KEY = ${JSON.stringify(wizardConfig.supabaseKey || 'YOUR_SUPABASE_ANON_KEY')};

// Initialize Supabase only if properly configured
if (SUPABASE_URL && SUPABASE_URL !== 'YOUR_SUPABASE_URL' && !SUPABASE_URL.includes('YOUR_')) {
  window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
  console.log('[School Connect] Connected to Supabase at', SUPABASE_URL);
} else {
  console.warn('[School Connect] Supabase not configured. Edit assets/js/config.js with your credentials.');
}

// ============================================================
// FREE NOTIFICATION CHANNELS — enabled by default
// These are free (mailto:, wa.me:, sms:) so no API keys needed.
// ============================================================
window.SC_CONFIRM_FREE_EMAIL = true;
window.SC_CONFIRM_FREE_WA = true;
window.SC_CONFIRM_FREE_SMS = true;

// ============================================================
// OPTIONAL: Custom VAPID keys for push notifications
// Generate at: https://web-push-codelab.glitch.me/
// ============================================================
// window.SC.VAPID_PUBLIC = 'YOUR_VAPID_PUBLIC_KEY';
// window.SC.VAPID_PRIVATE = 'YOUR_VAPID_PRIVATE_KEY';

// ============================================================
// IMPORTANT: Row-Level Security (RLS)
// The Supabase anon key is public by design — this is safe.
// BUT you MUST enable RLS on ALL tables in your Supabase project.
// The schema.sql file enables RLS and creates appropriate policies.
// Without RLS, anyone can read/write any data.
// To verify RLS is on: Supabase Dashboard → Table Editor → select table → check "RLS" toggle
// ============================================================

console.log('[School Connect] Config loaded — ${cfg.schoolName} — Powered by HMG Concepts');
`;
  },

  /** Standard <script> tags for all generated pages (after T.shell() body close) */
  standardScripts() {
    return `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="assets/js/config.js"></script>
<script src="assets/js/notifications.js"></script>
<script src="assets/js/voting.js"></script>
<script src="assets/js/pwa-install.js"></script>
<script src="assets/js/site-help.js"></script>
<script src="assets/js/super.js"></script>
<script src="assets/js/enterprise.js"></script>
<script src="assets/js/crud.js"></script>
<script src="assets/js/app.js"></script>`;
  },

  /** Standard boot script (service worker + module init) */
  standardBoot() {
    return `<script>
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(reg => {
    if (window.Notifications) Notifications.init(sb, reg);
    if (window.Voting) Voting.init(sb);
  }).catch(e => console.warn('SW registration failed:', e.message));
} else {
  if (window.Notifications) Notifications.init(sb);
  if (window.Voting) Voting.init(sb);
}
if (window.PWAInstall) PWAInstall.init();
if (window.Super) Super.init(sb, window.SCHOOL);
if (window.Enterprise) Enterprise.init(sb);
if (window.CRUD) CRUD.init(sb);
</script>`;
  },

  /** Landing page content (index.html body) */
  indexContent(cfg) {
    const theme = cfg.themePrimary;
    return `
${Generator.bellAndBanner()}
<div style="min-height:100vh;display:flex;flex-direction:column">
  <nav class="nav">
    <div class="nav-inner">
      <div class="nav-logo">
        <img src="assets/img/logo.${cfg.logoExt || 'svg'}" alt="${cfg.schoolName}" onerror="this.style.display='none'">
        <span>${cfg.schoolName}</span>
      </div>
      <ul class="nav-links">
        <li><a href="about.html">About</a></li>
        <li><a href="contact.html">Contact</a></li>
        <li><a href="apply.html">Admissions</a></li>
        <li><a href="login.html" class="btn-primary">Sign in</a></li>
      </ul>
      <button class="mobile-toggle" onclick="document.querySelector('.nav-links').classList.toggle('show')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
    </div>
  </nav>

  <div class="hero">
    <div class="hero-badge">🏫 Free &amp; Open Source</div>
    <h1>Welcome to <span class="highlight">${cfg.schoolName}</span></h1>
    <p class="hero-sub">${cfg.schoolMotto || 'A modern school management portal — built free with Supabase + GitHub Pages.'}</p>
    <div class="hero-actions">
      <a href="login.html" class="btn-hero btn-hero-primary">🔐 Sign in to Portal</a>
      <a href="apply.html" class="btn-hero btn-hero-secondary">📝 Apply for Admission</a>
      <a href="about.html" class="btn-hero btn-hero-secondary">ℹ️ Learn More</a>
    </div>
  </div>

  <div class="section">
    <div class="section-head">
      <span class="section-eyebrow">FEATURES</span>
      <h2 class="section-title">Everything your school needs</h2>
      <p class="section-sub">From admissions to report cards, CBT exams to payroll — all in one free platform.</p>
    </div>
    <div class="grid grid-3" style="max-width:1000px;margin:0 auto">
      <div class="card"><div class="card-icon">👨‍🎓</div><h3>Student Management</h3><p>Complete register, CSV import, profile photos, and class grouping.</p></div>
      <div class="card"><div class="card-icon">📊</div><h3>Results &amp; Report Cards</h3><p>CA + exam scores, broadsheets, printable report cards.</p></div>
      <div class="card"><div class="card-icon">💻</div><h3>CBT / Online Exams</h3><p>17 question types, anti-cheat, auto-grade, certificates.</p></div>
      <div class="card"><div class="card-icon">📋</div><h3>Attendance</h3><p>Daily tracking, QR check-in, CSV export.</p></div>
      <div class="card"><div class="card-icon">💰</div><h3>Fees &amp; Finance</h3><p>Payment recording, balance tracking, printable receipts.</p></div>
      <div class="card"><div class="card-icon">💼</div><h3>HR &amp; Payroll</h3><p>Staff directory, payslips, loans, bonuses, appraisals.</p></div>
      <div class="card"><div class="card-icon">📢</div><h3>Announcements</h3><p>Priority notices, pinned alerts, audience targeting.</p></div>
      <div class="card"><div class="card-icon">🗳️</div><h3>Voting &amp; Polls</h3><p>Class elections, head boy/girl contests, live results.</p></div>
      <div class="card"><div class="card-icon">🔔</div><h3>Push Notifications</h3><p>Browser + email + WhatsApp + SMS — all free.</p></div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-grid">
      <div class="footer-brand">
        <h4>${cfg.schoolName}</h4>
        <p>${cfg.schoolMotto || 'Built with School Connect by HMG Concepts.'}</p>
      </div>
      <div>
        <h5>Quick Links</h5>
        <ul>
          <li><a href="login.html">Sign in</a></li>
          <li><a href="apply.html">Admissions</a></li>
          <li><a href="contact.html">Contact</a></li>
        </ul>
      </div>
      <div>
        <h5>Resources</h5>
        <ul>
          <li><a href="feature-guide.html">Feature Guide</a></li>
          <li><a href="verify-certificate.html">Verify Certificate</a></li>
        </ul>
      </div>
      <div>
        <h5>Powered By</h5>
        <ul>
          <li><a href="https://hmgconcepts.pages.dev/" target="_blank" rel="noopener">HMG Concepts</a></li>
          <li><a href="https://supabase.com" target="_blank" rel="noopener">Supabase</a></li>
          <li><a href="https://pages.github.com" target="_blank" rel="noopener">GitHub Pages</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      © ${new Date().getFullYear()} ${cfg.schoolName} · Built with <a href="https://hmgconcepts.pages.dev/" target="_blank" rel="noopener" style="color:#94a3b8">School Connect by HMG Concepts</a>
    </div>
  </div>
</div>
`;
  },

  bellAndBanner() {
    return `<div id="notif-bell" class="notif-bell" title="Notifications" data-chatbot>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
  <span id="notif-badge" class="notif-badge" style="display:none">0</span>
  <div id="notif-dropdown" class="notif-dropdown"><div style="padding:16px 20px;border-bottom:1px solid var(--gray-200)"><strong>Notifications</strong></div><div id="notif-list"><div class="toast-msg" style="padding:24px;text-align:center">Loading…</div></div></div>
</div>
<div id="pwa-install-banner" class="pwa-install">
  <div class="pwa-install-header">
    <img src="assets/img/logo.svg" alt="" class="pwa-install-icon">
    <div style="flex:1">
      <div class="pwa-install-title">📲 Install School Connect</div>
      <div class="pwa-install-msg">Get push notifications for messages and announcements.</div>
    </div>
    <button class="modal-close" data-pwa-action="dismiss">×</button>
  </div>
  <div class="pwa-install-actions">
    <button class="btn btn-outline btn-sm" data-pwa-action="never">Not now</button>
    <button class="btn btn-primary btn-sm" data-pwa-action="install">Install App</button>
  </div>
</div>
<div id="toast-container" class="toast-container"></div>`;
  },

  /** Fallback minimal page when template generation fails */
  fallbackPage(name) {
    return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${name} — School Connect</title>
<link rel="stylesheet" href="assets/css/style.css">
</head><body>
<div class="app-layout sidebar">
  <aside class="app-sidebar">
    <div class="app-brand"><strong>School Connect</strong></div>
    <nav class="app-nav">
      <a href="dashboard.html">🏠 Dashboard</a>
      <a href="about.html">ℹ️ About</a>
      <a href="contact.html">☎️ Contact</a>
    </nav>
  </aside>
  <main class="app-main">
    <header class="app-topbar"><h1 class="app-page-title">${name}</h1></header>
    <div class="app-content">
      <div class="card">
        <h3>⚠️ Setup Required</h3>
        <p>This module requires database configuration. Please set up Supabase and run the schema SQL files.</p>
        <p>See the README.md file in your downloaded package for setup instructions.</p>
      </div>
    </div>
  </main>
</div>
<script src="assets/js/config.js"></script>
<script src="assets/js/app.js"></script>
</body></html>`;
  },

  /** Generate PWA manifest.json */
  generateManifest(cfg) {
    return JSON.stringify({
      name: cfg.schoolName,
      short_name: cfg.shortName || cfg.schoolName,
      description: (cfg.schoolMotto || 'School Management Portal') + ' — Powered by School Connect',
      start_url: '/',
      display: 'standalone',
      background_color: cfg.themePrimary || '#0f172a',
      theme_color: cfg.themePrimary || '#0f172a',
      icons: [
        { src: 'assets/img/logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
      ]
    }, null, 2);
  },

  /** Generate service worker with proper offline caching */
  generateServiceWorker() {
    return `/**
 * School Connect — Service Worker v8
 * FIX S-08: Proper offline caching strategy (was: bare skipWaiting stub)
 * Caches: HTML, CSS, JS, fonts, images.
 * Strategy: Cache-first for assets, network-first for HTML.
 */
const CACHE_NAME = 'sc-v8';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/login.html',
  '/dashboard.html',
  '/assets/css/style.css',
  '/assets/js/config.js',
  '/assets/js/app.js',
  '/assets/js/crud.js',
  '/assets/img/logo.svg',
  '/manifest.json'
];

// Install: pre-cache shell assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching shell assets');
      return cache.addAll(PRECACHE_URLS).catch(err => {
        console.warn('[SW] Some URLs failed to cache:', err.message);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for assets, network-first for navigation
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests (CDN fonts, etc. handled separately)
  if (url.origin !== location.origin && !url.href.includes('fonts.googleapis') && !url.href.includes('fonts.gstatic')) {
    return;
  }

  // Navigation: network-first, fall back to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return res;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Assets: cache-first
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return res;
        });
      })
    );
  }
});

// Push notification handler
self.addEventListener('push', event => {
  try {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'School Connect';
    const body = data.body || 'You have a new notification';
    const icon = data.icon || '/assets/img/logo.svg';
    const url = data.url || '/';

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon,
        badge: '/assets/img/logo.svg',
        data: { url },
        requireInteraction: false,
        vibrate: [200, 100, 200]
      })
    );
  } catch (e) {
    console.warn('[SW] Push handler failed:', e.message);
  }
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});

console.log('[SW] School Connect service worker loaded — v8');
`;
  },

  /** Generate robots.txt */
  generateRobots() {
    return `User-agent: *
Allow: /
Disallow: /assets/js/*.js
Disallow: /database/

Sitemap: /sitemap.xml
`;
  },

  /** Generate sitemap.xml */
  generateSitemap(cfg) {
    const base = 'https://yourschool.github.io'; // User replaces this
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${base}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>${base}/login.html</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>${base}/dashboard.html</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>
  <url><loc>${base}/about.html</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>${base}/contact.html</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>${base}/apply.html</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>${base}/feature-guide.html</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
</urlset>`;
  },

  /** Generate _headers for Cloudflare Pages */
  generateHeaders() {
    return `# Security headers for School Connect
/*
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://*.supabase.io wss://*.supabase.co

/_headers
  Access-Control-Allow-Origin: *
`;
  },

  /** Generate vercel.json */
  generateVercelConfig() {
    return JSON.stringify({
      headers: [
        {
          source: '/(.*)',
          headers: [
            { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
          ]
        }
      ]
    }, null, 2);
  },

  /** Generate README with setup instructions */
  generateREADME(cfg) {
    return `# ${cfg.schoolName} — School Connect Portal

Generated by [School Connect](https://hmgconcepts.pages.dev/) by HMG Concepts.

## 🚀 Quick Setup

### 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Copy your **Project URL** and **anon public** key from: Settings → API

### 2. Configure Your Site
1. Open \`assets/js/config.js\`
2. Replace \`YOUR_SUPABASE_URL\` with your Project URL
3. Replace \`YOUR_SUPABASE_ANON_KEY\` with your anon key

### 3. Run the Database Schema
1. In Supabase, go to **SQL Editor**
2. Copy-paste the contents of each file below and run in order:
   - \`database/schema.sql\` (main tables)
   - \`database/voting-schema.sql\` (polls & voting)
   - \`database/cbt-schema.sql\` (CBT exams)
   - \`database/reportcard-schema.sql\` (report cards)
   - \`database/enterprise-schema.sql\` (enterprise features)
   - \`database/enhancements-schema.sql\` (additional tables)

### 4. Enable Row-Level Security (RLS)
All tables have RLS policies enabled. Each role sees only their data:
- **Students** see their own results, fees, attendance
- **Parents** see their linked children's data
- **Staff** see their classes' data
- **Admin/Super Admin** see all data

### 5. Deploy to GitHub Pages
1. Create a new GitHub repository
2. Upload all files from this package
3. Enable GitHub Pages (Settings → Pages → Source: main branch)
4. Your site will be live at: \`https://yourusername.github.io/repo-name\`

## 📱 PWA Install
Users can install this as a mobile app via their browser's "Add to Home Screen".

## 🔔 Push Notifications
Push notifications require browser permission. Email, WhatsApp, and SMS are always free.

## 🛠️ Features
${(Array.isArray(cfg.modules) ? cfg.modules : []).map(m => `- ${m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`).join('\n')}

## 📞 Support
- Feature Guide: \`feature-guide.html\`
- Developer: Adewale Samson Adeagbo (HMG Concepts)
- GitHub: https://github.com/hmgconcepts/schoolconnect15

---
*Built with ❤️ by HMG Concepts — 100% free, open-source school management.*
`;
  },

  /** Generate SVG logo placeholder */
  generateLogoSVG(cfg) {
    const primary = cfg.themePrimary || '#0f172a';
    const accent = cfg.themeAccent || '#d4af37';
    const initial = (cfg.shortName || cfg.schoolName || 'S')[0].toUpperCase();
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="40" fill="${primary}"/>
  <text x="100" y="135" font-family="Arial, sans-serif" font-size="110" font-weight="900" text-anchor="middle" fill="${accent}">${initial}</text>
</svg>`;
  },

  /** Mock DOM environment for running templates.js in build context */
  mockDOM() {
    if (typeof document !== 'undefined') return;
    // Minimal document mock for Node.js-like environment
    const mockEl = (tag) => ({
      tagName: tag.toUpperCase(), children: [], innerHTML: '', textContent: '',
      style: {}, appendChild: () => {}, removeChild: () => {},
      getAttribute: () => '', setAttribute: () => {}, querySelectorAll: () => [],
      addEventListener: () => {}, classList: { toggle: () => {}, add: () => {}, remove: () => {} }
    });
    window.document = {
      querySelectorAll: () => [],
      createElement: (tag) => ({ tagName: tag.toUpperCase(), style: {}, appendChild: () => {}, setAttribute: () => {} }),
      getElementById: () => null,
      body: { appendChild: () => {} },
      readyState: 'complete',
      addEventListener: () => {}
    };
    window.location = { href: '/', pathname: '/index.html' };
    window.history = {};
  },

  loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load: ' + src));
      document.head.appendChild(s);
    });
  },

  /** Export T.pageIndex for preview.js compatibility (FIX G-05) */
  pageIndex(cfg) {
    // T.pageIndex from templates.js is used by preview.js
    // Provide a fallback here
    if (window.T && window.T.pageIndex) return window.T.pageIndex(cfg);
    return Generator.generateIndexPage(cfg || {});
  },

  /** Generate the index page HTML string */
  generateIndexPage(cfg) {
    const schoolName = cfg.schoolName || 'School Portal';
    const shortName = cfg.shortName || schoolName;
    const primary = cfg.themePrimary || '#0f172a';
    const accent = cfg.themeAccent || '#d4af37';
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${schoolName} — School Connect</title>
<link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--gradient)">
  <div style="background:white;padding:48px;border-radius:24px;max-width:480px;text-align:center;box-shadow:0 25px 50px rgba(0,0,0,.25)">
    <h1 style="font-size:2rem;font-weight:900;margin-bottom:8px">${schoolName}</h1>
    <p style="color:var(--gray-600);margin-bottom:24px">${cfg.schoolMotto || 'School Management Portal'}</p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
      <a href="login.html" class="btn btn-primary btn-lg">🔐 Sign In</a>
      <a href="apply.html" class="btn btn-outline btn-lg">📝 Apply</a>
    </div>
    <p style="margin-top:24px;font-size:0.8rem;color:var(--gray-400)">Powered by <a href="https://hmgconcepts.pages.dev/" style="color:var(--primary)">HMG Concepts</a></p>
  </div>
</div>
</body>
</html>`;
  },

  /** Generate login page (used when T is not available) */
  generateLoginPage(cfg) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Sign in — ${cfg.schoolName}</title>
<link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="assets/js/config.js"></script>
<script src="assets/js/app.js"></script>
</body>
</html>`;
  },

  /** Generate dashboard page (used when T is not available) */
  generateDashboardPage(cfg) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Dashboard — ${cfg.schoolName}</title>
<link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
<div class="app-layout sidebar">
  <aside class="app-sidebar">
    <div class="app-brand">
      <img src="assets/img/logo.svg" alt="${cfg.schoolName}">
      <strong>${cfg.schoolName}</strong>
    </div>
    <nav class="app-nav">
      <a href="dashboard.html" class="active">🏠 Dashboard</a>
      <a href="students.html">👨‍🎓 Students</a>
      <a href="staff.html">👨‍🏫 Staff</a>
      <a href="attendance.html">📋 Attendance</a>
      <a href="results.html">📊 Results</a>
      <a href="fees.html">💰 Fees</a>
    </nav>
  </aside>
  <main class="app-main">
    <header class="app-topbar">
      <h1 class="app-page-title">Dashboard</h1>
      <div style="margin-left:auto;display:flex;align-items:center;gap:12px">
        <div class="user-chip"><strong id="user-display-name">—</strong></div>
        <button class="btn btn-sm btn-outline" onclick="App.signOut()" data-signout style="display:none">Sign out</button>
      </div>
    </header>
    <div class="app-content">
      <div class="card" style="background:var(--gradient);color:white;margin-bottom:18px">
        <h2 style="color:white;margin:0">Welcome, <span id="dash-user-name">—</span></h2>
        <p style="opacity:.9;margin:4px 0 0">Role: <strong id="dash-user-role">—</strong></p>
        <div id="dash-quick-links" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"></div>
      </div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value" id="stat-students">—</div><div class="stat-label">Students</div></div>
        <div class="stat-card"><div class="stat-value" id="stat-staff">—</div><div class="stat-label">Staff</div></div>
        <div class="stat-card"><div class="stat-value" id="stat-fees">—</div><div class="stat-label">Fees Paid</div></div>
        <div class="stat-card"><div class="stat-value" id="stat-announcements">—</div><div class="stat-label">Notices</div></div>
      </div>
    </div>
  </main>
</div>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="assets/js/config.js"></script>
<script src="assets/js/notifications.js"></script>
<script src="assets/js/voting.js"></script>
<script src="assets/js/pwa-install.js"></script>
<script src="assets/js/super.js"></script>
<script src="assets/js/enterprise.js"></script>
<script src="assets/js/crud.js"></script>
<script src="assets/js/app.js"></script>
</body>
</html>`;
  }
};

/* ============================================================
   PRICING — itemised "Done-for-You" quote (platform is always FREE)
   Wired by Wizard.recalcQuote() in builder.html
   ============================================================ */
  PRICING: {
    currency: '₦',
    baseBuild: 35000,
    perModule: 4500,
    perDept: 1500,
    levels: [
      { id: 'deploy', name: 'Deploy & host for you', price: 15000 },
      { id: 'training', name: 'Staff training (3 hours)', price: 10000 },
      { id: 'data_import', name: 'Bulk data import', price: 8000 },
      { id: 'custom_domain', name: 'Custom domain setup', price: 5000 },
      { id: 'support', name: '3-month priority support', price: 5000 }
    ]
  },

  /** Generate an itemised quote from wizard config + selected add-ons. */
  estimate(config, addons) {
    const P = Generator.PRICING;
    const modules = Array.isArray(config.modules) ? config.modules : [];
    const depts = Array.isArray(config.departments) ? config.departments : [];
    const addOnTotal = (addons || []).reduce((s, id) => {
      const a = P.levels.find(l => l.id === id);
      return s + (a ? a.price : 0);
    }, 0);
    const lines = [
      { label: 'Base build & branding', amount: P.baseBuild },
      { label: modules.length + ' modules × ₦' + P.perModule, amount: modules.length * P.perModule },
      { label: depts.length + ' departments × ₦' + P.perDept, amount: depts.length * P.perDept }
    ];
    (addons || []).forEach(id => {
      const a = P.levels.find(l => l.id === id);
      if (a) lines.push({ label: a.name, amount: a.price });
    });
    return { lines, total: lines.reduce((s, l) => s + l.amount, 0), currency: P.currency };
  },

  /** Full interactive multi-page preview (FIX G-05 helper for fullPreview).
      Creates a self-contained HTML document with real page bodies from
      templates.js, injected CSS, and a mock Supabase client with demo data. */
  fullPreviewHtml(config) {
    const cfg = { ...config };
    if (!cfg.schoolName) cfg.schoolName = 'Preview School';
    const theme = (window.SC && window.SC.THEMES && window.SC.THEMES.find(t => t.id === cfg.themeId)) || window.SC.THEMES[0] || { primary: '#0f172a', accent: '#d4af37' };
    cfg.themePrimary = cfg.themePrimary || theme.primary || '#0f172a';
    cfg.themeAccent  = cfg.themeAccent  || theme.accent  || '#d4af37';

    // Mock Supabase demo data
    const demoData = {
      students: Array.from({ length: 8 }, (_, i) => ({
        id: 's' + i, admission_no: 'STD/' + (1001 + i),
        full_name: ['Grace Adeyemi','John Okoro','Mary Bello','Daniel Musa','Esther Obi','Samuel Eze','Ruth Ali','Peter Udo'][i],
        class_name: ['JSS 1A','JSS 2B','SSS 1A','SSS 2C','Primary 5','SSS 3A','JSS 1B','SSS 1C'][i],
        gender: i % 2 === 0 ? 'M' : 'F', status: 'active'
      })),
      staff: Array.from({ length: 5 }, (_, i) => ({
        id: 'st' + i, staff_no: 'STF/' + (2001 + i),
        full_name: ['Mrs. Bello','Mr. Eze','Mrs. Adebayo','Mr. Sule','Dr. Okonkwo'][i],
        role: i === 0 ? 'admin' : 'teacher', status: 'active'
      })),
      results: Array.from({ length: 12 }, (_, i) => ({
        id: 'r' + i, student_id: 's' + (i % 8),
        subject: ['Mathematics','English','Biology','Physics','Chemistry','Economics'][i % 6],
        term: 'First Term', ca_score: Math.floor(Math.random() * 30) + 5,
        exam_score: Math.floor(Math.random() * 50) + 20,
        grade: ['A','B','C','D'][i % 4]
      })),
      announcements: [
        { id: 'a1', title: 'Term begins Monday', body: 'All students must report by 7:30am', created_at: new Date().toISOString(), priority: 'high' },
        { id: 'a2', title: ' PTA meeting this Saturday', body: 'All parents please attend', created_at: new Date().toISOString(), priority: 'normal' }
      ],
      fee_payments: Array.from({ length: 6 }, (_, i) => ({
        id: 'f' + i, student_id: 's' + i,
        amount_paid: 75000, balance: i % 3 === 0 ? 0 : 15000,
        term: 'First Term', status: i % 3 === 0 ? 'paid' : 'partial'
      })),
      attendance: Array.from({ length: 20 }, (_, i) => ({
        id: 'at' + i, student_id: 's' + (i % 8),
        status: i % 5 === 0 ? 'absent' : 'present',
        date: new Date(Date.now() - i * 864e5).toISOString().slice(0, 10)
      })),
      polls: [{ id: 'p1', title: 'Head Boy Election 2026', status: 'open', audience: 'all', candidates: JSON.stringify([
        { id: 'c1', name: 'Adaeze Okeke', info: 'SSS 3A', photo: '' },
        { id: 'c2', name: 'Chidi Nwankwo', info: 'SSS 3A', photo: '' }
      ]) }],
      cbt_exams: [{ id: 'cbt1', title: 'Mathematics Quiz - Week 4', class_name: 'SSS 1A', subject: 'Mathematics', duration_min: 20, is_open: true, total_questions: 10 }]
    };

    const modules = Array.isArray(cfg.modules) ? cfg.modules : [];
    const navItems = (modules.length ? modules : ['dashboard','students','staff','attendance','results','fees','announcements','voting','cbt','library']).map(id => ({
      id,
      label: (window.T && window.T.labelFor) ? window.T.labelFor(id, id) : id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      icon: (window.T && window.T.iconFor) ? window.T.iconFor(id) : '📄'
    }));

    const navHTML = navItems.map(m => `<div class="pv-nav-item" data-page="${m.id}">
      <span class="pv-nav-icon">${m.icon}</span>
      <span>${m.label}</span>
    </div>`).join('');

    const previewCSS = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: var(--font, 'Inter'), system-ui, sans-serif; background: #f8fafc; color: #0f172a; }
      .pv-shell { display: flex; height: 100vh; }
      .pv-side { width: 240px; background: #0f172a; color: #fff; flex-shrink: 0; display: flex; flex-direction: column; }
      .pv-brand { padding: 16px; border-bottom: 1px solid #1e293b; display: flex; align-items: center; gap: 10px; }
      .pv-brand-name { font-weight: 800; font-size: 0.95rem; }
      .pv-nav { padding: 12px 8px; flex: 1; overflow-y: auto; }
      .pv-nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; font-size: 0.88rem; margin-bottom: 2px; color: #94a3b8; transition: all .15s; }
      .pv-nav-item:hover { background: #1e293b; color: #fff; }
      .pv-nav-item.active { background: var(--primary, #4f46e5); color: #fff; }
      .pv-nav-icon { font-size: 1rem; width: 24px; text-align: center; }
      .pv-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
      .pv-topbar { padding: 14px 24px; background: white; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 14px; }
      .pv-page-title { font-size: 1.2rem; font-weight: 800; }
      .pv-content { flex: 1; padding: 24px; overflow-y: auto; }
      .pv-card { background: white; border-radius: 12px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,.06); border: 1px solid #e2e8f0; }
      .pv-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
      .pv-stat { background: white; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #e2e8f0; }
      .pv-stat-val { font-size: 1.8rem; font-weight: 900; color: var(--primary, #4f46e5); }
      .pv-stat-lbl { font-size: 0.7rem; text-transform: uppercase; letter-spacing: .05em; color: #64748b; margin-top: 4px; }
      .pv-table { width: 100%; border-collapse: collapse; }
      .pv-table th { text-align: left; padding: 10px 12px; background: #f1f5f9; font-size: 0.75rem; text-transform: uppercase; color: #475569; border-bottom: 2px solid #e2e8f0; }
      .pv-table td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 0.88rem; }
      .pv-badge { display: inline-block; padding: 2px 8px; border-radius: 50px; font-size: 0.72rem; font-weight: 700; }
      .pv-badge-green { background: #dcfce7; color: #15803d; }
      .pv-badge-yellow { background: #fef9c3; color: #a16207; }
      .pv-badge-red { background: #fee2e2; color: #b91c1c; }
      .pv-badge-blue { background: #dbeafe; color: #1d4ed8; }
      .pv-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; border: 1px solid #e2e8f0; background: white; cursor: pointer; }
      .pv-btn-primary { background: var(--primary, #4f46e5); color: white; border: 0; }
      .pv-footer { padding: 16px 24px; border-top: 1px solid #e2e8f0; font-size: 0.78rem; color: #94a3b8; text-align: center; }
      .pv-section-title { font-size: 1rem; font-weight: 800; margin-bottom: 12px; color: #0f172a; }
      .pv-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .pv-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
      @media(max-width: 900px) { .pv-side { display: none; } .pv-stats { grid-template-columns: repeat(2, 1fr); } }
    `;

    // Page content generators for the preview
    function getPageHTML(pageId) {
      const d = demoData;
      const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      switch (pageId) {
        case 'dashboard': return `
          <div class="pv-stats">
            <div class="pv-stat"><div class="pv-stat-val">${d.students.length}</div><div class="pv-stat-lbl">Students</div></div>
            <div class="pv-stat"><div class="pv-stat-val">${d.staff.length}</div><div class="pv-stat-lbl">Staff</div></div>
            <div class="pv-stat"><div class="pv-stat-val">${d.fee_payments.filter(f=>f.status==='paid').length}</div><div class="pv-stat-lbl">Paid</div></div>
            <div class="pv-stat"><div class="pv-stat-val">${d.announcements.length}</div><div class="pv-stat-lbl">Notices</div></div>
          </div>
          <div class="pv-grid-2">
            <div class="pv-card"><h3 class="pv-section-title">📢 Announcements</h3>
              ${d.announcements.map(a => `<div style="padding:8px 0;border-bottom:1px solid #e2e8f0"><strong>${esc(a.title)}</strong><div style="font-size:.8rem;color:#64748b">${esc(a.body)}</div></div>`).join('')}
            </div>
            <div class="pv-card"><h3 class="pv-section-title">🗳️ Active Polls</h3>
              ${d.polls.map(p => `<div style="padding:10px;background:#f1f5f9;border-radius:8px"><strong>${esc(p.title)}</strong><span class="pv-badge pv-badge-green" style="margin-left:8px">${esc(p.status)}</span></div>`).join('')}
            </div>
          </div>`;
        case 'students': return `
          <div class="pv-card"><h3 class="pv-section-title">👨‍🎓 Student Register (${d.students.length})</h3>
            <table class="pv-table"><thead><tr><th>Adm No</th><th>Name</th><th>Class</th><th>Gender</th><th>Status</th></tr></thead>
            <tbody>${d.students.map(s => `<tr><td>${esc(s.admission_no)}</td><td>${esc(s.full_name)}</td><td>${esc(s.class_name)}</td><td>${esc(s.gender)}</td><td><span class="pv-badge pv-badge-green">active</span></td></tr>`).join('')}</tbody>
            </table></div>`;
        case 'results': return `
          <div class="pv-card"><h3 class="pv-section-title">📊 Results — First Term</h3>
            <table class="pv-table"><thead><tr><th>Student</th><th>Subject</th><th>CA</th><th>Exam</th><th>Grade</th></tr></thead>
            <tbody>${d.results.map(r => `<tr><td>${esc(d.students.find(s=>s.id===r.student_id)?.full_name||'?')}</td><td>${esc(r.subject)}</td><td>${r.ca_score}</td><td>${r.exam_score}</td><td><span class="pv-badge ${r.grade==='A'?'pv-badge-green':r.grade==='D'?'pv-badge-red':'pv-badge-yellow'}">${esc(r.grade)}</span></td></tr>`).join('')}</tbody></table></div>`;
        case 'fees': return `
          <div class="pv-card"><h3 class="pv-section-title">💰 Fee Payments</h3>
            <table class="pv-table"><thead><tr><th>Student</th><th>Amount Paid</th><th>Balance</th><th>Status</th></tr></thead>
            <tbody>${d.fee_payments.map(f => `<tr><td>${esc(d.students.find(s=>s.id===f.student_id)?.full_name||'?')}</td><td>₦${f.amount_paid.toLocaleString()}</td><td>₦${f.balance.toLocaleString()}</td><td><span class="pv-badge ${f.status==='paid'?'pv-badge-green':'pv-badge-yellow'}">${esc(f.status)}</span></td></tr>`).join('')}</tbody></table></div>`;
        case 'attendance': return `
          <div class="pv-card"><h3 class="pv-section-title">📋 Attendance — Recent</h3>
            <table class="pv-table"><thead><tr><th>Date</th><th>Student</th><th>Status</th></tr></thead>
            <tbody>${d.attendance.slice(0,10).map(a => `<tr><td>${esc(a.date)}</td><td>${esc(d.students.find(s=>s.id===a.student_id)?.full_name||'?')}</td><td><span class="pv-badge ${a.status==='present'?'pv-badge-green':'pv-badge-red'}">${esc(a.status)}</span></td></tr>`).join('')}</tbody></table></div>`;
        case 'cbt': return `
          <div class="pv-card"><h3 class="pv-section-title">💻 CBT Exams</h3>
            ${d.cbt_exams.map(e => `<div style="padding:16px;background:#f1f5f9;border-radius:12px;margin-bottom:12px"><strong>${esc(e.title)}</strong><div style="font-size:.85rem;color:#64748b;margin-top:4px">${esc(e.subject)} · ${e.duration_min} min · ${e.total_questions} questions</div><button class="pv-btn pv-btn-primary" style="margin-top:10px" onclick="location.href='cbt-exam.html'">Take Exam</button></div>`).join('')}
            <p style="color:#94a3b8;font-size:.85rem">${d.cbt_exams.length} open exam(s). Admin can add more in the full portal.</p></div>`;
        case 'voting': return `
          <div class="pv-card"><h3 class="pv-section-title">🗳️ Polls & Elections</h3>
            ${d.polls.map(p => { const cands = JSON.parse(p.candidates||'[]'); return `<div style="padding:16px;background:#f1f5f9;border-radius:12px"><h4>${esc(p.title)} <span class="pv-badge pv-badge-green">open</span></h4><div class="pv-grid-3" style="margin-top:12px">${cands.map(c=>`<div class="pv-card" style="text-align:center;cursor:pointer"><div style="width:48px;height:48px;background:var(--primary,#4f46e5);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:1.2rem;margin:0 auto 8px">${esc((c.name||'?')[0])}</div><strong>${esc(c.name)}</strong><div style="font-size:.78rem;color:#64748b">${esc(c.info)}</div></div>`).join('')}</div></div>`; }).join('')}</div>`;
        case 'announcements': return `
          <div class="pv-card"><h3 class="pv-section-title">📢 School Announcements</h3>
            ${d.announcements.map(a => `<div style="padding:16px;background:${a.priority==='high'?'#fef3c7':'#f1f5f9'};border-radius:12px;margin-bottom:12px;border-left:4px solid ${a.priority==='high'?'#f59e0b':'#4f46e5'}"><strong>${esc(a.title)}</strong><p style="margin:6px 0 0;font-size:.88rem;color:#475569">${esc(a.body)}</p></div>`).join('')}</div>`;
        case 'library': return `
          <div class="pv-card"><h3 class="pv-section-title">📖 Library Catalogue</h3>
            <table class="pv-table"><thead><tr><th>Title</th><th>Author</th><th>Code</th><th>Status</th></tr></thead>
            <tbody>${[{t:'Things Fall Apart',a:'Chinua Achebe',c:'LIT-001',s:'available'},{t:'Advanced Mathematics',a:'John Bird',c:'MTH-002',s:'available'},{t:'Biology for SS',a:'Nigerian Series',c:'BIO-003',s:'lent'}].map(b=>`<tr><td>${esc(b.t)}</td><td>${esc(b.a)}</td><td>${esc(b.c)}</td><td><span class="pv-badge ${b.s==='available'?'pv-badge-green':'pv-badge-yellow'}">${esc(b.s)}</span></td></tr>`).join('')}</tbody></table></div>`;
        case 'staff': return `
          <div class="pv-card"><h3 class="pv-section-title">👨‍🏫 Staff Directory (${d.staff.length})</h3>
            <table class="pv-table"><thead><tr><th>Staff No</th><th>Name</th><th>Role</th><th>Status</th></tr></thead>
            <tbody>${d.staff.map(s => `<tr><td>${esc(s.staff_no)}</td><td>${esc(s.full_name)}</td><td>${esc(s.role)}</td><td><span class="pv-badge pv-badge-green">active</span></td></tr>`).join('')}</tbody></table></div>`;
        default: return `
          <div class="pv-card" style="text-align:center;padding:40px">
            <div style="font-size:3rem;margin-bottom:12px">📄</div>
            <h3 style="margin-bottom:8px">${window.T && window.T.labelFor ? window.T.labelFor(pageId, pageId) : pageId.replace(/_/g,' ')}</h3>
            <p style="color:#64748b">Preview of the <strong>${pageId}</strong> module. Full features available in the downloaded portal.</p>
            <p style="margin-top:16px;font-size:.82rem;color:#94a3b8">Powered by School Connect · HMG Concepts</p>
          </div>`;
      }
    }

    const firstPage = navItems[0]?.id || 'dashboard';

    // Pre-generate page content HTML strings for each page ID
    const esc2 = (s, into) => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const studentsHTML = d.students.map(s => `<tr><td>${esc2(s.admission_no)}</td><td>${esc2(s.full_name)}</td><td>${esc2(s.class_name)}</td><td>${esc2(s.gender)}</td><td><span class="pv-badge pv-badge-green">active</span></td></tr>`).join('');
    const staffHTML = d.staff.map(s => `<tr><td>${esc2(s.staff_no)}</td><td>${esc2(s.full_name)}</td><td>${esc2(s.role)}</td><td><span class="pv-badge pv-badge-green">active</span></td></tr>`).join('');
    const resultsHTML = d.results.map(r => `<tr><td>${esc2(d.students.find(s=>s.id===r.student_id)?.full_name||'?')}</td><td>${esc2(r.subject)}</td><td>${r.ca_score}</td><td>${r.exam_score}</td><td><span class="pv-badge ${r.grade==='A'?'pv-badge-green':r.grade==='D'?'pv-badge-red':'pv-badge-yellow'}">${esc2(r.grade)}</span></td></tr>`).join('');
    const feesHTML = d.fee_payments.map(f => `<tr><td>${esc2(d.students.find(s=>s.id===f.student_id)?.full_name||'?')}</td><td>₦${f.amount_paid.toLocaleString()}</td><td>₦${f.balance.toLocaleString()}</td><td><span class="pv-badge ${f.status==='paid'?'pv-badge-green':'pv-badge-yellow'}">${esc2(f.status)}</span></td></tr>`).join('');
    const attendanceHTML = d.attendance.slice(0,10).map(a => `<tr><td>${esc2(a.date)}</td><td>${esc2(d.students.find(s=>s.id===a.student_id)?.full_name||'?')}</td><td><span class="pv-badge ${a.status==='present'?'pv-badge-green':'pv-badge-red'}">${esc2(a.status)}</span></td></tr>`).join('');
    const announcementsHTML = d.announcements.map(a => `<div style="padding:16px;background:${a.priority==='high'?'#fef3c7':'#f1f5f9'};border-radius:12px;margin-bottom:12px;border-left:4px solid ${a.priority==='high'?'#f59e0b':'#4f46e5'}"><strong>${esc2(a.title)}</strong><p style="margin:6px 0 0;font-size:.88rem;color:#475569">${esc2(a.body)}</p></div>`).join('');
    const pollsHTML = d.polls.map(p => { const cands = JSON.parse(p.candidates||'[]'); return `<div style="padding:16px;background:#f1f5f9;border-radius:12px;margin-bottom:12px"><h4 style="margin:0 0 12px">${esc2(p.title)} <span class="pv-badge pv-badge-green" style="margin-left:8px">open</span></h4><div class="pv-grid-3">${cands.map(c=>`<div style="background:white;border-radius:10px;padding:16px;text-align:center;border:1px solid #e2e8f0"><div style="width:48px;height:48px;background:${cfg.themePrimary};border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:1.2rem;margin:0 auto 8px">${esc2((c.name||'?')[0])}</div><strong style="display:block;margin-bottom:4px">${esc2(c.name)}</strong><span style="font-size:.78rem;color:#64748b">${esc2(c.info)}</span></div>`).join('')}</div></div>`; }).join('');
    const cbtHTML = d.cbt_exams.map(e => `<div style="padding:16px;background:#f1f5f9;border-radius:12px;margin-bottom:12px"><strong>${esc2(e.title)}</strong><div style="font-size:.85rem;color:#64748b;margin-top:4px">${esc2(e.subject)} · ${e.duration_min} min · ${e.total_questions} questions</div><a href="cbt-exam.html" class="pv-btn pv-btn-primary" style="display:inline-flex;margin-top:10px;text-decoration:none">Take Exam →</a></div>`).join('');

    const pagesJSON = {
      dashboard: `<div class="pv-stats"><div class="pv-stat"><div class="pv-stat-val">${d.students.length}</div><div class="pv-stat-lbl">Students</div></div><div class="pv-stat"><div class="pv-stat-val">${d.staff.length}</div><div class="pv-stat-lbl">Staff</div></div><div class="pv-stat"><div class="pv-stat-val">${d.fee_payments.filter(f=>f.status==='paid').length}</div><div class="pv-stat-lbl">Fees Paid</div></div><div class="pv-stat"><div class="pv-stat-val">${d.announcements.length}</div><div class="pv-stat-lbl">Notices</div></div></div><div class="pv-grid-2"><div class="pv-card"><h3 class="pv-section-title">📢 Announcements</h3>${announcementsHTML}</div><div class="pv-card"><h3 class="pv-section-title">🗳️ Active Polls</h3>${pollsHTML}</div></div>`,
      students: `<div class="pv-card"><h3 class="pv-section-title">👨‍🎓 Student Register (${d.students.length})</h3><table class="pv-table"><thead><tr><th>Adm No</th><th>Name</th><th>Class</th><th>Gender</th><th>Status</th></tr></thead><tbody>${studentsHTML}</tbody></table></div>`,
      staff: `<div class="pv-card"><h3 class="pv-section-title">👨‍🏫 Staff Directory (${d.staff.length})</h3><table class="pv-table"><thead><tr><th>Staff No</th><th>Name</th><th>Role</th><th>Status</th></tr></thead><tbody>${staffHTML}</tbody></table></div>`,
      results: `<div class="pv-card"><h3 class="pv-section-title">📊 Results — First Term</h3><table class="pv-table"><thead><tr><th>Student</th><th>Subject</th><th>CA</th><th>Exam</th><th>Grade</th></tr></thead><tbody>${resultsHTML}</tbody></table></div>`,
      fees: `<div class="pv-card"><h3 class="pv-section-title">💰 Fee Payments</h3><table class="pv-table"><thead><tr><th>Student</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead><tbody>${feesHTML}</tbody></table></div>`,
      attendance: `<div class="pv-card"><h3 class="pv-section-title">📋 Recent Attendance</h3><table class="pv-table"><thead><tr><th>Date</th><th>Student</th><th>Status</th></tr></thead><tbody>${attendanceHTML}</tbody></table></div>`,
      announcements: `<div class="pv-card"><h3 class="pv-section-title">📢 Announcements</h3>${announcementsHTML}</div>`,
      voting: `<div class="pv-card"><h3 class="pv-section-title">🗳️ Polls &amp; Elections</h3>${pollsHTML}</div>`,
      cbt: `<div class="pv-card"><h3 class="pv-section-title">💻 CBT Exams</h3>${cbtHTML}<p style="color:#94a3b8;font-size:.85rem;margin-top:8px">${d.cbt_exams.length} open exam(s). Add more in the full portal.</p></div>`,
      library: `<div class="pv-card"><h3 class="pv-section-title">📖 Library Catalogue</h3><table class="pv-table"><thead><tr><th>Title</th><th>Author</th><th>Code</th><th>Status</th></tr></thead><tbody><tr><td>Things Fall Apart</td><td>Chinua Achebe</td><td>LIT-001</td><td><span class="pv-badge pv-badge-green">available</span></td></tr><tr><td>Advanced Mathematics</td><td>John Bird</td><td>MTH-002</td><td><span class="pv-badge pv-badge-green">available</span></td></tr><tr><td>Biology for SS</td><td>Nigerian Series</td><td>BIO-003</td><td><span class="pv-badge pv-badge-yellow">lent</span></td></tr></tbody></table></div>`
    };

    const pagesObj = JSON.stringify(pagesJSON);
    const navJSON = JSON.stringify(navItems.map(n => ({ id: n.id, label: n.label })));

    return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc2(cfg.schoolName)} — School Connect Preview</title>
<style>:root{--primary:${cfg.themePrimary};--accent:${cfg.themeAccent};--font:'${(cfg.font && cfg.font.css) || 'Inter'}',system-ui,sans-serif}</style>
<style>${previewCSS}</style>
</head><body>
<div class="pv-shell">
  <div class="pv-side">
    <div class="pv-brand">
      <div style="width:32px;height:32px;background:${cfg.themePrimary};border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:1.1rem">${esc2((cfg.shortName||cfg.schoolName||'S')[0])}</div>
      <span class="pv-brand-name">${esc2(cfg.schoolName)}</span>
    </div>
    <div class="pv-nav" id="pv-nav">${navHTML}</div>
    <div style="padding:12px 8px;border-top:1px solid #1e293b;font-size:.72rem;color:#64748b;text-align:center">Demo data · <a href="feature-guide.html" style="color:#94a3b8">Feature Guide</a></div>
  </div>
  <div class="pv-main">
    <div class="pv-topbar">
      <div class="pv-page-title" id="pv-title">Dashboard</div>
      <div style="margin-left:auto"><span class="pv-badge pv-badge-blue">DEMO</span></div>
    </div>
    <div class="pv-content" id="pv-content"></div>
    <div class="pv-footer">${esc2(cfg.schoolName)} · Demo preview · Real portal at download · <a href="https://hmgconcepts.pages.dev/" target="_blank" style="color:#94a3b8">HMG Concepts</a></div>
  </div>
</div>
<script>
(function(){
  var PAGES = ${pagesObj};
  var NAV = ${navJSON};
  var firstPage = ${JSON.stringify(firstPage)};

  function go(id) {
    document.getElementById('pv-content').innerHTML = PAGES[id] || '<div class="pv-card" style="text-align:center;padding:40px"><div style="font-size:3rem;margin-bottom:12px">📄</div><h3>' + (NAV.find(function(n){return n.id===id;})||{label:id}).label + '</h3><p style="color:#64748b">This module is available in the full portal.</p></div>';
    document.getElementById('pv-title').textContent = (NAV.find(function(n){return n.id===id;})||{label:id}).label;
    document.querySelectorAll('.pv-nav-item').forEach(function(el){ el.classList.toggle('active', el.dataset.page === id); });
  }

  document.querySelectorAll('.pv-nav-item').forEach(function(el){
    el.addEventListener('click', function(){ go(el.dataset.page); });
  });

  go(firstPage);
})();
</script>
</body></html>`;
  }
};

window.Generator = Generator;

console.log('%c[School Connect Gen v8] Generator loaded — full page generation pipeline.', 'color:#4f46e5;font-weight:bold');