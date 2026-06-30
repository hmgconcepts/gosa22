/* ====================================================================
   wizard.js — School Connect Gen v7
   Controls the 6-step wizard UI in builder.html.
   Pure JavaScript. Fixes D-02 (no stray </script>), D-15 (single version).
   ==================================================================== */

/* Lightweight, dependency-free toast for the BUILDER page. (The generated
   school sites get their own toast() from app.js.) Defined as a safe global
   so wizard actions like applyPreset() always have user feedback and never
   throw a ReferenceError. */
if (typeof window !== 'undefined' && typeof window.toast !== 'function') {
  window.toast = function (msg, type, ms) {
    try {
      let c = document.getElementById('sc-toast-wrap');
      if (!c) {
        c = document.createElement('div');
        c.id = 'sc-toast-wrap';
        c.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;gap:8px;align-items:center';
        document.body.appendChild(c);
      }
      const colors = { success: '#16a34a', danger: '#dc2626', warning: '#d97706', info: '#4f46e5' };
      const t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText = 'background:' + (colors[type] || colors.info) + ';color:#fff;padding:10px 18px;border-radius:10px;font:600 14px system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25);max-width:90vw';
      c.appendChild(t);
      setTimeout(() => t.remove(), ms || 3500);
    } catch (e) { /* never throw from a toast */ }
  };
}
/* Local alias so internal `toast(...)` calls resolve regardless of scope. */
var toast = (typeof window !== 'undefined' && window.toast) ? window.toast : function () {};

