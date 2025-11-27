// Admin helper: Find and delete a customer by email (Node)
// Usage: 
//   API_URL='https://...' TARGET_EMAIL='test@example.com' TEST_PASSWORD='pw' node admin-delete-user.js

const API_URL = process.env.API_URL;
const TARGET_EMAIL = process.env.TARGET_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

if (!API_URL) { console.error('Set API_URL'); process.exit(2); }
if (!TARGET_EMAIL) { console.error('Set TARGET_EMAIL'); process.exit(2); }

async function fetchJson(url, opts = {}) {
  const r = await fetch(url, opts);
  let body = null;
  try { body = await r.json(); } catch(_) { body = await r.text(); }
  return { status: r.status, ok: r.ok, body };
}

async function run() {
  console.log('API:', API_URL, 'target:', TARGET_EMAIL);
  let token = null;
  let customerId = null;

  if (TEST_PASSWORD) {
    console.log('Attempting login to discover customer id...');
    const login = await fetchJson(`${API_URL}/customers/login`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email: TARGET_EMAIL, password: TEST_PASSWORD }) });
    if (login.ok && login.body && login.body.token) {
      token = login.body.token;
      customerId = login.body.customer ? login.body.customer.id : null;
      console.log('Logged in; token length', token.length, 'customer id', customerId);
    } else {
      console.log('Login failed:', login.status, login.body);
    }
  }

  if (!customerId) {
    console.log('Attempting GET /customers?email=...');
    const r = await fetchJson(`${API_URL}/customers?email=${encodeURIComponent(TARGET_EMAIL)}`);
    if (r.ok) {
      if (Array.isArray(r.body) && r.body.length > 0) customerId = r.body[0].id;
      else if (r.body && r.body.id) customerId = r.body.id;
      console.log('Found customer id via GET:', customerId);
    } else {
      console.log('GET failed:', r.status, r.body);
    }
  }

  if (!customerId) {
    console.error('Could not determine customer id; aborting.');
    process.exit(3);
  }

  // Confirm
  process.stdout.write(`About to DELETE customer id ${customerId} for ${TARGET_EMAIL}. Type Y to confirm: `);
  const res = await new Promise(resolve => {
    process.stdin.once('data', d => resolve(String(d).trim()));
  });
  if (res.toLowerCase() !== 'y') { console.log('Aborted.'); process.exit(0); }

  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  console.log(`Sending DELETE /customers/${customerId}`);
  const del = await fetchJson(`${API_URL}/customers/${customerId}`, { method: 'DELETE', headers });
  if (del.ok) { console.log('Delete succeeded'); process.exit(0); }
  else { console.error('Delete failed:', del.status, del.body); process.exit(4); }
}

run().catch(err => { console.error('Error', err); process.exit(99); });
