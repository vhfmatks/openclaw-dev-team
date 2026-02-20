# OpenClaw Dev Team - AI Installation Instructions

> This file is optimized for AI agents to read and execute installation.

## Project Overview

```
Name: openclaw-dev-team
Purpose: AI-powered development team for OpenClaw
Type: OpenClaw Skills + Hooks package
Repository: https://github.com/vhfmatks/openclaw-dev-team
```

## Prerequisites

```
REQUIRED:
- OpenClaw installed (v1.0+)
- Node.js 18+
- Git

OPTIONAL:
- Telegram channel configured
- Playwright (for browser testing)
```

## Installation Steps

### Step 1: Download

```bash
cd /tmp
git clone https://github.com/vhfmatks/openclaw-dev-team.git
cd openclaw-dev-team
```

### Step 2: Install Skills

Copy skills to OpenClaw skills directory:

```bash
# Create target directory if not exists
mkdir -p ~/.openclaw/skills

# Copy all skills
cp -r skills/dev-team-orchestrator ~/.openclaw/skills/
cp -r skills/dev-team-planner ~/.openclaw/skills/
cp -r skills/dev-team-executor ~/.openclaw/skills/
cp -r skills/dev-team-validator ~/.openclaw/skills/
```

Expected result:
```
~/.openclaw/skills/
├── dev-team-orchestrator/SKILL.md
├── dev-team-planner/SKILL.md
├── dev-team-executor/SKILL.md
└── dev-team-validator/SKILL.md
```

### Step 3: Install Hooks

Copy hooks to OpenClaw hooks directory:

```bash
# Create target directory if not exists
mkdir -p ~/.openclaw/hooks

# Copy hook
cp -r hooks/dev-team-trigger ~/.openclaw/hooks/
```

Expected result:
```
~/.openclaw/hooks/
└── dev-team-trigger/HOOK.md
```

### Step 4: Create Workspace

Create workspace directories for state management:

```bash
mkdir -p ~/.openclaw/workspace/dev-team/{state,plans,reports,screenshots,memory}
```

### Step 5: Enable Components

Enable skills and hooks via OpenClaw CLI:

```bash
# Enable all skills
openclaw skills enable dev-team-orchestrator
openclaw skills enable dev-team-planner
openclaw skills enable dev-team-executor
openclaw skills enable dev-team-validator

# Enable hook
openclaw hooks enable dev-team-trigger
```

### Step 6: Restart OpenClaw

Restart OpenClaw to load new components:

```bash
openclaw restart
```

Or if running as a service:
```bash
# macOS: Use menu bar app to restart
# Linux: systemctl restart openclaw
```

## Verification

### Verify Skills Installation

```bash
openclaw skills list | grep dev-team
```

Expected output:
```
dev-team-orchestrator
dev-team-planner
dev-team-executor
dev-team-validator
```

### Verify Hooks Installation

```bash
openclaw hooks list | grep dev-team
```

Expected output:
```
dev-team-trigger
```

### Verify File Structure

```bash
ls ~/.openclaw/skills/dev-team-*
ls ~/.openclaw/hooks/dev-team-*
```

### Functional Test

Send a test message via Telegram:
```
테스트 기능 만들어줘
```

Expected response:
```
🔄 개발 요청을 감지했습니다. 작업을 시작합니다...
```

## Components

### Skills

| Name | Purpose | Location |
|------|---------|----------|
| dev-team-orchestrator | Main coordinator | ~/.openclaw/skills/dev-team-orchestrator/ |
| dev-team-planner | Planning agent | ~/.openclaw/skills/dev-team-planner/ |
| dev-team-executor | Code generation | ~/.openclaw/skills/dev-team-executor/ |
| dev-team-validator | Browser testing | ~/.openclaw/skills/dev-team-validator/ |

### Hooks

| Name | Event | Purpose |
|------|-------|---------|
| dev-team-trigger | message:received | Detect dev requests and trigger orchestrator |

## Workflow

```
1. User sends message via Telegram: "대시보드 만들어줘"
2. dev-team-trigger Hook detects dev request keyword
3. Hook invokes dev-team-orchestrator Skill
4. Orchestrator runs pipeline:
   - Phase 1: Planner analyzes request
   - Phase 2: Executor generates code
   - Phase 3: Validator tests in browser
   - Phase 4: Results sent to user
```

## Configuration

### Environment Variables (Optional)

Create `~/.openclaw/workspace/dev-team/.env`:

```
DEV_TEAM_MAX_RETRIES=3
DEV_TEAM_TIMEOUT=3600000
DEV_TEAM_ENABLE_SCREENSHOTS=true
```

### Trigger Keywords

The hook responds to these keywords:
- Korean: 만들어줘, 구현해줘, 개발해줘, 추가해줘, 수정해줘, 고쳐줘
- English: build me, create, implement, develop, make a, add a, fix the

## Troubleshooting

### Skills not appearing

```bash
# Check SKILL.md format
cat ~/.openclaw/skills/dev-team-orchestrator/SKILL.md | head -10

# Should have YAML frontmatter:
# ---
# name: dev-team-orchestrator
# description: ...
# ---
```

### Hooks not triggering

```bash
# Check hook status
openclaw hooks check

# Re-enable hook
openclaw hooks disable dev-team-trigger
openclaw hooks enable dev-team-trigger
```

### Permission errors

```bash
# Fix permissions
chmod -R 755 ~/.openclaw/skills/
chmod -R 755 ~/.openclaw/hooks/
```

### Logs

```bash
# View OpenClaw logs
tail -f ~/.openclaw/gateway.log

# Filter for dev-team
tail -f ~/.openclaw/gateway.log | grep -i "dev-team"
```

## Uninstallation

```bash
# Remove skills
rm -rf ~/.openclaw/skills/dev-team-orchestrator
rm -rf ~/.openclaw/skills/dev-team-planner
rm -rf ~/.openclaw/skills/dev-team-executor
rm -rf ~/.openclaw/skills/dev-team-validator

# Remove hooks
rm -rf ~/.openclaw/hooks/dev-team-trigger

# Remove workspace (optional)
rm -rf ~/.openclaw/workspace/dev-team

# Restart OpenClaw
openclaw restart
```

## Quick Commands Reference

```bash
# Install
git clone https://github.com/vhfmatks/openclaw-dev-team.git /tmp/openclaw-dev-team
cp -r /tmp/openclaw-dev-team/skills/* ~/.openclaw/skills/
cp -r /tmp/openclaw-dev-team/hooks/* ~/.openclaw/hooks/
mkdir -p ~/.openclaw/workspace/dev-team/{state,plans,reports,screenshots,memory}
openclaw skills enable dev-team-orchestrator dev-team-planner dev-team-executor dev-team-validator
openclaw hooks enable dev-team-trigger
openclaw restart

# Verify
openclaw skills list | grep dev-team
openclaw hooks list | grep dev-team

# Uninstall
rm -rf ~/.openclaw/skills/dev-team-* ~/.openclaw/hooks/dev-team-*
openclaw restart
```

## File Checksums (for verification)

After installation, verify critical files exist:

```
~/.openclaw/skills/dev-team-orchestrator/SKILL.md
~/.openclaw/skills/dev-team-planner/SKILL.md
~/.openclaw/skills/dev-team-executor/SKILL.md
~/.openclaw/skills/dev-team-validator/SKILL.md
~/.openclaw/hooks/dev-team-trigger/HOOK.md
```

## Contact

- Repository: https://github.com/vhfmatks/openclaw-dev-team
- Issues: https://github.com/vhfmatks/openclaw-dev-team/issues
