# OpenClaw Dev Team 구성 제안서

## 1. 개요

본 문서는 OpenClaw 프로젝트를 위한 AI 기반 개발 팀(Dev Team) 구성안을 제안합니다. 앞서 조사한 oh-my-claudecode, AAA Coding 사례를 바탕으로 OpenClaw의 특성에 맞는 팀 구조를 설계합니다.

## 2. OpenClaw 특성 분석

### 2.1 비즈니스 도메인
- **법률/법무 자동화**: 문서 검토, 기한 추적, 클라이언트 커뮤니케이션
- **이메일/캘린더 통합**: 외부 API 연동 필요
- **자율형 에이전트**: 독립적 의사결정 및 작업 수행

### 2.2 기술적 요구사항
| 영역 | 요구사항 |
|------|----------|
| 프론트엔드 | 대시보드, 관리자 UI |
| 백엔드 | API 서버, 워커 |
| AI/ML | 문서 분석, 자연어 처리 |
| 통합 | 이메일, 캘린더, 외부 API |
| 보안 | 법률 데이터 보호, 접근 제어 |

## 3. 팀 구조 제안

### 3.1 계층형 + 스웜 하이브리드 모델

```
                    ┌──────────────────────┐
                    │   Lead Orchestrator   │
                    │   (Sisyphus-like)     │
                    └──────────┬───────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
   ┌─────▼─────┐         ┌─────▼─────┐         ┌─────▼─────┐
   │ Planning  │         │Execution  │         │   QA &    │
   │   Squad   │         │   Squad   │         │  Review   │
   └─────┬─────┘         └─────┬─────┘         └─────┬─────┘
         │                     │                     │
    ┌────┴────┐           ┌────┴────┐           ┌────┴────┐
    │         │           │         │           │         │
┌───▼───┐ ┌───▼───┐   ┌───▼───┐ ┌───▼───┐   ┌───▼───┐ ┌───▼───┐
│Analyst│ │Planner│   │Frontend│ │Backend│   │Tester │ │Reviewer│
└───────┘ └───────┘   │Designer│ │ Dev   │   └───────┘ └───────┘
                      └───────┘ └───────┘
```

### 3.2 에이전트 역할 정의

#### A. 리더 계층

| 에이전트 | 모델 | 책임 |
|---------|------|------|
| **Orchestrator** | Opus | 전체 조율, 작업 분배, 완료 검증 |
| **Project Manager** | Sonnet | 진행 추적, 장애물 관리 |

#### B. 기획 스쿼드 (Planning Squad)

| 에이전트 | 모델 | 책임 | 주요 도구 |
|---------|------|------|----------|
| **Analyst** | Opus | 요구사항 분석, 명세 작성 | Research, LSP |
| **Architect** | Opus | 설계, 기술 결정 | LSP, AST-grep |
| **Legal Domain Expert** | Sonnet | 법률 도메인 지식, 컴플라이언스 | Research |

#### C. 실행 스쿼드 (Execution Squad)

| 에이전트 | 모델 | 책임 | 주요 도구 |
|---------|------|------|----------|
| **Frontend Designer** | Sonnet | UI/UX, 컴포넌트 | Edit, AST |
| **Backend Developer** | Sonnet | API, 비즈니스 로직 | Edit, Write |
| **Integration Specialist** | Sonnet | 외부 API 연동 | HTTP, MCP |
| **AI/ML Engineer** | Opus | 문서 분석, NLP | Python REPL |

#### D. QA & 리뷰 스쿼드

| 에이전트 | 모델 | 책임 | 주요 도구 |
|---------|------|------|----------|
| **QA Tester** | Sonnet | 테스트, 검증 | Bash, Test Runner |
| **Code Reviewer** | Opus | 코드 품질, 패턴 검사 | LSP, AST |
| **Security Reviewer** | Opus | 보안 감사 | LSP, Research |

#### E. 지원 에이전트

| 에이전트 | 모델 | 책임 |
|---------|------|------|
| **Researcher** | Sonnet | 정보 수집, 문서 탐색 |
| **Documenter** | Haiku | 문서화, 주석 |
| **Build Fixer** | Sonnet | 빌드 에러 수정 |

### 3.3 스킬 시스템

#### 코어 스킬
```yaml
skills:
  - name: openclaw-orchestration
    description: OpenClaw 전용 오케스트레이션
    triggers: ["openclaw", "legal", "automation"]
    
  - name: legal-document-processing
    description: 법률 문서 처리
    triggers: ["contract", "legal doc", "compliance"]
    
  - name: email-calendar-integration
    description: 이메일/캘린더 통합
    triggers: ["email", "calendar", "notification"]
```

#### 전문 스킬
```yaml
skills:
  - name: frontend-design
    description: UI/UX 디자인
    inherits: frontend-ui-ux
    
  - name: git-workflow
    description: Git 작업 흐름
    inherits: git-master
    
  - name: tdd-development
    description: 테스트 주도 개발
    inherits: tdd
```

## 4. 실행 모드

### 4.1 모드 정의

