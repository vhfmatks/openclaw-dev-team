# Self-Validation Loop Architecture

## 개요

단방향 파이프라인이 아닌, **자가 검수/수정 사이클**을 통한 완전 자동화.

**핵심 아이디어**: OpenClaw가 브라우저를 통해 직접 테스트하고 검증하여, 사람 개입 없이 완성된 결과만 전달.

## 문제점: 기존 단방향 파이프라인

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  Plan   │───▶│  Code   │───▶│  Test   │───▶│  End    │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
                                      │
                                      ▼
                               사람이 확인 필요
                               ❌ 에러 발견 시 수동 수정
```

**문제:**
- AI가 자신의 코드만 작성하고 끝
- 테스트 실패 시 사람이 디버깅
- "작동하는지" 확인 불가
- 품질 검증 없음

## 해결책: Self-Validation Loop

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenClaw Dev Squad                        │
│                                                              │
│  ┌─────────┐    ┌─────────┐                                │
│  │  Plan   │───▶│  Code   │                                │
│  └─────────┘    └────┬────┘                                │
│                      │                                      │
│                      ▼                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              SELF-VALIDATION LOOP                     │  │
│  │                                                       │  │
│  │   ┌──────────┐    ┌──────────┐    ┌──────────┐      │  │
│  │   │  Browser │    │  Browser │    │  Check   │      │  │
│  │   │   Test   │───▶│   QA     │───▶│  Pass?   │      │  │
│  │   │ (Playwright)│ │ (Visual) │    │          │      │  │
│  │   └──────────┘    └──────────┘    └────┬─────┘      │  │
│  │        ▲                               │            │  │
│  │        │         ┌──────────┐          │ No         │  │
│  │        │         │  Rework  │◀─────────┤            │  │
│  │        │         │  (Fix)   │          │            │  │
│  │        │         └──────────┘          │            │  │
│  │        │                               │ Yes        │  │
│  │        └───────────────────────────────┘            │  │
│  │                                                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                              │                             │
│                              ▼                             │
│                     ┌──────────────┐                      │
│                     │   Delivery   │                      │
│                     │   to User    │                      │
│                     └──────────────┘                      │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
                        Telegram: "완료! ✅"
```

## OpenClaw 브라우저 능력

### OpenClaw가 할 수 있는 것

| 능력 | 설명 | 활용 |
|------|------|------|
| **Browser Navigation** | URL 이동, 링크 클릭 | 페이지 로드 테스트 |
| **Element Interaction** | 버튼 클릭, 폼 입력 | 사용자 행동 시뮬레이션 |
| **Visual Analysis** | 스크린샷 캡처, 시각 검사 | UI 렌더링 확인 |
| **Text Extraction** | 페이지 텍스트 읽기 | 에러 메시지 확인 |
| **Console Monitoring** | JS 에러 감지 | 런타임 에러 탐지 |
| **Network Inspection** | API 호출 모니터링 | 백엔드 통신 확인 |

### Browser Automation Stack

```
┌─────────────────────────────────────────────────────┐
│              OpenClaw Browser Layer                 │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐│
│  │           Playwright / Puppeteer                ││
│  │  - Headless Chrome/Chromium                    ││
│  │  - Page interactions                           ││
│  │  - Screenshot capture                          ││
│  └─────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐│
│  │           Vision Analysis                       ││
│  │  - Screenshot → AI interpretation              ││
│  │  - "이 버튼이 보이나요?"                        ││
│  │  - "에러 메시지가 있나요?"                      ││
│  └─────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐│
│  │           Console / Network                     ││
│  │  - JavaScript errors                           ││
│  │  - Failed API calls                            ││
│  │  - Console logs                                ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

## 상세 아키텍처

### Phase 1: Development

```
User Request (Telegram)
        │
        ▼
