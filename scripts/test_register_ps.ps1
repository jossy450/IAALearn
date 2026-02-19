$body = @{ email = 'probe-ps@example.com'; password = 'Password1A' }
try {
    $resp = Invoke-RestMethod -Uri 'https://iaalearn-cloud.fly.dev/api/auth/register' -Method Post -Body ($body | ConvertTo-Json -Depth 10) -ContentType 'application/json'
    $resp | ConvertTo-Json -Depth 10
} catch {
    Write-Output ("ERROR: " + $_.Exception.Message)
    if ($_.Exception.Response) {
        try { $_.Exception.Response | Select-Object -ExpandProperty StatusCode, StatusDescription } catch {}
        try { $_.Exception.Response.GetResponseStream() | % { (New-Object System.IO.StreamReader($_)).ReadToEnd() } } catch {}
    }
}
