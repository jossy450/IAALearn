const OpenAI = require('openai');
const { query } = require('../database/connection');

let groqClient = null;
let openai = null;

function getGroq() {
  if (!groqClient && process.env.GROQ_API_KEY) {
    groqClient = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1'
    });
  }
  return groqClient;
}

function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

function getLLMClient() {
  return getGroq() || getOpenAI();
}

class SmartAIService {
  constructor() {
    this.learningEnabled = true;
    this.contextWindow = 10; // Number of previous Q&A to consider
  }

  // Analyze question category using AI
  async categorizeQuestion(question) {
    const client = getOpenAI();
    if (!client) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Categorize this interview question into ONE category:
- technical: Programming, algorithms, system design
- behavioral: Past experiences, situational questions
- cultural: Company fit, values, work style
- leadership: Management, decision making
- problem-solving: Case studies, hypothetical scenarios
- general: Basic questions about background

Respond with only the category name.`
          },
          { role: 'user', content: question }
        ],
        temperature: 0.3,
        max_tokens: 20
      });

      return response.choices[0].message.content.trim().toLowerCase();
    } catch (error) {
      console.error('Question categorization error:', error);
      return 'general';
    }
  }

  // Extract key topics from question
  async extractKeyTopics(question) {
    const client = getOpenAI();
    if (!client) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Extract 3-5 key topics or skills mentioned in this question. Return as comma-separated list.'
          },
          { role: 'user', content: question }
        ],
        temperature: 0.3,
        max_tokens: 50
      });

      return response.choices[0].message.content
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0);
    } catch (error) {
      console.error('Topic extraction error:', error);
      return [];
    }
  }

  // Learn from user's session history
  async learnFromHistory(userId, sessionId) {
    try {
      const history = await query(
        `SELECT q.question_text, q.response_time_ms, s.session_type, s.position
         FROM questions q
         JOIN interview_sessions s ON q.session_id = s.id
         WHERE s.user_id = $1
         ORDER BY q.asked_at DESC
         LIMIT $2`,
        [userId, this.contextWindow]
      );

      if (history.rows.length === 0) return null;

      // Analyze patterns
      const avgResponseTime = history.rows.reduce((acc, r) => acc + (r.response_time_ms || 0), 0) / history.rows.length;
      const categories = await Promise.all(
        history.rows.map(r => this.categorizeQuestion(r.question_text))
      );

      return {
        questionCount: history.rows.length,
        avgResponseTime,
        commonCategories: this.getMostFrequent(categories),
        recentPosition: history.rows[0]?.position,
        recentType: history.rows[0]?.session_type
      };
    } catch (error) {
      console.error('Learning error:', error);
      return null;
    }
  }

  // Predict next likely questions based on context
  async predictNextQuestions(sessionId, currentQuestion) {
    const client = getOpenAI();
    if (!client) {
      return [];
    }
    try {
      // Get session context
      const sessionData = await query(
        `SELECT s.*, array_agg(q.question_text ORDER BY q.asked_at) as questions
         FROM interview_sessions s
         LEFT JOIN questions q ON s.id = q.session_id
         WHERE s.id = $1
         GROUP BY s.id`,
        [sessionId]
      );

      if (sessionData.rows.length === 0) return [];

      const session = sessionData.rows[0];
      const previousQuestions = session.questions?.filter(q => q) || [];

      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert interview analyst. Based on the interview context and flow, predict 3 likely follow-up questions the interviewer might ask next.

Context:
- Position: ${session.position || 'Not specified'}
- Company: ${session.company_name || 'Not specified'}
- Interview Type: ${session.session_type || 'general'}
- Questions asked so far: ${previousQuestions.length}

Return as a numbered list.`
          },
          {
            role: 'user',
            content: `Previous questions:\n${previousQuestions.join('\n')}\n\nCurrent question: ${currentQuestion}\n\nWhat are 3 likely follow-up questions?`
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      });

      const predictions = response.choices[0].message.content
        .split('\n')
        .filter(line => line.match(/^\d+\./))
        .map(line => line.replace(/^\d+\.\s*/, '').trim());

      return predictions;
    } catch (error) {
      console.error('Question prediction error:', error);
      return [];
    }
  }

  // Generate personalized answer using user profile and history
  async generatePersonalizedAnswer(question, userId, context = {}) {
    const client = getOpenAI();
    if (!client) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    try {
      // Get user's learning profile
      const userProfile = await this.learnFromHistory(userId, context.sessionId);

      // Get similar past answers
      const similarAnswers = await query(
        `SELECT ac.answer_text, ac.quality_score
         FROM answer_cache ac
         WHERE ac.question_text ILIKE $1
         ORDER BY ac.quality_score DESC, ac.hit_count DESC
         LIMIT 3`,
        [`%${question.split(' ').slice(0, 3).join('%')}%`]
      );

      const systemPrompt = `You are an expert interview coach creating personalized answers.

User Profile:
- Average response time: ${userProfile?.avgResponseTime || 'N/A'}ms
- Common question types: ${userProfile?.commonCategories?.join(', ') || 'varied'}
- Target position: ${context.position || userProfile?.recentPosition || 'Not specified'}
- Company: ${context.company || 'Not specified'}

${similarAnswers.rows.length > 0 ? `Similar high-quality answers for reference:
${similarAnswers.rows.map((a, i) => `${i + 1}. ${a.answer_text.substring(0, 150)}...`).join('\n')}` : ''}

Create a professional, confident answer that:
1. Matches the user's interview context
2. Uses proven answer patterns
3. Is concise but comprehensive (2-3 paragraphs)
4. Includes specific examples when relevant`;

      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.75,
        max_tokens: 600
      });

      return {
        answer: response.choices[0].message.content,
        personalized: true,
        confidence: similarAnswers.rows.length > 0 ? 'high' : 'medium'
      };
    } catch (error) {
      console.error('Personalized answer error:', error);
      throw error;
    }
  }

  // Analyze answer quality and suggest improvements
  async analyzeAnswerQuality(question, answer) {
    const client = getOpenAI();
    if (!client) {
      return {
        score: 7,
        strengths: ['Clear structure'],
        improvements: ['API key not configured'],
        suggestions: 'Add OPENAI_API_KEY to use this feature'
      };
    }
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Analyze this interview answer and provide:
1. Quality score (1-10)
2. Strengths (2-3 points)
3. Areas for improvement (2-3 points)
4. Suggested enhancements

Format as JSON with keys: score, strengths, improvements, suggestions`
          },
          {
            role: 'user',
            content: `Question: ${question}\n\nAnswer: ${answer}`
          }
        ],
        temperature: 0.5,
        max_tokens: 400
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Answer analysis error:', error);
      return {
        score: 7,
        strengths: ['Clear structure', 'Professional tone'],
        improvements: ['Could add more specific examples'],
        suggestions: 'Consider adding quantifiable achievements'
      };
    }
  }

  // Smart cache decision - decide if question should use cache or generate new
  async shouldUseCache(question, userId, sessionContext) {
    try {
      // Get user's performance with cached vs generated answers
      const performance = await query(
        `SELECT 
           AVG(CASE WHEN ac.id IS NOT NULL THEN 1 ELSE 0 END) as cache_rate,
           AVG(q.response_time_ms) as avg_time
         FROM questions q
         LEFT JOIN answer_cache ac ON q.question_text = ac.question_text
         WHERE q.session_id IN (
           SELECT id FROM interview_sessions WHERE user_id = $1
         )`,
        [userId]
      );

      const cacheRate = parseFloat(performance.rows[0]?.cache_rate || 0);

      // Decision factors
      const factors = {
        isCommonQuestion: await this.isCommonQuestion(question),
        userPrefersSpeed: cacheRate > 0.7,
        isComplexQuestion: question.split(' ').length > 15,
        sessionType: sessionContext.sessionType
      };

      // Use cache if it's a common question OR user prefers speed AND not complex
      return factors.isCommonQuestion || (factors.userPrefersSpeed && !factors.isComplexQuestion);
    } catch (error) {
      console.error('Cache decision error:', error);
      return true; // Default to cache
    }
  }

  // Check if question is common across users
  async isCommonQuestion(question) {
    try {
      const result = await query(
        `SELECT COUNT(*) as count
         FROM answer_cache
         WHERE question_text ILIKE $1 AND hit_count > 5`,
        [`%${question}%`]
      );

      return parseInt(result.rows[0]?.count || 0) > 0;
    } catch (error) {
      return false;
    }
  }

  // Generate follow-up questions for practice
  async generatePracticeQuestions(sessionId, count = 5) {
    const client = getOpenAI();
    if (!client) {
      return [];
    }
    try {
      const sessionData = await query(
        `SELECT s.*, array_agg(q.question_text) as questions
         FROM interview_sessions s
         LEFT JOIN questions q ON s.id = q.session_id
         WHERE s.id = $1
         GROUP BY s.id`,
        [sessionId]
      );

      const session = sessionData.rows[0];

      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Generate ${count} interview practice questions based on the session context.
Questions should be relevant to the position and progressively challenging.
Return as numbered list.`
          },
          {
            role: 'user',
            content: `Position: ${session.position}
Company: ${session.company_name}
Type: ${session.session_type}
Questions covered: ${session.questions?.length || 0}`
          }
        ],
        temperature: 0.8,
        max_tokens: 500
      });

      return response.choices[0].message.content
        .split('\n')
        .filter(line => line.match(/^\d+\./))
        .map(line => line.replace(/^\d+\.\s*/, '').trim());
    } catch (error) {
      console.error('Practice generation error:', error);
      return [];
    }
  }

  // Helper: Get most frequent items
  getMostFrequent(arr) {
    const frequency = {};
    arr.forEach(item => {
      frequency[item] = (frequency[item] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([item]) => item);
  }

  // Sentiment analysis of interview questions
  async analyzeQuestionSentiment(question) {
    const client = getOpenAI();
    if (!client) {
      return { sentiment: 'neutral', difficulty: 'medium', stress_level: 5 };
    }
    try{
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Analyze the sentiment and difficulty of this interview question. Respond with JSON: {sentiment: "positive|neutral|challenging", difficulty: "easy|medium|hard", stress_level: 1-10}'
          },
          { role: 'user', content: question }
        ],
        temperature: 0.3,
        max_tokens: 50
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      return { sentiment: 'neutral', difficulty: 'medium', stress_level: 5 };
    }
  }

  // Generate perfect answer based on interviewer question + CV + Job Description + Person Spec + AI Instructions
  async generatePerfectAnswer(question, userId, context, onChunk) {
    const client = getLLMClient();
    if (!client) {
      throw new Error('No AI provider configured (set GROQ_API_KEY or OPENAI_API_KEY)');
    }

    try {
      const { 
        cv = '', 
        jobDescription = '', 
        personSpecification = '',
        aiInstructions = '',
        position = '', 
        company = '' 
      } = context;

      const normalizedCv = (cv || '').trim();
      const normalizedJobDescription = (jobDescription || '').trim();
      const normalizedPersonSpecification = (personSpecification || '').trim();
      const normalizedAiInstructions = (aiInstructions || '').trim();
      const normalizedPosition = (position || '').trim();
      const normalizedCompany = (company || '').trim();
      const normalizedQuestion = (question || '').trim();

      const extractEmployerAnchors = (text = '') => {
        const anchors = new Set();
        const source = text.replace(/\r/g, '\n');

        // Explicit company-style names (Ltd, Limited, Inc, etc.)
        const companySuffixPattern = /\b([A-Z][A-Za-z0-9&',.\- ]{1,70}\s(?:Limited|Ltd|LLC|Inc|Corp|Corporation|PLC|Group|Consulting|Technologies|Technology|Solutions|Systems|Services))\b/g;
        let match;
        while ((match = companySuffixPattern.exec(source)) !== null) {
          const candidate = match[1].replace(/\s+/g, ' ').trim();
          if (candidate.split(' ').length <= 9) anchors.add(candidate);
          if (anchors.size >= 4) break;
        }

        // "at <Company>" fallback pattern
        if (anchors.size < 4) {
          const atPattern = /\b(?:at|with|for)\s+([A-Z][A-Za-z0-9&',.\- ]{2,60})/g;
          while ((match = atPattern.exec(source)) !== null) {
            const candidate = match[1]
              .replace(/[,:;].*$/, '')
              .replace(/\s+/g, ' ')
              .trim();

            const lower = candidate.toLowerCase();
            const looksGeneric = [
              'the',
              'a',
              'an',
              'team',
              'company',
              'organization',
              'business',
              'role',
              'position',
            ].includes(lower);

            if (!looksGeneric && candidate.split(' ').length <= 9) {
              anchors.add(candidate);
            }
            if (anchors.size >= 4) break;
          }
        }

        return Array.from(anchors).slice(0, 4);
      };

      const employerAnchors = extractEmployerAnchors(normalizedCv);
      const primaryEmployerAnchor = employerAnchors[0] || '';

      const allowedNumericTokens = Array.from(new Set(
        `${normalizedCv}\n${normalizedJobDescription}\n${normalizedPersonSpecification}`
          .match(/\b\d+(?:\.\d+)?%?\b/g) || []
      )).slice(0, 20);

      const isTellMeAboutYourself = /tell me about yourself|introduce yourself|walk me through your background|overview of your background/i
        .test(normalizedQuestion.toLowerCase());

      const isBehavioralStoryQuestion = /tell me about a time|difficult situation|challenge|conflict|wasn't your task|was not your task|not your task|went wrong|problem you faced|handle(?:d)?\s+a\s+difficult\s+situation|resolve(?:d)?\s+the\s+issue|under pressure|decision|short.?time|tight deadline|prioriti|disagree|failure|mistake|learn|feedback|persuade|influence|ambiguous|unclear|ownership|initiative|beyond your role/i
        .test(normalizedQuestion.toLowerCase());

      const isAmazon = /amazon|aws|amazon web services/i.test(normalizedCompany);

      const targetCompanyProvided = Boolean(normalizedCompany);

      const hasAiInstructions = normalizedAiInstructions.length > 0;
      const hasContextData = [
        normalizedCv,
        normalizedJobDescription,
        normalizedPersonSpecification,
        normalizedPosition,
        normalizedCompany,
      ].some(Boolean);

      const standardWriteupInstructions = `
Standard write-up instructions:
- Keep it tight (2 short paragraphs max, or bullets if clearer).
- Be factual and specific; avoid fluff and hype.
- Bold 3-6 key skills/technologies/achievements for quick skimming (use **like this**).
- Include 1-2 concrete examples or metrics only when they are supported by provided information.
- Sound like a confident candidate, not a generic AI.
- If STAR/STARR method is requested, structure the answer accordingly.
- Answer directly without preamble. Make it actionable for the candidate to speak aloud.`;

      const questionSpecificBlueprint = isTellMeAboutYourself
        ? `
Question blueprint ("Tell me about yourself"):
- Use PRESENT → PAST → FUTURE structure.
- Present (1-2 sentences): current professional identity and strongest relevant capability.
- Past (2-4 sentences): 2-3 concrete, context-grounded highlights from CV/job/person-spec data.
- Future fit (1-2 sentences): why this role/company is the right next step.
- Mention provided company and role explicitly when available.
- Avoid generic opener phrases like "I am highly motivated".
- Target 110-170 words unless custom instructions override this.`
        : `
Question blueprint:
- Answer the exact interviewer question directly.
- Use a clear logical structure with context-grounded points.
- Target 90-160 words unless custom instructions override this.`;

      const amazonLPSection = isAmazon && isBehavioralStoryQuestion ? `
Amazon Leadership Principles (MANDATORY for Amazon interviews):
- Identify the single most relevant Amazon LP for this question and name it explicitly at the end.
- Common LPs for decision/time-pressure questions: "Bias for Action", "Deliver Results", "Ownership", "Are Right, A Lot".
- Common LPs for conflict/difficult situation: "Earn Trust", "Have Backbone; Disagree and Commit", "Ownership".
- Common LPs for initiative/beyond role: "Ownership", "Invent and Simplify", "Think Big".
- Structure: Use full STAR (Situation → Task → Action → Result) with clear section labels or natural flow.
- Result MUST include measurable impact (time saved, uptime restored, cost reduced, team unblocked, etc.).
- If no metric is in the CV/context, use a realistic qualitative outcome (e.g., "restored service within 2 hours", "zero further incidents").
- End with: "This reflects my commitment to [LP name] — [one sentence on why it matters at Amazon]."
- Target 180-250 words for Amazon behavioral answers.` : '';

      const behavioralBlueprint = isBehavioralStoryQuestion
        ? `
Behavioral-story blueprint (STAR format — MANDATORY):
Structure the answer with these four clear parts:

**SITUATION** (1-2 sentences): Set the scene. Name the employer/team/project from CV if available. Be specific — what was happening, what was at stake.

**TASK** (1 sentence): What was YOUR specific responsibility or the challenge you personally owned? If it was outside your assigned role, say so explicitly.

**ACTION** (2-3 sentences): What did YOU specifically do? Use "I" not "we". Show decision-making, technical expertise, and clear ownership. Include the reasoning behind your choice.

**RESULT** (1-2 sentences): What was the measurable outcome? Include impact: time restored, downtime avoided, team unblocked, cost saved, reliability improved. If no metric is available from context, use a realistic qualitative outcome.

Additional rules:
- If employer names are available from CV, name one explicitly (e.g., "At ${primaryEmployerAnchor || 'my previous employer'}...").
- If the question says it was not your task, explicitly state it was outside your assigned responsibility and that you took ownership anyway.
- End with 1 sentence connecting this experience to the target role at ${normalizedCompany || 'the target company'}.
- Avoid vague phrases like "I worked with the team" — be specific about YOUR actions.
- Target 150-220 words.

${amazonLPSection}`
        : '';

      const personalizationRules = employerAnchors.length
        ? `
Personalization requirements:
- Use at least one CV employer/work-history anchor by name: ${employerAnchors.join(', ')}.
- Avoid generic phrasing like "In my previous role" without naming context.
- Make wording sound natural and first-person, not template-like.`
        : `
Personalization requirements:
- Use the most specific role/project/team context available from CV.
- Keep wording natural and first-person, not template-like.`;

      const companyRoleUsageRules = `
Company/role usage rules:
- The target company (${normalizedCompany || 'the recruiting company'}) is the interviewing/recruiting company, not automatically the past employer.
- Do NOT frame past experience as if it happened at the target company unless the CV explicitly says so.
- For experience examples, prefer candidate's previous employer(s) from CV${employerAnchors.length ? `: ${employerAnchors.join(', ')}` : ''}.
- Use target company/role in a forward-looking fit sentence (e.g., why this experience is relevant to ${normalizedCompany || 'the target company'} ${normalizedPosition || ''}).`;

      const behavioralHardRule = isBehavioralStoryQuestion
        ? `
Behavioral hard rule:
- Start the situation with a real prior employer/team context from CV${primaryEmployerAnchor ? ` (prefer: ${primaryEmployerAnchor})` : ''}.
- If prior employer is available, never start with "At ${normalizedCompany || 'the target company'}" for past events.
- If the question states it was not your task, explicitly state that it was outside your assigned responsibility and that you took ownership.`
        : '';

      const numericGuardrail = allowedNumericTokens.length
        ? `
Numeric guardrail:
- You may only use numeric values that appear in provided context.
- Allowed numeric tokens: ${allowedNumericTokens.join(', ')}.
- Do not introduce new percentages or numbers.`
        : `
Numeric guardrail:
- No numeric evidence was provided.
- Do NOT invent or use any percentages/figures.`;

      const groundingChecklist = hasContextData
        ? `
Grounding checklist (required):
1. Include at least one explicit CV-grounded detail.
2. Include at least one explicit job/person-spec/role-grounded detail.
3. Include company and role if provided.
4. If a metric exists in provided data, include it naturally.
5. Remove vague filler statements before finalizing.`
        : `
Grounding checklist (required):
1. No context provided: generate strongest general professional answer.
2. Keep claims realistic and adaptable.
3. Do not invent personal metrics or specific achievements.`;

      // Behavior policy requested by user:
      // 1) Candidate instructions first (if provided)
      // 2) Tailor to provided context
      // 3) If no instructions, use standard write-up rules
      // 4) If no context either, still generate best possible answer with general professional framing
      let tailoringPolicy = '';
      if (hasAiInstructions) {
        tailoringPolicy = `
Priority policy:
1. Candidate custom instructions are MANDATORY and highest priority.
2. Tailor the answer strictly to provided candidate/context information.
3. If some context is missing, keep missing parts general and adaptable (do not invent facts).
4. Still keep the final output concise and interview-ready.`;
      } else if (hasContextData) {
        tailoringPolicy = `
Priority policy:
1. No custom candidate instructions were provided.
2. Follow the standard write-up instructions.
3. Tailor strictly to provided candidate/context information.
4. Do not invent candidate-specific facts that are not in the provided data.`;
      } else {
        tailoringPolicy = `
Priority policy:
1. No custom candidate instructions were provided.
2. Limited/no candidate context was provided.
3. Follow the standard write-up instructions and generate the best possible interview answer.
4. Keep claims general and adaptable; do not fabricate personal achievements/metrics.`;
      }

      // Build person specification section
      let personSpecSection = '';
      if (normalizedPersonSpecification) {
        personSpecSection = `

Person Specification (required competencies/criteria):
${normalizedPersonSpecification}`;
      }

      const systemPrompt = `You are an expert interview coach. Produce a PERFECT answer that is factual, direct, concise, and tailored.

${tailoringPolicy}

Hard constraints:
- Never contradict provided instructions/context.
- Never invent candidate-specific facts, experience, tools, or metrics that were not provided.
- If details are missing, use clear professional wording that is still useful and realistic.

${questionSpecificBlueprint}

${behavioralBlueprint}

${groundingChecklist}

${personalizationRules}

${companyRoleUsageRules}

${behavioralHardRule}

${numericGuardrail}

${standardWriteupInstructions}`;

      const userPrompt = `
Interview Question: "${question}"

Company: ${normalizedCompany || 'Unknown'}
Position: ${normalizedPosition || 'Unknown'}

Candidate Custom Instructions:
${hasAiInstructions ? normalizedAiInstructions : 'None provided'}

Candidate's CV/Resume:
${normalizedCv || 'No CV provided'}

Job Description:
${normalizedJobDescription || 'No job description provided'}${personSpecSection}

Grounding facts that can be used:
- Role target: ${normalizedPosition || 'Not provided'}
- Company target: ${normalizedCompany || 'Not provided'}
- CV facts: ${normalizedCv || 'Not provided'}
- Job facts: ${normalizedJobDescription || 'Not provided'}
- Person-spec facts: ${normalizedPersonSpecification || 'Not provided'}
- Employer/work-history anchors from CV: ${employerAnchors.length ? employerAnchors.join(', ') : 'None detected'}
- Preferred anchor to humanize answer: ${primaryEmployerAnchor || 'Use the most specific valid work-history detail available'}
- Target company should be used as future fit only (unless CV confirms it as past employer): ${targetCompanyProvided ? normalizedCompany : 'Not provided'}
- Allowed numeric tokens: ${allowedNumericTokens.length ? allowedNumericTokens.join(', ') : 'None'}

Provide the perfect answer the candidate should give:`;

      const stream = await client.chat.completions.create({
        model: process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: true,
        temperature: hasContextData || hasAiInstructions ? 0.35 : 0.55,
        max_tokens: 1000
      });

      for await (const chunk of stream) {
        if (chunk.choices[0]?.delta?.content) {
          onChunk(chunk.choices[0].delta.content);
        }
      }
    } catch (error) {
      console.error('Error generating perfect answer:', error);
      throw error;
    }
  }
}

module.exports = new SmartAIService();
