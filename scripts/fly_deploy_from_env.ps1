$ErrorActionPreference = 'Stop'
$envFile = Join-Path $PSScriptRoot '..\.env' | Resolve-Path -ErrorAction Stop
$lines = Get-Content $envFile | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith('#') }
function getVal($key){ $line = $lines | Where-Object { $_ -match "^$key=" }; if (-not $line) { return '' }; $idx = $line.IndexOf('='); return $line.Substring($idx+1) }
$DATABASE_URL = getVal 'DATABASE_URL'
$JWT_SECRET = getVal 'JWT_SECRET'
$SUPABASE_SECRET = getVal 'SUPABASE_SECRET'
$GOOGLE_CLIENT_ID = getVal 'GOOGLE_CLIENT_ID'
$GOOGLE_CLIENT_SECRET = getVal 'GOOGLE_CLIENT_SECRET'
$SUPABASE_ANON = getVal 'SUPABASE_KEY'
if (-not $DATABASE_URL) { Write-Warning 'DATABASE_URL not found in .env' }
if (-not $SUPABASE_ANON) { Write-Warning 'SUPABASE_KEY (anon) not found in .env' }
Write-Output 'Running: flyctl secrets set ... (server-only)'
# Set server-only secrets
flyctl secrets set DATABASE_URL="$DATABASE_URL" JWT_SECRET="$JWT_SECRET" SUPABASE_SECRET="$SUPABASE_SECRET" GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET"
if ($LASTEXITCODE -ne 0) { Write-Error 'flyctl secrets set failed'; exit $LASTEXITCODE }
Write-Output 'Secrets set. Now deploying with build-arg for client anon key.'
# Deploy with build args for client
flyctl deploy --build-arg VITE_SUPABASE_ANON_KEY="$SUPABASE_ANON" --build-arg VITE_DISABLE_STEALTH=false
if ($LASTEXITCODE -ne 0) { Write-Error 'flyctl deploy failed'; exit $LASTEXITCODE }
Write-Output 'flyctl deploy finished.'
