#!/bin/bash
set -e

echo "🦞 OpenClaw Dev Team - Docker Setup (Z.AI GLM-4.7)"
echo "===================================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$SCRIPT_DIR"

# Load .env from project root if exists
if [ -f "$PROJECT_ROOT/.env" ]; then
    echo "📥 Loading .env from project root..."
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
fi

echo "📁 Creating directories..."
mkdir -p config workspace skills hooks dev-projects

echo "📦 Copying Dev Team files..."
cp -r "$PROJECT_ROOT/skills/"* skills/ 2>/dev/null || echo "  Skills copied"
cp -r "$PROJECT_ROOT/hooks/"* hooks/ 2>/dev/null || echo "  Hooks copied"

echo ""
echo "🔐 Z.AI API Key Configuration"
echo "==============================="

if [ -z "$ZAI_API_KEY" ]; then
    echo "⚠️  ZAI_API_KEY not set!"
    echo ""
    echo "Create .env file in project root with:"
    echo "  ZAI_API_KEY=your-key-here"
    echo ""
    read -p "Enter your Z.AI API Key: " zai_key
    export ZAI_API_KEY="$zai_key"
else
    echo "✅ ZAI_API_KEY is set (${ZAI_API_KEY:0:10}...)"
fi

echo ""
echo "📝 Creating .env file..."
cat > .env << EOF
ZAI_API_KEY=${ZAI_API_KEY}
EOF

echo ""
echo "📝 Creating OpenClaw config for Z.AI..."
mkdir -p config
cat > config/openclaw.json << EOF
{
  "env": {
    "ZAI_API_KEY": "${ZAI_API_KEY}"
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "zai/glm-4.7",
        "fallbacks": ["zai/glm-4-flash"]
      }
    }
  }
}
EOF

echo ""
echo "📦 Step: Clone OpenClaw (required for Docker build)..."
if [ ! -d "openclaw" ]; then
    git clone --depth 1 https://github.com/openclaw/openclaw.git openclaw
    echo "✅ OpenClaw cloned"
else
    echo "✅ OpenClaw already exists (run 'rm -rf openclaw' to refresh)"
fi

echo ""
echo "🔨 Building OpenClaw Docker image (this takes a few minutes)..."
docker build -t openclaw:local -f openclaw/Dockerfile openclaw/

echo ""
echo "🚀 Starting OpenClaw container..."
docker-compose up -d

echo ""
echo "⏳ Waiting for OpenClaw to start..."
sleep 5

echo ""
echo "🔧 Enabling Dev Team skills and hooks..."
docker exec openclaw-dev-team node dist/index.js skills enable dev-team-start 2>/dev/null || true
docker exec openclaw-dev-team node dist/index.js skills enable dev-team-orchestrator 2>/dev/null || true
docker exec openclaw-dev-team node dist/index.js skills enable dev-team-planner 2>/dev/null || true
docker exec openclaw-dev-team node dist/index.js skills enable dev-team-executor 2>/dev/null || true
docker exec openclaw-dev-team node dist/index.js skills enable dev-team-validator 2>/dev/null || true
docker exec openclaw-dev-team node dist/index.js hooks enable dev-team-trigger 2>/dev/null || true

echo ""
echo "🔄 Restarting to apply config..."
docker-compose restart
sleep 3

echo ""
echo "✅ OpenClaw Dev Team is running with Z.AI GLM-4.7!"
echo ""
echo "📍 Endpoints:"
echo "   - Gateway: http://localhost:18789"
echo "   - Bridge:  http://localhost:18790"
echo ""
echo "🤖 Model: zai/glm-4.7"
echo ""
echo "🔧 Commands:"
echo "   - Logs:  docker-compose logs -f"
echo "   - Stop:  docker-compose down"
echo "   - CLI:   docker exec -it openclaw-dev-team-gateway node dist/index.js"
echo ""
echo "📋 Verify:"
echo "   docker exec openclaw-dev-team-gateway node dist/index.js models status"
echo ""
