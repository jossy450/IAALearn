const express = require('express');
const { query } = require('../database/connection');
const { authenticate } = require('../middleware/auth');

const mockInterviewRouter = express.Router();

// Groq client for AI responses - lazy loaded
let groqClient = null;
const getGroqClient = () => {
  if (!groqClient) {
    try {
      const { Groq } = require('groq-sdk');
      groqClient = new Groq({
        apiKey: process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY
      });
      console.log('✓ Groq client initialized');
    } catch (error) {
      console.error('Failed to initialize Groq client:', error.message);
      return null;
    }
  }
  return groqClient;
};

// Interview persona configurations
const INTERVIEW_PERSONAS = {
  professional: {
    name: 'Sarah',
    title: 'Senior HR Recruiter',
    company: 'Fortune 500 Tech Company',
    style: 'professional, thorough, behavioral-focused',
    greeting: "Hello! I'm Sarah, a senior HR recruiter at a leading tech company. I'll be conducting your interview today. We'll be discussing your experience, skills, and how you handle various workplace scenarios. Are you ready to begin?"
  },
  technical: {
    name: 'Michael',
    title: 'Technical Lead',
    company: 'Software Development Team',
    style: 'technical, problem-solving focused, depth-oriented',
    greeting: "Hi, I'm Michael, a technical lead on our software development team. I'll be assessing your technical skills and problem-solving abilities today. Let's dive into some coding challenges and technical questions."
  },
  behavioral: {
    name: 'Emily',
    title: 'HR Manager',
    company: 'Growing Startup',
    style: 'behavioral, culture-fit focused, situational',
    greeting: "Hello! I'm Emily, HR manager at a growing startup. I'm excited to learn more about you and how you'd fit into our company culture. We'll explore your past experiences and how you handle various work situations."
  }
};

const TOTAL_QUESTIONS = 5;
const clampQuestionNumber = (n) => {
  const num = parseInt(n, 10);
  if (Number.isNaN(num) || num < 1) return 1;
  if (num > TOTAL_QUESTIONS) return TOTAL_QUESTIONS;
  return num;
};

// Get interview questions based on role and experience level
async function generateInterviewQuestion(groq, persona, questionNumber, userContext = {}) {
  const questions = {
    1: {
      professional: "Tell me about yourself and what brings you to this position?",
      technical: "Can you walk me through your technical background and relevant projects you've worked on?",
      behavioral: "Describe a time when you had to work with a difficult team member. How did you handle it?"
    },
    2: {
      professional: "What are your greatest strengths and weaknesses?",
      technical: "Explain a complex technical concept to someone without a technical background.",
      behavioral: "Tell me about a time you had to meet a tight deadline. How did you prioritize and what was the outcome?"
    },
    3: {
      professional: "Where do you see yourself in 5 years?",
      technical: "Describe your approach to debugging a complex issue in production.",
      behavioral: "Give an example of a goal you reached and how you achieved it."
    },
    4: {
      professional: "Why do you want to work here?",
      technical: "What technologies are you most passionate about and why?",
      behavioral: "Tell me about a time you received critical feedback. How did you respond?"
    },
    5: {
      professional: "Do you have any questions for me?",
      technical: "What questions do you have about the technical challenges of this role?",
      behavioral: "Is there anything else you'd like me to know about you?"
    }
  };

  // Use predefined questions for simplicity, or generate with AI
  const defaultQuestion = questions[questionNumber]?.[persona] || 
    "Can you tell me more about this?";

  if (!groq) {
    return defaultQuestion;
  }

  try {
    // Try to generate a more contextual question using Groq
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are ${INTERVIEW_PERSONAS[persona].name}, ${INTERVIEW_PERSONAS[persona].title} at ${INTERVIEW_PERSONAS[persona].company}. 
          Your interviewing style is ${INTERVIEW_PERSONAS[persona].style}.
          Generate one insightful interview question for question #${questionNumber} of 5.
          Keep it professional, relevant to the role, and conversational.
          Just output the question, nothing else.`
        },
        {
          role: 'user',
          content: `Generate question #${questionNumber} for a candidate with background: ${JSON.stringify(userContext)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    return response.choices[0]?.message?.content || defaultQuestion;
  } catch (error) {
    console.error('Groq API error:', error);
    return defaultQuestion;
  }
}

