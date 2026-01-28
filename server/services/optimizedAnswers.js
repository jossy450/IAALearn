const OpenAI = require('openai');
const axios = require('axios');
const crypto = require('crypto');
const { query } = require('../database/connection');
const { getCache } = require('./memoryCache');
const { getAIProvider } = require('./aiProvider');

let openai = null;

function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

class OptimizedAnswerService {
  constructor() {
    this.cacheEnabled = process.env.ENABLE_CACHING !== 'false';
    this.cacheTTL = parseInt(process.env.CACHE_TTL_SECONDS) || 3600;
    this.memoryCache = getCache();
    this.performanceTarget = 2000; // Target response time in ms
  }

  // Generate hash for question to use as cache key
  generateQuestionHash(question) {
    return crypto
      .createHash('sha256')
      .update(question.toLowerCase().trim())
      .digest('hex');
  }

  // Multi-layer cache check (memory -> database)
  async checkCache(question) {
    if (!this.cacheEnabled) return null;

    const cacheStart = Date.now();

    try {
      // Level 1: Check memory cache (ultra-fast)
      const memCached = this.memoryCache.get(question);
      if (memCached) {
        console.log(`✓ Memory cache hit: ${Date.now() - cacheStart}ms`);
        return {
          ...memCached,
          cacheLevel: 'memory',
          lookupTime: Date.now() - cacheStart
        };
      }

      // Level 2: Check database cache
      const questionHash = this.generateQuestionHash(question);
      const result = await query(
        `SELECT * FROM answer_cache 
         WHERE question_hash = $1 
         AND (expires_at IS NULL OR expires_at > NOW())
         LIMIT 1`,
        [questionHash]
      );

      if (result.rows.length > 0) {
        const cached = result.rows[0];
        
        // Update hit count asynchronously (don't wait)
        query(
          `UPDATE answer_cache 
           SET hit_count = hit_count + 1, last_used_at = NOW() 
           WHERE id = $1`,
          [cached.id]
        ).catch(err => console.warn('Cache update failed:', err));

        // Store in memory cache for next time
        this.memoryCache.set(question, cached.answer_text, {
          category: cached.category,
          quality: cached.quality_score
        });

        console.log(`✓ Database cache hit: ${Date.now() - cacheStart}ms`);
        
        return {
          answer: cached.answer_text,
          cached: true,
          cacheLevel: 'database',
          category: cached.category,
          quality_score: cached.quality_score,
          lookupTime: Date.now() - cacheStart
        };
      }

      console.log(`✗ Cache miss: ${Date.now() - cacheStart}ms`);
      return null;
    } catch (error) {
      console.error('Cache check error:', error);
      return null;
    }
  }

  // Save answer to both caches
  async saveToCache(question, answer, category = 'general', keywords = []) {
    if (!this.cacheEnabled) return;

    try {
      // Save to memory cache immediately (sync)
      this.memoryCache.set(question, answer, { category });

      // Save to database cache asynchronously
      const questionHash = this.generateQuestionHash(question);
      const expiresAt = new Date(Date.now() + this.cacheTTL * 1000);

      query(
        `INSERT INTO answer_cache 
         (question_hash, question_text, answer_text, category, keywords, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (question_hash) 
         DO UPDATE SET 
           answer_text = EXCLUDED.answer_text,
           last_used_at = NOW(),
           expires_at = EXCLUDED.expires_at`,
        [questionHash, question, answer, category, keywords, expiresAt]
      ).catch(err => console.warn('Database cache save failed:', err));
      
    } catch (error) {
      console.error('Cache save error:', error);
    }
  }

  // Fast answer generation using multi-provider AI with fallback
  async generateFastAnswer(question, context = {}, streamCallback = null) {
    const aiProvider = getAIProvider();
    const startTime = Date.now();
    
    try {
      const systemPrompt = `You are an expert interview coach. Provide concise, professional answers to interview questions. 
Consider the following context:
- Position: ${context.position || 'General'}
- Company: ${context.company || 'Not specified'}
- Industry: ${context.industry || 'General'}

Keep answers clear, confident, and around 2-3 sentences unless more detail is needed.`;

      // Use streaming if callback provided
      if (streamCallback && typeof streamCallback === 'function') {
        const result = await aiProvider.streamGenerate(
          question,
          systemPrompt,
          streamCallback,
          { preferFree: true }
        );
        
        const duration = Date.now() - startTime;
        console.log(`✅ Streamed answer: ${duration}ms (${result.provider}, ${result.free ? 'FREE' : 'PAID'})`);
        
        return result.text;
      }

      // Non-streaming
      const result = await aiProvider.generate(
        question,
        systemPrompt,
        { preferFree: true }
      );

      const duration = Date.now() - startTime;
      console.log(`✅ Fast answer: ${duration}ms (${result.provider}, ${result.free ? 'FREE' : 'PAID'})`);
      
      return result.text;
    } catch (error) {
      console.error('Fast answer generation error:', error);
      throw error;
    }
  }

