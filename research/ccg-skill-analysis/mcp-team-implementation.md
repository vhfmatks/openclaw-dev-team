# MCP Team Server 구현 분석

## 개요

oh-my-claudecode의 MCP Team Server는 tmux 기반 CLI worker 오케스트레이션 시스템입니다. 4개의 MCP 도구를 통해 병렬 worker 관리를 지원합니다.

---

## 1. 아키텍처 구성

### 1.1 파일 구조

```
oh-my-claudecode/
├── src/
│   └── mcp/
│       └── team-server.ts      # MCP 서버 소스
├── bridge/
│   ├── team-mcp.cjs            # 컴파일된 MCP 서버 (622KB)
│   ├── runtime-cli.cjs         # Tmux 런타임 (1,200+ lines)
│   └── team-bridge.cjs         # Team bridge 로직
└── skills/
    └── omc-teams/SKILL.md      # 스킬 문서
```

### 1.2 빌드 프로세스

```bash
# scripts/build-team-server.mjs
esbuild src/mcp/team-server.ts → bridge/team-mcp.cjs
```

---

## 2. MCP 도구 구현

### 2.1 도구 목록

| 도구 | 목적 | 반환값 |
|------|------|--------|
| `omc_run_team_start` | 백그라운드에서 워커 시작 | `{jobId, pid, message}` 즉시 반환 |
| `omc_run_team_status` | 논블로킹 상태 확인 | `{jobId, status, elapsedSeconds, result}` |
| `omc_run_team_wait` | 완료까지 대기 (블로킹) | 완료 시 전체 결과 |
| `omc_run_team_cleanup` | 워커 pane 정리 | 정리 확인 |

### 2.2 omc_run_team_start

```typescript
// 입력 스키마
{
  teamName: string,        // 슬러그 이름 (예: "auth-review")
  agentTypes: string[],    // 워커당 ["claude", "codex", "gemini"]
  tasks: Array<{
    subject: string,
    description: string
  }>,
  cwd: string             // 작업 디렉토리 (절대 경로)
}

// 구현
async function handleStart(params) {
  // 1. jobId 생성: `omc-${timestamp36}`
  const jobId = `omc-${Date.now().toString(36)}`;
  
  // 2. child process spawn
  const child = spawn('node', ['runtime-cli.cjs'], {
    env: { ...process.env, OMC_JOB_ID: jobId, OMC_JOBS_DIR },
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  // 3. 팀 설정을 stdin으로 전송
  child.stdin.write(JSON.stringify({ teamName, agentTypes, tasks, cwd }));
  
  // 4. 즉시 반환
  return { jobId, pid: child.pid, message: 'Team started...' };
}
```

### 2.3 omc_run_team_wait

```typescript
// 입력 스키마
{
  job_id: string,
  timeout_ms?: number    // 기본 300000 (5분), 최대 3600000 (1시간)
}

// 구현 (Exponential Backoff)
async function handleWait(params) {
  const deadline = Date.now() + Math.min(timeout_ms, 3_600_000);
  let pollDelay = 500;
  
  while (Date.now() < deadline) {
    const job = omcTeamJobs.get(job_id) ?? loadJobFromDisk(job_id);
    
    // orphan PID 확인 (MCP 재시작 케이스)
    if (job.status === 'running' && job.pid != null) {
      try { process.kill(job.pid, 0); }
      catch (e) { if (e.code === 'ESRCH') { job.status = 'failed'; } }
    }
    
    if (job.status !== 'running') {
      return { jobId, status: job.status, result: job.result };
    }
    
    await new Promise(r => setTimeout(r, pollDelay));
    pollDelay = Math.min(pollDelay * 1.5, 2000);  // 최대 2초
  }
  
  // 타임아웃 - 워커는 계속 실행 중
  return { error: 'Timed out...', jobId, status: 'running' };
}
```

### 2.4 omc_run_team_cleanup

