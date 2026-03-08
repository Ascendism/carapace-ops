param(
  [Parameter(Mandatory=$true)][string]$Server,
  [string]$AdminToken,
  [Parameter(Mandatory=$true)][string]$Version,
  [Parameter(Mandatory=$true)][string]$InstallerPath,
  [string]$Platform = "win",
  [string]$Channel = "stable",
  [string]$Notes = "",
  [string]$FileName = "Carapace-Setup.exe",
  [switch]$UseBridge,
  [string]$BridgeBase = "http://127.0.0.1:8799"
)

$ErrorActionPreference = 'Stop'

if (!(Test-Path $InstallerPath)) {
  throw "InstallerPath not found: $InstallerPath"
}

$serverBase = $Server.TrimEnd('/')
if ($serverBase -notmatch '^https?://') {
  $serverBase = "http://$serverBase"
}

$headers = @{}
if (-not $UseBridge) {
  if (-not $AdminToken) { throw "AdminToken is required unless -UseBridge is set" }
  $headers['x-admin-token'] = $AdminToken
}
$headers['Content-Type'] = 'application/octet-stream'

$bytes = [System.IO.File]::ReadAllBytes((Resolve-Path $InstallerPath))

if ($UseBridge) {
  $bridge = $BridgeBase.TrimEnd('/')
  $uploadUri = "$bridge/bridge/admin/upload-installer?fileName=$([uri]::EscapeDataString($FileName))"
  Write-Host "[publish] Uploading installer via bridge $bridge ..."
} else {
  $uploadUri = "$serverBase/admin/upload-installer?fileName=$([uri]::EscapeDataString($FileName))"
  Write-Host "[publish] Uploading installer to $serverBase ..."
}

$uploadRes = Invoke-RestMethod -Method POST -Uri $uploadUri -Headers $headers -Body $bytes -TimeoutSec 300
if (-not $uploadRes.ok) {
  throw "Upload failed: $($uploadRes | ConvertTo-Json -Compress)"
}

$downloadUrl = "$serverBase$($uploadRes.path)"
Write-Host "[publish] Uploaded: $downloadUrl"

$body = @{
  platform = $Platform
  channel  = $Channel
  version  = $Version
  url      = $downloadUrl
  notes    = $Notes
} | ConvertTo-Json

$pubHeaders = @{ 'Content-Type' = 'application/json' }
if (-not $UseBridge) { $pubHeaders['x-admin-token'] = $AdminToken }

if ($UseBridge) {
  $publishUri = "$($BridgeBase.TrimEnd('/'))/bridge/admin/publish"
  Write-Host "[publish] Publishing metadata via bridge ..."
} else {
  $publishUri = "$serverBase/admin/publish"
  Write-Host "[publish] Publishing metadata ..."
}

$pubRes = Invoke-RestMethod -Method POST -Uri $publishUri -Headers $pubHeaders -Body $body -TimeoutSec 60
if (-not $pubRes.ok) {
  throw "Publish failed: $($pubRes | ConvertTo-Json -Compress)"
}

Write-Host "[publish] Success"
$pubRes | ConvertTo-Json -Depth 8
