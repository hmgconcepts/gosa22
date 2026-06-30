// ====================================================================
// School Connect Gen v3 — Generated School Site Config
// ====================================================================

// Supabase credentials
window.SUPABASE_URL = 'https://dgarrlzbmscpgtefdupm.supabase.co';
window.SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnYXJybHpibXNjcGd0ZWZkdXBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMzc0MTYsImV4cCI6MjA5NzkxMzQxNn0.7CNB3KcQD3NHr6ENDGb7gRX_ld_xjgpQeL_YVuLRW_A';

// Initialize Supabase client — attach to window so all scripts can use it as `sb`
window.sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

// Also keep a local reference for convenience
const sb = window.sb;

// School configuration
window.SCHOOL = {
  name: 'God of Seed Academy',
  shortName: 'GoSA',
  motto: 'Excellence in Learning and Character',
  address: '',
  phone: '',
  email: '',
  logoExt: 'png',
  primary: '#4f46e5',
  accent: '#7c3aed',
  themeId: 'indigo',
  campuses: [],
  hmgLink: 'https://hmgconcepts.pages.dev/',
  currency: '\u20A6'
};

console.log('[School Connect] Config loaded — Supabase: ' + window.SUPABASE_URL);
