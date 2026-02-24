---
name: dev-team:validation-validator
description: |
  [DEPRECATED] 이 스킬은 Review Squad의 QA Tester로 통합되었습니다.
  새로운 프로젝트에서는 `dev-team:review-qa-tester`를 사용하세요.
  
  이 문서는 참조용으로 유지됩니다.
  
  트리거: 사용되지 않음 (Orchestrator가 Review Squad 호출)
---

# Dev Team Validator (DEPRECATED)

## 상태: DEPRECATED

> ⚠️ **이 스킬은 더 이상 사용되지 않습니다.**
>
> 새로운 Review Squad 구조에서는 `dev-team:review-qa-tester`가 이 역할을 수행합니다.
>
> 마이그레이션: `dev-team:validation-validator` → `dev-team:review-qa-tester`

## 변경 사항

| 기존 (Validator) | 새로운 (Review Squad) |
|------------------|----------------------|
| 단일 에이전트 | Review Squad 팀 구조 |
| Playwright만 | OpenClaw Browser + CLI |
| 자동화된 테스트 | Human-like 테스트 |
| 독립 실행 | Reviewer + QA + Final Approver |

## 참고

- [QA Tester Skill](../qa-tester/SKILL.md) - 새로운 Human-like QA 테스터
- [Review Squad Leader](../review-squad/SKILL.md) - Review Squad 리더
- [Reviewer Skill](../reviewer/SKILL.md) - 요구사항 검수자
- [Final Approver Skill](../final-approver/SKILL.md) - 최종 승인자

---

*아래는 참조용 원본 문서입니다.*

---

## 개요

Validator는 Executor가 작성한 코드가 올바르게 동작하는지 검증합니다.
OpenClaw의 브라우저 자동화 기능(Playwright)을 활용합니다.

## 역할

1. **개발 서버 시작**: 로컬 개발 환경 구동
2. **브라우저 테스트**: 자동화된 UI 테스트 수행
3. **스크린샷 캡처**: 테스트 결과 시각화
4. **보고서 생성**: 검증 결과 문서화

## 입력

```typescript
interface ValidatorInput {
  executionOutput: ExecutorOutput;  // Executor의 출력
  testScenarios: TestScenario[];    // 테스트 시나리오
  config: {
    devServerCommand: string;       // 예: "npm run dev"
    devServerUrl: string;           // 예: "http://localhost:3000"
    timeout: number;                // 밀리초
    captureScreenshots: boolean;
  };
}

interface TestScenario {
  id: string;
  name: string;
  steps: TestStep[];
  expectedOutcome: string;
}

interface TestStep {
  action: 'navigate' | 'click' | 'fill' | 'wait' | 'assert' | 'screenshot';
  target?: string;      // CSS selector
  value?: string;       // 입력값 등
  timeout?: number;
}
```

## 출력

```typescript
interface ValidatorOutput {
  status: 'passed' | 'failed' | 'partial';
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  scenarios: ScenarioResult[];
  screenshots: string[];
  consoleErrors: ConsoleError[];
  reportFile: string;
}

interface ScenarioResult {
  scenarioId: string;
  status: 'passed' | 'failed';
  duration: number;
  steps: StepResult[];
  error?: string;
}
```

## 테스트 프로세스

### Step 1: 환경 준비
```typescript
// 개발 서버 시작
async function startDevServer(command: string): Promise<string> {
  const process = spawn(command, { shell: true });
  
  // 서버 준비 대기
  await waitForServer(url, timeout);
  
  return url;
}
```

### Step 2: 브라우저 실행
```typescript
import { chromium } from 'playwright';

async function launchBrowser() {
  const browser = await chromium.launch({ 
    headless: true 
  });
  
  const page = await browser.newPage();
  
  // 콘솔 에러 수집
  const errors: ConsoleError[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push({
        message: msg.text(),
        timestamp: Date.now()
      });
    }
  });
  
  return { browser, page, errors };
}
```

### Step 3: 테스트 시나리오 실행
```typescript
async function runScenario(
  page: Page, 
  scenario: TestScenario
): Promise<ScenarioResult> {
  const startTime = Date.now();
  const steps: StepResult[] = [];
  
  for (const step of scenario.steps) {
    try {
      await executeStep(page, step);
      steps.push({ status: 'passed', step });
    } catch (error) {
      steps.push({ status: 'failed', step, error: error.message });
      return {
        scenarioId: scenario.id,
        status: 'failed',
        duration: Date.now() - startTime,
        steps,
        error: error.message
      };
    }
  }
  
  return {
    scenarioId: scenario.id,
    status: 'passed',
    duration: Date.now() - startTime,
    steps
  };
}
```

### Step 4: 스크린샷 캡처
```typescript
async function captureScreenshots(
  page: Page, 
  scenarios: string[]
): Promise<string[]> {
  const screenshots: string[] = [];
  
  for (const scenario of scenarios) {
    const path = `.dev-team/screenshots/${scenario}-${Date.now()}.png`;
    await page.screenshot({ 
      path, 
      fullPage: true 
    });
    screenshots.push(path);
  }
  
  return screenshots;
}
```

### Step 5: 정리 및 보고
```typescript
async function cleanup(browser: Browser, devServer: ChildProcess) {
  await browser.close();
  devServer.kill();
}

async function generateReport(output: ValidatorOutput): Promise<string> {
  const reportPath = `.dev-team/reports/${Date.now()}-validation.md`;
  
  const content = formatReport(output);
  await writeFile(reportPath, content);
  
  return reportPath;
}
```

## 테스트 스텝 실행

