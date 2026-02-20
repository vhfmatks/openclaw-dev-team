---
name: dev-team-orchestrator
description: |
  OpenClaw Dev Team의 메인 오케스트레이터.
  Telegram으로 받은 개발 요청을 분석하고, 적절한 에이전트를 배치하여
  계획 → 실행 → 검증 → 전달 파이프라인을 관리한다.
  
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

## 4단계 파이프라인

### Phase 1: Planning (계획)
- **담당**: Planner Agent (`dev-team-planner`)
- **입력**: 사용자 요청
- **출력**: 구현 계획 문서 (`.dev-team/plans/`)
- **소요**: 전체 작업의 10%

### Phase 2: Execution (실행)
- **담당**: Executor Agents (`dev-team-executor`)
- **입력**: 구현 계획
- **출력**: 작성된 코드 (파일 시스템)
- **소요**: 전체 작업의 60%

### Phase 3: Validation (검증)
- **담당**: Validator Agent (`dev-team-validator`)
- **입력**: 작성된 코드
- **출력**: 테스트 결과, 스크린샷
- **소요**: 전체 작업의 20%

### Phase 4: Delivery (전달)
- **담당**: Orchestrator (이 스킬)
- **입력**: 모든 결과물
- **출력**: Telegram 메시지
- **소요**: 전체 작업의 10%

## 상태 관리

### 상태 파일 구조

```
.dev-team/state/
├── current-task.json     # 현재 작업 상태
├── agent-status.json     # 에이전트 실행 상태
└── pipeline-phase.txt    # 현재 파이프라인 단계
```

### current-task.json 스키마

```json
{
  "id": "task-20260220-001",
  "request": "사용자의 원본 요청",
  "status": "running|completed|failed",
  "phase": "planning|execution|validation|delivery",
  "startedAt": "ISO 타임스탬프",
  "completedAt": "ISO 타임스탬프 | null",
  "plan": {
    "file": ".dev-team/plans/xxx-plan.md",
    "status": "pending|completed"
  },
  "execution": {
    "filesChanged": ["src/..."],
    "status": "pending|running|completed"
  },
  "validation": {
    "passed": true|false,
    "report": ".dev-team/reports/xxx-report.md",
    "screenshots": [".dev-team/screenshots/*.png"]
  }
}
```

## 에이전트 배치 전략

### 요청 타입별 배치

| 요청 타입 | Planner | Executor | Validator |
|----------|---------|----------|-----------|
| **Frontend** | ✓ | Frontend Executor | ✓ |
| **Backend** | ✓ | Backend Executor | ✓ |
| **Fullstack** | ✓ | Frontend + Backend (병렬) | ✓ |
| **Integration** | ✓ | Integration Executor | ✓ |

### 병렬 실행

Fullstack 요청의 경우 Frontend와 Backend Executor를 병렬로 실행합니다.

```
Orchestrator
    │
    ├──▶ Planner (순차)
    │       │
    │       ▼
    ├──▶ Frontend Executor ─┐
    │                       ├─▶ (병렬)
    └──▶ Backend Executor ──┘
            │
            ▼
    Validator (순차)
```

## 사용 예시

### Telegram에서 호출

```
사용자: 대시보드 만들어줘

OpenClaw: 🔄 작업 시작: 대시보드 구현
         
         📋 Phase 1/4: Planning...
         ✅ Phase 1 완료 (계획 문서 생성됨)
         
         🏗️ Phase 2/4: Execution...
         ✅ Phase 2 완료 (5개 파일 변경됨)
         
         🧪 Phase 3/4: Validation...
         ✅ Phase 3 완료 (테스트 통과)
         
         📦 Phase 4/4: Delivery...
         
         ✅ 전체 완료!
         
         📁 변경된 파일:
         • src/components/Dashboard.tsx
         • src/pages/index.tsx
         • src/styles/dashboard.css
         
         📸 스크린샷: [이미지 첨부]
```

## 명령어

### /dev-team status
현재 작업 상태 확인

### /dev-team cancel
진행 중인 작업 취소

### /dev-team retry
마지막 작업 재시도

## 의존성

- `dev-team-planner` Skill
- `dev-team-executor` Skill
- `dev-team-validator` Skill

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
| Planner 실패 | 요청 이해 불가 | 사용자에게 명확화 요청 |
| Executor 실패 | 코드 생성 오류 | 에러 로그 저장, 재시도 |
| Validator 실패 | 테스트 실패 | 결과 보고서 생성 |

### 복구 전략

1. 각 단계에서 실패 시 상태 저장
2. 사용자에게 에러 알림
3. 수동 개입 옵션 제공

## 참고

- [OpenClaw Skills 문서](https://docs.openclaw.ai/tools/skills)
- [oh-my-claudecode 패턴](./03-oh-my-opencode-analysis.md)
