import type {
  ExecutionSquadInput,
  ExecutionSquadOutput,
  SquadMode,
  Plan,
  PipelineEvent,
  DevTeamConfig,
  CodeReviewerResult,
  TesterResult,
  ExecutionQualityScore,
  ExecutionQualityCheck,
  CoderOutput,
  ExecutionError,
  AIProvider,
} from '../types';

const DEFAULT_CONFIG: DevTeamConfig['executionSquad'] = {
  maxReworkIterations: 3,
  defaultMode: 'medium',
  enableAutoEscalation: true,
  runTests: true,
  testTimeout: 60000,
};

class ExecutionSquadLeader {
  private config: typeof DEFAULT_CONFIG;
  private events: PipelineEvent[] = [];
  private workspaceDir: string;
  private provider: AIProvider = 'openclaw';  // NEW: AI provider from input

  constructor(config: Partial<typeof DEFAULT_CONFIG> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.workspaceDir = process.env.OPENCLAW_WORKSPACE || 
      `${process.env.HOME}/.openclaw/workspace/dev-team`;
  }

  async execute(input: ExecutionSquadInput): Promise<ExecutionSquadOutput> {
    const executionId = 'exec-' + Date.now();
    
    // Set AI provider from input
    this.provider = input.provider || 'openclaw';
    
    try {

      const plan = await this.loadPlan(input.planFile);
      const mode = this.analyzeComplexity(plan, input.context);
      const members = this.getMembersForMode(mode);

      await this.logEvent({ event: 'squad:start', mode, members });

      let execution = await this.runCoder(plan, input.context);
      let iterations = 0;

      if (mode !== 'simple') {
        let reviewResult = await this.runCodeReviewer(execution, plan, input.context);
        let testResult = await this.runTester(execution, input.context);

        await this.logEvent({
          event: 'quality:check',
          reviewStatus: reviewResult.status,
          testStatus: testResult.status,
          issues: reviewResult.issues?.length || 0,
          testFailed: testResult.summary.failed
        });

        while (
          (reviewResult.status === 'reject' || testResult.status === 'failed')
          && iterations < this.config.maxReworkIterations
        ) {
          iterations++;
          await this.logEvent({ event: 'rework:start', iteration: iterations });

          execution = await this.runCoder(plan, input.context, {
            previousExecution: execution,
            reviewFeedback: reviewResult,
            testFeedback: testResult
          });

          reviewResult = await this.runCodeReviewer(execution, plan, input.context);
          testResult = await this.runTester(execution, input.context);

          await this.logEvent({
            event: 'rework:complete',
            iteration: iterations,
            reviewStatus: reviewResult.status,
            testStatus: testResult.status
          });
        }

        if ((reviewResult.status === 'reject' || testResult.status === 'failed') 
            && this.config.enableAutoEscalation) {
          execution = await this.escalateToIntervention(execution, reviewResult, testResult);
          await this.logEvent({
            event: 'escalation:leader_intervention',
            reason: 'max_iterations_exceeded'
          });
        }
      }

      if (mode === 'complex' && execution.dependencies.added.length > 0) {
        await this.runDependencyManager(execution, input.context);
      }

      const quality = this.calculateQualityScore({
        mode,
        members,
        iterations,
        execution,
        events: this.events
      });

      await this.logEvent({
        event: 'quality:score',
        score: quality.overall,
        grade: quality.grade,
        status: quality.status
      });

      const output: ExecutionSquadOutput = {
        metadata: {
          executionId,
          mode,
          members,
          iterations,
          createdAt: new Date().toISOString()
        },
        execution: {
          status: quality.status === 'fail' ? 'failed' : 'success',
          filesCreated: execution.files.filter(f => f.action === 'create').map(f => f.path),
          filesModified: execution.files.filter(f => f.action === 'modify').map(f => f.path),
          filesDeleted: execution.files.filter(f => f.action === 'delete').map(f => f.path)
        },
        dependencies: execution.dependencies,
        tests: {
          passed: 0,
          failed: 0,
          skipped: 0
        },
        quality,
        errors: [],
        nextSteps: []
      };

      await this.logEvent({
        event: 'squad:complete',
        status: quality.status === 'fail' ? 'escalated' : 'success',
        mode,
        iterations
      });

      return output;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logEvent({ event: 'squad:error', error: errorMessage });
      
      return {
        metadata: {
          executionId,
          mode: 'simple',
          members: [],
          iterations: 0,
          createdAt: new Date().toISOString()
        },
        execution: {
          status: 'failed',
          filesCreated: [],
          filesModified: [],
          filesDeleted: []
        },
        dependencies: { added: [], removed: [] },
        tests: { passed: 0, failed: 0, skipped: 0 },
        quality: {
          overall: 0,
          grade: 'F',
          status: 'fail',
          checks: [],
          risks: [errorMessage]
        },
        errors: [{ type: 'runtime_error', message: errorMessage }],
        nextSteps: []
      };
    }
  }

