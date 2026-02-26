# CCG Skill 동작 방식 분석

## 개요

**CCG (Claude-Codex-Gemini)** 는 oh-my-claudecode의 tri-model orchestration 스킬로, 
Codex와 Gemini CLI를 tmux에서 병렬로 실행하고 결과를 Claude가 종합합니다.

## 소스 코드 위치

```
https://github.com/Yeachan-Heo/oh-my-claudecode
├── skills/ccg/SKILL.md          # 스킬 정의
└── bridge/
    ├── runtime-cli.cjs          # CLI 오케스트레이션 (tmux 기반)
    └── runtime/
        ├── tmux-session.ts      # tmux 세션 관리
        ├── model-contract.ts    # CLI 별 계약 정의
        ├── worker-bootstrap.ts  # 워커 초기화
        └── runtime.ts           # 팀 런타임
```

---

## 1. 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Claude (Leader)                            │
│                     • 요청 분해                                   │
│                     • 결과 종합                                   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│    tmux       │    │    tmux       │    │    tmux       │
│   Leader Pane │    │ Worker Pane 1 │    │ Worker Pane 2 │
│   (Claude)    │    │   (Codex)     │    │   (Gemini)    │
└───────────────┘    └───────────────┘    └───────────────┘
        │                    │                    │
        │                    │                    │
        ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    .omc/state/team/{teamName}/                      │
│  ├── config.json           # 팀 설정                               │
│  ├── tasks/                # 태스크 파일                            │
│  │   └── 1.json            # {id, subject, description, status}    │
│  └── workers/                                                       │
│      ├── worker-1/                                                  │
│      │   ├── inbox.md       # 초기 태스크                           │
│      │   ├── done.json      # 완료 신호                             │
│      │   └── heartbeat.json # 상태 갱신                             │
│      └── worker-2/                                                  │
│          ├── inbox.md                                               │
│          ├── done.json                                              │
│          └── heartbeat.json                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. 실행 워크플로우

### Step 1: 요청 분해

Claude가 요청을 두 개의 태스크로 분해:

```typescript
// Codex 태스크 (분석/백엔드)
{
  subject: "Codex task: 아키텍처 검토",
  description: "인증 시스템의 보안 아키텍처를 분석..."
}

// Gemini 태스크 (디자인/프론트엔드)
{
  subject: "Gemini task: UI 컴포넌트 검토",
  description: "로그인 폼의 UX 패턴을 분석..."
}
```

### Step 2: 팀 시작 (mcp__team__omc_run_team_start)

```typescript
mcp__team__omc_run_team_start({
  teamName: "ccg-auth-review",
  agentTypes: ["codex", "gemini"],
  tasks: [
    { subject: "...", description: "..." },
    { subject: "...", description: "..." }
  ],
  cwd: "/path/to/project"
})
```

**내부 동작:**

1. **태스크 파일 생성**: `.omc/state/team/{teamName}/tasks/1.json`, `2.json`
2. **tmux 세션 생성**: `createTeamSession()` 호출
3. **워커 pane 분할**: Leader pane에서 `-h` (horizontal) 분할
4. **CLI 프로세스 spawn**: 각 pane에서 Codex/Gemini CLI 실행

### Step 3: 워커 실행

**tmux pane에서 실행되는 명령어:**

```bash
# Codex worker
env OMC_TEAM_WORKER='ccg-auth-review/worker-1' \
    OMC_TEAM_NAME='ccg-auth-review' \
    OMC_WORKER_AGENT_TYPE='codex' \
    codex --dangerously-bypass-approvals-and-sandbox --model gpt-5

# Gemini worker  
env OMC_TEAM_WORKER='ccg-auth-review/worker-2' \
    OMC_TEAM_NAME='ccg-auth-review' \
    OMC_WORKER_AGENT_TYPE='gemini' \
    gemini --yolo --model gemini-3-pro-preview
```

**초기 태스크 전달 (inbox.md):**

```markdown
# Team Worker Protocol

## Initial Task Assignment
Task ID: 1
Worker: worker-1
Subject: Codex task: 아키텍처 검토

## Task Description
인증 시스템의 보안 아키텍처를 분석...

## Task Completion Protocol
When complete, write done signal to .omc/state/team/ccg-auth-review/workers/worker-1/done.json:
{"taskId":"1","status":"completed","summary":"<brief summary>","completedAt":"<ISO timestamp>"}
```

### Step 4: 완료 대기 (mcp__team__omc_run_team_wait)

```typescript
mcp__team__omc_run_team_wait({
  job_id: "omc-...",
  timeout_ms: 60000
})
```

**내부 동작:**

1. **Watchdog**: 1초마다 `done.json` 파일 확인
2. **완료 감지**: `done.json`이 나타나면 태스크 상태 업데이트
3. **다음 태스크**: pending 태스크가 있으면 새 워커 spawn
4. **종료 조건**: 모든 태스크가 `completed` 또는 `failed` 상태

