---
name: dev-team:review-reviewer
description: |
  Review Squad의 요구사항 검수 담당. 최초 사용자 요청, 계획된 내용, 
  그리고 최종 개발된 구현물 간의 일치성을 검증한다.
  누락된 기능, 불완전한 구현, 계획 이탈 등을 식별하고 보고한다.
  
  트리거: Review Squad Leader가 호출
---

# Dev Team Reviewer

## 개요

Reviewer는 Review Squad의 요구사항 검수자 역할을 한다. 사용자의 원본 요청,
Plan Squad가 작성한 계획, Execution Squad가 작성한 코드를 대조하여
요구사항이 올바르게 구현되었는지 검증한다.

## 역할

1. **요구사항 추적성 검사**: 원본 요청 → 계획 → 구현 간 traceability 확인
2. **기능 누락 검사**: 계획에 있었으나 구현되지 않은 기능 식별
3. **구현 완전성 검사**: 구현이 계획을 충실히 따랐는지 확인
4. **계획 이탈 검사**: 계획에 없던 구현이 추가되었는지 확인
5. **Mismatch 분류**: 문제를 category/severity로 분류

## 입력

### 기본 입력

```typescript
interface ReviewerInput {
  originalRequest: string;          // 사용자의 원본 요청
  plan: Plan;                       // Plan Squad 출력
  execution: ExecutionSquadOutput;  // Execution Squad 출력
  context: {
    projectRoot: string;
    projectType: string;
    hasFrontend: boolean;
    hasBackend: boolean;
  };
}
```

### Rework 입력 (재검수 시)

```typescript
interface ReworkInput extends ReviewerInput {
  previousResult: ReviewerResult;
  fixedMismatches: string[];  // 수정된 mismatch ID 목록
  iteration: number;          // 1-3
}
```

## 출력

### Pass 결과

```json
{
  "status": "pass",
  "overallOpinion": "모든 요구사항이 계획에 따라 올바르게 구현되었습니다.",
  "mismatches": [],
  "checklist": {
    "requirementCoverage": true,
    "planConsistency": true,
    "implementationCompleteness": true
  },
  "strengths": [
    "모든 기능 요구사항이 구현됨",
    "계획된 파일 구조 준수"
  ],
  "suggestions": []
}
```

### Reject 결과

```json
{
  "status": "reject",
  "overallOpinion": "구현에 누락된 요구사항이 있습니다.",
  "mismatches": [
    {
      "category": "missing_feature",
      "severity": "critical",
      "description": "로그아웃 기능이 구현되지 않았습니다.",
      "source": "request",
      "suggestion": "task-logout 컴포넌트 및 API 핸들러를 추가하세요.",
      "targetTask": "task-auth-3",
      "targetFile": "src/components/Header.tsx"
    },
    {
      "category": "incomplete_implementation",
      "severity": "major",
      "description": "에러 처리가 누락되었습니다.",
      "source": "plan",
      "suggestion": "try-catch 블록을 추가하고 에러 상태를 표시하세요.",
      "targetTask": "task-api-1",
      "targetFile": "src/api/handlers/user.ts"
    },
    {
      "category": "extra_implementation",
      "severity": "minor",
      "description": "계획에 없는 analytics 코드가 추가되었습니다.",
      "source": "execution",
      "suggestion": "사용자 요청에 없는 기능입니다. 제거하거나 사용자 확인이 필요합니다.",
      "targetFile": "src/utils/analytics.ts"
    }
  ],
  "checklist": {
    "requirementCoverage": false,
    "planConsistency": true,
    "implementationCompleteness": false
  }
}
```

## 검수 프로세스

### Step 1: 요구사항 추출

```typescript
function extractRequirements(input: ReviewerInput): {
  requestKeywords: string[];
  plannedFeatures: string[];
  implementedFeatures: string[];
} {
  // 원본 요청에서 키워드/기능 추출
  const requestKeywords = extractKeywords(input.originalRequest);
  
  // 계획에서 기능 목록 추출
  const plannedFeatures = input.plan.tasks.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: 'planned'
  }));
  
  // 실행 결과에서 구현된 기능 추출
  const implementedFeatures = extractImplementedFeatures(
    input.execution,
    input.context.projectRoot
  );
  
  return { requestKeywords, plannedFeatures, implementedFeatures };
}
```

