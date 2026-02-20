---
name: dev-team-trigger
description: |
  Telegram 메시지에서 개발 요청을 감지하고 Orchestrator를 트리거하는 Hook.
  message:received 이벤트를 감시한다.
metadata:
  openclaw:
    emoji: 🚀
    events:
      - message:received
      - command:new
    export: default
---

# Dev Team Trigger Hook

## 개요

이 Hook은 OpenClaw로 들어오는 메시지를 감시하여 개발 요청을 자동으로 감지하고
`dev-team-orchestrator` Skill을 트리거합니다.

## 이벤트

### message:received
Telegram 등에서 메시지가 들어올 때 발생

### command:new
/new 명령어 실행 시 (상태 초기화)

## 동작

### 1. 개발 요청 감지

```typescript
const DEV_KEYWORDS = [
  // 한국어
  '만들어줘', '구현해줘', '개발해줘', '만들어', '구현해', '개발해',
  '추가해줘', '수정해줘', '고쳐줘', '버그 수정',
  
  // 영어
  'build me', 'create', 'implement', 'develop',
  'make a', 'add a', 'fix the', 'refactor'
];

function isDevRequest(content: string): boolean {
  const lower = content.toLowerCase();
  return DEV_KEYWORDS.some(keyword => 
    lower.includes(keyword.toLowerCase())
  );
}
```

### 2. Orchestrator 호출

```typescript
async function triggerOrchestrator(context: MessageContext) {
  // 상태 파일 생성
  const taskId = generateTaskId();
  await createTaskState(taskId, context);
  
  // Orchestrator Skill 호출
  await invokeSkill('dev-team-orchestrator', {
    taskId,
    request: context.content,
    source: context.channelId,
    senderId: context.from
  });
}
```

### 3. 상태 초기화 (/new)

```typescript
async function resetDevTeamState() {
  // 현재 작업 상태 정리
  await clearState('.dev-team/state/current-task.json');
  
  // 임시 파일 정리 (선택)
  // await cleanupTempFiles();
}
```

## Handler 구현

```typescript
import type { HookHandler } from 'openclaw';

const handler: HookHandler = async (event) => {
  
  // 메시지 수신 처리
  if (event.type === 'message' && event.action === 'received') {
    const { content, from, channelId } = event.context;
    
    // 개발 요청인지 확인
    if (isDevRequest(content)) {
      console.log(`[dev-team-trigger] Dev request detected from ${from}`);
      
      // 사용자에게 확인 메시지
      event.messages.push('🔄 개발 요청을 감지했습니다. 작업을 시작합니다...');
      
      // Orchestrator 트리거
      await triggerOrchestrator({
        content,
        from,
        channelId,
        timestamp: event.timestamp
      });
    }
  }
  
  // /new 명령어 처리
  if (event.type === 'command' && event.action === 'new') {
    console.log('[dev-team-trigger] Resetting dev team state');
    await resetDevTeamState();
  }
  
};

// 개발 요청 키워드
const DEV_KEYWORDS = [
  '만들어줘', '구현해줘', '개발해줘', '만들어', '구현해', '개발해',
  '추가해줘', '수정해줘', '고쳐줘', '버그 수정',
  'build me', 'create', 'implement', 'develop',
  'make a', 'add a', 'fix the', 'refactor'
];

function isDevRequest(content: string): boolean {
  const lower = content.toLowerCase();
  return DEV_KEYWORDS.some(keyword => 
    lower.includes(keyword.toLowerCase())
  );
}

async function triggerOrchestrator(context: any) {
  // 구현: Orchestrator Skill 호출
}

async function resetDevTeamState() {
  // 구현: 상태 초기화
}

function generateTaskId(): string {
  return `task-${Date.now()}`;
}

export default handler;
```

## 설정

### 활성화

```bash
openclaw hooks enable dev-team-trigger
```

### 설정 파일

```json
// openclaw.json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "dev-team-trigger": {
          "enabled": true,
          "env": {
            "DEV_TEAM_AUTO_TRIGGER": "true"
          }
        }
      }
    }
  }
}
```

## 로깅

### Hook 로그
```
[dev-team-trigger] Dev request detected from +1234567890
[dev-team-trigger] Task ID: task-1708400000000
[dev-team-trigger] Triggering orchestrator...
```

### 상태 파일 로그
```json
// .dev-team/state/hook-log.jsonl
{"timestamp":"2026-02-20T10:00:00Z","event":"message:received","triggered":true,"taskId":"task-xxx"}
```

## 디버깅

### Hook이 실행되지 않을 때

1. Hook이 활성화되어 있는지 확인:
   ```bash
   openclaw hooks list
   ```

2. 이벤트가 올바르게 들어오는지 확인:
   ```bash
   tail -f ~/.openclaw/gateway.log | grep "dev-team-trigger"
   ```

3. 키워드가 매칭되는지 확인:
   - 메시지에 키워드 포함 확인
   - 대소문자 구분 없이 매칭

### 테스트

```bash
# Telegram에서 테스트 메시지 전송
"대시보드 만들어줘"

# 예상 응답
"🔄 개발 요청을 감지했습니다. 작업을 시작합니다..."
```

## 확장

### 커스텀 키워드 추가

```typescript
const CUSTOM_KEYWORDS = [
  '커스텀 키워드 1',
  '커스텀 키워드 2'
];

function isDevRequest(content: string): boolean {
  const allKeywords = [...DEV_KEYWORDS, ...CUSTOM_KEYWORDS];
  // ...
}
```

### 특정 채널만 처리

```typescript
const ALLOWED_CHANNELS = ['telegram', 'whatsapp'];

if (!ALLOWED_CHANNELS.includes(event.context.channelId)) {
  return; // 무시
}
```

### 권한 확인

```typescript
const ALLOWED_USERS = ['+1234567890', 'user@example.com'];

if (!ALLOWED_USERS.includes(event.context.from)) {
  event.messages.push('⛔ 개발 요청 권한이 없습니다.');
  return;
}
```

## 참고

- [OpenClaw Hooks 문서](https://docs.openclaw.ai/automation/hooks)
- [Hook Handler API](https://docs.openclaw.ai/automation/hooks#handler-implementation)