┌───────────────────────────────────────────┐
│           Orchestrator                     │
│  - 작업 분해                               │
│  - 에이전트 배치                           │
└───────────────┬───────────────────────────┘
                │
        ┌───────┴───────┐
        │               │
        ▼               ▼
   ┌─────────┐    ┌─────────┐
   │ Planner │    │Architect│
   │ (Sonnet)│    │ (Opus)  │
   └────┬────┘    └────┬────┘
        │               │
        └───────┬───────┘
                │
                ▼
   ┌─────────────────────────┐
   │   Implementation Squad   │
   │  ┌─────────┐ ┌─────────┐ │
   │  │Frontend │ │ Backend │ │
   │  │Designer │ │  Dev    │ │
   │  └─────────┘ └─────────┘ │
   └────────────┬─────────────┘
                │
                ▼
           Code Complete
```

### Phase 2: Self-Validation Loop

```
           Code Complete
                │
                ▼
┌───────────────────────────────────────────────────────┐
│              VALIDATION CYCLE #1                      │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Step 1: Build & Deploy (Local/Preview)          │ │
│  │ - npm run build                                 │ │
│  │ - Start dev server                              │ │
│  │ - Or deploy to preview environment              │ │
│  └─────────────────────────────────────────────────┘ │
│                        │                              │
│                        ▼                              │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Step 2: Browser Test (OpenClaw)                 │ │
│  │                                                  │ │
│  │  OpenClaw:                                       │ │
│  │  1. "브라우저로 localhost:3000 접속해"           │ │
│  │  2. "페이지가 로드되었는지 확인해"               │ │
│  │  3. "스크린샷 찍어"                              │ │
│  │  4. "에러가 있나요?"                             │ │
│  │                                                  │ │
│  │  Tools: Playwright, Vision AI                   │ │
│  └─────────────────────────────────────────────────┘ │
│                        │                              │
│                        ▼                              │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Step 3: Functional Test (OpenClaw)              │ │
│  │                                                  │ │
│  │  OpenClaw:                                       │ │
│  │  1. "로그인 버튼 클릭해"                         │ │
│  │  2. "폼에 테스트 데이터 입력해"                  │ │
│  │  3. "제출 버튼 클릭해"                           │ │
│  │  4. "성공 메시지가 나왔나요?"                    │ │
│  │                                                  │ │
│  │  AI가 실제 사용자처럼 앱 사용                   │ │
│  └─────────────────────────────────────────────────┘ │
│                        │                              │
│                        ▼                              │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Step 4: QA Check (OpenClaw Vision)              │ │
│  │                                                  │ │
│  │  OpenClaw:                                       │ │
│  │  1. "UI가 깨진 부분이 있나요?"                   │ │
│  │  2. "텍스트가 잘리나요?"                         │ │
│  │  3. "반응형이 깨지나요?"                         │ │
│  │  4. "콘솔에 에러가 있나요?"                      │ │
│  │                                                  │ │
│  │  Vision AI로 시각적 품질 검사                   │ │
│  └─────────────────────────────────────────────────┘ │
│                        │                              │
│                        ▼                              │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Step 5: Decision                                │ │
│  │                                                  │ │
│  │  IF (all tests pass AND no visual issues):      │ │
│  │    → EXIT loop, proceed to delivery             │ │
│  │                                                  │ │
│  │  IF (any test fails OR issues found):           │ │
│  │    → Identify specific problems                 │ │
│  │    → Create fix tasks                           │ │
│  │    → GOTO Rework                                │ │
│  └─────────────────────────────────────────────────┘ │
│                        │                              │
│            ┌───────────┴───────────┐                 │
│            │                       │                 │
│         Pass                    Fail                 │
│            │                       │                 │
│            │                       ▼                 │
│            │         ┌─────────────────────────┐    │
│            │         │ Step 6: Rework          │    │
│            │         │                         │    │
│            │         │ OpenClaw:                │    │
│            │         │ "로그인이 실패했어.      │    │
│            │         │  이유를 분석하고         │    │
│            │         │  코드를 수정해"          │    │
│            │         │                         │    │
│            │         │ → 코드 수정             │    │
│            │         │ → 변경사항 적용         │    │
│            │         └───────────┬─────────────┘    │
│            │                     │                   │
│            │                     └──────┐            │
│            │                            │            │
│            │                     ┌──────▼──────┐    │
│            │                     │ RETRY TEST  │    │
│            │                     │ (Go to Step 2)   │
│            │                     └─────────────┘    │
│            │                                        │
└────────────┼────────────────────────────────────────┘
             │
             ▼
     ┌───────────────┐
     │   DELIVERY    │
     │               │
     │ - Final code  │
     │ - Test report │
     │ - Screenshot  │
     └───────┬───────┘
             │
             ▼
      Telegram Response
