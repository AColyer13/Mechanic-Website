## ✅ What I've Done

1. **Added CORS Support** - Your API can now accept requests from web browsers
2. **Added Flask-CORS to requirements.txt** - Required for cross-origin requests
3. **Created example_frontend.html** - A working demo webpage

## 🚀 Deployment Steps

### Step 1: Deploy Updated Code to Render

1. Commit and push your changes:
```bash
git add .
git commit -m "Add CORS support for web frontend"
git push
```

2. Render will automatically deploy the update (or manually trigger deploy in Render dashboard)

### Step 2: Test Your API URL

Once deployed, find your Render API URL (should be something like):
- `https://your-app-name.onrender.com`

Test it in your browser by visiting:
- `https://your-app-name.onrender.com/` (should show API info)
- `https://your-app-name.onrender.com/customers` (should show customers)

### Step 3: Host Your HTML Webpage

You have several FREE options:

#### Option A: GitHub Pages (Easiest)
1. Create a new GitHub repository
2. Upload `example_frontend.html` and rename it to `index.html`
3. Go to Settings → Pages
4. Select "main" branch as source
5. Your site will be live at `https://yourusername.github.io/repo-name`

#### Option B: Netlify
1. Go to https://netlify.com
2. Drag and drop your HTML file
3. Get instant URL like `https://random-name.netlify.app`

#### Option C: Vercel
1. Go to https://vercel.com
2. Upload your HTML file
3. Get instant deployment

#### Option D: Render Static Site
1. In Render, create a "Static Site"
2. Upload your HTML file
3. Free tier available

### Step 4: Update the HTML File

In your `example_frontend.html`, change line 136:
```javascript
<input type="text" id="apiUrl" value="https://your-app-name.onrender.com"
```

Replace `your-app-name` with your actual Render app name!

## 🌍 How It Works

1. **Your Backend (Render)**: Handles database, business logic, API endpoints
2. **Your Frontend (GitHub Pages/Netlify/etc)**: The HTML/CSS/JavaScript users see
3. **CORS**: Allows the frontend to talk to the backend across different domains
4. **HTTPS**: Both are served over HTTPS, so it's secure

## 📝 Using the Webpage

Once deployed:

1. Open your webpage URL in any browser
2. Make sure the API URL field has your Render URL
3. Click buttons to:
   - View all customers/mechanics/inventory
   - Add new customers/mechanics
   - See service tickets

## 🔒 Security Tips

For production, update the CORS settings in `application/__init__.py`:

```python
# Instead of allowing all origins ("*"), specify your frontend domain:
CORS(app, resources={
  r"/*": {
    "origins": ["https://yourusername.github.io"],  # Your actual frontend URL
    "methods": ["GET", "POST", "PUT", "DELETE", "PATCH"],
    "allow_headers": ["Content-Type", "Authorization"]
  }
})
```

## 🧪 Testing Locally

Before deploying, test locally:

1. Install flask-cors:
```bash
pip install Flask-CORS
```

2. Run your Flask app:
```bash
python flask_app.py
```

3. Open `example_frontend.html` in your browser
4. Change the API URL to `http://localhost:5000`
5. Test all the buttons!

## 📱 Making It Mobile-Friendly

The example HTML is already responsive! It works on:
- Desktop computers
- Tablets
- Mobile phones

## 🎨 Customizing the Frontend

You can modify `example_frontend.html`:
- Change colors in the `<style>` section
- Add more features in the JavaScript
- Add your own logo/branding
- Create multiple pages

## Common Issues

### "CORS Error" in Browser Console
- Make sure Flask-CORS is installed on Render
- Check that your code is deployed
- Verify the API URL is correct

### "Failed to Fetch"
- Check if your Render app is running
- Verify the URL doesn't have a typo
- Check Render logs for errors

### Database Not Working
- Make sure you've set up a database in Render
- Check environment variables in Render dashboard
- Run migrations if needed

## Next Steps

1. Deploy to Render with CORS enabled ✓
2. Test API endpoints work ✓
3. Host HTML on GitHub Pages/Netlify
4. Share the URL with anyone in the world! 🌍

Your mechanic shop API is now accessible worldwide!

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
 - Also tests adding and removing a part on a service ticket (PUT /service-tickets/:ticketId/add-part/:partId and remove-part) during the authenticated cycle when an inventory item is available.

Exit codes
- 0: All checks passed or the script was aborted early for missing credentials (node runner will exit non-zero if unauth failures or auth checks fail depending on configuration).
- Non-zero: One of the checks failed (scripts print the error details).

Notes & safety
- These scripts perform destructive operations (create/delete). Use test/staging environments or test accounts.
- Provide a stable test user via `TEST_EMAIL` on your API that is allowed to run these operations.

If you want, I can also add a small GitHub Actions workflow to run these on push or add a `package.json` that installs node-fetch for older Node versions. Want me to add either of those?

CI / GitHub Actions
-------------------

I've added a GitHub Actions workflow at `.github/workflows/smoke-tests.yml` which will run the Node and PowerShell smoke tests on:

- pushes to `main`
- pull requests targeting `main`
- manual dispatch from the Actions UI

Before the workflow will run successfully you must add the following repository secrets (Settings → Secrets):

- `API_URL` — the base URL of the test/staging API (e.g. https://staging-api.example.com)
- `TEST_EMAIL` — email of a test user that exists in the environment and can perform mutations
- `TEST_PASSWORD` — password for that test user

Important: These tests create and delete resources. Only run them against a test/staging environment with a safe test account.