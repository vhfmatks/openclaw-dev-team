---
name: dev-team:review-openclaw-tester
description: |
  Review Squad의 OpenClaw 전문 테스터. Accessibility Tree 기반 Self-healing 테스트,
  자연어 시나리오 → Playwright 변환, 병렬 테스트 실행을 지원한다.
  
  트리거: Review Squad Leader가 Full 모드에서 호출 (선택적)
---

# Dev Team OpenClaw Tester

## 개요

OpenClaw Tester는 Review Squad의 전문 테스터로, OpenClaw의 고급 브라우저 자동화 기능을
활용하여 Human-like 테스트를 수행합니다. 기존 QA Tester를 확장하여 Self-healing,
자연어 테스트 정의, 병렬 실행 등을 지원합니다.

## 역할

1. **Self-healing 테스트**: Accessibility Tree 기반으로 UI 변경에 강건한 테스트
2. **자연어 테스트**: 자연어 시나리오를 Playwright 코드로 변환
3. **병렬 실행**: Sub-agents를 통한 동시 테스트 실행
4. **Staging 검증**: 실제 환경에서 Human-like 테스트 수행
5. **증거 수집**: 스크린샷, 비디오, Playwright 스크립트 생성

## 입력

```typescript
interface OpenClawTesterInput {
  execution: ExecutionSquadOutput;
  context: {
    projectRoot: string;
    projectType: string;
    hasFrontend: boolean;
    hasBackend: boolean;
    testCommands: string[];
  };
  testScenarios: ValidationCriteria[];
  mode: 'snapshot' | 'natural-language' | 'hybrid';
  naturalLanguageScenarios?: NaturalLanguageScenario[];
  config: {
    stagingUrl?: string;
    productionUrl?: string;
    browserProfile: 'managed' | 'cdp' | 'extension';
    cdpUrl?: string;
    parallelism: number;
    timeout: number;
    captureScreenshots: boolean;
    captureVideo: boolean;
    generatePlaywrightScript: boolean;
  };
}
```

## 출력

```typescript
interface OpenClawTesterResult {
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
  
  // 통계
  selfHealingStats?: {
    total: number;
    successful: number;
    rate: number;
  };
}
```

## 실행 프로세스

### Step 1: 모드 결정

```typescript
function determineMode(input: OpenClawTesterInput): OpenClawTesterMode {
  // 자연어 시나리오가 있으면 natural-language 또는 hybrid
  if (input.naturalLanguageScenarios?.length > 0) {
    return input.testScenarios.length > 0 ? 'hybrid' : 'natural-language';
  }
  return 'snapshot';
}
```

### Step 2: Snapshot Engine 실행

```typescript
async function runSnapshotEngine(url: string): Promise<OpenClawSnapshot> {
  // OpenClaw Browser로 스냅샷 생성
  await openclaw.browser.open(url);
  const snapshot = await openclaw.browser.snapshot({ interactive: true });
  
  return {
    timestamp: new Date().toISOString(),
    url,
    title: await openclaw.browser.getTitle(),
    refs: parseRefs(snapshot),
    interactiveOnly: true,
    raw: snapshot
  };
}

function parseRefs(snapshot: string): AccessibilityRef[] {
  // "e1: button 'Submit'" 형식 파싱
  const refs: AccessibilityRef[] = [];
  const regex = /(\w+):\s*(\w+)\s+'([^']+)'/g;
  let match;
  while ((match = regex.exec(snapshot)) !== null) {
    refs.push({
      ref: match[1],
      role: match[2],
      name: match[3]
    });
  }
  return refs;
}
```

### Step 3: 자연어 → Playwright 변환

```typescript
async function generatePlaywrightFromNL(
  scenario: NaturalLanguageScenario,
  refs: AccessibilityRef[]
): Promise<{ code: string; selectors: AccessibilityRef[] }> {
  const lines: string[] = [
    `// ${scenario.name}`,
    `// Auto-generated from natural language`,
    `test('${scenario.description}', async ({ page }) => {`
  ];
  
  const selectors: AccessibilityRef[] = [];
  
  for (const step of scenario.steps) {
    const { code, selector } = await parseStep(step, refs);
    lines.push(`  ${code}`);
    if (selector) selectors.push(selector);
  }
  
  lines.push('});');
  
  return {
    code: lines.join('\n'),
    selectors
  };
}

