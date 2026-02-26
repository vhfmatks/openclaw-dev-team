# Codex CLI Integration Plan for OpenClaw Dev-Team (v3 - Final)

## Metadata
- **Plan ID**: codex-cli-integration-001
- **Created**: 2026-02-25
- **Revised**: 2026-02-26 (v3 - Critic Re-review Applied)
- **Status**: Ready for Implementation
- **Based on**: `research/ccg-skill-analysis/`

---

## 1. Requirements Summary

**Goal**: dev-team의 Execution Squad가 실제 구현 수행 시 Codex CLI를 선택적으로 사용할 수 있도록 통합

**Key Requirements**:
1. Codex CLI를 별도의 executor backend로 사용 가능
2. 기존 coder flow와 호환되는 인터페이스 (동일한 출력 포맷)
3. Graceful fallback (Codex CLI 미설치/실패 시 OpenClaw 사용)
4. Backward compatible - 기존 코드 동작 유지

---

## 2. Current Architecture Analysis (Verified)

### 2.1 실제 실행 경로

```
Orchestrator (skills/orchestrator/index.ts)
    │
    ├── constructor() → this.config = resolveConfig()
    │
    └── runExecutionPhase(plan: Plan) (line 349)
              │
              └── invokeSkill('dev-team:execution-squad', executionInput) (line 367)
                        │
                        └── Execution Squad (skills/execution-squad/index.ts:35)
                                  │
                                  └── runCoder(plan, context, options?) (line 232)
                                            │
                                            └── invokeAI(systemPrompt, prompt, options) (line 248)
```

### 2.2 현재 코드 시그니처 (검증됨)

```typescript
// skills/execution-squad/index.ts:232  
private async runCoder(
  plan: Plan,
  context: ExecutionSquadInput['context'],
  options?: { previousExecution?, reviewFeedback?, testFeedback? }
): Promise<CoderOutput>

// skills/execution-squad/index.ts:248
const response = await invokeAI(CODER_SYSTEM_PROMPT, prompt, { skill: 'coder', modelTier: 'deep' });
```

### 2.3 로그 파일 경로 (검증됨)

```bash
# 실제 로그 경로
~/.openclaw/workspace/dev-team/pipeline-log.jsonl
```

---

## 3. Proposed Architecture

### 3.1 Integration Strategy: Class State + Options Pattern

```
Orchestrator Class
  - this.config.provider: ProviderConfig (NEW)
  - this.provider: AIProvider (from input or config)
         │
         ▼
runExecutionPhase(plan)
  → executionInput.provider = this.provider (NEW)
         │
         ▼
Execution Squad Handler
  → this.provider = input.provider || 'openclaw' (NEW)
         │
         ▼
runCoder(...)
  → invokeAI(systemPrompt, prompt, { provider, ... })
         │
    ┌────┴────┐
    ▼         ▼
invokeOpenClaw()  invokeCodexCLI()
(기존)             (spawnSync)
```

---

## 4. Implementation Steps

### Phase 0: Types Extension (0.25 day)

**File**: `skills/types.ts`

Add: AIProvider, CodexCLIConfig, ProviderConfig
Extend: DevTeamConfig, OrchestratorInput, ExecutionSquadInput

### Phase 1: Codex CLI Runtime (0.5 day)

**New File**: `skills/utils/codex-cli.ts`

- isCodexAvailable(): spawnSync check
- runCodexCLI(): async spawn wrapper

### Phase 2: Config Integration (0.25 day)

**File**: `skills/orchestrator/index.ts`

- Add provider to resolveConfig()
- Env: OPENCLAW_PROVIDER, OPENCLAW_CODEX_MODEL

### Phase 3: AI Utils Extension (0.5 day)

**File**: `skills/utils/ai.ts`

- Extend invokeAI() with provider selection
- Add invokeCodex() with consistent fallback

### Phase 4: Orchestrator (0.5 day)

**File**: `skills/orchestrator/index.ts`

- Add this.provider class field
- Pass provider to executionInput

### Phase 5: Execution Squad (0.5 day)

**File**: `skills/execution-squad/index.ts`

- Store provider from input
- Pass provider to invokeAI()

---

## 5. File Changes Summary

| File | Action | Lines |
|------|--------|-------|
| skills/types.ts | MODIFY | +35 |
| skills/utils/codex-cli.ts | CREATE | +80 |
| skills/utils/ai.ts | MODIFY | +50 |
| skills/orchestrator/index.ts | MODIFY | +15 |
| skills/execution-squad/index.ts | MODIFY | +15 |
| docs/codex-integration.md | CREATE | +50 |

**Total**: ~245 lines

---

## 6. Acceptance Criteria

1. Codex CLI 미설치 시 fallback → 로그에 "falling back"
2. provider: "codex" 설정 → 로그에 provider=codex
3. 기존 코드 동작 유지 → provider 미지정 시 기존 동작
4. 타임아웃 동작 → 5초 후 fallback
5. Env override → OPENCLAW_PROVIDER=codex 동작

---

## 7. Verification Commands

```bash
# Run with Codex
OPENCLAW_PROVIDER=codex openclaw invoke dev-team:orchestrator \
  --input '{"taskId":"test","request":"Add hello","source":{"from":"cli","channelId":"test"}}'

# Check logs (CORRECT PATH)
grep "provider=codex" ~/.openclaw/workspace/dev-team/pipeline-log.jsonl

# Test fallback
PATH="/usr/bin:/bin" openclaw invoke dev-team:orchestrator \
  --input '{"taskId":"test","request":"Add hello","source":{"from":"cli","channelId":"test"},"provider":"codex"}'
```

---

## 8. Timeline

| Phase | Duration |
|-------|----------|
| Phase 0 (Types) | 0.25 day |
| Phase 1 (Codex Runtime) | 0.5 day |
| Phase 2 (Config) | 0.25 day |
| Phase 3 (AI Utils) | 0.5 day |
| Phase 4 (Orchestrator) | 0.5 day |
| Phase 5 (Execution Squad) | 0.5 day |
| Phase 6 (Docs) | 0.25 day |

**Total**: 2.75 days

---

## 9. References

- skills/orchestrator/index.ts:67 - resolveConfig
- skills/orchestrator/index.ts:349 - runExecutionPhase
- skills/execution-squad/index.ts:232 - runCoder
- skills/execution-squad/index.ts:248 - invokeAI call
- skills/types.ts:402 - OrchestratorInput
- skills/types.ts:601 - ExecutionSquadInput

---

## 10. Revision History

| Version | Date | Changes |
|---------|------|---------|
| v1 | 2026-02-25 | Initial plan |
| v2 | 2026-02-26 | Critic review: fixed invokeAI, added provider fields |
| v3 | 2026-02-26 | Critic re-review: class state pattern, config integration, correct log paths, consistent fallback |

---

Plan Created: 2026-02-25
Plan Revised: 2026-02-26 (v3)
Estimated Effort: 2.75 days
Priority: Medium
