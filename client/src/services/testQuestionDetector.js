/**
 * Test script for intelligent question detector
 * Run with: node testQuestionDetector.js
 */

import { detectQuestion, ConversationTracker, processContinuousSpeech } from './intelligentQuestionDetector.js';

// Test cases for question detection
const testCases = [
  // Clear questions
  { text: "What is your greatest strength?", expected: true, description: "Question word at start" },
  { text: "Can you tell me about a time you faced a challenge?", expected: true, description: "Can you question" },
  { text: "How would you handle a difficult team member?", expected: true, description: "How question" },
  { text: "Describe your experience with project management?", expected: true, description: "Describe question with ?" },
  
  // Side talk / statements (should be false)
  { text: "I think that's a good point", expected: false, description: "Statement with 'I think'" },
  { text: "Actually, from my experience, that approach works well", expected: false, description: "Statement with filler" },
  { text: "You know, the thing is we need to consider all options", expected: false, description: "Casual talk with filler" },
  { text: "Let me tell you about my previous role", expected: false, description: "Statement starter" },
  
  // Interview context but not questions
  { text: "I have five years of experience in software development", expected: false, description: "Experience statement" },
  { text: "My greatest achievement was leading a team of ten", expected: false, description: "Achievement statement" },
  
  // Borderline cases
  { text: "Tell me about yourself", expected: true, description: "Command-like but interview question" },
  { text: "Walk me through your resume", expected: true, description: "Interview instruction" },
  { text: "Um, so, like, what do you do?", expected: true, description: "Question with fillers" },
  
  // Too short
  { text: "Hi", expected: false, description: "Too short" },
  { text: "Yes", expected: false, description: "Single word" },
];

console.log("🧪 Testing Intelligent Question Detector\n");
console.log("=".repeat(80));

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = detectQuestion(testCase.text);
  const passedTest = result.isQuestion === testCase.expected;
  
  if (passedTest) {
    passed++;
    console.log(`✅ Test ${index + 1}: ${testCase.description}`);
  } else {
    failed++;
    console.log(`❌ Test ${index + 1}: ${testCase.description}`);
    console.log(`   Input: "${testCase.text}"`);
    console.log(`   Expected: ${testCase.expected ? 'QUESTION' : 'NOT QUESTION'}`);
    console.log(`   Got: ${result.isQuestion ? 'QUESTION' : 'NOT QUESTION'} (${result.confidence}% confidence)`);
    console.log(`   Reason: ${result.reason}`);
  }
  
  if (result.confidence > 0) {
    console.log(`   Confidence: ${result.confidence}%`);
    if (result.analysis.patterns.length > 0) {
      console.log(`   Patterns: ${result.analysis.patterns.join(', ')}`);
    }
  }
  console.log();
});

console.log("=".repeat(80));
console.log(`📊 Results: ${passed} passed, ${failed} failed`);

// Test conversation tracker
console.log("\n🧪 Testing Conversation Tracker\n");
console.log("=".repeat(80));

const tracker = new ConversationTracker();

const conversation = [
  { text: "What is your experience with React?", isQuestion: true },
  { text: "I have 3 years of experience building applications with React", isQuestion: false },
  { text: "Can you describe a challenging project?", isQuestion: true },
  { text: "Actually, let me think about that for a moment", isQuestion: false },
];

conversation.forEach((utterance, i) => {
  const context = tracker.getContext();
  const detection = detectQuestion(utterance.text, context);
  
  console.log(`Turn ${i + 1}: "${utterance.text.substring(0, 40)}..."`);
  console.log(`   Expected: ${utterance.isQuestion ? 'QUESTION' : 'NOT QUESTION'}`);
  console.log(`   Detected: ${detection.isQuestion ? 'QUESTION' : 'NOT QUESTION'} (${detection.confidence}%)`);
  console.log(`   Context aware: ${context.lastWasQuestion ? 'Last was question' : 'Last was not question'}`);
  
  tracker.addUtterance(utterance.text, detection.isQuestion);
  console.log();
});

console.log("=".repeat(80));
console.log("🎯 Conversation Statistics:");
console.log(`   Total questions detected: ${tracker.questionCount}`);
console.log(`   Average question length: ${tracker.averageQuestionLength.toFixed(1)} words`);

// Test processContinuousSpeech
console.log("\n🧪 Testing Process Continuous Speech\n");
console.log("=".repeat(80));

const testTexts = [
  "What are your salary expectations?",
  "I'm looking for a competitive package",
  "How do you handle stress?",
  "Well, you know, I try to stay organized"
];

testTexts.forEach((text, i) => {
  const result = processContinuousSpeech(text, tracker);
  console.log(`Input ${i + 1}: "${text}"`);
  console.log(`   Should respond: ${result.shouldRespond ? 'YES' : 'NO'}`);
  console.log(`   Suggested action: ${result.suggestedAction}`);
  console.log(`   Confidence: ${result.confidence}%`);
  console.log(`   Reason: ${result.reason}`);
  console.log();
});

console.log("=".repeat(80));
console.log("✅ Test completed!");