async function parseStep(
  step: string,
  refs: AccessibilityRef[]
): Promise<{ code: string; selector?: AccessibilityRef }> {
  // "로그인 버튼 클릭" → page.getByRole('button', {name: '로그인'}).click()
  if (step.includes('클릭')) {
    const name = step.replace('클릭', '').trim();
    const ref = refs.find(r => r.name.includes(name) || name.includes(r.name));
    if (ref) {
      return {
        code: `await page.getByRole('${ref.role}', {name: '${ref.name}'}).click();`,
        selector: ref
      };
    }
  }
  // ... other patterns
}
```

### Step 4: 병렬 테스트 실행

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
    
    logEvent({
      event: 'openclaw:parallel',
      agents: batch.length,
      scenarios: batch.length
    });
  }
  
  return results;
}

async function runSubAgentTest(
  scenario: NaturalLanguageScenario
): Promise<ParallelTestResult> {
  const startTime = Date.now();
  
  try {
    // Sub-agent로 테스트 실행
    const result = await invokeSubAgent('openclaw-tester', {
      scenario,
      timeout: 60000
    });
    
    return {
      subAgentId: result.agentId,
      scenarioId: scenario.id,
      status: 'passed',
      duration: Date.now() - startTime,
      evidence: result.screenshots
    };
  } catch (error) {
    return {
      subAgentId: 'unknown',
      scenarioId: scenario.id,
      status: 'failed',
      duration: Date.now() - startTime,
      evidence: [],
      error: error.message
    };
  }
}
```

### Step 5: Self-healing 적용

```typescript
async function selfHeal(
  selector: string,
  refs: AccessibilityRef[]
): Promise<{ ref: AccessibilityRef; success: boolean }> {
  // CSS Selector가 실패하면 Accessibility Ref로 복구
  logEvent({
    event: 'openclaw:selfhealing',
    original: selector,
    attempt: 'accessibility-ref'
  });
  
  // Selector에서 이름 추출 시도
  const nameMatch = selector.match(/\[name=['"]([^'"]+)['"]\]/);
  if (nameMatch) {
    const ref = refs.find(r => 
      r.name.toLowerCase().includes(nameMatch[1].toLowerCase())
    );
    if (ref) {
      logEvent({
        event: 'openclaw:selfhealing',
        original: selector,
        healed: `@${ref.ref}`,
        success: true
      });
      return { ref, success: true };
    }
  }
  
  return { ref: null, success: false };
}
```

### Step 6: 결과 보고

```typescript
function generateReport(result: OpenClawTesterResult): string {
  const lines = [
    `# OpenClaw 테스트 결과`,
    ``,
    `## 요약`,
    `- **상태**: ${result.status}`,
    `- **모드**: ${result.mode}`,
    `- **시나리오**: ${result.summary.total}개`,
    `- **통과**: ${result.summary.passed}`,
    `- **실패**: ${result.summary.failed}`,
    ``
  ];
  
  if (result.selfHealingStats) {
    lines.push(`## Self-healing 통계`);
    lines.push(`- **성공률**: ${result.selfHealingStats.rate}%`);
    lines.push(`- **복구 성공**: ${result.selfHealingStats.successful}/${result.selfHealingStats.total}`);
    lines.push(``);
  }
  
  if (result.playwrightScripts?.length > 0) {
    lines.push(`## 생성된 Playwright 스크립트`);
    for (const script of result.playwrightScripts) {
      lines.push(`- [${script.scenarioId}](${script.path})`);
    }
  }
  
  return lines.join('\n');
}
```

## Self-healing 메커니즘

### 작동 원리

1. **1차: CSS Selector 시도**
   ```typescript
   await page.click('.btn-primary');  // 실패 가능
   ```

2. **2차: Accessibility Ref 복구**
   ```typescript
   // Snapshot에서 refs 조회
   const ref = refs.find(r => r.name === 'Submit');
   await page.getByRole(ref.role, {name: ref.name}).click();
   ```

3. **이벤트 로깅**
   ```json
   {
     "event": "openclaw:selfhealing",
     "original": ".btn-primary",
     "healed": "@e2",
     "success": true
   }
   ```

### 복구 가능한 변경

| 변경 유형 | 복구 방법 |
|----------|---------|
| CSS class 변경 | Accessibility role + name 사용 |
| ID 변경 | Accessibility role + name 사용 |
| DOM 구조 변경 | Accessibility tree는 구조 독립적 |
| 텍스트 변경 | 부분 매칭 + 유사도 검사 |

## Pipeline Logging

### 이벤트 목록

| 이벤트 | 설명 | 예시 |
|--------|------|------|
| `openclaw:start` | 테스트 시작 | `{"event":"openclaw:start","mode":"hybrid"}` |
| `openclaw:snapshot` | 스냅샷 생성 | `{"event":"openclaw:snapshot","refs":15}` |
| `openclaw:selfhealing` | Self-healing | `{"event":"openclaw:selfhealing","success":true}` |
| `openclaw:nlp2code` | 변환 완료 | `{"event":"openclaw:nlp2code","lines":12}` |
| `openclaw:parallel` | 병렬 실행 | `{"event":"openclaw:parallel","agents":4}` |
| `openclaw:result` | 결과 | `{"event":"openclaw:result","status":"passed"}` |

### 로깅 예시

```bash
# 테스트 시작
echo '{"event":"openclaw:start","mode":"hybrid","scenarios":5}' >> .dev-team/pipeline-log.jsonl

