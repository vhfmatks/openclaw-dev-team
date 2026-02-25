# OpenClaw Tester Integration Plan

## Overview

Research 문서(`research/staging-test-with-openclaw.md`)를 기반으로 dev-team의 Review Squad에 OpenClaw 고급 테스팅 기능을 통합합니다. 기존 QA Tester를 강화하여 Self-healing 테스트, 자연어 테스트 정의, 병렬 실행 등을 지원하도록 합니다.

---

## 1. Requirements Summary

### 1.1 비즈니스 목표
- Staging 환경에서 Human-like 테스트 수행 능력 향상
- UI 변경에 강건한 Self-healing 테스트 도입
- 자연어로 테스트 시나리오 정의 가능하게 지원
- 병렬 테스트 실행으로 효율성 증대

### 1.2 기능 요구사항

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| FR-01 | Accessibility Tree 기반 요소 식별 (CSS Selector 대체) | HIGH |
| FR-02 | 자연어 테스트 시나리오 → Playwright 스크립트 변환 | HIGH |
| FR-03 | Sub-agents를 이용한 병렬 테스트 실행 | MEDIUM |
| FR-04 | Staging 환경 설정 (다중 환경 지원) | MEDIUM |
| FR-05 | agent-browser CLI 통합 | LOW |
| FR-06 | 테스트 결과 스크린샷/비디오 자동 생성 | MEDIUM |

### 1.3 비기능 요구사항

| ID | 요구사항 | 기준 |
|----|---------|------|
| NFR-01 | 테스트 실행 시간 | 기존 대비 30% 이내 증가 허용 |
| NFR-02 | Self-healing 성공률 | UI class 변경 시 95% 이상 요소 식별 |
| NFR-03 | 호환성 | 기존 QA Tester 인터페이스 유지 |

---

## 2. Current Architecture Analysis

### 2.1 기존 Review Squad 구조

```
Review Squad Leader (skills/review-squad/SKILL.md)
    │
    ├── Reviewer (skills/reviewer/SKILL.md) - 필수
    │     • 요구사항 vs 계획 vs 구현 일치성 검수
    │
    ├── QA Tester (skills/qa-tester/SKILL.md) - Full 모드만
    │     • OpenClaw Browser/CLI로 실제 테스트
    │     • 현재: 기본적인 Playwright 기반 테스트만
    │
    └── Final Approver (skills/final-approver/SKILL.md) - Full 모드만
          • 결과 취합 → 승인/반려 + 자동 routing
```

### 2.2 기존 QA Tester 한계

| 항목 | 현재 상태 | 개선 필요 |
|------|---------|----------|
| 요소 식별 | CSS Selector | Accessibility Tree ref 기반 |
| 테스트 정의 | 코드 기반 | 자연어 지원 |
| 실행 방식 | 순차 실행 | 병렬 Sub-agents 지원 |
| Self-healing | 미지원 | UI 변경 시 자동 복구 |
| Staging 설정 | 단일 환경 | 다중 환경 프로파일 |

### 2.3 영향받는 파일

| 파일 | 변경 유형 | 설명 |
|------|---------|------|
| `skills/types.ts` | 수정 | OpenClaw 테스트 타입 추가 |
| `skills/qa-tester/SKILL.md` | 수정 | 고급 기능 통합 |
| `skills/review-squad/SKILL.md` | 수정 | OpenClaw Tester 호출 방식 업데이트 |
| `skills/openclaw-tester/SKILL.md` | 신규 | 전문 OpenClaw Tester 스킬 (선택적) |

---

## 3. Proposed Architecture

### 3.1 확장된 Review Squad 구조

```
Review Squad Leader
    │
    ├── Reviewer (변경 없음)
    │
    ├── OpenClaw Tester (QA Tester 강화)
    │     │
    │     ├── Snapshot Engine (NEW)
    │     │     • Accessibility Tree 스냅샷
    │     │     • Ref 기반 요소 식별
    │     │     • Self-healing 로직
    │     │
    │     ├── Natural Language Tester (NEW)
    │     │     • 자연어 시나리오 파싱
    │     │     • Playwright 스크립트 생성
    │     │     • ui-test 스킬 연동
    │     │
    │     ├── Parallel Executor (NEW)
    │     │     • Sub-agents 병렬 배포
    │     │     • 결과 취합
    │     │
    │     └── Environment Manager (NEW)
    │           • Staging/Production 프로파일
    │           • 원격 브라우저 연결
    │
    └── Final Approver (변경 없음)
```

