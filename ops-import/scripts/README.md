# Ops Scripts

## Local ops bridge

Run local token-injecting proxy (localhost only):

```powershell
node .\scripts\local-ops-bridge.js
```

Config file:

- `secrets/ops-bridge.local.json`

Example local endpoints:

- `GET http://127.0.0.1:8799/health`
- `GET http://127.0.0.1:8799/bridge/server/health`
- `GET http://127.0.0.1:8799/bridge/updates/check?platform=win&channel=stable&version=1.2.3`

## Updater publish/check bootstrap (one command)

This runs:
1. server `/health` (or bridge + server health with `-UseBridge`)
2. upload installer + publish metadata (unless `-SkipPublish`)
3. verify `/updates/check` (defaults to client version `0.0.0` after publish so update-available path is exercised)

```powershell
.\scripts\updater-bootstrap.ps1 \
  -ConfigPath .\secrets\ops-bridge.local.json \
  -Version 0.4.4 \
  -InstallerPath C:\path\to\Carapace-Setup.exe \
  -Platform win \
  -Channel stable \
  -Notes "nightly bootstrap"
```

Bridge mode (recommended; tokens stay local and hidden from command history):

```powershell
node .\scripts\local-ops-bridge.js
.\scripts\updater-bootstrap.ps1 `
  -ConfigPath .\secrets\ops-bridge.local.json `
  -Version 0.4.4 `
  -InstallerPath C:\path\to\Carapace-Setup.exe `
  -UseBridge
```

Check-only mode (no publish):

```powershell
.\scripts\updater-bootstrap.ps1 -ConfigPath .\secrets\ops-bridge.local.json -SkipPublish -Platform win -Channel stable
```

Optional: set a specific client version for the check request:

```powershell
.\scripts\updater-bootstrap.ps1 ... -CheckClientVersion 0.4.2
```

## Local end-to-end validation (no VPS dependency)

Use a local mock updater API + bridge to validate publish/check logic:

```powershell
node .\scripts\mock-updater-server.js
$env:OPS_BRIDGE_CONFIG = (Resolve-Path .\secrets\ops-bridge.local.mock.json)
node .\scripts\local-ops-bridge.js

.\scripts\updater-bootstrap.ps1 `
  -ConfigPath .\secrets\ops-bridge.local.mock.json `
  -Version 0.4.4 `
  -InstallerPath .\tmp-installer.bin `
  -FileName Carapace-Setup.exe `
  -UseBridge
```

## Direct publish helper

If you need explicit calls:

```powershell
.\scripts\publish-updater-release.ps1 \
  -Server http://SERVER_IP \
  -AdminToken YOUR_ADMIN_TOKEN \
  -Version 0.4.4 \
  -InstallerPath C:\path\to\Carapace-Setup.exe
```