```typescript
// 입력 스키마
{
  job_id: string,
  grace_ms?: number    // 기본 10000ms
}

// 구현
async function handleCleanup(params) {
  // 1. 디스크에서 pane ID 로드
  const panes = await loadPaneIds(job_id);
  
  // 2. shutdown sentinel 작성
  await fs.writeFile(shutdownPath, JSON.stringify({ requestedAt: Date.now() }));
  await sleep(grace_ms);
  
  // 3. 각 워커 pane 강제 종료
  for (const paneId of panes.paneIds) {
    if (paneId === panes.leaderPaneId) continue; // Leader는 종료 안 함
    await execFile('tmux', ['kill-pane', '-t', paneId]);
  }
  
  // 4. 정리 완료 표시
  job.cleanedUpAt = new Date().toISOString();
}
```

---

## 3. Job 상태 관리

### 3.1 메모리 + 디스크 지속성

```typescript
// MCP 재시작 시에도 상태 보존
const omcTeamJobs = new Map<string, OmcTeamJob>();

function persistJob(jobId: string, job: OmcTeamJob): void {
  writeFileSync(
    join(homedir(), '.omc', 'team-jobs', `${jobId}.json`),
    JSON.stringify(job)
  );
}

function loadJobFromDisk(jobId: string): OmcTeamJob | undefined {
  return JSON.parse(readFileSync(`${jobId}.json`, 'utf-8'));
}
```

### 3.2 상태 구조

```
~/.omc/team-jobs/
├── omc-m1a2b3c.json      # Job 1
└── omx-n4d5e6f.json      # Job 2

{team}/.omc/state/team/{teamName}/
├── config.json           # 팀 설정
├── tasks/
│   ├── 1.json           # Task {id, subject, description, status, owner, result}
│   ├── 2.json
│   └── ...
├── mailbox/              # 공유 메일박스
└── workers/
    ├── worker-1/
    │   ├── .ready       # Sentinel: 워커 준비 완료
    │   ├── inbox.md     # 태스크 지시사항
    │   ├── heartbeat.json  # 워커 상태
    │   └── done.json    # 완료 신호
    └── worker-2/
        └── ...
```

---

## 4. Tmux 세션 관리

### 4.1 세션 생성

```typescript
// src/team/tmux-session.ts
async function createTeamSession(teamName, workerCount, cwd) {
  // tmux 환경 확인
  if (!process.env.TMUX) {
    throw new Error("Team mode requires running inside tmux");
  }
  
  // 현재 context 가져오기
  const context = await execFile('tmux', ['display-message', '-p', '#S:#I']);
  const sessionAndWindow = context.stdout.trim();
  
  // 워커 pane 분할
  const paneIds = [];
  for (let i = 0; i < workerCount; i++) {
    const split = await execFile('tmux', [
      'split-window', i === 0 ? '-h' : '-v',
      '-d', '-P', '-F', '#{pane_id}',
      '-c', cwd
    ]);
    paneIds.push(split.stdout.trim());
  }
  
  // 레이아웃 최적화
  await execFile('tmux', ['select-layout', '-t', sessionAndWindow, 'main-vertical']);
  
  return { sessionName: sessionAndWindow, paneIds };
}
```

### 4.2 워커 Pane에 명령 전송

```typescript
async function spawnWorkerInPane(sessionName, paneId, config) {
  // 시작 명령어 구성
  const startCmd = buildWorkerStartCommand(config);
  
  // tmux에 명령어 전송
  await execFile('tmux', ['send-keys', '-t', paneId, '-l', startCmd]);
  
  // Enter 키 전송 (명령 실행)
  await execFile('tmux', ['send-keys', '-t', paneId, 'Enter']);
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
    ...config.launchWords
  ].map(escape).join(" ");
}
```

---

## 5. Worker Bootstrap

### 5.1 Worker Protocol Overlay

```typescript
// src/team/worker-bootstrap.ts
async function generateWorkerOverlay(teamName, workerName, agentType) {
  return `
