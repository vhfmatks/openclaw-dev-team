/**
 * Codex CLI Integration for OpenClaw Dev-Team
 * 
 * Provides functions to invoke OpenAI Codex CLI as an alternative
 * AI backend for code generation tasks.
 */

import { spawn, spawnSync } from 'child_process';
import type { CodexCLIConfig } from '../types';

const CODEX_BINARY = 'codex';
const DEFAULT_MODEL = 'gpt-5';
const DEFAULT_TIMEOUT = 300000; // 5 minutes

// Cache availability check result
let _codexAvailable: boolean | null = null;

export interface CodexRunOptions {
  prompt: string;
  cwd: string;
  model?: string;
  timeout?: number;
}

export interface CodexRunResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
}

export interface CodexAvailabilityResult {
  available: boolean;
  message?: string;
  installHint?: string;
}

/**
 * Check if Codex CLI is available (synchronous check)
 * Uses spawnSync for a quick availability verification
 */
export function isCodexAvailable(): boolean {
  const result = checkCodexAvailability();
  return result.available;
}

/**
 * Check Codex CLI availability with detailed guidance
 * Returns availability status plus installation/setup hints
 */
export function checkCodexAvailability(): CodexAvailabilityResult {
  if (_codexAvailable !== null) {
    return {
      available: _codexAvailable,
      message: _codexAvailable ? 'Codex CLI is available' : 'Codex CLI not found'
    };
  }
  
  try {
    const result = spawnSync(CODEX_BINARY, ['--version'], {
      timeout: 5000,
      encoding: 'utf-8'
    });
    
    _codexAvailable = result.status === 0;
    
    if (_codexAvailable) {
      return {
        available: true,
        message: 'Codex CLI is available'
      };
    }
    
    return {
      available: false,
      message: 'Codex CLI found but version check failed',
      installHint: 'Run: npm install -g @openai/codex'
    };
  } catch (error) {
    _codexAvailable = false;
    
    const errorMsg = error instanceof Error ? error.message : String(error);
    const isNotFound = errorMsg.includes('ENOENT') || errorMsg.includes('not found');
    
    return {
      available: false,
      message: isNotFound 
        ? 'Codex CLI is not installed'
        : 'Codex CLI check failed: ' + errorMsg,
      installHint: isNotFound
        ? 'Install Codex CLI:\n' +
          '  npm install -g @openai/codex\n' +
          '\n' +
          'Then set your API key:\n' +
          '  export OPENAI_API_KEY="sk-..."'
        : undefined
    };
  }
}

/**
 * Reset the cached availability check
 * Useful for testing or when CLI installation status changes
 */
export function resetCodexAvailability(): void {
  _codexAvailable = null;
}

/**
 * Get user-friendly guidance for Codex CLI setup
 */
export function getCodexSetupGuide(): string {
  return `
╔═══════════════════════════════════════════════════════════════╗
║                    Codex CLI Setup Guide                      ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  1. Install Codex CLI:                                        ║
║     npm install -g @openai/codex                              ║
║                                                               ║
║  2. Set your OpenAI API key:                                  ║
║     export OPENAI_API_KEY="sk-..."                            ║
║                                                               ║
║  3. Verify installation:                                      ║
║     codex --version                                           ║
║                                                               ║
║  4. Optional - Configure in OpenClaw:                         ║
║     export OPENCLAW_PROVIDER=codex                            ║
║     export OPENCLAW_CODEX_MODEL=gpt-5                         ║
║                                                               ║
║  Need help? See: docs/codex-integration.md                    ║
╚═══════════════════════════════════════════════════════════════╝
`.trim();
}

/**
 * Run Codex CLI with the given prompt
 * Uses --json for structured output and --full-auto for non-interactive mode
 */
export async function runCodexCLI(options: CodexRunOptions): Promise<CodexRunResult> {
  const startTime = Date.now();
  const {
    prompt,
    cwd,
    model = DEFAULT_MODEL,
    timeout = DEFAULT_TIMEOUT
  } = options;
  
  // Build Codex CLI arguments
  const args = [
    'exec',
    '--json',
    '--full-auto',
    '--skip-git-repo-check',
    '--model', model,
    '-C', cwd,
    prompt
  ];
  
  return new Promise((resolve) => {
    const proc = spawn(CODEX_BINARY, args, {
      cwd,
      timeout,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    
    proc.stdout?.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });
    
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });
    
    proc.on('close', (code) => {
      const duration = Date.now() - startTime;
      const stdout = Buffer.concat(stdoutChunks).toString('utf-8');
      const stderr = Buffer.concat(stderrChunks).toString('utf-8');
      
      if (code === 0) {
        const output = parseCodexOutput(stdout);
        resolve({
          success: true,
          output,
          duration
        });
      } else {
        // Check for common auth errors
        const errorLower = stderr.toLowerCase();
        let enhancedError = stderr || 'Codex exited with code ' + code;
        
        if (errorLower.includes('api key') || errorLower.includes('unauthorized') || errorLower.includes('401')) {
          enhancedError = 'Authentication failed: OPENAI_API_KEY not set or invalid.\n' +
            'Set your API key:\n' +
            '  export OPENAI_API_KEY="sk-..."';
        } else if (errorLower.includes('rate limit') || errorLower.includes('429')) {
          enhancedError = 'Rate limit exceeded. Please wait and try again.';
        }
        
        resolve({
          success: false,
          output: stdout,
          error: enhancedError,
          duration
        });
      }
    });
    
    proc.on('error', (err) => {
      const errorMsg = err.message;
      let enhancedError = errorMsg;
      
      if (errorMsg.includes('ENOENT') || errorMsg.includes('not found')) {
        enhancedError = 'Codex CLI not found.\n' +
          'Install it with:\n' +
          '  npm install -g @openai/codex';
      }
      
      resolve({
        success: false,
        output: '',
        error: enhancedError,
        duration: Date.now() - startTime
      });
    });
  });
}

/**
 * Parse Codex JSONL output to extract the final agent message
 */
function parseCodexOutput(stdout: string): string {
  const lines = stdout.trim().split('\n');
  
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    
    try {
      const event = JSON.parse(line);
      if (event.type === 'item.completed' && event.item?.type === 'agent_message') {
        return event.item.text || stdout;
      }
    } catch {
      // Not valid JSON, continue
    }
  }
  
  return stdout;
}

/**
 * Build Codex run options from config
 */
export function buildCodexOptions(
  prompt: string,
  cwd: string,
  config?: CodexCLIConfig
): CodexRunOptions {
  return {
    prompt,
    cwd,
    model: config?.model || DEFAULT_MODEL,
    timeout: config?.timeout || DEFAULT_TIMEOUT
  };
}
