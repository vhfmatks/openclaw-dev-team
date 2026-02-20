# OpenClaw Dev Team 구현 계획

## 개요

| 항목 | 내용 |
|------|------|
| **목표** | OpenClaw 기반 AI 개발 팀 구축 |
| **범위** | MVP (1개 사이클: 요청 → 개발 → 테스트 → 전달) |
| **최우선** | 멀티 에이전트 조율 |
| **접근법** | 하이브리드 (OpenClaw 네이티브 + oh-my-claudecode 패턴) |
| **타임라인** | 2-4주 |

---

## 1. 아키텍처 설계

### 1.1 전체 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                    OpenClaw Dev Team                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Entry Point                              │ │
│  │                                                             │ │
│  │   Telegram ──▶ OpenClaw Gateway ──▶ Orchestrator Skill    │ │
│  │                                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Orchestrator                              │ │
│  │                                                             │ │
│  │   1. 요청 분석 → 에이전트 배치 → 결과 취합                  │ │
│  │   2. 상태 관리 (.dev-team/state/)                          │ │
│  │   3. 사이클 제어                                            │ │
│  │                                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│         ┌────────────────────┼────────────────────┐             │
│         │                    │                    │             │
│         ▼                    ▼                    ▼             │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐     │
│  │   Planner   │      │  Executor   │      │  Validator  │     │
│  │   Agent     │      │   Agents    │      │   Agent     │     │
│  │             │      │             │      │             │     │
│  │ - 분석      │      │ - Frontend  │      │ - 브라우저   │     │
│  │ - 설계      │      │ - Backend   │      │   테스트     │     │
│  │             │      │ - 통합      │      │ - 결과 확인  │     │
│  └─────────────┘      └─────────────┘      └─────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 MVP 단일 사이클 플로우

```
┌─────────────────────────────────────────────────────────────────┐
│                      Single Cycle MVP                            │
│                                                                  │
│  Telegram: "대시보드 만들어줘"                                   │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Phase 1: Planning (10%)                                 │   │
│  │                                                         │   │
│  │   Planner Agent:                                        │   │
│  │   - 요구사항 분석                                       │   │
│  │   - 작업 분해                                           │   │
│  │   - 계획 문서 생성                                      │   │
│  │                                                         │   │
│  │   Output: .dev-team/plans/xxx-plan.md                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Phase 2: Execution (60%)                                │   │
│  │                                                         │   │
│  │   Frontend Executor + Backend Executor (병렬):          │   │
│  │   - 코드 작성                                           │   │
│  │   - 파일 생성                                           │   │
│  │   - 의존성 설치                                         │   │
│  │                                                         │   │
│  │   Output: src/ 파일들                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Phase 3: Validation (20%)                               │   │
│  │                                                         │   │
│  │   Validator Agent:                                      │   │
│  │   - 브라우저로 접속                                     │   │
│  │   - 기본 동작 확인                                      │   │
│  │   - 스크린샷 캡처                                       │   │
│  │   - 결과 보고서 작성                                    │   │
│  │                                                         │   │
│  │   Output: .dev-team/reports/xxx-report.md               │   │
│  └─────────────────────────────────────────────────────────┘   │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Phase 4: Delivery (10%)                                 │   │
│  │                                                         │   │
│  │   Telegram 응답:                                        │   │
│  │   - 완료 메시지                                         │   │
│  │   - 변경된 파일 목록                                    │   │
│  │   - 스크린샷 첨부                                       │   │
│  │   - 테스트 결과 요약                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 컴포넌트 설계

### 2.1 OpenClaw Skills (네이티브)

```
~/.openclaw/skills/
├── dev-team-orchestrator/       # 메인 오케스트레이터
│   ├── SKILL.md
│   └── scripts/
│       ├── analyze-request.ts
│       ├── dispatch-agents.ts
│       └── collect-results.ts
│
├── dev-team-planner/            # 계획 수립 에이전트
│   ├── SKILL.md
│   └── scripts/
│       ├── decompose-task.ts
│       └── generate-plan.ts
│
├── dev-team-executor/           # 실행 에이전트
│   ├── SKILL.md
│   └── scripts/
│       ├── implement-feature.ts
│       └── write-code.ts
│
└── dev-team-validator/          # 검증 에이전트
    ├── SKILL.md
    └── scripts/
        ├── browser-test.ts
        ├── capture-screenshot.ts
        └── generate-report.ts
