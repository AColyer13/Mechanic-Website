# Endpoint smoke tests (Frontend ↔ Backend)

This folder contains two small smoke-test utilities to verify your backend's authorization behavior and to exercise protected endpoints used by the frontend.

Why use these
- Ensure the server rejects unauthenticated write requests.
- Confirm authentication (Bearer token) allows mutations (create/update/delete).
- Quick checks you can run locally or in CI.

Files
- `run-tests.js` — Node.js smoke test runner (recommended).
- `run-tests.ps1` — PowerShell script for quick manual testing (works on Windows/macOS with PowerShell Core).

Environment
- Set the following environment variables before running the tests:
  - `API_URL` — base URL for your API (e.g. https://api.example.com)
  - `TEST_EMAIL` — existing test user email (used to login)
  - `TEST_PASSWORD` — password for the test user

Node runner (recommended)
1. Requires Node 18+ (has global fetch). If you use earlier Node versions, run with a fetch polyfill or install node-fetch.
2. Run:

```powershell
$env:API_URL='https://api.example.com'
$env:TEST_EMAIL='test@example.com'
$env:TEST_PASSWORD='password'
node run-tests.js
```

PowerShell/curl runner
1. Set environment variables then run the script in PowerShell (pwsh):

```powershell
$env:API_URL='https://api.example.com'
$env:TEST_EMAIL='test@example.com'
$env:TEST_PASSWORD='password'
pwsh .\run-tests.ps1
```

Test behavior (both tools)
- Tries unauthenticated writes -> expect a 401/403 (or other non-2xx) status.
- Logs in with test credentials to receive a token.
- Repeats protected writes (inventory/mechanics/service-tickets) using Authorization: Bearer TOKEN and verifies successful responses.
- Attempts a simple create -> update -> delete cycle for inventory, mechanics and tickets.

Exit codes
- 0: All checks passed or the script was aborted early for missing credentials (node runner will exit non-zero if unauth failures or auth checks fail depending on configuration).
- Non-zero: One of the checks failed (scripts print the error details).

Notes & safety
- These scripts perform destructive operations (create/delete). Use test/staging environments or test accounts.
- Provide a stable test user via `TEST_EMAIL` on your API that is allowed to run these operations.

If you want, I can also add a small GitHub Actions workflow to run these on push or add a `package.json` that installs node-fetch for older Node versions. Want me to add either of those?