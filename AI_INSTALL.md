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

# Copy all skills (note: folder names differ from skill names)
cp -r skills/dev-team-start ~/.openclaw/skills/
cp -r skills/orchestrator ~/.openclaw/skills/dev-team-orchestrator
cp -r skills/planner ~/.openclaw/skills/dev-team-planner
cp -r skills/executor ~/.openclaw/skills/dev-team-executor
cp -r skills/validator ~/.openclaw/skills/dev-team-validator
```

Expected result:
```
~/.openclaw/skills/
├── dev-team-start/SKILL.md
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

# Copy hook (must include handler.js)
cp -r hooks/dev-team-trigger ~/.openclaw/hooks/

# Verify handler.js exists (required for execution)
ls ~/.openclaw/hooks/dev-team-trigger/handler.js
```

Expected result:
```
~/.openclaw/hooks/
└── dev-team-trigger/
    ├── HOOK.md      (metadata)
    ├── handler.js   (executable - REQUIRED)
    └── handler.ts   (source - optional)
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
openclaw skills enable dev-team-start
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
dev-team-start
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
| dev-team-start | Entry point - creates project and starts pipeline | ~/.openclaw/skills/dev-team-start/ |
| dev-team-orchestrator | Pipeline coordinator | ~/.openclaw/skills/dev-team-orchestrator/ |
| dev-team-planner | Planning agent | ~/.openclaw/skills/dev-team-planner/ |
| dev-team-executor | Code generation | ~/.openclaw/skills/dev-team-executor/ |
| dev-team-validator | Browser testing | ~/.openclaw/skills/dev-team-validator/ |

### Hooks

| Name | Event | Purpose |
|------|-------|---------|
| dev-team-trigger | message:received | Detect dev requests and notify user |

## Usage

### Primary Method: Slash Command

```
/dev-team-start <feature description>
```

Examples:
```
/dev-team-start dashboard 기능 개발
/dev-team-start 사용자 인증 시스템 구현
/dev-team-start build me a REST API for tasks
```

### What /dev-team-start Does

1. Creates project folder: `~/dev/dev-team-<project>/`
2. Sets up workspace: `.dev-team/` with state, plans, reports
3. Initializes project state files
4. Starts the dev team pipeline:
   - Phase 1: Analysis (Planner)
   - Phase 2: Implementation (Executor)
   - Phase 3: Validation (Validator)
   - Phase 4: Delivery

### Hook Method: Keyword Detection

The hook detects dev request keywords in messages:
- Korean: 만들어줘, 구현해줘, 개발해줘, 추가해줘
- English: build me, create, implement, develop

When detected, it sends a notification message.

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

## Reinstallation

If components are not working correctly, perform a clean reinstall:

```bash
# Step 1: Remove existing installation
rm -rf ~/.openclaw/skills/dev-team-orchestrator
rm -rf ~/.openclaw/skills/dev-team-planner
rm -rf ~/.openclaw/skills/dev-team-executor
rm -rf ~/.openclaw/skills/dev-team-validator
rm -rf ~/.openclaw/hooks/dev-team-trigger

# Step 2: Download fresh copy
rm -rf /tmp/openclaw-dev-team
git clone https://github.com/vhfmatks/openclaw-dev-team.git /tmp/openclaw-dev-team
cd /tmp/openclaw-dev-team

# Step 3: Install skills
cp -r skills/dev-team-orchestrator ~/.openclaw/skills/
cp -r skills/dev-team-planner ~/.openclaw/skills/
cp -r skills/dev-team-executor ~/.openclaw/skills/
cp -r skills/dev-team-validator ~/.openclaw/skills/

# Step 4: Install hooks (must include handler.js)
cp -r hooks/dev-team-trigger ~/.openclaw/hooks/

# Step 5: Verify handler.js exists
ls -la ~/.openclaw/hooks/dev-team-trigger/
# Must show: HOOK.md, handler.js

# Step 6: Create workspace
mkdir -p ~/.openclaw/workspace/dev-team/{state,plans,reports,screenshots,memory}

# Step 7: Enable components
openclaw skills enable dev-team-orchestrator
openclaw skills enable dev-team-planner
openclaw skills enable dev-team-executor
openclaw skills enable dev-team-validator
openclaw hooks enable dev-team-trigger

# Step 8: Restart OpenClaw
openclaw restart
```

### Common Reinstallation Issues

**Issue: "Hook has HOOK.md but no handler file"**

This means `handler.js` is missing. OpenClaw requires JavaScript files, not TypeScript.

```bash
# Verify handler.js exists
ls ~/.openclaw/hooks/dev-team-trigger/handler.js

# If missing, copy again from repository
cp /tmp/openclaw-dev-team/hooks/dev-team-trigger/handler.js ~/.openclaw/hooks/dev-team-trigger/
```

**Issue: Hook not in `openclaw hooks list`**

```bash
# Check hook directory structure
ls -la ~/.openclaw/hooks/dev-team-trigger/

# Required files:
# - HOOK.md (with YAML frontmatter)
# - handler.js (executable JavaScript)

# Re-enable
openclaw hooks enable dev-team-trigger
openclaw restart
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
# Full Install (one-liner)
git clone https://github.com/vhfmatks/openclaw-dev-team.git /tmp/openclaw-dev-team && \
cp -r /tmp/openclaw-dev-team/skills/* ~/.openclaw/skills/ && \
cp -r /tmp/openclaw-dev-team/hooks/* ~/.openclaw/hooks/ && \
mkdir -p ~/.openclaw/workspace/dev-team/{state,plans,reports,screenshots,memory} && \
openclaw skills enable dev-team-start dev-team-orchestrator dev-team-planner dev-team-executor dev-team-validator && \
openclaw hooks enable dev-team-trigger && \
openclaw restart

# Verify
openclaw skills list | grep dev-team
openclaw hooks list | grep dev-team
ls ~/.openclaw/hooks/dev-team-trigger/handler.js

# Test
# In Telegram: /dev-team-start dashboard 기능 개발

# Reinstall (clean)
rm -rf ~/.openclaw/skills/dev-team-* ~/.openclaw/hooks/dev-team-* && \
git clone https://github.com/vhfmatks/openclaw-dev-team.git /tmp/openclaw-dev-team && \
cp -r /tmp/openclaw-dev-team/skills/* ~/.openclaw/skills/ && \
cp -r /tmp/openclaw-dev-team/hooks/* ~/.openclaw/hooks/ && \
openclaw restart

# Uninstall
rm -rf ~/.openclaw/skills/dev-team-* ~/.openclaw/hooks/dev-team-*
openclaw restart
```

## File Verification

After installation, verify ALL critical files exist:

```bash
# Skills (4 files)
ls ~/.openclaw/skills/dev-team-orchestrator/SKILL.md
ls ~/.openclaw/skills/dev-team-planner/SKILL.md
ls ~/.openclaw/skills/dev-team-executor/SKILL.md
ls ~/.openclaw/skills/dev-team-validator/SKILL.md

# Hooks (2 files required)
ls ~/.openclaw/hooks/dev-team-trigger/HOOK.md
ls ~/.openclaw/hooks/dev-team-trigger/handler.js   # MUST EXIST
```

If `handler.js` is missing, the hook will NOT work. Reinstall from repository.

## Contact

- Repository: https://github.com/vhfmatks/openclaw-dev-team
- Issues: https://github.com/vhfmatks/openclaw-dev-team/issues