### navigate
```typescript
case 'navigate':
  await page.goto(value, { waitUntil: 'networkidle' });
  break;
```

### click
```typescript
case 'click':
  await page.click(target);
  break;
```

### fill
```typescript
case 'fill':
  await page.fill(target, value);
  break;
```

### wait
```typescript
case 'wait':
  if (target) {
    await page.waitForSelector(target, { timeout });
  } else {
    await page.waitForTimeout(value || 1000);
  }
  break;
```

### assert
```typescript
case 'assert':
  const element = await page.$(target);
  const text = await element.textContent();
  if (!text.includes(value)) {
    throw new Error(`Assertion failed: "${text}" does not contain "${value}"`);
  }
  break;
```

### screenshot
```typescript
case 'screenshot':
  await page.screenshot({ 
    path: `.dev-team/screenshots/step-${Date.now()}.png` 
  });
  break;
```

## 기본 테스트 시나리오

### 페이지 로드 테스트
```typescript
const loadTestScenario: TestScenario = {
  id: 'page-load',
  name: 'Page Load Test',
  steps: [
    { action: 'navigate', value: 'http://localhost:3000' },
    { action: 'wait', target: 'body', timeout: 5000 },
    { action: 'screenshot' }
  ],
  expectedOutcome: 'Page loads without errors'
};
```

### 기본 상호작용 테스트
```typescript
const interactionScenario: TestScenario = {
  id: 'basic-interaction',
  name: 'Basic Interaction Test',
  steps: [
    { action: 'navigate', value: 'http://localhost:3000' },
    { action: 'wait', target: 'button', timeout: 3000 },
    { action: 'click', target: 'button' },
    { action: 'wait', timeout: 1000 },
    { action: 'screenshot' }
  ],
  expectedOutcome: 'Button click triggers expected action'
};
```

## 보고서 형식

```markdown
# 검증 보고서

## 요약
- **상태**: ✅ PASSED / ❌ FAILED
- **총 시나리오**: 5
- **통과**: 4
- **실패**: 1
- **건너뜀**: 0
- **실행 시간**: 45초

## 시나리오 결과

### ✅ page-load (PASSED)
- **소요 시간**: 3.2초
- **단계**: 3/3 통과

### ✅ basic-interaction (PASSED)
- **소요 시간**: 2.1초
- **단계**: 5/5 통과

### ❌ form-submission (FAILED)
- **소요 시간**: 5.0초
- **실패 원인**: 폼 제출 후 응답 없음
- **실패 단계**: Step 4 (assert)

## 콘솔 에러
| 시간 | 메시지 |
|------|--------|
| 10:00:05 | Uncaught TypeError: ... |

## 스크린샷
- [초기 로드](screenshots/page-load-01.png)
- [상호작용 후](screenshots/interaction-01.png)
- [폼 제출 실패](screenshots/form-fail-01.png)

## 권장 사항
1. 폼 제출 핸들러 확인 필요
2. 에러 바운더리 추가 권장
```

## 에러 처리

### 서버 시작 실패
```typescript
if (!await waitForServer(url, timeout)) {
  return {
    status: 'failed',
    error: 'Dev server failed to start',
    ...
  };
}
```

### 타임아웃
```typescript
try {
  await page.waitForSelector(target, { timeout });
} catch (error) {
  if (error.name === 'TimeoutError') {
    // 스크린샷 캡처 후 실패 보고
    await captureErrorScreenshot(page, 'timeout');
    throw new Error(`Timeout waiting for: ${target}`);
  }
}
```

### 브라우저 크래시
```typescript
browser.on('disconnected', () => {
  // 복구 시도
  if (!testsCompleted) {
    return {
      status: 'failed',
      error: 'Browser crashed during testing',
      ...
    };
  }
});
```

## 설정

```json
{
  "validation": {
    "devServerCommand": "npm run dev",
    "devServerUrl": "http://localhost:3000",
    "timeout": 30000,
    "captureScreenshots": true,
    "screenshotOnFailure": true,
    "collectConsoleErrors": true
  }
}
```

## 품질 기준

테스트 통과 조건:

- [ ] 모든 시나리오 passed
- [ ] 콘솔 에러 0개
- [ ] 스크린샷 캡처 완료
- [ ] 보고서 생성됨

## Pipeline Logging (필수)

Validator는 모든 **테스트 결과**를 pipeline-log.jsonl에 기록해야 합니다.

### 시작 시

```bash
echo '{"ts":"'$(date -Iseconds)'","event":"phase:enter","phase":"validation","agent":"dev-team:validation-validator"}' >> .dev-team/pipeline-log.jsonl
```

### 테스트 시나리오 결과

```bash
log_test() {
  echo '{"ts":"'$(date -Iseconds)'","event":"test:'$1'","scenario":"'$2'","duration":'$3'}' >> .dev-team/pipeline-log.jsonl
}

# 테스트 통과
log_test "passed" "page-load" 3200

# 테스트 실패
log_test "failed" "form-submission" 5000
```

### 스크린샷 캡처

```bash
echo '{"ts":"'$(date -Iseconds)'","event":"screenshot","path":"screenshots/page-load-01.png"}' >> .dev-team/pipeline-log.jsonl
```

### 완료 시

```bash
echo '{"ts":"'$(date -Iseconds)'","event":"phase:complete","phase":"validation","status":"passed","passed":4,"failed":1,"report":"reports/validation-report.md"}' >> .dev-team/pipeline-log.jsonl
```

## 참고

- Playwright API: https://playwright.dev/docs/api/class-page
- OpenClaw Browser: https://docs.openclaw.ai/tools/browser
