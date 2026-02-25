---
name: dev-team:review-squad
description: |
  Review Squad의 리더. 구현된 기능을 검수하고 승인/반려를 결정하는 팀을 조율한다.
  Reviewer(요구사항 검수), QA Tester(실제 테스트), Final Approver(최종 승인)를 배치하고
  Rework 루프를 관리하며, 반려 시 적절한 단계(Planner/Executor)로 routing한다.
  
  트리거: Orchestrator가 Phase 3(Review)에서 호출
---

# Dev Team Review Squad (Squad Leader)

## 개요

Review Squad Leader는 검수 팀의 리더로서, Execution Squad가 작성한 코드가
사용자의 원본 요청을 충족하는지 검증하고, 승인/반려를 결정한다.
Final Approver의 판정에 따라 Planner 또는 Executor로 routing하며,
최대 3회의 Rework 루프를 관리한다.
#YT|
#MY|## 조직 구조

```
Review Squad Leader (이 Skill)
    │
    ├── Reviewer (요구사항 검수) - 필수
    │     • 최초 요구사항 vs 계획 vs 구현 일치성 검수
    │
    ├── QA Tester (Human-like 테스트) - Full 모드
    │     • OpenClaw Browser/CLI로 실제 테스트
    │     • CLI/API 테스트
    │
    ├── OpenClaw Tester (Self-healing 테스트) - Full + Frontend
    │     ⚡ 기본 활성화 (hasFrontend 시 자동 실행)
    │     • Accessibility Tree 기반 Self-healing
    │     • 자연어 → Playwright 변환
    │     • 병렬 테스트 실행
    │     • Evidence 수집 (필수)
    │
    └── Final Approver (최종 승인) - Full 모드
          • Reviewer + QA + OpenClaw 결과 취합
          • 승인/반려 + 자동 routing
```

## 운영 모드

#YB|| 모드 | 멤버 | OpenClaw Tester | 판단 기준 | 예시 |
|------|------|-----------------|-----------|------|
| **Basic** | Reviewer만 | ❌ 비활성 | 단순 수정, 1-2개 파일 | 텍스트 수정, CSS |
| **Full** | Reviewer + QA + Final | ⚡ hasFrontend 시 활성 | 기능 추가/변경, 3개+ 파일 | 새 컴포넌트, API |

**OpenClaw Tester 자동 활성화 조건:**
- Full 모드 + `hasFrontend: true`
- Staging/Production 환경에서 Human-like 테스트 필요 시
## 입력

```typescript
interface ReviewSquadInput {
  originalRequest: string;          // 사용자의 원본 요청
  plan: Plan;                       // Plan Squad 출력
  execution: ExecutionSquadOutput;  // Execution Squad 출력
  context: {
    projectRoot: string;
    projectType: string;
    hasFrontend: boolean;
    hasBackend: boolean;
    testCommands: string[];
  };
}
```

## 출력

```json
{
  "metadata": {
    "reviewId": "review-20260224-001",
    "mode": "basic|full",
    "members": ["reviewer", "qa-tester", "final-approver"],
    "iterations": 1,
    "createdAt": "2026-02-24T10:00:00Z"
  },
  "status": "approved|rejected",
  "routeTo": "delivery|planner|executor",
  "reviewer": {
    "status": "pass|reject",
    "overallOpinion": "...",
    "mismatches": [],
    "checklist": { "requirementCoverage": true, "planConsistency": true, "implementationCompleteness": true }
  },
  "qaTester": {
    "status": "passed|failed|partial",
    "testType": "browser|cli|both",
    "scenarios": [],
    "summary": { "total": 5, "passed": 5, "failed": 0, "skipped": 0 }
  },
  "finalApprover": {
    "status": "approved|rejected",
    "overallOpinion": "...",
    "routeTo": "planner|executor",
    "issues": [],
    "quality": { "overall": 92, "grade": "A", "status": "pass" }
  },
  "quality": {
    "overall": 0,
    "grade": "A|B|C|D|F",
    "status": "pass|warn|fail",
    "checks": [],
    "risks": []
  },
  "summary": {
    "totalIssues": 0,
    "criticalIssues": 0,
    "testPassRate": 100
  }
}
```

## 워크플로우

### Step 1: 모드 결정