```

## OpenClaw 브라우저 테스트 예시

### 실제 대화 시나리오

```
# OpenClaw 내부 대화 (사용자에게 보이지 않음)

Orchestrator:
  "새로운 기능 구현 완료. 이제 Self-Validation 시작."

OpenClaw (Browser Agent):
  "브라우저로 http://localhost:3000 접속 중..."
  [Playwright: navigating to localhost:3000]
  
  "페이지 로드 완료. 스크린샷 캡처..."
  [Screenshot saved: test-1-initial.png]
  
  "Vision AI로 분석 중..."
  → "대시보드가 정상적으로 렌더링됨"
  → "네비게이션 바 보임"
  → "에러 메시지 없음"

OpenClaw (Functional Test):
  "'새 계약서' 버튼 클릭..."
  [Playwright: clicking button '새 계약서']
  
  "모달이 열렸나요?"
  → "네, 모달이 표시됨"
  
  "폼에 테스트 데이터 입력..."
  [Playwright: filling form fields]
  
  "'저장' 버튼 클릭..."
  [Playwright: clicking '저장']
  
  "결과 확인..."
  → "성공 토스트 메시지 표시됨"
  → "새 계약서가 목록에 추가됨"

OpenClaw (QA Check):
  "콘솔 에러 확인..."
  [Browser console: no errors]
  
  "시각적 품질 확인..."
  → "UI 정상"
  → "레이아웃 깨짐 없음"
  → "반응형 정상"

Decision:
  ✅ All tests passed!
  → Delivery 단계로 진행
```

### 실패 시나리오

```
OpenClaw (Functional Test):
  "'저장' 버튼 클릭..."
  [Playwright: clicking '저장']
  
  "결과 확인..."
  → ❌ 에러 발생: "400 Bad Request"
  → ❌ 콘솔 에러: "Failed to POST /api/contracts"

OpenClaw (Error Analysis):
  "에러 분석 중..."
  → 원인: 백엔드 API에서 필수 필드 누락 검증 실패
  → 수정 필요: src/api/contracts/route.ts
  
  "수정 작업 시작..."
  → [코드 수정 중...]
  → [변경사항 저장...]
  
  "수정 완료. 테스트 재실행..."
  [Go to Step 2: Browser Test]
```

## 구현 구성요소

### 1. OpenClaw Skill: self-validation

```yaml
---
name: openclaw-self-validation
description: Automated self-validation loop using browser testing. Runs tests, analyzes results, and auto-fixes issues until all tests pass.
triggers: ["validate", "test and fix", "self validate"]
---

# Self-Validation Loop

## Overview
This skill implements an autonomous validation cycle where OpenClaw:
1. Runs the application in browser
2. Performs functional tests
3. Checks visual quality
4. Identifies and fixes issues
5. Repeats until all tests pass

## Workflow

### Step 1: Setup
- Start dev server or deploy to preview
- Wait for application to be ready
- Capture initial state

### Step 2: Browser Testing
Use Playwright MCP tools:
- `playwright_navigate`: Go to URL
- `playwright_screenshot`: Capture visual state
- `playwright_click`: Interact with elements
- `playwright_fill`: Input test data
- `playwright_evaluate`: Check conditions

