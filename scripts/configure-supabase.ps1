param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectRef,

  [Parameter(Mandatory = $true)]
  [string]$AnonKey
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $repoRoot ".env"
$configPath = Join-Path $repoRoot "supabase\config.toml"
$url = "https://$ProjectRef.supabase.co"

if (-not (Test-Path $envPath)) {
  throw ".env file not found at $envPath"
}

if (-not (Test-Path $configPath)) {
  throw "supabase/config.toml file not found at $configPath"
}

$envContent = @"
SUPABASE_PUBLISHABLE_KEY="$AnonKey"
SUPABASE_URL="$url"
VITE_SUPABASE_PROJECT_ID="$ProjectRef"
VITE_SUPABASE_PUBLISHABLE_KEY="$AnonKey"
VITE_SUPABASE_URL="$url"
"@

Set-Content -LiteralPath $envPath -Value $envContent -Encoding utf8
Set-Content -LiteralPath $configPath -Value "project_id = `"$ProjectRef`"" -Encoding utf8

Write-Host "Updated .env and supabase/config.toml for project $ProjectRef"
Write-Host "Next steps:"
Write-Host "  1. npm run sb:login"
Write-Host "  2. npm run sb:link -- --project-ref $ProjectRef"
Write-Host "  3. npm run sb:db:push"
Write-Host "  4. npm run sb:types"
Write-Host "  5. npm run sb:functions:deploy"
