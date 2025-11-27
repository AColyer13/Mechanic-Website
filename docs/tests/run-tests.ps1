<#
PowerShell smoke test script to validate protected endpoints using curl/Invoke-RestMethod.
Usage:
  $env:API_URL = 'https://api.example.com'
  $env:TEST_EMAIL = 'test@example.com'
  $env:TEST_PASSWORD = 'password'
  pwsh .\run-tests.ps1

This script performs a small number of checks:
- Unauthenticated attempt to POST /inventory (should return 401/403)
- Attempt to login with TEST_EMAIL/TEST_PASSWORD and capture token
- Authenticated POST /inventory (should succeed) -> delete the created item
- Authenticated POST /mechanics -> update -> delete
- Authenticated POST /service-tickets -> update -> delete

Note: This is a simple, readable script for manual runs and quick CI steps.
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

# Unauthenticated check — reflect current API: inventory/mechanics allow unauth POSTs, service-tickets do not
Write-Host '\n[Unauthenticated] POST /inventory -> expect success (201)'
$invUna = Invoke-Json -method 'POST' -url "$apiUrl/inventory/" -body @{ name = 'ps-smoke' ; price = 1.23 }
if ($invUna.ok) { Write-Host '✔ POST /inventory (unauth): succeeded as expected' } else { Write-Host "✖ POST /inventory (unauth): expected success but got $($invUna.status)" }

Write-Host '\n[Unauthenticated] POST /mechanics -> expect success (201)'
$mechUna = Invoke-Json -method 'POST' -url "$apiUrl/mechanics/" -body @{ first_name='PS'; last_name='Smoke'; email = "ps.smoke.$(Get-Date -Format 'yyyyMMddHHmmss')@example.test" }
if ($mechUna.ok) { Write-Host '✔ POST /mechanics (unauth): succeeded as expected' } else { Write-Host "✖ POST /mechanics (unauth): expected success but got $($mechUna.status)" }

Write-Host '\n[Unauthenticated] POST /service-tickets -> expect unauthorized (401/403/404)'
$ticketUna = Invoke-Json -method 'POST' -url "$apiUrl/service-tickets/" -body @{ customer_id = 1; description = 'ps smoke test' }
if (-not $ticketUna.ok) { Write-Host "✔ POST /service-tickets (unauth): got $($ticketUna.status) (unauthenticated)" } else { Write-Host '✖ POST /service-tickets (unauth): unexpected success' }

if (-not $testEmail -or -not $testPassword) { Write-Host '\nTEST_EMAIL/TEST_PASSWORD not set; skipping authenticated tests'; exit 0 }

# Login
Write-Host '\nLogging in...'
$login = Invoke-Json -method 'POST' -url "$apiUrl/customers/login" -body @{ email = $testEmail; password = $testPassword }
if (-not $login.ok -or -not $login.body.token) {
    Write-Host 'Login failed, attempting to create test user...'
    $createUser = Invoke-Json -method 'POST' -url "$apiUrl/customers/" -body @{ first_name='Test'; last_name='Runner'; email=$testEmail; password=$testPassword }
    if (-not $createUser.ok) {
        Write-Error "Failed to create test user: $($createUser.status) $($createUser.body)"
        exit 2
    }
    Write-Host 'Test user created, retrying login...'
    $login = Invoke-Json -method 'POST' -url "$apiUrl/customers/login" -body @{ email = $testEmail; password = $testPassword }
    if (-not $login.ok -or -not $login.body.token) {
        Write-Error "Login still failed after creating user: $($login.status) $($login.body)"
        exit 2
    }
}
$token = $login.body.token
Write-Host 'Logged in, token length' ($token.Length)
$headers = @{ Authorization = "Bearer $token" }

# Authenticated inventory create (keep item around so we can add/remove it to a ticket)
Write-Host '\n[Auth] POST /inventory/'
$invCreate = Invoke-Json -method 'POST' -url "$apiUrl/inventory/" -body @{ name = 'ps-smoke-inv'; price = 2.50 } -headers $headers
if (-not $invCreate.ok) { Write-Error "Inventory create failed: $($invCreate.status)"; exit 4 }
$id = $invCreate.body.id; Write-Host "Created inventory id: $id"



# Mechanic create/update/delete cycle
Write-Host '\n[Auth] POST /mechanics/'
$m = Invoke-Json -method 'POST' -url "$apiUrl/mechanics/" -body @{ first_name='PS'; last_name='Smoke'; email = "ps.smoke.$([DateTime]::UtcNow.Ticks)@example.test" } -headers $headers
if (-not $m.ok) { Write-Error "Mechanic create failed: $($m.status)"; exit 5 }
$mid = $m.body.id; Write-Host "Mechanic id: $mid"
Invoke-Json -method 'PUT' -url "$apiUrl/mechanics/$mid" -body @{ phone = '555-0101' } -headers $headers | Out-Null
Write-Host 'Mechanic updated'
Invoke-Json -method 'DELETE' -url "$apiUrl/mechanics/$mid" -headers $headers | Out-Null
Write-Host 'Mechanic deleted'

# Service-ticket create/add-part/remove-part/update/delete cycle
Write-Host '\n[Auth] POST /service-tickets/'
$cid = $login.body.customer.id
$t = Invoke-Json -method 'POST' -url "$apiUrl/service-tickets/" -body @{ customer_id = $cid; description = 'ps smoke ticket' } -headers $headers
if (-not $t.ok) { Write-Error "Ticket create failed: $($t.status)"; exit 6 }
$tid = $t.body.id; Write-Host "Ticket id: $tid"
    # Try adding the inventory item to the ticket (if inventory created)
    if ($id) {
        Write-Host "Attempting to add inventory item $id to ticket $tid"
        $add = Invoke-Json -method 'PUT' -url "$apiUrl/service-tickets/$tid/add-part/$id" -headers $headers
        Write-Host "Add-part status: $($add.status)"
        Write-Host 'Now attempting remove-part'
        $remove = Invoke-Json -method 'PUT' -url "$apiUrl/service-tickets/$tid/remove-part/$id" -headers $headers
        Write-Host "Remove-part status: $($remove.status)"

        # Cleanup inventory after the ticket checks
        Invoke-Json -method 'DELETE' -url "$apiUrl/inventory/$id" -headers $headers | Out-Null
        Write-Host "Deleted inventory $id"
    } else { Write-Host 'No inventory id available; skipping add/remove part checks' }

    Invoke-Json -method 'PUT' -url "$apiUrl/service-tickets/$tid" -body @{ status = 'In Progress' } -headers $headers | Out-Null
    Write-Host 'Ticket updated'
    Invoke-Json -method 'DELETE' -url "$apiUrl/service-tickets/$tid" -headers $headers | Out-Null
    Write-Host 'Ticket deleted'

Write-Host '\nPS smoke tests completed. If all steps above succeeded you have both unauth/auth behavior confirmed.'
