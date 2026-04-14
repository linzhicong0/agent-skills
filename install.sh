#!/usr/bin/env bash
# Install mcp-kb-server globally on macOS / Linux
#
#   Usage:  ./install.sh
#   After:  KB_DIR=/path/to/kb mcp-kb-server

set -euo pipefail

cd "$(dirname "$0")"

echo "Installing dependencies..."
npm install --production=false

echo "Building..."
npm run build

echo "Linking globally..."
npm link

echo ""
echo "Done! mcp-kb-server is now available globally."
echo "Usage:  KB_DIR=/path/to/your/kb mcp-kb-server"
echo ""
echo "To uninstall:  npm unlink -g mcp-kb-server"