### 3.2 핵심 타입 정의 추가

```typescript
// skills/types.ts에 추가

/**
 * Accessibility Tree 기반 요소 참조
 */
export interface AccessibilityRef {
  ref: string;           // 예: "e1", "e2"
  role: string;          // 예: "button", "textbox"
  name: string;          // 예: "Submit", "Email"
  selector?: string;     // Fallback CSS selector
}

/**
 * OpenClaw Snapshot 결과
 */
export interface OpenClawSnapshot {
  timestamp: string;
  url: string;
  refs: AccessibilityRef[];
  interactive: boolean;  // 상호작용 가능한 요소만 포함
}

/**
 * 자연어 테스트 시나리오
 */
export interface NaturalLanguageScenario {
  id: string;
  name: string;
  description: string;   // 자연어 설명
  steps: string[];       // 자연어 단계들
  expected: string;
  generated?: {
    playwrightCode: string;
    selectors: AccessibilityRef[];
  };
}

/**
 * 병렬 테스트 실행 결과
 */
export interface ParallelTestResult {
  subAgentId: string;
  scenarioId: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  evidence: string[];    // 스크린샷 경로
}

/**
 * OpenClaw Tester 입력
 */
export interface OpenClawTesterInput extends QATesterInput {
  mode: 'snapshot' | 'natural-language' | 'hybrid';
  scenarios: NaturalLanguageScenario[];
  config: {
    stagingUrl?: string;
    productionUrl?: string;
    browserProfile?: 'managed' | 'cdp' | 'extension';
    cdpUrl?: string;
    parallelism: number;  // 병렬 실행 수
    timeout: number;
    captureScreenshots: boolean;
    generatePlaywrightScript: boolean;
  };
}

/**
 * OpenClaw Tester 결과
 */
export interface OpenClawTesterResult extends QATesterResult {
  snapshot?: OpenClawSnapshot;
  playwrightScripts?: {
    scenarioId: string;
    code: string;
    path: string;
  }[];
  parallelResults?: ParallelTestResult[];
  selfHealingEvents?: {
    originalSelector: string;
    healedRef: string;
    success: boolean;
  }[];
}
```

### 3.3 Review Squad 출력 타입 업데이트

```typescript
// skills/types.ts 수정

export interface ReviewSquadOutput {
  metadata: {
    reviewId: string;
    mode: ReviewMode;
    members: string[];
    iterations: number;
    createdAt: string;
  };
  status: 'approved' | 'rejected';
  routeTo?: 'planner' | 'executor' | 'delivery';
  reviewer?: ReviewerResult;
  qaTester?: QATesterResult;
  openclawTester?: OpenClawTesterResult;  // NEW
  finalApprover?: FinalApproverResult;
  quality: ReviewQualityScore;
  summary: {
    totalIssues: number;
    criticalIssues: number;
    testPassRate: number;
    selfHealingRate?: number;  // NEW
  };
}
```

---

## 4. Implementation Steps

### Phase 1: Type Definitions (1-2시간)

**목표:** types.ts에 OpenClaw 테스트 관련 타입 추가

**작업:**
1. `AccessibilityRef`, `OpenClawSnapshot` 타입 추가
2. `NaturalLanguageScenario` 타입 추가
3. `OpenClawTesterInput`, `OpenClawTesterResult` 타입 추가
4. `ReviewSquadOutput`에 `openclawTester` 필드 추가

**검증:**
- TypeScript 컴파일 오류 없음
- 기존 타입과 호환성 유지

### Phase 2: QA Tester Skill Enhancement (2-3시간)

**목표:** qa-tester/SKILL.md에 고급 기능 통합

**작업:**
1. **Snapshot Engine 섹션 추가**
   - `openclaw browser snapshot --interactive` 사용법
   - Ref 기반 상호작용 (`@e1`, `@e2`)
   - Self-healing 로직 설명

2. **Natural Language Testing 섹션 추가**
   - 자연어 → Playwright 변환 워크플로우
   - `ui-test` 스킬 연동 방법

3. **Parallel Execution 섹션 추가**
   - Sub-agents 병렬 실행 패턴
   - 결과 취합 로직

4. **Environment Configuration 섹션 추가**
   - Staging/Production 프로파일
   - 원격 브라우저 (CDP) 설정

**검증:**
- 기존 QA Tester 워크플로우와 호환
- 새 기능에 대한 Pipeline Log 이벤트 정의

