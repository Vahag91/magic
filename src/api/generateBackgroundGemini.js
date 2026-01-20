import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY, GEMINI_IMAGE_MODEL } from '../config/gemini';

function isDev() {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

function requireGeminiClient() {
  const apiKey = String(GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('Missing Gemini API key. Set `GEMINI_API_KEY` in `src/config/gemini.js` (do not commit it).');
  }
  return new GoogleGenAI({ apiKey });
}

function normalizeBase64(base64) {
  return String(base64 || '').replace(/\s+/g, '');
}

function buildPrompt({ prompt, width, height }) {
  const trimmed = String(prompt || '').trim();
  const w = Math.round(Number(width) || 0);
  const h = Math.round(Number(height) || 0);

  const sizeHint = w && h ? `Target size: ${w}x${h}px.` : 'Use a 4:5 portrait aspect ratio.';
  return [
    'Generate a high-quality background image only.',
    'Do not include people, faces, text, logos, or watermarks.',
    'Keep the scene coherent and realistic unless the prompt requests a stylized look.',
    sizeHint,
    `Prompt: ${trimmed}`,
  ].join(' ');
}

export async function generateBackgroundWithGemini({
  prompt,
  width,
  height,
  debug: _debug = isDev(),
}) {
  const trimmed = String(prompt || '').trim();
  if (!trimmed) throw new Error('Missing prompt for background generation.');

  const ai = requireGeminiClient();
  const model = String(GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image');
  const fullPrompt = buildPrompt({ prompt: trimmed, width, height });

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [{ text: fullPrompt }],
      },
    ],
  });

  const parts = response?.candidates?.[0]?.content?.parts || [];

  for (const part of parts) {
    const data = part?.inlineData?.data;
    if (!data) continue;
    const outMime = part?.inlineData?.mimeType || 'image/png';
    const base64 = normalizeBase64(data);
    if (!base64) continue;
    return `data:${outMime};base64,${base64}`;
  }

  throw new Error('Gemini did not return an image. Try a more specific prompt.');
}