# Snapshot 생성
echo '{"event":"openclaw:snapshot","url":"https://staging.myapp.com","refs":23}' >> .dev-team/pipeline-log.jsonl

# Self-healing 이벤트
echo '{"event":"openclaw:selfhealing","original":".submit-btn","healed":"@e5","success":true}' >> .dev-team/pipeline-log.jsonl

# 테스트 완료
echo '{"event":"openclaw:result","status":"passed","passed":5,"failed":0}' >> .dev-team/pipeline-log.jsonl
```

#YM|## 품질 체크리스트

#KS|- [ ] Accessibility Tree 스냅샷 생성됨
#SB|- [ ] 모든 시나리오 실행됨
#NK|- [ ] Self-healing 이벤트 기록됨
#HX|- [ ] Playwright 스크립트 생성됨 (요청 시)
#VW|- [ ] 스크린샷 캡처됨
#KQ|- [ ] Pipeline Log 기록됨
#XW|- [ ] 병렬 실행 결과 취합됨

## Evidence 수집 (필수)

모든 테스트 단계에서 **증거(Evidence)**를 체계적으로 수집하여 검증 가능성을 보장합니다.

### Evidence 유형

| 유형 | 설명 | 저장 경로 | 필수 여부 |
|------|------|----------|----------|
| **Screenshot** | 각 단계별 화면 캡처 | `.dev-team/evidence/screenshots/` | 필수 |
| **Video** | 전체 테스트 세션 녹화 | `.dev-team/evidence/videos/` | 선택 |
| **Console Log** | 브라우저 콘솔 로그 | `.dev-team/evidence/logs/console/` | 필수 |
| **Network Log** | HTTP 요청/응답 로그 | `.dev-team/evidence/logs/network/` | 선택 |
| **Accessibility Tree** | 스냅샷 JSON | `.dev-team/evidence/snapshots/` | 필수 |
| **Playwright Script** | 생성된 테스트 코드 | `.dev-team/evidence/scripts/` | 요청 시 |
| **Pipeline Log** | 실행 이벤트 로그 | `.dev-team/pipeline-log.jsonl` | 필수 |

### Evidence 수집 프로세스

```typescript
interface EvidenceCollector {
  // 1. 테스트 세션 시작 시
  startSession(scenarioId: string): void;
  
  // 2. 각 단계별 증거 수집
  captureStep(stepIndex: number, action: string): Evidence;
  
  // 3. Self-healing 발생 시
  recordSelfHealing(event: SelfHealingEvent): void;
  
  // 4. 테스트 완료 시
  finalizeSession(result: TestResult): EvidenceReport;
}

interface Evidence {
  id: string;              // evidence-20260225-001-step-03
  timestamp: string;
  type: 'screenshot' | 'video' | 'log' | 'snapshot';
  path: string;
  metadata: {
    scenarioId: string;
    stepIndex: number;
    action: string;
    url: string;
    duration?: number;
  };
}

