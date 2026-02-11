import { invoke } from '@tauri-apps/api/core';

// --- Types ---

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiOptions {
  maxTokens?: number;
  temperature?: number;
}

export interface AiProvider {
  name: string;
  chat(messages: AiMessage[], options?: AiOptions): Promise<string>;
}

export interface AiConfig {
  provider: 'claude' | 'openai' | 'ollama';
  apiKey: string;
  model: string;
  ollamaUrl: string;
}

interface AiProxyResponse {
  status: number;
  body: string;
}

// --- Default config ---

const DEFAULT_CONFIG: AiConfig = {
  provider: 'claude',
  apiKey: '',
  model: 'claude-sonnet-4-20250514',
  ollamaUrl: 'http://localhost:11434',
};

// --- Config persistence ---

const STORAGE_KEY = 'markview-ai-config';

export function loadAiConfig(): AiConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_CONFIG };
}

export function saveAiConfig(config: AiConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

// --- Proxy through Tauri backend ---

async function proxyRequest(
  url: string,
  headers: [string, string][],
  body: unknown
): Promise<AiProxyResponse> {
  return await invoke<AiProxyResponse>('ai_request', {
    request: {
      url,
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    },
  });
}

// --- Claude Provider ---

class ClaudeProvider implements AiProvider {
  name = 'Claude';

  constructor(
    private apiKey: string,
    private model: string
  ) {}

  async chat(messages: AiMessage[], options?: AiOptions): Promise<string> {
    if (!this.apiKey) throw new Error('Claude API key is required');

    // Claude API uses a separate system parameter
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: options?.maxTokens ?? 2048,
      messages: chatMessages,
    };

    if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    if (systemMessage) {
      body.system = systemMessage.content;
    }

    const response = await proxyRequest(
      'https://api.anthropic.com/v1/messages',
      [
        ['x-api-key', this.apiKey],
        ['anthropic-version', '2023-06-01'],
      ],
      body
    );

    if (response.status !== 200) {
      const errData = JSON.parse(response.body);
      throw new Error(errData?.error?.message || `Claude API error (${response.status})`);
    }

    const data = JSON.parse(response.body);
    const textBlock = data.content?.find((b: { type: string }) => b.type === 'text');
    return textBlock?.text ?? '';
  }
}

// --- OpenAI Provider ---

class OpenAIProvider implements AiProvider {
  name = 'OpenAI';

  constructor(
    private apiKey: string,
    private model: string
  ) {}

  async chat(messages: AiMessage[], options?: AiOptions): Promise<string> {
    if (!this.apiKey) throw new Error('OpenAI API key is required');

    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: options?.maxTokens ?? 2048,
    };

    if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    const response = await proxyRequest(
      'https://api.openai.com/v1/chat/completions',
      [['Authorization', `Bearer ${this.apiKey}`]],
      body
    );

    if (response.status !== 200) {
      const errData = JSON.parse(response.body);
      throw new Error(errData?.error?.message || `OpenAI API error (${response.status})`);
    }

    const data = JSON.parse(response.body);
    return data.choices?.[0]?.message?.content ?? '';
  }
}

// --- Ollama Provider ---

class OllamaProvider implements AiProvider {
  name = 'Ollama';

  constructor(
    private baseUrl: string,
    private model: string
  ) {}

  async chat(messages: AiMessage[], options?: AiOptions): Promise<string> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: false,
    };

    if (options?.temperature !== undefined) {
      body.options = { temperature: options.temperature };
    }

    const url = `${this.baseUrl.replace(/\/$/, '')}/api/chat`;
    const response = await proxyRequest(url, [], body);

    if (response.status !== 200) {
      throw new Error(`Ollama error (${response.status}): ${response.body}`);
    }

    const data = JSON.parse(response.body);
    return data.message?.content ?? '';
  }
}

// --- Factory ---

export function createProvider(config: AiConfig): AiProvider {
  switch (config.provider) {
    case 'claude':
      return new ClaudeProvider(config.apiKey, config.model || 'claude-sonnet-4-20250514');
    case 'openai':
      return new OpenAIProvider(config.apiKey, config.model || 'gpt-4o');
    case 'ollama':
      return new OllamaProvider(
        config.ollamaUrl || 'http://localhost:11434',
        config.model || 'llama3'
      );
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

// --- Default models per provider ---

export const DEFAULT_MODELS: Record<string, string[]> = {
  claude: ['claude-sonnet-4-20250514', 'claude-haiku-4-20250414', 'claude-opus-4-20250514'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1-mini'],
  ollama: ['llama3', 'mistral', 'codellama', 'gemma2'],
};
