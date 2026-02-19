const OpenAI = require('openai');
const axios = require('axios');
const crypto = require('crypto');
const { query } = require('../database/connection');

let openai = null;

function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

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

  // Detect if question requires STAR format (behavioral/competency question)
  isSTARQuestion(question) {
    const starKeywords = [
      'tell me about a time',
      'describe a situation',
      'give an example',
      'how did you handle',
      'what did you do when',
      'have you ever',
      'difficult decision',
      'challenge you faced',
      'conflict you',
      'mistake you made',
      'leadership example',
      'worked with difficult',
      'failure you',
      'achieved success',
      'overcame obstacle',
      'managed pressure',
      'handled criticism'
    ];

    const lowerQuestion = question.toLowerCase();
    return starKeywords.some(keyword => lowerQuestion.includes(keyword));
  }

  // Generate perfect STAR-formatted answer
  async generateSTARAnswer(question, context = {}) {
    const client = getOpenAI();
    if (!client) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    
    try {
      const systemPrompt = `You are an expert executive interview coach specializing in major tech companies (Amazon, Google, Microsoft, etc.).

Your task is to generate PERFECT STAR-formatted answers for behavioral/competency interview questions.

STAR Format Requirements:
1. **Situation**: Set clear context (2-3 sentences). Include company/domain specifics.
2. **Task**: Define your specific responsibility and ownership (1-2 sentences).
3. **Action**: Detail YOUR specific decisions and actions - not the team's (3-4 sentences). Show leadership, technical expertise, and decision-making.
4. **Result**: Quantify impact with specific metrics (reduced X%, improved Y, saved Z hours, achieved W). Show short-term wins AND long-term gains (2-3 sentences).

Guidelines:
- Use clear labeled sections: **Situation:** **Task:** **Action:** **Result:**
- Include specific metrics and measurable outcomes (percentages, time saved, cost reduction, ROI)
- Demonstrate clear ownership ("I decided", "I implemented", "I led")
- Show relevant technical or leadership expertise
- Keep total answer 4-5 minutes when spoken (5-7 paragraphs)
- End with relevance to the role: "This experience demonstrates... [relevant skills for the position]"
- Be confident, specific, and authentic

Context:
- Position: ${context.position || 'General'}
- Company: ${context.company || 'Not specified'}
- Industry: ${context.industry || 'General'}`;

      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.7,
        max_tokens: 1200
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('STAR answer generation error:', error);
      throw error;
    }
  }

  // Fast answer generation using GPT-4
  async generateFastAnswer(question, context = {}) {
    const client = getOpenAI();
    if (!client) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    try {
      const systemPrompt = `You are an expert interview coach. Provide concise, professional answers to interview questions. 
Consider the following context:
- Position: ${context.position || 'General'}
- Company: ${context.company || 'Not specified'}
- Industry: ${context.industry || 'General'}

Keep answers clear, confident, and around 2-3 sentences unless more detail is needed.`;

      const response = await client.chat.completions.create({
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

  // Research-backed answer using Perplexity with STAR format if applicable
  async generateResearchAnswer(question, context = {}) {
    try {
      // Determine if STAR format is needed
      const useSTAR = this.isSTARQuestion(question);
      
      // First, try Perplexity for research
      let researchContext = '';
      
      if (process.env.PERPLEXITY_API_KEY && useSTAR) {
        try {
          const perplexityResponse = await axios.post(
            'https://api.perplexity.ai/chat/completions',
            {
              model: 'llama-3.1-sonar-small-128k-online',
              messages: [
                {
                  role: 'system',
                  content: 'You are a research assistant. Provide relevant industry insights, best practices, and relevant examples for interview context.'
                },
                {
                  role: 'user',
                  content: `Provide industry context and best practices for this interview question: ${question}`
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

      // Generate STAR answer if applicable
      if (useSTAR) {
        return await this.generateSTARAnswer(question, context);
      }

      // Generate standard research answer
      const systemPrompt = `You are an expert interview coach with access to current information. 
Provide professional, well-researched answers to interview questions.

Context:
- Position: ${context.position || 'General'}
- Company: ${context.company || 'Not specified'}
- Industry: ${context.industry || 'General'}

${researchContext ? `Industry Context:\n${researchContext}` : ''}

Provide a comprehensive, confident answer that demonstrates expertise.`;

      const client = getOpenAI();
      if (!client) {
        throw new Error('OPENAI_API_KEY is not configured');
      }

      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.7,
        max_tokens: 1200
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Research answer generation error:', error);
      throw error;
    }
  }

  // Main answer generation with smart STAR detection and caching
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

      // Determine if STAR format is needed
      const needsSTAR = this.isSTARQuestion(question);
      
      // Use research + STAR for behavioral questions, or specified options
      const useResearch = options.research || options.deep || needsSTAR;
      let answer;
      
      if (needsSTAR) {
        // Generate STAR-formatted answer
        answer = await this.generateSTARAnswer(question, options.context);
      } else if (useResearch) {
        // Generate research-backed answer
        answer = await this.generateResearchAnswer(question, options.context);
      } else {
        // Generate fast answer
        answer = await this.generateFastAnswer(question, options.context);
      }

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
        source: needsSTAR ? 'star' : (useResearch ? 'research' : 'fast'),
        isSTARFormatted: needsSTAR
      };
    } catch (error) {
      console.error('Answer generation error:', error);
      throw error;
    }
  }

  // Pre-generate answers for common questions with STAR format for behavioral questions
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
      'Tell me about a difficult decision you had to make',
      'Describe a time when you had to learn something new quickly',
      'Give an example of when you showed leadership',
      'Tell me about a time you failed and what you learned',
      'How did you handle a conflict with a colleague?',
      'Can you describe a time you worked with a difficult team member?',
      'Do you have any questions for us?'
    ];

    const results = [];

    for (const question of commonQuestions) {
      try {
        const needsSTAR = this.isSTARQuestion(question);
        
        // Use STAR format for behavioral questions
        const answer = needsSTAR
          ? await this.generateSTARAnswer(question, context)
          : await this.generateFastAnswer(question, context);
        
        await query(
          `INSERT INTO pre_generated_answers 
           (user_id, category, question_pattern, generated_answer, context, is_star_formatted)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, 'common', question, answer, JSON.stringify(context), needsSTAR]
        );

        results.push({ question, generated: true, isSTAR: needsSTAR });
      } catch (error) {
        console.error(`Failed to pre-generate answer for: ${question}`, error);
        results.push({ question, generated: false, error: error.message });
      }
    }

    return results;
  }
}

module.exports = new AnswerService();
