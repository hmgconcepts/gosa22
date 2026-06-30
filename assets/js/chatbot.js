/* ====================================================================
   chatbot.js — School Connect Gen v7
   Rules-based onboarding assistant (NO AI API, fully offline, free).
   ==================================================================== */

const Chatbot = {
  open: false,
  history: [],

  init() {
    if (this._init) return;
    this._init = true;
    this.bindUI();
    // Pre-seed greeting
    this.history.push({ from:'bot', msg:'Hello! 👋 I\'m your School Connect assistant. I can help you with the builder, deployment, features and more. What would you like to know?' });
  },

  bindUI() {
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-chatbot]');
      if (!t) return;
      const a = t.dataset.chatbot;
      if (a === 'open') this.toggle(true);
      if (a === 'close') this.toggle(false);
      if (a === 'send') this.handleSend();
      if (a === 'suggest') {
        const inp = document.getElementById('chatbot-input');
        if (inp) { inp.value = t.textContent.trim(); this.handleSend(); }
      }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.id === 'chatbot-input') {
        e.preventDefault();
        this.handleSend();
      }
    });
  },

  toggle(force) {
    const w = document.getElementById('chatbot-window');
    if (!w) return;
    this.open = force !== undefined ? force : !this.open;
    w.style.display = this.open ? 'flex' : 'none';
    if (this.open && !this.history.length) {
      this.history.push({ from:'bot', msg:'Hello! What would you like to know?' });
    }
    this.render();
  },

  handleSend() {
    const inp = document.getElementById('chatbot-input');
    if (!inp) return;
    const msg = inp.value.trim();
    if (!msg) return;
    this.history.push({ from:'user', msg });
    inp.value = '';
    this.render();
    // Tiny typing delay for friendliness
    setTimeout(() => {
      const reply = this.respond(msg);
      this.history.push({ from:'bot', msg: reply });
      this.render();
    }, 350);
  },

  respond(msg) {
    const kb = (window.SC && window.SC.CHATBOT_KB) || [];
    const lower = msg.toLowerCase();
    for (const entry of kb) {
      if (entry.match.some(k => lower.includes(k))) return entry.reply;
    }
    // Generic helpful fallback
    if (lower.includes('thank')) return 'You\'re welcome! 🎉';
    if (lower.includes('bye'))   return 'Goodbye! Come back anytime.';
    if (lower.includes('hi') || lower.includes('hello')) return 'Hi there! Ask me anything about School Connect.';
    return 'I\'m not sure about that one. Try asking about: **build**, **deploy**, **voting**, **notifications**, **install**, **features**, **cost**, or **SEO**. Or tap the WhatsApp button for human help.';
  },

  render() {
    const list = document.getElementById('chatbot-messages');
    if (!list) return;
    list.innerHTML = this.history.map(m => `
      <div class="chat-bubble chat-${esc(m.from)}">
        ${esc(m.msg).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}
      </div>
    `).join('');
    list.scrollTop = list.scrollHeight;
  }
};

window.Chatbot = Chatbot;