```typescript
function determineMode(input: ReviewSquadInput): ReviewMode {
  const { execution, plan, context } = input;
  
  // Full 모드 조건
  const isFullMode = 
    execution.execution.filesCreated.length + execution.execution.filesModified.length >= 3 ||
    plan.tasks.length >= 3 ||
    context.hasFrontend ||
    context.hasBackend ||
    hasFunctionalChanges(plan);
  
  return isFullMode ? 'full' : 'basic';
}

function hasFunctionalChanges(plan: Plan): boolean {
  const functionalKeywords = ['api', 'component', 'page', 'feature', '기능', '화면'];
  return plan.tasks.some(task => 
    functionalKeywords.some(kw => 
      task.title.toLowerCase().includes(kw) || 
      task.description.toLowerCase().includes(kw)
    )
  );
}
```

### Step 2: Reviewer 실행 (필수)

```typescript
async function runReviewer(input: ReviewSquadInput): Promise<ReviewerResult> {
  logEvent({
    event: 'reviewer:start',
    mode: mode
  });
  
  const result = await invokeSkill('dev-team:review-reviewer', {
    originalRequest: input.originalRequest,
    plan: input.plan,
    execution: input.execution,
    context: input.context
  });
  
  logEvent({
    event: 'reviewer:result',
    status: result.status,
    mismatches: result.mismatches.length,
    criticalCount: result.mismatches.filter(m => m.severity === 'critical').length
  });
  
  return result;
}
```

### Step 3: QA Tester 실행 (Full 모드만)

```typescript
async function runQATester(input: ReviewSquadInput): Promise<QATesterResult | undefined> {
  if (mode !== 'full') return undefined;
  
  logEvent({
    event: 'qa:start',
    testType: determineTestType(input.context)
  });
  
  const result = await invokeSkill('dev-team:review-qa-tester', {
    execution: input.execution,
    context: input.context,
    testScenarios: input.plan.validation_criteria
  });
  
  logEvent({
    event: 'qa:result',
    status: result.status,
    passed: result.summary.passed,
    failed: result.summary.failed
  });
  
  #HW|  return result;
#KM|}

function determineTestType(context: ReviewContext): 'browser' | 'cli' | 'both' {
  if (context.hasFrontend && context.hasBackend) return 'both';
  if (context.hasFrontend) return 'browser';
  return 'cli';
}
```

### Step 3-1: OpenClaw Tester 실행 (Full 모드 + hasFrontend)

```typescript
async function runOpenClawTester(input: ReviewSquadInput): Promise<OpenClawTesterResult | undefined> {
  // Full 모드이고 Frontend가 있는 경우 실행
  if (mode !== 'full' || !input.context.hasFrontend) return undefined;
  
  logEvent({
    event: 'openclaw:start',
    mode: 'hybrid',
    scenarios: input.plan.validation_criteria.length
  });
  
  try {
    const result = await invokeSkill('dev-team:review-openclaw-tester', {
      execution: input.execution,
      context: input.context,
      testScenarios: input.plan.validation_criteria,
      mode: 'hybrid',
      naturalLanguageScenarios: convertToNLCenarios(input.plan.validation_criteria),
      config: {
        stagingUrl: process.env.STAGING_URL,
        parallelism: 4,
        timeout: 120000,
        captureScreenshots: true,
        captureVideo: false,
        generatePlaywrightScript: true,
        outputDir: '.dev-team/evidence'
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
  } catch (error) {
    // OpenClaw Tester 실패 시 QA Tester 결과만 사용
    logEvent({
      event: 'openclaw:error',
      error: error.message
    });
    return undefined;
  }
}

function convertToNLCenarios(criteria: ValidationCriteria[]): NaturalLanguageScenario[] {
  return criteria.map((c, i) => ({
    id: `scenario-${i}`,
    name: c.scenario,
    description: c.expected,
    steps: [c.scenario],
    expected: c.expected
  }));
}
```

### Step 4: Final Approver 실행 (Full 모드만)

```typescript
async function runFinalApprover(
  input: ReviewSquadInput,
  reviewerResult: ReviewerResult,
  #KV|  qaResult: QATesterResult | undefined,
  openclawResult: OpenClawTesterResult | undefined
  if (mode !== 'full') return undefined;
  
  logEvent({
    event: 'approver:start'
  });
  
  const result = await invokeSkill('dev-team:review-final-approver', {
    #WN|    originalRequest: input.originalRequest,
    reviewerResult,
    qaResult,
    openclawResult  // OpenClaw Tester 결과 추가
  
  logEvent({
    event: 'approver:result',
    status: result.status,
    routeTo: result.routeTo || 'delivery'
  });
  
  return result;
}
```

