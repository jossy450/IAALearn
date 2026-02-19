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
  async generateFastAnswer(question, context = {}, streamCallback = null, options = {}) {
    const aiProvider = getAIProvider();
    const startTime = Date.now();
    
    try {
      // Extract technical keywords for better context
      const cvContent = context.cvContent || '';
      const jobDescription = context.jobDescription || '';
      const technicalKeywords = this.extractTechnicalKeywords(cvContent, jobDescription).slice(0, 8);

      const systemPrompt = `You are a technical interview coach providing concise, expert answers for interview questions.

Your answers should:
1. Be specific and technical - use actual technical terminology, tools, frameworks, or systems names
2. Include relevant experience with specific technologies: ${technicalKeywords.length > 0 ? technicalKeywords.join(', ') : 'technologies relevant to ' + (context.position || 'the role')}
3. Show expertise: demonstrate deep understanding of ${context.position || 'the role'}
4. For technical questions: mention specific tools, systems, languages, or methodologies used
5. Include a tangible result or metric when possible (e.g., "improved performance by 35%", "reduced latency from 400ms to 50ms")
6. Keep conversational but authoritative (2-3 sentences)
7. Be authentic and specific to ${context.company || 'the company'} tech stack where relevant

Context:
- Role: ${context.position || 'General'}
- Company: ${context.company || 'Not specified'}  
- Industry: ${context.industry || 'General'}`;

      // Use streaming if callback provided
      if (streamCallback && typeof streamCallback === 'function') {
        const result = await aiProvider.streamGenerate(
          question,
          systemPrompt,
          streamCallback,
          { 
            preferFree: true,
            forcePrimary: options.forcePrimary ?? true  // ✅ Default to Grok
          }
        );
        
        const duration = Date.now() - startTime;
        console.log(`✅ Streamed answer: ${duration}ms (${result.provider}, ${result.free ? 'FREE' : 'PAID'})`);
        
        return result.text;
      }

      // Non-streaming
      const result = await aiProvider.generate(
        question,
        systemPrompt,
        { 
          preferFree: true,
          forcePrimary: options.forcePrimary ?? true  // ✅ Default to Grok
        }
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
  async generateResearchAnswer(question, context = {}, options = {}) {
    const startTime = Date.now();
    const aiProvider = getAIProvider();
    
    try {
      // Extract technical keywords for better context
      const cvContent = context.cvContent || '';
      const jobDescription = context.jobDescription || '';
      const technicalKeywords = this.extractTechnicalKeywords(cvContent, jobDescription);
      
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
                  content: 'You are a research assistant. Provide relevant facts, industry insights, technical requirements, and best practices for interview context. Be specific about technologies and systems used in this role.'
                },
                {
                  role: 'user',
                  content: `For a ${context.position || 'General'} role at ${context.company || 'a major tech company'}, provide industry context, technical depth, and best practices for this interview question: ${question}`
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
      const systemPrompt = `You are an expert interview coach with deep technical knowledge across multiple industries.
Provide professional, well-researched answers to interview questions that demonstrate technical expertise and specific knowledge.

TECHNICAL CONTEXT:
${technicalKeywords.length > 0 ? `Key Technologies & Systems For This Role: ${technicalKeywords.join(', ')}` : ''}
Position: ${context.position || 'General'}
Company: ${context.company || 'Not specified'}
Industry: ${context.industry || 'General'}

${researchContext ? `Industry Research:\n${researchContext}` : ''}

ANSWER REQUIREMENTS:
1. Be specific and technical - use actual terminology relevant to ${context.position || 'the role'}
2. Demonstrate deep expertise and industry knowledge
3. Include specific technologies, tools, or methodologies where relevant
4. Use technical terminology and best practices
5. Show quantifiable impact and results when applicable
6. Be comprehensive, confident, and authentic
7. Reference specific ${context.company || 'company'} context when relevant`;

      const result = await aiProvider.generate(
        question,
        systemPrompt,
        { 
          smart: true, 
          preferFree: true,
          forcePrimary: options.forcePrimary ?? true  // ✅ Default to Grok
        }
      );

      const duration = Date.now() - startTime;
      console.log(`✅ Research answer: ${duration}ms (${result.provider}, ${result.free ? 'FREE' : 'PAID'})`);
      
      return result.text;
    } catch (error) {
      console.error('Research answer generation error:', error);
      throw error;
    }
  }

  // Extract technical keywords from CV and job description
  extractTechnicalKeywords(cvContent = '', jobDescription = '') {
    const technicalTerms = [
      // Cloud platforms
      'AWS', 'Azure', 'GCP', 'Google Cloud', 'cloud computing', 'serverless',
      // Data center & infrastructure
      'kubernetes', 'docker', 'containerization', 'virtualization', 'vmware', 'hypervisor',
      'data center', 'infrastructure', 'networking', 'TCP/IP', 'DNS', 'load balancer',
      'datacenter operations', 'facility management', 'HVAC', 'power distribution', 'UPS',
      'rack management', 'cooling systems', 'fiber optics', 'cabling',
      // Databases
      'SQL', 'NoSQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'DynamoDB', 'Cassandra',
      'database', 'elasticsearch', 'redis', 'cache',
      // Development & frameworks  
      'python', 'java', 'golang', 'node.js', 'rust', 'typescript', 'javascript',
      'react', 'vue', 'angular', 'spring', 'django', 'fastapi', 'microservices',
      // DevOps & monitoring
      'CI/CD', 'jenkins', 'gitlab', 'github', 'docker', 'terraform', 'ansible',
      'prometheus', 'grafana', 'datadog', 'elk stack', 'observability', 'logging',
      // IT & networking
      'active directory', 'LDAP', 'VPN', 'firewall', 'security', 'encryption', 'SSL/TLS',
      'network management', 'systems administration', 'linux', 'windows', 'unix',
      // Agile & processes
      'agile', 'scrum', 'kanban', 'jira', 'confluence', 'git', 'version control',
      // Data science & analytics
      'machine learning', 'tensorflow', 'pytorch', 'data analysis', 'statistics',
      'big data', 'spark', 'hadoop', 'data pipeline'
    ];

    const combined = (cvContent + ' ' + jobDescription).toLowerCase();
    return technicalTerms.filter(term => combined.includes(term.toLowerCase()));
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
      const forcePrimary = options.forcePrimary;
      
      const answer = useResearch
        ? await this.generateResearchAnswer(question, options.context, { forcePrimary })
        : await this.generateFastAnswer(question, options.context, streamCallback, { forcePrimary });
      
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