// Generate AI answer suggestion
async function generateAnswerSuggestion(question, persona, userContext = {}) {
  const groq = getGroqClient();
  if (!groq) {
    return "Take a moment to structure your answer using the STAR method (Situation, Task, Action, Result).";
  }
  
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are an expert interview coach. Your role is to help candidates prepare for job interviews by providing:
          1. A suggested answer to the interviewer's question
          2. Key points to include
          3. Tips for delivery
          
          Format your response as:
          SUGGESTED_ANSWER: [2-3 paragraph response]
          KEY_POINTS: [bullet points]
          DELIVERY_TIPS: [how to say it]`
        },
        {
          role: 'user',
          content: `Question: ${question}\nPersona: ${persona}\nCandidate Background: ${JSON.stringify(userContext)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return response.choices[0]?.message?.content;
  } catch (error) {
    console.error('Groq API error for answer suggestion:', error);
    return "Take a moment to structure your answer using the STAR method (Situation, Task, Action, Result).";
  }
}

// Evaluate user's answer against ideal answer and provide feedback
async function evaluateUserAnswer(question, userAnswer, idealAnswer, persona) {
  const groq = getGroqClient();
  if (!groq) {
    return "Good effort! Consider using the STAR method to structure your answers more effectively.";
  }
  
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are an expert interview coach and evaluator. Your task is to evaluate a candidate's answer to an interview question and provide constructive feedback.
          
          Evaluate the answer based on:
          1. Relevance - Does it answer the question?
          2. Structure - Is it well-organized (STAR method)?
          3. Clarity - Is it clear and concise?
          4. Depth - Does it show sufficient knowledge/experience?
          5. Delivery points - What makes a good answer great?
          
          Format your response as:
          SCORE: [X/100] - Brief justification
          
          STRENGTHS:
          - [What the candidate did well]
          
          AREAS_FOR_IMPROVEMENT:
          - [What could be better]
          
          RECOMMENDED_ANSWER:
          [An improved version of the answer]
          
          LEARNING_TIPS:
          - [Specific advice on how to answer this type of question better]`
        },
        {
          role: 'user',
          content: `Question: ${question}
          
          Ideal Answer:
          ${idealAnswer}
          
          Candidate's Answer:
          ${userAnswer}
          
          Interview Persona: ${persona}`
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    });

    return response.choices[0]?.message?.content;
  } catch (error) {
    console.error('Groq API error for evaluation:', error);
    return "Good effort! Consider using the STAR method to structure your answers more effectively.";
  }
}

// Assess user's answer with a quick pass/score/advice payload
async function assessAnswer(question, userAnswer, persona) {
  const groq = getGroqClient();
  if (!groq) {
    return {
      score: 65,
      passThreshold: 70,
      summary: 'Assessment unavailable (fallback). Aim to tighten structure and relevance.',
      advice: 'Use STAR, be concise, and directly address the question.',
      raw: 'Offline fallback'
    };
  }

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are an interview assessor. Return strict JSON ONLY with keys:
          {"score": number 0-100, "passThreshold": number 0-100, "summary": string, "advice": string}
          - score: numeric estimate of answer quality for the question
          - passThreshold: typical pass bar (e.g., 70)
          - summary: brief evaluation of correctness/relevance
          - advice: concise, actionable tips tailored to this exact question
          Do not include any extra fields or text outside JSON.`
        },
        {
          role: 'user',
          content: `Question: ${question}\nPersona: ${persona}\nAnswer: ${userAnswer}`
        }
      ],
      temperature: 0.4,
      max_tokens: 200
    });

    const raw = response.choices[0]?.message?.content || '';
    try {
      const parsed = JSON.parse(raw);
      return { ...parsed, raw };
    } catch (_) {
      // Fallback parse for SCORE/PASS_THRESHOLD patterns
      const scoreMatch = raw.match(/score\s*[:\-]\s*(\d{1,3})/i);
      const thresholdMatch = raw.match(/pass[_\s-]*threshold\s*[:\-]\s*(\d{1,3})/i);
      return {
        score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
        passThreshold: thresholdMatch ? parseInt(thresholdMatch[1]) : 70,
        summary: raw.slice(0, 160) || 'Assessment unavailable.',
        advice: raw,
        raw
      };
    }
  } catch (error) {
    console.error('Groq API error for assessment:', error);
    return {
      score: 0,
      passThreshold: 70,
      summary: 'Assessment failed to generate.',
      advice: 'Try rephrasing and be concise with STAR.',
      raw: 'error'
    };
  }
}

