/**
 * Intelligent Question Detector for IAALearn Android APK
 * 
 * This module provides sophisticated question detection to distinguish
 * interview questions from side talk, casual conversation, and background noise.
 */

/**
 * Enhanced question detection with multiple heuristics
 * @param {string} text - The transcribed text to analyze
 * @param {Object} context - Conversation context (optional)
 * @returns {Object} - Detection result with confidence score and analysis
 */
export const detectQuestion = (text, context = {}) => {
  if (!text || text.trim().length < 3) {
    return {
      isQuestion: false,
      confidence: 0,
      reason: 'Text too short',
      analysis: {}
    };
  }

  const trimmed = text.trim();
  const lowerText = trimmed.toLowerCase();
  
  // Initialize analysis object
  const analysis = {
    hasQuestionMark: false,
    questionWordScore: 0,
    sentenceStructureScore: 0,
    lengthScore: 0,
    contextScore: 0,
    keywordScore: 0,
    patterns: []
  };

  let totalScore = 0;
  const maxScore = 100;

  // 1. Check for question mark (strong indicator)
  if (trimmed.endsWith('?')) {
    analysis.hasQuestionMark = true;
    totalScore += 30;
    analysis.patterns.push('question_mark');
  }

  // 2. Check for question words at beginning (strong indicator)
  const questionWords = [
    'what', 'how', 'why', 'when', 'where', 'who', 'which', 'whom', 'whose',
    'can you', 'could you', 'would you', 'will you', 'do you', 'did you',
    'have you', 'has he', 'has she', 'has it', 'are you', 'is this', 'is that',
    'tell me', 'explain', 'describe', 'give me', 'show me', 'walk me through',
    'what if', 'how about', 'what about', 'could you tell me', 'would you mind',
    'please explain', 'please describe'
  ];

  for (const word of questionWords) {
    if (lowerText.startsWith(word)) {
      analysis.questionWordScore = 25;
      totalScore += 25;
      analysis.patterns.push(`question_word:${word}`);
      break;
    }
  }

  // 3. Check for question patterns in sentence structure
  // Questions often have inverted word order or auxiliary verbs at beginning
  const questionPatterns = [
    /\b(do|does|did|is|are|was|were|have|has|had|can|could|will|would|shall|should|may|might|must)\s+\w+\s+\?/i,
    /\b(what|how|why|when|where|who|which)\s+\w+\s+\?/i,
    /\b(tell|explain|describe|give|show)\s+me\s+/i,
    /\b(can|could|would|will)\s+you\s+/i,
    /\b(what|how)\s+do\s+you\s+/i,
    /\b(what|how)\s+would\s+you\s+/i,
    /\b(what|how)\s+did\s+you\s+/i
  ];

  for (const pattern of questionPatterns) {
    if (pattern.test(trimmed)) {
      analysis.sentenceStructureScore = 20;
      totalScore += 20;
      analysis.patterns.push('sentence_structure');
      break;
    }
  }

  // 4. Length-based scoring (questions are typically complete sentences)
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount >= 4 && wordCount <= 25) {
    analysis.lengthScore = 15;
    totalScore += 15;
    analysis.patterns.push('appropriate_length');
  } else if (wordCount > 25) {
    // Very long text might be a monologue, not a question
    analysis.lengthScore = 5;
    totalScore += 5;
  }

  // 5. Context awareness (if context is provided)
  if (context.lastWasQuestion) {
    // If last utterance was a question, this might be an answer or follow-up
    analysis.contextScore = -10;
    totalScore -= 10;
    analysis.patterns.push('follow_up_context');
  }

  if (context.conversationHistory && context.conversationHistory.length > 0) {
    // Check if this seems like a continuation of previous speech
    const lastText = context.conversationHistory[context.conversationHistory.length - 1].toLowerCase();
    if (lastText.endsWith('and') || lastText.endsWith('but') || lastText.endsWith('so')) {
      analysis.contextScore = -15;
      totalScore -= 15;
      analysis.patterns.push('continuation');
    }
  }

  // 6. Keyword analysis for interview context
  const interviewKeywords = [
    'experience', 'project', 'team', 'challenge', 'problem', 'solution',
    'role', 'responsibility', 'skill', 'strength', 'weakness', 'goal',
    'achievement', 'success', 'failure', 'learn', 'improve', 'collaborate',
    'lead', 'manage', 'technical', 'soft skill', 'communication', 'time management'
  ];

  const statementIndicators = [
    'i think', 'i believe', 'in my opinion', 'from my experience',
    'the thing is', 'actually', 'basically', 'you know', 'i mean',
    'let me tell you', 'as i said', 'to be honest'
  ];

  let keywordMatches = 0;
  for (const keyword of interviewKeywords) {
    if (lowerText.includes(keyword)) {
      keywordMatches++;
    }
  }

  if (keywordMatches > 0) {
    analysis.keywordScore = Math.min(keywordMatches * 5, 20);
    totalScore += analysis.keywordScore;
    analysis.patterns.push(`interview_keywords:${keywordMatches}`);
  }

  // Check for statement indicators (negative scoring)
  for (const indicator of statementIndicators) {
    if (lowerText.includes(indicator)) {
      analysis.keywordScore -= 10;
      totalScore -= 10;
      analysis.patterns.push(`statement_indicator:${indicator}`);
      break;
    }
  }

  // 7. Check for filler words and casual talk
  const fillerWords = ['um', 'uh', 'like', 'you know', 'i mean', 'so', 'well', 'actually'];
  let fillerCount = 0;
  for (const filler of fillerWords) {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) fillerCount += matches.length;
  }

  if (fillerCount > 2) {
    totalScore -= fillerCount * 3;
    analysis.patterns.push(`filler_words:${fillerCount}`);
  }

  // 8. Check for command vs question
  const commandPatterns = [
    /^\s*(please\s+)?(do|make|create|build|write|send|submit|finish|complete)\s+/i,
    /^\s*(i need|i want|i would like)\s+/i,
    /^\s*(let's|let us)\s+/i
  ];

  for (const pattern of commandPatterns) {
    if (pattern.test(trimmed)) {
      totalScore -= 20;
      analysis.patterns.push('command_pattern');
      break;
    }
  }

  // Calculate confidence percentage
  const confidence = Math.max(0, Math.min(100, totalScore));
  
  // Determine if it's a question based on confidence threshold
  const isQuestion = confidence >= 40; // Lowered threshold for better sensitivity
  
  return {
    isQuestion,
    confidence,
    reason: getReason(analysis, confidence, isQuestion),
    analysis: {
      ...analysis,
      totalScore,
      wordCount,
      fillerCount
    }
  };
};