### Step 3: Analysis
- Vision AI analyzes screenshots
- Console logs checked for errors
- Network requests verified

### Step 4: Decision
- IF all pass → proceed to delivery
- IF any fail → identify issues → fix → retry

### Step 5: Rework (if needed)
- Analyze root cause
- Generate fix code
- Apply changes
- Go to Step 2

## Maximum Iterations
- Default: 5 cycles
- Configurable per task

## Exit Conditions
- All tests pass
- Max iterations reached
- Critical error (requires human)
```

### 2. MCP Server: Playwright Integration

```typescript
// openclaw-playwright-mcp.ts
import { Server } from "@modelcontextprotocol/sdk/server";
import { chromium } from "playwright";

const server = new Server({
  name: "openclaw-playwright",
  version: "1.0.0"
});

let browser, page;

server.registerTool({
  name: "browser_start",
  description: "Start browser session",
  inputSchema: z.object({
    headless: z.boolean().default(true)
  }),
  handler: async ({ headless }) => {
    browser = await chromium.launch({ headless });
    page = await browser.newPage();
    return { status: "Browser started" };
  }
});

server.registerTool({
  name: "browser_navigate",
  description: "Navigate to URL",
  inputSchema: z.object({
    url: z.string()
  }),
  handler: async ({ url }) => {
    await page.goto(url);
    return { status: "Navigated", url };
  }
});

server.registerTool({
  name: "browser_screenshot",
  description: "Capture screenshot",
  inputSchema: z.object({
    name: z.string()
  }),
  handler: async ({ name }) => {
    const path = `screenshots/${name}.png`;
    await page.screenshot({ path, fullPage: true });
    return { status: "Screenshot saved", path };
  }
});

server.registerTool({
  name: "browser_click",
  description: "Click element",
  inputSchema: z.object({
    selector: z.string()
  }),
  handler: async ({ selector }) => {
    await page.click(selector);
    return { status: "Clicked", selector };
  }
});

server.registerTool({
  name: "browser_fill",
  description: "Fill form field",
  inputSchema: z.object({
    selector: z.string(),
    value: z.string()
  }),
  handler: async ({ selector, value }) => {
    await page.fill(selector, value);
    return { status: "Filled", selector };
  }
});

server.registerTool({
  name: "browser_check_errors",
  description: "Check for console errors",
  inputSchema: z.object({}),
  handler: async () => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    return { errors, hasErrors: errors.length > 0 };
  }
});

server.registerTool({
  name: "browser_visual_check",
  description: "Visual quality check using AI",
  inputSchema: z.object({
    prompt: z.string().describe("What to check, e.g., 'Is the button visible?'")
  }),
  handler: async ({ prompt }) => {
    const screenshot = await page.screenshot({ encoding: 'base64' });
    // Send to vision AI for analysis
    const result = await analyzeWithVision(screenshot, prompt);
    return result;
  }
});
```

### 3. Telegram Integration with Progress Updates

```typescript
// telegram-dev-orchestrator.ts
import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