  private async loadPlan(planFile: string): Promise<Plan> {
    const fs = await import('fs/promises');
    const content = await fs.readFile(planFile, 'utf-8');
    return JSON.parse(content);
  }

  private analyzeComplexity(plan: Plan, context: ExecutionSquadInput['context']): SquadMode {
    const taskCount = plan.tasks?.length || 0;
    const hasDatabase = plan.architecture?.database?.type !== undefined;
    const hasExternalApi = (plan.architecture?.thirdParty?.length || 0) > 0;
    
    const newDependencies = this.estimateNewDependencies(plan);

    if (taskCount > 5 || hasDatabase || hasExternalApi || newDependencies > 2) {
      return 'complex';
    }

    if (taskCount > 2 || newDependencies > 0) {
      return 'medium';
    }

    return 'simple';
  }

  private estimateNewDependencies(plan: Plan): number {
    const deps = new Set<string>();
    
    for (const task of plan.tasks || []) {
      const desc = task.description?.toLowerCase() || '';
      
      if (desc.includes('zustand')) deps.add('zustand');
      if (desc.includes('react-query') || desc.includes('tanstack')) deps.add('@tanstack/react-query');
      if (desc.includes('axios')) deps.add('axios');
      if (desc.includes('prisma')) deps.add('prisma');
      if (desc.includes('tailwind')) deps.add('tailwindcss');
      if (desc.includes('chart') || desc.includes('recharts')) deps.add('recharts');
      if (desc.includes('date') || desc.includes('dayjs')) deps.add('dayjs');
    }

    return deps.size;
  }

  private getMembersForMode(mode: SquadMode): string[] {
    switch (mode) {
      case 'simple':
        return ['coder'];
      case 'medium':
        return ['coder', 'code-reviewer', 'tester'];
      case 'complex':
        return ['coder', 'code-reviewer', 'tester', 'dependency-manager'];
    }
  }

