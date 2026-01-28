// Multi-Provider AI Service with Free API Support
// Supports OpenAI, Groq, Hugging Face, Cohere, and Together AI

const OpenAI = require('openai');
const axios = require('axios');

class AIProviderService {
  constructor() {
    this.providers = [];
    this.initializeProviders();
  }

  initializeProviders() {
    // Priority order: Free providers first, then paid
    const providerConfigs = [
      {
        name: 'groq',
        enabled: !!process.env.GROQ_API_KEY,
        priority: 1,
        free: true,
        fastModel: 'mixtral-8x7b-32768',
        smartModel: 'llama-3.1-70b-versatile'
      },
      {
        name: 'huggingface',
        enabled: !!process.env.HUGGINGFACE_API_KEY,
        priority: 2,
        free: true,
        fastModel: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        smartModel: 'meta-llama/Meta-Llama-3-70B-Instruct'
      },
      {
        name: 'together',
        enabled: !!process.env.TOGETHER_API_KEY,
        priority: 3,
        free: true,
        fastModel: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        smartModel: 'meta-llama/Llama-3-70b-chat-hf'
      },
      {
        name: 'cohere',
        enabled: !!process.env.COHERE_API_KEY,
        priority: 4,
        free: true,
        fastModel: 'command-light',
        smartModel: 'command'
      },
      {
        name: 'openai',
        enabled: !!process.env.OPENAI_API_KEY,
        priority: 5,
        free: false,
        fastModel: 'gpt-4o-mini',
        smartModel: 'gpt-4o'
      }
    ];

    this.providers = providerConfigs
      .filter(p => p.enabled)
      .sort((a, b) => a.priority - b.priority);

    if (this.providers.length === 0) {
      console.warn('⚠️  No AI providers configured. Please set at least one API key.');
    } else {
      console.log(`✅ AI Providers initialized: ${this.providers.map(p => p.name).join(', ')}`);
      console.log(`🆓 Free providers available: ${this.providers.filter(p => p.free).map(p => p.name).join(', ')}`);
    }
  }

