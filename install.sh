#!/usr/bin/env bash
# Packages this folder into a .vsix and installs it into VS Code.
# Usage: ./install.sh
set -euo pipefail
cd "$(dirname "$0")"

npx --yes @vscode/vsce package --allow-missing-repository --skip-license --out pinpoint.vsix

if command -v code >/dev/null 2>&1; then
  code_bin="$(command -v code)"
elif [[ -x '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code' ]]; then
  code_bin='/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code'
elif [[ -x "$HOME/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" ]]; then
  code_bin="$HOME/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
else
  echo 'Could not find the VS Code command-line tool.' >&2
  echo 'In VS Code, run: Shell Command: Install '\''code'\'' command in PATH' >&2
  exit 1
fi

"$code_bin" --install-extension pinpoint.vsix --force
rm -f pinpoint.vsix

echo
echo 'Installed. Reload VS Code, open the Integrated Browser, click the inspect icon in its title bar.'
