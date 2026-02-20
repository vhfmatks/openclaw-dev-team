#!/bin/bash
set -e

echo "🦞 OpenClaw Dev Team - Docker Setup"
echo "====================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$SCRIPT_DIR"

echo "📁 Creating directories..."
mkdir -p workspace config skills hooks dev-projects

echo "📦 Copying Dev Team files..."
cp -r "$PROJECT_ROOT/skills/"* skills/ 2>/dev/null || true
cp -r "$PROJECT_ROOT/hooks/"* hooks/ 2>/dev/null || true

echo ""
echo "🔐 Checking API keys..."
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠️  ANTHROPIC_API_KEY not set!"
    echo "   Please set it:"
    echo "   export ANTHROPIC_API_KEY=your-key-here"
    echo ""
    read -p "Enter your Anthropic API key: " api_key
    export ANTHROPIC_API_KEY="$api_key"
fi

echo ""
echo "📝 Creating .env file..."
cat > .env << EOF
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
EOF

echo ""
echo "🐳 Pulling OpenClaw Docker image..."
docker pull openclaw/openclaw:latest

echo ""
echo "🚀 Starting OpenClaw container..."
docker-compose up -d

echo ""
echo "⏳ Waiting for OpenClaw to start..."
sleep 10

echo ""
echo "✅ OpenClaw Dev Team is running!"
echo ""
echo "📍 Endpoints:"
echo "   - Gateway API: http://localhost:18789"
echo ""
echo "📂 Volumes:"
echo "   - Workspace: ./workspace"
echo "   - Config:    ./config"
echo "   - Skills:    ./skills"
echo "   - Hooks:     ./hooks"
echo "   - Projects:  ./dev-projects"
echo ""
echo "🔧 Commands:"
echo "   - View logs:   docker-compose logs -f"
echo "   - Stop:        docker-compose down"
echo "   - Restart:     docker-compose restart"
echo "   - Shell:       docker exec -it openclaw-dev-team /bin/bash"
echo ""
echo "📋 Enable Dev Team Skills:"
echo "   docker exec -it openclaw-dev-team openclaw skills enable dev-team-start"
echo "   docker exec -it openclaw-dev-team openclaw skills enable dev-team-orchestrator"
echo "   docker exec -it openclaw-dev-team openclaw hooks enable dev-team-trigger"
echo ""