const Wizard = {
  step: 1,
  totalSteps: 6,
  config: {},

  init() {
    // 1) Bind the UI FIRST so navigation buttons always work, even if a later
    //    step throws. (Previously a failure in applyPreset/render could stop
    //    bindUI() from ever running, making every button dead.)
    try { this.bindUI(); } catch (e) { console.error('[Wizard] bindUI failed:', e); }

    // 2) Restore any saved draft.
    try {
      const saved = localStorage.getItem('sc-wizard-config');
      if (saved) this.config = JSON.parse(saved);
    } catch (e) { /* corrupt draft — ignore */ }

    // 3) ?preset=…  →  load preset (guarded; never blocks the wizard).
    try {
      const preset = new URLSearchParams(location.search).get('preset');
      if (preset && window.SC && window.SC.PRESETS && window.SC.PRESETS[preset]) {
        this.applyPreset(preset);
      }
    } catch (e) { console.warn('[Wizard] preset load skipped:', e); }

    // 4) Remaining setup — each guarded independently.
    try { this.bindAutoSave(); } catch (e) {}
    try { this.render(); } catch (e) { console.warn('[Wizard] render skipped:', e); }
    try { this.showStep(1); } catch (e) { console.warn('[Wizard] showStep skipped:', e); }
  },

  applyPreset(id) {
    const p = window.SC.PRESETS[id];
    if (!p) return;
    this.config.modules = (p.modules || []).slice();
    this.config.levels  = (p.levels  || []).slice();
    this.config.presetId = id;
    toast(`✅ ${p.name} preset loaded (${p.modules.length} modules)`, 'success');
  },

  bindUI() {
    document.addEventListener('click', e => {
      const a = e.target.closest('[data-wizard]');
      if (!a) return;
      const raw = (a.dataset.wizard || '').trim();
      if (!raw) return;
      // Parse "method" OR "method(arg1, 'arg2', this)" so BOTH argument-less
      // actions (next/prev/save) AND parameterised ones (showStep(2),
      // usePreset('secondary'), load(this)) dispatch correctly.
      const m = raw.match(/^([a-zA-Z_$][\w$]*)\s*(?:\((.*)\))?$/);
      if (!m) return;
      const name = m[1];
      if (typeof Wizard[name] !== 'function') {
        console.warn('[Wizard] no handler for action:', raw);
        return;
      }
      e.preventDefault();
      let args = [];
      if (m[2] != null && m[2].trim() !== '') {
        args = m[2].split(',').map(s => {
          s = s.trim();
          if (s === 'this') return a;                       // element ref
          if (s === 'true') return true;
          if (s === 'false') return false;
          if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);  // numeric arg
          return s.replace(/^['"]|['"]$/g, '');             // strip quotes
        });
      } else {
        args = [a]; // back-compat: pass the element to no-arg handlers
      }
      try { Wizard[name].apply(Wizard, args); }
      catch (err) { console.error('[Wizard] action error:', raw, err); }
    });
    document.addEventListener('input', e => {
      if (e.target.matches('[data-sync]')) {
        Wizard.config[e.target.dataset.sync] = e.target.value;
        Wizard.autosave();
      }
    });
  },

  bindAutoSave() {
    setInterval(() => this.autosave(), 30000);
  },

  autosave() {
    try { localStorage.setItem('sc-wizard-config', JSON.stringify(this.config)); } catch (e) {}
  },

  next() { if (this.step < this.totalSteps) this.showStep(this.step + 1); },
  prev() { if (this.step > 1) this.showStep(this.step - 1); },

  showStep(n) {
    n = parseInt(n, 10);
    if (!n || n < 1 || n > this.totalSteps) return;
    this.step = n;
    document.querySelectorAll('[data-step-panel]').forEach(p => {
      p.style.display = parseInt(p.dataset.stepPanel) === n ? 'block' : 'none';
    });
    document.querySelectorAll('[data-step-indicator]').forEach(el => {
      const i = parseInt(el.dataset.stepIndicator);
      el.classList.toggle('active', i === n);
      el.classList.toggle('done', i < n);
    });
    // Per-step setup is guarded so a failure never blocks navigation.
    try { if (n === 6) this.updateQuote(); } catch (e) { console.warn('[Wizard] updateQuote:', e); }
    try { if (n === 5) this.renderModulePicker(); } catch (e) { console.warn('[Wizard] renderModulePicker:', e); }
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
  },

  usePreset(id) {
    this.applyPreset(id);
    this.next();
  },

  toggleModule(id, on) {
    if (!this.config.modules) this.config.modules = [];
    const idx = this.config.modules.indexOf(id);
    if (on && idx === -1) this.config.modules.push(id);
    else if (!on && idx > -1) this.config.modules.splice(idx, 1);
    this.autosave();
    this.updateModuleCount();
  },

  updateModuleCount() {
    const c = (this.config.modules || []).length;
    const el = document.getElementById('module-count');
    if (el) el.textContent = c;
  },

  renderModulePicker() {
    const wrap = document.getElementById('module-picker');
    if (!wrap) return;
    const groups = {};
    window.SC.MODULES.forEach(m => {
      (groups[m.group] = groups[m.group] || []).push(m);
    });
    const selected = new Set(this.config.modules || []);
    wrap.innerHTML = Object.entries(groups).map(([group, mods]) => `
      <div class="card" style="margin-bottom:20px">
        <h3>${group}</h3>
        <div class="grid grid-3" style="margin-top:12px">
          ${mods.map(m => {
            const isOn = selected.has(m.id);
            return `<label class="vote-card" style="cursor:pointer">
              <input type="checkbox" data-module-id="${m.id}" ${isOn?'checked':''} onchange="Wizard.toggleModule('${m.id}', this.checked)">
              <div class="vote-candidate-name" style="text-align:left">${m.name}</div>
              <div class="vote-candidate-info" style="text-align:left">${m.desc}</div>
            </label>`;
          }).join('')}
        </div>
      </div>
    `).join('');
    this.updateModuleCount();
  },

  /* Quote calculator */
  quote: { deployment: 15000, training: 10000, data_import: 8000, custom_domain: 5000, support: 5000 },
  toggleQuote(key, on) {
    if (on) this.config.quote = this.config.quote || {};
    if (this.config.quote) this.config.quote[key] = on;
    this.updateQuote();
  },
  updateQuote() {
    let total = 0;
    const q = this.config.quote || {};
    Object.keys(this.quote).forEach(k => { if (q[k]) total += this.quote[k]; });
    const el = document.getElementById('quote-total');
    if (el) el.textContent = '₦' + total.toLocaleString();
  },

  /* Save/Load/Share */
  save() {
    const blob = new Blob([JSON.stringify(this.config, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'school-connect-config.json';
    a.click();
  },
  load(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        this.config = JSON.parse(e.target.result);
        toast('✅ Config loaded.', 'success');
        this.render();
        this.showStep(this.step);
      } catch (err) { toast('Invalid JSON file', 'danger'); }
    };
    reader.readAsText(file);
  },
  shareLink() {
    const enc = btoa(unescape(encodeURIComponent(JSON.stringify(this.config))));
    const url = location.origin + location.pathname + '?config=' + enc;
    navigator.clipboard?.writeText(url);
    toast('✅ Share link copied to clipboard.', 'success');
  },

  async previewLive() {
    const cfg = { ...this.config };
    if (!cfg.schoolName) cfg.schoolName = 'Preview School';
    const theme = window.SC.THEMES.find(t => t.id === cfg.themeId) || window.SC.THEMES[0];
    cfg.themePrimary = theme.primary;
    cfg.themeAccent = theme.accent;
    const font = window.SC.FONTS.find(f => f.id === cfg.fontId) || window.SC.FONTS[0];
    cfg.fontFamily = font.family;
    cfg.fontCss = font.css;
    
    let STYLE_CSS = '';
    try {
      const res = await fetch('assets/css/style.css');
      STYLE_CSS = await res.text();
    } catch (e) {}

    let html = Generator.pageIndex(cfg);
    // Inject CSS for preview
    html = html.replace('<link rel="stylesheet" href="assets/css/style.css">', '<style>' + STYLE_CSS + '</style>');
    // Inject inline logo for preview if available
    if (cfg.logoData) {
        html = html.replace(/src="assets\/img\/logo\.([a-z]+)"/g, 'src="' + cfg.logoData + '"');
    }
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  },

  /* ✨ FULL interactive multi-page preview — click through every page with
     sample data before downloading (runs the real pages against a mock DB). */
  async fullPreview() {
    const cfg = { ...this.config };
    if (!cfg.modules || !cfg.modules.length) {
      cfg.modules = window.SC.PRESETS.secondary.modules.slice();
      cfg.levels = window.SC.PRESETS.secondary.levels.slice();
    }
    let STYLE_CSS = '';
    try { STYLE_CSS = await (await fetch('assets/css/style.css')).text(); } catch (e) {}
    let html = Generator.fullPreviewHtml(cfg);
    html = html.replace('__STYLE__', STYLE_CSS);
    if (cfg.logoData) html = html.replace(/src="assets\/img\/logo\.([a-z]+)"/g, 'src="' + cfg.logoData + '"');
    // Prefer an in-page modal iframe if present; else open a new tab.
    const frame = document.getElementById('fullPreviewFrame');
    if (frame) {
      frame.srcdoc = html;
      const modal = document.getElementById('fullPreviewModal');
      if (modal) modal.classList.add('show');
    } else {
      const w = window.open('', '_blank');
      w.document.open(); w.document.write(html); w.document.close();
    }
  },

  closeFullPreview() {
    const modal = document.getElementById('fullPreviewModal');
    if (modal) modal.classList.remove('show');
  },

  /* ✨ Pricing estimator — itemised "Done-for-You" quote (platform stays free) */
  selectedAddons() {
    return [...document.querySelectorAll('[data-addon]:checked')].map(c => c.value);
  },
  recalcQuote() {
    const est = Generator.estimate(this.config, this.selectedAddons());
    const box = document.getElementById('quote-lines');
    const tot = document.getElementById('quote-total');
    if (box) box.innerHTML = est.lines.map(l => `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:.88rem"><span>${l.label}</span><span>${est.currency}${l.amount.toLocaleString()}</span></div>`).join('');
    if (tot) tot.textContent = est.currency + est.total.toLocaleString();
  },

  /* Generate the ZIP */
  async generate() {
    const btn = document.getElementById('generate-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin">⏳</span> Building ZIP…'; }
    try {
      const cfg = { ...this.config };
      if (!cfg.schoolName) { toast('Please enter a school name first.', 'warning'); this.showStep(1); return; }
      // Default modules from secondary preset if none selected
      if (!cfg.modules || cfg.modules.length === 0) {
        cfg.modules = window.SC.PRESETS.secondary.modules.slice();
        cfg.levels  = window.SC.PRESETS.secondary.levels.slice();
      }
      const { blob, fileName } = await Generator.build(cfg);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      toast('🎉 ZIP downloaded! See DEPLOYMENT-GUIDE.md in the ZIP for next steps.', 'success', 6000);
    } catch (e) {
      console.error(e);
      toast('Generation failed: ' + e.message, 'danger', 6000);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '🚀 Generate & Download ZIP'; }
    }
  },

  render() {
    /* Re-render every input that has data-sync attribute */
    document.querySelectorAll('[data-sync]').forEach(el => {
      const key = el.dataset.sync;
      if (this.config[key] != null && el.value !== this.config[key]) el.value = this.config[key];
    });
  }
};

window.Wizard = Wizard;
console.log('%c[School Connect Gen v7] wizard ready.', 'color:#4f46e5');
