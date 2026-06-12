param(
  [ValidateSet("installer", "directory")]
  [string]$Target = "installer"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$releaseDirectory = Join-Path $projectRoot "release"
$temporaryOutput = Join-Path $env:LOCALAPPDATA "Temp\gems-flow-electron-build"

Push-Location $projectRoot
try {
  npm run build
  if ($LASTEXITCODE -ne 0) {
    throw "Le build Vite a echoue."
  }

  $builderTarget = if ($Target -eq "installer") { "nsis" } else { "dir" }
  npx electron-builder --win $builderTarget --config.directories.output="$temporaryOutput"
  if ($LASTEXITCODE -ne 0) {
    throw "La creation de l'application Windows a echoue."
  }

  New-Item -ItemType Directory -Path $releaseDirectory -Force | Out-Null

  if ($Target -eq "installer") {
    Get-ChildItem -LiteralPath $temporaryOutput -Filter "Gems-Flow-Suite-Setup-*.exe" |
      Copy-Item -Destination $releaseDirectory -Force
  } else {
    $sourceDirectory = Join-Path $temporaryOutput "win-unpacked"
    $destinationDirectory = Join-Path $releaseDirectory "win-unpacked"

    if (Test-Path -LiteralPath $destinationDirectory) {
      $resolvedRelease = [System.IO.Path]::GetFullPath($releaseDirectory)
      $resolvedDestination = [System.IO.Path]::GetFullPath($destinationDirectory)
      if (-not $resolvedDestination.StartsWith($resolvedRelease, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Le dossier de destination desktop est invalide."
      }
      Remove-Item -LiteralPath $destinationDirectory -Recurse -Force
    }

    Copy-Item -LiteralPath $sourceDirectory -Destination $destinationDirectory -Recurse
  }
}
finally {
  Pop-Location
}
