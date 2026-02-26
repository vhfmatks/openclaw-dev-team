import type {
  OrchestratorInput,
  TaskState,
  PipelineEvent,
  PlanningContext,
  Plan,
  DevTeamConfig,
  ExecutionSquadInput,
  ExecutionSquadOutput,
  ReviewSquadInput,
  ReviewSquadOutput,
  PipelinePhase,
  AIProvider,
} from '../types';

const DEFAULT_CONFIG: DevTeamConfig = {
  maxRetries: 3,
  timeout: 3600000,
  enableScreenshots: true,
  reportFormat: 'markdown',
  planSquad: {
    maxReworkIterations: 3,
    defaultMode: 'medium',
    enableAutoEscalation: true,
  },
  executionSquad: {
    maxReworkIterations: 3,
    defaultMode: 'medium',
    enableAutoEscalation: true,
    runTests: true,
    testTimeout: 60000,
  },
  validation: {
    devServerCommand: 'npm run dev',
    devServerUrl: 'http://localhost:3000',
    timeout: 30000,
    captureScreenshots: true,
    screenshotOnFailure: true,
    collectConsoleErrors: true,
  },
  reviewSquad: {
    maxReworkIterations: 3,
    defaultMode: 'basic',
    enableAutoRouting: true,
    enableScreenshots: true,
    testTimeout: 120000,
  },
};

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ['true', '1', 'yes', 'y'].includes(value.toLowerCase());
}

