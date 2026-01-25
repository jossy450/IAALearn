const OpenAI = require('openai');
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
}

module.exports = new SmartAIService();