## FIRST ACTION REQUIRED
Write ready sentinel: .omc/state/team/${teamName}/workers/${workerName}/.ready

## Identity
- Team: ${teamName}
- Worker: ${workerName}
- Agent Type: ${agentType}
- Environment: OMC_TEAM_WORKER=${teamName}/${workerName}

## Task Completion Protocol
Write done.json: .omc/state/team/${teamName}/workers/${workerName}/done.json
{"taskId":"<id>","status":"completed","summary":"<summary>","completedAt":"<ISO>"}
`;
}
```

### 5.2 Task 분배

```typescript
// 태스크 파일 원자적 생성
for (let i = 0; i < tasks.length; i++) {
  const taskId = String(i + 1);
  writeJson(`.omc/state/team/${teamName}/tasks/${taskId}.json`, {
    id: taskId,
    subject: tasks[i].subject,
    description: tasks[i].description,
    status: 'pending',  // pending -> in_progress -> completed/failed
    owner: null,
    result: null,
    createdAt: new Date().toISOString()
  });
}
```

### 5.3 Worker Claim Protocol

```typescript
// 워커가 태스크 파일을 읽고 상태를 원자적으로 업데이트
const task = await readTask(root, taskId);
if (task.status === 'pending') {
  task.status = 'in_progress';
  task.owner = workerName;
  task.assignedAt = new Date().toISOString();
  await writeTask(root, task);  // 원자적 쓰기
}
```

---

## 6. Watchdog 구현

```typescript
// src/team/runtime.ts
function watchWorkers(runtime) {
  setInterval(async () => {
    for (const [workerName, active] of runtime.activeWorkers) {
      // done.json 확인
      const done = await readJson(`${runtime.cwd}/.omc/team/${runtime.teamName}/workers/${workerName}/done.json`);
      
      if (done) {
        // 태스크 완료 - pane 종료, 다음 워커 spawn
        await killPane(active.paneId);
        const nextTask = await findNextTask(runtime);
        if (nextTask) await spawnWorker(workerName, nextTask);
        continue;
      }
      
      // pane 활성 상태 확인
      const alive = await isPaneAlive(active.paneId);
      if (!alive) {
        // 워커 사망 - 실패 처리
        await markTaskFailed(active.taskId);
        const nextTask = await findNextTask(runtime);
        if (nextTask) await spawnWorker(workerName, nextTask);
      }
    }
  }, 1000);
}
```

---

## 7. OpenClaw 적용 방안

### 7.1 MCP 서버 구조

```typescript
// openclaw-mcp-team/src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server(
  { name: 'openclaw-team', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  if (name === 'openclaw_run_team_start') return handleStart(args);
  if (name === 'openclaw_run_team_status') return handleStatus(args);
  if (name === 'openclaw_run_team_wait') return handleWait(args);
  if (name === 'openclaw_run_team_cleanup') return handleCleanup(args);
});

await server.connect(new StdioServerTransport());
```

### 7.2 Tmux 세션 관리

```typescript
async function createOpenClawSession(teamName: string, workerCount: number, cwd: string) {
  const { execFile } = await import('child_process');
  
  // 현재 tmux 세션 가져오기
  const context = await execFile('tmux', ['display-message', '-p', '#S:#I']);
  const sessionAndWindow = context.stdout.trim();
  
  // 워커용 pane 분할
  const paneIds = [];
  for (let i = 0; i < workerCount; i++) {
    const split = await execFile('tmux', [
      'split-window', i === 0 ? '-h' : '-v',
      '-d', '-P', '-F', '#{pane_id}',
      '-c', cwd
    ]);
    paneIds.push(split.stdout.trim());
  }
  
  return { sessionName: sessionAndWindow, paneIds };
}
```

### 7.3 Worker Bootstrap

```typescript
async function bootstrapWorker(teamName: string, workerName: string, cwd: string, task: any) {
  const inboxPath = join(cwd, '.openclaw/team', teamName, 'workers', workerName, 'inbox.md');
  const donePath = join(cwd, '.openclaw/team', teamName, 'workers', workerName, 'done.json');
  
  await mkdir(dirname(inboxPath), { recursive: true });
  
  // 태스크 inbox 작성
  await writeFile(inboxPath, `