// Start a new mock interview session
mockInterviewRouter.post('/session', authenticate, async (req, res) => {
  try {
    const { persona = 'professional', role, experienceLevel } = req.body;
    const userId = req.user.id;

    // Check if user has access (subscriber or privileged role)
    const userCheck = await query(
      `SELECT role, subscription_status FROM users WHERE id = $1`,
      [userId]
    );
    
    const user = userCheck.rows?.[0];
    const isPrivileged = ['owner', 'admin', 'developer'].includes(user?.role);
    const allowedPlans = ['pro', 'enterprise'];

    // Require Pro/Enterprise; optionally allow trial teaser via config flag
    const planResult = await query(
      `SELECT plan, status, start_date, end_date
         FROM subscriptions
        WHERE user_id = $1
          AND status IN ('active','trial')
        ORDER BY start_date DESC
        LIMIT 1`,
      [userId]
    );

    const currentPlan = planResult.rows?.[0]?.plan || null;
    const isSubscriber = allowedPlans.includes(currentPlan);

    if (!isPrivileged && !isSubscriber) {
      return res.status(403).json({
        error: 'Pro or Enterprise subscription required to access mock interviews.'
      });
    }

    // Create interview session in database
    const sessionResult = await query(
      `INSERT INTO mock_interview_sessions (user_id, persona, role, experience_level, status, created_at) 
       VALUES ($1, $2, $3, $4, 'in_progress', NOW()) RETURNING id`,
      [userId, persona, role || 'General', experienceLevel || 'mid']
    );

    const sessionId = sessionResult.rows?.[0]?.id;

    // Get the persona configuration
    const personaConfig = INTERVIEW_PERSONAS[persona] || INTERVIEW_PERSONAS.professional;

    res.json({
      sessionId,
      persona: personaConfig,
      status: 'in_progress',
      questionNumber: 1,
      greeting: personaConfig.greeting
    });
  } catch (error) {
    console.error('Error starting mock interview:', error);
    res.status(500).json({ error: 'Failed to start interview session' });
  }
});

// Get next interview question
mockInterviewRouter.get('/question/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { persona = 'professional' } = req.query;

    // Get user context from database
    const userCheck = await query(
      `SELECT full_name, email FROM users WHERE id = $1`,
      [req.user.id]
    );

    const userContext = {
      name: userCheck.rows?.[0]?.full_name || 'Candidate',
      email: userCheck.rows?.[0]?.email || ''
    };

    const groq = getGroqClient();
    const questionNumber = clampQuestionNumber(req.query.questionNumber || 1);
    const question = await generateInterviewQuestion(groq, persona, questionNumber, userContext);

    res.json({
      question,
      questionNumber,
      totalQuestions: TOTAL_QUESTIONS
    });
  } catch (error) {
    console.error('Error getting question:', error);
    res.status(500).json({ error: 'Failed to get question' });
  }
});

// Get AI answer suggestion
mockInterviewRouter.post('/suggest-answer', authenticate, async (req, res) => {
  try {
    const { question, persona = 'professional' } = req.body;

    // Get user context
    const userCheck = await query(
      `SELECT full_name, email FROM users WHERE id = $1`,
      [req.user.id]
    );

    const userContext = {
      name: userCheck.rows?.[0]?.full_name || 'Candidate',
      email: userCheck.rows?.[0]?.email || ''
    };

    const suggestion = await generateAnswerSuggestion(question, persona, userContext);

    res.json({ suggestion });
  } catch (error) {
    console.error('Error generating answer suggestion:', error);
    res.status(500).json({ error: 'Failed to generate suggestion' });
  }
});

