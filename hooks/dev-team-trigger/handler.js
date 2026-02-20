"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DEV_KEYWORDS = [
    "만들어줘", "구현해줘", "개발해줘", "만들어", "구현해", "개발해",
    "추가해줘", "수정해줘", "고쳐줘", "버그 수정", "버그 고쳐",
    "build me", "create", "implement", "develop",
    "make a", "add a", "fix the", "refactor"
];
const handler = async (event) => {
    if (event.type === "message" && event.action === "received") {
        const { content, from, channelId } = event.context;
        if (isDevRequest(content)) {
            console.log(`[dev-team-trigger] Dev request from ${from}: ${content.substring(0, 50)}...`);
            event.messages.push("🔄 개발 요청을 감지했습니다. 작업을 시작합니다...");
            await writeTaskState({
                content,
                from,
                channelId,
                timestamp: event.timestamp
            });
        }
    }
    if (event.type === "command" && event.action === "new") {
        console.log("[dev-team-trigger] Session reset detected");
        await resetDevTeamState();
    }
};
function isDevRequest(content) {
    if (!content)
        return false;
    const lower = content.toLowerCase();
    return DEV_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
}
async function getStateDir() {
    const fs = require("fs/promises");
    const path = require("path");
    const workspaceDir = process.env.OPENCLAW_WORKSPACE || path.join(process.env.HOME || "", ".openclaw", "workspace");
    const stateDir = path.join(workspaceDir, "dev-team", "state");
    await fs.mkdir(stateDir, { recursive: true }).catch(() => { });
    return stateDir;
}
async function writeTaskState(context) {
    const fs = require("fs/promises");
    const path = require("path");
    const taskId = `task-${Date.now()}`;
    const stateDir = await getStateDir();
    const taskState = {
        id: taskId,
        request: context.content,
        status: "triggered",
        phase: "pending",
        startedAt: new Date().toISOString(),
        completedAt: null,
        source: {
            from: context.from,
            channelId: context.channelId
        },
        plan: { file: null, status: "pending" },
        execution: { filesChanged: [], status: "pending" },
        validation: { passed: null, report: null, screenshots: [] }
    };
    const stateFile = path.join(stateDir, "current-task.json");
    await fs.writeFile(stateFile, JSON.stringify(taskState, null, 2));
    console.log(`[dev-team-trigger] Task state saved: ${taskId}`);
}
async function resetDevTeamState() {
    const fs = require("fs/promises");
    const path = require("path");
    const stateDir = await getStateDir();
    const stateFile = path.join(stateDir, "current-task.json");
    const emptyState = {
        id: null,
        request: null,
        status: "idle",
        phase: null,
        startedAt: null,
        completedAt: null,
        plan: { file: null, status: "pending" },
        execution: { filesChanged: [], status: "pending" },
        validation: { passed: null, report: null, screenshots: [] }
    };
    await fs.writeFile(stateFile, JSON.stringify(emptyState, null, 2));
    console.log("[dev-team-trigger] State reset complete");
}
module.exports = handler;