```

### 2.2 상태 관리 파일

```
.dev-team/
├── state/
│   ├── current-task.json        # 현재 작업 상태
│   ├── agent-status.json        # 에이전트 실행 상태
│   └── cycle-count.txt          # 사이클 카운트
│
├── plans/
│   └── YYYY-MM-DD-HH-MM-slug.md # 생성된 계획 문서
│
├── reports/
│   └── YYYY-MM-DD-HH-MM-slug.md # 검증 보고서
│
├── screenshots/
│   └── *.png                    # 브라우저 스크린샷
│
└── memory/
    ├── learnings.md             # 학습한 내용
    └── patterns.md              # 발견한 패턴
```

### 2.3 OpenClaw Hooks (이벤트 처리)

```typescript
// ~/.openclaw/hooks/dev-team-hook/handler.ts

import type { HookHandler } from "openclaw";

const handler: HookHandler = async (event) => {
  // 메시지 수신 시 Dev Team 트리거
  if (event.type === "message" && event.action === "received") {
    const content = event.context.content;
    
    // 개발 요청 감지
    if (isDevRequest(content)) {
      // Orchestrator Skill 호출
      await triggerOrchestrator(event.context);
    }
  }
  
  // 명령어 처리
  if (event.type === "command" && event.action === "new") {
    // 상태 초기화
    await resetDevTeamState();
  }
};

function isDevRequest(content: string): boolean {
  const keywords = ["만들어줘", "구현해줘", "개발해줘", "build", "implement"];
  return keywords.some(kw => content.toLowerCase().includes(kw));
}

export default handler;
```

---

## 3. 구현 단계 (2-4주)

### Week 1: 기반 구축

| 일 | 작업 | 산출물 |
|----|------|--------|
| Day 1-2 | 프로젝트 구조 설정 | `.dev-team/` 디렉토리, 기본 설정 |
| Day 2-3 | Orchestrator Skill 구현 | `dev-team-orchestrator/` |
| Day 3-4 | Planner Agent 구현 | `dev-team-planner/` |
| Day 4-5 | 기본 Hook 구현 | `dev-team-hook/` |
| Day 5 | Telegram 연동 테스트 | 메시지 → Skill 실행 확인 |

### Week 2: 에이전트 구현

| 일 | 작업 | 산출물 |
|----|------|--------|
| Day 6-7 | Executor Agent 구현 | `dev-team-executor/` |
| Day 8-9 | Validator Agent 구현 | `dev-team-validator/` |
| Day 9-10 | 브라우저 테스트 연동 | Playwright 스크립트 |
| Day 10-11 | 전체 파이프라인 통합 | End-to-End 테스트 |
| Day 12 | MVP 완료 | 기본 동작 확인 |

### Week 3-4: 안정화 및 확장 (선택)

| 일 | 작업 | 산출물 |
|----|------|--------|
| Day 13-14 | 에러 처리 강화 | 예외 상황 대응 |
| Day 15-16 | 재시도 로직 추가 | Self-Validation Loop (3회) |
| Day 17-18 | 진행 상황 보고 | Telegram 실시간 업데이트 |
| Day 19-20 | 문서화 | 사용 가이드, API 문서 |

---

## 4. 기술 스택

### 4.1 OpenClaw 네이티브

| 컴포넌트 | 기술 |
|----------|------|
| **Skills** | OpenClaw Skills API (SKILL.md + scripts) |
| **Hooks** | OpenClaw Hooks API (HOOK.md + handler.ts) |
| **State** | JSON 파일 (`.dev-team/state/`) |
| **Messaging** | OpenClaw Channels (Telegram) |

### 4.2 브라우저 테스트

| 컴포넌트 | 기술 |
|----------|------|
| **Automation** | Playwright (OpenClaw 내장) |
| **Screenshots** | Playwright screenshot |
| **Vision** | OpenClaw Vision (스크린샷 분석) |

### 4.3 참고: oh-my-claudecode 패턴

| 패턴 | 적용 방식 |
|------|----------|
| **에이전트 구조** | Planner → Executor → Validator 패턴 차용 |
| **상태 관리** | `.omc/state/` → `.dev-team/state/`로 변형 |
| **위임 패턴** | Skill 내에서 하위 작업 분배 |
| **검증 프로토콜** | 완료 전 검증 단계 포함 |

---

## 5. 상세 작업 목록

### 5.1 Orchestrator Skill

```yaml
# SKILL.md
---
name: dev-team-orchestrator
description: |
  OpenClaw Dev Team의 메인 오케스트레이터.
  개발 요청을 받아 에이전트를 조율하고 결과를 취합한다.
  트리거: "만들어줘", "구현해줘", "개발해줘"