// Submit candidate's answer
mockInterviewRouter.post('/submit-answer', authenticate, async (req, res) => {
  try {
    const { sessionId, questionNumber, answer, aiSuggestion, question, persona = 'professional' } = req.body;
    const userId = req.user.id;

    // Store the answer with AI suggestion
    await query(
      `INSERT INTO mock_interview_answers (session_id, question_number, question_text, user_answer, ai_suggestion, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [sessionId, questionNumber, question || '', answer, aiSuggestion || '']
    );

    // On-the-fly assessment (score + advice)
    const assessment = await assessAnswer(question || `Question ${questionNumber}`, answer, persona);

    // Persist assessment snapshot for later review
    await query(
      `UPDATE mock_interview_answers 
         SET feedback = COALESCE(feedback, $1)
       WHERE session_id = $2 AND question_number = $3`,
      [
        `SCORE: ${assessment.score}/100 (pass ${assessment.passThreshold})\nSUMMARY: ${assessment.summary}\nADVICE: ${assessment.advice}\nRAW: ${assessment.raw || ''}`,
        sessionId,
        questionNumber
      ]
    );

    res.json({ success: true, message: 'Answer recorded', assessment });
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// Complete interview session and generate feedback
mockInterviewRouter.post('/complete/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    // Get all answers for this session
    const answersRes = await query(
      `SELECT mia.*, mim.persona, mim.role 
       FROM mock_interview_answers mia
       JOIN mock_interview_sessions mim ON mia.session_id = mim.id
       WHERE mia.session_id = $1
       ORDER BY mia.question_number`,
      [sessionId]
    );
    const answers = answersRes.rows || [];

    // Generate feedback for each answer
    const feedbackResults = [];
    for (const answer of answers) {
      const feedback = await evaluateUserAnswer(
        `Question ${answer.question_number}`, 
        answer.user_answer || '', 
        answer.ai_suggestion || '', 
        answer.persona
      );
      
      // Update the answer with feedback
      await query(
        `UPDATE mock_interview_answers SET feedback = $1 WHERE id = $2`,
        [feedback, answer.id]
      );
      
      feedbackResults.push({
        questionNumber: answer.question_number,
        userAnswer: answer.user_answer,
        aiSuggestion: answer.ai_suggestion,
        feedback: feedback
      });
    }

    // Calculate average score from feedback
    let totalScore = 0;
    let scoreCount = 0;
    for (const fb of feedbackResults) {
      const scoreMatch = fb.feedback?.match(/SCORE:\s*(\d+)\/100/);
      if (scoreMatch) {
        totalScore += parseInt(scoreMatch[1]);
        scoreCount++;
      }
    }
    const avgScore = scoreCount > 0 ? (totalScore / scoreCount).toFixed(2) : 'N/A';

    // Update session status
    await query(
      `UPDATE mock_interview_sessions SET status = 'completed', completed_at = NOW() WHERE id = $1`,
      [sessionId]
    );

    res.json({ 
      success: true, 
      message: 'Interview completed! Review your feedback below.',
      feedback: feedbackResults,
      overallScore: avgScore
    });
  } catch (error) {
    console.error('Error completing interview:', error);
    res.status(500).json({ error: 'Failed to complete interview' });
  }
});

// Get feedback for a completed interview
mockInterviewRouter.get('/feedback/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const answersRes = await query(
      `SELECT mia.*, mim.persona, mim.role 
       FROM mock_interview_answers mia
       JOIN mock_interview_sessions mim ON mia.session_id = mim.id
       WHERE mia.session_id = $1
       ORDER BY mia.question_number`,
      [sessionId]
    );
    const answers = answersRes.rows || [];

    // Calculate average score
    let totalScore = 0;
    let scoreCount = 0;
    for (const answer of answers) {
      const scoreMatch = answer.feedback?.match(/SCORE:\s*(\d+)\/100/);
      if (scoreMatch) {
        totalScore += parseInt(scoreMatch[1]);
        scoreCount++;
      }
    }
    const avgScore = scoreCount > 0 ? (totalScore / scoreCount).toFixed(2) : 'N/A';

    res.json({ 
      feedback: answers,
      overallScore: avgScore
    });
  } catch (error) {
    console.error('Error getting feedback:', error);
    res.status(500).json({ error: 'Failed to get feedback' });
  }
});

// Get interview history
mockInterviewRouter.get('/history', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const historyRes = await query(
      `SELECT id, persona, role, experience_level, status, created_at, completed_at
       FROM mock_interview_sessions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [userId]
    );

    res.json({ sessions: historyRes.rows || [] });
  } catch (error) {
    console.error('Error getting interview history:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// Get available personas
mockInterviewRouter.get('/personas', authenticate, async (req, res) => {
  res.json({ personas: INTERVIEW_PERSONAS });
});

// Demo mode: Get personas without authentication
mockInterviewRouter.get('/demo/personas', (req, res) => {
  res.json({ personas: INTERVIEW_PERSONAS });
});

// Demo mode: Start a demo interview without authentication
mockInterviewRouter.post('/demo/session', async (req, res) => {
  try {
    const { persona = 'professional' } = req.body;
    const personaConfig = INTERVIEW_PERSONAS[persona] || INTERVIEW_PERSONAS.professional;
    
    // Generate a unique demo session ID
    const demoSessionId = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    res.json({
      sessionId: demoSessionId,
      persona: personaConfig,
      status: 'demo_in_progress',
      questionNumber: 1,
      greeting: personaConfig.greeting,
      isDemo: true
    });
  } catch (error) {
    console.error('Error starting demo interview:', error);
    res.status(500).json({ error: 'Failed to start demo interview' });
  }
});

// Demo mode: Get a question without authentication
mockInterviewRouter.get('/demo/question', async (req, res) => {
  try {
    const { persona = 'professional', questionNumber = 1 } = req.query;
    const num = clampQuestionNumber(questionNumber);
    const question = await generateInterviewQuestion(null, persona, num, { name: 'Demo User' });

    res.json({
      question,
      questionNumber: num,
      totalQuestions: TOTAL_QUESTIONS,
      isDemo: true
    });
  } catch (error) {
    console.error('Error getting demo question:', error);
    res.status(500).json({ error: 'Failed to get question' });
  }
});

// Demo mode: Get AI answer suggestion without authentication
mockInterviewRouter.post('/demo/suggest-answer', async (req, res) => {
  try {
    const { question, persona = 'professional' } = req.body;
    const suggestion = await generateAnswerSuggestion(question, persona, { name: 'Demo User' });

    res.json({ suggestion, isDemo: true });
  } catch (error) {
    console.error('Error generating demo suggestion:', error);
    res.status(500).json({ error: 'Failed to generate suggestion' });
  }
});

// Demo mode: Assess answer without authentication
mockInterviewRouter.post('/demo/assess-answer', async (req, res) => {
  try {
    const { question, answer, persona = 'professional' } = req.body;
    const assessment = await assessAnswer(question || 'Interview Question', answer || '', persona);

    res.json({ 
      ...assessment, 
      isDemo: true,
      message: 'Sign up to save your progress and access detailed feedback!'
    });
  } catch (error) {
    console.error('Error assessing demo answer:', error);
    res.status(500).json({ error: 'Failed to assess answer' });
  }
});

// Demo mode: Complete demo interview
mockInterviewRouter.post('/demo/complete', async (req, res) => {
  try {
    const { answers = [], persona = 'professional' } = req.body;
    
    // Generate feedback for each answer
    const feedbackResults = [];
    for (let i = 0; i < answers.length; i++) {
      const { question, answer } = answers[i];
      const assessment = await assessAnswer(question, answer, persona);
      feedbackResults.push({
        questionNumber: i + 1,
        question,
        userAnswer: answer,
        feedback: `Score: ${assessment.score}/100\n\n${assessment.summary}\n\nAdvice: ${assessment.advice}`,
        score: assessment.score
      });
    }

    // Calculate average score
    const scores = feedbackResults.filter(f => f.score > 0).map(f => f.score);
    const avgScore = scores.length > 0 
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : 'N/A';

    res.json({
      success: true,
      message: 'Demo interview completed! Sign up to save your progress.',
      feedback: feedbackResults,
      overallScore: avgScore,
      isDemo: true
    });
  } catch (error) {
    console.error('Error completing demo interview:', error);
    res.status(500).json({ error: 'Failed to complete demo interview' });
  }
});

module.exports = mockInterviewRouter;
