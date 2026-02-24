---
name: dev-team:orchestrator
description: |
  OpenClaw Dev Team의 메인 오케스트레이터.
  Telegram으로 받은 개발 요청을 분석하고, 적절한 에이전트를 배치하여
  계획 → 실행 → 검수 → 전달 파이프라인을 관리한다.
  Review Squad의 반려 시 Planner/Executor로 자동 routing한다.
  
  트리거: "만들어줘", "구현해줘", "개발해줘", "build", "implement"
---

# Dev Team Orchestrator

## 개요

이 스킬은 OpenClaw Dev Team의 중앙 제어 역할을 합니다. 사용자의 개발 요청을 받아
적절한 워크플로우를 실행하고 결과를 취합하여 전달합니다.

## 워크플로우

```
요청 수신 → 분석 → 에이전트 배치 → 실행 → 취합 → 전달
```

## 5단계 파이프라인

### Phase 1: Planning (계획)
- **담당**: Plan Squad (`dev-team:planning-squad`)
- **구성**: Squad Leader + Planner + Critic (+ Architecture, 선택적)
- **입력**: 사용자 요청
- **출력**: 구조화된 구현 계획 (JSON)
- **소요**: 전체 작업의 10%
- **특징**: Critic 검수 후 최대 3회 Rework 루프

### Phase 2: Execution (실행)
- **담당**: Execution Squad (`dev-team:execution-squad`)
- **구성**: Squad Leader + Coder + CodeReviewer + Tester (+ DependencyManager)
- **입력**: 구현 계획
- **출력**: 작성된 코드 (파일 시스템)
- **소요**: 전체 작업의 40%

### Phase 3: Review (검수)
- **담당**: Review Squad (`dev-team:review-squad`)
- **구성**: Squad Leader + Reviewer (+ QA Tester + Final Approver)
- **입력**: 원본 요청 + 계획 + 실행 결과
- **출력**: 승인/반려 + Routing
- **소요**: 전체 작업의 25%
- **특징**: Human-like QA 테스트, 자동 Routing
- **Routing**: 반려 시 Planner 또는 Executor로 복귀

### Phase 4: Delivery (전달)
- **담당**: Orchestrator (이 스킬)
- **입력**: 모든 결과물
- **출력**: Telegram 메시지
- **소요**: 전체 작업의 5%

### Routing Flow (반려 시)

```
Review Squad
    │
    ├── 승인 (approved) ──▶ Delivery
    │
    └── 반려 (rejected)
            │
            ├── routeTo: planner ──▶ Phase 1 (Planning) 재실행
            │
            └── routeTo: executor ──▶ Phase 2 (Execution) 재실행
```

## 상태 관리

### 상태 파일 구조

```
.dev-team/
├── pipeline-log.jsonl    # 전체 파이프라인 실행 이력 (JSONL)
├── state/
│   ├── current-task.json # 현재 작업 상태
│   └── pipeline-phase.txt
├── plans/
├── reports/
├── screenshots/
└── memory/
```

### Pipeline Log (pipeline-log.jsonl)

모든 실행 이력, 의사결정, 단계 전환을 추적합니다.

**이벤트 기록 규칙:**

```bash
LOG=".dev-team/pipeline-log.jsonl"

log_event() {
  echo "{\"ts\":\"$(date -Iseconds)\",$1}" >> "$LOG"
}

# 파이프라인 시작
log_event '"event":"pipeline:start","task_id":"task-001","request":"대시보드 만들어줘"'

# Phase 진입
log_event '"event":"phase:enter","phase":"planning","agent":"dev-team:planning-squad"'

# Plan Squad 이벤트
log_event '"event":"squad:start","mode":"medium","members":["planner","critic"]'
log_event '"event":"critic:review","result":"reject","issues":2'
log_event '"event":"rework:start","iteration":1'
log_event '"event":"critic:review","result":"pass"'
log_event '"event":"squad:complete","status":"success","iterations":1'

# 의사결정 (중요!)
log_event '"event":"decision","phase":"planning","category":"tech_stack","choice":"react","reason":"간단한 UI 앱"'

# Phase 완료
log_event '"event":"phase:complete","phase":"planning","status":"success"'

# Review Squad 이벤트
log_event '"event":"phase:enter","phase":"review","agent":"dev-team:review-squad"'
log_event '"event":"approver:result","status":"approved","routeTo":"delivery"'

# 파이프라인 완료
log_event '"event":"pipeline:complete","status":"success","duration":"3m20s"'
```

