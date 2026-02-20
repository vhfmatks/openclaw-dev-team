# Cycle 관리 메커니즘 분석

## 핵심 질문

1. **Test에서 reject되면 개발부터 다시 시작하는데, 그 "되돌아가는 작업"을 누가 담당하나?**
2. **Cycle이 skill로만 가능한가?**

## 정답

### Q1: 누가 "되돌아가기"를 담당하나?

**답: Stop Hook이 담당합니다.**

```
┌─────────────────────────────────────────────────────────────┐
│                    Stop Hook 메커니즘                        │
│                                                              │
│  AI가 "완료했습니다" 하고 종료 시도                           │
│              │                                               │
│              ▼                                               │
│  ┌─────────────────────────────────────────┐               │
│  │         Stop Hook 개입                   │               │
│  │                                         │               │
│  │  1. "정말 완료됐나?" 검증               │               │
│  │  2. 테스트 실행                         │               │
│  │  3. 통과? → 종료 허용                   │               │
│  │  4. 실패? → 같은 prompt 다시 feed       │               │
│  └─────────────────────────────────────────┘               │
│              │                                               │
│      ┌───────┴───────┐                                      │
│      │               │                                      │
│   Pass            Fail                                      │
│      │               │                                      │
│      ▼               ▼                                      │
│   종료          "완료 약속" 충족할 때까지                    │
│                 같은 prompt 반복                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Ralph Loop의 실제 동작

**"Ralph is a Bash loop" — Geoffrey Huntley (창시자)**

```
┌─────────────────────────────────────────────────────────────┐
│                    Ralph Loop 동작                           │
│                                                              │
│  Iteration 1:                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 새 Claude 인스턴스 시작 (fresh context)             │   │
│  │ Task: "기능 구현해줘"                               │   │
│  │ → 코드 작성                                         │   │
│  │ → "완료했습니다"                                    │   │
│  │ → Stop Hook: "테스트 실행"                          │   │
│  │ → Test FAIL                                         │   │
│  │ → 작업 상태를 파일에 저장                           │   │
│  └─────────────────────────────────────────────────────┘   │
│              │                                               │
│              ▼                                               │
│  Iteration 2:                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 새 Claude 인스턴스 시작 (fresh context)             │   │
│  │ 이전 작업 내용을 파일에서 읽음                      │   │
│  │ Task: "기능 구현해줘" (같은 prompt)                 │   │
│  │ Context: "이전에 X까지 했고, 테스트 실패했음"       │   │
│  │ → 실패한 부분 수정                                  │   │
│  │ → "완료했습니다"                                    │   │
│  │ → Stop Hook: "테스트 실행"                          │   │
│  │ → Test PASS                                         │   │
│  │ → "completion promise" 충족                         │   │
│  │ → 종료                                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 핵심 포인트

| 구분 | 설명 |
|------|------|
| **"되돌아가기" 담당** | Stop Hook (Hook 시스템) |
| **메모리 유지 방법** | 파일, Git, Progress Log, Learnings |
| **새 iteration 특징** | Fresh context (이전 메모리 없음) |
| **Continuity 확보** | 파일에서 이전 상태를 읽어서 계속 |

### Q2: Cycle이 skill로만 가능한가?

**답: 아니요! Cycle은 Hook이 관리합니다.**

```
┌─────────────────────────────────────────────────────────────┐
│                  Skill vs Hook 역할 분담                     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    SKILL                             │   │
│  │                                                     │   │
│  │  역할: 지식, 절차, 패턴                              │   │
│  │                                                     │   │
│  │  - "테스트를 어떻게 실행하지?"                      │   │
│  │  - "에러를 어떻게 분석하지?"                        │   │
│  │  - "코드를 어떻게 수정하지?"                        │   │
│  │                                                     │   │
│  │  → 무엇(What)을 할지 정의                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                     HOOK                             │   │
│  │                                                     │   │
│  │  역할: 타이밍, 흐름 제어, 루프                       │   │
│  │                                                     │   │
│  │  - "언제 테스트를 실행하지?" (PostToolUse)          │   │
│  │  - "완료했을 때 무엇을 확인하지?" (Stop)            │   │
│  │  - "실패하면 어떻게 하지?" (재시도 로직)            │   │
│  │                                                     │   │
│  │  → 언제(When), 어떻게(How) 제어                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 실제 구현 예시

### Stop Hook 설정

```json
// ~/.claude/settings.json
{
  "hooks": {
    "Stop": [
      {
        "command": "node scripts/verify-completion.js",
        "matcher": {
          "completionPromise": "ALL_TESTS_PASS"
        }
      }
    ]
  }
}
```

### verify-completion.js 예시

```javascript
// scripts/verify-completion.js
const { execSync } = require('child_process');
const fs = require('fs');

