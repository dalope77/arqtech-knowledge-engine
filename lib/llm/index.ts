export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

export interface LLMResponse {
  text: string | null;
  tool_calls?: any[];
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
        model: 'grok-beta',
        messages: messages,
        temperature: options?.temperature || 0.1,
        response_format: options?.response_format || { type: 'text' },
        ...(options?.tools ? { tools: options.tools } : {})
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GrokLLMProvider] API Error:', errorText);
      throw new Error(`Grok API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const msg = data.choices[0].message;

    console.log(`\n🤖 [${this.name} LLM] Response Received:`);
    if (msg.content) console.log(`   📝 Text: ${msg.content.substring(0, 150)}...`);
    if (msg.tool_calls) {
      console.log(`   🛠️  Tools Called:`);
      msg.tool_calls.forEach((tc: any) => {
        console.log(`       - ${tc.function.name} (args: ${tc.function.arguments})`);
      });
    }
    console.log(`   📊 Usage: ${data.usage?.total_tokens || 0} tokens`);

    return {
      text: msg.content,
      tool_calls: msg.tool_calls,
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
        model: process.env.OPENROUTER_MODEL || 'openrouter/free',
        messages: messages,
        temperature: options?.temperature || 0.1,
        response_format: options?.response_format || { type: 'text' },
        ...(options?.tools ? { tools: options.tools } : {})
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenRouterLLMProvider] API Error:', errorText);
      throw new Error(`OpenRouter API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const msg = data.choices[0].message;

    console.log(`\n🤖 [${this.name} LLM] Response Received:`);
    if (msg.content) console.log(`   📝 Text: ${msg.content.substring(0, 150)}...`);
    if (msg.tool_calls) {
      console.log(`   🛠️  Tools Called:`);
      msg.tool_calls.forEach((tc: any) => {
        console.log(`       - ${tc.function.name} (args: ${tc.function.arguments})`);
      });
    }
    console.log(`   📊 Usage: ${data.usage?.total_tokens || 0} tokens`);

    return {
      text: msg.content,
      tool_calls: msg.tool_calls,
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
