import { ModelTier, AGENT_MODEL_DEFAULTS, AIProvider, CodexCLIConfig } from '../types';
import { checkCodexAvailability, runCodexCLI, getCodexSetupGuide } from './codex-cli.js';


export type AIModelTier = 'fast' | 'standard' | 'deep';

export interface AIInvocationOptions {
  modelTier?: AIModelTier;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  timeoutMs?: number;
  skill?: string;
  provider?: AIProvider;        // NEW: AI backend selection
  codexConfig?: CodexCLIConfig;  // NEW: Codex-specific config
}

type OpenClawInvokeAI = (

  systemPrompt: string,
  userPrompt: string,
  options?: AIInvocationOptions
) => Promise<string>;

let openclawAI: OpenClawInvokeAI | null = null;

function inferModelTier(systemPrompt: string): AIModelTier {
  if (systemPrompt.includes('Architecture agent') || systemPrompt.includes('Critic agent') || systemPrompt.includes('Code Reviewer agent')) {
    return 'deep';
  }

  if (systemPrompt.includes('Planner agent') || systemPrompt.includes('Coder agent')) {
    return 'standard';
  }

  return 'standard';
}

function getModelOptions(modelTier: AIModelTier): AIInvocationOptions {
  const fallbackModel = process.env.OPENCLAW_AI_MODEL || undefined;
  const modelByTier: Record<AIModelTier, string | undefined> = {
    fast: process.env.OPENCLAW_AI_MODEL_FAST || fallbackModel,
    standard: process.env.OPENCLAW_AI_MODEL_STANDARD || process.env.OPENCLAW_AI_MODEL || fallbackModel,
    deep: process.env.OPENCLAW_AI_MODEL_DEEP || process.env.OPENCLAW_AI_MODEL || fallbackModel,
  };

  const defaults: Record<AIModelTier, Pick<AIInvocationOptions, 'temperature' | 'maxTokens' | 'topP'>> = {
    fast: { temperature: 0.4, maxTokens: 800, topP: 0.9 },
    standard: { temperature: 0.55, maxTokens: 1600, topP: 0.95 },
    deep: { temperature: 0.3, maxTokens: 3200, topP: 0.95 },
  };

  const options: AIInvocationOptions = {
    modelTier,
    model: modelByTier[modelTier],
    ...defaults[modelTier],
  };

  if (!options.model) {
    delete options.model;
  }

  return options;
}

function buildInvocationOptions(systemPrompt: string, options: AIInvocationOptions = {}): AIInvocationOptions {
  const modelTier = options.modelTier || inferModelTier(systemPrompt);
  const baseOptions = getModelOptions(modelTier);

  return {
    ...baseOptions,
    ...options,
    modelTier,
  };
}

export async function invokeAI(
  systemPrompt: string,
  userPrompt: string,
  options: AIInvocationOptions = {}
): Promise<string> {
  const provider = options.provider || 'openclaw';
  
  // Route to Codex CLI if provider is 'codex'
  if (provider === 'codex') {
    return invokeCodex(systemPrompt, userPrompt, options);
  }
  
  // Default: OpenClaw backend
  return invokeOpenClaw(systemPrompt, userPrompt, options);
}

/**
 * Invoke Codex CLI for code generation
 */
async function invokeCodex(
  systemPrompt: string,
  userPrompt: string,
  options: AIInvocationOptions
): Promise<string> {
  const fallback = options.codexConfig?.fallbackToOpenClaw !== false; // Default true
  
  // Check if Codex CLI is available with detailed guidance
  const availability = checkCodexAvailability();
  
  if (!availability.available) {
    const setupGuide = getCodexSetupGuide();
    
    if (fallback) {
      console.warn('');
      console.warn('========================================');
      console.warn('[Codex] CLI not available');
      console.warn('========================================');
      console.warn(availability.message);
      if (availability.installHint) {
        console.warn(availability.installHint);
      }
      console.warn('');
      console.warn('Falling back to OpenClaw...');
      console.warn('');
      return invokeOpenClaw(systemPrompt, userPrompt, options);
    }
    
    throw new Error('Codex CLI not available and fallback disabled.\n' + setupGuide);
  }
  
  // Run Codex CLI
  const result = await runCodexCLI({
    prompt: systemPrompt + '\n\n' + userPrompt,
    cwd: process.cwd(),
    model: options.codexConfig?.model,
    timeout: options.codexConfig?.timeout
  });
  
  if (!result.success) {
    const isAuthError = result.error?.includes('API key') || 
                       result.error?.includes('Authentication') ||
                       result.error?.includes('401');
    
    if (fallback) {
      console.warn('');
      console.warn('========================================');
      console.warn('[Codex] Execution failed');
      console.warn('========================================');
      console.warn(result.error);
      
      if (isAuthError) {
        console.warn('');
        console.warn('To fix: Set your OpenAI API key');
        console.warn('  export OPENAI_API_KEY="sk-..."');
      }
      
      console.warn('');
      console.warn('Falling back to OpenClaw...');
      console.warn('');
      return invokeOpenClaw(systemPrompt, userPrompt, options);
    }
    
    const enhancedError = isAuthError
      ? result.error + '\n\n' + getCodexSetupGuide()
      : 'Codex CLI failed: ' + result.error;
    
    throw new Error(enhancedError);
  }
  
  return result.output;
}

