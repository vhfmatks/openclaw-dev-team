#!/bin/bash
# OpenClaw Dev Team Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/vhfmatks/openclaw-dev-team/main/install.sh | bash
# 
# Options:
#   --uninstall    Remove all installed components
#   --update       Update to latest version
#   --version      Show version info

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Version
VERSION="0.2.0"
REPO_URL="https://github.com/vhfmatks/openclaw-dev-team"
RAW_URL="https://raw.githubusercontent.com/vhfmatks/openclaw-dev-team/main"

# Directories
OPENCLAW_DIR="$HOME/.openclaw"
SKILLS_DIR="$OPENCLAW_DIR/skills"
HOOKS_DIR="$OPENCLAW_DIR/hooks"
WORKSPACE_DIR="$OPENCLAW_DIR/workspace/dev-team"
EVIDENCE_DIR="$OPENCLAW_DIR/workspace/dev-team/evidence"
TEMP_DIR="/tmp/openclaw-dev-team-install"

# All skills directories (folder name in skills/)
ALL_SKILLS=(
    "orchestrator"
    "dev-team-start"
    "plan-squad"
    "planner"
    "critic"
    "architecture"
    "execution-squad"
    "coder"
    "code-reviewer"
    "tester"
    "dependency-manager"
    "review-squad"
    "reviewer"
    "qa-tester"
    "final-approver"
    "openclaw-tester"
    "executor"
    "agents"
    "utils"
)

# Hooks to install
ALL_HOOKS=(
    "dev-team-trigger"
)

# Print banner
print_banner() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                                                           ║"
    echo "║          🤖 OpenClaw Dev Team Installer                  ║"
    echo "║                                                           ║"
    echo "║     AI-powered development team for OpenClaw             ║"
    echo "║                                                           ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check if OpenClaw is installed
    if ! command -v openclaw &> /dev/null; then
        echo -e "${YELLOW}⚠ 'openclaw' command not found in PATH${NC}"
        echo "  OpenClaw may still be installed. Continuing..."
    else
        echo -e "${GREEN}✓ OpenClaw CLI found${NC}"
    fi
    
    # Create directories
    mkdir -p "$SKILLS_DIR"
    mkdir -p "$HOOKS_DIR"
    mkdir -p "$WORKSPACE_DIR"/{state,plans,reports,screenshots,memory}
    mkdir -p "$EVIDENCE_DIR"/{screenshots,logs,snapshots,scripts,reports}
    
    echo -e "${GREEN}✓ Directories created${NC}"
}

# Download latest release
download_latest() {
    echo -e "${YELLOW}Downloading latest version...${NC}"
    
    rm -rf "$TEMP_DIR"
    mkdir -p "$TEMP_DIR"
    
    # Clone the repository
    if command -v git &> /dev/null; then
        git clone --depth 1 "$REPO_URL" "$TEMP_DIR" 2>/dev/null
        echo -e "${GREEN}✓ Downloaded via git${NC}"
    else
        echo -e "${RED}✗ git not found. Please install git.${NC}"
        exit 1
    fi
}

