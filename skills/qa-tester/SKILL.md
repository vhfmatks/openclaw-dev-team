---
name: dev-team:review-qa-tester
description: |
  Review Squad의 QA 테스터 담당. OpenClaw가 Human처럼 직접 테스트를 수행한다.
  Browser 테스트(화면 직접 조작), CLI 테스트(명령어 실행)를 지원하며,
  Staging 환경에서 실제 사용자 경험을 시뮬레이션한다.
  
  트리거: Review Squad Leader가 Full 모드에서 호출
---

# Dev Team QA Tester

## 개요

QA Tester는 Review Squad의 실제 테스트 수행자 역할을 한다. OpenClaw의 
Browser 자동화 기능과 CLI 실행 기능을 사용하여 Human처럼 직접 테스트를 수행한다.
단순한 assertion 테스트가 아닌, 실제 사용자 시나리오를 시뮬레이션한다.

## 역할

1. **Human-like 테스트**: 실제 사용자처럼 화면을 조작하고 테스트
2. **Browser 테스트**: Frontend UI를 직접 열어서 기능 테스트
3. **CLI 테스트**: Backend/API를 명령어로 실행하며 기능 테스트
4. **Background 모니터링**: Frontend/Backend 로그를 실시간 확인
5. **증거 수집**: 스크린샷, 로그 등 테스트 증거 확보

## 입력

```typescript
interface QATesterInput {
  execution: ExecutionSquadOutput;
  context: {
    projectRoot: string;
    projectType: string;
    hasFrontend: boolean;
    hasBackend: boolean;
    testCommands: string[];
  };
  testScenarios: ValidationCriteria[];  // Plan Squad에서 정의
  config?: {
    frontendUrl?: string;      // 예: http://localhost:3000
    backendUrl?: string;       // 예: http://localhost:8000
    timeout?: number;          // 기본 120000ms
    captureScreenshots?: boolean;
  };
}
```

## 출력

```json
{
  "status": "passed|failed|partial",
  "testType": "browser|cli|both",
  "scenarios": [
    {
      "name": "로그인 기능 테스트",
      "description": "사용자가 이메일로 로그인할 수 있는지 확인",
      "steps": [
        "로그인 페이지로 이동",
        "이메일 입력: test@example.com",
        "비밀번호 입력: ****",
        "로그인 버튼 클릭",
        "대시보드 페이지로 이동 확인"
      ],
      "status": "passed",
      "evidence": "screenshots/login-test-01.png",
      "duration": 5200
    }
  ],
  "screenshots": [
    "screenshots/qa-test-001.png",
    "screenshots/qa-test-002.png"
  ],
  "logs": [
    "[Frontend] Server started on port 3000",
    "[Backend] API ready at http://localhost:8000"
  ],
  "summary": {
    "total": 5,
    "passed": 4,
    "failed": 1,
    "skipped": 0
  },
  "environment": {
    "frontendUrl": "http://localhost:3000",
    "backendUrl": "http://localhost:8000",
    "cliCommand": "npm run dev"
  }
}
```

## 테스트 유형

### Browser 테스트 (Frontend)

OpenClaw Browser를 사용하여 실제 화면을 조작:

```typescript
async function runBrowserTest(input: QATesterInput): Promise<QATesterResult> {
  const scenarios: QAScenarioResult[] = [];
  const screenshots: string[] = [];
  const logs: string[] = [];
  
  // 1. Frontend 서버 시작 (background)
  const frontendProcess = await startFrontend(input.context.projectRoot);
  logs.push(`[Frontend] Server started on port 3000`);
  
  // 2. Browser 열기 (OpenClaw Browser 사용)
  const browser = await openclaw.browser.launch({
    headless: false,  // Human-like testing
    recordVideo: true
  });
  
  // 3. 각 시나리오 테스트
  for (const scenario of input.testScenarios) {
    const result = await executeBrowserScenario(browser, scenario, {
      screenshots,
      logs
    });
    scenarios.push(result);
  }
  
  // 4. 정리
  await browser.close();
  frontendProcess.kill();
  
  return {
    status: calculateStatus(scenarios),
    testType: 'browser',
    scenarios,
    screenshots,
    logs,
    summary: calculateSummary(scenarios)
  };
}
```

