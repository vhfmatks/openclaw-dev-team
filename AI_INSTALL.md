# OpenClaw Dev Team - AI Installation Instructions

> This file is optimized for AI agents to read and execute installation.

## Project Overview

```
Name: openclaw-dev-team
Purpose: AI-powered development team for OpenClaw
Type: OpenClaw Skills + Hooks package
Repository: https://github.com/vhfmatks/openclaw-dev-team
```

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     dev-team:orchestrator                         │
│                       (Main Orchestrator)                         │
└──────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Plan Squad  │    │Execution Squad│    │ Review Squad  │
│  planning-squad│───▶│execution-squad│───▶│ review-squad  │
│   Phase 1     │    │   Phase 2     │    │   Phase 3     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                    │                    │
   ┌────┴────┐          ┌────┴────┐         ┌─────┴─────┐
   ▼         ▼          ▼         ▼         ▼     ▼     ▼
Planner   Critic     Coder   Reviewer   Reviewer QA    Final
                      CodeRev Tester            Tester Approver
                      DepMgr
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

Copy ALL skills to OpenClaw skills directory:

```bash
# Create target directory if not exists
mkdir -p ~/.openclaw/skills

# Copy all skills (folder name = skill name)
cp -r skills/* ~/.openclaw/skills/
```

Expected result:
```
~/.openclaw/skills/
├── orchestrator/SKILL.md
├── dev-team-start/SKILL.md
├── plan-squad/SKILL.md
├── planner/SKILL.md
├── critic/SKILL.md
├── architecture/SKILL.md
├── execution-squad/SKILL.md
├── coder/SKILL.md
├── code-reviewer/SKILL.md
├── tester/SKILL.md
├── dependency-manager/SKILL.md
├── review-squad/SKILL.md           # NEW
├── reviewer/SKILL.md               # NEW
├── qa-tester/SKILL.md              # NEW
├── final-approver/SKILL.md         # NEW
└── validator/SKILL.md              # DEPRECATED
```

### Step 3: Install Hooks

Copy hooks to OpenClaw hooks directory:

```bash
mkdir -p ~/.openclaw/hooks
cp -r hooks/dev-team-trigger ~/.openclaw/hooks/
ls ~/.openclaw/hooks/dev-team-trigger/handler.js
```

### Step 4: Create Workspace

```bash
mkdir -p ~/.openclaw/workspace/dev-team/{state,plans,reports,screenshots}
```

### Step 5: Enable Components

```bash
# Orchestrator
openclaw skills enable dev-team:orchestrator
openclaw skills enable dev-team:start

# Plan Squad
openclaw skills enable dev-team:planning-squad
openclaw skills enable dev-team:planning-planner
openclaw skills enable dev-team:planning-critic
openclaw skills enable dev-team:planning-architecture

# Execution Squad
openclaw skills enable dev-team:execution-squad
openclaw skills enable dev-team:execution-coder
openclaw skills enable dev-team:execution-code-reviewer
openclaw skills enable dev-team:execution-tester
openclaw skills enable dev-team:execution-dependency-manager

# Review Squad (NEW)
openclaw skills enable dev-team:review-squad
openclaw skills enable dev-team:review-reviewer
openclaw skills enable dev-team:review-qa-tester
openclaw skills enable dev-team:review-final-approver

# Hooks
openclaw hooks enable dev-team-trigger
```

### Step 6: Restart OpenClaw

```bash
openclaw restart
```

## Skills Reference (21 Skills)

### Orchestrator (2)

| Skill Name | Folder | Purpose |
|------------|--------|---------|
| `dev-team:orchestrator` | orchestrator/ | Main pipeline coordinator |
| `dev-team:start` | dev-team-start/ | Entry point, creates project |

### Plan Squad (4)

| Skill Name | Folder | Purpose |
|------------|--------|---------|
| `dev-team:planning-squad` | plan-squad/ | Squad leader |
| `dev-team:planning-planner` | planner/ | Requirements analysis |
| `dev-team:planning-critic` | critic/ | Plan review, reject/rework |
| `dev-team:planning-architecture` | architecture/ | Infrastructure design (optional) |

### Execution Squad (5)

| Skill Name | Folder | Purpose |
|------------|--------|---------|
| `dev-team:execution-squad` | execution-squad/ | Squad leader |
| `dev-team:execution-coder` | coder/ | Code generation |
| `dev-team:execution-code-reviewer` | code-reviewer/ | Static analysis |
| `dev-team:execution-tester` | tester/ | Test execution |
| `dev-team:execution-dependency-manager` | dependency-manager/ | Package installation (optional) |

### Review Squad (4) - NEW

| Skill Name | Folder | Purpose |
|------------|--------|---------|
| `dev-team:review-squad` | review-squad/ | Squad leader, mode determination |
| `dev-team:review-reviewer` | reviewer/ | Requirements↔Plan↔Implementation check |
| `dev-team:review-qa-tester` | qa-tester/ | Human-like testing (Browser/CLI) |
| `dev-team:review-final-approver` | final-approver/ | Final approval, auto-routing |