# Install skills
install_skills() {
    echo ""
    echo -e "${YELLOW}Installing Skills (22 total)...${NC}"
    
    local count=0
    local total=${#ALL_SKILLS[@]}
    
    for skill in "${ALL_SKILLS[@]}"; do
        local src="$TEMP_DIR/skills/$skill"
        local dest="$SKILLS_DIR/$skill"
        
        if [ -d "$src" ]; then
            ((count++))
            echo -ne "  → [$count/$total] Installing $skill... "
            rm -rf "$dest"
            cp -r "$src" "$dest"
            echo -e "${GREEN}✓${NC}"
        fi
    done
    
    # Also copy types.ts if needed by skills
    if [ -f "$TEMP_DIR/skills/types.ts" ]; then
        cp "$TEMP_DIR/skills/types.ts" "$SKILLS_DIR/"
    fi
    
    # Copy pipeline-log-format.md if exists
    if [ -f "$TEMP_DIR/skills/pipeline-log-format.md" ]; then
        cp "$TEMP_DIR/skills/pipeline-log-format.md" "$SKILLS_DIR/"
    fi
    
    echo -e "${GREEN}✓ $count skills installed${NC}"
}

# Install hooks
install_hooks() {
    echo ""
    echo -e "${YELLOW}Installing Hooks...${NC}"
    
    for hook in "${ALL_HOOKS[@]}"; do
        local src="$TEMP_DIR/hooks/$hook"
        local dest="$HOOKS_DIR/$hook"
        
        if [ -d "$src" ]; then
            echo -ne "  → Installing $hook... "
            rm -rf "$dest"
            cp -r "$src" "$dest"
            
            # Make handler executable
            if [ -f "$dest/handler.js" ]; then
                chmod +x "$dest/handler.js"
            fi
            
            echo -e "${GREEN}✓${NC}"
        fi
    done
    
    echo -e "${GREEN}✓ Hooks installed${NC}"
}

# Enable components via OpenClaw CLI
enable_components() {
    echo ""
    echo -e "${YELLOW}Enabling components...${NC}"
    
    if ! command -v openclaw &> /dev/null; then
        echo -e "${YELLOW}⚠ OpenClaw CLI not found. Skip auto-enable.${NC}"
        return
    fi
    
    # Enable main squad skills
    openclaw skills enable dev-team:orchestrator 2>/dev/null && echo -e "  ${GREEN}✓${NC} dev-team:orchestrator" || true
    openclaw skills enable dev-team:start 2>/dev/null && echo -e "  ${GREEN}✓${NC} dev-team:start" || true
    
    # Plan Squad
    openclaw skills enable dev-team:planning-squad 2>/dev/null && echo -e "  ${GREEN}✓${NC} dev-team:planning-squad" || true
    openclaw skills enable dev-team:planning-planner 2>/dev/null || true
    openclaw skills enable dev-team:planning-critic 2>/dev/null || true
    openclaw skills enable dev-team:planning-architecture 2>/dev/null || true
    
    # Execution Squad
    openclaw skills enable dev-team:execution-squad 2>/dev/null && echo -e "  ${GREEN}✓${NC} dev-team:execution-squad" || true
    openclaw skills enable dev-team:execution-coder 2>/dev/null || true
    openclaw skills enable dev-team:execution-code-reviewer 2>/dev/null || true
    openclaw skills enable dev-team:execution-tester 2>/dev/null || true
    openclaw skills enable dev-team:execution-dependency-manager 2>/dev/null || true
    
    # Review Squad
    openclaw skills enable dev-team:review-squad 2>/dev/null && echo -e "  ${GREEN}✓${NC} dev-team:review-squad" || true
    openclaw skills enable dev-team:review-reviewer 2>/dev/null || true
    openclaw skills enable dev-team:review-qa-tester 2>/dev/null || true
    openclaw skills enable dev-team:review-openclaw-tester 2>/dev/null || true
    openclaw skills enable dev-team:review-final-approver 2>/dev/null || true
    
    # Hooks
    openclaw hooks enable dev-team-trigger 2>/dev/null && echo -e "  ${GREEN}✓${NC} dev-team-trigger" || true
    
    echo -e "${GREEN}✓ Components enabled${NC}"
}

# Restart OpenClaw
restart_openclaw() {
    if command -v openclaw &> /dev/null; then
        echo ""
        echo -e "${YELLOW}Restarting OpenClaw...${NC}"
        openclaw restart 2>/dev/null || true
        echo -e "${GREEN}✓ OpenClaw restarted${NC}"
    fi
}

# Cleanup
cleanup() {
    rm -rf "$TEMP_DIR"
}

# Uninstall
uninstall() {
    echo -e "${RED}Uninstalling OpenClaw Dev Team...${NC}"
    echo ""
    
    for skill in "${ALL_SKILLS[@]}"; do
        if [ -d "$SKILLS_DIR/$skill" ]; then
            rm -rf "$SKILLS_DIR/$skill"
            echo "  → Removed $skill"
        fi
    done
    
    for hook in "${ALL_HOOKS[@]}"; do
        if [ -d "$HOOKS_DIR/$hook" ]; then
            rm -rf "$HOOKS_DIR/$hook"
            echo "  → Removed $hook"
        fi
    done
    
    # Remove types.ts
    rm -f "$SKILLS_DIR/types.ts"
    rm -f "$SKILLS_DIR/pipeline-log-format.md"
    
    echo ""
    echo -e "${GREEN}✓ Uninstall complete${NC}"
    exit 0
}

# Show version
show_version() {
    echo "OpenClaw Dev Team v$VERSION"
    echo "Repository: $REPO_URL"
    exit 0
}

# Print summary
print_summary() {
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}              ✓ Installation Complete!                      ${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}Installed Skills (22):${NC}"
    echo "  • dev-team:orchestrator (Main Entry Point)"
    echo "  • dev-team:start"
    echo ""
    echo "  Plan Squad (4):"
    echo "    • dev-team:planning-squad"
    echo "    • dev-team:planning-planner"
    echo "    • dev-team:planning-critic"
    echo "    • dev-team:planning-architecture"
    echo ""
    echo "  Execution Squad (5):"
    echo "    • dev-team:execution-squad"
    echo "    • dev-team:execution-coder"
    echo "    • dev-team:execution-code-reviewer"
    echo "    • dev-team:execution-tester"
    echo "    • dev-team:execution-dependency-manager"
    echo ""
    echo "  Review Squad (5):"
    echo "    • dev-team:review-squad"
    echo "    • dev-team:review-reviewer"
    echo "    • dev-team:review-qa-tester"
    echo "    • dev-team:review-openclaw-tester ⚡"
    echo "    • dev-team:review-final-approver"
    echo ""
    echo -e "${BLUE}Installed Hooks:${NC}"
    echo "  • dev-team-trigger"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo ""
    echo "  1. Restart OpenClaw (if not auto-restarted):"
    echo "     ${BLUE}openclaw restart${NC}"
    echo ""
    echo "  2. Verify installation:"
    echo "     ${BLUE}openclaw skills list | grep dev-team${NC}"
    echo ""
    echo "  3. Test in Telegram:"
    echo '     "대시보드 만들어줘"'
    echo ""
    echo "  4. Check logs:"
    echo "     ${BLUE}tail -f ~/.openclaw/gateway.log | grep dev-team${NC}"
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
}

# Main
main() {
    # Handle options
    case "${1:-}" in
        --uninstall|-u)
            print_banner
            uninstall
            ;;
        --version|-v)
            show_version
            ;;
        --update)
            echo -e "${YELLOW}Updating OpenClaw Dev Team...${NC}"
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --uninstall, -u    Remove all installed components"
            echo "  --update           Update to latest version"
            echo "  --version, -v      Show version info"
            echo "  --help, -h         Show this help"
            exit 0
            ;;
    esac
    
    # Install flow
    print_banner
    check_prerequisites
    download_latest
    install_skills
    install_hooks
    enable_components
    restart_openclaw
    cleanup
    print_summary
}

# Run
main "$@"