### CLI 테스트 (Backend/API)

명령어를 직접 실행하며 테스트:

```typescript
async function runCLITest(input: QATesterInput): Promise<QATesterResult> {
  const scenarios: QAScenarioResult[] = [];
  const logs: string[] = [];
  
  // 1. Backend 서버 시작 (background)
  const backendProcess = await startBackend(input.context.projectRoot);
  logs.push(`[Backend] API ready at http://localhost:8000`);
  
  // 2. 로그 모니터링 시작
  const logMonitor = monitorLogs(backendProcess, logs);
  
  // 3. 각 시나리오 테스트
  for (const scenario of input.testScenarios) {
    const result = await executeCLIScenario(scenario, {
      projectRoot: input.context.projectRoot,
      logs
    });
    scenarios.push(result);
  }
  
  // 4. 정리
  logMonitor.stop();
  backendProcess.kill();
  
  return {
    status: calculateStatus(scenarios),
    testType: 'cli',
    scenarios,
    screenshots: [],
    logs,
    summary: calculateSummary(scenarios)
  };
}
```

### Hybrid 테스트 (Frontend + Backend)

```typescript
async function runHybridTest(input: QATesterInput): Promise<QATesterResult> {
  // 병렬로 Frontend/Backend 시작
  const [frontendProcess, backendProcess] = await Promise.all([
    startFrontend(input.context.projectRoot),
    startBackend(input.context.projectRoot)
  ]);
  
  // Browser 테스트 수행하면서 Backend 로그도 모니터링
  // ...
}
```

## Human-like 테스트 원칙

### 1. 실제 사용자 관점

```typescript
// Wrong: 기계적인 assertion
await expect(page.locator('#login-button')).toBeVisible();

// Right: Human-like 시나리오
await page.goto('http://localhost:3000/login');
await page.fill('#email', 'user@example.com');
await page.fill('#password', 'securepassword');
await page.click('#login-button');
await page.waitForURL('**/dashboard');
// "사용자가 로그인 후 대시보드로 이동하는지 확인"
```

### 2. 실제 데이터 사용

```typescript
// 테스트용 더미 데이터 대신 실제 같은 데이터
const testUser = {
  email: 'john.doe@example.com',
  name: 'John Doe',
  // 실제 사용자가 입력할 법한 데이터
};
```

### 3. 에러 상황도 테스트

```typescript
// 정상 케이스뿐만 아니라
await testSuccessfulLogin();

