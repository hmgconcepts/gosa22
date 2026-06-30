/* ====================================================================
   pwa-install.js — School Connect Gen v7
   Enforces PWA install with a beautiful, persistent banner.
   Tracks install state. Free. No AI.
   ==================================================================== */

const PWAInstall = {
  deferredPrompt: null,
  installed: false,
  dismissedAt: null,
  showIntervalDays: 2,

  init() {
    // Listen for the browser's beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      this.deferredPrompt = e;
      // Wait a beat so the page is interactive
      setTimeout(() => this.maybeShowBanner(), 4000);
    });

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      this.installed = true;
      this.deferredPrompt = null;
      localStorage.setItem('sc_pwa_installed', '1');
      this.hideBanner();
      toast('🎉 App installed! Look for "School Connect" on your home screen.', 'success', 6000);
    });

    // Already installed (from previous session)?
    if (localStorage.getItem('sc_pwa_installed') === '1') this.installed = true;

    // Standalone mode (running as installed app)?
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      this.installed = true;
    }
    if (window.navigator && window.navigator.standalone === true) {
      this.installed = true;
    }

    // Show in-app "install" hint even when already installed (helps teachers show parents)
    setTimeout(() => this.maybeShowBanner(), 6000);

    this.bindUI();
  },

  bindUI() {
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-pwa-action]');
      if (!t) return;
      const action = t.dataset.pwaAction;
      if (action === 'install')  this.prompt();
      if (action === 'dismiss')  this.dismiss();
      if (action === 'ios-help') this.showIOSHelp();
      if (action === 'never')    this.neverShow();
    });
  },

  maybeShowBanner() {
    if (this.installed) return;
    const banner = document.getElementById('pwa-install-banner');
    if (!banner) return;
    if (this.deferredPrompt) {
      // Chrome/Edge/Android
      banner.classList.add('show');
      return;
    }
    // iOS Safari or already-dismissed
    if (this.isIOS() && !this.installed) {
      banner.classList.add('show');
      const msg = banner.querySelector('.pwa-install-msg');
      if (msg) msg.innerHTML = 'Tap <strong>Share</strong> (the square with arrow ↑) then choose <strong>Add to Home Screen</strong>.';
    }
  },

  async prompt() {
    if (!this.deferredPrompt) {
      if (this.isIOS()) this.showIOSHelp();
      else toast('Use your browser\'s "Add to Home Screen" option.', 'info', 5000);
      return;
    }
    this.deferredPrompt.prompt();
    const choice = await this.deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      toast('Installing…', 'success');
    } else {
      this.dismiss();
    }
    this.deferredPrompt = null;
  },

  dismiss() {
    this.hideBanner();
    localStorage.setItem('sc_pwa_dismissed_at', Date.now().toString());
  },

  neverShow() {
    this.hideBanner();
    localStorage.setItem('sc_pwa_never', '1');
  },

  hideBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.classList.remove('show');
  },

  isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  },

  showIOSHelp() {
    openModal('Install on iPhone / iPad', `
      <div style="text-align:center;padding:12px 0">
        <div style="font-size:3rem;margin-bottom:12px">📱</div>
        <ol style="text-align:left;line-height:1.8;padding-left:24px">
          <li>Open this page in <strong>Safari</strong> (not Chrome).</li>
          <li>Tap the <strong>Share</strong> button <span style="font-size:1.4rem">⬆️</span> at the bottom.</li>
          <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
          <li>Tap <strong>Add</strong> in the top right.</li>
        </ol>
        <p style="margin-top:16px;color:var(--gray-600);font-size:0.88rem">The app will appear on your home screen with the school logo. It works offline and sends push notifications.</p>
      </div>
    `);
  }
};

window.PWAInstall = PWAInstall;

console.log('%c[School Connect Gen v7] PWA install enforcement ready.', 'color:#06b6d4;font-weight:bold');