---

# Dev Team Orchestrator

## 역할
1. 개발 요청 분석
2. 적절한 에이전트 배치
3. 실행 상태 모니터링
4. 결과 취합 및 전달

## 워크플로우

### Step 1: 요청 분석
```typescript
// scripts/analyze-request.ts
interface DevRequest {
  type: "feature" | "bugfix" | "refactor";
  priority: "high" | "medium" | "low";
  domain: "frontend" | "backend" | "fullstack" | "integration";
  description: string;
}

function analyzeRequest(message: string): DevRequest {
  // LLM으로 요청 분석
}
```

### Step 2: 에이전트 배치
- Frontend 작업 → Frontend Executor
- Backend 작업 → Backend Executor
- 전체 → 병렬 실행

### Step 3: 상태 관리
```json
// .dev-team/state/current-task.json
{
  "id": "task-xxx",
  "status": "executing",
  "phase": "execution",
  "startedAt": "2026-02-20T10:00:00Z",
  "agents": {
    "planner": { "status": "completed" },
    "executor": { "status": "running" },
    "validator": { "status": "pending" }
  }
}
```

### Step 4: 결과 전달
- Telegram으로 완료 메시지
- 스크린샷 첨부
- 변경된 파일 목록
```

### 5.2 Planner Agent Skill

```yaml
# SKILL.md
---
name: dev-team-planner
description: 개발 요청을 분석하고 구현 계획을 수립한다.
---

# Planner Agent

## 역할
1. 요구사항 분석
2. 작업 분해 (Task Decomposition)
3. 구현 계획 문서 생성

## 출력 형식

```markdown
# 구현 계획: [기능명]

## 요구사항
- [ ] 요구사항 1
- [ ] 요구사항 2

## 작업 분해
### Frontend
- [ ] 컴포넌트 A 생성
- [ ] 스타일 적용

### Backend
- [ ] API 엔드포인트 추가
- [ ] 데이터베이스 스키마 수정

## 기술 결정
- 프레임워크: React
- 스타일: Tailwind CSS
- API: REST

## 예상 소요 시간
- Frontend: 30분
- Backend: 20분
- 총: 50분
```
```

### 5.3 Executor Agent Skill

```yaml
# SKILL.md
---
name: dev-team-executor
description: 계획에 따라 코드를 작성하고 구현한다.
---

# Executor Agent

## 역할
1. 계획 문서 읽기
2. 코드 작성
3. 파일 생성/수정
4. 의존성 설치

## 실행 모드

### Frontend Mode
- React/Vue/Next.js 컴포넌트 작성
- Tailwind CSS 스타일링
- 클라이언트 로직 구현

### Backend Mode
- API 엔드포인트 구현
- 데이터베이스 쿼리 작성
- 비즈니스 로직 구현

### Integration Mode
- 외부 API 연동
- 웹훅 구현
- 인증/인가 추가

## 도구 사용
- `write_file`: 새 파일 생성
- `edit_file`: 기존 파일 수정
- `bash`: 패키지 설치, 빌드
```

### 5.4 Validator Agent Skill

```yaml
# SKILL.md
---
name: dev-team-validator
description: 구현된 기능을 브라우저로 테스트하고 검증한다.
---

# Validator Agent

