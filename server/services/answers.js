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
      // Extract technical keywords from CV and job description
      const cvContent = context.cvContent || '';
      const jobDescription = context.jobDescription || '';
      const technicalKeywords = this.extractTechnicalKeywords(cvContent, jobDescription);
      
      const systemPrompt = `You are an expert executive interview coach specializing in major tech companies (Amazon, Google, Microsoft, etc.) and technical roles.

Your task is to generate PERFECT STAR-formatted answers for behavioral/competency interview questions.

TECHNICAL CONTEXT:
${technicalKeywords.length > 0 ? `Relevant Technologies & Systems: ${technicalKeywords.join(', ')}` : ''}
Position: ${context.position || 'General'}
Company: ${context.company || 'Not specified'}
${jobDescription ? `Job Requirements: Key technical areas and skills needed` : ''}

STAR Format Requirements:
1. **Situation**: Set clear context (2-3 sentences). Include specific company/domain/technical details relevant to ${context.company || 'the company'}.
2. **Task**: Define your specific responsibility and ownership (1-2 sentences).
3. **Action**: Detail YOUR specific decisions and actions - not the team's (3-4 sentences). 
   - For TECHNICAL roles: Mention specific technologies, tools, systems, or methodologies you used (e.g., database engines, cloud platforms, programming languages, infrastructure systems, protocols, frameworks).
   - Show technical decision-making and problem-solving approach.
   - Include specific technical challenges you overcame.
4. **Result**: Quantify impact with specific metrics (reduced X%, improved Y, saved Z hours, achieved W). Show short-term wins AND long-term gains (2-3 sentences).

CRITICAL FOR TECHNICAL ROLES:
- Use actual technical terminology relevant to the role and company
- Reference specific tools, frameworks, systems, or methodologies by name
- If asking about systems/data center tech: mention specific datacenter systems (e.g., virtualization platforms, network architecture, cooling systems, power management)
- If asking about IT/infrastructure: reference specific technologies (cloud platforms, containerization, infrastructure-as-code, monitoring systems)
- If asking about development: mention specific languages, frameworks, databases, architectures used
- Demonstrate technical depth and expertise
- Show how your technical background benefits the company

Guidelines:
- Use clear labeled sections: **Situation:** **Task:** **Action:** **Result:**
- Include specific metrics and measurable outcomes (percentages, time saved, cost reduction, ROI, performance improvements)
- Demonstrate clear ownership ("I decided", "I implemented", "I led", "I designed")
- Keep total answer 4-5 minutes when spoken (5-7 paragraphs)
- End with relevance to the role: "This experience demonstrates... [relevant technical skills for ${context.company || 'the position'}]"
- Be confident, specific, authentic, and TECHNICAL

${technicalKeywords.length > 0 ? `Use these technologies/systems where relevant in your answer: ${technicalKeywords.slice(0, 5).join(', ')}` : ''}`;

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

  // Fast answer generation using GPT-4
  async generateFastAnswer(question, context = {}) {
    const client = getOpenAI();
    if (!client) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    try {
      // Extract technical keywords for this role
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
      
      // Extract technical keywords for better context
      const cvContent = options.cvContent || '';
      const jobDescription = options.jobDescription || '';
      const technicalKeywords = this.extractTechnicalKeywords(cvContent, jobDescription);
      
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
                  content: 'You are a research assistant. Provide relevant industry insights, best practices, technical requirements, and relevant examples for interview context. Be specific about technologies and systems used in this role.'
                },
                {
                  role: 'user',
                  content: `For a ${options.position || 'General'} role at ${options.company || 'a major tech company'}, provide industry context, best practices, and technical depth for this interview question: ${question}`
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
        return await this.generateSTARAnswer(question, options);
      }

      // Generate standard research answer with technical focus
      const systemPrompt = `You are an expert interview coach with deep technical knowledge across multiple industries. 
Provide professional, well-researched answers to interview questions that demonstrate technical expertise and specific knowledge.

TECHNICAL CONTEXT:
${technicalKeywords.length > 0 ? `Key Technologies & Systems For This Role: ${technicalKeywords.join(', ')}` : ''}
Position: ${options.position || 'General'}
Company: ${options.company || 'Not specified'}
Industry: ${options.industry || 'General'}

${researchContext ? `Industry Research:\n${researchContext}` : ''}

ANSWER REQUIREMENTS:
1. Be specific and technical - use actual terminology relevant to ${options.position || 'the role'}
2. Demonstrate deep expertise and industry knowledge
3. Include specific technologies, tools, or methodologies where relevant
4. Use technical terminology and best practices
5. Show quantifiable impact and results when applicable
6. Be comprehensive, confident, and authentic
7. Reference specific ${options.company || 'company'} context when relevant`;

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
