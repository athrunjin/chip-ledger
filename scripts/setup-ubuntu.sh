#!/usr/bin/env bash
# 在 Ubuntu 上准备开发环境，并（可选）把项目压缩包解压到指定文件夹。
#
# 用法：
#   bash setup-ubuntu.sh                       # 只检测环境、安装 Node 22 / pnpm / git
#   bash setup-ubuntu.sh <项目文件夹>          # 另外把同目录下的 holdem-assistant.tar.gz 解压进去，
#                                              # 安装依赖并跑一遍完整检查
#
# 例如：bash setup-ubuntu.sh ~/Desktop/holdem
set -euo pipefail

NODE_MAJOR=22
NVM_VERSION=v0.40.3
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARBALL="${SCRIPT_DIR}/holdem-assistant.tar.gz"
TARGET="${1:-}"

section() { printf '\n\033[1;32m== %s ==\033[0m\n' "$1"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$1"; }

section "环境检测"
echo "系统：$( (lsb_release -ds 2>/dev/null) || grep PRETTY_NAME /etc/os-release | cut -d= -f2)"
echo "架构：$(uname -m)    CPU 核数：$(nproc)"
echo "内存：$(free -h | awk '/^Mem:/ {print $2 " 总计，" $7 " 可用"}')"
echo "磁盘（家目录）：$(df -h "$HOME" | awk 'NR==2 {print $4 " 可用 / " $2}')"
echo "桌面文件夹：$(xdg-user-dir DESKTOP 2>/dev/null || echo "$HOME/Desktop")"
for cmd in git curl node pnpm docker code; do
  if command -v "$cmd" >/dev/null 2>&1; then
    printf '  %-6s %s\n' "$cmd" "$("$cmd" --version 2>/dev/null | head -1)"
  else
    printf '  %-6s 未安装\n' "$cmd"
  fi
done
if [ "$(nproc)" -lt 2 ]; then warn "建议给虚拟机分配至少 2 个 CPU 核"; fi
if [ "$(free -m | awk '/^Mem:/ {print $2}')" -lt 3500 ]; then warn "建议给虚拟机分配至少 4GB 内存"; fi

section "安装基础工具（需要 sudo 密码）"
sudo apt-get update -y
sudo apt-get install -y git curl ca-certificates build-essential xdg-user-dirs

section "安装 Node.js ${NODE_MAJOR}（通过 nvm）"
export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash
fi
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm install "$NODE_MAJOR"
nvm alias default "$NODE_MAJOR"
echo "node $(node --version)"

section "启用 pnpm（corepack）"
corepack enable
corepack prepare pnpm@10.28.0 --activate
echo "pnpm $(pnpm --version)"

if [ -z "$TARGET" ]; then
  section "完成"
  echo "环境已就绪。要解压项目，请重新运行：bash setup-ubuntu.sh <项目文件夹>"
  exit 0
fi

section "解压项目到 ${TARGET}"
if [ ! -f "$TARBALL" ]; then
  echo "找不到 ${TARBALL}。请把 holdem-assistant.tar.gz 和本脚本放在同一个文件夹。" >&2
  exit 1
fi
mkdir -p "$TARGET"
if [ -n "$(ls -A "$TARGET")" ]; then
  echo "${TARGET} 不是空文件夹，为避免覆盖已有文件，已停止。请换一个空文件夹或先清空。" >&2
  ls -A "$TARGET" >&2
  exit 1
fi
tar -xzf "$TARBALL" -C "$TARGET" --strip-components=1
cd "$TARGET"
git log --oneline | head -10

section "安装依赖并完整检查"
pnpm install --frozen-lockfile
pnpm check

section "完成"
echo "项目位于：$TARGET"
echo "启动开发服务器：cd \"$TARGET\" && pnpm dev"