async function verify() {
  // 1. 테스트 실행
  console.log('Running tests...');
  const testResult = execSync('npm test', { encoding: 'utf8' });
  
  // 2. 결과 분석
  if (testResult.includes('PASS')) {
    // 3. 성공: completion promise 충족
    console.log('ALL_TESTS_PASS');
    process.exit(0);  // 종료 허용
  } else {
    // 4. 실패: 상태 저장 후 재시도
    const errors = extractErrors(testResult);
    fs.writeFileSync('.ralph/current-errors.md', errors);
    console.log('Tests failed. Retrying...');
    process.exit(1);  // 종료 차단, 재시도
  }
}

verify();
```

## OpenClaw Dev Team에 적용

### 1. Hook 기반 Cycle

```json
// OpenClaw 설정
{
  "hooks": {
    "Stop": [
      {
        "agent": "qa-tester",
        "prompt": "Verify the implementation meets requirements. Run all tests. If any fail, document the errors and return exit code 1 to trigger retry.",
        "matcher": {
          "hasActiveDevTask": true
        }
      }
    ],
    "PostToolUse": [
      {
        "command": "node scripts/quick-test.js ${filepath}",
        "matcher": {
          "toolName": "edit_file",
          "filePath": "\\.tsx?$"
        }
      }
    ]
  }
}
```

### 2. 상태 유지 파일

```
.openclaw-dev-team/
├── .cycle-state/
│   ├── current-task.md       # 현재 작업
│   ├── iteration-count.txt   # 반복 횟수
│   ├── errors-found.md       # 발견된 에러
│   ├── fixes-applied.md      # 적용된 수정
│   └── test-results.json     # 테스트 결과
└── .progress/
    ├── completed-steps.md    # 완료된 단계
    └── pending-steps.md      # 남은 단계
```

### 3. Self-Validation Hook

```javascript
// scripts/self-validation.js
const { chromium } = require('playwright');

async function validate() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // 1. 브라우저 테스트
  await page.goto('http://localhost:3000');
  const errors = await page.evaluate(() => {
    return window.__errors || [];
  });
  
  // 2. 스크린샷
  await page.screenshot({ path: '.cycle-state/screenshot.png' });
  
  await browser.close();
  
  // 3. 결과 판정
  if (errors.length > 0) {
    fs.writeFileSync('.cycle-state/browser-errors.json', JSON.stringify(errors));
    process.exit(1);  // 재시도
  }
  
  process.exit(0);  // 완료
}

validate();
```

## 요약

| 질문 | 답변 |
|------|------|
| **되돌아가기 담당** | **Stop Hook** - AI가 종료하려 할 때 개입하여 검증 |
| **Cycle 메커니즘** | **Hook 시스템** - Skill은 지식만 제공, 제어는 Hook이 담당 |
| **상태 유지** | **파일 시스템** - 새 iteration은 파일에서 이전 상태 읽음 |
| **컨텍스트** | **Fresh each iteration** - 메모리는 초기화, 파일만 기억 |

## 결론

```
┌─────────────────────────────────────────────────────────────┐
│                   Cycle 관리의 3가지 요소                    │
│                                                              │
│  1. HOOK (제어)                                             │
│     → Stop Hook이 종료 시점에 개입                          │
│     → 검증 실패 시 재시도 트리거                            │
│                                                              │
│  2. STATE (기억)                                            │
│     → 파일에 작업 상태 저장                                  │
│     → 새 iteration에서 읽어서 계속                          │
│                                                              │
│  3. SKILL (지식)                                            │
│     → 테스트 방법, 수정 방법 등                             │
│     → "무엇을 할지" 정의                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**OpenClaw Dev Team에서는:**
1. Stop Hook으로 Self-Validation Loop 구현
2. `.cycle-state/` 폴더에 진행 상황 저장
3. 각 Skill이 테스트/수정 지식 제공
4. 최대 5회 반복 후 사람에게 에스컬레이션