### Step 5: 결과 종합

```json
{
  "status": "completed",
  "result": {
    "taskResults": [
      {
        "taskId": "1",
        "status": "completed",
        "summary": "Codex 분석 결과: JWT 토큰 보안 취약점 발견..."
      },
      {
        "taskId": "2",
        "status": "completed",
        "summary": "Gemini 분석 결과: 로그인 폼 UX 개선 제안..."
      }
    ]
  }
}
```

---

## 3. 핵심 구현 상세

### 3.1 Model Contract (CLI 별 계약)

```typescript
// src/team/model-contract.ts
const CONTRACTS = {
  claude: {
    agentType: "claude",
    binary: "claude",
    buildLaunchArgs(model, extraFlags = []) {
      const args = ["--dangerously-skip-permissions"];
      if (model) args.push("--model", model);
      return [...args, ...extraFlags];
    }
  },
  codex: {
    agentType: "codex",
    binary: "codex",
    installInstructions: "npm install -g @openai/codex",
    buildLaunchArgs(model, extraFlags = []) {
      const args = ["--dangerously-bypass-approvals-and-sandbox"];
      if (model) args.push("--model", model);
      return [...args, ...extraFlags];
    },
    parseOutput(rawOutput) {
      // Codex JSON 출력에서 실제 응답 추출
      const lines = rawOutput.trim().split("\n").filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const parsed = JSON.parse(lines[i]);
          if (parsed.type === "message" && parsed.role === "assistant") {
            return parsed.content ?? rawOutput;
          }
        } catch {}
      }
      return rawOutput.trim();
    }
  },
  gemini: {
    agentType: "gemini",
    binary: "gemini",
    installInstructions: "npm install -g @google/gemini-cli",
    supportsPromptMode: true,
    promptModeFlag: "-p",
    buildLaunchArgs(model, extraFlags = []) {
      const args = ["--yolo"];
      if (model) args.push("--model", model);
      return [...args, ...extraFlags];
    }
  }
};
```

### 3.2 tmux 세션 생성

```typescript
// src/team/tmux-session.ts
async function createTeamSession(teamName, workerCount, cwd) {
  // tmux 환경 확인
  if (!process.env.TMUX) {
    throw new Error("Team mode requires running inside tmux");
  }

  // 현재 pane ID 가져오기
  const envPaneId = process.env.TMUX_PANE?.trim();
  
  // 워커 pane 분할
  for (let i = 0; i < workerCount; i++) {
    const splitTarget = i === 0 ? leaderPaneId : workerPaneIds[i - 1];
    const splitType = i === 0 ? "-h" : "-v";  // 첫 번째는 수평, 이후는 수직 분할
    
    const splitResult = await execFileAsync("tmux", [
      "split-window", splitType,
      "-t", splitTarget,
      "-d", "-P", "-F", "#{pane_id}",
      "-c", cwd
    ]);
    
    workerPaneIds.push(splitResult.stdout.trim());
  }

  // 레이아웃 최적화
  await execFileAsync("tmux", ["select-layout", "-t", teamTarget, "main-vertical"]);
  
  return { sessionName, leaderPaneId, workerPaneIds };
}
```

### 3.3 워커 Pane에 명령 전송

