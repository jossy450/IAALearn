/**
 * Transcription Service
 * Primary:  Hugging Face Whisper (free, uses HF_API_KEY + HF_MODEL env vars)
 * Fallback: OpenAI Whisper-1 (uses OPENAI_API_KEY)
 *
 * HF models tried in order (fastest → most accurate):
 *   openai/whisper-tiny, openai/whisper-base, openai/whisper-small
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');

// ── Lazy OpenAI client ────────────────────────────────────────────────────────
let _openai = null;
function getOpenAI() {
  if (!_openai && process.env.OPENAI_API_KEY) {
    const OpenAI = require('openai');
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

// ── HF Whisper helpers ────────────────────────────────────────────────────────
const HF_API_KEY = () => process.env.HF_API_KEY || '';
const HF_MODELS  = () =>
  (process.env.HF_MODEL || 'openai/whisper-tiny,openai/whisper-base,openai/whisper-small')
    .split(',')
    .map(m => m.trim())
    .filter(Boolean);

/**
 * Try one HF Whisper model.
 * Returns transcribed text or throws.
 */
async function tryHFModel(model, audioBuffer) {
  const apiKey = HF_API_KEY();
  if (!apiKey) throw new Error('HF_API_KEY not set');

  const url = `https://api-inference.huggingface.co/models/${model}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000); // 30 s per model

  try {
    const response = await fetch(url, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${apiKey}`,
        'Content-Type': 'application/octet-stream',
      },
      body:   audioBuffer,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      // 503 = model loading — caller should retry next model
      throw new Error(`HF ${model} HTTP ${response.status}: ${errText.slice(0, 120)}`);
    }

    const data = await response.json();

    // HF returns { text: "..." } or [{ generated_text: "..." }]
    const text =
      data?.text ||
      (Array.isArray(data) && data[0]?.generated_text) ||
      '';

    if (!text || !text.trim()) throw new Error(`HF ${model} returned empty text`);
    return text.trim();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Transcribe using HF Whisper — tries each model in order.
 */
async function transcribeWithHF(audioBuffer) {
  const models = HF_MODELS();
  let lastErr;
  for (const model of models) {
    try {
      console.log(`[Transcription] Trying HF model: ${model}`);
      const text = await tryHFModel(model, audioBuffer);
      console.log(`[Transcription] HF ${model} succeeded`);
      return text;
    } catch (err) {
      console.warn(`[Transcription] HF ${model} failed: ${err.message}`);
      lastErr = err;
    }
  }
  throw lastErr || new Error('All HF Whisper models failed');
}

/**
 * Transcribe using OpenAI Whisper-1 (fallback).
 */
async function transcribeWithOpenAI(audioBuffer, format) {
  const client = getOpenAI();
  if (!client) throw new Error('OPENAI_API_KEY not configured');

  const tempDir  = os.tmpdir();
  const tempFile = path.join(tempDir, `audio-${Date.now()}.${format}`);
  fs.writeFileSync(tempFile, audioBuffer);

  try {
    const { default: FormData } = await import('form-data').catch(() => ({ default: require('form-data') }));
    const audioStream = fs.createReadStream(tempFile);
    const result = await client.audio.transcriptions.create({
      file:            audioStream,
      model:           'whisper-1',
      language:        'en',
      response_format: 'json',
    });
    return (result.text || '').trim();
  } finally {
    try { fs.unlinkSync(tempFile); } catch (_) {}
  }
}

// ── Main TranscriptionService ─────────────────────────────────────────────────
class TranscriptionService {
  /**
   * Transcribe an audio buffer.
   * @param {Buffer} audioBuffer
   * @param {string} format  e.g. 'webm', 'mp4', 'm4a', 'wav', 'ogg'
   */
  async transcribeAudio(audioBuffer, format = 'webm') {
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Audio buffer is empty');
    }
    if (audioBuffer.length < 500) {
      throw new Error('Audio too short — please record at least 1 second');
    }

    const startTime = Date.now();
    let text = '';
    let provider = '';

    // 1️⃣ Try HF Whisper first (free)
    if (HF_API_KEY()) {
      try {
        text     = await transcribeWithHF(audioBuffer);
        provider = 'huggingface';
      } catch (hfErr) {
        console.warn('[Transcription] HF failed, falling back to OpenAI:', hfErr.message);
      }
    }

    // 2️⃣ Fallback to OpenAI Whisper
    if (!text && getOpenAI()) {
      try {
        text     = await transcribeWithOpenAI(audioBuffer, format);
        provider = 'openai';
      } catch (oaiErr) {
        console.error('[Transcription] OpenAI fallback also failed:', oaiErr.message);
        throw new Error(`Transcription failed: ${oaiErr.message}`);
      }
    }

    if (!text) {
      throw new Error('No transcription provider available. Set HF_API_KEY or OPENAI_API_KEY.');
    }

    const duration = Date.now() - startTime;
    console.log(`[Transcription] Done via ${provider} in ${duration}ms: "${text.slice(0, 80)}…"`);

    return {
      success:   true,
      text,
      provider,
      duration,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = new TranscriptionService();
