<#
Admin helper: Find and delete a customer by email.

Usage:
  $env:API_URL='https://...'; $env:TARGET_EMAIL='test@example.com'; $env:TEST_PASSWORD='password'; .\admin-delete-user.ps1

This script tries the following in order:
 1. Login as the target email (if TEST_PASSWORD provided) to get the customer id, then DELETE /customers/:id
 2. If login not possible, attempt GET /customers?email=<email> (if supported) to find id, then DELETE
 The script prints responses and does NOT force-delete without showing results.
#>

$apiUrl = $env:API_URL
if (-not $apiUrl) { Write-Error 'Set $env:API_URL first'; exit 2 }
$targetEmail = $env:TARGET_EMAIL
if (-not $targetEmail) { Write-Error 'Set $env:TARGET_EMAIL first'; exit 2 }
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

Write-Host "API: $apiUrl - target email: $targetEmail"

# Try login if password provided
$token = $null
$customerId = $null
if ($testPassword) {
    Write-Host 'Attempting login to discover customer id...'
    $login = Invoke-Json -method 'POST' -url "$apiUrl/customers/login" -body @{ email = $targetEmail; password = $testPassword }
    if ($login.ok -and $login.body.token) {
        $token = $login.body.token
        if ($login.body.customer -and $login.body.customer.id) { $customerId = $login.body.customer.id }
        Write-Host "Logged in; token length $($token.Length); customer id: $customerId"
    } else {
        Write-Host "Login failed or no token: $($login.status) -- $($login.body)"
    }
}

if (-not $customerId) {
    Write-Host 'Attempting to find customer via GET /customers?email=...'
    $q = [System.Uri]::EscapeDataString($targetEmail)
    $r = Invoke-Json -method 'GET' -url "$apiUrl/customers?email=$q"
    if ($r.ok) {
        # Response shape may vary; try to locate id
        if ($r.body -is [System.Array] -and $r.body.Count -gt 0) {
            $customerId = $r.body[0].id
        } elseif ($r.body.id) {
            $customerId = $r.body.id
        }
        Write-Host "Found customer id via GET: $customerId"
    } else {
        Write-Host "GET /customers?email failed: $($r.status) - $($r.body)"
    }
}

if (-not $customerId) {
    Write-Host 'Could not determine customer id for that email. Exiting.'
    exit 3
}

# Confirm before deletion
Write-Host "About to DELETE customer id $customerId for email $targetEmail. Proceed? (Y/N)"
$k = Read-Host
if ($k -notin @('Y','y')) { Write-Host 'Aborted by user.'; exit 0 }

# Perform delete
$hdrs = @{}
if ($token) { $hdrs = @{ Authorization = "Bearer $token" } }
Write-Host "Sending DELETE /customers/$customerId"
$del = Invoke-Json -method 'DELETE' -url "$apiUrl/customers/$customerId" -headers $hdrs
if ($del.ok) { Write-Host 'Delete succeeded'; exit 0 } else { Write-Error "Delete failed: $($del.status) - $($del.body)"; exit 4 }