  // Research-backed answer using multi-provider AI
  async generateResearchAnswer(question, context = {}) {
    const startTime = Date.now();
    const aiProvider = getAIProvider();
    
    try {
      // First, try Perplexity for research (if available)
      let researchContext = '';
      
      if (process.env.PERPLEXITY_API_KEY) {
        try {
          const perplexityResponse = await axios.post(
            'https://api.perplexity.ai/chat/completions',
            {
              model: 'llama-3.1-sonar-small-128k-online',
              messages: [
                {
                  role: 'system',
                  content: 'You are a research assistant. Provide relevant facts and insights for interview questions.'
                },
                {
                  role: 'user',
                  content: `Research context for interview question: ${question}`
                }
              ]
            },
            {
              headers: {
                'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
              }
            }
          );

          researchContext = perplexityResponse.data.choices[0].message.content;
        } catch (perplexityError) {
          console.warn('Perplexity research failed, using AI without research context');
        }
      }

      // Generate answer with research context using multi-provider
      const systemPrompt = `You are an expert interview coach with access to current information. 
Provide professional, well-researched answers to interview questions.

Context:
- Position: ${context.position || 'General'}
- Company: ${context.company || 'Not specified'}
- Industry: ${context.industry || 'General'}

${researchContext ? `Research Context:\n${researchContext}` : ''}

Provide a comprehensive, confident answer that demonstrates expertise.`;

      const result = await aiProvider.generate(
        question,
        systemPrompt,
        { smart: true, preferFree: true }
      );

      const duration = Date.now() - startTime;
      console.log(`✅ Research answer: ${duration}ms (${result.provider}, ${result.free ? 'FREE' : 'PAID'})`);
      
      return result.text;
    } catch (error) {
      console.error('Research answer generation error:', error);
      throw error;
    }
  }

  // Main answer generation with optimized caching and performance tracking
  async generateAnswer(question, options = {}) {
    const startTime = Date.now();
    let cacheTime = 0;
    let aiTime = 0;
    
    try {
      // Check cache first (multi-layer)
      const cacheCheckStart = Date.now();
      const cachedAnswer = await this.checkCache(question);
      cacheTime = Date.now() - cacheCheckStart;
      
      if (cachedAnswer) {
        const totalTime = Date.now() - startTime;
        console.log(`⚡ Total response time: ${totalTime}ms (cached)`);
        
        return {
          ...cachedAnswer,
          responseTime: totalTime,
          source: cachedAnswer.cacheLevel || 'cache',
          performance: {
            cacheTime,
            aiTime: 0,
            totalTime
          }
        };
      }

      // Generate new answer
      const aiStart = Date.now();
      const useResearch = options.research || options.deep;
      const streamCallback = options.streamCallback;
      
      const answer = useResearch
        ? await this.generateResearchAnswer(question, options.context)
        : await this.generateFastAnswer(question, options.context, streamCallback);
      
      aiTime = Date.now() - aiStart;

      // Save to cache asynchronously
      this.saveToCache(
        question,
        answer,
        options.category,
        options.keywords
      );

      const totalTime = Date.now() - startTime;
      console.log(`⚡ Total response time: ${totalTime}ms (generated: ${aiTime}ms)`);

      return {
        answer,
        cached: false,
        responseTime: totalTime,
        source: useResearch ? 'research' : 'fast',
        performance: {
          cacheTime,
          aiTime,
          totalTime
        }
      };
    } catch (error) {
      console.error('Answer generation error:', error);
      throw error;
    }
  }

  // Warm up cache with common questions
  async warmUpCache(context = {}) {
    console.log('🔥 Warming up cache with common interview questions...');
    
    const commonQuestions = [
      'Tell me about yourself',
      'What are your strengths?',
      'What are your weaknesses?',
      'Why do you want to work here?',
      'Where do you see yourself in 5 years?',
      'Why should we hire you?',
      'Tell me about a time you faced a challenge',
      'What is your greatest achievement?',
      'How do you handle stress?',
      'Do you have any questions for us?',
      'Describe your ideal work environment',
      'How do you prioritize your work?',
      'Tell me about a conflict you resolved',
      'What motivates you?',
      'How do you handle failure?'
    ];

    const results = [];
    let generated = 0;

    for (const question of commonQuestions) {
      try {
        // Check if already cached
        const cached = await this.checkCache(question);
        if (cached) {
          results.push({ question, status: 'already_cached' });
          continue;
        }

        // Generate and cache
        const answer = await this.generateFastAnswer(question, context);
        await this.saveToCache(question, answer, 'behavioral');
        
        results.push({ question, status: 'generated' });
        generated++;
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to warm cache for: ${question}`, error);
        results.push({ question, status: 'failed', error: error.message });
      }
    }

    console.log(`✓ Cache warmed: ${generated} questions generated`);
    return {
      generated,
      total: commonQuestions.length,
      results
    };
  }

  // Get cache statistics
  getCacheStats() {
    return this.memoryCache.getStats();
  }

  // Clear cache
  clearCache() {
    return this.memoryCache.clear();
  }
}

module.exports = new OptimizedAnswerService();
