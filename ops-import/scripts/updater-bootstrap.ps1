param(
  [string]$ConfigPath = "secrets/ops-bridge.local.json",
  [string]$Version,
  [string]$InstallerPath,
  [string]$Platform = "win",
  [string]$Channel = "stable",
  [string]$Notes = "",
  [string]$FileName = "Carapace-Setup.exe",
  [string]$BridgeBase = "http://127.0.0.1:8799",
  [string]$CheckClientVersion,
  [switch]$UseBridge,
  [switch]$SkipPublish
)

$ErrorActionPreference = 'Stop'

function Resolve-ConfigPath([string]$pathIn) {
  if ([System.IO.Path]::IsPathRooted($pathIn)) { return $pathIn }
  return Join-Path (Get-Location) $pathIn
}

function Get-Json([string]$pathIn) {
  if (!(Test-Path $pathIn)) { throw "Config not found: $pathIn" }
  return Get-Content -Raw -Path $pathIn | ConvertFrom-Json
}

function Invoke-JsonGet([string]$uri, [int]$timeoutSec = 20) {
  try {
    return Invoke-RestMethod -Method GET -Uri $uri -TimeoutSec $timeoutSec
  } catch {
    throw "GET failed [$uri]: $($_.Exception.Message)"
  }
}

$configAbs = Resolve-ConfigPath $ConfigPath
$config = Get-Json $configAbs

if (-not $config.serverBaseUrl) { throw "serverBaseUrl missing in config" }
if (-not $config.clientToken) { throw "clientToken missing in config" }
if (-not $config.adminToken) { throw "adminToken missing in config" }

$serverBase = "$($config.serverBaseUrl)".TrimEnd('/')
$bridge = $BridgeBase.TrimEnd('/')

Write-Host "[bootstrap] Target server: $serverBase"
if ($UseBridge) { Write-Host "[bootstrap] Bridge: $bridge" }

if ($UseBridge) {
  Write-Host "[bootstrap] Checking bridge + server health ..."
  $localHealth = Invoke-JsonGet "$bridge/health"
  $remoteHealth = Invoke-JsonGet "$bridge/bridge/server/health"
  $localHealth | ConvertTo-Json -Depth 8
  $remoteHealth | ConvertTo-Json -Depth 8
} else {
  Write-Host "[bootstrap] Checking /health ..."
  $health = Invoke-JsonGet "$serverBase/health"
  $health | ConvertTo-Json -Depth 8
}

if (-not $SkipPublish) {
  if (-not $Version) { throw "Version is required unless -SkipPublish is set" }
  if (-not $InstallerPath) { throw "InstallerPath is required unless -SkipPublish is set" }

  Write-Host "[bootstrap] Publishing updater release ..."
  $publishScript = Join-Path (Split-Path -Parent $PSCommandPath) "publish-updater-release.ps1"

  if ($UseBridge) {
    & $publishScript `
      -Server $serverBase `
      -Version $Version `
      -InstallerPath $InstallerPath `
      -Platform $Platform `
      -Channel $Channel `
      -Notes $Notes `
      -FileName $FileName `
      -UseBridge `
      -BridgeBase $bridge
  } else {
    & $publishScript `
      -Server $serverBase `
      -AdminToken "$($config.adminToken)" `
      -Version $Version `
      -InstallerPath $InstallerPath `
      -Platform $Platform `
      -Channel $Channel `
      -Notes $Notes `
      -FileName $FileName
  }
}

if ($CheckClientVersion) {
  $checkVersion = $CheckClientVersion
} elseif ($Version) {
  # After publish, check from an older client version so updateAvailable is true.
  $checkVersion = '0.0.0'
} else {
  $checkVersion = '0.0.0'
}

if ($UseBridge) {
  $checkUrl = "$bridge/bridge/updates/check?platform=$([uri]::EscapeDataString($Platform))&channel=$([uri]::EscapeDataString($Channel))&version=$([uri]::EscapeDataString($checkVersion))"
} else {
  $checkUrl = "$serverBase/updates/check?platform=$([uri]::EscapeDataString($Platform))&channel=$([uri]::EscapeDataString($Channel))&version=$([uri]::EscapeDataString($checkVersion))&token=$([uri]::EscapeDataString($config.clientToken))"
}

Write-Host "[bootstrap] Verifying /updates/check (client version: $checkVersion) ..."
$check = Invoke-JsonGet $checkUrl
$check | ConvertTo-Json -Depth 8

if ($Version -and $check.latest -ne $Version) {
  throw "Check mismatch: expected latest=$Version, got latest=$($check.latest)"
}

Write-Host "[bootstrap] complete"
