/**
 * OpenClaw Dev Team - Shared Type Definitions
 * 
 * This file contains all shared types used across skills in the dev team.
 */

// ============================================================================
// Core Domain Types
// ============================================================================

/**
 * Represents a single task in the implementation plan
 */
export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: 'frontend' | 'backend' | 'fullstack';
  targetFiles: string[];
  dependencies: string[];
  estimatedTime: string;
}

/**
 * Represents a technical decision made during planning
 */
export interface Decision {
  category: 'tech_stack' | 'architecture' | 'pattern' | 'library';
  choice: string;
  reason: string;
  alternatives?: string[];
}

/**
 * Validation criteria for testing
 */
export interface ValidationCriteria {
  scenario: string;
  expected: string;
  type: 'functional' | 'visual' | 'performance';
}

/**
 * Requirements breakdown
 */
export interface Requirements {
  functional: string[];
  nonFunctional: string[];
}

// ============================================================================
// Architecture Types
// ============================================================================

export interface FrontendConfig {
  framework: string;
  libraries: string[];
  buildTool?: string;
  reason: string;
}

export interface BackendConfig {
  framework: string;
  libraries: string[];
  api?: {
    style: 'REST' | 'GraphQL' | 'gRPC';
    authentication: string;
    documentation?: string;
  };
  reason: string;
}

export interface DatabaseConfig {
  type: string;
  orm?: string;
  schema?: string;
  migrations?: string;
  reason: string;
}

export interface CacheConfig {
  type: string;
  usage: string[];
  reason: string;
}

export interface ContainerConfig {
  name: string;
  baseImage: string;
  ports: number[];
  volumes?: string[];
}

export interface InfrastructureConfig {
  containers: ContainerConfig[];
  services: string[];
  orchestration: string;
}

export interface ThirdPartyIntegration {
  name: string;
  purpose: string;
  integration: string;
  fallback?: string;
}

export interface ArchitectureOutput {
  frontend?: FrontendConfig;
  backend?: BackendConfig;
  database?: DatabaseConfig;
  cache?: CacheConfig;
  infrastructure?: InfrastructureConfig;
  thirdParty?: ThirdPartyIntegration[];
  diagrams?: {
    system?: string;
    dataflow?: string;
  };
  decisions?: Decision[];
  risks?: Risk[];
}

// ============================================================================
// Quality & Review Types
// ============================================================================

/**
 * Quality score check item
 */
export interface QualityCheck {
  name: 'squad_flow' | 'actor_alignment' | 'critic_flow' | 'planning_output' | 'rework_control';
  score: number;
  weight: number;
  max: number;
}

/**
 * Overall quality score
 */
export interface QualityScore {
  overall: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  status: 'pass' | 'warn' | 'fail';
  checks: QualityCheck[];
  risks: string[];
}

/**
 * Issue found by Critic
 */
export interface CriticIssue {
  category: 'requirement_missing' | 'task_incomplete' | 'decision_unclear' | 'risk_not_addressed' | 'consistency_issue';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  suggestion: string;
  targetTask: string | null;
  autoResolvable: boolean;
}

/**
 * Critic review checklist
 */
export interface CriticChecklist {
  requirementCoverage: boolean;
  taskCompleteness: boolean;
  decisionRationale: boolean;
  riskIdentification: boolean;
  consistencyCheck: boolean;
}

/**
 * Critic review result
 */
export interface CriticResult {
  status: 'pass' | 'reject';
  overallOpinion: string;
  issues?: CriticIssue[];
  checklist: CriticChecklist;
  strengths?: string[];
  suggestions?: string[];
}

/**
 * Risk assessment
 */
export interface Risk {
  description: string;
  mitigation: string;
  severity?: 'low' | 'medium' | 'high';
}

// ============================================================================
// Pipeline & State Types
// ============================================================================

/**
 * Pipeline event for logging
 */
export interface PipelineEvent {
  ts: string;
  event: string;
  phase?: string;
  agent?: string;
  status?: string;
  mode?: string;
  members?: string[];
  iteration?: number;
  issues?: number;
  result?: string;
  score?: number;
  grade?: string;
  checks?: QualityCheck[];
  [key: string]: unknown;
}

/**
 * Plan Squad operation mode
 */
export type SquadMode = 'simple' | 'medium' | 'complex';