```typescript
// src/team/tmux-session.ts
async function spawnWorkerInPane(sessionName, paneId, config) {
  // 시작 명령어 구성
  const startCmd = buildWorkerStartCommand(config);
  
  // tmux에 명령어 전송
  await execFileAsync("tmux", [
    "send-keys", "-t", paneId, "-l", startCmd
  ]);
  
  // Enter 키 전송 (명령 실행)
  await execFileAsync("tmux", ["send-keys", "-t", paneId, "Enter"]);
}

function buildWorkerStartCommand(config) {
  const shell = process.env.SHELL || "/bin/bash";
  const envAssignments = Object.entries(config.envVars)
    .map(([key, value]) => `${key}='${value.replace(/'/g, `'"'"'`)}'`);
  
  return [
    "env",
    ...envAssignments,
    shell, "-lc",
    'exec "$@"', "--",
    ...launchWords  // ["codex", "--dangerously-bypass...", ...]
  ].map(escape).join(" ");
}
```

### 3.4 Watchdog (완료 감지)

```typescript
// src/team/runtime.ts
function watchdogCliWorkers(runtime, intervalMs) {
  const tick = async () => {
    for (const [wName, active] of [...runtime.activeWorkers.entries()]) {
      const donePath = `.omc/state/team/${teamName}/workers/${wName}/done.json`;
      const signal = await readJsonSafe(donePath);
      
      if (signal) {
        // 태스크 완료 처리
        await markTaskFromDone(root, signal.taskId, signal.status, signal.summary);
        
        // 워커 pane 종료
        await killWorkerPane(runtime, wName, active.paneId);
        
        // 다음 pending 태스크가 있으면 새 워커 spawn
        if (!await allTasksTerminal(runtime)) {
          const nextTaskIndex = await nextPendingTaskIndex(runtime);
          if (nextTaskIndex != null) {
            await spawnWorkerForTask(runtime, wName, nextTaskIndex);
          }
        }
      }
    }
  };
  
  return setInterval(tick, intervalMs);
}
```

---

## 4. MCP 도구 노출

### 4.1 MCP 도구 목록

| 도구 | 설명 |
|------|------|
| `mcp__team__omc_run_team_start` | 팀 시작 (비동기) |
| `mcp__team__omc_run_team_wait` | 완료 대기 (동기) |
| `mcp__team__omc_run_team_status` | 상태 조회 |
| `mcp__team__omc_run_team_cleanup` | 세션 정리 |

### 4.2 MCP 서버 구현 패턴

```typescript
// MCP 도구 정의
{
  name: "omc_run_team_start",
  description: "Start a team of CLI workers in tmux panes",
  inputSchema: {
    type: "object",
    properties: {
      teamName: { type: "string" },
      agentTypes: { type: "array", items: { type: "string" } },
      tasks: { type: "array", items: { type: "object" } },
      cwd: { type: "string" }
    },
    required: ["teamName", "agentTypes", "tasks"]
  },
  handler: async (params) => {
    const runtime = await startTeam(params);
    return {
      jobId: generateJobId(),
      pid: process.pid,
      message: "Team started in background..."
    };
  }
}
```

---

## 5. OpenClaw 적용 방안

### 5.1 Codex CLI를 Subagent로 실행

**옵션 A: tmux 기반 (ccg 방식)**

```typescript
// OpenClaw에서 Codex 실행
async function runCodexSubagent(task: string, cwd: string) {
  // 1. tmux pane 분할
  const paneId = await createCodexPane(cwd);
  
  // 2. Codex CLI 실행
  await spawnCodexInPane(paneId, {
    task,
    model: "gpt-5",
    cwd
  });
  
  // 3. 완료 대기
  const result = await waitForCodexCompletion(paneId);
  
  return result;
}
```

**옵션 B: 파일 기반 통신 (단순화)**

```typescript
async function runCodexSubagent(task: string, cwd: string) {
  // 1. 태스크 파일 생성
  const taskPath = `.openclaw/codex/tasks/${Date.now()}.json`;
  await writeFile(taskPath, JSON.stringify({ task, cwd }));
  
  // 2. Codex CLI 실행 (child_process)
  const process = spawn("codex", [
    "--dangerously-bypass-approvals-and-sandbox",
    "--model", "gpt-5",
    "-p", `Read task from ${taskPath} and execute it.`
  ], { cwd });
  
  // 3. 결과 수집
  const result = await collectOutput(process);
  
  return result;
}
```

### 5.2 OpenClaw Browser Tester와 통합

```typescript
// skills/openclaw-tester에 Codex 서브에이전트 추가
async function runOpenClawTester(input: OpenClawTesterInput) {
  // 1. 일반 테스트 실행
  const qaResult = await runQATester(input);
  
  // 2. Codex로 심층 분석 (선택적)
  if (input.config.useCodexAnalysis) {
    const codexResult = await runCodexSubagent({
      task: `Analyze the test results and identify potential issues:
             ${JSON.stringify(qaResult)}`,
      cwd: input.context.projectRoot
    });
    
    qaResult.codexAnalysis = codexResult;
  }
  
  return qaResult;
}
```

### 5.3 Review Squad에서 활용

```markdown
## Review Squad - OpenClaw Tester 실행

### Step 3-1: OpenClaw Tester
- 브라우저 테스트 실행
- Evidence 수집

### Step 3-2: Codex 분석 (선택적)
- 테스트 결과를 Codex로 분석
- 아키텍처/보안 관점 검토
- 결과를 Final Approver에 전달
```

---

## 6. 요구사항

### 6.1 필수 요구사항

| 요구사항 | 설명 |
|----------|------|
| **tmux** | tmux 세션 내에서 실행 필요 |
| **Codex CLI** | `npm install -g @openai/codex` |
| **Gemini CLI** | `npm install -g @google/gemini-cli` |

### 6.2 환경 변수

```bash
# Codex 인증
export OPENAI_API_KEY="sk-..."

# Gemini 인증
export GOOGLE_API_KEY="..."
```

---

## 7. 참고 자료

- **GitHub**: https://github.com/Yeachan-Heo/oh-my-claudecode
- **SKILL.md**: https://raw.githubusercontent.com/Yeachan-Heo/oh-my-claudecode/main/skills/ccg/SKILL.md
- **runtime-cli.cjs**: https://raw.githubusercontent.com/Yeachan-Heo/oh-my-claudecode/main/bridge/runtime-cli.cjs

---

*Research Date: 2026-02-25*
