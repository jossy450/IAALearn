const OpenAI = require('openai');
const axios = require('axios');
const crypto = require('crypto');
const { query } = require('../database/connection');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class AnswerService {
  constructor() {
    this.cacheEnabled = process.env.ENABLE_CACHING !== 'false';
    this.cacheTTL = parseInt(process.env.CACHE_TTL_SECONDS) || 3600;
  }

  // Generate hash for question to use as cache key
  generateQuestionHash(question) {
    return crypto
      .createHash('sha256')
      .update(question.toLowerCase().trim())
      .digest('hex');
  }

  // Check cache for existing answer
  async checkCache(question) {
    if (!this.cacheEnabled) return null;

    try {
      const questionHash = this.generateQuestionHash(question);
      const result = await query(
        `SELECT * FROM answer_cache 
         WHERE question_hash = $1 
         AND (expires_at IS NULL OR expires_at > NOW())`,
        [questionHash]
      );

      if (result.rows.length > 0) {
        const cached = result.rows[0];
        
        // Update hit count and last used timestamp
        await query(
          `UPDATE answer_cache 
           SET hit_count = hit_count + 1, last_used_at = NOW() 
           WHERE id = $1`,
          [cached.id]
        );

        return {
          answer: cached.answer_text,
          cached: true,
          category: cached.category,
          quality_score: cached.quality_score
        };
      }

      return null;
    } catch (error) {
      console.error('Cache check error:', error);
      return null;
    }
  }

  // Save answer to cache
  async saveToCache(question, answer, category = 'general', keywords = []) {
    if (!this.cacheEnabled) return;

    try {
      const questionHash = this.generateQuestionHash(question);
      const expiresAt = new Date(Date.now() + this.cacheTTL * 1000);

      await query(
        `INSERT INTO answer_cache 
         (question_hash, question_text, answer_text, category, keywords, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (question_hash) 
         DO UPDATE SET 
           answer_text = EXCLUDED.answer_text,
           last_used_at = NOW(),
           expires_at = EXCLUDED.expires_at`,
        [questionHash, question, answer, category, keywords, expiresAt]
      );
    } catch (error) {
      console.error('Cache save error:', error);
    }
  }

  // Fast answer generation using GPT-4
  async generateFastAnswer(question, context = {}) {
    try {
      const systemPrompt = `You are an expert interview coach. Provide concise, professional answers to interview questions. 
Consider the following context:
- Position: ${context.position || 'General'}
- Company: ${context.company || 'Not specified'}
- Industry: ${context.industry || 'General'}

Keep answers clear, confident, and around 2-3 sentences unless more detail is needed.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Fast answer generation error:', error);
      throw error;
    }
  }

  // Research-backed answer using Perplexity
  async generateResearchAnswer(question, context = {}) {
    try {
      // First, try Perplexity for research
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
          console.warn('Perplexity research failed, falling back to GPT-4 only');
        }
      }

      // Generate answer with research context
      const systemPrompt = `You are an expert interview coach with access to current information. 
Provide professional, well-researched answers to interview questions.

Context:
- Position: ${context.position || 'General'}
- Company: ${context.company || 'Not specified'}
- Industry: ${context.industry || 'General'}

${researchContext ? `Research Context:\n${researchContext}` : ''}

Provide a comprehensive, confident answer that demonstrates expertise.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.7,
        max_tokens: 800
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Research answer generation error:', error);
      throw error;
    }
  }

  // Main answer generation with caching
  async generateAnswer(question, options = {}) {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cachedAnswer = await this.checkCache(question);
      if (cachedAnswer) {
        return {
          ...cachedAnswer,
          responseTime: Date.now() - startTime,
          source: 'cache'
        };
      }

      // Determine answer type
      const useResearch = options.research || options.deep;
      const answer = useResearch
        ? await this.generateResearchAnswer(question, options.context)
        : await this.generateFastAnswer(question, options.context);

      // Save to cache
      await this.saveToCache(
        question,
        answer,
        options.category,
        options.keywords
      );

      return {
        answer,
        cached: false,
        responseTime: Date.now() - startTime,
        source: useResearch ? 'research' : 'fast'
      };
    } catch (error) {
      console.error('Answer generation error:', error);
      throw error;
    }
  }

  // Pre-generate answers for common questions
  async preGenerateAnswers(userId, context = {}) {
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
      'Do you have any questions for us?'
    ];

    const results = [];

    for (const question of commonQuestions) {
      try {
        const answer = await this.generateFastAnswer(question, context);
        
        await query(
          `INSERT INTO pre_generated_answers 
           (user_id, category, question_pattern, generated_answer, context)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, 'common', question, answer, JSON.stringify(context)]
        );

        results.push({ question, generated: true });
      } catch (error) {
        console.error(`Failed to pre-generate answer for: ${question}`, error);
        results.push({ question, generated: false, error: error.message });
      }
    }

    return results;
  }
}

module.exports = new AnswerService();