/**
 * Pipeline phase
 */
export type PipelinePhase = 'planning' | 'execution' | 'validation' | 'delivery';

/**
 * Task status
 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Current task state
 */
export interface TaskState {
  id: string;
  request: string;
  status: TaskStatus;
  phase: PipelinePhase;
  startedAt: string;
  completedAt: string | null;
  source?: {
    from: string;
    channelId: string;
  };
  plan: {
    file: string | null;
    status: TaskStatus;
  };
  execution: {
    filesChanged: string[];
    status: TaskStatus;
  };
  validation: {
    passed: boolean | null;
    report: string | null;
    screenshots: string[];
  };
}

// ============================================================================
// Multi-Agent Types (oh-my-claudecode patterns)
// ============================================================================

/**
 * Model tier for agent execution
 * - quick: Fast processing - for quick lookups, simple scans, testing
 * - balanced: Balanced processing - for implementation, debugging, reviews
 * - deep: Deep analysis - for architecture, complex logic, planning
 */
export type ModelTier = 'quick' | 'balanced' | 'deep';

/**
 * Agent definition with capabilities and model assignment
 */
export interface AgentDefinition {
  name: string;
  description: string;
  tools: string[];
  model: ModelTier;
  systemPrompt?: string;
}

/**
 * Team composition preset for different task types
 */
export interface TeamComposition {
  name: string;
  description: string;
  agents: string[];
  workflow: 'sequential' | 'parallel' | 'hybrid';
}

/**
 * Stage configuration for pipeline execution
 */
export interface StageConfig {
  name: string;
  agents: string[];
  defaultModel: ModelTier;
  nextStage: string;
  canLoop?: boolean;
  maxIterations?: number;
}

/**
 * Model configuration for different complexity levels
 */
