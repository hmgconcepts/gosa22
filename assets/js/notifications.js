/* ====================================================================
   notifications.js — School Connect Gen v7
   Multi-channel notifications: in-app bell, browser push, email, WhatsApp, SMS.
   100% free. No AI API.
   ==================================================================== */

const Notifications = {
  sb: null,
  sw: null,
  permission: 'default',
  bellBound: false,

  /* ---------- Init ---------- */
  async init(supabaseClient, serviceWorkerRegistration) {
    this.sb = supabaseClient;
    this.sw = serviceWorkerRegistration || null;

    if ('Notification' in window) {
      this.permission = Notification.permission;
    }

    this.bindBell();
    await this.startRealtimeListener();
    await this.refreshUnreadCount();
    return this;
  },

  /* ---------- Permission ---------- */
  async requestPermission() {
    if (!('Notification' in window)) {
      toast('Push notifications not supported on this browser.', 'warning');
      return false;
    }
    if (this.permission === 'granted') return true;
    if (this.permission === 'denied') {
      toast('Notifications are blocked. Enable them in browser settings.', 'warning');
      return false;
    }
    const res = await Notification.requestPermission();
    this.permission = res;
    if (res === 'granted') {
      await this.subscribeToPush();
      toast('🔔 Notifications enabled!', 'success');
      return true;
    }
    return false;
  },

  /* Subscribe this device to push (VAPID public key is safe to ship) */
  async subscribeToPush() {
    if (!this.sw || !this.sw.pushManager) return;
    try {
      const VAPID_PUBLIC = (window.SC && window.SC.VAPID_PUBLIC) || 'BAd-default-Pub-Key-Replaced-At-Deploy';
      let sub = await this.sw.pushManager.getSubscription();
      if (!sub) {
        sub = await this.sw.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC)
        });
      }
      // Persist subscription in DB so a server function can push to it later
      if (this.sb) {
        const { data: { user } } = await this.sb.auth.getUser();
        if (user) {
          await this.sb.from('push_subscriptions').upsert({
            user_id: user.id,
            subscription: JSON.stringify(sub),
            user_agent: navigator.userAgent.slice(0, 200),
            updated_at: new Date().toISOString()
          });
        }
      }
    } catch (e) {
      console.warn('[Notifications] push subscribe failed (likely no VAPID keys yet):', e.message);
    }
  },

  /* ---------- Bell UI ---------- */
  bindBell() {
    if (this.bellBound) return;
    const bell = document.getElementById('notif-bell');
    if (!bell) return;
    this.bellBound = true;
    bell.addEventListener('click', e => {
      e.stopPropagation();
      this.toggleDropdown();
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('#notif-dropdown') && !e.target.closest('#notif-bell')) {
        this.closeDropdown();
      }
    });
  },

  toggleDropdown() {
    const dd = document.getElementById('notif-dropdown');
    if (!dd) return;
    const isOpen = dd.classList.contains('show');
    if (isOpen) this.closeDropdown();
    else { dd.classList.add('show'); this.loadDropdownItems(); }
  },
  closeDropdown() {
    const dd = document.getElementById('notif-dropdown');
    if (dd) dd.classList.remove('show');
  },

  async loadDropdownItems() {
    const list = document.getElementById('notif-list');
    if (!list) return;
    list.innerHTML = '<div class="toast-msg" style="padding:24px;text-align:center"><span class="pulse">Loading…</span></div>';
    const items = await this.fetchRecent(10);
    if (!items.length) {
      list.innerHTML = '<div class="toast-msg" style="padding:24px;text-align:center">No notifications yet.</div>';
      return;
    }
    list.innerHTML = items.map(n => `
      <div class="notif-item" onclick="${n.url ? `location.href='${esc(n.url)}'` : ''}">
        <div class="notif-item-title">${esc(n.title)}</div>
        <div class="notif-item-msg">${esc(n.body || '')}</div>
        <div class="notif-item-time">${timeAgo(n.created_at)}</div>
      </div>`).join('');
  },

  async fetchRecent(limit = 20) {
    if (!this.sb) return [];
    const { data, error } = await this.sb
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return [];
    return data || [];
  },

  async refreshUnreadCount() {
    const badge = document.getElementById('notif-badge');
    if (!badge || !this.sb) return;
    const items = await this.fetchRecent(50);
    const { data: { user } } = await this.sb.auth.getUser();
    const unread = items.filter(n => !(n.read_by || []).includes(user?.id || '')).length;
    if (unread > 0) {
      badge.textContent = unread > 99 ? '99+' : unread;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  },

  async markAllRead() {
    if (!this.sb) return;
    const { data: { user } } = await this.sb.auth.getUser();
    if (!user) return;
    const items = await this.fetchRecent(50);
    for (const n of items) {
      const read_by = n.read_by || [];
      if (!read_by.includes(user.id)) read_by.push(user.id);
      await this.sb.from('notifications').update({ read_by }).eq('id', n.id);
    }
    await this.refreshUnreadCount();
  },

  /* ---------- Create + Broadcast ---------- */
  async create({ title, body, url, audience = 'all', priority = 'normal', channels = ['inapp'] }) {
    if (!this.sb) return { error: 'No database' };
    const row = {
      title: (title || '').trim(),
      body: (body || '').trim(),
      url: url || null,
      audience,
      priority,
      channels: JSON.stringify(channels),
      read_by: [],
      created_at: new Date().toISOString()
    };
    const { data, error } = await this.sb.from('notifications').insert(row).select().single();
    if (error) return { error: error.message };

    // Fire each requested channel
    if (channels.includes('inapp'))  this.refreshUnreadCount();
    if (channels.includes('push'))    this.broadcast({ title, body, url });
    if (channels.includes('email'))   this.composeEmail({ title, body, url });
    if (channels.includes('whatsapp'))this.composeWhatsApp({ title, body });
    if (channels.includes('sms'))     this.composeSMS({ title, body });

    return { data };
  },

  /* Show OS-level notification (push) */
  async broadcast({ title, body, url, tag }) {
    if (this.permission !== 'granted') return;
    try {
      if (this.sw && this.sw.showNotification) {
        await this.sw.showNotification(title, {
          body,
          icon: 'assets/img/logo.svg',
          badge: 'assets/img/logo.svg',
          data: { url: url || '/' },
          tag: tag || ('sc-' + Date.now()),
          requireInteraction: false,
          vibrate: [200, 100, 200]
        });
      } else if ('Notification' in window) {
        const n = new Notification(title, { body, icon: 'assets/img/logo.svg', tag });
        n.onclick = () => { if (url) location.href = url; n.close(); };
      }
    } catch (e) { /* silent */ }
  },

  /* Show a transient toast (in-app only) */
  showInApp(title, body, type = 'info') {
    toast(`${title} — ${body}`, type);
  },

  /* Email composer (opens user's mail client with BCC to class list — free) */
  composeEmail({ title, body, url }) {
    const subject = encodeURIComponent(title);
    const text = encodeURIComponent(body + (url ? '\n\nOpen: ' + location.origin + '/' + url : ''));
    // Open blank — staff fills in the BCC list from the class
    const href = `mailto:?subject=${subject}&body=${text}`;
    if (window.SC_CONFIRM_FREE_EMAIL) {
      window.open(href);
    }
  },

  /* WhatsApp deep link */
  composeWhatsApp({ title, body }) {
    const text = encodeURIComponent('*' + title + '*\n\n' + body);
    // Open with single wa.me — staff pastes recipient list. Truly free.
    const href = `https://wa.me/?text=${text}`;
    if (window.SC_CONFIRM_FREE_WA) window.open(href);
  },

  /* SMS fallback (no real SMS gateway) */
  composeSMS({ title, body }) {
    const text = encodeURIComponent(title + ' — ' + body);
    const href = `sms:?body=${text}`;
    if (window.SC_CONFIRM_FREE_SMS) window.open(href);
  },

  /* ---------- Realtime listener (bell auto-updates) ---------- */
  async startRealtimeListener() {
    if (!this.sb || !this.sb.channel) return;
    try {
      this.sb.channel('notifications-live')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
          const n = payload.new;
          this.refreshUnreadCount();
          this.broadcast({ title: n.title, body: n.body, url: n.url, tag: 'n-' + n.id });
        })
        .subscribe();
    } catch (e) { /* realtime optional */ }
  }
};

/* ============================================================
   Helpers
   ============================================================ */

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return min + 'm ago';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + 'h ago';
  const day = Math.floor(hr / 24);
  if (day < 30) return day + 'd ago';
  return new Date(iso).toLocaleDateString();
}

/* Re-export for window */
window.Notifications = Notifications;
window.timeAgo = timeAgo;

console.log('%c[School Connect Gen v7] Notifications ready — in-app bell + browser push + email + WhatsApp + SMS.', 'color:#10b981;font-weight:bold');
