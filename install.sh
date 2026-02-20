#!/bin/bash
# OpenClaw Dev Team Installer
# Usage: ./install.sh [--uninstall]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directories
OPENCLAW_DIR="$HOME/.openclaw"
SKILLS_DIR="$OPENCLAW_DIR/skills"
HOOKS_DIR="$OPENCLAW_DIR/hooks"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Skills to install
SKILLS=(
    "dev-team-orchestrator"
    "dev-team-planner"
    "dev-team-executor"
    "dev-team-validator"
)

# Hooks to install
HOOKS=(
    "dev-team-trigger"
)

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  OpenClaw Dev Team Installer${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check OpenClaw installation
check_openclaw() {
    if ! command -v openclaw &> /dev/null; then
        echo -e "${YELLOW}Warning: 'openclaw' command not found in PATH${NC}"
        echo "OpenClaw may still be installed. Continuing..."
    fi
    
    # Create directories if they don't exist
    mkdir -p "$SKILLS_DIR"
    mkdir -p "$HOOKS_DIR"
}

# Install skills
install_skills() {
    echo -e "${YELLOW}Installing Skills...${NC}"
    
    for skill in "${SKILLS[@]}"; do
        local src="$SCRIPT_DIR/skills/${skill#dev-team-}"
        local dest="$SKILLS_DIR/$skill"
        
        if [ -d "$src" ]; then
            echo "  → Installing $skill..."
            mkdir -p "$dest"
            cp -r "$src"/* "$dest/"
            echo -e "    ${GREEN}✓ $skill installed${NC}"
        else
            echo -e "    ${RED}✗ Source not found: $src${NC}"
        fi
    done
}

# Install hooks
install_hooks() {
    echo -e "${YELLOW}Installing Hooks...${NC}"
    
    for hook in "${HOOKS[@]}"; do
        local src="$SCRIPT_DIR/hooks/$hook"
        local dest="$HOOKS_DIR/$hook"
        
        if [ -d "$src" ]; then
            echo "  → Installing $hook..."
            mkdir -p "$dest"
            cp -r "$src"/* "$dest/"
            echo -e "    ${GREEN}✓ $hook installed${NC}"
        else
            echo -e "    ${RED}✗ Source not found: $src${NC}"
        fi
    done
}

# Create workspace directory
create_workspace() {
    echo -e "${YELLOW}Creating workspace...${NC}"
    
    local workspace="$OPENCLAW_DIR/workspace/dev-team"
    mkdir -p "$workspace"/{state,plans,reports,screenshots,memory}
    
    # Copy state templates
    if [ -d "$SCRIPT_DIR/.dev-team/state" ]; then
        cp -r "$SCRIPT_DIR/.dev-team/state"/* "$workspace/state/" 2>/dev/null || true
    fi
    
    echo -e "    ${GREEN}✓ Workspace created at $workspace${NC}"
}

# Enable skills and hooks
enable_components() {
    echo -e "${YELLOW}Enabling components...${NC}"
    
    # Try to enable via CLI if available
    if command -v openclaw &> /dev/null; then
        for skill in "${SKILLS[@]}"; do
            openclaw skills enable "$skill" 2>/dev/null || true
        done
        
        for hook in "${HOOKS[@]}"; do
            openclaw hooks enable "$hook" 2>/dev/null || true
        done
        echo -e "    ${GREEN}✓ Components enabled${NC}"
    else
        echo -e "    ${YELLOW}! OpenClaw CLI not found. Enable manually:${NC}"
        echo "      openclaw skills enable dev-team-orchestrator"
        echo "      openclaw hooks enable dev-team-trigger"
    fi
}

# Uninstall
uninstall() {
    echo -e "${RED}Uninstalling OpenClaw Dev Team...${NC}"
    
    for skill in "${SKILLS[@]}"; do
        if [ -d "$SKILLS_DIR/$skill" ]; then
            rm -rf "$SKILLS_DIR/$skill"
            echo "  → Removed $skill"
        fi
    done
    
    for hook in "${HOOKS[@]}"; do
        if [ -d "$HOOKS_DIR/$hook" ]; then
            rm -rf "$HOOKS_DIR/$hook"
            echo "  → Removed $hook"
        fi
    done
    
    echo -e "${GREEN}✓ Uninstall complete${NC}"
    exit 0
}

# Print summary
print_summary() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Installation Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Installed Skills:"
    for skill in "${SKILLS[@]}"; do
        echo "  • $skill"
    done
    echo ""
    echo "Installed Hooks:"
    for hook in "${HOOKS[@]}"; do
        echo "  • $hook"
    done
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Restart OpenClaw:"
    echo "   openclaw restart"
    echo ""
    echo "2. Enable components (if not auto-enabled):"
    echo "   openclaw skills enable dev-team-orchestrator"
    echo "   openclaw hooks enable dev-team-trigger"
    echo ""
    echo "3. Verify installation:"
    echo "   openclaw skills list"
    echo "   openclaw hooks list"
    echo ""
    echo "4. Test in Telegram:"
    echo '   "대시보드 만들어줘"'
    echo ""
}

# Main
main() {
    if [ "$1" == "--uninstall" ]; then
        uninstall
    fi
    
    check_openclaw
    install_skills
    install_hooks
    create_workspace
    enable_components
    print_summary
}

main "$@"
