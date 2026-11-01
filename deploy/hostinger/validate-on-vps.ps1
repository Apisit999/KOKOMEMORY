# Run from the repository root on the workstation that holds the VPS SSH key:
#   powershell -ExecutionPolicy Bypass -File deploy\hostinger\validate-on-vps.ps1
# It uploads the source (no .env files, no node_modules, no .git) to /tmp on the VPS, runs validate-on-vps.sh
# there (docker compose config, docker build, container run, nginx -t and an isolated Nginx proxy test), prints
# the result, and removes everything it created. It does not change the live Nginx, PM2 or the production site.
param([string]$Target = "root@187.77.122.132", [string]$KeyFile = "")
$ErrorActionPreference = "Stop"
# With -KeyFile the key is used directly (no ssh-agent needed); host keys are still checked strictly.
$sshOpts = @("-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes")
if ($KeyFile) { $sshOpts += @("-i", $KeyFile, "-o", "IdentitiesOnly=yes") }
if (-not (Test-Path "package.json") -or -not (Test-Path "deploy\hostinger\validate-on-vps.sh")) { throw "Run this from the repository root." }
$archive = Join-Path $env:TEMP "koko-validate.tgz"
Write-Host "Packing source (excluding secrets and build output)..."
tar --exclude=node_modules --exclude=.next --exclude=.next-studio-local --exclude=".env*" --exclude=output --exclude=.local-tools --exclude=.git --exclude=.playwright-cli --exclude=coverage -czf $archive .
if ($LASTEXITCODE -ne 0) { throw "tar failed" }
Write-Host ("Archive: {0:N1} MB" -f ((Get-Item $archive).Length / 1MB))
# The remote script must have LF line endings.
$script = (Get-Content -Raw "deploy\hostinger\validate-on-vps.sh") -replace "`r", ""
$remoteScript = Join-Path $env:TEMP "koko-validate.sh"
[IO.File]::WriteAllText($remoteScript, $script, (New-Object Text.UTF8Encoding $false))
scp @sshOpts $archive "${Target}:/tmp/koko-validate.tgz"
if ($LASTEXITCODE -ne 0) { throw "scp of archive failed (is the SSH agent running with the staging key?)" }
scp @sshOpts $remoteScript "${Target}:/tmp/koko-validate.sh"
if ($LASTEXITCODE -ne 0) { throw "scp of script failed" }
ssh @sshOpts $Target "bash /tmp/koko-validate.sh /tmp/koko-validate.tgz; rm -f /tmp/koko-validate.sh"
Remove-Item $archive, $remoteScript -Force