bot.on('message', async (ctx) => {
  const request = ctx.message.text;
  const chatId = ctx.chat.id;
  
  // Acknowledge request
  const statusMsg = await ctx.reply(
    '🔄 작업 시작...\n\n' +
    '📋 Planning...'
  );
  
  try {
    // Phase 1: Plan & Implement
    await updateStatus(statusMsg, '🏗️ Implementing...');
    const code = await orchestrator.implement(request);
    
    // Phase 2: Self-Validation Loop
    await updateStatus(statusMsg, 
      '🧪 Self-Validation 시작...\n' +
      'Cycle 1/5: Testing...'
    );
    
    let cycle = 1;
    let passed = false;
    
    while (!passed && cycle <= 5) {
      const result = await selfValidation.run(code);
      
      if (result.passed) {
        passed = true;
        await updateStatus(statusMsg,
          `✅ All tests passed!\n` +
          `Total cycles: ${cycle}`
        );
      } else {
        await updateStatus(statusMsg,
          `⚠️ Issues found (Cycle ${cycle}/5)\n` +
          `🔧 Auto-fixing: ${result.issues.join(', ')}`
        );
        
        code = await orchestrator.fix(result.issues);
        cycle++;
      }
    }
    
    if (!passed) {
      await ctx.reply(
        '❌ 최대 재시도 횟수 초과\n' +
        '사람의 도움이 필요할 수 있습니다.'
      );
      return;
    }
    
    // Phase 3: Delivery
    await updateStatus(statusMsg, '📦 Preparing delivery...');
    
    await ctx.replyWithMarkdown(
      '✅ *완료되었습니다!*\n\n' +
      `📋 요청: ${request}\n` +
      `🔄 검증 사이클: ${cycle}회\n` +
      `📸 스크린샷: 첨부\n\n` +
      '변경된 파일:\n' +
      code.changedFiles.map(f => `• \`${f}\``).join('\n'),
      {
        parse_mode: 'Markdown'
      }
    );
    
    // Send screenshot
    if (code.screenshot) {
      await ctx.replyWithPhoto({ source: code.screenshot });
    }
    
  } catch (error) {
    await ctx.reply(
      `❌ 오류 발생: ${error.message}\n` +
      '다시 시도하거나 관리자에게 문의하세요.'
    );
  }
});

async function updateStatus(msg, text) {
  await bot.telegram.editMessageText(
    msg.chat.id,
    msg.message_id,
    null,
    text
  );
}
```

## 검증 체크리스트

### Functional Tests (OpenClaw 자동 수행)

| 테스트 | 방법 | 통과 조건 |
|--------|------|----------|
| **페이지 로드** | 브라우저 접속 | 200 OK, 콘솔 에러 없음 |
| **UI 렌더링** | 스크린샷 + Vision AI | 주요 요소 표시됨 |
| **상호작용** | 클릭, 입력 | 예상 동작 수행 |
| **API 통신** | 네트워크 모니터링 | API 응답 정상 |
| **에러 핸들링** | 에러 시나리오 | 에러 메시지 표시 |

### Visual QA (OpenClaw Vision)

| 체크 | 방법 | 통과 조건 |
|------|------|----------|
| **레이아웃** | Vision AI | 깨짐 없음 |
| **반응형** | 리사이즈 + 스크린샷 | 모든 크기에서 정상 |
| **텍스트** | Vision AI | 잘림 없음 |
| **색상/스타일** | Vision AI | 디자인 일치 |

## 최대 재시도 및 에스컬레이션

```
┌─────────────────────────────────────────────────┐
│              Self-Validation Policy             │
├─────────────────────────────────────────────────┤
│                                                 │
│  Max Cycles: 5                                  │
│                                                 │
│  Cycle 1-3: Auto-fix all issues                │
│  Cycle 4-5: Focus on critical issues only      │
│                                                 │
│  IF max reached AND not passed:                │
│    → Escalate to human                          │
│    → Provide detailed error report              │
│    → Suggest manual intervention points        │
│                                                 │
│  Critical Errors (immediate escalation):        │
│    - Environment setup failures                │
│    - Dependency conflicts                      │
│    - Security vulnerabilities                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

## 요약

| 구성요소 | 역할 |
|---------|------|
| **Orchestrator** | 전체 워크플로우 관리 |
| **Browser Agent** | Playwright로 앱 테스트 |
| **Vision AI** | 스크린샷 분석, 시각 QA |
| **Fix Agent** | 문제 분석, 코드 수정 |
| **Telegram Bot** | 사용자 인터페이스, 결과 전달 |

**결과**: 사용자는 Telegram으로 요청만 하면, OpenClaw가 자체적으로 테스트하고 수정하여 **완성된 결과만** 받게 됨.
