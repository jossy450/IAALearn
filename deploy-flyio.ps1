# Deploy to Fly.io - Windows PowerShell
# Usage: .\deploy-flyio.ps1

Write-Host "Deploying to Fly.io..." -ForegroundColor Cyan

if (-not (Get-Command fly -ErrorAction SilentlyContinue)) {
  Write-Host "Fly CLI not found. Install from: https://fly.io/docs/hands-on/install-flyctl/" -ForegroundColor Red
  exit 1
}

Write-Host "1. Authenticating..." -ForegroundColor Cyan
fly auth login
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "2. Launching app..." -ForegroundColor Cyan
fly launch --no-deploy
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "3. Setting secrets..." -ForegroundColor Cyan
$jwtBytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($jwtBytes)
$jwtSecret = ($jwtBytes | ForEach-Object { $_.ToString('x2') }) -join ''
fly secrets set JWT_SECRET=$jwtSecret

$appInfo = fly info --json | ConvertFrom-Json
if ($null -ne $appInfo.Name) {
  fly secrets set CLIENT_URL="https://$($appInfo.Name).fly.dev"
}

$dbUrl = Read-Host "DATABASE_URL"
if ($dbUrl) { fly secrets set DATABASE_URL=$dbUrl }

$groqKey = Read-Host "GROQ_API_KEY (leave blank to skip)"
if ($groqKey) { fly secrets set GROQ_API_KEY=$groqKey }

$openaiKey = Read-Host "OPENAI_API_KEY (leave blank to skip)"
if ($openaiKey) { fly secrets set OPENAI_API_KEY=$openaiKey }

Write-Host "4. Deploying..." -ForegroundColor Cyan
fly deploy

if ($LASTEXITCODE -eq 0) {
  Write-Host "Deployment successful!" -ForegroundColor Green
  if ($null -ne $appInfo.Name) {
    Write-Host "URL: https://$($appInfo.Name).fly.dev" -ForegroundColor Green
  }
}
else {
  Write-Host "Deployment failed" -ForegroundColor Red
  exit 1
}