**조회 명령어:**

```bash
# 전체 이력 테이블로 보기
cat .dev-team/pipeline-log.jsonl | jq -r '[.ts[11:19], .event, (.phase // "-"), (.choice // "-")] | @tsv' | column -t

# 의사결정만 보기
cat .dev-team/pipeline-log.jsonl | jq 'select(.event == "decision")'

# 현재 phase 확인
cat .dev-team/pipeline-log.jsonl | jq -r 'select(.event | startswith("phase")) | .phase' | tail -1
```

### current-task.json 스키마

```json
{
  "id": "task-20260220-001",
  "request": "사용자의 원본 요청",
  "status": "running|completed|failed",
  "phase": "planning|execution|review|delivery",
  "startedAt": "ISO 타임스탬프",
  "completedAt": "ISO 타임스탬프 | null",
  "iterations": {
    "planning": 0,
    "execution": 0,
    "review": 0
  },
  "plan": {
    "file": ".dev-team/plans/xxx-plan.md",
    "status": "pending|completed"
  },
  "execution": {
    "filesChanged": ["src/..."],
    "status": "pending|running|completed"
  },
  "review": {
    "status": "pending|approved|rejected",
    "routeTo": "planner|executor|delivery|null",
    "report": ".dev-team/reports/xxx-review.md",
    "screenshots": [".dev-team/screenshots/*.png"]
  }
}
```

## 에이전트 배치 전략

### 요청 타입별 배치

| 요청 타입 | Plan Squad | Execution Squad | Review Squad |
|----------|------------|-----------------|-------------|
| **Simple** | Planner만 | Coder만 | Reviewer만 (Basic) |
| **Medium** | Planner + Critic | Coder + Reviewer + Tester | Reviewer + QA + Approver (Full) |
| **Complex** | Planner + Critic + Architecture | Full Team | Full Team |

### 파이프라인 흐름

```
Orchestrator
    │
    ├──▶ Phase 1: Plan Squad
    │       │
    │       ├──▶ Planner ←──────┐
    │       │     ↕ 피드백      │ 상호협력
    │       ├──▶ Architecture ──┘
    │       │
    │       └──▶ Critic (검수)
    │             └── reject → Rework (최대 3회)
    │
    ├──▶ Phase 2: Execution Squad
    │       │
    │       ├──▶ Coder
    │       │
    │       ├──▶ CodeReviewer ──┐
    │       │                     │
    │       └──▶ Tester ─────────┤ Rework (최대 3회)
    │                             │
    │       ◀── reject ──────────┘
    │
    ├──▶ Phase 3: Review Squad
    │       │
    │       ├──▶ Reviewer (요구사항 검수)
    │       │
    │       ├──▶ QA Tester (Human-like 테스트)
    │       │
    │       └──▶ Final Approver
    │             │
    │             ├── approved ──▶ Phase 4: Delivery
    │             │
    │             └── rejected
    │                   │
    │                   ├── routeTo: planner ──▶ Phase 1
    │                   │
    │                   └── routeTo: executor ──▶ Phase 2
    │
    └──▶ Phase 4: Delivery
            │
            └──▶ Telegram 메시지
```

## 사용 예시

### Telegram에서 호출 (성공)

