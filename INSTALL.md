# OpenClaw Dev Team 설치 가이드

## 설치 방법

### 방법 1: 직접 설치 (권장)

```bash
# 1. 저장소 클론
git clone https://github.com/YOUR_USERNAME/openclaw-dev-team.git
cd openclaw-dev-team

# 2. 설치 스크립트 실행
chmod +x install.sh
./install.sh

# 3. OpenClaw 재시작
openclaw restart
```

### 방법 2: 원클릭 설치

```bash
# GitHub에서 직접 설치
curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/openclaw-dev-team/main/quick-install.sh | bash
```

### 방법 3: 수동 설치

```bash
# Skills 복사
cp -r skills/* ~/.openclaw/skills/

# Hooks 복사
cp -r hooks/* ~/.openclaw/hooks/

# 상태 디렉토리 생성
mkdir -p ~/.openclaw/workspace/dev-team/{state,plans,reports,screenshots,memory}
```

---

## 설치 후 설정

### 1. 컴포넌트 활성화

```bash
# Skills 활성화
openclaw skills enable dev-team-orchestrator
openclaw skills enable dev-team-planner
openclaw skills enable dev-team-executor
openclaw skills enable dev-team-validator

# Hooks 활성화
openclaw hooks enable dev-team-trigger
```

### 2. 설치 확인

```bash
# Skills 확인
openclaw skills list | grep dev-team

# Hooks 확인
openclaw hooks list | grep dev-team
```

### 3. OpenClaw 재시작

```bash
# macOS (메뉴바 앱)
# 메뉴바에서 OpenClaw 아이콘 클릭 → Restart

# 또는 CLI로
openclaw restart
```

---

## 테스트

### Telegram에서 테스트

```
사용자: 대시보드 만들어줘

OpenClaw: 🔄 개발 요청을 감지했습니다. 작업을 시작합니다...
         📋 Phase 1/4: Planning...
         ...
```

### 로그 확인

```bash
# 실시간 로그
tail -f ~/.openclaw/gateway.log | grep dev-team

# 설치된 파일 확인
ls -la ~/.openclaw/skills/ | grep dev-team
ls -la ~/.openclaw/hooks/ | grep dev-team
```

---

## 제거

```bash
cd openclaw-dev-team
./install.sh --uninstall
```

또는 수동으로:

```bash
rm -rf ~/.openclaw/skills/dev-team-*
rm -rf ~/.openclaw/hooks/dev-team-*
```

---

## 문제 해결

### Skills가 보이지 않음

```bash
# 디렉토리 확인
ls -la ~/.openclaw/skills/

# SKILL.md 형식 확인
cat ~/.openclaw/skills/dev-team-orchestrator/SKILL.md
```

### Hooks가 작동하지 않음

```bash
# Hook 상태 확인
openclaw hooks list

# 수동으로 활성화
openclaw hooks enable dev-team-trigger

# OpenClaw 재시작
openclaw restart
```

### 권한 문제

```bash
# 스크립트 실행 권한
chmod +x install.sh

# OpenClaw 디렉토리 권한
chmod -R 755 ~/.openclaw/
```

---

## 파일 위치

| 항목 | 경로 |
|------|------|
| Skills | `~/.openclaw/skills/dev-team-*/` |
| Hooks | `~/.openclaw/hooks/dev-team-trigger/` |
| Workspace | `~/.openclaw/workspace/dev-team/` |
| Logs | `~/.openclaw/logs/` |
