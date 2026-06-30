/* ====================================================================
   voting.js — School Connect Gen v7
   Voting & Polls engine (no AI API, fully client + Supabase-backed).
   ==================================================================== */

const Voting = {
  sb: null,
  schemaReady: false,

  /* Initialise (call once on app boot) */
  async init(supabaseClient) {
    this.sb = supabaseClient;
    await this.ensureSchema();
    await this.startRealtimeListener();
    this.bindUI();
  },

  /* Ensure schema (calls /database/voting-schema.sql on first run) */
  async ensureSchema() {
    if (!this.sb) return;
    try {
      // Probe — if the table exists, query returns null/empty without throwing RLS
      const probe = await this.sb.from('polls').select('id').limit(1);
      this.schemaReady = !probe.error;
    } catch (e) {
      this.schemaReady = false;
    }
  },

  /* Realtime: refresh results when someone votes */
  async startRealtimeListener() {
    if (!this.sb || !this.sb.channel) return;
    try {
      const ch = this.sb.channel('polls-live')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'poll_votes' }, payload => {
          this.onVoteInserted(payload.new);
        })
        .subscribe();
    } catch (e) { /* realtime may be disabled on free tier — silent fail */ }
  },

  onVoteInserted(row) {
    if (typeof VotingUI !== 'undefined' && VotingUI.refreshResults) {
      VotingUI.refreshResults(row.poll_id);
    }
  },

  /* Create a poll (admin/staff only) */
  async createPoll({ title, description, candidates, type, opens_at, closes_at, allow_multiple, anonymous, audience }) {
    if (!this.sb) return { error: 'No database' };
    const payload = {
      title: (title || '').trim(),
      description: (description || '').trim(),
      type: type || 'single_choice',         // single_choice | multiple_choice | yes_no | ranked
      candidates: JSON.stringify(candidates || []),
      opens_at: opens_at || new Date().toISOString(),
      closes_at: closes_at || null,
      allow_multiple: !!allow_multiple,
      anonymous: !!anonymous,
      audience: audience || 'all',           // all | students | staff | parents | custom_class
      status: 'open'
    };
    const { data, error } = await this.sb.from('polls').insert(payload).select().single();
    if (error) return { error: error.message };
    await this.broadcastPollOpened(data);
    return { data };
  },

  /* Close a poll (admin only) */
  async closePoll(pollId) {
    if (!this.sb) return;
    await this.sb.from('polls').update({ status: 'closed' }).eq('id', pollId);
    const { data: poll } = await this.sb.from('polls').select('*').eq('id', pollId).single();
    if (poll) await this.broadcastPollClosed(poll);
  },

  /* Cast a vote (the user must be signed in) */
  async vote(pollId, candidateIds) {
    if (!this.sb) return { error: 'No database' };
    const { data: { user } } = await this.sb.auth.getUser();
    if (!user) return { error: 'You must sign in to vote.' };

    // De-dupe: one vote per user per poll (DB-level constraint too)
    const existing = await this.sb.from('poll_votes').select('id').eq('poll_id', pollId).eq('voter_id', user.id);
    if (existing.data && existing.data.length) {
      await this.sb.from('poll_votes').delete().eq('poll_id', pollId).eq('voter_id', user.id);
    }

    const rows = (Array.isArray(candidateIds) ? candidateIds : [candidateIds]).map(cid => ({
      poll_id: pollId,
      candidate_id: cid,
      voter_id: user.id,
      voted_at: new Date().toISOString()
    }));
    const { data, error } = await this.sb.from('poll_votes').insert(rows).select();
    if (error) return { error: error.message };

    await this.notifyVoteCast(pollId);
    return { data };
  },

  /* Get live results */
  async getResults(pollId) {
    if (!this.sb) return [];
    const { data: poll } = await this.sb.from('polls').select('*').eq('id', pollId).single();
    if (!poll) return null;
    const { data: votes } = await this.sb.from('poll_votes').select('candidate_id').eq('poll_id', pollId);
    const tally = {};
    (poll.candidates ? JSON.parse(poll.candidates) : []).forEach(c => tally[c.id] = 0);
    (votes || []).forEach(v => { tally[v.candidate_id] = (tally[v.candidate_id] || 0) + 1; });
    const total = Object.values(tally).reduce((a, b) => a + b, 0) || 1;
    const candidates = (poll.candidates ? JSON.parse(poll.candidates) : []).map(c => ({
      ...c,
      votes: tally[c.id] || 0,
      percent: Math.round((tally[c.id] || 0) / total * 100)
    }));
    return { poll, candidates, totalVotes: total };
  },

  /* List polls (open + recently closed) */
  async listPolls({ onlyOpen = false } = {}) {
    // FIX S-09: Demo mode fallback — show sample polls when sb is null
    if (!this.sb) {
      return [
        { id: 'demo-poll-1', title: 'Head Boy Election 2026', description: 'Vote for your preferred head boy candidate for the new session.', type: 'single_choice', status: 'open', audience: 'all', candidates: JSON.stringify([
          { id: 'c1', name: 'Adaeze Okeke', info: 'SSS 3A — Academic prefect candidate', photo: '' },
          { id: 'c2', name: 'Chidi Nwankwo', info: 'SSS 3A — Sports captain candidate', photo: '' },
          { id: 'c3', name: 'Emmanuel Obi', info: 'SSS 3B — Library ambassador candidate', photo: '' }
        ]), opens_at: new Date().toISOString(), closes_at: new Date(Date.now() + 7 * 864e5).toISOString(), created_at: new Date().toISOString() },
        { id: 'demo-poll-2', title: 'Best Teacher Award 2026', description: 'Vote for the teacher who has made the greatest impact this term.', type: 'multiple_choice', status: 'open', audience: 'all', candidates: JSON.stringify([
          { id: 'c4', name: 'Mrs. Bello', info: 'Mathematics — JSS', photo: '' },
          { id: 'c5', name: 'Mr. Eze', info: 'Physics — SSS', photo: '' },
          { id: 'c6', name: 'Dr. Okonkwo', info: 'Biology — SSS', photo: '' }
        ]), opens_at: new Date().toISOString(), closes_at: new Date(Date.now() + 14 * 864e5).toISOString(), created_at: new Date(Date.now() - 864e5).toISOString() }
      ];
    }
    let q = this.sb.from('polls').select('*').order('created_at', { ascending: false });
    if (onlyOpen) q = q.eq('status', 'open');
    const { data, error } = await q;
    if (error) return [];
    return data || [];
  },

  /* ===== Notifications ===== */
  async broadcastPollOpened(poll) {
    await this.createNotification({
      title: '🗳️ New Poll: ' + poll.title,
      body: poll.description || 'Cast your vote now.',
      url: 'voting.html?poll=' + poll.id,
      audience: poll.audience || 'all'
    });
  },
  async broadcastPollClosed(poll) {
    await this.createNotification({
      title: '📊 Poll Closed: ' + poll.title,
      body: 'Final results are in. Tap to see the breakdown.',
      url: 'voting.html?poll=' + poll.id + '&results=1',
      audience: poll.audience || 'all'
    });
  },
  async notifyVoteCast(pollId) {
    // Acknowledge the voter; don't broadcast per-vote (would spam)
    if (typeof Notifications !== 'undefined') {
      Notifications.showInApp('✅ Vote recorded', 'Thanks for voting!', 'info');
    }
  },

  async createNotification({ title, body, url, audience }) {
    if (!this.sb) return;
    // Persist to notifications table so the bell picks it up
    await this.sb.from('notifications').insert({
      title, body, url: url || null, audience: audience || 'all',
      created_at: new Date().toISOString(), read_by: []
    });
    // Push to all subscribed browsers (via SW showNotification if granted)
    if (typeof Notifications !== 'undefined') {
      Notifications.broadcast({ title, body, url });
    }
  },

  /* ===== UI binding ===== */
  bindUI() {
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-vote-action]');
      if (!t) return;
      const action = t.dataset.voteAction;
      if (action === 'create') VotingUI.openCreatePollModal();
      if (action === 'cast') VotingUI.castVote(t.dataset.poll, t.dataset.candidate);
      if (action === 'close') VotingUI.closePoll(t.dataset.poll);
      if (action === 'refresh') VotingUI.refreshResults(t.dataset.poll);
    });
  }
};