function parseIntEnv(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeReportFormat(raw: string | undefined): DevTeamConfig['reportFormat'] {
  if (raw === 'json' || raw === 'markdown') {
    return raw;
  }

  return 'markdown';
}

function resolveConfig(overrides: Partial<DevTeamConfig> = {}): DevTeamConfig {
  const envConfig: DevTeamConfig = {
    maxRetries: parseIntEnv(process.env.DEV_TEAM_MAX_RETRIES, DEFAULT_CONFIG.maxRetries),
    timeout: parseIntEnv(process.env.DEV_TEAM_TIMEOUT, DEFAULT_CONFIG.timeout),
    enableScreenshots: parseBoolean(process.env.DEV_TEAM_ENABLE_SCREENSHOTS, DEFAULT_CONFIG.enableScreenshots),
    reportFormat: normalizeReportFormat(process.env.DEV_TEAM_REPORT_FORMAT),
    planSquad: {
      ...DEFAULT_CONFIG.planSquad,
      maxReworkIterations: parseIntEnv(
        process.env.DEV_TEAM_PLAN_MAX_REWORK,
        DEFAULT_CONFIG.planSquad?.maxReworkIterations || 3,
      ),
    },
    executionSquad: {
      ...DEFAULT_CONFIG.executionSquad,
      maxReworkIterations: parseIntEnv(
        process.env.DEV_TEAM_EXECUTION_MAX_REWORK,
        DEFAULT_CONFIG.executionSquad?.maxReworkIterations || 3,
      ),
      testTimeout: parseIntEnv(
        process.env.DEV_TEAM_EXECUTION_TEST_TIMEOUT,
        DEFAULT_CONFIG.executionSquad?.testTimeout || 60000,
      ),
      runTests: parseBoolean(
        process.env.DEV_TEAM_EXECUTION_RUN_TESTS,
        DEFAULT_CONFIG.executionSquad?.runTests || true,
      ),
    },
    validation: {
      ...DEFAULT_CONFIG.validation,
      devServerCommand: process.env.VALIDATOR_DEV_SERVER_COMMAND || DEFAULT_CONFIG.validation!.devServerCommand,
      devServerUrl: process.env.VALIDATOR_DEV_SERVER_URL || DEFAULT_CONFIG.validation!.devServerUrl,
      timeout: parseIntEnv(process.env.VALIDATOR_TIMEOUT, DEFAULT_CONFIG.validation!.timeout),
      captureScreenshots: parseBoolean(
        process.env.VALIDATOR_CAPTURE_SCREENSHOTS,
        DEFAULT_CONFIG.validation!.captureScreenshots,
      ),
      screenshotOnFailure: parseBoolean(
        process.env.VALIDATOR_SCREENSHOT_ON_FAILURE,
        DEFAULT_CONFIG.validation!.screenshotOnFailure,
      ),
      collectConsoleErrors: parseBoolean(
        process.env.VALIDATOR_COLLECT_CONSOLE_ERRORS,
        DEFAULT_CONFIG.validation!.collectConsoleErrors,
      ),
    },
    reviewSquad: {
      ...DEFAULT_CONFIG.reviewSquad,
      maxReworkIterations: parseIntEnv(
        process.env.DEV_TEAM_REVIEW_MAX_REWORK,
        DEFAULT_CONFIG.reviewSquad?.maxReworkIterations || 3,
      ),
      enableAutoRouting: parseBoolean(
        process.env.DEV_TEAM_REVIEW_AUTO_ROUTING,
        DEFAULT_CONFIG.reviewSquad?.enableAutoRouting || true,
      ),
      enableScreenshots: parseBoolean(
        process.env.DEV_TEAM_REVIEW_ENABLE_SCREENSHOTS,
        DEFAULT_CONFIG.reviewSquad?.enableScreenshots || true,
      ),
      testTimeout: parseIntEnv(
        process.env.DEV_TEAM_REVIEW_TEST_TIMEOUT,
        DEFAULT_CONFIG.reviewSquad?.testTimeout || 120000,
      ),
    },
    provider: {
      default: process.env.OPENCLAW_PROVIDER as 'openclaw' | 'codex' | undefined,
      codex: process.env.OPENCLAW_CODEX_MODEL ? {
        enabled: true,
        model: process.env.OPENCLAW_CODEX_MODEL,
        timeout: Number(process.env.OPENCLAW_CODEX_TIMEOUT) || 300000,
        fallbackToOpenClaw: process.env.OPENCLAW_CODEX_FALLBACK !== 'false'
      } : undefined
    },

  };

  const resolved = {
    ...envConfig,
    ...overrides,
    planSquad: {
      ...envConfig.planSquad,
      ...(overrides.planSquad || {}),
    },
    executionSquad: {
      ...envConfig.executionSquad,
      ...(overrides.executionSquad || {}),
    },
    validation: {
      ...envConfig.validation,
      ...(overrides.validation || {}),
    },
    reviewSquad: {
      ...envConfig.reviewSquad,
      ...(overrides.reviewSquad || {}),
    },
  };

  return {
    ...resolved,
    maxRetries: Math.max(0, Number.isFinite(resolved.maxRetries) ? resolved.maxRetries : envConfig.maxRetries),
    timeout: Math.max(1000, Number.isFinite(resolved.timeout) ? resolved.timeout : envConfig.timeout),
    reportFormat: resolved.reportFormat,
    planSquad: {
      ...resolved.planSquad,
      maxReworkIterations: Math.max(0, resolved.planSquad?.maxReworkIterations ?? 0),
    },
    executionSquad: {
      ...resolved.executionSquad,
      maxReworkIterations: Math.max(0, resolved.executionSquad?.maxReworkIterations ?? 0),
      testTimeout: Math.max(1000, resolved.executionSquad?.testTimeout ?? 60000),
    },
    reviewSquad: {
      ...resolved.reviewSquad,
      maxReworkIterations: Math.max(0, resolved.reviewSquad?.maxReworkIterations ?? 0),
      testTimeout: Math.max(1000, resolved.reviewSquad?.testTimeout ?? 120000),
    },
  } as DevTeamConfig;
}

class Orchestrator {
  private config: DevTeamConfig;
  private state: TaskState | null = null;
  private events: PipelineEvent[] = [];
  private workspaceDir: string;
  private pipelineStartedAtMs = 0;
  private provider: AIProvider = 'openclaw';  // NEW: AI provider selection

  constructor(config: Partial<DevTeamConfig> = {}) {
    this.config = resolveConfig(config);
    this.workspaceDir = process.env.OPENCLAW_WORKSPACE || `${process.env.HOME}/.openclaw/workspace/dev-team`;
  }

  async execute(input: OrchestratorInput): Promise<{ success: boolean; plan?: Plan; error?: string }> {
    this.pipelineStartedAtMs = Date.now();
    
    // Set AI provider from input or config
    this.provider = input.provider || this.config.provider?.default || 'openclaw';
    

    try {
      await this.initializeState(input);
      await this.logEvent({ event: 'pipeline:start', task_id: input.taskId, request: input.request });

      let plan = await this.runPlanningPhase(input);
      let execution = await this.runExecutionPhase(plan);
      let review = await this.runReviewPhase(input.request, plan, execution);

      let reviewAttempt = 0;
      while (
        review.status === 'rejected' &&
        review.routeTo &&
        review.routeTo !== 'delivery' &&
        reviewAttempt < this.config.maxRetries
      ) {
        reviewAttempt += 1;
        const routeTo = review.routeTo;

        await this.logEvent({
          event: 'pipeline:routing',
          from: 'review',
          to: routeTo,
          attempt: reviewAttempt,
          reason: 'review_rejected',
        });

        const phaseMap: Record<string, PipelinePhase> = {
          planner: 'planning',
          executor: 'execution',
          delivery: 'delivery',
        };

        await this.updateState({
          phase: phaseMap[routeTo] || 'planning',
          review: {
            ...this.state?.review,
            status: 'failed',
            routeTo,
            report: null,
            screenshots: [],
          },
        });

        if (routeTo === 'planner') {
          await this.logEvent({ event: 'phase:enter', phase: 'planning', agent: 'dev-team:orchestrator' });
          plan = await this.runPlanningPhase(input);
          execution = await this.runExecutionPhase(plan);
          review = await this.runReviewPhase(input.request, plan, execution);
        } else {
          execution = await this.runExecutionPhase(plan);
          review = await this.runReviewPhase(input.request, plan, execution);
        }
      }

      if (review.status === 'rejected') {
        await this.logEvent({
          event: 'pipeline:complete',
          status: 'failed',
          reason: `review_rejected_after_${reviewAttempt}_retry`,
          routeTo: review.routeTo || 'delivery',
        });
        await this.updateState({ status: 'failed' });
        return { success: false, error: `Review rejected, routeTo: ${review.routeTo ?? 'delivery'}` };
      }

      await this.runDeliveryPhase(plan, execution, review);
      await this.logEvent({
        event: 'pipeline:complete',
        status: 'success',
        duration: this.getDurationLabel(),
        files_changed: execution.execution.filesCreated.length + execution.execution.filesModified.length + execution.execution.filesDeleted.length,
      });
      await this.updateState({
        status: 'completed',
        completedAt: new Date().toISOString(),
        phase: 'delivery',
      });
      return { success: true, plan };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logEvent({ event: 'error', phase: 'pipeline', message: errorMessage, action: 'abort' });
      await this.logEvent({ event: 'pipeline:error', error: errorMessage, status: 'failed' });
      await this.updateState({ status: 'failed' });
      return { success: false, error: errorMessage };
    }
  }

  private getDurationLabel(): string {
    const elapsedMs = Date.now() - this.pipelineStartedAtMs;
    const seconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m${String(remaining).padStart(2, '0')}s`;
    }

    return `${seconds}s`;
  }

  private async initializeState(input: OrchestratorInput): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const stateDir = path.join(this.workspaceDir, 'state');
    await fs.mkdir(stateDir, { recursive: true }).catch(() => {});

    this.state = {
      id: input.taskId,
      request: input.request,
      status: 'running',
      phase: 'planning',
      startedAt: new Date().toISOString(),
      completedAt: null,
      source: input.source,
      plan: { file: null, status: 'pending' },
      execution: { filesChanged: [], status: 'pending' },
      review: { status: 'pending', report: null, screenshots: [], routeTo: undefined },
      validation: { passed: null, report: null, screenshots: [] },
      iterations: {
        planning: 0,
        execution: 0,
        review: 0,
        delivery: 0,
      },
    };

    const stateFile = path.join(stateDir, 'current-task.json');
    await fs.writeFile(stateFile, JSON.stringify(this.state, null, 2));
  }

  private async runPlanningPhase(input: OrchestratorInput): Promise<Plan> {
    await this.updateState({ phase: 'planning' });
    await this.incrementIteration('planning');
    await this.logEvent({ event: 'phase:enter', phase: 'planning', agent: 'dev-team:orchestrator' });

    const context = await this.gatherContext();

    const planSquad = await this.invokeSkill('dev-team:plan-squad', {
      request: input.request,
      context,
    });

    if (!planSquad.success || !planSquad.data) {
      throw new Error(`Plan Squad failed: ${planSquad.error || 'Unknown error'}`);
    }

    const plan = planSquad.data as Plan;
    const planPath = await this.savePlan(plan);
    await this.updateState({
      plan: { file: planPath, status: 'completed' },
    });

    await this.logEvent({ event: 'phase:complete', phase: 'planning', status: 'success' });
    return plan;
  }

  private async runExecutionPhase(plan: Plan): Promise<ExecutionSquadOutput> {
    await this.updateState({ phase: 'execution' });
    await this.incrementIteration('execution');
    await this.logEvent({ event: 'phase:enter', phase: 'execution', agent: 'dev-team:orchestrator' });

    const projectRoot = process.env.OPENCLAW_CWD || process.cwd();
    const context = await this.gatherContext();

    const executionInput: ExecutionSquadInput = {
      planFile: this.state?.plan.file || '',
      context: {
        projectRoot,
        projectType: context.projectType,
        existingFiles: context.existingFiles,
        techStack: context.techStack,
      },
      provider: this.provider,  // NEW: pass provider to execution squad
    };

    const executionSquad = await this.invokeSkill('dev-team:execution-squad', executionInput);

    if (!executionSquad.success || !executionSquad.data) {
      throw new Error(`Execution Squad failed: ${executionSquad.error || 'Unknown error'}`);
    }

    const execution = executionSquad.data as ExecutionSquadOutput;

    await this.updateState({
      execution: {
        filesChanged: [
          ...execution.execution.filesCreated,
          ...execution.execution.filesModified,
          ...execution.execution.filesDeleted,
        ],
        status: execution.execution.status === 'success' ? 'completed' : 'failed',
      },
    });

    await this.logEvent({ event: 'phase:complete', phase: 'execution', status: execution.execution.status });

    return execution;
  }

  private async runReviewPhase(
    originalRequest: string,
    plan: Plan,
    execution: ExecutionSquadOutput
  ): Promise<ReviewSquadOutput> {
    await this.updateState({ phase: 'review' });
    await this.incrementIteration('review');
    await this.logEvent({ event: 'phase:enter', phase: 'review', agent: 'dev-team:review-squad' });

    const context = await this.gatherContext();

    const reviewInput: ReviewSquadInput = {
      originalRequest,
      plan,
      execution,
      context: {
        projectRoot: process.env.OPENCLAW_CWD || process.cwd(),
        projectType: context.projectType,
        hasFrontend: context.techStack.some(t => ['react', 'vue', 'svelte', 'next'].includes(t)),
        hasBackend: context.techStack.some(t => ['express', 'fastapi', 'django'].includes(t)),
        testCommands: ['npm test'],
      },
    };

    const reviewSquad = await this.invokeSkill('dev-team:review-squad', reviewInput);

    if (!reviewSquad.success || !reviewSquad.data) {
      throw new Error(`Review Squad failed: ${reviewSquad.error || 'Unknown error'}`);
    }

    const review = reviewSquad.data as ReviewSquadOutput;

    await this.updateState({
      review: {
        status: review.status === 'approved' ? 'completed' : 'failed',
        report: null,
        screenshots: [],
        routeTo: review.routeTo,
      },
    });

    await this.logEvent({ event: 'phase:complete', phase: 'review', status: review.status });
    return review;
  }

  private async runDeliveryPhase(
    plan: Plan,
    execution: ExecutionSquadOutput,
    review: ReviewSquadOutput
  ): Promise<void> {
    await this.updateState({ phase: 'delivery' });
    await this.logEvent({ event: 'phase:enter', phase: 'delivery', agent: 'dev-team:orchestrator' });

    await this.logEvent({
      event: 'delivery:complete',
      filesChanged: execution.execution.filesCreated.length + execution.execution.filesModified.length,
      qualityGrade: review.quality.grade,
      planId: plan.metadata.planId,
    });

    await this.logEvent({ event: 'phase:complete', phase: 'delivery', status: 'success' });
  }

  private async gatherContext(): Promise<PlanningContext> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const projectRoot = process.env.OPENCLAW_CWD || process.cwd();

    let existingFiles: string[] = [];
    let techStack: string[] = [];

    try {
      const entries = await fs.readdir(projectRoot, { recursive: true, withFileTypes: true });
      existingFiles = entries
        .filter((e) => e.isFile())
        .map((e) => path.relative(projectRoot, path.join(e.path, e.name)))
        .filter((f) => !f.includes('node_modules') && !f.includes('.git'))
        .slice(0, 100);
    } catch {
      existingFiles = [];
    }

    try {
      const pkgPath = path.join(projectRoot, 'package.json');
      const pkgContent = await fs.readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(pkgContent);
      techStack = [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.devDependencies || {}),
      ].slice(0, 20);
    } catch {
      techStack = [];
    }

    const projectType = this.detectProjectType(techStack, existingFiles);

    return {
      projectType,
      existingFiles,
      techStack,
      constraints: [],
    };
  }

  private detectProjectType(techStack: string[], files: string[]): string {
    if (techStack.includes('next')) return 'nextjs';
    if (techStack.includes('react')) return 'react';
    if (techStack.includes('vue')) return 'vue';
    if (techStack.includes('svelte')) return 'svelte';
    if (techStack.includes('express')) return 'node';
    if (techStack.includes('fastapi') || files.some(f => f.endsWith('.py'))) return 'python';
    if (techStack.includes('django')) return 'django';
    return 'unknown';
  }

  private async invokeSkill(skillName: string, input: unknown): Promise<{ success: boolean; data?: unknown; error?: string }> {
    await this.logEvent({ event: 'skill:invoke', skill: skillName });

    try {
      const skillModule = await import(`../${skillName.replace('dev-team:', '')}/index.js`);

      if (typeof skillModule.handler === 'function') {
        const result = await skillModule.handler(input);
        await this.logEvent({ event: 'skill:complete', skill: skillName, status: 'success' });
        return { success: true, data: result };
      }

      throw new Error(`Skill ${skillName} has no handler export`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logEvent({ event: 'skill:error', skill: skillName, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  private async savePlan(plan: Plan): Promise<string> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const plansDir = path.join(this.workspaceDir, 'plans');
    await fs.mkdir(plansDir, { recursive: true }).catch(() => {});

    const planPath = path.join(plansDir, `${plan.metadata.planId}.json`);
    await fs.writeFile(planPath, JSON.stringify(plan, null, 2));

    return planPath;
  }

  private async incrementIteration(phase: PipelinePhase): Promise<void> {
    if (!this.state) return;

    const iterations: Record<PipelinePhase, number> = {
      planning: 0,
      execution: 0,
      review: 0,
      delivery: 0,
      ...(this.state.iterations || {}),
    };

    if (phase in iterations) {
      iterations[phase] = (iterations[phase] || 0) + 1;
    }

    await this.updateState({ iterations } as Partial<TaskState>);
  }

  private async updateState(updates: Partial<TaskState>): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    if (!this.state) return;

    this.state = { ...this.state, ...updates };

    const stateFile = path.join(this.workspaceDir, 'state', 'current-task.json');
    await fs.writeFile(stateFile, JSON.stringify(this.state, null, 2));
  }

  private async logEvent(event: { event: string } & Omit<PipelineEvent, 'ts' | 'event'>): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const fullEvent: PipelineEvent = {
      ...event,
      ts: new Date().toISOString(),
    };

    this.events.push(fullEvent);
    const logPath = path.join(this.workspaceDir, 'pipeline-log.jsonl');
    await fs.appendFile(logPath, JSON.stringify(fullEvent) + '\\n').catch(() => {});
  }

  getEvents(): PipelineEvent[] {
    return [...this.events];
  }

  getState(): TaskState | null {
    return this.state;
  }
}

export async function handler(input: OrchestratorInput): Promise<{ success: boolean; plan?: Plan; error?: string }> {
  const orchestrator = new Orchestrator();
  return orchestrator.execute(input);
}

export { Orchestrator };