### Step 5: Basic 모드 승인 판정

```typescript
function basicModeDecision(reviewerResult: ReviewerResult): {
  approved: boolean;
  routeTo?: 'planner' | 'executor';
} {
  const criticalMismatches = reviewerResult.mismatches.filter(
    m => m.severity === 'critical'
  );
  
  if (reviewerResult.status === 'pass' && criticalMismatches.length === 0) {
    return { approved: true };
  }
  
  // Routing 결정
  const routeTo = determineRouteFromMismatches(reviewerResult.mismatches);
  return { approved: false, routeTo };
}

function determineRouteFromMismatches(mismatches: RequirementMismatch[]): 'planner' | 'executor' {
  // 요구사항/계획 문제는 Planner
  const planIssues = mismatches.filter(m => 
    m.category === 'missing_feature' || 
    m.category === 'plan_deviation'
  );
  
  // 구현 문제는 Executor
  const executionIssues = mismatches.filter(m => 
    m.category === 'incomplete_implementation'
  );
  
  // 더 심각한 쪽으로 routing
  if (planIssues.filter(m => m.severity === 'critical').length >= 
      executionIssues.filter(m => m.severity === 'critical').length) {
    return 'planner';
  }
  
  return 'executor';
}
```

### Step 6: Rework 루프 (최대 3회)

```typescript
async function handleRework(
  input: ReviewSquadInput,
  initialResult: ReviewSquadOutput
): Promise<ReviewSquadOutput> {
  let iteration = 1;
  const MAX_ITERATIONS = 3;
  let currentResult = initialResult;
  
  while (currentResult.status === 'rejected' && iteration <= MAX_ITERATIONS) {
    logEvent({
      event: 'rework:start',
      iteration,
      routeTo: currentResult.routeTo
    });
    
    // RouteTo에 따라 이전 단계 재실행 요청
    if (currentResult.routeTo === 'planner') {
      await requestPlannerRework(input, currentResult);
    } else if (currentResult.routeTo === 'executor') {
      await requestExecutorRework(input, currentResult);
    }
    
    // Review 다시 실행
    currentResult = await runReview(input);
    
    logEvent({
      event: 'rework:complete',
      iteration,
      status: currentResult.status
    });
    
    iteration++;
  }
  
  // 3회 초과 시 사용자 확인 필요
  if (currentResult.status === 'rejected') {
    logEvent({
      event: 'escalation:user_input_required',
      iterations: iteration - 1
    });
  }
  
  return currentResult;
}
```

### Step 7: Quality Score 계산

```typescript
function calculateQualityScore(params: {
  mode: ReviewMode;
  members: string[];
  iterations: number;
  reviewerResult: ReviewerResult;
  qaResult?: QATesterResult;
  finalApproverResult?: FinalApproverResult;
}): ReviewQualityScore {
  const checks: ReviewQualityCheck[] = [
    { 
      name: 'squad_flow', 
      score: checkSquadFlow(params), 
      weight: 25, 
      max: 25 
    },
    { 
      name: 'actor_alignment', 
      score: checkActorAlignment(params), 
      weight: 20, 
      max: 20 
    },
    { 
      name: 'requirement_traceability', 
      score: checkRequirementTraceability(params.reviewerResult), 
      weight: 25, 
      max: 25 
    },
    { 
      name: 'qa_coverage', 
      score: checkQACoverage(params.qaResult), 
      weight: 20, 
      max: 20 
    },
    { 
      name: 'rework_control', 
      score: checkReworkControl(params.iterations), 
      weight: 10, 
      max: 10 
    }
  ];
  
  const overall = Math.round(
    checks.reduce((sum, c) => sum + (c.score * c.weight / c.max), 0)
  );
  
  return {
    overall,
    grade: scoreToGrade(overall),
    status: overall >= 85 ? 'pass' : overall >= 70 ? 'warn' : 'fail',
    checks,
    risks: identifyRisks(params)
  };
}
```

## Pipeline Log 이벤트

