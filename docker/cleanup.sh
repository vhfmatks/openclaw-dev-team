#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🛑 Stopping OpenClaw..."
docker-compose down

echo ""
echo "🧹 Cleaning up..."
read -p "Remove all data? (y/N): " remove_data
if [ "$remove_data" = "y" ] || [ "$remove_data" = "Y" ]; then
    rm -rf workspace/* config/* dev-projects/*
    echo "✅ Data removed"
fi

echo ""
echo "✅ Cleanup complete"
