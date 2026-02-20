# OpenClaw Dev Team - Docker Testing Environment

Docker를 사용하여 격리된 환경에서 OpenClaw Dev Team을 테스트합니다.

## 사전 요구사항

- Docker 설치됨
- Docker Compose 설치됨
- Anthropic API Key

## 빠른 시작

```bash
# 1. Docker 디렉토리로 이동
cd docker

# 2. API 키 설정
export ANTHROPIC_API_KEY=your-key-here

# 3. 설정 실행
chmod +x setup.sh
./setup.sh
```

## 수동 설정

```bash
# 1. 디렉토리 생성
mkdir -p workspace config skills hooks dev-projects

# 2. Skills 복사
cp -r ../skills/* skills/

# 3. Hooks 복사
cp -r ../hooks/* hooks/

# 4. .env 파일 생성
echo "ANTHROPIC_API_KEY=your-key-here" > .env

# 5. 실행
docker-compose up -d
```

## 컨테이너 내부에서 Skills 활성화

```bash
# 컨테이너 접속
docker exec -it openclaw-dev-team /bin/bash

# Skills 활성화
openclaw skills enable dev-team-start
openclaw skills enable dev-team-orchestrator
openclaw skills enable dev-team-planner
openclaw skills enable dev-team-executor
openclaw skills enable dev-team-validator

# Hooks 활성화
openclaw hooks enable dev-team-trigger

# 확인
openclaw skills list | grep dev-team
openclaw hooks list | grep dev-team
```

## 테스트

```bash
# 컨테이너 내부에서 테스트
docker exec -it openclaw-dev-team /bin/bash

# Slash command 테스트
# /dev-team-start dashboard 기능 개발
```

## 유용한 명령어

```bash
# 로그 확인
docker-compose logs -f

# 컨테이너 상태
docker-compose ps

# 재시작
docker-compose restart

# 정지
docker-compose down

# 완전 삭제
./cleanup.sh
```

## 볼륨 구조

```
docker/
├── workspace/     # OpenClaw 작업 공간
├── config/        # OpenClaw 설정
├── skills/        # Dev Team Skills
├── hooks/         # Dev Team Hooks
├── dev-projects/  # 개발 프로젝트 (~/dev 마운트)
├── docker-compose.yml
├── setup.sh
└── cleanup.sh
```

## 보안

- `no-new-privileges`: 권한 상승 방지
- `cap_drop: ALL`: 모든 Linux capabilities 제거
- 격리된 네트워크: openclaw-network
- 읽기 전용 파일시스템 옵션 (필요시)

## 문제 해결

### 컨테이너가 시작되지 않음

```bash
# 로그 확인
docker-compose logs

# 이미지 다시 빌드
docker-compose down
docker-compose pull
docker-compose up -d
```

### Skills가 인식되지 않음

```bash
# Skills 폴더 확인
docker exec -it openclaw-dev-team ls -la /root/.openclaw/skills/

# 수동으로 복사
docker cp ../skills/. openclaw-dev-team:/root/.openclaw/skills/
```

### API 키 오류

```bash
# .env 파일 확인
cat .env

# 컨테이너 환경 변수 확인
docker exec -it openclaw-dev-team env | grep API_KEY
```