## Task Assignment
Subject: ${task.subject}
${task.description}

When complete, write done signal to ${donePath}:
{"taskId":"${task.id}","status":"completed","summary":"<summary>","completedAt":"<ISO>"}
`);
  
  // tmux pane에 워커 spawn
  await spawnWorkerInPane(paneId, {
    cwd,
    envVars: { OPENCLAW_WORKER: `${teamName}/${workerName}` },
    launchBinary: 'openclaw',
    launchArgs: ['--dangerously-skip-permissions']
  });
}
```

### 7.4 Watchdog

```typescript
function watchWorkers(runtime) {
  setInterval(async () => {
    for (const [workerName, active] of runtime.activeWorkers) {
      // done.json 확인
      const done = await readJson(`${runtime.cwd}/.openclaw/team/${runtime.teamName}/workers/${workerName}/done.json`);
      
      if (done) {
        // 태스크 완료 - pane 종료, 다음 워커 spawn
        await killPane(active.paneId);
        const nextTask = await findNextTask(runtime);
        if (nextTask) await spawnWorker(workerName, nextTask);
        continue;
      }
      
      // pane 활성 상태 확인
      const alive = await isPaneAlive(active.paneId);
      if (!alive) {
        // 워커 사망 - 실패 처리
        await markTaskFailed(active.taskId);
        const nextTask = await findNextTask(runtime);
        if (nextTask) await spawnWorker(workerName, nextTask);
      }
    }
  }, 1000);
}
```

---

## 8. 구현 체크리스트

### 8.1 OpenClaw MCP 구현

- [ ] **MCP Server**: `openclaw_start`, `openclaw_wait`, `openclaw_status`, `openclaw_cleanup` 도구 노출
- [ ] **Tmux Runtime**: 세션 생성, pane spawning, CLI 명령 빌드
- [ ] **Worker Protocol**: File-based communication (inbox → done)
- [ ] **Watchdog**: Pane health 모니터링, 실패한 worker 재시작
- [ ] **State Persistence**: `.openclaw/state/jobs/`에 job state 저장

### 8.2 CLI Contract 정의

```typescript
const OPENCLAW_CONTRACT = {
  openclaw: {
    agentType: "openclaw",
    binary: "openclaw",
    buildLaunchArgs(model, extraFlags = []) {
      const args = ["--dangerously-skip-permissions"];
      if (model) args.push("--model", model);
      return [...args, ...extraFlags];
    }
  }
};
```

---

## 9. 요약

| 구성요소 | 파일 | 핵심 기능 |
|----------|------|----------|
| **MCP Server** | `src/mcp/team-server.ts` | 4개 도구 노출, job 상태 관리 |
| **Tmux Management** | `src/team/tmux-session.ts` | Split-pane 생성/파괴, 명령 전송 |
| **Worker Bootstrap** | `src/team/worker-bootstrap.ts` | inbox, done.json, 프로토콜 생성 |
| **Runtime CLI** | `bridge/runtime-cli.cjs` | 팀 lifecycle 관리 child process |
| **Job Persistence** | `~/.omc/team-jobs/` | MCP 재시작 시에도 상태 보존 |
| **Team State** | `.omc/state/team/{teamName}/` | Tasks, workers, inboxes, heartbeat |

---

## 10. 참고 자료

- **GitHub**: https://github.com/Yeachan-Heo/oh-my-claudecode
- **team-server.ts**: https://raw.githubusercontent.com/Yeachan-Heo/oh-my-claudecode/main/src/mcp/team-server.ts
- **runtime-cli.cjs**: https://raw.githubusercontent.com/Yeachan-Heo/oh-my-claudecode/main/bridge/runtime-cli.cjs

---

*Research Date: 2026-02-25*
