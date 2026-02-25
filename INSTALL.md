# OpenClaw Dev Team 설치 가이드

## 아키텍처 개요

```
┌──────────────────────────────────────────────────────────────────┐
│                     dev-team:orchestrator                         │
│                       (Main Orchestrator)                         │
└──────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Plan Squad  │    │Execution Squad│    │ Review Squad  │
│  planning-squad│───▶│execution-squad│───▶│ review-squad  │
│   Phase 1     │    │   Phase 2     │    │   Phase 3     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                    │                    │
   ┌────┴────┐          ┌────┴────┐         ┌─────┴─────┐
   ▼         ▼          ▼         ▼         ▼     ▼     ▼
Planner   Critic     Coder   Reviewer   Reviewer QA    Final
                      CodeRev Tester            Tester Approver
                      DepMgr
```

---

## 설치 방법

### 방법 1: NPM 스크립트 (권장)

```bash
# 1. 저장소 클론
git clone https://github.com/vhfmatks/openclaw-dev-team.git
cd openclaw-dev-team

# 2. 의존성 설치
npm install

# 3. Skills + Hooks 설치
npm run install:all

# 4. OpenClaw 재시작
openclaw restart
```

### 방법 2: 수동 설치

```bash
# Skills 복사 (폴더명 = skill 이름)
cp -r skills/* ~/.openclaw/skills/

# Hooks 복사
cp -r hooks/* ~/.openclaw/hooks/

# Workspace 디렉토리 생성
mkdir -p ~/.openclaw/workspace/dev-team/{state,plans,reports,screenshots}
```

---

## 설치 후 설정

### 컴포넌트 활성화

```bash
# Orchestrator
openclaw skills enable dev-team:orchestrator
openclaw skills enable dev-team:start

# Plan Squad
openclaw skills enable dev-team:planning-squad
openclaw skills enable dev-team:planning-planner
openclaw skills enable dev-team:planning-critic
openclaw skills enable dev-team:planning-architecture

# Execution Squad
openclaw skills enable dev-team:execution-squad
openclaw skills enable dev-team:execution-coder
openclaw skills enable dev-team:execution-code-reviewer
openclaw skills enable dev-team:execution-tester
openclaw skills enable dev-team:execution-dependency-manager

#BX|# Review Squad (NEW)
openclaw skills enable dev-team:review-squad
openclaw skills enable dev-team:review-reviewer
openclaw skills enable dev-team:review-qa-tester
openclaw skills enable dev-team:review-openclaw-tester  # OpenClaw 고급 기능
openclaw skills enable dev-team:review-final-approver

openclaw skills enable dev-team:review-squad
openclaw skills enable dev-team:review-reviewer
openclaw skills enable dev-team:review-qa-tester
openclaw skills enable dev-team:review-final-approver

# Hooks
openclaw hooks enable dev-team-trigger
```

### 설치 확인

```bash
# Skills 확인
openclaw skills list | grep dev-team

# Hooks 확인
openclaw hooks list | grep dev-team
```

---

#QH|## Skills 목록 (22개)

### 🎯 Orchestrator (2)
| Skill | 설명 |
|-------|------|
| `dev-team:orchestrator` | 전체 파이프라인 조율 |
| `dev-team:start` | 진입점 - 프로젝트 생성 및 파이프라인 시작 |

### 📋 Plan Squad (4)
| Skill | 설명 |
|-------|------|
| `dev-team:planning-squad` | Squad Leader |
| `dev-team:planning-planner` | 요구사항 분석, 계획 수립 |
| `dev-team:planning-critic` | 계획 검수, reject/rework |
| `dev-team:planning-architecture` | 인프라/아키텍처 설계 (선택) |

### 💻 Execution Squad (5)
| Skill | 설명 |
|-------|------|
| `dev-team:execution-squad` | Squad Leader |
| `dev-team:execution-coder` | 코드 생성 |
| `dev-team:execution-code-reviewer` | 정적 분석, 코드 검수 |
| `dev-team:execution-tester` | 테스트 실행 |
| `dev-team:execution-dependency-manager` | 패키지 설치 (선택) |

#PY|### ✅ Review Squad (5) - NEW
| Skill | 설명 |
|-------|------|
| `dev-team:review-squad` | Squad Leader, 모드 결정 |
| `dev-team:review-reviewer` | 요구사항↔계획↔구현 검수 |
| `dev-team:review-qa-tester` | Human-like 테스트 (Browser/CLI) |
| `dev-team:review-openclaw-tester` | Self-healing, 자연어 테스트 (선택) |
| `dev-team:review-final-approver` | 승인/반려, 자동 routing |
| Skill | 설명 |
|-------|------|
| `dev-team:review-squad` | Squad Leader, 모드 결정 |
| `dev-team:review-reviewer` | 요구사항↔계획↔구현 검수 |
| `dev-team:review-qa-tester` | Human-like 테스트 (Browser/CLI) |
| `dev-team:review-final-approver` | 승인/반려, 자동 routing |

