# openclaw-dev-team

🤖 AI-powered development team for OpenClaw.

## One-Line Install

```bash
curl -fsSL https://raw.githubusercontent.com/vhfmatks/openclaw-dev-team/main/install.sh | bash
```

## Quick Start

```bash
# One-line install
curl -fsSL https://raw.githubusercontent.com/vhfmatks/openclaw-dev-team/main/install.sh | bash

# Or manual install
git clone https://github.com/vhfmatks/openclaw-dev-team.git
cd openclaw-dev-team
npm install
npm run install:all

# Enable
openclaw restart

# Use (in Telegram)
"대시보드 만들어줘"
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     dev-team:orchestrator                        │
│                       (Main Orchestrator)                        │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Plan Squad  │    │Execution Squad│    │ Review Squad  │
│   Phase 1     │───▶│   Phase 2     │───▶│   Phase 3     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                    │                    │
   ┌────┴────┐          ┌────┴────┐         ┌─────┴─────┐
   ▼         ▼          ▼         ▼         ▼     ▼     ▼
Planner   Critic     Coder   Reviewer   Reviewer QA    Final
                      CodeRev Tester    OpenClaw Tester Approver
                      DepMgr
```

## Skills (22)

| Squad | Skills |
|-------|--------|
| **Orchestrator** | `dev-team:orchestrator`, `dev-team:start` |
| **Plan Squad** | `planning-squad`, `planning-planner`, `planning-critic`, `planning-architecture` |
| **Execution Squad** | `execution-squad`, `execution-coder`, `execution-code-reviewer`, `execution-tester`, `execution-dependency-manager` |
| **Review Squad** | `review-squad`, `review-reviewer`, `review-qa-tester`, `review-openclaw-tester` ⚡, `review-final-approver` |

## Review Squad Modes

| Mode | Members | Use Case |
|------|---------|----------|
| **Basic** | Reviewer only | Simple fixes, 1-2 files |
| **Full** | Reviewer + QA + OpenClaw + Final | New features, 3+ files |

### OpenClaw Tester (⚡ auto-activated)

- **Self-healing tests**: Accessibility Tree based element identification
- **NLP → Playwright**: Natural language test scenarios
- **Parallel execution**: Sub-agents for concurrent testing
- **Evidence collection**: Screenshots, logs, snapshots (mandatory)

## Project Structure

```
├── skills/
│   ├── orchestrator/      # Main coordinator
│   ├── plan-squad/        # Planning squad leader
│   ├── execution-squad/   # Execution squad leader
│   ├── review-squad/      # Review squad leader
│   ├── openclaw-tester/   # OpenClaw advanced tester
│   └── types.ts           # Shared TypeScript types
├── hooks/
│   └── dev-team-trigger/  # Telegram/Slack trigger
├── research/
│   └── staging-test-with-openclaw.md
├── .dev-team/
│   ├── state/             # Runtime state
│   ├── plans/             # Generated plans
│   ├── reports/           # Validation reports
│   ├── screenshots/       # Test screenshots
│   └── evidence/          # OpenClaw test evidence
└── docs/
    └── research-result/   # Research documents
```

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
  (max 3)         (max 3)       ┌─────┴─────┐
                               ▼           ▼
                         → Planner    → Executor
```

## Commands

```bash
# Install
curl -fsSL https://raw.githubusercontent.com/vhfmatks/openclaw-dev-team/main/install.sh | bash

# Update
curl -fsSL https://raw.githubusercontent.com/vhfmatks/openclaw-dev-team/main/install.sh | bash -s -- --update

# Uninstall
curl -fsSL https://raw.githubusercontent.com/vhfmatks/openclaw-dev-team/main/install.sh | bash -s -- --uninstall

# Check installation
openclaw skills list | grep dev-team
openclaw hooks list | grep dev-team

# View logs
tail -f ~/.openclaw/gateway.log | grep dev-team

# View pipeline log
cat ~/.openclaw/workspace/dev-team/pipeline-log.jsonl | jq .
```

## Codex CLI Integration

OpenClaw dev-team supports **Codex CLI** as an alternative AI backend for faster code generation.

### Setup

```bash
# 1. Install Codex CLI
npm install -g @openai/codex

# 2. Set API key
export OPENAI_API_KEY="sk-..."

# 3. Verify
 codex --version
```

### Usage

```bash
# Use Codex via environment variable
OPENCLAW_PROVIDER=codex openclaw invoke dev-team:orchestrator \
  --input '{"taskId":"test","request":"Add hello function","source":{"from":"cli","channelId":"test"}}'

# Or per-request
openclaw invoke dev-team:orchestrator \
  --input '{..."provider":"codex"}'
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|----------|
| `OPENCLAW_PROVIDER` | AI backend (`openclaw` or `codex`) | `openclaw` |
| `OPENCLAW_CODEX_MODEL` | Codex model | `gpt-5` |
| `OPENCLAW_CODEX_TIMEOUT` | Timeout in ms | `300000` |
| `OPENCLAW_CODEX_FALLBACK` | Fallback to OpenClaw | `true` |

### Fallback Behavior

If Codex CLI is unavailable or fails, the system automatically falls back to OpenClaw.

For detailed setup, see [docs/codex-integration.md](./docs/codex-integration.md).

## Documentation

- [INSTALL.md](./INSTALL.md) - Detailed installation guide
- [research/staging-test-with-openclaw.md](./research/staging-test-with-openclaw.md) - OpenClaw testing research

## License

MIT