### Deprecated (1)

| Skill Name | Folder | Status |
|------------|--------|--------|
| `dev-team:validation-validator` | validator/ | DEPRECATED → use `review-qa-tester` |

## Pipeline Flow

```
Phase 1          Phase 2           Phase 3           Phase 4
┌────────┐      ┌────────┐        ┌────────┐        ┌────────┐
│  Plan  │ ───▶ │Execute │ ─────▶ │ Review │ ─────▶ │Delivery│
│ Squad  │      │ Squad  │        │ Squad  │        │        │
└────────┘      └────────┘        └────────┘        └────────┘
     │               │                  │
     ▼               ▼                  ▼
  Rework          Rework            Routing
  (max 3)         (max 3)           ┌─────┴─────┐
                                    ▼           ▼
                              → Planner    → Executor
```

### Review Squad Modes

| Mode | Components | Use Case |
|------|------------|----------|
| **Basic** | Reviewer only | Simple fixes, style changes, 1-2 files |
| **Full** | Reviewer + QA Tester + Final Approver | Feature additions/changes, 3+ files |

### Routing Rules (on rejection)

| Rejection Reason | Route To |
|------------------|----------|
| `missing_feature` | Planner |
| `plan_deviation` | Planner |
| `incomplete_implementation` | Executor |
| QA test failure | Executor |

## Usage

### Slash Command

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
   - Phase 1: Plan Squad (Planner → Critic → Architecture)
   - Phase 2: Execution Squad (Coder → CodeReviewer → Tester)
   - Phase 3: Review Squad (Reviewer → QA Tester → Final Approver)
   - Phase 4: Delivery

## Verification

### Verify Skills

```bash
openclaw skills list | grep dev-team
```

Expected output includes:
```
dev-team:start
dev-team:orchestrator
dev-team:planning-squad
dev-team:execution-squad
dev-team:review-squad
dev-team:review-reviewer
dev-team:review-qa-tester
dev-team:review-final-approver
```

### Verify Hooks

```bash
openclaw hooks list | grep dev-team
# Output: dev-team-trigger
```

### Functional Test

Send a test message:
```
테스트 기능 만들어줘
```

Expected response:
```
🔄 개발 요청을 감지했습니다. 작업을 시작합니다...
📋 Phase 1: Planning...
💻 Phase 2: Execution...
✅ Phase 3: Review...
🚀 Phase 4: Delivery
```

## Docker Deployment

```bash
# Copy skills/hooks to docker directory
cp -r skills/* docker/skills/
cp -r hooks/* docker/hooks/

# Start container
cd docker
docker compose up -d

# Verify skills loaded
docker exec openclaw-dev-team-gateway node dist/index.js skills | grep dev-team
```

## Troubleshooting

### Skills not appearing

```bash
# Check SKILL.md format
cat ~/.openclaw/skills/review-squad/SKILL.md | head -10

# Should have YAML frontmatter:
# ---
# name: dev-team:review-squad
# description: ...
# ---
```

### Canvas Unauthorized

```bash
# 1) Open Control UI: http://localhost:18789/
# 2) Get gateway token
openclaw config get gateway.auth.token

# 3) Paste token in Settings and connect
```

### Pairing Required

```bash
openclaw devices list
openclaw devices approve --latest
```

## Quick Commands

```bash
# Full Install (one-liner)
git clone https://github.com/vhfmatks/openclaw-dev-team.git /tmp/openclaw-dev-team && \
cp -r /tmp/openclaw-dev-team/skills/* ~/.openclaw/skills/ && \
cp -r /tmp/openclaw-dev-team/hooks/* ~/.openclaw/hooks/ && \
mkdir -p ~/.openclaw/workspace/dev-team/{state,plans,reports,screenshots} && \
openclaw restart

# Verify
openclaw skills list | grep dev-team
ls ~/.openclaw/hooks/dev-team-trigger/handler.js

# Uninstall
rm -rf ~/.openclaw/skills/{orchestrator,plan-squad,execution-squad,review-squad,reviewer,qa-tester,final-approver,dev-team-start,planner,critic,architecture,coder,code-reviewer,tester,dependency-manager,validator}
rm -rf ~/.openclaw/hooks/dev-team-trigger
openclaw restart
```

## File Locations

| Item | Path |
|------|------|
| Skills | `~/.openclaw/skills/*/` |
| Hooks | `~/.openclaw/hooks/dev-team-trigger/` |
| Workspace | `~/.openclaw/workspace/dev-team/` |
| Pipeline Log | `~/.openclaw/workspace/dev-team/pipeline-log.jsonl` |
| Logs | `~/.openclaw/gateway.log` |
