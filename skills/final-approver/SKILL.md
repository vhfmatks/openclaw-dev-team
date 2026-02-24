---
name: dev-team:review-final-approver
description: |
  Review Squad의 최종 승인자. Reviewer와 QA Tester의 결과를 취합하여
  최종 승인/반려를 결정한다. 반려 시 Planner 또는 Executor로 자동 routing한다.
  
  트리거: Review Squad Leader가 Full 모드에서 호출
---

# Dev Team Final Approver

## 개요

Final Approver는 Review Squad의 최종 의사결정자 역할을 한다. Reviewer의 
요구사항 검수 결과와 QA Tester의 테스트 결과를 종합하여 승인/반려를 결정하고,
반려 시 문제의 원인에 따라 적절한 단계(Planner/Executor)로 자동 routing한다.

## 역할

1. **결과 취합**: Reviewer + QA Tester 결과 통합 분석
2. **승인/반려 결정**: 종합 판단으로 최종 결정
3. **자동 Routing**: 반려 시 Planner 또는 Executor로 routing
4. **Quality Score 계산**: Review 전체 품질 점수 산출
5. **Issue 분류**: 문제를 출처별로 분류하여 보고

## 입력

```typescript
interface FinalApproverInput {
  originalRequest: string;           // 사용자의 원본 요청
  reviewerResult: ReviewerResult;    // Reviewer 검수 결과
  qaResult?: QATesterResult;         // QA Tester 테스트 결과 (선택)
  context: {
    mode: 'basic' | 'full';
    previousIterations?: number;     // 이전 Rework 횟수
  };
}
```

## 출력

### 승인 결과

```json
{
  "status": "approved",
  "overallOpinion": "모든 검수와 테스트를 통과했습니다. 배포 준비가 완료되었습니다.",
  "issues": [],
  "quality": {
    "overall": 92,
    "grade": "A",
    "status": "pass",
    "checks": [
      { "name": "squad_flow", "score": 23, "weight": 25, "max": 25 },
      { "name": "actor_alignment", "score": 18, "weight": 20, "max": 20 },
      { "name": "requirement_traceability", "score": 23, "weight": 25, "max": 25 },
      { "name": "qa_coverage", "score": 18, "weight": 20, "max": 20 },
      { "name": "rework_control", "score": 10, "weight": 10, "max": 10 }
    ],
    "risks": []
  },
  "nextAction": "delivery"
}
```

### 반려 결과 (Planner로 Routing)

```json
{
  "status": "rejected",
  "overallOpinion": "요구사항이 계획에 올바르게 반영되지 않았습니다.",
  "routeTo": "planner",
  "issues": [
    {
      "source": "reviewer",
      "severity": "critical",
      "description": "로그아웃 기능이 요구사항에서 누락됨",
      "recommendation": "Plan Squad에서 로그아웃 관련 작업을 추가해야 합니다."
    }
  ],
  "quality": {
    "overall": 45,
    "grade": "F",
    "status": "fail",
    "checks": [...],
    "risks": ["요구사항 누락", "계획 불완전"]
  },
  "nextAction": "replan"
}
```

### 반려 결과 (Executor로 Routing)

```json
{
  "status": "rejected",
  "overallOpinion": "구현이 불완전합니다. 코드 수정이 필요합니다.",
  "routeTo": "executor",
  "issues": [
    {
      "source": "qa_tester",
      "severity": "critical",
      "description": "로그인 버튼 클릭 시 500 에러 발생",
      "recommendation": "API 에러 핸들링을 추가하세요."
    },
    {
      "source": "reviewer",
      "severity": "major",
      "description": "에러 처리 코드가 누락됨",
      "recommendation": "try-catch 블록을 추가하세요."
    }
  ],
  "quality": {
    "overall": 58,
    "grade": "D",
    "status": "fail",
    "checks": [...],
    "risks": ["기능 오동작", "에러 처리 미흡"]
  },
  "nextAction": "reimplement"
}
```

## 의사결정 프로세스

### Step 1: 결과 분석

```typescript
function analyzeResults(
  reviewerResult: ReviewerResult,
  qaResult?: QATesterResult
): AnalysisResult {
  const analysis = {
    // Reviewer 분석
    reviewerCritical: reviewerResult.mismatches.filter(m => m.severity === 'critical').length,
    reviewerMajor: reviewerResult.mismatches.filter(m => m.severity === 'major').length,
    reviewerMinor: reviewerResult.mismatches.filter(m => m.severity === 'minor').length,
    reviewerPassed: reviewerResult.status === 'pass',
    
    // QA 분석
    qaPassed: qaResult?.status === 'passed',
    qaFailed: qaResult?.summary.failed || 0,
    qaPartial: qaResult?.status === 'partial'
  };
  
  return analysis;
}
```

### Step 2: 승인/반려 결정

```typescript
function determineVerdict(analysis: AnalysisResult): 'approved' | 'rejected' {
  // 승인 조건
  const isApproved = 
    analysis.reviewerPassed &&
    analysis.reviewerCritical === 0 &&
    (analysis.qaPassed || analysis.qaFailed === 0);
  
  return isApproved ? 'approved' : 'rejected';
}
```

### Step 3: Routing 결정

