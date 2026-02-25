# oh-my-codex (OMX) 프로젝트 심층 분석 보고서

**분석 일자:** 2026-02-24  
**대상 저장소:** https://github.com/Yeachan-Heo/oh-my-codex  
**버전:** v0.6.3  
**Stars:** 851 | **Forks:** 57  

---

## 목차

1. [프로젝트 개요 및 목표](#1-프로젝트-개요-및-목표)
2. [구현 방식](#2-구현-방식)
3. [테스트 방식 (핵심 분석)](#3-테스트-방식-핵심-분석)
4. [아키텍처 다이어그램](#4-아키텍처-다이어그램)
5. [주요 기술적 결정사항](#5-주요-기술적-결정사항)
6. [결론 및 인사이트](#6-결론-및-인사이트)

---

## 1. 프로젝트 개요 및 목표

### 1.1 소개

**oh-my-codex (OMX)** 는 OpenAI Codex CLI를 위한 **다중 에이전트 오케스트레이션 레이어**입니다. 이 프로젝트는 단일 세션 기반의 Codex CLI를 지속 상태, 메모리, 워크플로우 자동화를 갖춘 **조정된 시스템**으로 변환합니다.

> **핵심 철학:** OMX는 Codex를 포크하지 않고 **애드온 레이어**로 동작하며, Codex 네이티브 확장 포인트를 사용합니다.

### 1.2 프로젝트 목표

| 목표 | 설명 |
|------|------|
| **다중 에이전트 조정** | Codex를 단일 에이전트에서 역할 기반 프롬프트와 워크플로우 스킬을 갖춘 조정된 시스템으로 변환 |
| **팀 오케스트레이션** | tmux에서 여러 에이전트의 병렬 실행 가능 |
| **상태 지속성** | MCP 서버를 통한 세션 간 상태 유지 |
| **자동화된 테스팅** | 76개 이상의 테스트 파일로 포괄적인 테스트 커버리지 |

### 1.3 핵심 가치 제안

```
┌─────────────────────────────────────────────────────────┐
│  Before: Codex CLI (단일 세션, 상태 없음)              │
│                         ↓                               │
│  After:  OMX (다중 에이전트, 지속 상태, 워크플로우)    │
└─────────────────────────────────────────────────────────┘
```

**제공 기능:**
- 작업 분해 및 단계적 실행 (`team-plan → team-prd → team-exec → team-verify → team-fix`)
- 지속 모드 수명 주기 상태 관리 (`.omx/state/`)
- 장기 실행 세션을 위한 메모리 + 노트패드 서피스
- 실행, 검증, 취소를 위한 운영 컨트롤

---

## 2. 구현 방식

### 2.1 디렉토리 구조

```
oh-my-codex/
├── bin/omx.js              # CLI 진입점
├── src/
│   ├── cli/                # CLI 명령 및 오케스트레이션
│   │   ├── index.ts        # 메인 CLI 진입, 명령 라우팅
│   │   ├── setup.ts        # 설치 스캐폴딩
│   │   ├── doctor.ts       # 진단 유틸리티
│   │   ├── team.ts         # 팀/스웜 오케스트레이션
│   │   └── ralph.ts        # Ralph 지속 루프
│   ├── team/               # 팀 모드 오케스트레이션
│   │   ├── team-ops.ts     # MCP 정렬 팀 작업
│   │   ├── state.ts        # 팀 상태 지속 레이어
│   │   └── runtime.ts      # 팀 워커 수명 주기
│   ├── mcp/                # MCP 서버
│   │   ├── state-server.ts # 상태 관리 MCP
│   │   ├── memory-server.ts # 프로젝트 메모리 MCP
│   │   └── code-intel-server.ts # LSP/AST 도구 MCP
│   ├── hud/                # Heads-up 디스플레이
│   ├── config/             # 구성 관리
│   ├── agents/             # 에이전트 정의 (30+)
│   ├── hooks/              # 수명 주기 훅
│   └── utils/              # 공유 유틸리티
├── prompts/                # 30개 에이전트 프롬프트 파일
├── skills/                 # 40개 스킬 디렉토리
├── templates/              # AGENTS.md 템플릿
└── scripts/                # 빌드/유틸리티 스크립트
```

### 2.2 에이전트 시스템 (30개 에이전트)

**빌드/분석 레인:**
| 에이전트 | 역할 | 모델 티어 |
|----------|------|-----------|
| `explore` | 빠른 코드베이스 검색 | haiku |
| `analyst` | 요구사항 명확화 | opus |
| `planner` | 작업 순서화 | opus |
| `architect` | 시스템 설계 | opus |
| `debugger` | 근본 원인 분석 | sonnet |
| `executor` | 코드 구현 | sonnet |
| `verifier` | 완료 검증 | sonnet |

**리뷰 레인:**
| 에이전트 | 역할 |
|----------|------|
| `style-reviewer` | 포맷팅, 네이밍, 관용구 |
| `quality-reviewer` | 논리 결함, 안티패턴 |
| `security-reviewer` | 취약점, 신뢰 경계 |
| `performance-reviewer` | 핫스팟, 최적화 |
| `code-reviewer` | 포괄적 리뷰 |

**도메인 전문가:**
- `test-engineer`: 테스트 전략
- `build-fixer`: 빌드/툴체인 실패
- `designer`: UX/UI 아키텍처
- `dependency-expert`: 외부 SDK/API 평가

### 2.3 스킬 시스템 (40개 스킬)

**워크플로우 스킬:**
| 스킬 | 트리거 키워드 | 설명 |
|------|--------------|------|
| `autopilot` | "autopilot", "build me" | 아이디어에서 코드까지 완전 자율 실행 |
| `ralph` | "ralph", "don't stop" | 검증이 포함된 자기 참조 지속 루프 |
| `ultrawork` | "ultrawork", "ulw" | 병렬 에이전트 오케스트레이션 |
| `team` | "team", "swarm" | 공유 작업 목록에서 N개 조정 에이전트 |
| `plan` | "plan this" | 전략적 계획 |
| `ultraqa` | - | QA 사이클링 (테스트, 검증, 수정, 반복) |

**에이전트 단축키:**
```
analyze      → debugger
deepsearch   → explore
tdd          → test-engineer
build-fix    → build-fixer
code-review  → code-reviewer
```

### 2.4 팀 모드 (병렬 오케스트레이션)

**단계적 파이프라인:**
```
team-plan → team-prd → team-exec → team-verify → team-fix (루프)
```

**특징:**
- 워커 CLI 선택 (Codex 또는 Claude CLI)
- 적응형 트리거 제출 (재시도 포함)
- 다중 모델 지원 (`gpt-5.3-codex-spark` 포함)
- 메일박스 시스템을 갖춘 작업 수명 주기 관리

### 2.5 MCP 서버 통합

`~/.codex/config.toml`에 구성되는 4개의 MCP 서버:

| 서버 | 도구 | 저장소 |
|------|------|--------|
| `omx_state` | `state_read`, `state_write`, `state_clear`, `state_list_active` | `.omx/state/{mode}-state.json` |
| `omx_memory` | `project_memory_read`, `project_memory_write`, `notepad_*` | `.omx/project-memory.json` |
| `omx_code_intel` | `lsp_diagnostics`, `ast_grep_search`, `ast_grep_replace` | 런타임 (LSP/AST-grep CLI) |
| `omx_trace` | `trace_timeline`, `trace_summary` | `.omx/logs/trace.ndjson` |

### 2.6 구현 패턴

#### MCP-First 아키텍처
- 모든 외부 도구는 MCP 서버를 통해 노출 (CLI 서브커맨드가 아님)
- MCP 도구는 TypeScript 함수 시그니처를 미러링
- 상태, 메모리, 코드 인텔, 트레이스는 격리된 MCP 서버

#### Tmux 기반 병렬성
- 팀 모드는 tmux에서 워커 페인을 스폰 (자식 프로세스가 아님)
- 워커 통신: inbox 파일 + tmux 트리거 훅
- 리더는 상태 폴링으로 워커 모니터링

#### 범위 인식 설치
```
user:         ~/.codex/, ~/.agents/ (전역)
project-local: ./.codex/, ./.agents/ (프로젝트별)
project:      프롬프트/스킬 설치 건너뜀 (AGENTS.md 전용 프로젝트용)
```

---

## 3. 테스트 방식 (핵심 분석)

> **사용자가 가장 궁금해하는 섹션:** 어떻게 자동화하였는지, 테스트 커버리지나 코드 작성 방식

### 3.1 테스트 프레임워크

**Node.js 네이티브 테스트 러너 사용** (`node:test`)

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
```

**특징:**
- Node.js 20+ 내장 테스트 러너 (Jest, Vitest 등 외부 프레임워크 없음)
- 제로 의존성 접근 방식
- 네이티브 `assert` 모듈 사용

### 3.2 테스트 파일 구조 및 명명 규칙

**총 테스트 파일: 76개**

```
src/
├── catalog/__tests/          (2개)
├── cli/__tests__/            (9개)
├── config/__tests__/         (2개)
├── hooks/__tests__/          (24개) ← 최다
├── hud/__tests__/            (5개)
├── mcp/__tests__/            (7개)
├── modes/__tests__/          (1개)
├── notifications/__tests__/  (10개)
├── ralph/__tests__/          (1개)
├── state/__tests__/          (1개)
├── team/__tests__/           (9개)
├── utils/__tests__/          (3개)
└── verification/__tests__/   (2개)
```

**명명 규칙:**
- 패턴: `{module-name}.test.ts`
- 위치: 각 모듈 내 `__tests__` 서브디렉토리

### 3.3 테스트 커버리지 구성

**⚠️ 전통적인 커버리지 도구 없음**

```json
// c8, nyc, istanbul 구성 없음
// 명시적 커버리지 임계값 강제 없음
```

**대신:**
- `COVERAGE.md`로 **기능 패리티 추적** (oh-my-claudecode와 95% 패리티)
- 라인 커버리지 메트릭보다 **기능적 테스트**에 집중
- CI에서 특정 게이트를 위해 테스트 파일 선택적 실행

### 3.4 CI/CD 자동화 (GitHub Actions)

#### 워크플로우: `.github/workflows/ci.yml`

```yaml
jobs:
  typecheck:
    - npx tsc --noEmit

  test:
    - npm test  # npm run build && node --test *.test.js

  ralph-persistence-gate:  # 특수 통합 게이트
    - node --test [특정 테스트 파일들]

  build:
    needs: [typecheck, test, ralph-persistence-gate]
```

#### Ralph Persistence Gate (특별 테스트 스위트)

**목적:** Ralph 지속성 기능이 올바르게 작동하는지 검증하는 하드 게이트

| ID | 시나리오 | 테스트 파일 |
|----|----------|-------------|
| V1 | 세션 범위 Ralph 수명 주기 | `session-scoped-runtime.test.ts` |
| V2 | 루트 폴백 호환성 (HUD) | `hud/state.test.ts` |
| V3 | 정식 PRD/progress 우선순위 + 마이그레이션 | `ralph/persistence.test.ts` |
| V4 | 단계 어휘 강제 | `state-server-ralph-phase.test.ts` |
| V5 | 독립 Ralph 취소 종료 | `session-scoped-runtime.test.ts` |
| V6 | Ralph 연결 모드 취소 동작 | `session-scoped-runtime.test.ts` |
| V7 | 팀 연결 종료 전파 | `notify-hook-linked-sync.test.ts` |
| V8 | 교차 세션 안전성 | `session-scoped-runtime.test.ts` |
| V9 | 업스트림 패리티 증거 | 참조 문서 |
| V10 | CI/릴리스 게이트 강제 | `ralph-persistence-gate.test.ts` |

### 3.5 자동화된 테스트 생성 / AI 보조 테스팅

**⚠️ 명시적인 AI 테스트 생성 없음**

- 테스트 생성 스크립트나 문서화가 없음
- 테스트는 수작성으로 보임
- 다만, 테스팅 관련 에이전트 프롬프트 존재:
  - `prompts/test-engineer.md` - 테스트 전략 전문가
  - `prompts/qa-tester.md` - 런타임 검증 전문가

### 3.6 테스트 유틸리티 및 헬퍼

**중앙 집중식 테스트 헬퍼 모듈 없음** - 각 테스트 파일이 자체 헬퍼를 인라인 정의

**일반적인 패턴:**

#### 파일시스템 헬퍼
```typescript
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// 임시 디렉토리 패턴
const cwd = await mkdtemp(join(tmpdir(), 'omx-test-'));
try {
  // 테스트 코드
} finally {
  await rm(cwd, { recursive: true, force: true });
}
```

#### 통합 테스트용 스폰 헬퍼
```typescript
import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, [scriptPath], {
  encoding: 'utf8',
  env: { ...process.env, CUSTOM_VAR: 'value' }
});
assert.equal(result.status, 0);
```

### 3.7 테스트 패턴 및 모범 사례

#### A. 단위 테스트 패턴
```typescript
describe('functionName', () => {
  it('describes expected behavior', () => {
    const result = functionName(input);
    assert.equal(result, expected);
  });
});
```

#### B. 상태 머신 테스트 (Team/Ralph)
```typescript
describe('transitionPhase', () => {
  it('does not mutate input state', () => {
    const start = createTeamState('immutable');
    const verify = moveToVerify(start);
    const fix = transitionPhase(verify, 'team-fix');
    
    assert.notEqual(fix, verify);  // 불변성 검증
  });
});
```

#### C. 명령 주입 방지 테스트
```typescript
describe('command injection prevention', () => {
  it('passes args as array elements, not shell string', () => {
    const result = _buildDesktopArgs('Title"; rm -rf / #', 'msg', 'linux');
    assert.equal(args[0], injectionTitle);  // 실행되지 않고 원시 데이터로 전달
  });
});
```

#### D. 파일 시스템 마이그레이션 테스트
```typescript
it('migrates legacy files when canonical absent', async () => {
  await writeFile(legacyPath, JSON.stringify(data));
  await ensureCanonicalRalphArtifacts(cwd);
  
  assert.ok(existsSync(canonicalPath));
});
```

### 3.8 테스트 실행

**명령어:** `npm test`

```json
{
  "scripts": {
    "test": "npm run build && node --test $(find dist -name '*.test.js') && node scripts/generate-catalog-docs.js --check"
  }
}
```

**실행 흐름:**
1. TypeScript를 `dist/`로 빌드
2. 컴파일된 모든 `.test.js` 파일에 대해 `node --test` 실행
3. 카탈로그 문서 일관성 검증

### 3.9 테스팅 철학 요약

| 측면 | 접근 방식 |
|------|-----------|
| **프레임워크** | Node.js 네이티브 (제로 의존성) |
| **커버리지 메트릭** | 없음 (기능 패리티로 대체) |
| **모킹** | 최소한 (실제 파일시스템, 자식 프로세스 사용) |
| **테스트 헬퍼** | 중앙 집중식 없음 (각 파일에 인라인) |
| **보안 테스트** | 명령 주입 방지, 인자 살균 |
| **통합 테스트** | 실제 Node.js 프로세스 스폰 |
| **교차 플랫폼** | Linux, macOS, Windows 검증 |

---

## 4. 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────────┐
│                        User (CLI)                                   │
│                      omx <command> [args]                           │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                      ┌────────┴────────┐
                      │   CLI Router    │
                      │  (src/cli/)     │
                      └───────┬─────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
  ┌─────▼─────┐        ┌─────▼─────┐        ┌─────▼─────┐
  │   setup   │        │   team    │        │   ralph   │
  │ (스캐폴딩) │        │ (오케스트) │        │ (지속루프) │
  └───────────┘        └─────┬─────┘        └───────────┘
                             │
                    ┌────────┴────────┐
                    │  Team Runtime   │
                    │  - tmux panes   │
                    │  - worker inbox │
                    │  - monitor loop │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
  ┌─────▼────────────────────▼────────────────────▼─────┐
  │                    MCP Servers                       │
  │  ┌─────────┬─────────┬─────────────┬──────────┐     │
  │  │  state  │ memory  │ code-intel  │  trace   │     │
  │  │ (상태)  │ (메모리) │ (코드지능)  │ (추적)   │     │
  │  └─────────┴─────────┴─────────────┴──────────┘     │
  └────────────────────────┬─────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
  ┌─────▼─────┐     ┌─────▼─────┐     ┌─────▼─────┐
  │   .omx/   │     │  Codex    │     │  Skills   │
  │  state/   │     │   CLI     │     │  $name    │
  │ memory.json│    │ AGENTS.md │     │           │
  │ notepad.md│     │ /prompts: │     │           │
  └───────────┘     └───────────┘     └───────────┘
```

---

## 5. 주요 기술적 결정사항

### 5.1 Codex-First 설계

OMX는 AGENTS.md 가이던스를 Codex에 주입:
```bash
-c model_instructions_file="<cwd>/AGENTS.md"
```
코어 시스템 정책을 대체하지 않고 동작 확장.

### 5.2 카탈로그 통합 (v0.5.0+)

더 이상 사용되지 않는 항목 제거:
- 프롬프트: `deep-executor`, `scientist`
- 스킬: `deepinit`, `learner`, `pipeline`, `ultrapilot`, `psm`, `release`

### 5.3 알려진 갭

| 갭 | 해결책 |
|----|--------|
| Pre-tool 인터셉션 | AGENTS.md가 모델에게 자체 조율 지시 |
| 네이티브 훅 컨텍스트 주입 | tmux 프롬프트 인젝션 워크어라운드 |
| 전체 LSP 프로토콜 | 실용적 래퍼 (tsc, grep, regex) 사용 |
| Python REPL | 아직 포팅되지 않음 (낮은 우선순위) |

### 5.4 의존성 분석

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"  // MCP 서버 구현만
  },
  "devDependencies": {
    "@types/node": "^22.19.11",
    "typescript": "^5.7.0"
  }
}
```

**특징:**
- 최소 외부 의존성
- 순수 TypeScript, 네이티브 Node.js API
- 빌드 도구: `tsc`만 (webpack/esbuild 같은 번들러 없음)

---

## 6. 결론 및 인사이트

### 6.1 프로젝트 강점

| 강점 | 설명 |
|------|------|
| **제로 테스트 프레임워크 의존성** | Node.js 네이티브 사용 |
| **모듈별 테스트 조직** | 76개 테스트 파일, 명확한 구조 |
| **CI 게이트** | typecheck + test + build + 특수 게이트 |
| **보안 우선 테스팅** | 쉘 통합을 위한 명령 주입 방지 |
| **교차 플랫폼 검증** | Linux, macOS, Windows |

### 6.2 테스팅 접근 방식 요약

**철학:** 기능적 정확성과 통합 검증 > 코드 커버리지 메트릭

**특징:**
1. Node.js 네이티브 테스트 러너 (최신, 제로 의존성)
2. 통합 중심 (실제 파일시스템, 자식 프로세스)
3. 최소 모킹
4. 특수 게이트 (Ralph Persistence Gate)
5. CI에서 단계적 검증

### 6.3 참고할 만한 패턴

```
┌─────────────────────────────────────────────────────────────────┐
│  테스트 자동화 핵심 원칙                                         │
│                                                                 │
│  1. 네이티브 도구 사용 (외부 의존성 최소화)                      │
│  2. 기능적 정확성 중심 (커버리지 메트릭보다)                      │
│  3. 실제 환경에서 통합 테스트                                    │
│  4. 특수 게이트로 중요 경로 보장                                 │
│  5. 보안 테스트 포함 (명령 주입 방지)                            │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 개선 가능 영역

| 영역 | 제안 |
|------|------|
| 커버리지 메트릭 | c8/nyc 도입으로 정량적 추적 |
| 테스트 헬퍼 | 중앙 집중식 헬퍼 모듈 생성 |
| 모킹 라이브러리 | 복잡한 시나리오를 위한 도구 도입 |
| E2E 테스트 | Codex CLI 통합 테스트 추가 |

---

## 부록: 참고 문서

- **README.md**: https://github.com/Yeachan-Heo/oh-my-codex/blob/main/README.md
- **COVERAGE.md**: 기능 패리티 매트릭스
- **CONTRIBUTING.md**: 개발 워크플로우
- **docs/qa/ralph-persistence-gate.md**: QA 게이트 체크리스트
- **AGENTS.md**: 오케스트레이션 브레인 템플릿

---

*이 보고서는 2026-02-24에 작성되었습니다.*