### Phase 3: Review Squad Integration (1-2시간)

**목표:** review-squad/SKILL.md 업데이트

**작업:**
1. `runQATester` 함수를 `runOpenClawTester`로 확장
2. OpenClaw Tester 모드 선택 로직 추가
3. Self-healing 이벤트 로깅 추가
4. Quality Score 계산에 `selfHealingRate` 반영

**검증:**
- Basic/Full 모드 모두 정상 동작
- Pipeline Log에 새 이벤트 기록

### Phase 4: Optional - Dedicated OpenClaw Tester Skill (2-3시간)

**목표:** 전문 OpenClaw Tester 스킬 신규 생성 (선택적)

**작업:**
1. `skills/openclaw-tester/SKILL.md` 생성
2. ui-test 스킬 패턴 통합
3. agent-browser CLI 명령어 래핑
4. Staging 테스트 모범 사례 문서화

**검증:**
- 독립 실행 가능
- QA Tester에서 호출 가능

---

## 5. Detailed Implementation

### 5.1 Phase 1: Type Definitions

**파일:** `skills/types.ts`

**추가 위치:** `// ============================================================================` 주석 이후, `// Review Squad Types` 섹션 내

```typescript
// ============================================================================
// OpenClaw Testing Types
// ============================================================================

/**
 * Accessibility Tree 기반 요소 참조
 * OpenClaw의 snapshot --interactive 출력에서 추출
 */
export interface AccessibilityRef {
  ref: string;           // 예: "e1", "e2", "e3"
  role: string;          // ARIA role: "button", "textbox", "link", etc.
  name: string;          // Accessible name: "Submit", "Email", etc.
  selector?: string;     // Fallback CSS selector (self-healing용)
}

/**
 * OpenClaw Browser Snapshot 결과
 */
export interface OpenClawSnapshot {
  timestamp: string;
  url: string;
  title: string;
  refs: AccessibilityRef[];
  interactiveOnly: boolean;
  raw?: string;          // 원본 accessibility tree
}

/**
 * 자연어 테스트 시나리오
 */
export interface NaturalLanguageScenario {
  id: string;
  name: string;
  description: string;   // 자연어 설명 (예: "로그인 후 대시보드로 이동")
  steps: string[];       // 자연어 단계들
  expected: string;      // 예상 결과
  generated?: {
    playwrightCode: string;
    selectors: AccessibilityRef[];
    timestamp: string;
  };
}

/**
 * 병렬 테스트 실행 결과
 */
export interface ParallelTestResult {
  subAgentId: string;
  scenarioId: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  evidence: string[];
  error?: string;
}

/**
 * Self-healing 이벤트
 */
export interface SelfHealingEvent {
  timestamp: string;
  originalSelector: string;
  healedRef: string;
  success: boolean;
  context: string;
}

/**
 * OpenClaw Tester 실행 모드
 */
export type OpenClawTesterMode = 'snapshot' | 'natural-language' | 'hybrid';

/**
 * OpenClaw Tester 입력
 */
export interface OpenClawTesterInput {
  execution: ExecutionSquadOutput;
  context: {
    projectRoot: string;
    projectType: string;
    hasFrontend: boolean;
    hasBackend: boolean;
    testCommands: string[];
  };
  testScenarios: ValidationCriteria[];
  mode: OpenClawTesterMode;
  naturalLanguageScenarios?: NaturalLanguageScenario[];
  config: {
    stagingUrl?: string;
    productionUrl?: string;
    browserProfile: 'managed' | 'cdp' | 'extension';
    cdpUrl?: string;
    extensionId?: string;
    parallelism: number;
    timeout: number;
    captureScreenshots: boolean;
    captureVideo: boolean;
    generatePlaywrightScript: boolean;
    outputDir: string;
  };
}

/**
 * OpenClaw Tester 결과
 */
export interface OpenClawTesterResult {
  status: 'passed' | 'failed' | 'partial';
  testType: 'browser' | 'cli' | 'both';
  mode: OpenClawTesterMode;
  
  // 기본 테스트 결과
  scenarios: QAScenarioResult[];
  screenshots: string[];
  videos?: string[];
  logs: string[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  
  // OpenClaw 전용 결과
  snapshot?: OpenClawSnapshot;
  playwrightScripts?: {
    scenarioId: string;
    code: string;
    path: string;
  }[];
  parallelResults?: ParallelTestResult[];
  selfHealingEvents?: SelfHealingEvent[];
  
  // 환경 정보
  environment?: {
    frontendUrl?: string;
    backendUrl?: string;
    browserProfile: string;
    parallelism: number;
  };
  
  // 통계
  selfHealingStats?: {
    total: number;
    successful: number;
    rate: number;  // percentage
  };
}
```