```typescript
function determineRouting(
  reviewerResult: ReviewerResult,
  qaResult?: QATesterResult,
  analysis: AnalysisResult
): 'planner' | 'executor' | undefined {
  if (analysis.reviewerPassed && analysis.qaPassed) {
    return undefined;  // 승인, routing 불필요
  }
  
  // Planner로 routing하는 경우
  const plannerIssues = reviewerResult.mismatches.filter(m =>
    m.category === 'missing_feature' ||
    m.category === 'plan_deviation'
  );
  
  const hasCriticalPlannerIssues = plannerIssues.some(m => m.severity === 'critical');
  
  if (hasCriticalPlannerIssues) {
    return 'planner';
  }
  
  // Executor로 routing하는 경우
  const executorIssues = reviewerResult.mismatches.filter(m =>
    m.category === 'incomplete_implementation'
  );
  
  const hasQA Failures = analysis.qaFailed > 0;
  
  if (executorIssues.length > 0 || hasQAFailures) {
    return 'executor';
  }
  
  // 기본: Planner (요구사항 문제)
  return 'planner';
}
```

### Step 4: Issue 수집

```typescript
function collectIssues(
  reviewerResult: ReviewerResult,
  qaResult?: QATesterResult
): ApprovalIssue[] {
  const issues: ApprovalIssue[] = [];
  
  // Reviewer 이슈
  for (const mismatch of reviewerResult.mismatches) {
    if (mismatch.severity === 'critical' || mismatch.severity === 'major') {
      issues.push({
        source: 'reviewer',
        severity: mismatch.severity,
        description: mismatch.description,
        recommendation: mismatch.suggestion,
        targetStage: mismatch.category === 'missing_feature' || 
                     mismatch.category === 'plan_deviation' ? 'planner' : 'executor'
      });
    }
  }
  
  // QA 이슈
  if (qaResult) {
    for (const scenario of qaResult.scenarios) {
      if (scenario.status === 'failed') {
        issues.push({
          source: 'qa_tester',
          severity: 'critical',
          description: `테스트 실패: ${scenario.name}`,
          recommendation: scenario.error || '시나리오를 다시 확인하세요.',
          targetStage: 'executor'
        });
      }
    }
  }
  
  return issues;
}
```

### Step 5: Quality Score 계산

```typescript
function calculateQualityScore(params: {
  mode: 'basic' | 'full';
  reviewerResult: ReviewerResult;
  qaResult?: QATesterResult;
  iterations: number;
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

## Routing 규칙 상세

### Planner로 Routing

| 조건 | 이유 |
|------|------|
| `missing_feature` (critical) | 요구사항이 계획에 누락 |
| `plan_deviation` (critical) | 구현이 계획과 크게 다름 |
| Reviewer reject + 요구사항 문제 | 원천적 계획 오류 |

### Executor로 Routing

| 조건 | 이유 |
|------|------|
| `incomplete_implementation` | 구현이 불완전 |
| QA 테스트 실패 | 실제 동작하지 않음 |
| Reviewer reject + 구현 누락 | 계획은 맞으나 구현 안 됨 |

## Quality Score 체크 함수

```typescript
function checkSquadFlow(params: QualityParams): number {
  // 이벤트 타임라인의 모드 일관성 확인
  // Basic: reviewer만, Full: reviewer + qa + approver
  return params.mode === 'full' ? 25 : 20;
}

function checkActorAlignment(params: QualityParams): number {
  // 모드에 따른 필수 멤버 호출 확인
  if (params.mode === 'full') {
    const hasQA = params.qaResult !== undefined;
    return hasQA ? 20 : 10;
  }
  return 18;  // Basic 모드
}

function checkRequirementTraceability(reviewerResult: ReviewerResult): number {
  // 요구사항 → 계획 → 구현 추적성
  const { mismatches, checklist } = reviewerResult;
  const criticalCount = mismatches.filter(m => m.severity === 'critical').length;
  
  if (criticalCount === 0 && checklist.requirementCoverage) return 25;
  if (criticalCount <= 1) return 15;
  return 5;
}

function checkQACoverage(qaResult?: QATesterResult): number {
  if (!qaResult) return 20;  // Basic 모드
  
  const { summary } = qaResult;
  const passRate = summary.passed / summary.total;
  
  if (passRate === 1) return 20;
  if (passRate >= 0.8) return 15;
  if (passRate >= 0.6) return 10;
  return 5;
}

function checkReworkControl(iterations: number): number {
  if (iterations === 0) return 10;
  if (iterations === 1) return 8;
  if (iterations === 2) return 5;
  return 2;  // 3회
}

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}
```

## Pipeline Logging

```bash
# 승인자 시작
echo '{"event":"approver:start"}' >> .dev-team/pipeline-log.jsonl

# 결과 분석
echo '{"event":"approver:analysis","reviewer_status":"reject","qa_status":"failed","critical":2,"major":1}' >> .dev-team/pipeline-log.jsonl

# 승인
echo '{"event":"approver:result","status":"approved","quality_score":92,"grade":"A"}' >> .dev-team/pipeline-log.jsonl

# 반려 + Routing
echo '{"event":"approver:result","status":"rejected","routeTo":"executor","quality_score":58,"grade":"D"}' >> .dev-team/pipeline-log.jsonl
```

## 품질 체크리스트

- [ ] Reviewer 결과 분석됨
- [ ] QA Tester 결과 분석됨 (Full 모드)
- [ ] 승인/반려 기준에 따라 판정됨
- [ ] Routing이 올바르게 결정됨
- [ ] Issue가 출처별로 분류됨
- [ ] Quality Score가 계산됨
- [ ] Pipeline Log가 기록됨

## 참고

- [Review Squad Leader](../review-squad/SKILL.md)
- [Reviewer Skill](../reviewer/SKILL.md)
- [QA Tester Skill](../qa-tester/SKILL.md)
- [Pipeline Log Format](../pipeline-log-format.md)