```
사용자: 대시보드 만들어줘

OpenClaw: 🔄 작업 시작: 대시보드 구현
         
         📋 Phase 1/4: Planning...
         ✅ Phase 1 완료 (계획 문서 생성됨)
         
         🏗️ Phase 2/4: Execution...
         ✅ Phase 2 완료 (5개 파일 변경됨)
         
         🔍 Phase 3/4: Review...
         ✅ Phase 3 완료 (승인됨, Grade: A)
         
         📦 Phase 4/4: Delivery...
         
         ✅ 전체 완료!
         
         📁 변경된 파일:
         • src/components/Dashboard.tsx
         • src/pages/index.tsx
         • src/styles/dashboard.css
         
         📸 스크린샷: [이미지 첨부]
```

### Routing 예시 (반려 → 재실행)

```
OpenClaw: 🔍 Phase 3/4: Review...
         ⚠️ Phase 3 반려 (routeTo: executor)
         
         📋 이슈:
         • [QA] 로그인 버튼 클릭 시 에러 발생
         • [Reviewer] 에러 처리 코드 누락
         
         🔄 Phase 2/4: Execution (재시도 1/3)...
         ✅ Phase 2 완료 (수정됨)
         
         🔍 Phase 3/4: Review...
         ✅ Phase 3 완료 (승인됨, Grade: B)
```

## 명령어

### /dev-team status
현재 작업 상태 확인

### /dev-team cancel
진행 중인 작업 취소

### /dev-team retry
마지막 작업 재시도

## 의존성

### Plan Squad
- `dev-team:planning-squad` Skill (Squad Leader)
  - `dev-team:planning-planner` Skill (Squad Member)
  - `dev-team:planning-critic` Skill (Squad Member)
  - `dev-team:planning-architecture` Skill (Squad Member, 선택적)

### Execution Squad
- `dev-team:execution-squad` Skill (Squad Leader)
  - `dev-team:execution-coder` Skill (Squad Member)
  - `dev-team:execution-code-reviewer` Skill (Squad Member)
  - `dev-team:execution-tester` Skill (Squad Member)
  - `dev-team:execution-dependency-manager` Skill (Squad Member, 선택적)

### Review Squad
- `dev-team:review-squad` Skill (Squad Leader)
  - `dev-team:review-reviewer` Skill (Squad Member)
  - `dev-team:review-qa-tester` Skill (Squad Member, Full 모드)
  - `dev-team:review-final-approver` Skill (Squad Member, Full 모드)

## 설정

```json
{
  "devTeam": {
    "maxRetries": 3,
    "timeout": 3600000,
    "enableScreenshots": true,
    "reportFormat": "markdown"
  }
}
```

## 에러 처리

### 일반적인 에러

| 에러 | 원인 | 해결 |
|------|------|------|
| Plan Squad 실패 | 요청 이해 불가 | 사용자에게 명확화 요청 |
| Critic 3회 reject | 요구사항 모순 | Squad Leader 중재 |
| Execution Squad 실패 | 코드 생성 오류 | 에러 로그 저장, 재시도 |
| Review Squad 반려 | 요구사항 미충족 | Planner/Executor로 routing |
| 3회 Rework 초과 | 근본적 문제 | 사용자 개입 요청 |

### Rework 루프

각 Squad는 최대 3회까지 Rework를 수행합니다.

```
Plan Squad: Planner → Critic → reject → Rework (최대 3회) → Leader 중재

Execution Squad: Coder → Reviewer/Tester → reject → Rework (최대 3회) → Leader 중재

Review Squad: 반려 → routeTo 결정 → 해당 Phase로 복귀 (최대 3회) → 사용자 확인
```

### 복구 전략

1. 각 단계에서 실패 시 상태 저장
2. 사용자에게 에러 알림
3. 수동 개입 옵션 제공

## 참고

- [OpenClaw Skills 문서](https://docs.openclaw.ai/tools/skills)
- [oh-my-claudecode 패턴](./03-oh-my-opencode-analysis.md)