#ZT|| 이벤트 | 설명 | 예시 |
|--------|------|------|
| `squad:start` | Squad 시작 | `{"event":"squad:start","mode":"full","members":["reviewer","qa-tester","openclaw-tester","approver"]}` |
| `squad:complete` | Squad 완료 | `{"event":"squad:complete","status":"approved","iterations":1}` |
| `reviewer:start` | Reviewer 시작 | `{"event":"reviewer:start"}` |
| `reviewer:result` | Reviewer 결과 | `{"event":"reviewer:result","status":"pass","mismatches":0}` |
| `qa:start` | QA 시작 | `{"event":"qa:start","testType":"browser"}` |
| `qa:result` | QA 결과 | `{"event":"qa:result","status":"passed","passed":5,"failed":0}` |
| `openclaw:start` | OpenClaw Tester 시작 | `{"event":"openclaw:start","mode":"hybrid","scenarios":5}` |
| `openclaw:result` | OpenClaw Tester 결과 | `{"event":"openclaw:result","status":"passed","selfHealingRate":95}` |
| `openclaw:error` | OpenClaw Tester 에러 | `{"event":"openclaw:error","error":"..."}` |
| `approver:start` | Approver 시작 | `{"event":"approver:start"}` |
| `approver:result` | Approver 결과 | `{"event":"approver:result","status":"approved"}` |
| `rework:start` | Rework 시작 | `{"event":"rework:start","iteration":1,"routeTo":"executor"}` |
| `rework:complete` | Rework 완료 | `{"event":"rework:complete","iteration":1,"status":"approved"}` |
| `quality:score` | 품질 점수 | `{"event":"quality:score","score":92,"grade":"A"}` |
| `route:decision` | Routing 결정 | `{"event":"route:decision","routeTo":"executor","reason":"implementation_incomplete"}` |

## Quality Score System

`quality`는 5개 체크 항목으로 계산한다.

1. `squad_flow` (25점): 이벤트 타임라인의 모드 일관성
2. `actor_alignment` (20점): 요청 모드에 따른 필수 멤버 호출 존재
3. `requirement_traceability` (25점): 요구사항→계획→구현 추적성
4. `qa_coverage` (20점): QA 테스트 커버리지 (Full 모드)
5. `rework_control` (10점): Rework 최대 3회

권장 상태 규칙:
- `pass`: score 85 이상
- `warn`: score 70~84
- `fail`: score 69 이하

## Routing 규칙

### Planner로 Routing (계획/요구사항 문제)

| 상황 | 이유 |
|------|------|
| `missing_feature` (critical) | 요구사항이 계획에 누락됨 |
| `plan_deviation` (critical) | 구현이 계획과 크게 다름 |
| Reviewer reject + 계획 불일치 | 원천적으로 계획이 잘못됨 |

### Executor로 Routing (구현 문제)

| 상황 | 이유 |
|------|------|
| `incomplete_implementation` | 구현이 불완전함 |
| QA Tester failed | 실제 동작하지 않음 |
| Reviewer reject + 구현 누락 | 계획은 맞으나 구현이 안 됨 |

### Delivery로 Routing (승인)

| 상황 | 이유 |
|------|------|
| Reviewer pass (Basic) | Basic 모드 통과 |
| Final Approver approved (Full) | Full 모드 통과 |

## 품질 체크리스트

Squad 완료 전 확인:

- [ ] 적절한 모드로 멤버 구성됨
- [ ] 모든 Pipeline Log 이벤트 기록됨
#TP|- [ ] Reviewer 실행 및 결과 기록됨
- [ ] Full 모드: QA Tester + OpenClaw Tester + Final Approver 실행됨
- [ ] 반려 시 올바른 routing 결정됨
- [ ] Rework 루프 최대 3회 준수
- [ ] `quality` 점수 계산 후 `quality:score` 이벤트 기록됨

## 의존성

- `dev-team:review-reviewer` Skill - 필수
- `dev-team:review-qa-tester` Skill - Full 모드
- `dev-team:review-openclaw-tester` Skill - Full + Frontend (⚡ 기본 활성화)
- `dev-team:review-final-approver` Skill - Full 모드

## 에러 처리

| 에러 | 원인 | 복구 |
|------|------|------|
| Reviewer 실패 | 요구사항 이해 불가 | Planner로 routing |
| QA Tester 실패 | 환경 문제 | 사용자 확인 후 재시도 |
| 3회 Rework 실패 | 근본적 문제 | 사용자 개입 요청 |

## 설정

```json
{
  "reviewSquad": {
    "maxReworkIterations": 3,
    "defaultMode": "full",
    "enableAutoRouting": true,
    "testTimeout": 120000,
    "captureScreenshots": true
  }
}
```

## 참고

- [Reviewer Skill](../reviewer/SKILL.md)
- [QA Tester Skill](../qa-tester/SKILL.md)
- [Final Approver Skill](../final-approver/SKILL.md)
- [Pipeline Log Format](../pipeline-log-format.md)
