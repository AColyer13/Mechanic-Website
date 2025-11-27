/*
Simple Node test runner for checking protected endpoints behavior.
Requires Node 18+ (built-in fetch) OR run with a node that supports global fetch.

Usage (PowerShell):
  $env:API_URL='https://api.example.com'; $env:TEST_EMAIL='test@example.com'; $env:TEST_PASSWORD='password'; node run-tests.js

What it does:
- Tries unauthenticated requests to a small set of protected write endpoints and expects 401/403 (or another rejection code)
- Logs in using TEST_EMAIL/TEST_PASSWORD and stores a token
- Repeats tests authenticated and expects success codes (2xx) where applicable
- Performs one simple create -> update -> delete cycle on inventory and a small ticket create/delete

This is a small smoke-check tool to confirm Authorization header enforcement.
*/

const API_URL = process.env.API_URL || 'http://localhost:5000';
const TEST_EMAIL = process.env.TEST_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';

function ok(status) { return status >= 200 && status < 300; }

async function fetchJson(url, opts = {}) {
  const r = await fetch(url, opts);
  let body = null;
  try { body = await r.json(); } catch(_) { body = await r.text(); }
  return { status: r.status, ok: r.ok, body };
}

async function expectUnauthorized(call, label) {
  const res = await call();
  if (res.ok) {
    console.log(`✖ ${label}: expected unauthorized but got ${res.status}`);
    return false;
  }
  console.log(`✔ ${label}: got ${res.status} (unauthenticated)`);
  return true;
}

async function expectSuccess(call, label) {
  const res = await call();
  if (!res.ok) {
    console.log(`✖ ${label}: expected success but got ${res.status} - ${JSON.stringify(res.body)}`);
    return false;
  }
  console.log(`✔ ${label}: ${res.status}`);
  return res;
}

async function run() {
  console.log('API_URL =', API_URL);

  // Basic unauth checks
  const unauthChecks = [
    { fn: () => fetchJson(`${API_URL}/inventory/`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name:'x', price:1.23}) }), label: 'POST /inventory (unauth)'} ,
    { fn: () => fetchJson(`${API_URL}/mechanics/`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({first_name:'T', last_name:'Tester', email:'t@example.com'}) }), label: 'POST /mechanics (unauth)'} ,
    { fn: () => fetchJson(`${API_URL}/service-tickets/`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ customer_id: 1, description: 'test' }) }), label: 'POST /service-tickets (unauth)'}
  ];

  let okCount = 0, failCount = 0;

  for (const c of unauthChecks) {
    const ok = await expectUnauthorized(c.fn, c.label);
    if (ok) okCount++; else failCount++;
  }

  if (!TEST_EMAIL || !TEST_PASSWORD) {
    console.log('\nSkipping authenticated checks because TEST_EMAIL/TEST_PASSWORD missing.');
    console.log('Set environment variables TEST_EMAIL and TEST_PASSWORD to run full test.');
    process.exit(failCount>0?1:0);
  }

  // Login
  console.log('\nAttempting login with TEST_EMAIL...');
  const loginRes = await fetchJson(`${API_URL}/customers/login`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }) });
  if (!loginRes.ok || !loginRes.body || !loginRes.body.token) {
    console.error('Login failed:', loginRes.status, loginRes.body);
    process.exit(2);
  }
  const token = loginRes.body.token;
  console.log('✔ Logged in. Token length:', token.length);

  // Authenticated checks
  // Create inventory item (POST), update (PUT), delete (DELETE)
  console.log('\nAuthenticated mutation checks...');
  const invCreate = await expectSuccess(() => fetchJson(`${API_URL}/inventory/`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ name: 'smoke-test part', price: 9.99 }) }), 'POST /inventory (auth)');
  if (!invCreate) process.exit(3);
  const invId = invCreate.body && invCreate.body.id ? invCreate.body.id : null;
  if (!invId) {
    console.warn('No inventory id returned; stopping inventory cycle');
  } else {
    await expectSuccess(() => fetchJson(`${API_URL}/inventory/${invId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ price: 10.50 }) }), 'PUT /inventory/:id (auth)');
    await expectSuccess(() => fetchJson(`${API_URL}/inventory/${invId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }), 'DELETE /inventory/:id (auth)');
  }

  // Create mechanic -> update -> delete cycle
  const mechCreate = await expectSuccess(() => fetchJson(`${API_URL}/mechanics/`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ first_name:'Smoke', last_name:'Tester', email:`smoke.${Date.now()}@example.test` }) }), 'POST /mechanics (auth)');
  const mechId = mechCreate && mechCreate.body && mechCreate.body.id ? mechCreate.body.id : null;
  if (mechId) {
    await expectSuccess(() => fetchJson(`${API_URL}/mechanics/${mechId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ phone: '555-0123' }) }), 'PUT /mechanics/:id (auth)');
    await expectSuccess(() => fetchJson(`${API_URL}/mechanics/${mechId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }), 'DELETE /mechanics/:id (auth)');
  }

  // Create service-ticket -> update -> delete
  const ticketCreate = await expectSuccess(() => fetchJson(`${API_URL}/service-tickets/`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ customer_id: loginRes.body.customer ? loginRes.body.customer.id : undefined || 1, description: 'smoke test ticket' }) }), 'POST /service-tickets (auth)');
  const ticketId = ticketCreate && ticketCreate.body && ticketCreate.body.id ? ticketCreate.body.id : null;
  if (ticketId) {
    await expectSuccess(() => fetchJson(`${API_URL}/service-tickets/${ticketId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ status: 'In Progress' }) }), 'PUT /service-tickets/:id (auth)');
    await expectSuccess(() => fetchJson(`${API_URL}/service-tickets/${ticketId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }), 'DELETE /service-tickets/:id (auth)');
  }

  console.log('\nSmoke tests finished. If all ✔ passed, protected endpoints require authorization and mutations work with a token.');
}

run().catch(err => { console.error('Test runner crashed:', err); process.exit(99); });