### ⚠️ Deprecated (1)
| Skill | 상태 |
|-------|------|
| `dev-team:validation-validator` | ~~DEPRECATED~~ → `review-qa-tester` |

---

## 파이프라인 플로우

```
Phase 1          Phase 2           Phase 3           Phase 4
┌────────┐      ┌────────┐        ┌────────┐        ┌────────┐
│  Plan  │ ───▶ │Execute │ ─────▶ │ Review │ ─────▶ │Delivery│
│ Squad  │      │ Squad  │        │ Squad  │        │        │
└────────┘      └────────┘        └────────┘        └────────┘
     │               │                  │
     ▼               ▼                  ▼
  Rework          Rework            Routing
  (max 3)         (max 3)           ┌─────┴─────┐
                                    ▼           ▼
                              → Planner    → Executor
```

### Review Squad 동작 모드

| Mode | 구성 | 사용 케이스 |
|------|------|------------|
| **Basic** | Reviewer만 | 단순 수정, 스타일 변경, 1-2개 파일 |
| **Full** | Reviewer + QA Tester + Final Approver | 기능 추가/변경, 3개 이상 파일 |

### Routing 규칙 (반려 시)

| 반려 사유 | Route To |
|----------|----------|
| `missing_feature` | Planner |
| `plan_deviation` | Planner |
| `incomplete_implementation` | Executor |
| QA 테스트 실패 | Executor |

---

## 테스트

### Telegram에서 테스트

```
사용자: 대시보드 만들어줘

OpenClaw: 🔄 개발 요청을 감지했습니다. 작업을 시작합니다...
         📋 Phase 1/5: Planning...
         💻 Phase 2/5: Execution...
         ✅ Phase 3/5: Review...
         🚀 Phase 4/5: Delivery
```

### 로그 확인

```bash
# 실시간 로그
tail -f ~/.openclaw/gateway.log | grep dev-team

# 파이프라인 로그
cat ~/.openclaw/workspace/dev-team/pipeline-log.jsonl
```

---

## Docker 환경

```bash
# Docker용 skills/hooks 복사
cp -r skills/* docker/skills/
cp -r hooks/* docker/hooks/

# 컨테이너 (재)시작
cd docker
docker compose up -d

# Skills 확인
docker exec openclaw-dev-team-gateway node dist/index.js skills | grep dev-team
```

---

## 문제 해결

### Skills가 보이지 않음

```bash
# 디렉토리 확인
ls -la ~/.openclaw/skills/ | grep -E "orchestrator|squad|reviewer"

# SKILL.md 형식 확인
cat ~/.openclaw/skills/review-squad/SKILL.md | head -10
```

### Canvas 접속 시 Unauthorized

```bash
# 1) Control UI 접속: http://localhost:18789/
# 2) gateway token 확인
openclaw config get gateway.auth.token

# Settings에서 token 입력 후 연결
```

### disconnected (1008): pairing required

```bash
# pending 요청 확인
openclaw devices list

# 승인
openclaw devices approve --latest
```

---

## 제거

```bash
# Skills 제거
rm -rf ~/.openclaw/skills/orchestrator
rm -rf ~/.openclaw/skills/plan-squad
rm -rf ~/.openclaw/skills/execution-squad
rm -rf ~/.openclaw/skills/review-squad
rm -rf ~/.openclaw/skills/reviewer
rm -rf ~/.openclaw/skills/qa-tester
rm -rf ~/.openclaw/skills/final-approver
rm -rf ~/.openclaw/skills/dev-team-start
rm -rf ~/.openclaw/skills/planner
rm -rf ~/.openclaw/skills/critic
rm -rf ~/.openclaw/skills/architecture
#TX|rm -rf ~/.openclaw/skills/coder
#YT|rm -rf ~/.openclaw/skills/code-reviewer
#WH|rm -rf ~/.openclaw/skills/tester
#TR|rm -rf ~/.openclaw/skills/dependency-manager
#XW|rm -rf ~/.openclaw/skills/validator
#YM|rm -rf ~/.openclaw/skills/openclaw-tester
rm -rf ~/.openclaw/skills/code-reviewer
rm -rf ~/.openclaw/skills/tester
rm -rf ~/.openclaw/skills/dependency-manager
rm -rf ~/.openclaw/skills/validator

# Hooks 제거
rm -rf ~/.openclaw/hooks/dev-team-trigger

# OpenClaw 재시작
openclaw restart
```

---

## 파일 위치

| 항목 | 경로 |
|------|------|
| Skills | `~/.openclaw/skills/*/` |
| Hooks | `~/.openclaw/hooks/dev-team-trigger/` |
| Workspace | `~/.openclaw/workspace/dev-team/` |
| Pipeline Log | `~/.openclaw/workspace/dev-team/pipeline-log.jsonl` |
| Logs | `~/.openclaw/gateway.log` |
