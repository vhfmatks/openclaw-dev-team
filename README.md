# openclaw-dev-team

AI-powered development team for OpenClaw.

## Quick Start

```bash
# Install
npm install
npm run install:all

# Enable
openclaw hooks enable dev-team-trigger
openclaw skills enable dev-team-orchestrator

# Use (in Telegram)
"대시보드 만들어줘"
```

## Structure

```
├── skills/
│   ├── orchestrator/   # Main coordinator
│   ├── planner/        # Planning agent
│   ├── executor/       # Code generation
│   └── validator/      # Browser testing
├── hooks/
│   └── dev-team-trigger/  # Telegram trigger
├── .dev-team/
│   ├── state/          # Runtime state
│   ├── plans/          # Generated plans
│   ├── reports/        # Validation reports
│   └── screenshots/    # Test screenshots
└── docs/
    └── research-result/  # Research documents
```

## Workflow

```
Telegram → Hook → Orchestrator → Planner → Executor → Validator → Telegram
```

## Documentation

- [Integration Guide](./INTEGRATION_GUIDE.md)
- [Implementation Plan](./docs/research-result/08-implementation-plan.md)
- [Architecture](./docs/research-result/06-self-validation-loop-architecture.md)

## License

MIT