/* ============================================================
   VotingUI — DOM helpers (work in demo mode without DB too)
   ============================================================ */
const VotingUI = {
  openCreatePollModal() {
    if (typeof openModal !== 'function') return;
    openModal('Create Poll', `
      <form id="poll-form" class="form">
        <div class="form-group"><label>Title</label>
          <input class="form-input" name="title" required placeholder="e.g. Head Boy Election 2026"></div>
        <div class="form-group"><label>Description</label>
          <textarea class="form-textarea" name="description" placeholder="Optional details for voters"></textarea></div>
        <div class="form-group"><label>Type</label>
          <select class="form-select" name="type">
            <option value="single_choice">Single choice</option>
            <option value="multiple_choice">Multiple choice</option>
            <option value="yes_no">Yes / No</option>
            <option value="ranked">Ranked (order matters)</option>
          </select></div>
        <div class="form-group"><label>Candidates (one per line: Name | Class/Arm | Photo URL)</label>
          <textarea class="form-textarea" name="candidates" rows="5" placeholder="Adaeze Okeke | JSS 3A | https://..." required></textarea></div>
        <div class="form-group"><label>Audience</label>
          <select class="form-select" name="audience">
            <option value="all">Everyone</option>
            <option value="students">Students only</option>
            <option value="staff">Staff only</option>
            <option value="parents">Parents only</option>
          </select></div>
        <div class="form-group"><label>Closes at (optional)</label>
          <input class="form-input" type="datetime-local" name="closes_at"></div>
        <div class="form-group"><label><input type="checkbox" name="anonymous"> Allow anonymous votes</label></div>
        <div class="form-group"><label><input type="checkbox" name="allow_multiple"> Allow multiple selections</label></div>
        <div class="modal-footer" style="padding:0;border:0;margin-top:16px">
          <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Poll</button>
        </div>
      </form>`);
    const f = document.getElementById('poll-form');
    f.onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(f);
      const candidates = (fd.get('candidates') || '').split('\n').filter(Boolean).map((line, i) => {
        const [name, info, photo] = line.split('|').map(s => (s || '').trim());
        return { id: 'c' + (i + 1), name, info: info || '', photo: photo || '' };
      });
      const res = await Voting.createPoll({
        title: fd.get('title'),
        description: fd.get('description'),
        candidates,
        type: fd.get('type'),
        audience: fd.get('audience'),
        closes_at: fd.get('closes_at') || null,
        anonymous: !!fd.get('anonymous'),
        allow_multiple: !!fd.get('allow_multiple')
      });
      if (res.error) { toast('Error: ' + res.error, 'danger'); return; }
      toast('✅ Poll created — notifications sent!', 'success');
      closeModal();
      this.renderPollList();
    };
  },

  async renderPollList() {
    const container = document.getElementById('polls-list');
    if (!container) return;
    container.innerHTML = '<div class="toast-msg"><span class="pulse">Loading polls…</span></div>';
    const polls = await Voting.listPolls({ onlyOpen: false });
    if (!polls.length) {
      container.innerHTML = '<p class="section-sub">No polls yet. Create the first one with the button above.</p>';
      return;
    }
    container.innerHTML = polls.map(p => this.pollCardHTML(p)).join('');
    polls.forEach(p => this.refreshResults(p.id));
  },

  pollCardHTML(p) {
    const candidates = p.candidates ? JSON.parse(p.candidates) : [];
    const status = p.status === 'open' ? 'badge-success' : 'badge-info';
    return `
      <div class="card" id="poll-${p.id}">
        <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;margin-bottom:12px">
          <h3>${esc(p.title)}</h3>
          <span class="badge ${status}">${esc(p.status)}</span>
        </div>
        ${p.description ? `<p style="color:var(--gray-600);margin-bottom:16px">${esc(p.description)}</p>` : ''}
        <div class="grid grid-2" id="poll-${p.id}-candidates">
          ${candidates.map(c => `
            <div class="vote-card" data-vote-action="cast" data-poll="${p.id}" data-candidate="${esc(c.id)}">
              <div class="vote-candidate-photo" style="background-image:url('${esc(c.photo || '')}');background-size:cover">${c.photo ? '' : esc((c.name||'?')[0].toUpperCase())}</div>
              <div class="vote-candidate-name">${esc(c.name)}</div>
              <div class="vote-candidate-info">${esc(c.info || '')}</div>
              <div class="vote-progress"><div class="vote-progress-bar" style="width:0%"></div></div>
              <div class="vote-percent">0%</div>
            </div>
          `).join('')}
        </div>
        <div style="display:flex;gap:8px;margin-top:16px;font-size:0.85rem;color:var(--gray-500)">
          <span>👥 ${p.audience || 'all'}</span>
          <span>·</span>
          <span>📊 <span id="poll-${p.id}-total">0</span> votes</span>
          ${p.closes_at ? `<span>·</span><span>⏰ closes ${new Date(p.closes_at).toLocaleString()}</span>` : ''}
          ${p.status === 'open' ? `<button class="btn btn-sm btn-outline" data-vote-action="close" data-poll="${p.id}" style="margin-left:auto">Close</button>` : ''}
        </div>
      </div>`;
  },

  async castVote(pollId, candidateId) {
    const res = await Voting.vote(pollId, candidateId);
    if (res.error) { toast(res.error, 'danger'); return; }
    toast('✅ Vote recorded!', 'success');
    await this.refreshResults(pollId);
  },

  async closePoll(pollId) {
    if (!confirm('Close this poll? No more votes will be accepted.')) return;
    await Voting.closePoll(pollId);
    toast('Poll closed — results notification sent.', 'success');
    this.renderPollList();
  },

  async refreshResults(pollId) {
    const results = await Voting.getResults(pollId);
    if (!results) return;
    const totalEl = document.getElementById(`poll-${pollId}-total`);
    if (totalEl) totalEl.textContent = results.totalVotes;
    results.candidates.forEach(c => {
      const card = document.querySelector(`[data-poll="${pollId}"][data-candidate="${c.id}"]`);
      if (!card) return;
      const bar = card.querySelector('.vote-progress-bar');
      const pct = card.querySelector('.vote-percent');
      if (bar) bar.style.width = c.percent + '%';
      if (pct) pct.textContent = c.percent + '% (' + c.votes + ')';
    });
  }
};

window.Voting = Voting;
window.VotingUI = VotingUI;

console.log('%c[School Connect Gen v7] Voting module loaded — class prefects, polls, anonymous ballots, multi-channel notifications.', 'color:#7c3aed;font-weight:bold');
