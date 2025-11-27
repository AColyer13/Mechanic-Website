<#
PowerShell smoke test script (ephemeral) — creates and deletes timestamped test user when TEST_EMAIL is not set.
Usage:
  $env:API_URL = 'https://api.example.com'
  # Optionally set TEST_PASSWORD to a known value; if TEST_EMAIL is omitted a generated password will be used.
  Remove-Item Env:TEST_EMAIL -ErrorAction SilentlyContinue; Remove-Item Env:TEST_PASSWORD -ErrorAction SilentlyContinue
  .\run-tests-ephemeral.ps1
#>

$apiUrl = $env:API_URL
if (-not $apiUrl) { Write-Error 'Set $env:API_URL first'; exit 2 }
$testEmail = $env:TEST_EMAIL
$testPassword = $env:TEST_PASSWORD

function Invoke-Json($method, $url, $body = $null, $headers = @{}) {
    $opts = @{ Method = $method; Uri = $url; Headers = $headers; ErrorAction = 'Stop' }
    if ($body -ne $null) { $opts.Body = ($body | ConvertTo-Json -Depth 5); $opts.ContentType = 'application/json' }
    try {
        $r = Invoke-RestMethod @opts
        return @{ ok = $true; status = 200; body = $r }
    } catch [System.Net.WebException] {
        $resp = $_.Exception.Response
        if ($resp -ne $null) {
            $status = [int]$resp.StatusCode
            $text = (New-Object System.IO.StreamReader($resp.GetResponseStream())).ReadToEnd()
            try { $body = $text | ConvertFrom-Json } catch { $body = $text }
            return @{ ok = $false; status = $status; body = $body }
        }
        return @{ ok = $false; status = 0; body = $_.Exception.Message }
    }
}

Write-Host "API_URL = $apiUrl"

# Prepare credentials: if TEST_EMAIL not provided, create ephemeral email+password
$email = $testEmail
$password = $testPassword
if (-not $email) {
    $ticks = [DateTime]::UtcNow.Ticks
    $email = "smoke.$ticks@example.test"
    if (-not $password) { $password = "pw$ticks" }
    Write-Host "Using ephemeral test account: $email"
} elseif (-not $password) {
    Write-Host "TEST_EMAIL provided but TEST_PASSWORD missing; cannot proceed with authenticated checks"
    exit 0
}

# Try unauthenticated checks (inventory/mechanics allow unauth POSTs in this API)
Write-Host "`n[Unauthenticated] POST /inventory";
$invUna = Invoke-Json -method 'POST' -url "$apiUrl/inventory/" -body @{ name = 'ps-smoke' ; price = 1.23 }
Write-Host "Unauth POST /inventory: $($invUna.status)"

# Login or create
Write-Host "`nLogging in as $email..."
$createdUser = $false
$createdCustomerId = $null
$login = Invoke-Json -method 'POST' -url "$apiUrl/customers/login" -body @{ email = $email; password = $password }
if (-not $login.ok -or -not $login.body.token) {
    Write-Host 'Login failed, creating user...'
    $createUser = Invoke-Json -method 'POST' -url "$apiUrl/customers/" -body @{ first_name='Test'; last_name='Runner'; email=$email; password=$password }
    if (-not $createUser.ok) { Write-Error "Failed to create test user: $($createUser.status) $($createUser.body)"; exit 2 }
    $createdCustomerId = $createUser.body.id
    $createdUser = $true
    Write-Host "Created user id: $createdCustomerId"
    $login = Invoke-Json -method 'POST' -url "$apiUrl/customers/login" -body @{ email = $email; password = $password }
    if (-not $login.ok -or -not $login.body.token) { Write-Error "Login failed after create: $($login.status) $($login.body)"; exit 2 }
}
$token = $login.body.token
Write-Host "Logged in. Token length: $($token.Length)"
$headers = @{ Authorization = "Bearer $token" }

# Create an inventory item and clean it up to exercise add/remove
Write-Host "`n[Auth] Create inventory"
$inv = Invoke-Json -method 'POST' -url "$apiUrl/inventory/" -body @{ name='ephemeral-part'; price=9.99 } -headers $headers
if ($inv.ok) { $iid = $inv.body.id; Write-Host "Created inventory id $iid"; Invoke-Json -method 'DELETE' -url "$apiUrl/inventory/$iid" -headers $headers | Out-Null; Write-Host 'Deleted inventory' } else { Write-Host "Inventory create failed: $($inv.status)" }

# Cleanup ephemeral user if we created one
if ($createdUser) {
    Write-Host "`nCleaning up ephemeral user..."
    $cid = $createdCustomerId
    if (-not $cid -and $login.body.customer) { $cid = $login.body.customer.id }
    if ($cid) {
        $del = Invoke-Json -method 'DELETE' -url "$apiUrl/customers/$cid" -headers $headers
        if ($del.ok) { Write-Host 'Deleted ephemeral user' } else { Write-Host "Delete failed: $($del.status)" }
    } else { Write-Host 'Could not determine customer id to delete' }
}

Write-Host "`nEphemeral smoke test finished."