/**
 * Invoke OpenClaw backend (original implementation)
 */
async function invokeOpenClaw(
  systemPrompt: string,
  userPrompt: string,
  options: AIInvocationOptions = {}
): Promise<string> {
  const requestOptions = buildInvocationOptions(systemPrompt, options);

  if (openclawAI) {
    return openclawAI(systemPrompt, userPrompt, requestOptions);
  }

  try {
    const openclaw = await import('openclaw');
    if (typeof openclaw.invokeAI === 'function') {
      const invoke = openclaw.invokeAI as OpenClawInvokeAI;

      openclawAI = async (systemPrompt: string, userPrompt: string, invocationOptions?: AIInvocationOptions) => {
        try {
          return await invoke(systemPrompt, userPrompt, invocationOptions);
        } catch (error) {
          return await invoke(systemPrompt, userPrompt);
        }
      };

      return openclawAI(systemPrompt, userPrompt, requestOptions);
    }
  } catch {
    // OpenClaw not available, use mock
  }

  return mockAIResponse(systemPrompt, userPrompt);
}

export function parseJsonResponse(response: string): Record<string, unknown> {
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }
  
  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error(`Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function mockAIResponse(systemPrompt: string, userPrompt: string): string {
  const isCritic = systemPrompt.includes('Critic agent');
  const isPlanner = systemPrompt.includes('Planner agent');
  const isArchitecture = systemPrompt.includes('Architecture agent');
  const isCoder = systemPrompt.includes('Coder agent');
  const isCodeReviewer = systemPrompt.includes('Code Reviewer agent');

  if (isCodeReviewer) {
    return JSON.stringify({
      status: 'pass',
      overallOpinion: 'Code meets quality standards.',
      issues: [],
      checklist: {
        typeSafety: true,
        codeStyle: true,
        bestPractices: true,
        errorHandling: true,
        securityCheck: true,
      },
      strengths: ['Clean code structure', 'Proper TypeScript usage'],
      suggestions: [],
    });
  }

  if (isCoder) {
    const requestMatch = userPrompt.match(/User request: (.+?)(?:\n|$)/);
    const request = requestMatch ? requestMatch[1] : 'feature';

    return JSON.stringify({
      files: [
        {
          path: 'src/components/Feature.tsx',
          action: 'create',
          content: `import React from 'react';\n\nexport function Feature() {\n  return <div>${request}</div>;\n}`,
          dependencies: ['react'],
        },
      ],
      imports: {
        added: ["import { Feature } from './components/Feature';"],
        removed: [],
      },
      dependencies: {
        added: [],
        removed: [],
      },
    });
  }

  if (isCritic) {
    return JSON.stringify({
      status: 'pass',
      overallOpinion: 'The plan adequately addresses the user requirements.',
      issues: [],
      checklist: {
        requirementCoverage: true,
        taskCompleteness: true,
        decisionRationale: true,
        riskIdentification: true,
        consistencyCheck: true,
      },
      strengths: ['Clear task breakdown', 'Good technical decisions'],
      suggestions: ['Consider adding error handling tasks'],
    });
  }

  if (isArchitecture) {
    return JSON.stringify({
      frontend: {
        framework: 'React',
        libraries: ['Tailwind CSS'],
        reason: 'Simple and fast development',
      },
      backend: {
        framework: 'Express',
        libraries: ['cors', 'helmet'],
        api: {
          style: 'REST',
          authentication: 'JWT',
        },
        reason: 'Node.js ecosystem compatibility',
      },
      database: {
        type: 'SQLite',
        reason: 'Simple setup for development',
      },
      decisions: [
        {
          category: 'architecture',
          choice: 'Monolithic',
          reason: 'Simpler deployment for small scale',
        },
      ],
      risks: [],
    });
  }

  if (isPlanner) {
    const requestMatch = userPrompt.match(/User request: (.+?)(?:\n|$)/);
    const request = requestMatch ? requestMatch[1] : 'unknown request';

    return JSON.stringify({
      requirements: {
        functional: [`Implement ${request}`],
        nonFunctional: ['Responsive design', 'Error handling'],
      },
      tasks: [
        {
          id: 'task-1',
          title: 'Setup project structure',
          description: 'Initialize project with necessary dependencies and folder structure',
          assignee: 'frontend',
          targetFiles: ['src/index.ts', 'package.json'],
          dependencies: [],
          estimatedTime: '30분',
        },
        {
          id: 'task-2',
          title: 'Implement core feature',
          description: `Implement the main functionality for: ${request}`,
          assignee: 'frontend',
          targetFiles: ['src/components/Main.tsx'],
          dependencies: ['task-1'],
          estimatedTime: '2시간',
        },
        {
          id: 'task-3',
          title: 'Add error handling',
          description: 'Add comprehensive error handling and edge cases',
          assignee: 'frontend',
          targetFiles: ['src/utils/errorHandler.ts'],
          dependencies: ['task-2'],
          estimatedTime: '1시간',
        },
      ],
      decisions: [
        {
          category: 'tech_stack',
          choice: 'React',
          reason: 'Component-based architecture fits the requirements',
        },
      ],
      validation_criteria: [
        {
          scenario: 'User interacts with the feature',
          expected: 'Feature works as expected without errors',
          type: 'functional',
        },
      ],
    });
  }

  return JSON.stringify({});
}

export function setOpenclawAI(fn: (systemPrompt: string, userPrompt: string, options?: AIInvocationOptions) => Promise<string>): void {
  openclawAI = fn;
}

export function resetOpenclawAI(): void {
  openclawAI = null;
}

export type MockResponse = {
  type: 'planner' | 'critic' | 'architecture' | 'coder' | 'code-reviewer';
  response: Record<string, unknown>;
};

export function createMockAI(responses: MockResponse[]): (systemPrompt: string, userPrompt: string, options?: AIInvocationOptions) => Promise<string> {
  return async (systemPrompt: string, _userPrompt: string, _options?: AIInvocationOptions): Promise<string> => {
    if (systemPrompt.includes('Code Reviewer agent')) {
      const mock = responses.find(r => r.type === 'code-reviewer');
      if (mock) return JSON.stringify(mock.response);
    }
    if (systemPrompt.includes('Coder agent')) {
      const mock = responses.find(r => r.type === 'coder');
      if (mock) return JSON.stringify(mock.response);
    }
    if (systemPrompt.includes('Critic agent')) {
      const mock = responses.find(r => r.type === 'critic');
      if (mock) return JSON.stringify(mock.response);
    }
    if (systemPrompt.includes('Architecture agent')) {
      const mock = responses.find(r => r.type === 'architecture');
      if (mock) return JSON.stringify(mock.response);
    }
    if (systemPrompt.includes('Planner agent')) {
      const mock = responses.find(r => r.type === 'planner');
      if (mock) return JSON.stringify(mock.response);
    }
    return JSON.stringify({});
  };
}

export function createPassingMockAI(): (systemPrompt: string, userPrompt: string) => Promise<string> {
  return createMockAI([
    {
      type: 'planner',
      response: {
        requirements: { functional: ['Test feature'], nonFunctional: [] },
        tasks: [
          {
            id: 'task-1',
            title: 'Test Task',
            description: 'A test task',
            assignee: 'frontend',
            targetFiles: ['test.ts'],
            dependencies: [],
            estimatedTime: '10분',
          },
        ],
        decisions: [],
        validation_criteria: [],
      },
    },
    {
      type: 'critic',
      response: {
        status: 'pass',
        overallOpinion: 'Plan is good',
        issues: [],
        checklist: {
          requirementCoverage: true,
          taskCompleteness: true,
          decisionRationale: true,
          riskIdentification: true,
          consistencyCheck: true,
        },
      },
    },
    {
      type: 'architecture',
      response: {
        frontend: { framework: 'React', libraries: [], reason: 'Test' },
        decisions: [],
        risks: [],
      },
    },
    {
      type: 'coder',
      response: {
        files: [
          {
            path: 'test.ts',
            action: 'create',
            content: 'export const test = true;',
            dependencies: [],
          },
        ],
        imports: { added: [], removed: [] },
        dependencies: { added: [], removed: [] },
      },
    },
    {
      type: 'code-reviewer',
      response: {
        status: 'pass',
        overallOpinion: 'Code looks good',
        issues: [],
        checklist: {
          typeSafety: true,
          codeStyle: true,
          bestPractices: true,
          errorHandling: true,
          securityCheck: true,
        },
      },
    },
  ]);
}

export function createFailingCoderMockAI(): (systemPrompt: string, userPrompt: string) => Promise<string> {
  return createMockAI([
    {
      type: 'planner',
      response: {
        requirements: { functional: ['Test feature'], nonFunctional: [] },
        tasks: [
          {
            id: 'task-1',
            title: 'Test Task',
            description: 'A test task',
            assignee: 'frontend',
            targetFiles: ['test.ts'],
            dependencies: [],
            estimatedTime: '10분',
          },
        ],
        decisions: [],
        validation_criteria: [],
      },
    },
    {
      type: 'critic',
      response: {
        status: 'pass',
        overallOpinion: 'Plan is good',
        issues: [],
        checklist: {
          requirementCoverage: true,
          taskCompleteness: true,
          decisionRationale: true,
          riskIdentification: true,
          consistencyCheck: true,
        },
      },
    },
    {
      type: 'coder',
      response: {
        files: [
          {
            path: 'test.ts',
            action: 'create',
            content: 'export const test: string = 123;',
            dependencies: [],
          },
        ],
        imports: { added: [], removed: [] },
        dependencies: { added: [], removed: [] },
      },
    },
    {
      type: 'code-reviewer',
      response: {
        status: 'reject',
        overallOpinion: 'Type error found',
        issues: [
          {
            category: 'type_error',
            severity: 'critical',
            description: "Type 'number' is not assignable to type 'string'",
            suggestion: 'Change the value to a string',
            targetFile: 'test.ts',
            line: 1,
            autoResolvable: true,
          },
        ],
        checklist: {
          typeSafety: false,
          codeStyle: true,
          bestPractices: true,
          errorHandling: true,
          securityCheck: true,
        },
      },
    },
  ]);
}


// ============================================================================
// Model Tier Utilities
// ============================================================================

const MODEL_TIER_MAP: Record<ModelTier, AIModelTier> = {
  quick: 'fast',
  balanced: 'standard',
  deep: 'deep',
};

// OpenClaw supported models
export const OPENCLAW_MODELS = [
  'claude-3-opus',
  'claude-3-sonnet',
  'claude-3-haiku',
  'claude-3-5-sonnet',
  'claude-3-5-haiku',
  'gpt-4',
  'gpt-4-turbo',
  'gpt-3.5-turbo',
  'gemini-pro',
  'gemini-ultra',
] as const;

export type OpenClawModel = typeof OPENCLAW_MODELS[number];

// Default model assignments per tier
const DEFAULT_TIER_MODELS: Record<ModelTier, string> = {
  quick: 'claude-3-haiku',
  balanced: 'claude-3-sonnet',
  deep: 'claude-3-opus',
};

// Runtime model configuration (can be overridden)
let tierModelConfig: Partial<Record<ModelTier, string>> = {};

export function getAgentModel(agentName: string): ModelTier {
  return AGENT_MODEL_DEFAULTS[agentName] || 'balanced';
}

export function modelTierToAIModelTier(tier: ModelTier): AIModelTier {
  return MODEL_TIER_MAP[tier];
}

export function getModelForTier(tier: ModelTier): string {
  // Priority: runtime config > env var > default
  if (tierModelConfig[tier]) {
    return tierModelConfig[tier]!;
  }
  
  const envVar = process.env[`DEV_TEAM_MODEL_${tier.toUpperCase()}`];
  if (envVar) {
    return envVar;
  }
  
  return DEFAULT_TIER_MODELS[tier];
}

export function setModelForTier(tier: ModelTier, model: string): void {
  tierModelConfig[tier] = model;
}

export function resetTierModelConfig(): void {
  tierModelConfig = {};
}

export function getTierModelConfig(): Record<ModelTier, string> {
  return {
    quick: getModelForTier('quick'),
    balanced: getModelForTier('balanced'),
    deep: getModelForTier('deep'),
  };
}

export function getAvailableModels(): readonly OpenClawModel[] {
  return OPENCLAW_MODELS;
}

export function isValidModel(model: string): model is OpenClawModel {
  return OPENCLAW_MODELS.includes(model as OpenClawModel);
}

export async function invokeAIWithModel(
  systemPrompt: string,
  userPrompt: string,
  model: ModelTier,
  options: Omit<AIInvocationOptions, 'modelTier' | 'model'> = {}
): Promise<string> {
  const aiModelTier = modelTierToAIModelTier(model);
  const specificModel = getModelForTier(model);
  return invokeAI(systemPrompt, userPrompt, { 
    ...options, 
    modelTier: aiModelTier,
    model: specificModel,
  });
}

export async function invokeAIWithAgent(
  systemPrompt: string,
  userPrompt: string,
  agentName: string,
  options: Omit<AIInvocationOptions, 'modelTier' | 'model'> = {}
): Promise<string> {
  const model = getAgentModel(agentName);
  return invokeAIWithModel(systemPrompt, userPrompt, model, options);
}
