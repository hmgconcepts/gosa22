/**
 * School Connect — full interactive multi-page PREVIEW.
 * Builds a single self-contained HTML document that runs the REAL generated
 * app (app.js + modules.js) against a MOCK Supabase client seeded with demo
 * data, so the operator/client can click through every page before downloading.
 * No backend needed — 100% in the iframe.
 */
const Preview = {
    demo(c) {
        // Seeded sample data so every module shows something realistic.
        const depts = (c.departments && c.departments.length) ? c.departments : ['Sciences', 'Arts / Humanities', 'Commercial'];
        const klasses = ['JSS 1A', 'JSS 2B', 'SSS 1A', 'SSS 2C', 'Primary 5', 'SSS 3A'];
        const names = ['Grace Adeyemi', 'John Okoro', 'Mary Bello', 'Daniel Musa', 'Esther Obi', 'Samuel Eze', 'Ruth Ali', 'Peter Udo'];
        const profiles = names.map((n, i) => ({
            id: 'demo-' + i, full_name: n, email: n.split(' ')[0].toLowerCase() + '@demo.org',
            phone: '0803000000' + i, department: depts[i % depts.length], class_name: klasses[i % klasses.length],
            admission_no: 'STD/' + (1000 + i), guardian_name: 'Mr/Mrs ' + n.split(' ')[1], guardian_phone: '0805000000' + i,
            role: i === 0 ? 'admin' : (i === 1 ? 'staff' : 'student'), status: 'approved',
            birth_month: ((i * 2) % 12) + 1, birth_day: (i * 3 % 27) + 1, occupation: ['Teacher', 'Student', 'Student', 'Student', 'Student'][i % 5]
        }));
        const me = profiles[0];
        const today = new Date();
        const fmt = d => d.toISOString().slice(0, 10);
        return {
            me,
            tables: {
                profiles,
                finances: [
                    { id: 'f1', date: fmt(today), description: 'Sunday Offering', type: 'income', amount: 125000 },
                    { id: 'f2', date: fmt(today), description: 'Tithe', type: 'income', amount: 240000 },
                    { id: 'f3', date: fmt(today), description: 'Generator Fuel', type: 'expense', amount: 35000 },
                    { id: 'f4', date: fmt(today), description: 'Instruments Repair', type: 'expense', amount: 50000 }
                ],
                events: [
                    { id: 'e1', title: 'Sunday Service', event_date: new Date(today.getTime() + 2 * 864e5).toISOString(), location: 'Main Auditorium', description: 'Weekly worship service' },
                    { id: 'e2', title: 'Choir Rehearsal', event_date: new Date(today.getTime() + 4 * 864e5).toISOString(), location: 'Music Room', description: '' },
                    { id: 'e3', title: 'Annual Convention', event_date: new Date(today.getTime() + 30 * 864e5).toISOString(), location: 'Camp Ground', description: 'Three days of grace' }
                ],
                announcements: [
                    { id: 'a1', title: 'Welcome to our new portal!', body: 'Please complete your profile and upload a photo.', created_at: today.toISOString() },
                    { id: 'a2', title: 'Workers meeting Saturday', body: 'All department heads to attend by 4pm.', created_at: today.toISOString() }
                ],
                resources: [
                    { id: 'r1', title: 'Sunday Sermon - Faith', url: '#', description: 'Audio + notes' },
                    { id: 'r2', title: 'Choir Song Sheet', url: '#', description: 'PDF' }
                ],
                prayer_requests: [
                    { id: 'p1', title: 'Journey mercies', body: 'Travelling next week.', created_at: today.toISOString() }
                ],
                attendance: [
                    { id: 'at1', member_id: 'demo-1', service_date: fmt(today), status: 'present' },
                    { id: 'at2', member_id: 'demo-2', service_date: fmt(today), status: 'present' }
                ],
                tasks: [
                    { id: 't1', title: 'Set up sound system', assignee_id: 'demo-0', status: 'open', due_date: fmt(today) }
                ],
                gallery: [
                    { id: 'g1', title: 'Inter-house Sports', album: 'Sports 2026', image_url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400' }
                ],
                classes: [
                    { id: 'c1', name: 'JSS 1', arm: 'A', form_teacher: 'Mrs. Bello', subjects: 'Maths, English, Basic Science' },
                    { id: 'c2', name: 'SSS 2', arm: 'C', form_teacher: 'Mr. Eze', subjects: 'Physics, Chemistry, Biology' }
                ],
                results: [
                    { id: 'r1', student_id: 'demo-2', subject: 'Mathematics', term: 'First Term', ca_score: 32, exam_score: 55, grade: 'A' },
                    { id: 'r2', student_id: 'demo-2', subject: 'English', term: 'First Term', ca_score: 28, exam_score: 40, grade: 'B' }
                ],
                fees: [
                    { id: 'fe1', student_id: 'demo-2', profiles: { full_name: 'Mary Bello' }, term: 'First Term', amount: 75000, paid: 75000, status: 'paid' },
                    { id: 'fe2', student_id: 'demo-3', profiles: { full_name: 'Daniel Musa' }, term: 'First Term', amount: 75000, paid: 30000, status: 'part' }
                ],
                timetable: [
                    { id: 'tt1', class_name: 'JSS 1A', day: 'Monday', period: '8:00-8:40', subject: 'Mathematics', teacher: 'Mrs. Bello' }
                ],
                assignments: [
                    { id: 'as1', title: 'Algebra worksheet', class_name: 'JSS 1A', subject: 'Maths', due_date: fmt(today), details: 'Questions 1-10' }
                ],
                library: [
                    { id: 'lb1', title: 'Things Fall Apart', author: 'Chinua Achebe', code: 'LIT-001', status: 'available' }
                ],
                transport: [
                    { id: 'tr1', route: 'Route A - Town', driver: 'Mr. Sule', phone: '08030000000', pickup: 'Central Market, Stadium' }
                ],
                cbt_exams: [
                    { id: 'cb1', title: 'Maths Quiz - Week 4', class_name: 'JSS 1A', subject: 'Mathematics', duration_min: 20, is_open: true }
                ],
                cbt_questions: [
                    { id: 'cq1', exam_id: 'cb1', question: 'What is 7 × 8?', options: ['54', '56', '48', '64'], correct_index: 1 }
                ],
                cbt_attempts: [],
                behaviour: [
                    { id: 'bh1', student_id: 'demo-2', type: 'merit', note: 'Helped a classmate', points: 5, created_at: today.toISOString() }
                ],
                health: [
                    { id: 'hl1', student_id: 'demo-3', complaint: 'Headache', treatment: 'Paracetamol, rested', visit_date: fmt(today) }
                ]
            }
        };
    },

    /** A mock Supabase client (chainable) backed by the demo tables. */
    mockClientSource() {
        return `
        function makeMock(DATA, ME){
          function q(table){
            let rows=(DATA[table]||[]).slice();
            const api={
              select(){return api;},
              order(){return api;},
              limit(n){rows=rows.slice(0,n);return api;},
              eq(col,val){rows=rows.filter(r=>String(r[col])===String(val));return api;},
              maybeSingle(){return Promise.resolve({data:rows[0]||null,error:null});},
              single(){return Promise.resolve({data:rows[0]||null,error:null});},
              insert(){return Promise.resolve({data:null,error:null});},
              update(){return {eq:()=>Promise.resolve({data:null,error:null})};},
              upsert(){return Promise.resolve({data:null,error:null});},
              delete(){return {eq:()=>Promise.resolve({data:null,error:null})};},
              then(res){return Promise.resolve({data:rows,error:null}).then(res);}
            };
            return api;
          }
          return {
            from:q,
            auth:{ getUser(){return Promise.resolve({data:{user:ME}});}, signOut(){return Promise.resolve({});},
                   signInWithPassword(){return Promise.resolve({data:{},error:null});}, signUp(){return Promise.resolve({data:{},error:null});} },
            storage:{ from(){return { upload(){return Promise.resolve({error:null});}, getPublicUrl(){return {data:{publicUrl:'#'}};} };} }
          };
        }`;
    },

    /** Build the complete preview HTML document. */
    html(c, fullCfg) {
        const TPLc = fullCfg; // cfg with _featureDefs
        const demo = this.demo(c);
        const feats = TPLc._featureDefs;
        const firstId = 'dashboard';
        const fontLink = c.font.google ? `<link href="https://fonts.googleapis.com/css2?family=${c.font.google}&display=swap" rel="stylesheet">` : '';
        const logo = c.logoDataUrl || '';

        // We reuse the generated css/app/modules verbatim, but neutralise the
        // hard redirects in Auth (guard/idx) for the sandboxed preview.
        const appJs = TPL.app(TPLc)
            .replace("location.href=this.idx();", "/*preview*/;")
            .replace("if(!u){location.href=this.idx();return null;}", "if(!u){return ME_PREVIEW;}")
            .replace("await sb.auth.signOut();location.href=this.idx();", "/*preview*/;");
        const modulesJs = TPL.modules(TPLc);
        const cfgJs = TPL.config(Object.assign({}, c, { supabaseUrl: 'preview', supabaseKey: 'preview' }))
            .replace(/\(function\(\)\{[\s\S]*?\}\)\(\);/, ''); // drop real supabase init

        const navLinks = feats.map(f => `<a class="pv-link" data-id="${f.id}"><i class="fas ${f.icon} fa-fw"></i> ${esc(f.name)}</a>`).join('');

        return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">${fontLink}
<style>${TPL.css(TPLc)}
.pv-shell{display:flex;min-height:100vh}
.pv-side{width:220px;background:#0f172a;color:#fff;padding:14px;flex-shrink:0}
.pv-brand{display:flex;gap:9px;align-items:center;font-weight:800;padding:6px 6px 14px;border-bottom:1px solid #1e293b;margin-bottom:10px}
.pv-link{display:flex;gap:9px;align-items:center;color:#94a3b8;padding:9px 11px;border-radius:9px;font-size:13px;margin-bottom:3px;cursor:pointer}
.pv-link:hover{background:#1e293b;color:#fff}.pv-link.on{background:var(--brand);color:#fff}
.pv-main{flex:1;padding:22px;overflow-y:auto;height:100vh}
${c.layout === 'topnav' ? '.pv-side{display:none}.pv-top{display:flex!important}' : ''}
${c.layout === 'cards' ? '.pv-side{display:none}' : ''}
.pv-top{display:none;background:var(--brand);color:#fff;padding:10px 16px;gap:12px;align-items:center;flex-wrap:wrap;position:sticky;top:0;z-index:5}
.pv-top .pv-link{color:rgba(255,255,255,.85)}.pv-top .pv-link.on{background:rgba(255,255,255,.2)}
.pv-hub{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px}
.pv-hubc{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px;text-align:center;cursor:pointer}
.pv-hubc i{font-size:26px;color:var(--brand)}
@media(max-width:760px){.pv-side{display:none}.pv-hub{grid-template-columns:1fr 1fr}}
</style></head>
<body>
<div class="pv-shell">
  <div class="pv-side">
    <div class="pv-brand">${logo ? `<img src="${logo}" style="height:32px;width:32px;border-radius:7px;object-fit:cover">` : `<div style="height:32px;width:32px;border-radius:7px;background:#fff;color:var(--brand);display:flex;align-items:center;justify-content:center;font-weight:900">${esc((c.shortName || 'C')[0])}</div>`} <span>${esc(c.shortName || 'School')}</span></div>
    <div id="pv-nav">${navLinks}</div>
    <div style="margin-top:14px;border-top:1px solid #1e293b;padding-top:10px;font-size:10px;color:#64748b;text-align:center">Powered by HMG Concepts</div>
  </div>
  <div style="flex:1;display:flex;flex-direction:column">
    <div class="pv-top"><b style="margin-right:6px">${esc(c.shortName || 'School')}</b><div style="display:flex;gap:6px;flex-wrap:wrap">${navLinks}</div></div>
    <div class="pv-main">
      ${c.layout === 'cards' ? `<div class="pv-hub" id="pv-hub">${feats.map(f => `<div class="pv-hubc" data-id="${f.id}"><i class="fas ${f.icon}"></i><p style="font-weight:700;margin:8px 0 0">${esc(f.name)}</p></div>`).join('')}</div>` : ''}
      <div id="hdr"></div><div id="body" class="fade"></div>
    </div>
  </div>
</div>
<div style="position:fixed;bottom:0;left:0;right:0;background:#fef3c7;color:#92400e;text-align:center;font-size:11px;padding:5px;border-top:1px solid #fde68a">👁️ PREVIEW with sample data — the real platform connects to the school's own Supabase. Powered by HMG Concepts.</div>

<script>
const ME_PREVIEW=${JSON.stringify(demo.me)};
const DEMO_DATA=${JSON.stringify(demo.tables)};
${this.mockClientSource()}
var sb=makeMock(DEMO_DATA,ME_PREVIEW);window.sb=sb;
</script>
<script>${cfgJs}
window.CONFIG=CONFIG;window.sb=sb;</script>
<script>${appJs}</script>
<script>${modulesJs}</script>
<script>
// Override Layout.sidebar/header (preview provides its own chrome) and wire nav.
Layout.sidebar=function(){};
async function pvGo(id){
  document.querySelectorAll('.pv-link').forEach(a=>a.classList.toggle('on',a.dataset.id===id));
  const feat=${JSON.stringify(feats)}.find(f=>f.id===id)||{name:id};
  document.getElementById('hdr').innerHTML=Layout.header(feat.name,CONFIG.SCHOOL_NAME);
  document.getElementById('body').innerHTML='<div class="muted">Loading…</div>';
  try{ await Modules.render(id, ME_PREVIEW, document.getElementById('body')); }
  catch(e){ document.getElementById('body').innerHTML='<div class="card">'+id+' preview</div>'; }
}
document.querySelectorAll('.pv-link,[data-id]').forEach(a=>a.addEventListener('click',()=>pvGo(a.dataset.id)));
pvGo('${firstId}');
</script>
</body></html>`;
    }
};

function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
window.Preview = Preview;
