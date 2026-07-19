# Packages this folder into a .vsix and installs it into VS Code.
# Usage (from anywhere): powershell -ExecutionPolicy Bypass -File .\vscode-extension\install.ps1
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$vsix = Join-Path $PSScriptRoot 'pinpoint.vsix'
npx --yes @vscode/vsce package --allow-missing-repository --skip-license --out $vsix
if ($LASTEXITCODE -ne 0) { throw 'vsce package failed' }

code --install-extension $vsix --force
if ($LASTEXITCODE -ne 0) { throw 'code --install-extension failed' }

Remove-Item $vsix -Force
Write-Host ''
Write-Host 'Installed. Reload VS Code, open the Integrated Browser, click the inspect icon in its title bar.'