### 5.2 Phase 2: QA Tester Skill Enhancement

**파일:** `skills/qa-tester/SKILL.md`

**추가 섹션:**

```markdown
## OpenClaw 고급 기능

### Accessibility Tree 기반 Self-healing 테스트

CSS Selector 대신 Accessibility Tree의 ref를 사용하여 UI 변경에 강건합니다.

```bash
# 스냅샷 생성
openclaw browser snapshot --interactive --json

# 출력 예시
{
  "refs": {
    "e1": {"role": "button", "name": "Submit"},
    "e2": {"role": "textbox", "name": "Email"},
    "e3": {"role": "link", "name": "Learn More"}
  }
}

# Ref 기반 상호작용
openclaw browser click @e1
openclaw browser type @e2 "test@example.com"
```

### 자연어 테스트 시나리오

자연어로 테스트를 정의하고 Playwright 스크립트로 변환합니다.

```typescript
const scenario: NaturalLanguageScenario = {
  id: 'login-flow',
  name: '로그인 플로우 테스트',
  description: '사용자가 이메일로 로그인할 수 있는지 확인',
  steps: [
    '로그인 페이지로 이동',
    '이메일 입력: test@example.com',
    '비밀번호 입력: password123',
    '로그인 버튼 클릭',
    '대시보드 페이지로 이동 확인'
  ],
  expected: '대시보드 페이지가 표시됨'
};

// AI가 Playwright 코드로 변환
const generated = await generatePlaywrightFromNL(scenario);
```

### 병렬 테스트 실행

Sub-agents를 사용하여 여러 시나리오를 병렬로 실행합니다.

```typescript
async function runParallelTests(
  scenarios: NaturalLanguageScenario[],
  config: { parallelism: number }
): Promise<ParallelTestResult[]> {
  const batches = chunk(scenarios, config.parallelism);
  const results: ParallelTestResult[] = [];
  
  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(scenario => runSubAgentTest(scenario))
    );
    results.push(...batchResults);
  }
  
  return results;
}
```

### Staging 환경 설정

다중 환경 프로파일을 지원합니다.

```json
{
  "environments": {
    "staging": {
      "frontendUrl": "https://staging.myapp.com",
      "backendUrl": "https://api-staging.myapp.com"
    },
    "production": {
      "frontendUrl": "https://myapp.com",
      "backendUrl": "https://api.myapp.com"
    }
  },
  "browser": {
    "profile": "managed",
    "cdpUrl": "https://browserless.io?token=xxx"
  }
}
```

## Pipeline Log 이벤트 (확장)

```bash
# Snapshot 생성
echo '{"event":"openclaw:snapshot","url":"https://staging.myapp.com","refs":15}' >> .dev-team/pipeline-log.jsonl

# Self-healing 이벤트
echo '{"event":"openclaw:selfhealing","original":".btn-primary","healed":"@e2","success":true}' >> .dev-team/pipeline-log.jsonl

# 자연어 → Playwright 변환
echo '{"event":"openclaw:nlp2code","scenario":"login-flow","lines":12}' >> .dev-team/pipeline-log.jsonl

# 병렬 실행
echo '{"event":"openclaw:parallel","agents":4,"scenarios":8}' >> .dev-team/pipeline-log.jsonl
```
```

### 5.3 Phase 3: Review Squad Integration

**파일:** `skills/review-squad/SKILL.md`

**수정 사항:**

1. Step 3: QA Tester 실행 함수 수정

```typescript
async function runOpenClawTester(input: ReviewSquadInput): Promise<OpenClawTesterResult | undefined> {
  if (mode !== 'full') return undefined;
  
  logEvent({
    event: 'openclaw:start',
    mode: determineOpenClawMode(input),
    scenarios: input.testScenarios.length
  });
  
  const result = await invokeSkill('dev-team:review-openclaw-tester', {
    execution: input.execution,
    context: input.context,
    testScenarios: input.plan.validation_criteria,
    mode: 'hybrid',
    config: {
      stagingUrl: process.env.STAGING_URL,
      parallelism: 4,
      timeout: 120000,
      captureScreenshots: true,
      generatePlaywrightScript: true
    }
  });
  
  logEvent({
    event: 'openclaw:result',
    status: result.status,
    passed: result.summary.passed,
    failed: result.summary.failed,
    selfHealingRate: result.selfHealingStats?.rate
  });
  
  return result;
}
```

