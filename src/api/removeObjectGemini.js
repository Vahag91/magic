import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY, GEMINI_IMAGE_MODEL } from '../config/gemini';

const DEFAULT_INPAINT_PROMPT =
  "I have provided an image where I have marked unwanted objects with solid RED paint. Please remove the red markings and the objects beneath them. Heal/inpaint the background seamlessly using textures from the surrounding areas. The final result should look natural, high-resolution, and contain absolutely no red markings or artifacts from the removal.";

function isDev() {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

function logIf(debug, ...args) {
  if (!debug) return;
  console.log('[Gemini]', ...args);
}

function requireGeminiClient() {
  const apiKey = String(GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('Missing Gemini API key. Set `GEMINI_API_KEY` in `src/config/gemini.js` (do not commit it).');
  }
  return new GoogleGenAI({ apiKey });
}

function stripDataUriPrefix(dataOrDataUri) {
  const s = String(dataOrDataUri || '');
  const idx = s.indexOf('base64,');
  if (idx === -1) return s;
  return s.slice(idx + 'base64,'.length);
}

function parseInlineData({ dataOrDataUri, fallbackMimeType }) {
  const s = String(dataOrDataUri || '').trim();
  const match = s.match(/^data:([^;]+);base64,([\s\S]*)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  return { mimeType: fallbackMimeType, data: stripDataUriPrefix(s) };
}

function normalizeBase64(base64) {
  // Defensive: some pipelines insert whitespace/newlines in long base64 strings.
  return String(base64 || '').replace(/\s+/g, '');
}

export async function removeObjectWithGeminiInpainting({
  markedImageBase64,
  mimeType = 'image/png',
  prompt = DEFAULT_INPAINT_PROMPT,
  debug = isDev(),
}) {
  const ai = requireGeminiClient();
  const model = String(GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image');
  const parsed = parseInlineData({ dataOrDataUri: markedImageBase64, fallbackMimeType: mimeType });
  const base64 = normalizeBase64(parsed.data);
  const usedMimeType = parsed.mimeType || mimeType;

  if (!base64) {
    throw new Error('Missing input image data for Gemini.');
  }
  logIf(debug, 'request', {
    model,
    mimeType: usedMimeType,
    promptChars: String(prompt || '').length,
    base64Chars: String(base64 || '').length,
  });

  const startedAt = Date.now();
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { data: base64, mimeType: usedMimeType } },
        ],
      },
    ],
  });

  const parts = response?.candidates?.[0]?.content?.parts || [];
  logIf(debug, 'response:meta', {
    ms: Date.now() - startedAt,
    candidates: response?.candidates?.length || 0,
    firstParts: parts.length,
  });

  for (const part of parts) {
    const data = part?.inlineData?.data;
    if (data) {
      const outMime = part?.inlineData?.mimeType || 'image/png';
      logIf(debug, 'response:image', { outMime, base64Chars: String(data || '').length });
      return `data:${outMime};base64,${data}`;
    }
  }

  throw new Error('Gemini did not return an image. Try painting a larger solid area over the object.');
}