interface EvidenceReport {
  sessionId: string;
  scenarioId: string;
  startedAt: string;
  completedAt: string;
  status: 'passed' | 'failed';
  evidence: Evidence[];
  summary: {
    totalSteps: number;
    capturedEvidence: number;
    selfHealingEvents: number;
  };
}
```

### 단계별 필수 Evidence

```typescript
async function executeStepWithEvidence(
  step: TestStep,
  collector: EvidenceCollector
): Promise<StepResult> {
  const stepIndex = step.index;
  const evidence: Evidence[] = [];
  
  try {
    // 1. 액션 수행 전 스냅샷
    const beforeSnapshot = await openclaw.browser.snapshot();
    evidence.push({
      id: `evidence-${sessionId}-step-${stepIndex}-before`,
      timestamp: new Date().toISOString(),
      type: 'snapshot',
      path: `.dev-team/evidence/snapshots/${scenarioId}-step${stepIndex}-before.json`,
      metadata: { scenarioId, stepIndex, action: step.action, url: page.url() }
    });
    
    // 2. 액션 수행
    await executeAction(step);
    
    // 3. 액션 수행 후 스크린샷 (필수)
    const screenshot = await openclaw.browser.screenshot({
      path: `.dev-team/evidence/screenshots/${scenarioId}-step${stepIndex}.png`,
      fullPage: true
    });
    evidence.push({
      id: `evidence-${sessionId}-step-${stepIndex}-screenshot`,
      timestamp: new Date().toISOString(),
      type: 'screenshot',
      path: screenshot,
      metadata: { scenarioId, stepIndex, action: step.action, url: page.url() }
    });
    
    // 4. 콘솔 로그 수집 (필수)
    const consoleLogs = await collectConsoleLogs();
    await fs.writeFile(
      `.dev-team/evidence/logs/console/${scenarioId}-step${stepIndex}.json`,
      JSON.stringify(consoleLogs, null, 2)
    );
    
    // 5. Pipeline Log 이벤트 기록
    logEvent({
      event: 'evidence:captured',
      scenarioId,
      stepIndex,
      evidenceCount: evidence.length
    });
    
    return { status: 'passed', evidence };
    
  } catch (error) {
    // 실패 시 추가 증거 수집
    const errorScreenshot = await openclaw.browser.screenshot({
      path: `.dev-team/evidence/screenshots/${scenarioId}-step${stepIndex}-ERROR.png`,
      fullPage: true
    });
    evidence.push({
      id: `evidence-${sessionId}-step-${stepIndex}-error`,
      timestamp: new Date().toISOString(),
      type: 'screenshot',
      path: errorScreenshot,
      metadata: { 
        scenarioId, 
        stepIndex, 
        action: step.action, 
        url: page.url(),
        error: error.message
      }
    });
    
    return { status: 'failed', error: error.message, evidence };
  }
}
```

### Evidence 네이밍 컨벤션

```
.dev-team/evidence/
├── screenshots/
│   ├── {scenarioId}-step{N}.png          # 정상 단계
│   ├── {scenarioId}-step{N}-ERROR.png     # 실패 시
│   └── {scenarioId}-final.png             # 최종 상태
├── videos/
│   └── {scenarioId}-{timestamp}.webm
├── logs/
│   ├── console/
│   │   └── {scenarioId}-step{N}.json
│   └── network/
│       └── {scenarioId}-har.json
├── snapshots/
│   ├── {scenarioId}-initial.json
│   └── {scenarioId}-step{N}.json
└── reports/
    └── {scenarioId}-evidence-report.md
```

### Evidence 검증 체크리스트

각 시나리오 완료 시 다음을 확인:

- [ ] **Screenshots**: 모든 단계의 스크린샷 존재
- [ ] **Console Logs**: 에러/경고 로그 없음 (또는 기록됨)
- [ ] **Accessibility Snapshots**: 초기/최종 스냅샷 존재
- [ ] **Pipeline Events**: `evidence:captured` 이벤트 기록됨
- [ ] **Evidence Report**: Markdown 리포트 생성됨
- [ ] **Failed Steps**: 실패 시 ERROR 스크린샷 존재

### Evidence Report 형식

```markdown
# Evidence Report: {scenarioId}

## 메타데이터
- **시작 시간**: 2026-02-25T10:15:00Z
- **완료 시간**: 2026-02-25T10:15:45Z
- **상태**: PASSED
- **총 단계**: 5

## 수집된 Evidence

### Step 1: 로그인 페이지 이동
- Screenshot: [step1.png](./screenshots/login-step1.png)
- Snapshot: [step1.json](./snapshots/login-step1.json)
- Console: [step1.json](./logs/console/login-step1.json)

### Step 2: 이메일 입력
- Screenshot: [step2.png](./screenshots/login-step2.png)
- Self-healing: `.email-input` → `@e3` (성공)

## 통계
- 총 Evidence: 15개
- Self-healing 발생: 1회
- 스크린샷: 6개
- 로그 파일: 5개
```

## 설정

```json
{
  "openclawTester": {
    "defaultMode": "hybrid",
    "parallelism": 4,
    "timeout": 120000,
    "captureScreenshots": true,
    "captureVideo": false,
    "generatePlaywrightScript": true,
    "outputDir": ".dev-team/test-output"
  }
}
```

## 에러 처리

| 상황 | 처리 |
|------|------|
| Snapshot 생성 실패 | 페이지 로드 재시도 (최대 3회) |
| 요소 찾기 실패 | Self-healing 시도 |
| Self-healing 실패 | 시나리오 failed 표시, 계속 진행 |
| 병렬 실행 타임아웃 | 개별 에이전트 취소, 결과 취합 |
| Playwright 생성 실패 | 원본 자연어 유지, 경고 로그 |

## 참고

- [Review Squad Leader](../review-squad/SKILL.md)
- [QA Tester Skill](../qa-tester/SKILL.md)
- [Research: Staging Test with OpenClaw](../../research/staging-test-with-openclaw.md)
- OpenClaw Browser: https://docs.openclaw.ai/tools/browser
- Agent Browser: https://github.com/vercel-labs/agent-browser
- Pipeline Log Format: ../pipeline-log-format.md