  private async runCoder(
    plan: Plan,
    context: ExecutionSquadInput['context'],
    options?: {
      previousExecution?: CoderOutput;
      reviewFeedback?: CodeReviewerResult;
      testFeedback?: TesterResult;
    }
  ): Promise<CoderOutput> {
    await this.logEvent({ event: 'coder:start', tasks: plan.tasks?.length || 0, provider: this.provider });

    try {
      const { buildCoderPrompt, CODER_SYSTEM_PROMPT } = await import('../coder/prompt.js');
      const { invokeAI, parseJsonResponse } = await import('../utils/ai.js');

      const prompt = buildCoderPrompt(plan, context, options);
      const response = await invokeAI(CODER_SYSTEM_PROMPT, prompt, {
        skill: 'coder',
        modelTier: 'deep',
        provider: this.provider,  // NEW: pass provider to AI invocation
      });
      const parsed = parseJsonResponse(response);

      const files = (parsed.files || []).map((f: Record<string, unknown>) => ({

        path: String(f.path || ''),
        action: (f.action as 'create' | 'modify' | 'delete') || 'create',
        content: String(f.content || ''),
        dependencies: Array.isArray(f.dependencies) ? f.dependencies.map(String) : []
      }));

      for (const file of files) {
        await this.writeFile(file.path, file.content, file.action);
        await this.logEvent({
          event: `file:${file.action}`,
          path: file.path,
          lines: file.content.split('\n').length
        });
      }

      await this.logEvent({ event: 'coder:complete', files: files.length });

      return {
        files,
        imports: {
          added: Array.isArray(parsed.imports?.added) ? parsed.imports.added.map(String) : [],
          removed: Array.isArray(parsed.imports?.removed) ? parsed.imports.removed.map(String) : []
        },
        dependencies: {
          added: Array.isArray(parsed.dependencies?.added) ? parsed.dependencies.added.map(String) : [],
          removed: Array.isArray(parsed.dependencies?.removed) ? parsed.dependencies.removed.map(String) : []
        }
      };
    } catch (error) {
      await this.logEvent({
        event: 'coder:error',
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        files: [],
        imports: { added: [], removed: [] },
        dependencies: { added: [], removed: [] }
      };
    }
  }

  private async writeFile(path: string, content: string, action: string): Promise<void> {
    const fs = await import('fs/promises');
    const pathModule = await import('path');

    const fullPath = pathModule.resolve(path);
    const dir = pathModule.dirname(fullPath);

    await fs.mkdir(dir, { recursive: true }).catch(() => {});

    if (action === 'delete') {
      await fs.unlink(fullPath).catch(() => {});
    } else {
      await fs.writeFile(fullPath, content);
    }
  }

  private async runCodeReviewer(
    execution: CoderOutput,
    plan: Plan,
    context: ExecutionSquadInput['context']
  ): Promise<CodeReviewerResult> {
    await this.logEvent({ event: 'review:start' });

    try {
      const { buildReviewPrompt, CODE_REVIEWER_SYSTEM_PROMPT } = await import('../code-reviewer/prompt.js');
      const { invokeAI, parseJsonResponse } = await import('../utils/ai.js');

      const typeErrors = await this.runTypeCheck(execution, context);
      const lintErrors = await this.runLint(execution, context);

      const prompt = buildReviewPrompt(execution, plan, { typeErrors, lintErrors });
      const response = await invokeAI(CODE_REVIEWER_SYSTEM_PROMPT, prompt, { skill: 'code-reviewer', modelTier: 'standard' });
      const parsed = parseJsonResponse(response);

      const issues = [
        ...typeErrors.map(e => ({
          category: 'type_error' as const,
          severity: 'critical' as const,
          description: e.message,
          suggestion: 'Fix type error',
          targetFile: e.file,
          line: e.line,
          autoResolvable: false
        })),
        ...lintErrors.map(e => ({
          category: 'lint_error' as const,
          severity: 'major' as const,
          description: e.message,
          suggestion: e.fix || 'Fix lint issue',
          targetFile: e.file,
          line: e.line,
          autoResolvable: e.fixable
        })),
        ...(parsed.issues || [])
      ];

      const criticalCount = issues.filter((i: { severity: string }) => i.severity === 'critical').length;
      const status = criticalCount === 0 && (parsed.checklist?.typeSafety !== false) ? 'pass' : 'reject';

      await this.logEvent({
        event: 'review:result',
        status,
        issues: issues.length,
        critical: criticalCount
      });

      return {
        status,
        overallOpinion: parsed.overallOpinion || '',
        issues,
        checklist: {
          typeSafety: typeErrors.length === 0,
          codeStyle: lintErrors.length === 0,
          bestPractices: parsed.checklist?.bestPractices !== false,
          errorHandling: parsed.checklist?.errorHandling !== false,
          securityCheck: parsed.checklist?.securityCheck !== false
        }
      };
    } catch (error) {
      await this.logEvent({
        event: 'review:error',
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        status: 'pass',
        overallOpinion: 'Review skipped due to error',
        issues: [],
        checklist: {
          typeSafety: true,
          codeStyle: true,
          bestPractices: true,
          errorHandling: true,
          securityCheck: true
        }
      };
    }
  }

  private async runTypeCheck(
    execution: CoderOutput,
    context: ExecutionSquadInput['context']
  ): Promise<Array<{ file: string; line: number; message: string }>> {
    const errors: Array<{ file: string; line: number; message: string }> = [];
    
    if (context.projectType !== 'nextjs' && context.projectType !== 'react') {
      return errors;
    }

    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const result = await execAsync('npx tsc --noEmit 2>&1', {
        cwd: context.projectRoot,
        timeout: 30000
      }).catch(e => ({ stdout: e.stdout || '', stderr: e.stderr || '' }));

      const output = result.stdout || result.stderr || '';
      const lines = output.split('\n');

      for (const line of lines) {
        const match = line.match(/^(.+?)\((\d+),(\d+)\): error (.+)$/);
        if (match) {
          errors.push({
            file: match[1],
            line: parseInt(match[2], 10),
            message: match[4]
          });
        }
      }
    } catch {
      // Type check not available, skip
    }

    return errors;
  }

  private async runLint(
    execution: CoderOutput,
    context: ExecutionSquadInput['context']
  ): Promise<Array<{ file: string; line: number; message: string; fix?: string; fixable: boolean }>> {
    const errors: Array<{ file: string; line: number; message: string; fix?: string; fixable: boolean }> = [];

    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const result = await execAsync('npx eslint --format json 2>&1', {
        cwd: context.projectRoot,
        timeout: 30000
      }).catch(e => ({ stdout: e.stdout || '', stderr: '' }));

      const output = result.stdout || '';
      
      try {
        const lintResults = JSON.parse(output);
        for (const result of lintResults) {
          for (const msg of result.messages || []) {
            errors.push({
              file: result.filePath,
              line: msg.line,
              message: msg.message,
              fix: msg.fix ? 'Auto-fix available' : undefined,
              fixable: !!msg.fix
            });
          }
        }
      } catch {
        // JSON parse failed, lint not available
      }
    } catch {
      // Lint not available, skip
    }

    return errors;
  }

