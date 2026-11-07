#!/usr/bin/env bash
# Prepare a development environment on Ubuntu and optionally unpack the project archive into a folder.
#
# Usage:
#   bash setup-ubuntu.sh                       # Check the environment and install Node 22 / pnpm / git
#   bash setup-ubuntu.sh <project-folder>      # Also unpack holdem-knight.tar.gz from this folder into it,
#                                              # install dependencies and run the full check
#
# Example: bash setup-ubuntu.sh ~/Desktop/holdem
set -euo pipefail

NODE_MAJOR=22
NVM_VERSION=v0.40.3
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARBALL="${SCRIPT_DIR}/holdem-knight.tar.gz"
TARGET="${1:-}"

section() { printf '\n\033[1;32m== %s ==\033[0m\n' "$1"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$1"; }

section "Checking the environment"
echo "System: $( (lsb_release -ds 2>/dev/null) || grep PRETTY_NAME /etc/os-release | cut -d= -f2)"
echo "Architecture: $(uname -m)    CPU cores: $(nproc)"
echo "Memory: $(free -h | awk '/^Mem:/ {print $2 " total, " $7 " available"}')"
echo "Disk (home directory): $(df -h "$HOME" | awk 'NR==2 {print $4 " available / " $2}')"
echo "Desktop folder: $(xdg-user-dir DESKTOP 2>/dev/null || echo "$HOME/Desktop")"
for cmd in git curl node pnpm docker code; do
  if command -v "$cmd" >/dev/null 2>&1; then
    printf '  %-6s %s\n' "$cmd" "$("$cmd" --version 2>/dev/null | head -1)"
  else
    printf '  %-6s not installed\n' "$cmd"
  fi
done
if [ "$(nproc)" -lt 2 ]; then warn "Give the VM at least 2 CPU cores"; fi
if [ "$(free -m | awk '/^Mem:/ {print $2}')" -lt 3500 ]; then warn "Give the VM at least 4GB of memory"; fi

section "Installing base tools (needs your sudo password)"
sudo apt-get update -y
sudo apt-get install -y git curl ca-certificates build-essential xdg-user-dirs

section "Installing Node.js ${NODE_MAJOR} (through nvm)"
export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash
fi
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm install "$NODE_MAJOR"
nvm alias default "$NODE_MAJOR"
echo "node $(node --version)"

section "Enabling pnpm (corepack)"
corepack enable
corepack prepare pnpm@10.28.0 --activate
echo "pnpm $(pnpm --version)"

if [ -z "$TARGET" ]; then
  section "Done"
  echo "The environment is ready. To unpack the project, run: bash setup-ubuntu.sh <project-folder>"
  exit 0
fi

section "Unpacking the project into ${TARGET}"
if [ ! -f "$TARBALL" ]; then
  echo "Could not find ${TARBALL}. Put holdem-knight.tar.gz in the same folder as this script." >&2
  exit 1
fi
mkdir -p "$TARGET"
if [ -n "$(ls -A "$TARGET")" ]; then
  echo "${TARGET} is not empty. Stopped to avoid overwriting files. Use an empty folder or clear this one first." >&2
  ls -A "$TARGET" >&2
  exit 1
fi
tar -xzf "$TARBALL" -C "$TARGET" --strip-components=1
cd "$TARGET"
git log --oneline | head -10

section "Installing dependencies and running the full check"
pnpm install --frozen-lockfile
pnpm check

section "Done"
echo "Project location: $TARGET"
echo "Start the dev server: cd \"$TARGET\" && pnpm dev"
