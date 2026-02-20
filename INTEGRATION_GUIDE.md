# OpenClaw Dev Team 통합 가이드

## 빠른 시작

### 1. 사전 요구사항

- OpenClaw 설치됨 (v1.0+)
- Node.js 18+
- Telegram 채널 설정됨

### 2. 설치

```bash
# 저장소 클론
git clone <repo-url>
cd openclaw-dev-team

# 의존성 설치
npm install

# Skills와 Hooks를 OpenClaw에 설치
npm run install:all
```

### 3. 설정

```bash
# 환경 변수 복사
cp .env.example .env

# 필요한 경우 .env 편집
vim .env
```

### 4. 활성화

```bash
# Hook 활성화
openclaw hooks enable dev-team-trigger

# Skills 활성화
openclaw skills enable dev-team-orchestrator
openclaw skills enable dev-team-planner
openclaw skills enable dev-team-executor
openclaw skills enable dev-team-validator

# 상태 확인
openclaw hooks check
openclaw skills list
```

### 5. 테스트

Telegram에서 메시지 전송:
```
대시보드 만들어줘
```

예상 응답:
```
🔄 개발 요청을 감지했습니다. 작업을 시작합니다...

📋 Phase 1/4: Planning...
✅ Phase 1 완료

🏗️ Phase 2/4: Execution...
✅ Phase 2 완료

🧪 Phase 3/4: Validation...
✅ Phase 3 완료

📦 Phase 4/4: Delivery...

✅ 전체 완료!
📁 변경된 파일: ...
📸 스크린샷: [이미지]
```

---

## 상세 설치

### 수동 설치

```bash
# Skills 복사
cp -r skills/orchestrator ~/.openclaw/skills/
cp -r skills/planner ~/.openclaw/skills/
cp -r skills/executor ~/.openclaw/skills/
cp -r skills/validator ~/.openclaw/skills/

# Hooks 복사
cp -r hooks/dev-team-trigger ~/.openclaw/hooks/
```

### 디렉토리 구조 확인

```
~/.openclaw/
├── skills/
│   ├── dev-team-orchestrator/
│   │   └── SKILL.md
│   ├── dev-team-planner/
│   │   └── SKILL.md
│   ├── dev-team-executor/
│   │   └── SKILL.md
│   └── dev-team-validator/
│       └── SKILL.md
└── hooks/
    └── dev-team-trigger/
        └── HOOK.md
```

---

## 사용법

### 기본 사용

Telegram에서 개발 요청:

```
[요청]              [예시]
─────────────────────────────────────
만들어줘            "로그인 페이지 만들어줘"
구현해줘            "API 구현해줘"
개발해줘            "대시보드 개발해줘"
추가해줘            "검색 기능 추가해줘"
수정해줘            "버튼 스타일 수정해줘"
고쳐줘              "로그인 버그 고쳐줘"
```

### 영어 요청

```
build me a dashboard
create a login page
implement the API
add search feature
fix the bug
refactor the code
```

### 상태 확인

```
/dev-team status
```

### 작업 취소

```
/dev-team cancel
```

---

## 워크플로우 상세

### Phase 1: Planning

**입력**: 사용자 요청

**처리**:
1. 요구사항 분석
2. 작업 분해
3. 기술 결정
4. 계획 문서 생성

**출력**: `.dev-team/plans/YYYY-MM-DD-HH-MM-slug.md`

```markdown
# 구현 계획: 대시보드

## 요구사항
- [ ] 차트 표시
- [ ] 필터 기능
- [ ] 실시간 업데이트

## 작업 분해
### Frontend
- [ ] Dashboard 컴포넌트
- [ ] Chart 컴포넌트
- [ ] Filter 컴포넌트

### Backend
- [ ] /api/dashboard 엔드포인트
- [ ] 데이터 집계 로직

## 기술 결정
- Chart: Recharts
- 상태관리: Zustand
```

### Phase 2: Execution

**입력**: 계획 문서

**처리**:
1. 계획 파싱
2. 코드 생성
3. 파일 작성
4. 의존성 설치

**출력**: 변경된 파일들

```
src/
├── components/
│   ├── Dashboard.tsx (생성)
│   ├── Chart.tsx (생성)
│   └── Filter.tsx (생성)
├── pages/
│   └── dashboard.tsx (생성)
└── api/
    └── dashboard/
        └── route.ts (생성)
```

### Phase 3: Validation