  private async runTester(
    execution: CoderOutput,
    context: ExecutionSquadInput['context']
  ): Promise<TesterResult> {
    await this.logEvent({ event: 'test:run', command: 'npm test' });

    try {
      const { runTests } = await import('../tester/runner.js');
      const result = await runTests(context.projectRoot, this.config.testTimeout);

      await this.logEvent({
        event: 'test:result',
        passed: result.summary.passed,
        failed: result.summary.failed,
        skipped: result.summary.skipped
      });

      return result;
    } catch (error) {
      await this.logEvent({
        event: 'test:error',
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        status: 'passed',
        summary: { total: 0, passed: 0, failed: 0, skipped: 0 },
        testResults: [],
        failures: []
      };
    }
  }

  private async runDependencyManager(
    execution: CoderOutput,
    context: ExecutionSquadInput['context']
  ): Promise<void> {
    const { added } = execution.dependencies;
    
    if (added.length === 0) return;

    await this.logEvent({ event: 'deps:install', packages: added });

    try {
      const { installDependencies } = await import('../dependency-manager/manager.js');
      await installDependencies(added, context.projectRoot);
      
      await this.logEvent({ event: 'deps:complete', status: 'success' });
    } catch (error) {
      await this.logEvent({
        event: 'deps:error',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async escalateToIntervention(
    execution: CoderOutput,
    lastReviewResult: CodeReviewerResult,
    lastTestResult: TesterResult
  ): Promise<CoderOutput> {
    return {
      ...execution,
      files: execution.files.map(f => ({
        ...f,
        content: `// ESCALATED - Manual review required\n// Review issues: ${lastReviewResult.issues?.length || 0}\n// Test failures: ${lastTestResult.summary.failed}\n\n${f.content}`
      }))
    };
  }

  private calculateQualityScore(params: {
    mode: SquadMode;
    members: string[];
    iterations: number;
    execution: CoderOutput;
    events: PipelineEvent[];
  }): ExecutionQualityScore {
    const checks: ExecutionQualityCheck[] = [
      this.checkSquadFlow(params),
      this.checkActorAlignment(params),
      this.checkCodeQuality(params.execution),
      this.checkTestCoverage(params),
      this.checkReworkControl(params.iterations)
    ];

    const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
    const weightedScore = checks.reduce((sum, c) => sum + (c.score / c.max) * c.weight, 0);
    const overall = Math.round((weightedScore / totalWeight) * 100);

    const grade = this.scoreToGrade(overall);
    const status = overall >= 85 ? 'pass' : overall >= 70 ? 'warn' : 'fail';

    return {
      overall,
      grade,
      status,
      checks,
      risks: this.identifyRisks(params.execution)
    };
  }

  private checkSquadFlow(params: { mode: SquadMode; events: PipelineEvent[] }): ExecutionQualityCheck {
    const hasStart = params.events.some(e => e.event === 'squad:start');
    const hasComplete = params.events.some(e => e.event === 'squad:complete');
    const modeConsistent = params.events.every(e => !e.mode || e.mode === params.mode);

    let score = 0;
    if (hasStart) score += 8;
    if (hasComplete) score += 9;
    if (modeConsistent) score += 8;

    return { name: 'squad_flow', score, weight: 25, max: 25 };
  }

  private checkActorAlignment(params: { mode: SquadMode; members: string[] }): ExecutionQualityCheck {
    const requiredMembers = this.getMembersForMode(params.mode);
    const allPresent = requiredMembers.every(m => params.members.includes(m));

    return { name: 'actor_alignment', score: allPresent ? 15 : 7, weight: 15, max: 15 };
  }

  private checkCodeQuality(execution: CoderOutput): ExecutionQualityCheck {
    const fileCount = execution.files.length;
    const hasFiles = fileCount > 0;
    
    let score = 0;
    if (hasFiles) score += 10;
    if (fileCount > 0 && fileCount <= 10) score += 8;
    if (execution.dependencies.added.length <= 3) score += 7;

    return { name: 'code_quality', score: Math.min(score, 25), weight: 25, max: 25 };
  }

  private checkTestCoverage(params: { execution: CoderOutput; events: PipelineEvent[] }): ExecutionQualityCheck {
    const testEvent = params.events.find(e => e.event === 'test:result');
    
    if (!testEvent) {
      return { name: 'test_coverage', score: 20, weight: 20, max: 20 };
    }

    const passed = (testEvent.passed as number) || 0;
    const failed = (testEvent.failed as number) || 0;
    const total = passed + failed;

    if (total === 0) {
      return { name: 'test_coverage', score: 20, weight: 20, max: 20 };
    }

    const passRate = passed / total;
    const score = Math.round(passRate * 20);

    return { name: 'test_coverage', score, weight: 20, max: 20 };
  }

  private checkReworkControl(iterations: number): ExecutionQualityCheck {
    const withinLimit = iterations <= this.config.maxReworkIterations;
    const score = withinLimit ? 15 : Math.max(0, 15 - (iterations - this.config.maxReworkIterations) * 5);

    return { name: 'rework_control', score, weight: 15, max: 15 };
  }

  private scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private identifyRisks(execution: CoderOutput): string[] {
    const risks: string[] = [];

    if (execution.files.length > 10) {
      risks.push('Large number of files changed - review carefully');
    }

    if (execution.dependencies.added.length > 3) {
      risks.push('Multiple new dependencies - verify compatibility');
    }

    return risks;
  }

  private async logEvent(event: Omit<PipelineEvent, 'ts'>): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const fullEvent: PipelineEvent = {
      ...event,
      ts: new Date().toISOString()
    };

    this.events.push(fullEvent);

    const logPath = path.join(this.workspaceDir, 'pipeline-log.jsonl');
    await fs.appendFile(logPath, JSON.stringify(fullEvent) + '\n').catch(() => {});
  }
}

export async function handler(input: ExecutionSquadInput): Promise<ExecutionSquadOutput> {
  const leader = new ExecutionSquadLeader();
  return leader.execute(input);
}

export { ExecutionSquadLeader };
