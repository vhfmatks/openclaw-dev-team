# Codex CLI Integration

## Overview

OpenClaw dev-team supports using OpenAI Codex CLI as an alternative AI backend for code generation tasks. This enables faster code generation using GPT-5 models.

## Prerequisites

1. **Install Codex CLI**:
   ```bash
   npm install -g @openai/codex
   ```

2. **Set API Key**:
   ```bash
   export OPENAI_API_KEY="sk-..."
   ```

3. **Verify Installation**:
   ```bash
   codex --version
   ```

## Configuration

### Option 1: Environment Variables

```bash
# Enable Codex as default provider
export OPENCLAW_PROVIDER=codex

# Specify Codex model (optional, default: gpt-5)
export OPENCLAW_CODEX_MODEL=gpt-5

# Set timeout in milliseconds (optional, default: 300000)
export OPENCLAW_CODEX_TIMEOUT=300000

# Enable/disable fallback to OpenClaw (default: true)
export OPENCLAW_CODEX_FALLBACK=true
```

### Option 2: Per-Request Override

When invoking the orchestrator, specify the provider in the input:

```json
{
  "taskId": "task-001",
  "request": "Create a Button component",
  "source": { "from": "cli", "channelId": "test" },
  "provider": "codex"
}
```

## Usage Examples

### Basic Usage

```bash
# Use Codex via environment variable
OPENCLAW_PROVIDER=codex openclaw invoke dev-team:orchestrator \
  --input '{"taskId":"test","request":"Add hello function","source":{"from":"cli","channelId":"test"}}'
```

### Per-Request Usage

```bash
# Override provider for specific request
openclaw invoke dev-team:orchestrator \
  --input '{"taskId":"test","request":"Create Button","source":{"from":"cli","channelId":"test"},"provider":"codex"}'
```

## Fallback Behavior

By default, if Codex CLI is unavailable or fails, the system automatically falls back to OpenClaw:

1. **CLI Not Available**: Falls back immediately
2. **Timeout**: Falls back after timeout period
3. **Error**: Falls back on any error

To disable fallback:

```bash
export OPENCLAW_CODEX_FALLBACK=false
```

## Verification

Check logs for provider usage:

```bash
# Correct log path
grep "provider=codex" ~/.openclaw/workspace/dev-team/pipeline-log.jsonl
```

## Troubleshooting

### Codex CLI Not Found

```bash
# Verify installation
which codex
codex --version

# Reinstall if needed
npm install -g @openai/codex
```

### API Key Issues

```bash
# Verify API key is set
echo $OPENAI_API_KEY

# Set if missing
export OPENAI_API_KEY="sk-..."
```

### Timeout Issues

```bash
# Increase timeout for complex tasks
export OPENCLAW_CODEX_TIMEOUT=600000  # 10 minutes
```

## Architecture

```
User Request
     │
     ▼
Orchestrator (provider: codex)
     │
     ▼
Execution Squad
     │
     ▼
runCoder() → invokeAI(provider: codex)
     │
     ├── Codex CLI available → runCodexCLI()
     │
     └── Codex unavailable → fallback to OpenClaw
```

## Related

- [Codex CLI Documentation](https://github.com/openai/codex)
- [OpenClaw Dev-Team Documentation](../README.md)
