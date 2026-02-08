const express = require('express');
const smartAI = require('../services/smartAI');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Predict next questions
router.post('/predict', authenticate, async (req, res, next) => {
  try {
    const { sessionId, currentQuestion } = req.body;

    if (!sessionId || !currentQuestion) {
      return res.status(400).json({ error: 'Session ID and current question required' });
    }

    const predictions = await smartAI.predictNextQuestions(sessionId, currentQuestion);

    res.json({
      predictions,
      count: predictions.length
    });
  } catch (error) {
    next(error);
  }
});

// Get personalized answer
router.post('/personalized-answer', authenticate, async (req, res, next) => {
  try {
    const { question, sessionId, context } = req.body;
    const userId = req.user.id;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const result = await smartAI.generatePersonalizedAnswer(
      question,
      userId,
      { ...context, sessionId }
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Analyze answer quality
router.post('/analyze-answer', authenticate, async (req, res, next) => {
  try {
    const { question, answer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer required' });
    }

    const analysis = await smartAI.analyzeAnswerQuality(question, answer);

    res.json(analysis);
  } catch (error) {
    next(error);
  }
});

// Categorize question
router.post('/categorize', authenticate, async (req, res, next) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const [category, topics, sentiment] = await Promise.all([
      smartAI.categorizeQuestion(question),
      smartAI.extractKeyTopics(question),
      smartAI.analyzeQuestionSentiment(question)
    ]);

    res.json({
      category,
      topics,
      sentiment
    });
  } catch (error) {
    next(error);
  }
});

// Generate practice questions
router.post('/practice', authenticate, async (req, res, next) => {
  try {
    const { sessionId, count = 5 } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const questions = await smartAI.generatePracticeQuestions(sessionId, count);

    res.json({
      questions,
      count: questions.length
    });
  } catch (error) {
    next(error);
  }
});

// Get learning insights
router.get('/insights', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const insights = await smartAI.learnFromHistory(userId, null);

    res.json({
      insights: insights || {
        message: 'Not enough data yet. Complete more sessions to get insights.'
      }
    });
  } catch (error) {
    next(error);
  }
});

// Smart cache recommendation
router.post('/cache-decision', authenticate, async (req, res, next) => {
  try {
    const { question, sessionContext } = req.body;
    const userId = req.user.id;

    const useCache = await smartAI.shouldUseCache(question, userId, sessionContext);

    res.json({
      useCache,
      recommendation: useCache ? 'Use cached answer for speed' : 'Generate fresh answer for quality'
    });
  } catch (error) {
    next(error);
  }
});

// Get perfect answer based on interviewer question + CV + Job Description + Person Spec + AI Instructions
router.post('/get-perfect-answer', authenticate, async (req, res, next) => {
  try {
    const { interviewerQuestion, position, company, cv, jobDescription, personSpecification, aiInstructions } = req.body;
    const userId = req.user.id;

    if (!interviewerQuestion) {
      return res.status(400).json({ error: 'Interviewer question is required' });
    }

    // Set response headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Generate perfect answer with streaming
    await smartAI.generatePerfectAnswer(
      interviewerQuestion,
      userId,
      {
        position,
        company,
        cv,
        jobDescription,
        personSpecification,
        aiInstructions
      },
      (chunk) => {
        res.write(chunk);
      }
    );

    res.end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