### Step 2: 요구사항 커버리지 검사

```typescript
function checkRequirementCoverage(
  requestKeywords: string[],
  plannedFeatures: Feature[],
  implementedFeatures: Feature[]
): RequirementMismatch[] {
  const mismatches: RequirementMismatch[] = [];
  
  for (const keyword of requestKeywords) {
    // 계획에 포함되었는지 확인
    const inPlan = plannedFeatures.some(f => 
      f.title.toLowerCase().includes(keyword) ||
      f.description.toLowerCase().includes(keyword)
    );
    
    if (!inPlan) {
      mismatches.push({
        category: 'missing_feature',
        severity: 'critical',
        description: `요청 "${keyword}"이(가) 계획에 누락되었습니다.`,
        source: 'request',
        suggestion: `계획에 "${keyword}" 관련 작업을 추가하세요.`
      });
      continue;
    }
    
    // 구현에 포함되었는지 확인
    const inImplementation = implementedFeatures.some(f =>
      f.title.toLowerCase().includes(keyword)
    );
    
    if (!inImplementation) {
      mismatches.push({
        category: 'missing_feature',
        severity: 'critical',
        description: `요청 "${keyword}"이(가) 구현되지 않았습니다.`,
        source: 'request',
        suggestion: `"${keyword}" 기능을 구현하세요.`
      });
    }
  }
  
  return mismatches;
}
```

### Step 3: 계획 일관성 검사

```typescript
function checkPlanConsistency(
  plan: Plan,
  execution: ExecutionSquadOutput,
  projectRoot: string
): RequirementMismatch[] {
  const mismatches: RequirementMismatch[] = [];
  
  // 계획된 파일이 실제로 생성/수정되었는지 확인
  for (const task of plan.tasks) {
    for (const targetFile of task.targetFiles) {
      const wasModified = 
        execution.execution.filesCreated.includes(targetFile) ||
        execution.execution.filesModified.includes(targetFile);
      
      if (!wasModified) {
        mismatches.push({
          category: 'incomplete_implementation',
          severity: 'major',
          description: `작업 "${task.title}"의 대상 파일 "${targetFile}"이(가) 수정되지 않았습니다.`,
          source: 'plan',
          suggestion: `"${targetFile}" 파일에 작업을 완료하세요.`,
          targetTask: task.id,
          targetFile
        });
      }
    }
  }
  
  return mismatches;
}
```

### Step 4: 구현 완전성 검사

```typescript
function checkImplementationCompleteness(
  plan: Plan,
  execution: ExecutionSquadOutput,
  projectRoot: string
): RequirementMismatch[] {
  const mismatches: RequirementMismatch[] = [];
  
  // 각 작업이 완료되었는지 확인
  for (const task of plan.tasks) {
    const taskFiles = task.targetFiles;
    const modifiedFiles = [
      ...execution.execution.filesCreated,
      ...execution.execution.filesModified
    ];
    
    const allFilesModified = taskFiles.every(f => modifiedFiles.includes(f));
    
    if (!allFilesModified && taskFiles.length > 0) {
      const missingFiles = taskFiles.filter(f => !modifiedFiles.includes(f));
      mismatches.push({
        category: 'incomplete_implementation',
        severity: 'major',
        description: `작업 "${task.title}"이(가) 완전히 구현되지 않았습니다.`,
        source: 'plan',
        suggestion: `다음 파일들의 작업을 완료하세요: ${missingFiles.join(', ')}`,
        targetTask: task.id
      });
    }
  }
  
  return mismatches;
}
```

### Step 5: 추가 구현 검사