// 에러 케이스도 테스트
await testInvalidCredentials();
await testNetworkError();
await testValidationError();
```

### 4. 실시간 로그 확인

```typescript
// Background 프로세스의 로그를 실시간 확인
backendProcess.on('data', (log) => {
  logs.push(`[Backend] ${log}`);
  
  // 에러 로그 감지
  if (log.includes('ERROR') || log.includes('Exception')) {
    console.warn('Backend error detected:', log);
  }
});
```

## 테스트 시나리오 실행

### Browser 시나리오

```typescript
async function executeBrowserScenario(
  browser: Browser,
  scenario: ValidationCriteria,
  context: { screenshots: string[]; logs: string[] }
): Promise<QAScenarioResult> {
  const startTime = Date.now();
  const steps: string[] = [];
  
  try {
    const page = await browser.newPage();
    
    // 시나리오 타입별 실행
    switch (scenario.type) {
      case 'functional':
        await executeFunctionalTest(page, scenario, steps);
        break;
      case 'visual':
        await executeVisualTest(page, scenario, steps, context.screenshots);
        break;
      case 'performance':
        await executePerformanceTest(page, scenario, steps);
        break;
    }
    
    // 스크린샷 캡처
    const screenshot = await captureScreenshot(page, scenario.scenario);
    context.screenshots.push(screenshot);
    
    await page.close();
    
    return {
      name: scenario.scenario,
      description: scenario.expected,
      steps,
      status: 'passed',
      evidence: screenshot,
      duration: Date.now() - startTime
    };
    
  } catch (error) {
    return {
      name: scenario.scenario,
      description: scenario.expected,
      steps,
      status: 'failed',
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}
```

### CLI 시나리오

```typescript
async function executeCLIScenario(
  scenario: ValidationCriteria,
  context: { projectRoot: string; logs: string[] }
): Promise<QAScenarioResult> {
  const startTime = Date.now();
  const steps: string[] = [];
  
  try {
    // API 요청 테스트
    if (scenario.scenario.includes('API')) {
      const response = await testAPIEndpoint(scenario, context);
      steps.push(`API 호출: ${scenario.scenario}`);
      steps.push(`응답 상태: ${response.status}`);
      steps.push(`응답 시간: ${response.duration}ms`);
    }
    
    // CLI 명령어 테스트
    if (scenario.scenario.includes('CLI')) {
      const output = await executeCLICommand(scenario, context);
      steps.push(`명령어 실행: ${scenario.scenario}`);
      steps.push(`출력: ${output.substring(0, 200)}...`);
    }
    
    return {
      name: scenario.scenario,
      description: scenario.expected,
      steps,
      status: 'passed',
      duration: Date.now() - startTime
    };
    
  } catch (error) {
    return {
      name: scenario.scenario,
      description: scenario.expected,
      steps,
      status: 'failed',
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}
```

## 서버 시작/종료

### Frontend 서버

```typescript
async function startFrontend(projectRoot: string): Promise<ChildProcess> {
  // package.json에서 시작 명령어 감지
  const startCommand = detectFrontendCommand(projectRoot);
  // 예: "npm run dev", "yarn start", "pnpm dev"
  
  const process = spawn(startCommand, {
    cwd: projectRoot,
    shell: true,
    detached: true
  });
  
  // 서버 준비 대기
  await waitForServer('http://localhost:3000', 30000);
  
  return process;
}
```

### Backend 서버

```typescript
async function startBackend(projectRoot: string): Promise<ChildProcess> {
  const startCommand = detectBackendCommand(projectRoot);
  // 예: "npm run server", "python main.py", "go run ."
  
  const process = spawn(startCommand, {
    cwd: projectRoot,
    shell: true,
    detached: true
  });
  
  // 서버 준비 대기
  await waitForServer('http://localhost:8000/health', 30000);
  
  return process;
}
```

## 스크린샷 캡처

```typescript
async function captureScreenshot(page: Page, scenarioName: string): Promise<string> {
  const timestamp = Date.now();
  const safeName = scenarioName.toLowerCase().replace(/\s+/g, '-');
  const path = `.dev-team/screenshots/qa-${safeName}-${timestamp}.png`;
  
  await page.screenshot({
    path,
    fullPage: true
  });
  
  return path;
}
```

## 로그 모니터링

```typescript
function monitorLogs(process: ChildProcess, logs: string[]): { stop: () => void } {
  const handlers = {
    stdout: (data: Buffer) => logs.push(`[stdout] ${data.toString()}`),
    stderr: (data: Buffer) => logs.push(`[stderr] ${data.toString()}`)
  };
  
  process.stdout?.on('data', handlers.stdout);
  process.stderr?.on('data', handlers.stderr);
  
  return {
    stop: () => {
      process.stdout?.off('data', handlers.stdout);
      process.stderr?.off('data', handlers.stderr);
    }
  };
}
```

## 에러 처리

| 상황 | 처리 |
|------|------|
| 서버 시작 실패 | timeout 후 failed 반환, 로그 포함 |
| Browser 크래시 | 시나리오 failed, 재시도 옵션 제공 |
| 타임아웃 | 현재 상태 스크린샷, failed 반환 |
| 네트워크 에러 | logs에 기록, 재시도 |

## Pipeline Logging

```bash
# QA 테스트 시작
echo '{"event":"qa:start","testType":"browser","scenarios":5}' >> .dev-team/pipeline-log.jsonl

# 서버 시작
echo '{"event":"qa:server","type":"frontend","url":"http://localhost:3000"}' >> .dev-team/pipeline-log.jsonl

# 시나리오 결과
echo '{"event":"qa:scenario","name":"로그인 테스트","status":"passed","duration":5200}' >> .dev-team/pipeline-log.jsonl

# 스크린샷
echo '{"event":"qa:screenshot","path":"screenshots/qa-login-01.png"}' >> .dev-team/pipeline-log.jsonl

# QA 테스트 완료
echo '{"event":"qa:result","status":"passed","passed":4,"failed":1,"skipped":0}' >> .dev-team/pipeline-log.jsonl
#BH|```

#XX|

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

**Self-healing 원리:**
- 버튼의 class가 `btn-primary`에서 `button-main`으로 변경되어도
- 접근성 트리는 여전히 "Submit" 버튼으로 식별
- `@e1` ref로 동일 요소 클릭 가능

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
# OpenClaw Snapshot 생성
echo '{"event":"openclaw:snapshot","url":"https://staging.myapp.com","refs":15}' >> .dev-team/pipeline-log.jsonl

# Self-healing 이벤트
echo '{"event":"openclaw:selfhealing","original":".btn-primary","healed":"@e2","success":true}' >> .dev-team/pipeline-log.jsonl

# 자연어 → Playwright 변환
echo '{"event":"openclaw:nlp2code","scenario":"login-flow","lines":12}' >> .dev-team/pipeline-log.jsonl

# 병렬 실행
echo '{"event":"openclaw:parallel","agents":4,"scenarios":8}' >> .dev-team/pipeline-log.jsonl
```

#KS|- [ ] Accessibility Tree 스냅샷 생성됨
#NK|- [ ] Self-healing 이벤트 기록됨
#XW|- [ ] 병렬 실행 결과 취합됨
#HX|- [ ] Playwright 스크립트 생성됨 (요청 시)

## Evidence 수집 (필수)

모든 테스트 단계에서 **증거(Evidence)**를 체계적으로 수집합니다.

### 필수 Evidence

| 유형 | 설명 | 저장 경로 |
|------|------|----------|
| Screenshot | 각 단계별 화면 캡처 | `.dev-team/evidence/screenshots/` |
| Console Log | 브라우저 콘솔 로그 | `.dev-team/evidence/logs/console/` |
| Accessibility Tree | 스냅샷 JSON | `.dev-team/evidence/snapshots/` |
| Pipeline Log | 실행 이벤트 | `.dev-team/pipeline-log.jsonl` |

### Evidence 수집 패턴

```typescript
async function captureStepEvidence(
  scenarioId: string,
  stepIndex: number,
  action: string
): Promise<void> {
  const baseName = `${scenarioId}-step${stepIndex}`;
  
  // 1. 스크린샷 (필수)
  await openclaw.browser.screenshot({
    path: `.dev-team/evidence/screenshots/${baseName}.png`,
    fullPage: true
  });
  
  // 2. Console 로그 (필수)
  const logs = await collectConsoleLogs();
  await fs.writeFile(
    `.dev-team/evidence/logs/console/${baseName}.json`,
    JSON.stringify(logs, null, 2)
  );
  
  // 3. Pipeline Log 이벤트
  logEvent({
    event: 'evidence:captured',
    scenarioId,
    stepIndex,
    evidenceType: ['screenshot', 'console'] 
  });
}
```

### 실패 시 추가 Evidence

```typescript
async function captureFailureEvidence(
  scenarioId: string,
  stepIndex: number,
  error: Error
): Promise<void> {
  // ERROR 스크린샷
  await openclaw.browser.screenshot({
    path: `.dev-team/evidence/screenshots/${scenarioId}-step${stepIndex}-ERROR.png`,
    fullPage: true
  });
  
  // 에러 로그
  logEvent({
    event: 'evidence:failure',
    scenarioId,
    stepIndex,
    error: error.message,
    timestamp: new Date().toISOString()
  });
}
```

### Evidence 검증 체크리스트

- [ ] 모든 단계의 스크린샷 존재
- [ ] 실패 시 ERROR 스크린샷 존재
- [ ] Console 로그에 에러 없음 (또는 기록됨)
- [ ] `evidence:captured` 이벤트 기록됨
- [ ] Evidence Report 생성됨