2. Quality Score 계산에 selfHealingRate 반영

```typescript
function calculateQualityScore(params: {
  // ...existing params
  openclawResult?: OpenClawTesterResult;
}): ReviewQualityScore {
  const checks: ReviewQualityCheck[] = [
    // ...existing checks
    { 
      name: 'self_healing', 
      score: params.openclawResult?.selfHealingStats?.rate || 0, 
      weight: 10, 
      max: 10 
    }
  ];
  // ...
}
```

---

## 6. Acceptance Criteria

### 기능 테스트

| ID | 테스트 케이스 | 기준 |
|----|-------------|------|
| AC-01 | Accessibility Tree 스냅샷 생성 | refs 배열에 모든 interactive 요소 포함 |
| AC-02 | Ref 기반 요소 클릭 | @e1 형식으로 요소 클릭 성공 |
| AC-03 | Self-healing 동작 | CSS class 변경 후에도 동일 요소 식별 |
| AC-04 | 자연어 → Playwright 변환 | 유효한 TypeScript 코드 생성 |
| AC-05 | 병렬 테스트 실행 | 4개 시나리오 동시 실행, 결과 취합 |
| AC-06 | 기존 QA Tester 호환성 | 기존 테스트 시나리오 정상 실행 |

### 비기능 테스트

| ID | 테스트 케이스 | 기준 |
|----|-------------|------|
| AC-07 | TypeScript 컴파일 | 오류 0개 |
| AC-08 | 기존 스킬 호출 | Review Squad에서 정상 호출 |

---

## 7. Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| OpenClaw API 변경 | LOW | HIGH | ref 기반 접근으로 Selector 의존성 최소화 |
| 병렬 실행 시 리소스 부족 | MEDIUM | MEDIUM | parallelism 설정으로 조절 |
| 자연어 파싱 오류 | MEDIUM | LOW | fallback으로 직접 Playwright 코드 사용 |
| 기존 QA Tester 호환성 깨짐 | LOW | HIGH | extends 패턴 사용, 기존 인터페이스 유지 |

---

## 8. Verification Steps

### 8.1 Unit Verification

```bash
# TypeScript 컴파일 확인
cd /home/yhchoi/dev/openclaw-dev-team
npx tsc skills/types.ts --noEmit

# 타입 사용 예시 컴파일
npx tsc --noEmit --skipLibCheck
```

### 8.2 Integration Verification

1. Review Squad 실행 후 Pipeline Log 확인
2. `.dev-team/pipeline-log.jsonl`에 `openclaw:*` 이벤트 기록 확인
3. 생성된 Playwright 스크립트 존재 확인

### 8.3 E2E Verification

```bash
# Staging 환경에서 테스트 실행
openclaw agent --message "
  Test the login flow on staging:
  1. Navigate to https://staging.myapp.com/login
  2. Fill email with test@example.com
  3. Fill password with testpass
  4. Click login
  5. Verify dashboard loads
  
  Generate Playwright script and take screenshots."
```

---

## 9. Timeline

| Phase | 작업 | 예상 시간 | 담당 |
|-------|------|---------|------|
| Phase 1 | Type Definitions | 1-2시간 | Executor |
| Phase 2 | QA Tester Enhancement | 2-3시간 | Executor |
| Phase 3 | Review Squad Integration | 1-2시간 | Executor |
| Phase 4 | Optional OpenClaw Tester Skill | 2-3시간 | Executor |
| **Total** | | **6-10시간** | |

---

## 10. Dependencies

### 10.1 선행 조건

- [ ] OpenClaw Gateway 실행 중
- [ ] Browser 활성화 (`openclaw config set browser.enabled true`)
- [ ] Chromium 설치 (`npx playwright install chromium`)

### 10.2 외부 의존성

| 의존성 | 버전 | 용도 |
|--------|------|------|
| OpenClaw CLI | latest | Browser automation |
| Playwright | ^1.40 | E2E testing |

---

## 11. Next Actions

1. **즉시 실행:** Phase 1 (Type Definitions) 시작
2. **사용자 승인 필요:** Phase 4 (전용 스킬 생성) 여부
3. **후속 작업:** Staging 환경 URL 설정

---

*Plan Created: 2026-02-25*
*Based on: research/staging-test-with-openclaw.md*