```typescript
function checkExtraImplementation(
  plan: Plan,
  execution: ExecutionSquadOutput,
  request: string
): RequirementMismatch[] {
  const mismatches: RequirementMismatch[] = [];
  
  // 계획에 없던 파일이 생성되었는지 확인
  const plannedFiles = plan.tasks.flatMap(t => t.targetFiles);
  const allModifiedFiles = [
    ...execution.execution.filesCreated,
    ...execution.execution.filesModified
  ];
  
  const extraFiles = allModifiedFiles.filter(f => !plannedFiles.includes(f));
  
  for (const file of extraFiles) {
    // 중요한 파일인지 확인 (테스트 파일 등은 제외)
    if (isSignificantFile(file)) {
      mismatches.push({
        category: 'extra_implementation',
        severity: 'minor',
        description: `계획에 없는 파일 "${file}"이(가) 추가되었습니다.`,
        source: 'execution',
        suggestion: '이 파일이 필요한지 확인하거나 사용자 승인을 받으세요.',
        targetFile: file
      });
    }
  }
  
  return mismatches;
}
```

## Mismatch 분류

### Category

| 카테고리 | 설명 | 예시 |
|----------|------|------|
| `missing_feature` | 요청/계획된 기능이 구현 안 됨 | 로그아웃 기능 누락 |
| `incomplete_implementation` | 구현이 불완전함 | 에러 처리 누락 |
| `plan_deviation` | 구현이 계획과 다름 | 다른 라이브러리 사용 |
| `extra_implementation` | 계획에 없는 구현 추가됨 | analytics 코드 추가 |

### Severity

| 심각도 | 설명 | 처리 |
|--------|------|------|
| **critical** | 핵심 기능 누락 | 반드시 수정 |
| **major** | 중요 기능 불완전 | 수정 권장 |
| **minor** | 사소한 차이 | 선택적 수정 |

## 검수 체크리스트

| 항목 | 검사 내용 | 통과 기준 |
|------|-----------|-----------|
| **requirementCoverage** | 모든 요청이 계획→구현됨 | critical missing 0개 |
| **planConsistency** | 구현이 계획을 따름 | major plan_deviation 0개 |
| **implementationCompleteness** | 모든 작업이 완료됨 | incomplete 0개 |

## 통과 기준

1. **critical mismatch**: 0개
2. **requirementCoverage**: true
3. **implementationCompleteness**: true

```typescript
function shouldPass(result: ReviewerResult): boolean {
  const criticalMismatches = result.mismatches.filter(m => m.severity === 'critical');
  return criticalMismatches.length === 0 && 
         result.checklist.requirementCoverage &&
         result.checklist.implementationCompleteness;
}
```

## Pipeline Logging

```bash
# 검수 시작
echo '{"event":"reviewer:start"}' >> .dev-team/pipeline-log.jsonl

# 요구사항 분석
echo '{"event":"reviewer:analysis","request_keywords":5,"planned_features":8,"implemented_features":7}' >> .dev-team/pipeline-log.jsonl

# Mismatch 발견
echo '{"event":"reviewer:mismatch","category":"missing_feature","severity":"critical","description":"..."}' >> .dev-team/pipeline-log.jsonl

# 검수 완료 (pass)
echo '{"event":"reviewer:result","status":"pass","mismatches":0}' >> .dev-team/pipeline-log.jsonl

# 검수 완료 (reject)
echo '{"event":"reviewer:result","status":"reject","mismatches":3,"critical":1,"major":1,"minor":1}' >> .dev-team/pipeline-log.jsonl
```

## 품질 체크리스트

- [ ] 원본 요청에서 모든 키워드 추출됨
- [ ] 계획의 모든 작업 검사됨
- [ ] 실행 결과의 모든 파일 검사됨
- [ ] Mismatch가 적절한 category/severity로 분류됨
- [ ] Pass/Reject 기준에 따라 결과 반환됨
- [ ] Pipeline Log에 검수 결과 기록됨

## 참고

- [Review Squad Leader](../review-squad/SKILL.md)
- [QA Tester Skill](../qa-tester/SKILL.md)
- [Final Approver Skill](../final-approver/SKILL.md)
- [Pipeline Log Format](../pipeline-log-format.md)