export interface ModelConfig {
  tier: ModelTier;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Agent registry - maps agent names to their definitions
 */
export type AgentRegistry = Map<string, AgentDefinition>;

/**
 * Predefined team compositions
 */
export const TEAM_COMPOSITIONS: Record<string, TeamComposition> = {
  feature: {
    name: 'feature',
    description: 'Full feature development workflow',
    agents: ['planner', 'coder', 'code-reviewer', 'tester'],
    workflow: 'hybrid'
  },
  bugfix: {
    name: 'bugfix',
    description: 'Bug investigation and fix workflow',
    agents: ['debugger', 'coder', 'tester'],
    workflow: 'sequential'
  },
  review: {
    name: 'review',
    description: 'Code review only',
    agents: ['code-reviewer', 'quality-reviewer'],
    workflow: 'parallel'
  },
  refactor: {
    name: 'refactor',
    description: 'Refactoring workflow',
    agents: ['architect', 'coder', 'code-reviewer'],
    workflow: 'hybrid'
  }
};

/**
 * Default model assignments per agent role
 */
export const AGENT_MODEL_DEFAULTS: Record<string, ModelTier> = {
  // Deep analysis agents
  planner: 'deep',
  architect: 'deep',
  critic: 'deep',
  'code-reviewer': 'deep',
  'security-reviewer': 'deep',
  
  // Balanced processing agents
  coder: 'balanced',
  debugger: 'balanced',
  'quality-reviewer': 'balanced',
  'qa-tester': 'balanced',
  verifier: 'balanced',
  
  // Quick processing agents
  tester: 'quick',
  explorer: 'quick',
  librarian: 'quick',
};

// ============================================================================
// Input/Output Types for Skills
// ============================================================================

/**
 * Context provided to planning skills
 */
export interface PlanningContext {
  projectType: string;
  existingFiles: string[];
  techStack: string[];
  constraints: string[];
}

/**
 * Input for Orchestrator
 */
export interface OrchestratorInput {
  taskId: string;
  request: string;
  source: {
    from: string;
    channelId: string;
  };
}

/**
 * Input for Plan Squad
 */
export interface PlanSquadInput {
  request: string;
  context: PlanningContext;
}

/**
 * Input for Planner
 */
export interface PlannerInput {
  request: string;
  context: PlanningContext;
  previousPlan?: Plan;
  criticOpinion?: CriticResult;
}

/**
 * Input for Critic
 */
export interface CriticInput {
  plan: Plan;
  originalRequest: string;
  previousReviews?: CriticResult[];
}

/**
 * Complete plan output
 */
export interface Plan {
  metadata: {
    planId: string;
    taskId: string;
    mode: SquadMode;
    iterations: number;
    createdAt: string;
  };
  requirements: Requirements;
  tasks: Task[];
  architecture?: ArchitectureOutput;
  decisions: Decision[];
  validation_criteria: ValidationCriteria[];
  review?: {
    criticOpinion: string;
    iterations: number;
    approved: boolean;
  };
  quality?: QualityScore;
}

/**
 * Plan Squad output
 */
export interface PlanSquadOutput extends Plan {
  metadata: {
    planId: string;
    taskId: string;
    mode: SquadMode;
    members: string[];
    iterations: number;
    createdAt: string;
  };
  quality: QualityScore;
}

/**
 * Executor input
 */
export interface ExecutorInput {
  planFile: string;
  mode: 'frontend' | 'backend' | 'integration';
  targetTasks: string[];
  context: {
    projectRoot: string;
    existingCode: Map<string, string>;
  };
}

/**
 * Executor output
 */
export interface ExecutorOutput {
  status: 'success' | 'partial' | 'failed';
  filesCreated: string[];
  filesModified: string[];
  filesDeleted: string[];
  dependencies: {
    added: string[];
    removed: string[];
  };
  errors: ExecutorError[];
  nextSteps: string[];
}

/**
 * Executor error
 */
export interface ExecutorError {
  taskId: string;
  message: string;
  stack?: string;
}

/**
 * Validator input
 */
export interface ValidatorInput {
  executionOutput: ExecutorOutput;
  testScenarios: TestScenario[];
  config: {
    devServerCommand: string;
    devServerUrl: string;
    timeout: number;
    captureScreenshots: boolean;
  };
}

/**
 * Test scenario for validation
 */
export interface TestScenario {
  id: string;
  name: string;
  steps: TestStep[];
  expectedOutcome: string;
}

/**
 * Single test step
 */
export interface TestStep {
  action: 'navigate' | 'click' | 'fill' | 'wait' | 'assert' | 'screenshot';
  target?: string;
  value?: string;
  timeout?: number;
}

/**
 * Validator output
 */
export interface ValidatorOutput {
  status: 'passed' | 'failed' | 'partial';
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  scenarios: ScenarioResult[];
  screenshots: string[];
  consoleErrors: ConsoleError[];
  reportFile: string;
}

/**
 * Test scenario result
 */
export interface ScenarioResult {
  scenarioId: string;
  status: 'passed' | 'failed';
  duration: number;
  steps: StepResult[];
  error?: string;
}

/**
 * Single step result
 */
export interface StepResult {
  status: 'passed' | 'failed';
  step: TestStep;
  error?: string;
}

/**
 * Console error from browser
 */
export interface ConsoleError {
  message: string;
  timestamp: number;
}

// ============================================================================
// Execution Squad Types
// ============================================================================

/**
 * Input for Execution Squad
 */
export interface ExecutionSquadInput {
  planFile: string;
  context: {
    projectRoot: string;
    projectType: string;
    existingFiles: string[];
    techStack: string[];
  };
}

/**
 * Output from Execution Squad
 */
export interface ExecutionSquadOutput {
  metadata: {
    executionId: string;
    mode: SquadMode;
    members: string[];
    iterations: number;
    createdAt: string;
  };
  execution: {
    status: 'success' | 'partial' | 'failed';
    filesCreated: string[];
    filesModified: string[];
    filesDeleted: string[];
  };
  dependencies: {
    added: string[];
    removed: string[];
  };
  tests: {
    passed: number;
    failed: number;
    skipped: number;
    coverage?: number;
  };
  quality: ExecutionQualityScore;
  errors: ExecutionError[];
  nextSteps: string[];
}

/**
 * Quality score for execution
 */
export interface ExecutionQualityScore {
  overall: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  status: 'pass' | 'warn' | 'fail';
  checks: ExecutionQualityCheck[];
  risks: string[];
}

/**
 * Quality check item for execution
 */
export interface ExecutionQualityCheck {
  name: 'squad_flow' | 'actor_alignment' | 'code_quality' | 'test_coverage' | 'rework_control';
  score: number;
  weight: number;
  max: number;
}

/**
 * Execution error
 */
export interface ExecutionError {
  type: 'type_error' | 'lint_error' | 'runtime_error' | 'dependency_error';
  message: string;
  file?: string;
  line?: number;
  stack?: string;
}

/**
 * Code reviewer result
 */
export interface CodeReviewerResult {
  status: 'pass' | 'reject';
  overallOpinion: string;
  issues: CodeIssue[];
  checklist: {
    typeSafety: boolean;
    codeStyle: boolean;
    bestPractices: boolean;
    errorHandling: boolean;
    securityCheck: boolean;
  };
  strengths?: string[];
  suggestions?: string[];
}

/**
 * Code issue found by reviewer
 */
export interface CodeIssue {
  category: 'type_error' | 'lint_error' | 'pattern_violation' | 'security_issue' | 'missing_error_handling';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  suggestion: string;
  targetFile: string;
  line?: number;
  autoResolvable: boolean;
}

/**
 * Tester result
 */
export interface TesterResult {
  status: 'passed' | 'failed' | 'partial';
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  testResults: TestResultItem[];
  coverage?: {
    lines: number;
    branches: number;
    functions: number;
  };
  failures: TestFailure[];
}

/**
 * Individual test result
 */
export interface TestResultItem {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

/**
 * Test failure details
 */
export interface TestFailure {
  testName: string;
  message: string;
  stack?: string;
}

/**
 * Generated file from coder
 */
export interface GeneratedFile {
  path: string;
  action: 'create' | 'modify' | 'delete';
  content: string;
  dependencies?: string[];
}

/**
 * Coder output
 */
export interface CoderOutput {
  files: GeneratedFile[];
  imports: {
    added: string[];
    removed: string[];
  };
  dependencies: {
    added: string[];
    removed: string[];
  };
}

/**
 * Dependency manager result
 */
export interface DependencyManagerResult {
  status: 'success' | 'failed';
  installed: string[];
  failed: string[];
  lockFileUpdated: boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Result wrapper for async operations
 */
export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

/**
 * Configuration for dev team
 */
export interface DevTeamConfig {
  maxRetries: number;
  timeout: number;
  enableScreenshots: boolean;
  reportFormat: 'markdown' | 'json';
  planSquad?: {
    maxReworkIterations: number;
    defaultMode: SquadMode;
    enableAutoEscalation: boolean;
  };
  executionSquad?: {
    maxReworkIterations: number;
    defaultMode: SquadMode;
    enableAutoEscalation: boolean;
    runTests: boolean;
    testTimeout: number;
  };
  validation?: {
    devServerCommand: string;
    devServerUrl: string;
    timeout: number;
    captureScreenshots: boolean;
    screenshotOnFailure: boolean;
    collectConsoleErrors: boolean;
  };
}


// ============================================================================
// Review Squad Types
// ============================================================================

/**
 * Review Squad operation mode
 * - basic: Reviewer only (simple changes, style fixes)
 * - full: Reviewer + QA Tester + Final Approver (feature additions/changes)
 */
export type ReviewMode = 'basic' | 'full';

/**
 * Review Squad input
 */
export interface ReviewSquadInput {
  originalRequest: string;          // Original user request
  plan: Plan;                       // Plan Squad output
  execution: ExecutionSquadOutput;  // Execution Squad output
  context: {
    projectRoot: string;
    projectType: string;
    hasFrontend: boolean;
    hasBackend: boolean;
    testCommands: string[];
  };
}

/**
 * Requirement mismatch found by Reviewer
 */
export interface RequirementMismatch {
  category: 'missing_feature' | 'incomplete_implementation' | 'plan_deviation' | 'extra_implementation';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  source: 'request' | 'plan' | 'execution';
  suggestion: string;
  targetTask?: string;
  targetFile?: string;
}

/**
 * Reviewer checklist
 */
export interface ReviewerChecklist {
  requirementCoverage: boolean;      // All requirements implemented
  planConsistency: boolean;          // Implementation matches plan
  implementationCompleteness: boolean; // All planned tasks completed
}

/**
 * Reviewer result
 */
export interface ReviewerResult {
  status: 'pass' | 'reject';
  overallOpinion: string;
  mismatches: RequirementMismatch[];
  checklist: ReviewerChecklist;
  strengths?: string[];
  suggestions?: string[];
}

/**
 * QA test scenario result
 */
export interface QAScenarioResult {
  name: string;
  description: string;
  steps: string[];
  status: 'passed' | 'failed' | 'skipped';
  error?: string;
  evidence?: string;  // Screenshot path or log excerpt
  duration?: number;
}

/**
 * QA Tester result (human-like testing)
 */
export interface QATesterResult {
  status: 'passed' | 'failed' | 'partial';
  testType: 'browser' | 'cli' | 'both';
  scenarios: QAScenarioResult[];
  screenshots: string[];
  logs: string[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  environment?: {
    frontendUrl?: string;
    backendUrl?: string;
    cliCommand?: string;
  };
}

/**
 * Issue reported to Final Approver
 */
export interface ApprovalIssue {
  source: 'reviewer' | 'qa_tester';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  recommendation: string;
  targetStage?: 'planner' | 'executor';
}

/**
 * Quality check for Review Squad
 */
export interface ReviewQualityCheck {
  name: 'squad_flow' | 'actor_alignment' | 'requirement_traceability' | 'qa_coverage' | 'rework_control';
  score: number;
  weight: number;
  max: number;
}

/**
 * Quality score for Review Squad
 */
export interface ReviewQualityScore {
  overall: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  status: 'pass' | 'warn' | 'fail';
  checks: ReviewQualityCheck[];
  risks: string[];
}

/**
 * Final Approver result
 */
export interface FinalApproverResult {
  status: 'approved' | 'rejected';
  overallOpinion: string;
  routeTo?: 'planner' | 'executor';
  issues: ApprovalIssue[];
  quality: ReviewQualityScore;
  nextAction?: string;
}

/**
 * Review Squad output
 */
export interface ReviewSquadOutput {
  metadata: {
    reviewId: string;
    mode: ReviewMode;
    members: string[];
    iterations: number;
    createdAt: string;
  };
  status: 'approved' | 'rejected';
  routeTo?: 'planner' | 'executor' | 'delivery';
  reviewer?: ReviewerResult;
  qaTester?: QATesterResult;
  finalApprover?: FinalApproverResult;
  quality: ReviewQualityScore;
  summary: {
    totalIssues: number;
    criticalIssues: number;
    testPassRate: number;
  };
}

/**
 * Review Squad configuration
 */
export interface ReviewSquadConfig {
  maxReworkIterations: number;
  defaultMode: ReviewMode;
  enableAutoRouting: boolean;
  enableScreenshots: boolean;
  testTimeout: number;
}

/**
 * Pipeline phase (updated to include review)
 */
export type PipelinePhaseWithReview = 'planning' | 'execution' | 'review' | 'delivery';

/**
 * Updated task state with review phase
 */
export interface TaskStateWithReview extends TaskState {
  phase: PipelinePhaseWithReview;
  review?: {
    status: TaskStatus;
    report: string | null;
    screenshots: string[];
    routeTo?: 'planner' | 'executor' | 'delivery';
  };
}

/**
 * Update DevTeamConfig to include Review Squad
 */
export interface DevTeamConfigWithReview extends DevTeamConfig {
  reviewSquad?: {
    maxReworkIterations: number;
    defaultMode: ReviewMode;
    enableAutoRouting: boolean;
    testTimeout: number;
    captureScreenshots: boolean;
  };
}

// Update AGENT_MODEL_DEFAULTS to include new agents
export const REVIEW_AGENT_MODEL_DEFAULTS: Record<string, ModelTier> = {
  'reviewer': 'balanced',
  'qa-tester': 'balanced',
  'final-approver': 'deep',
};

// Update TEAM_COMPOSITIONS to include review workflow
export const TEAM_COMPOSITIONS_WITH_REVIEW: Record<string, TeamComposition> = {
  ...TEAM_COMPOSITIONS,
  'full-review': {
    name: 'full-review',
    description: 'Full development with review workflow',
    agents: ['planner', 'coder', 'reviewer', 'qa-tester', 'final-approver'],
    workflow: 'hybrid'
  },
  'quick-review': {
    name: 'quick-review',
    description: 'Quick development with basic review',
    agents: ['planner', 'coder', 'reviewer'],
    workflow: 'sequential'
  }
};
