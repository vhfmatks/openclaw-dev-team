#!/bin/bash
# Quick installer - downloads and installs from GitHub
# Usage: curl -sSL https://raw.githubusercontent.com/vhfmatks/openclaw-dev-team/main/quick-install.sh | bash

set -e

REPO_URL="https://github.com/vhfmatks/openclaw-dev-team"
INSTALL_DIR="/tmp/openclaw-dev-team-$$"

echo "🚀 Installing OpenClaw Dev Team..."

# Download
echo "📦 Downloading..."
git clone --depth 1 "$REPO_URL" "$INSTALL_DIR" 2>/dev/null || {
    echo "❌ Failed to clone repository"
    exit 1
}

# Install
cd "$INSTALL_DIR"
chmod +x install.sh
./install.sh

# Cleanup
cd /
rm -rf "$INSTALL_DIR"

echo "✅ Done!"
