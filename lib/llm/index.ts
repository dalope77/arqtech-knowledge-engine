export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMProvider {
  name: string;
  generateContent(messages: LLMMessage[], options?: any): Promise<LLMResponse>;
}

// MockLLMProvider removed per user request
export class GrokLLMProvider implements LLMProvider {
  name = 'Grok';

  async generateContent(messages: LLMMessage[], options?: any): Promise<LLMResponse> {
    const rawKey = process.env.GROK_API_KEY;
    if (!rawKey) {
      throw new Error('GROK_API_KEY is missing.');
    }
    
    // Sanitize key (remove spaces or accidental quotes)
    const apiKey = rawKey.replace(/['"]/g, '').trim();
    
    console.log(`[GrokLLMProvider] Calling x.ai API... (Key starts with: ${apiKey.substring(0, 5)}...)`);
    
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'grok-beta', // or 'grok-2-latest'
        messages: messages,
        temperature: options?.temperature || 0.1,
        response_format: options?.response_format || { type: 'text' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GrokLLMProvider] API Error:', errorText);
      throw new Error(`Grok API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    return {
      text: content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      }
    };
  }
}

export class OpenRouterLLMProvider implements LLMProvider {
  name = 'OpenRouter';

  async generateContent(messages: LLMMessage[], options?: any): Promise<LLMResponse> {
    const rawKey = process.env.OPENROUTER_API_KEY;
    if (!rawKey) {
      throw new Error('OPENROUTER_API_KEY is missing.');
    }
    
    // Sanitize key
    const apiKey = rawKey.replace(/['"]/g, '').trim();
    
    console.log(`[OpenRouterLLMProvider] Calling OpenRouter API... (Key starts with: ${apiKey.substring(0, 5)}...)`);
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://arqtech.example.com', // Optional but recommended by OpenRouter
        'X-Title': 'ArqTech Knowledge Engine' // Optional but recommended
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'openrouter/free', // Default to free router for prototyping
        messages: messages,
        temperature: options?.temperature || 0.1,
        response_format: options?.response_format || { type: 'text' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenRouterLLMProvider] API Error:', errorText);
      throw new Error(`OpenRouter API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    return {
      text: content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      }
    };
  }
}

export function getDefaultLLMProvider(): LLMProvider {
  if (process.env.OPENROUTER_API_KEY) {
    return new OpenRouterLLMProvider();
  }
  if (process.env.GROK_API_KEY) {
    return new GrokLLMProvider();
  }
  throw new Error('No LLM Provider configured. Please set OPENROUTER_API_KEY or GROK_API_KEY in .env.local');
}