/**
 * Get human-readable reason for the detection result
 */
const getReason = (analysis, confidence, isQuestion) => {
  if (confidence < 20) return 'Unclear speech or incomplete thought';
  if (analysis.hasQuestionMark) return 'Contains question mark';
  if (analysis.questionWordScore > 0) return 'Starts with question word';
  if (analysis.sentenceStructureScore > 0) return 'Question sentence structure';
  if (analysis.keywordScore > 10) return 'Contains interview-related keywords';
  if (analysis.lengthScore > 0) return 'Appropriate length for a question';
  
  return isQuestion ? 'Multiple weak indicators combined' : 'Does not match question patterns';
};

/**
 * Track conversation context for better question detection
 */
export class ConversationTracker {
  constructor() {
    this.history = [];
    this.lastQuestionTime = null;
    this.questionCount = 0;
    this.averageQuestionLength = 0;
  }

  addUtterance(text, isQuestion) {
    const utterance = {
      text,
      isQuestion,
      timestamp: Date.now(),
      length: text.length,
      wordCount: text.split(/\s+/).length
    };

    this.history.push(utterance);
    
    if (isQuestion) {
      this.lastQuestionTime = Date.now();
      this.questionCount++;
      
      // Update average question length
      const totalLength = this.history
        .filter(u => u.isQuestion)
        .reduce((sum, u) => sum + u.wordCount, 0);
      this.averageQuestionLength = totalLength / this.questionCount;
    }

    // Keep only last 10 utterances for memory efficiency
    if (this.history.length > 10) {
      this.history.shift();
    }
  }

  getContext() {
    const lastUtterance = this.history[this.history.length - 1];
    return {
      lastWasQuestion: lastUtterance ? lastUtterance.isQuestion : false,
      conversationHistory: this.history.map(u => u.text),
      timeSinceLastQuestion: this.lastQuestionTime ? Date.now() - this.lastQuestionTime : null,
      averageQuestionLength: this.averageQuestionLength,
      questionCount: this.questionCount
    };
  }

  reset() {
    this.history = [];
    this.lastQuestionTime = null;
    this.questionCount = 0;
    this.averageQuestionLength = 0;
  }
}

/**
 * Simple question detection for backward compatibility
 */
export const isQuestion = (text) => {
  const result = detectQuestion(text);
  return result.isQuestion;
};

/**
 * Process continuous speech with intelligent filtering
 */
export const processContinuousSpeech = (text, tracker) => {
  const context = tracker ? tracker.getContext() : {};
  const detection = detectQuestion(text, context);
  
  if (tracker) {
    tracker.addUtterance(text, detection.isQuestion);
  }
  
  return {
    ...detection,
    shouldRespond: detection.isQuestion && detection.confidence >= 50,
    suggestedAction: detection.isQuestion ? 'generate_answer' : 'continue_listening'
  };
};

export default {
  detectQuestion,
  isQuestion,
  ConversationTracker,
  processContinuousSpeech
};