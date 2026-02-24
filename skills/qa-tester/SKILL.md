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
```

## 품질 체크리스트

- [ ] 서버가 올바르게 시작됨
- [ ] Browser가 열리고 페이지가 로드됨
- [ ] 모든 시나리오가 실행됨
- [ ] 스크린샷이 캡처됨
- [ ] 로그가 수집됨
- [ ] 서버가 정상적으로 종료됨
- [ ] Pipeline Log가 기록됨

## 참고

- [Review Squad Leader](../review-squad/SKILL.md)
- [Reviewer Skill](../reviewer/SKILL.md)
- [Final Approver Skill](../final-approver/SKILL.md)
- OpenClaw Browser: https://docs.openclaw.ai/tools/browser
- Pipeline Log Format: ../pipeline-log-format.md