## 역할
1. 개발 서버 시작
2. 브라우저로 접속
3. 기능 테스트
4. 스크린샷 캡처
5. 결과 보고서 작성

## 테스트 절차

### Step 1: 환경 준비
```bash
npm run dev &
sleep 5  # 서버 시작 대기
```

### Step 2: 브라우저 테스트
```typescript
// scripts/browser-test.ts
import { chromium } from 'playwright';

async function validate(url: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // 1. 페이지 로드
  await page.goto(url);
  
  // 2. 스크린샷
  await page.screenshot({ path: '.dev-team/screenshots/01-initial.png' });
  
  // 3. 콘솔 에러 확인
  const errors = await page.evaluate(() => window.__errors || []);
  
  // 4. 기본 동작 테스트
  // (계획에 따른 구체적 테스트)
  
  await browser.close();
  
  return { success: errors.length === 0, errors };
}
```

### Step 3: 결과 보고서
```markdown
# 검증 보고서: [기능명]

## 테스트 결과
✅ 페이지 로드 성공
✅ 콘솔 에러 없음
✅ 기본 동작 정상

## 스크린샷
![Initial Load](screenshots/01-initial.png)

## 발견된 이슈
(없음)
```
```

---

## 6. Telegram 통합

### 6.1 메시지 처리 흐름

```
사용자: "대시보드 만들어줘"
       │
       ▼
┌─────────────────────────────────────┐
│ Telegram Channel                    │
│ (OpenClaw 자체 지원)                │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ dev-team-hook                       │
│ - message:received 이벤트 감지      │
│ - 개발 요청 키워드 매칭             │
│ - Orchestrator Skill 트리거         │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ Orchestrator Skill                  │
│ - Planner → Executor → Validator    │
│ - 상태 관리                         │
│ - 결과 취합                         │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ Telegram 응답                       │
│ "✅ 완료했습니다!                   │
│  📁 변경된 파일: 5개                │
│  📸 스크린샷 첨부                    │
│  📋 보고서: [링크]"                 │
└─────────────────────────────────────┘
```

### 6.2 진행 상황 업데이트 (선택)

```
Orchestrator:
  "🔄 작업 시작: 대시보드 구현"
  
  "📋 Phase 1/4: Planning..."
  "✅ Phase 1 완료"
  
  "🏗️ Phase 2/4: Execution..."
  "✅ Phase 2 완료"
  
  "🧪 Phase 3/4: Validation..."
  "✅ Phase 3 완료"
  
  "📦 Phase 4/4: Delivery..."
  
  "✅ 전체 완료!
   📁 변경된 파일:
   - src/components/Dashboard.tsx
   - src/pages/index.tsx
   - src/styles/dashboard.css
   
   📸 스크린샷: [이미지]"
```

---

## 7. 성공 기준

### MVP (Week 2 완료 시)

- [ ] Telegram으로 개발 요청 가능
- [ ] Planner → Executor → Validator 순서로 실행
- [ ] 브라우저 테스트 수행
- [ ] 스크린샷 포함 결과 전달
- [ ] 기본적인 에러 처리

### 향후 확장 (Week 3-4)

- [ ] Self-Validation Loop (3회 재시도)
- [ ] 진행 상황 실시간 업데이트
- [ ] 다양한 프로젝트 타입 지원
- [ ] 협업 기능 (팀 단위 사용)

---

## 8. 리스크 및 대응

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| OpenClaw API 변경 | 중 | 높 | 공식 문서 기반 개발, 버전 고정 |
| 브라우저 테스트 실패 | 높 | 중 | Fallback 테스트 방법 준비 |
| LLM 응답 지연 | 중 | 중 | 타임아웃 설정, 진행 상황 표시 |
| 권한 문제 | 낮 | 높 | 필요 권한 명시, 가이드 작성 |

---

## 9. 다음 단계

1. **즉시 시작**: 프로젝트 디렉토리 생성
2. **Week 1**: Orchestrator + Planner 구현
3. **Week 2**: Executor + Validator + 통합
4. **Week 3-4**: 안정화 및 확장

**준비되면 "시작해줘"라고 말씀해주세요!**