| 모드 | 키워드 | 설명 | 사용 시나리오 |
|------|--------|------|--------------|
| **Autopilot** | "autopilot", "build" | 완전 자율 | 새 기능 개발 |
| **Legal Assist** | "legal", "document" | 법률 문서 특화 | 문서 분석 |
| **Integration** | "integrate", "connect" | 외부 연동 | API 통합 |
| **Security Audit** | "audit", "security" | 보안 검사 | 정기 감사 |
| **Bug Fix** | "fix", "debug" | 버그 수정 | 핫픽스 |

### 4.2 워크플로우 예시

#### 새 기능 개발 (Autopilot)
```
1. Analyst: 요구사항 분석
   ↓
2. Architect: 설계 및 기술 결정
   ↓
3. Frontend + Backend (병렬): 구현
   ↓
4. QA Tester: 테스트
   ↓
5. Code Reviewer: 리뷰
   ↓
6. Orchestrator: 완료 검증
```

#### 법률 문서 처리 (Legal Assist)
```
1. Legal Domain Expert: 문서 유형 파악
   ↓
2. AI/ML Engineer: 분석 모델 적용
   ↓
3. Backend Developer: 처리 파이프라인 구현
   ↓
4. Security Reviewer: 데이터 보호 검증
   ↓
5. QA Tester: 정확도 테스트
```

## 5. 기술 스택

### 5.1 오케스트레이션 레이어
```
┌─────────────────────────────────────────────────────┐
│                 OpenClaw Dev Team                    │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐│
│  │              Orchestrator Core                  ││
│  │  - State Management (.omc/state/)              ││
│  │  - Task Queue (Redis/SQLite)                   ││
│  │  - Communication (Message Bus)                 ││
│  └─────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐│
│  │              Agent Runtime                      ││
│  │  - Claude (Opus/Sonnet/Haiku)                  ││
│  │  - MCP Servers                                 ││
│  │  - Tools (LSP, AST, Bash)                      ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

### 5.2 상태 관리
```
.openclaw-dev-team/
├── .omc/
│   ├── state/
│   │   ├── orchestrator-state.json
│   │   ├── squad-state.json
│   │   └── task-queue.json
│   ├── notepads/
│   │   ├── learnings.md
│   │   ├── decisions.md
│   │   └── issues.md
│   └── logs/
│       └── delegation-audit.jsonl
├── CLAUDE.md
└── AGENTS.md
```

## 6. 품질 게이트

### 6.1 완료 기준 (Definition of Done)
- [ ] 모든 테스트 통과
- [ ] 코드 리뷰 승인
- [ ] 보안 검사 통과
- [ ] 문서 업데이트
- [ ] Orchestrator 최종 승인

### 6.2 검증 체크포인트
```
Task Start
    │
    ▼
┌─────────┐
│ Planning│ ──▶ Architect Approval?
└────┬────┘       │ No → Revise
     │ Yes        │
     ▼            │
┌─────────┐       │
│Execution│ ──────┘
└────┬────┘
     │
     ▼
┌─────────┐
│   QA    │ ──▶ Tests Pass?
└────┬────┘       │ No → Fix
     │ Yes        │
     ▼            │
┌─────────┐       │
│ Review  │ ──────┘
└────┬────┘
     │
     ▼
┌─────────┐
│Security │ ──▶ Security Pass?
└────┬────┘       │ No → Fix
     │ Yes        │
     ▼            │
┌─────────┐       │
│Complete │ ──────┘
└─────────┘
```

## 7. 시작하기

### 7.1 초기 설정
```bash
# 1. 프로젝트 클론
git clone https://github.com/openclaw/openclaw-dev-team

# 2. oh-my-claudecode 설치
npm install -g oh-my-claudecode

# 3. 초기화
/oh-my-claudecode:omc-setup

# 4. OpenClaw 스킬 로드
/openclaw-dev-team:init
```

### 7.2 첫 작업
```
User: "autopilot: Build a contract review dashboard"

Orchestrator:
  → Analyst: Analyze requirements
  → Architect: Design system
  → Frontend + Backend: Implement (parallel)
  → QA: Test
  → Reviewer: Approve
  → Complete ✓
```

## 8. 마일스톤

### Phase 1: 기반 구축 (2주)
- [ ] Orchestrator 구현
- [ ] 에이전트 정의
- [ ] 기본 스킬 구성

### Phase 2: 핵심 기능 (4주)
- [ ] 법률 문서 처리 파이프라인
- [ ] 이메일/캘린더 통합
- [ ] 대시보드 UI

### Phase 3: 고급 기능 (4주)
- [ ] AI 문서 분석
- [ ] 자동화 워크플로우
- [ ] 보안 강화

### Phase 4: 운영 (지속)
- [ ] 모니터링
- [ ] 최적화
- [ ] 확장

## 9. 참고 자료

- [01-openclaw-overview.md](./01-openclaw-overview.md)
- [02-dev-team-composition-ideas.md](./02-dev-team-composition-ideas.md)
- [03-oh-my-opencode-analysis.md](./03-oh-my-opencode-analysis.md)
- [04-aaa-coding-efforts.md](./04-aaa-coding-efforts.md)

---

**작성일**: 2026-02-20  
**버전**: 1.0  
**상태**: 제안서 (Proposal)