  async generateWithGroq(prompt, systemPrompt, useSmartModel = false) {
    const apiKey = process.env.GROQ_API_KEY;
    const provider = this.providers.find(p => p.name === 'groq');
    const model = useSmartModel ? provider.smartModel : provider.fastModel;

    const groq = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1'
    });

    const response = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: useSmartModel ? 800 : 500,
      stream: false
    });

    return {
      text: response.choices[0].message.content,
      provider: 'groq',
      model,
      free: true
    };
  }

  async generateWithHuggingFace(prompt, systemPrompt, useSmartModel = false) {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    const provider = this.providers.find(p => p.name === 'huggingface');
    const model = useSmartModel ? provider.smartModel : provider.fastModel;

    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        inputs: `${systemPrompt}\n\nUser: ${prompt}\n\nAssistant:`,
        parameters: {
          max_new_tokens: useSmartModel ? 800 : 500,
          temperature: 0.7,
          return_full_text: false
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const text = Array.isArray(response.data) 
      ? response.data[0].generated_text 
      : response.data.generated_text;

    return {
      text: text.trim(),
      provider: 'huggingface',
      model,
      free: true
    };
  }

  async generateWithTogether(prompt, systemPrompt, useSmartModel = false) {
    const apiKey = process.env.TOGETHER_API_KEY;
    const provider = this.providers.find(p => p.name === 'together');
    const model = useSmartModel ? provider.smartModel : provider.fastModel;

    const response = await axios.post(
      'https://api.together.xyz/v1/chat/completions',
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: useSmartModel ? 800 : 500
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      text: response.data.choices[0].message.content,
      provider: 'together',
      model,
      free: true
    };
  }

  async generateWithCohere(prompt, systemPrompt, useSmartModel = false) {
    const apiKey = process.env.COHERE_API_KEY;
    const provider = this.providers.find(p => p.name === 'cohere');
    const model = useSmartModel ? provider.smartModel : provider.fastModel;

    const response = await axios.post(
      'https://api.cohere.ai/v1/generate',
      {
        model,
        prompt: `${systemPrompt}\n\nUser: ${prompt}\n\nAssistant:`,
        max_tokens: useSmartModel ? 800 : 500,
        temperature: 0.7,
        k: 0,
        stop_sequences: ['User:'],
        return_likelihoods: 'NONE'
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      text: response.data.generations[0].text.trim(),
      provider: 'cohere',
      model,
      free: true
    };
  }

  async generateWithOpenAI(prompt, systemPrompt, useSmartModel = false) {
    const apiKey = process.env.OPENAI_API_KEY;
    const provider = this.providers.find(p => p.name === 'openai');
    const model = useSmartModel ? provider.smartModel : provider.fastModel;

    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: useSmartModel ? 800 : 500
    });

    return {
      text: response.choices[0].message.content,
      provider: 'openai',
      model,
      free: false
    };
  }

  async generate(prompt, systemPrompt, options = {}) {
    const useSmartModel = options.smart || options.research || false;
    const preferFree = options.preferFree !== false; // Default to true

    // Filter providers based on preference
    let availableProviders = [...this.providers];
    if (preferFree) {
      // Try free providers first
      const freeProviders = availableProviders.filter(p => p.free);
      const paidProviders = availableProviders.filter(p => !p.free);
      availableProviders = [...freeProviders, ...paidProviders];
    }

    const errors = [];

    for (const provider of availableProviders) {
      try {
        const startTime = Date.now();
        let result;

        switch (provider.name) {
          case 'groq':
            result = await this.generateWithGroq(prompt, systemPrompt, useSmartModel);
            break;
          case 'huggingface':
            result = await this.generateWithHuggingFace(prompt, systemPrompt, useSmartModel);
            break;
          case 'together':
            result = await this.generateWithTogether(prompt, systemPrompt, useSmartModel);
            break;
          case 'cohere':
            result = await this.generateWithCohere(prompt, systemPrompt, useSmartModel);
            break;
          case 'openai':
            result = await this.generateWithOpenAI(prompt, systemPrompt, useSmartModel);
            break;
          default:
            continue;
        }

        const duration = Date.now() - startTime;

        console.log(`✅ AI generated by ${provider.name} in ${duration}ms (${result.free ? 'FREE' : 'PAID'})`);

        return {
          ...result,
          duration,
          fallbackUsed: errors.length > 0
        };

      } catch (error) {
        console.warn(`⚠️  ${provider.name} failed:`, error.message);
        errors.push({
          provider: provider.name,
          error: error.message
        });
        // Continue to next provider
      }
    }

    // All providers failed
    throw new Error(`All AI providers failed: ${errors.map(e => `${e.provider}: ${e.error}`).join(', ')}`);
  }

  async streamGenerate(prompt, systemPrompt, streamCallback, options = {}) {
    // Streaming is best supported by Groq and OpenAI
    const streamingProviders = this.providers.filter(p => 
      p.name === 'groq' || p.name === 'openai'
    );

    if (streamingProviders.length === 0) {
      throw new Error('No streaming providers available');
    }

    const provider = streamingProviders[0];
    const useSmartModel = options.smart || options.research || false;
    const model = useSmartModel ? provider.smartModel : provider.fastModel;

    try {
      let client;
      
      if (provider.name === 'groq') {
        client = new OpenAI({
          apiKey: process.env.GROQ_API_KEY,
          baseURL: 'https://api.groq.com/openai/v1'
        });
      } else {
        client = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
      }

      const stream = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: useSmartModel ? 800 : 500,
        stream: true
      });

      let fullText = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullText += content;
          streamCallback(content, false);
        }
      }

      streamCallback('', true);

      return {
        text: fullText,
        provider: provider.name,
        model,
        free: provider.free,
        streamed: true
      };

    } catch (error) {
      console.error(`Streaming failed with ${provider.name}:`, error);
      throw error;
    }
  }

  getAvailableProviders() {
    return this.providers.map(p => ({
      name: p.name,
      free: p.free,
      priority: p.priority,
      models: {
        fast: p.fastModel,
        smart: p.smartModel
      }
    }));
  }

  getStatus() {
    return {
      total: this.providers.length,
      free: this.providers.filter(p => p.free).length,
      paid: this.providers.filter(p => !p.free).length,
      providers: this.getAvailableProviders()
    };
  }
}

// Singleton instance
let aiProviderInstance = null;

function getAIProvider() {
  if (!aiProviderInstance) {
    aiProviderInstance = new AIProviderService();
  }
  return aiProviderInstance;
}

module.exports = {
  AIProviderService,
  getAIProvider
};
