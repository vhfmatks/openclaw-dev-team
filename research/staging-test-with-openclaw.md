# OpenClaw를 이용한 Staging Test 가이드

## 목차

1. [개요](#1-개요)
2. [OpenClaw란 무엇인가](#2-openclaw란-무엇인가)
3. [Browser Automation 핵심 개념](#3-browser-automation-핵심-개념)
4. [Human-like Testing 접근법](#4-human-like-testing-접근법)
5. [Staging Test 구축 가이드](#5-staging-test-구축-가이드)
6. [스킬 및 도구 활용](#6-스킬-및-도구-활용)
7. [실전 예제](#7-실전-예제)
8. [CI/CD 통합](#8-cicd-통합)
9. [비용 최적화](#9-비용-최적화)
10. [보안 고려사항](#10-보안-고려사항)
11. [참고 자료](#11-참고-자료)

---

## 1. 개요

### 1.1 연구 목적

이 문서는 OpenClaw를 활용하여 staging 환경에서 human-level의 테스트를 수행하는 방법에 대한 종합 가이드입니다. 전통적인 E2E 테스트 도구(Selenium, Cypress, Playwright)와 달리, OpenClaw는 AI 기반으로 웹 페이지를 이해하고 자연어로 테스트 시나리오를 작성할 수 있게 해줍니다.

### 1.2 핵심 가치

| 전통적 테스트 도구 | OpenClaw |
|---|---|
| CSS Selector 기반 요소 식별 | Accessibility Tree 기반 의미적 식별 |
| 코드로 테스트 작성 | 자연어로 테스트 시나리오 설명 |
| UI 변경 시 Selector 수정 필요 | Self-healing: UI 변경에도 동작 유지 |
| 결정적(Deterministic) 실행 | AI 추론 기반 적응적 실행 |
| 단일 목적 테스트 | 멀티 에이전트 오케스트레이션 가능 |

---

## 2. OpenClaw란 무엇인가

### 2.1 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                     Messaging Channels                          │
│    WhatsApp │ Telegram │ Slack │ Discord │ KakaoTalk          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Gateway Process                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Agent     │  │    Cron     │  │   State     │            │
│  │   Engine    │  │  Scheduler  │  │  Manager    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Execution Environment                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Browser   │  │    Nodes    │  │ Sub-Agents  │            │
│  │   Control   │  │  (Devices)  │  │  (Parallel) │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 주요 컴포넌트

| 컴포넌트 | 역할 | 테스트 활용 |
|---|---|---|
| **Gateway** | 통합 제어 평면 | 테스트 인프라 중앙 허브 |
| **Browser** | Chromium 기반 웹 자동화 | 웹앱 기능/UI 테스트 |
| **Nodes** | 디바이스 제어 (macOS/iOS/Android) | 크로스 플랫폼 테스트 |
| **Cron** | 스케줄링 엔진 | 예약 테스트 실행 |
| **Sub-agents** | 병렬 에이전트 실행 | 테스트 스위트 병렬화 |
| **Canvas** | 시각적 워크스페이스 | UI 회귀 테스트, 결과 대시보드 |

### 2.3 설치 및 설정

```bash
# 1. OpenClaw 설치
npm install -g openclaw

# 2. Gateway 초기화
openclaw onboard --install-daemon

# 3. Browser 활성화
openclaw config set browser.enabled true

# 4. Chromium 설치
npx playwright install chromium

# 5. 상태 확인
openclaw browser status
```

---

## 3. Browser Automation 핵심 개념

### 3.1 Snapshot과 Ref 시스템

OpenClaw의 핵심은 **접근성 트리(Accessibility Tree)** 기반의 요소 식별입니다. CSS Selector 대신 의미적 정보를 사용하여 UI 변경에 강건합니다.

```bash
# 스냅샷 생성 - 페이지의 모든 요소에 ref 할당
openclaw browser snapshot

# 상호작용 가능한 요소만 필터링
openclaw browser snapshot --interactive

# JSON 형식으로 출력 (파싱 용이)
openclaw browser snapshot --interactive --json
```

**Snapshot 출력 예시:**

```json
{
  "success": true,
  "data": {
    "snapshot": "page content...",
    "refs": {
      "e1": {"role": "heading", "name": "Welcome"},
      "e2": {"role": "button", "name": "Submit"},
      "e3": {"role": "textbox", "name": "Email"},
      "e4": {"role": "link", "name": "Learn More"}
    }
  }
}
```

### 3.2 Ref 기반 상호작용

```bash
# 요소 클릭
openclaw browser click @e2

# 텍스트 입력
openclaw browser type @e3 "test@example.com"

# 폼 채우기
openclaw browser fill @e3 "password123"

# 선택 박스
openclaw browser select @e5 "option-value"

# 체크박스
openclaw browser check @e6

# 호버
openclaw browser hover @e7

# 키 입력
openclaw browser press "Enter"
```

### 3.3 Wait 전략

비동기 UI 변경을 위한 다중 대기 전략:

```bash
# 복합 조건 대기
openclaw browser wait "#main" \
  --url "**/dashboard" \
  --load networkidle \
  --fn "window.ready===true" \
  --timeout-ms 15000

# 요소 대기
openclaw browser wait @e2

# 텍스트 대기
openclaw browser wait --text "Welcome"

# URL 패턴 대기
openclaw browser wait --url "**/dashboard"

# 네트워크 idle 대기
openclaw browser wait --load networkidle

# JavaScript 조건 대기
openclaw browser wait --fn "document.readyState === 'complete'"
```

### 3.4 상태 관리

```bash
# 쿠키 설정 (인증 세션 유지)
openclaw browser cookies set session abc123 --url "https://myapp.com"

# 인증 상태 저장
agent-browser state save auth.json

# 인증 상태 로드 (로그인 스킵)
agent-browser state load auth.json

# 로컬 스토리지
agent-browser storage local get key
agent-browser storage local set key value
```

### 3.5 디바이스 에뮬레이션

```bash
# 모바일 디바이스 에뮬레이션
openclaw browser set device "iPhone 14"
openclaw browser set device "iPad Pro"

# 지역 설정
openclaw browser set geo 37.7749 -122.4194   # San Francisco
openclaw browser set locale en-US
openclaw browser set timezone America/New_York

# 네트워크 조건
openclaw browser set offline on

# 커스텀 헤더
openclaw browser set headers --json '{"X-Debug":"1"}'
```

---

## 4. Human-like Testing 접근법

### 4.1 자연어 테스트 정의

OpenClaw의 핵심 강점은 자연어로 테스트 시나리오를 정의할 수 있다는 것입니다.

**예시: 로그인 플로우 테스트**

```
openclaw agent --message "Test the login flow in this order:
  1. Navigate to https://staging.myapp.com/login
  2. Enter test@example.com in the email field
  3. Enter password123 in the password field
  4. Click the login button
  5. Verify redirect to the dashboard URL
  6. Verify the welcome message is displayed on the dashboard
  Report results with screenshots."
```

**내부 실행 과정:**

```
browser open https://staging.myapp.com/login
browser snapshot --interactive
browser type <email-ref> "test@example.com"
browser type <password-ref> "password123"
browser click <submit-ref>
browser wait --url "**/dashboard" --timeout-ms 10000
browser snapshot
# → AI가 스냅샷 분석하여 대시보드 요소 검증
```

### 4.2 Self-Healing 특성

전통적 테스트:
```javascript
// 버튼 클래스가 변경되면 테스트 실패
await page.click('.btn-primary');  // ❌ 요소 없음
```

OpenClaw:
```bash
# 접근성 트리 기반이므로 UI 변경에도 동작
openclaw browser click @submit-button  # ✅ 여전히 동작
```

버튼의 class가 `btn-primary`에서 `button-main`으로 변경되어도, 접근성 트리는 여전히 "Submit" 버튼으로 식별합니다.

### 4.3 AI 기반 추론

```bash
# 복잡한 시나리오도 자연어로 정의
openclaw agent --message "
  Test the e-commerce checkout flow:
  1. Add any product to cart
  2. Go to checkout
  3. Fill in shipping information with a US address
  4. Select credit card payment
  5. Verify the order summary shows correct total
  6. Do NOT submit the order
  Take screenshots at each step."
```

---

## 5. Staging Test 구축 가이드

### 5.1 환경 구성

```json
// openclaw.json
{
  "browser": {
    "enabled": true,
    "mode": "managed",
    "headless": true,
    "defaultViewport": {
      "width": 1280,
      "height": 800
    }
  },
  "agents": {
    "defaults": {
      "model": "anthropic/claude-sonnet-4-5",
      "subagents": {
        "maxConcurrent": 8
      }
    }
  }
}
```

### 5.2 다중 환경 설정

```json
// openclaw.json - Staging/Production 분리
{
  "agents": {
    "list": [
      {
        "id": "staging-tester",
        "name": "Staging Tester",
        "workspace": "~/.openclaw/workspace-staging",
        "model": "anthropic/claude-sonnet-4-5"
      },
      {
        "id": "prod-tester",
        "name": "Production Tester",
        "workspace": "~/.openclaw/workspace-prod",
        "model": "anthropic/claude-opus-4-5"
      }
    ]
  },
  "bindings": [
    {
      "agentId": "staging-tester",
      "match": { "channel": "slack", "peer": { "kind": "channel", "id": "C_STAGING" } }
    },
    {
      "agentId": "prod-tester",
      "match": { "channel": "telegram" }
    }
  ]
}
```

### 5.3 스케줄된 테스트 (Cron)

#### Pattern 1: 일일 E2E 테스트

```bash
openclaw cron add \
  --name "Daily E2E Suite" \
  --cron "0 6 * * *" \
  --tz "Asia/Seoul" \
  --session isolated \
  --message "Run the full E2E test suite:
    1. Navigate to https://staging.myapp.com and check load time
    2. Verify the login flow
    3. Test core business logic
    4. Validate API responses
    5. Summarize results with screenshots" \
  --model "anthropic/claude-sonnet-4-5" \
  --deliver \
  --channel telegram \
  --to "DevTeam"
```

#### Pattern 2: 배포 후 스모크 테스트

```bash
openclaw cron add \
  --name "Post-Deploy Smoke" \
  --at "5m" \
  --session isolated \
  --message "Post-deployment smoke test:
    1. Verify health check endpoint response
    2. Confirm main page loads normally
    3. Check that login works" \
  --deliver \
  --channel slack \
  --to "channel:C_DEPLOYMENTS" \
  --delete-after-run
```

#### Pattern 3: 주간 심층 분석

```bash
openclaw cron add \
  --name "Weekly Deep Test" \
  --cron "0 2 * * 0" \
  --tz "Asia/Seoul" \
  --session isolated \
  --message "Weekly deep E2E test:
    1. Verify all user flows
    2. Collect performance metrics
    3. Run accessibility checks
    4. Verify cross-browser compatibility
    5. Analyze changes compared to last week" \
  --model "anthropic/claude-opus-4-5" \
  --thinking high \
  --deliver
```

### 5.4 병렬 테스트 실행 (Sub-Agents)

```
┌─────────────┐
│ Main Agent  │
└──────┬──────┘
       │
       ├──────────┬──────────┬──────────┬──────────┐
       ▼          ▼          ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│Sub-Agent │ │Sub-Agent │ │Sub-Agent │ │Sub-Agent │ │Sub-Agent │
│  Login   │ │ Payment  │ │ Search   │ │  Admin   │ │  Report  │
│  Tests   │ │  Tests   │ │  Tests   │ │  Panel   │ │    Gen   │
└────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
     │            │            │            │            │
     └────────────┴────────────┴────────────┴────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Aggregated      │
                    │ Results         │
                    └─────────────────┘
```

**병렬 실행 예시:**

```bash
# 메인 에이전트가 서브 에이전트들을 병렬로 실행
openclaw agent --message "
  Run the following test suites in parallel:
  1. Sub-agent A: Test all login-related flows
  2. Sub-agent B: Test payment and checkout flows
  3. Sub-agent C: Test search functionality
  4. Sub-agent D: Test admin panel operations
  
  Aggregate results and report overall pass/fail status."
```

---

## 6. 스킬 및 도구 활용

### 6.1 UI-Test 스킬

OpenClaw의 `ui-test` 스킬은 자연어로 테스트를 정의하고 Playwright 스크립트로 내보낼 수 있습니다.

**설치:**

```bash
npx playbooks add skill openclaw/skills --skill ui-test
```

**테스트 정의 및 실행:**

```bash
# 테스트 생성
node scripts/ui-test.js create "login-flow" https://staging.myapp.com/login

# 단계 추가
node scripts/ui-test.js add-step "login-flow" "Enter test@example.com in email field"
node scripts/ui-test.js add-step "login-flow" "Enter password123 in password field"
node scripts/ui-test.js add-step "login-flow" "Click the login button"
node scripts/ui-test.js add-step "login-flow" "Verify redirect to dashboard"

# 테스트 실행
openclaw agent --message "Run the 'login-flow' UI test and report results"

# Playwright 스크립트 내보내기
node scripts/ui-test.js export "login-flow" ./tests/login.spec.ts
```

**생성된 Playwright 스크립트 예시:**

```typescript
// tests/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://staging.myapp.com/login');
  });

  test('should login successfully', async ({ page }) => {
    // Enter test@example.com in email field
    await page.getByLabel('Email').fill('test@example.com');
    
    // Enter password123 in password field
    await page.getByLabel('Password').fill('password123');
    
    // Click the login button
    await page.getByRole('button', { name: 'Login' }).click();
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL(/dashboard/);
  });
});
```

### 6.2 Agent-Browser 스킬

CLI 기반 고속 브라우저 자동화:

**설치:**

```bash
npm install -g agent-browser
agent-browser install
```

**사용 예시:**

```bash
# 세션 격리
agent-browser --session admin open https://admin.staging.com
agent-browser --session admin state load admin-auth.json

agent-browser --session user open https://staging.com
agent-browser --session user state load user-auth.json

# 멀티 세션 테스트
agent-browser --session admin snapshot -i --json
agent-browser --session user snapshot -i --json
```

### 6.3 Playwright MCP 통합

Claude Code, Cursor 등에서 Playwright MCP를 통해 브라우저 제어:

**MCP 설정:**

```json
// mcp.json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-playwright"]
    }
  }
}
```

**테스트 생성 프롬프트:**

```markdown
## Instructions

You are a Playwright test generator and an expert in TypeScript, Frontend development, and Playwright end-to-end testing.

- You are given a scenario, and you need to generate a Playwright test for it.
- If you're asked to generate or create a Playwright test, use the tools provided by the Playwright MCP server to navigate the site and generate tests based on the current state and page snapshots.
- Do not generate tests based on assumptions. Use the Playwright MCP server to navigate and interact with sites.
- Access a new page snapshot before interacting with the page.
- Only after all steps are completed, emit a Playwright TypeScript test that uses @playwright/test based on the message history.
- When you generate the test code in the 'tests' directory, ALWAYS follow Playwright best practices.
- When the test is generated, always test and verify the generated code using `npx playwright test` and fix it if there are any issues.
```

---

## 7. 실전 예제

### 7.1 SaaS 대시보드 테스트

```bash
openclaw agent --message "
  Test the SaaS dashboard functionality:
  
  1. Navigate to https://staging.myapp.com
  2. Log in with credentials from environment
  3. Verify all dashboard widgets load correctly
  4. Check that charts render with data
  5. Test the notification bell shows unread count
  6. Verify user profile dropdown works
  7. Check the settings page loads
  
  For each step, take a screenshot.
  Report any issues or anomalies found."
```

### 7.2 크로스 디바이스 테스트

```bash
# 에뮬레이션 기반 테스트
openclaw browser set device "iPhone 14"
openclaw browser open https://staging.myapp.com
openclaw browser screenshot --full-page --output mobile-screenshot.png

openclaw browser set device "iPad Pro"
openclaw browser open https://staging.myapp.com
openclaw browser screenshot --full-page --output tablet-screenshot.png

# 실제 iOS 디바이스 (Node)
openclaw nodes canvas present --node "iPhone" --target https://staging.myapp.com
openclaw nodes canvas snapshot --node "iPhone" --format png
```

### 7.3 접근성 테스트

```bash
# 접근성 트리 스냅샷
openclaw browser snapshot --format aria

# AI 분석 요청
openclaw agent --message "
  Analyze the ARIA snapshot to:
  1. Find WCAG 2.1 AA violations
  2. Verify keyboard navigation support
  3. Check screen reader compatibility
  4. Provide improvement recommendations"
```

### 7.4 성능 모니터링

```bash
openclaw cron add \
  --name "Performance Monitor" \
  --cron "*/15 * * * *" \
  --session isolated \
  --message "Performance measurement:
    1. Navigate to the site and measure load time
    2. Check for console errors
    3. Inspect network request latency
    4. Run JS evaluation for Core Web Vitals
    Only report if issues are found." \
  --model "anthropic/claude-sonnet-4-5"
```

### 7.5 폼 자동화 테스트

```bash
openclaw agent --message "
  Test the registration form:
  1. Navigate to https://staging.myapp.com/register
  2. Test form validation:
     - Submit empty form, verify error messages
     - Enter invalid email, verify error
     - Enter weak password, verify strength indicator
     - Enter mismatched passwords, verify error
  3. Fill form with valid data
  4. Verify success redirect
  Take screenshots of each validation state."
```

---

## 8. CI/CD 통합

### 8.1 GitHub Actions

```yaml
# .github/workflows/staging-tests.yml
name: Staging E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC

jobs:
  staging-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install OpenClaw
        run: npm install -g openclaw
      
      - name: Install Playwright
        run: npx playwright install chromium --with-deps
      
      - name: Configure OpenClaw
        run: |
          openclaw config set browser.enabled true
          openclaw config set browser.headless true
      
      - name: Run Staging Tests
        env:
          OPENCLAW_API_KEY: ${{ secrets.OPENCLAW_API_KEY }}
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
        run: |
          openclaw agent --message "
            Run E2E tests on staging:
            1. Login to https://staging.myapp.com
            2. Test core user flows
            3. Report pass/fail with screenshots
          " --model "anthropic/claude-sonnet-4-5"
      
      - name: Upload Screenshots
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-screenshots
          path: ~/.openclaw/screenshots/
```

### 8.2 원격 브라우저 연결 (Browserless)

```json
// openclaw.json
{
  "browser": {
    "enabled": true,
    "defaultProfile": "browserless",
    "profiles": {
      "browserless": {
        "cdpUrl": "https://production-sfo.browserless.io?token=<API_KEY>"
      }
    }
  }
}
```

### 8.3 테스트 결과 알림

```bash
# Slack 알림
openclaw cron add \
  --name "Daily Tests" \
  --cron "0 6 * * *" \
  --session isolated \
  --message "Run daily E2E tests..." \
  --deliver \
  --channel slack \
  --to "channel:C_TEST_RESULTS"

# Telegram 알림
openclaw cron add \
  --name "Daily Tests" \
  --cron "0 6 * * *" \
  --session isolated \
  --message "Run daily E2E tests..." \
  --deliver \
  --channel telegram \
  --to "DevTeam"
```

---

## 9. 비용 최적화

### 9.1 모델 선택 전략

| 용도 | 추천 모델 | 이유 |
|---|---|---|
| 일일 루틴 테스트 | claude-sonnet-4-5 | 비용 효율적 |
| 심층 분석 | claude-opus-4-5 | 고급 추론 |
| 빠른 스모크 테스트 | claude-haiku | 최저 비용 |

### 9.2 병렬 실행 제한

```json
{
  "agents": {
    "defaults": {
      "subagents": {
        "maxConcurrent": 4  // 동시 실행 제한으로 비용 제어
      }
    }
  }
}
```

### 9.3 세션 격리 활용

```bash
# isolated 세션으로 메인 컨텍스트 오염 방지
openclaw cron add \
  --name "Test" \
  --session isolated \  # 중요: 격리된 세션 사용
  --message "..."
```

### 9.4 스마트 리포팅

```bash
# 이슈가 있을 때만 보고
openclaw agent --message "
  Run tests and only report if issues are found.
  If all tests pass, send a brief 'All OK' message."
```

---

## 10. 보안 고려사항

### 10.1 인증 정보 관리

```bash
# 환경 변수 사용
export TEST_USER_EMAIL="test@example.com"
export TEST_USER_PASSWORD="secure-password"

# OpenClaw 시크릿 스토리지
openclaw secrets set TEST_USER_PASSWORD "secure-password"
```

### 10.2 세션 격리

```bash
# 서로 다른 세션으로 격리
agent-browser --session admin state save admin-auth.json
agent-browser --session user state save user-auth.json
```

### 10.3 실행 권한 제한

```json
// openclaw.json
{
  "tools": {
    "exec": {
      "mode": "allowlist",  // 또는 "deny"
      "allowedCommands": ["npm", "node", "git"]
    }
  }
}
```

### 10.4 민감 정보 필터링

OpenClaw는 자동으로 로그에서 민감 정보를 필터링하지만, 추가 주의가 필요합니다:

- 브라우저 프로필에 로그인 세션 포함 가능 → 민감 데이터로 취급
- `evaluate` 함수는 페이지 컨텍스트에서 임의 JS 실행 → 프롬프트 인젝션 주의
- 원격 CDP 엔드포인트는 터널링으로 보호

---

## 11. 참고 자료

### 11.1 공식 문서

- [OpenClaw 공식 문서](https://docs.openclaw.ai)
- [Browser Tool 문서](https://docs.openclaw.ai/tools/browser)
- [Nodes 문서](https://docs.openclaw.ai/nodes)
- [Cron Jobs 문서](https://docs.openclaw.ai/automation/cron-jobs)
- [Sub-Agents 문서](https://docs.openclaw.ai/tools/subagents)

### 11.2 관련 도구

| 도구 | 용도 | 링크 |
|---|---|---|
| Browser Use | 오픈소스 브라우저 에이전트 프레임워크 | github.com/browser-use/browser-use |
| Stagehand | TypeScript AI 브라우저 SDK | github.com/browserbase/stagehand |
| Agent Browser | CLI 기반 브라우저 제어 | github.com/vercel-labs/agent-browser |
| Playwright MCP | Playwright MCP 서버 | github.com/microsoft/playwright-mcp |

### 11.3 커뮤니티

- [OpenClaw Discord](https://discord.gg/openclaw)
- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- [Reddit r/AI_Agents](https://www.reddit.com/r/AI_Agents/)

### 11.4 테스트 벤치마크

| 도구 | WebVoyager 성공률 | 특징 |
|---|---|---|
| Browser Use | 89.1% | 오픈소스 최고 성능 |
| Skyvern 2.0 | 85.85% | 폼 작성 특화 |
| OpenAI CUA | 87% | ChatGPT Atlas 기반 |

---

## 부록 A: 빠른 시작 체크리스트

- [ ] OpenClaw 설치: `npm install -g openclaw`
- [ ] Gateway 초기화: `openclaw onboard --install-daemon`
- [ ] Browser 활성화: `openclaw config set browser.enabled true`
- [ ] Chromium 설치: `npx playwright install chromium`
- [ ] 테스트 환경 설정: `openclaw.json` 구성
- [ ] 첫 번째 스모크 테스트 등록
- [ ] 알림 채널 연결 (Telegram/Slack)
- [ ] CI/CD 파이프라인 통합

---

## 부록 B: 문제 해결

### 브라우저가 시작되지 않음

```bash
# 시스템 의존성 포함 재설치
npx playwright install --with-deps chromium

# 상태 확인
openclaw browser status
```

### 요소를 찾을 수 없음

```bash
# 디버그 모드 활성화
openclaw config set browser.debug true

# 새 스냅샷 생성
openclaw browser snapshot -i --json
```

### 타임아웃 발생

```bash
# 타임아웃 증가
openclaw config set browser.timeout 60000
```

---

*최종 업데이트: 2026년 2월*
*작성자: OpenClaw Dev Team Research*