**입력**: 작성된 코드

**처리**:
1. 개발 서버 시작
2. 브라우저 테스트
3. 스크린샷 캡처
4. 결과 보고

**출력**: `.dev-team/reports/YYYY-MM-DD-HH-MM-slug.md`

```markdown
# 검증 보고서

## 요약
- 상태: ✅ PASSED
- 총 시나리오: 3
- 통과: 3
- 실패: 0

## 스크린샷
![Initial](screenshots/01.png)
```

### Phase 4: Delivery

**입력**: 모든 결과물

**처리**:
1. 결과 취합
2. 메시지 포맷팅
3. Telegram 전송

**출력**: 사용자에게 전달되는 메시지

---

## 설정 옵션

### 환경 변수

```bash
# .env

# Orchestrator
DEV_TEAM_MAX_RETRIES=3        # 최대 재시도 횟수
DEV_TEAM_TIMEOUT=3600000      # 전체 타임아웃 (ms)
DEV_TEAM_ENABLE_SCREENSHOTS=true

# Planner
PLANNER_MODEL=claude-3-opus   # 사용할 모델
PLANNER_MAX_TOKENS=4000       # 최대 토큰

# Executor
EXECUTOR_MODEL=claude-3-sonnet
EXECUTOR_TIMEOUT=1800000

# Validator
VALIDATOR_DEV_SERVER_COMMAND=npm run dev
VALIDATOR_DEV_SERVER_URL=http://localhost:3000
VALIDATOR_TIMEOUT=30000
```

### OpenClaw 설정

```json
// ~/.openclaw/openclaw.json
{
  "skills": {
    "dev-team-orchestrator": { "enabled": true },
    "dev-team-planner": { "enabled": true },
    "dev-team-executor": { "enabled": true },
    "dev-team-validator": { "enabled": true }
  },
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "dev-team-trigger": { "enabled": true }
      }
    }
  }
}
```

---

## 문제 해결

### Hook이 작동하지 않음

```bash
# Hook 상태 확인
openclaw hooks list

# 로그 확인
tail -f ~/.openclaw/gateway.log | grep "dev-team"

# 재활성화
openclaw hooks disable dev-team-trigger
openclaw hooks enable dev-team-trigger

# OpenClaw 재시작
```

### Skill이 로드되지 않음

```bash
# Skills 목록 확인
openclaw skills list

# 경로 확인
ls -la ~/.openclaw/skills/

# SKILL.md 형식 확인
cat ~/.openclaw/skills/dev-team-orchestrator/SKILL.md
```

### 브라우저 테스트 실패

```bash
# Playwright 설치 확인
npx playwright --version

# 브라우저 설치
npx playwright install

# 수동 테스트
npx playwright test
```

### 상태 파일 손상

```bash
# 상태 초기화
rm .dev-team/state/*.json

# 기본 상태 복원
cp .dev-team/state/current-task.json.backup .dev-team/state/current-task.json
```

---

## 고급 사용

### 커스텀 키워드 추가

`hooks/dev-team-trigger/HOOK.md` 수정:

```typescript
const DEV_KEYWORDS = [
  // 기존 키워드...
  '내 키워드',  // 추가
  'my keyword'  // 추가
];
```

### 특정 사용자만 허용

```typescript
const ALLOWED_USERS = ['+1234567890'];

if (!ALLOWED_USERS.includes(event.context.from)) {
  return;
}
```

### 프로젝트별 설정

```
project/
├── .dev-team/
│   └── config.json    # 프로젝트별 설정
└── ...
```

---

## 로그 및 디버깅

### 로그 위치

```
~/.openclaw/logs/
├── gateway.log           # OpenClaw 게이트웨이 로그
└── commands.log          # 명령어 로그

.dev-team/
├── state/
│   └── current-task.json # 현재 작업 상태
└── reports/
    └── *.md              # 검증 보고서
```

### 실시간 로그

```bash
# OpenClaw 로그
tail -f ~/.openclaw/gateway.log

# Dev Team 로그만
tail -f ~/.openclaw/gateway.log | grep "dev-team"
```

---

## 다음 단계

1. **MVP 테스트**: 간단한 요청으로 테스트
2. **커스터마이징**: 프로젝트에 맞게 설정 조정
3. **확장**: 추가 기능 구현 (Self-Validation Loop 등)

---

## 지원

- 이슈: GitHub Issues
- 문서: `docs/research-result/`
