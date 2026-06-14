import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ExtractedTerm {
  word: string;
  definition: string;
  notes: string;
}

export interface ExtractionResult {
  terms: ExtractedTerm[];
  copyrightWarning: boolean;
}

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MODEL    = 'claude-haiku-4-5-20251001';

export async function getAPIKey(): Promise<string | null> {
  return AsyncStorage.getItem('claudeAPIKey');
}

export async function setAPIKey(key: string) {
  await AsyncStorage.setItem('claudeAPIKey', key);
}

export async function extractTermsFromImage(imageUri: string): Promise<ExtractionResult> {
  const apiKey = await getAPIKey();
  if (!apiKey) throw new Error('No API key set. Please add your Claude API key in Settings.');

  // Convert image to base64
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Detect media type from URI extension
  const ext = imageUri.split('.').pop()?.toLowerCase();
  const mediaType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  const prompt = `Analyze this image and extract all vocabulary terms, definitions, or word-translation pairs you can see.

RULES:
- Extract up to 70 terms
- Only extract what is visibly present — do not invent or embellish
- If the image is from a copyrighted published work, set "copyright_warning": true
- This data is for personal study only and will not be used to train any AI model

Respond ONLY with valid JSON — no markdown, no extra text:
{
  "terms": [
    { "word": "term", "definition": "definition or translation", "notes": "any extra context" }
  ],
  "copyright_warning": false
}`;

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  });

  if (response.status === 429) throw new Error('Rate limited. Please wait a moment and try again.');
  if (!response.ok) throw new Error(`API error: HTTP ${response.status}`);

  const json = await response.json();
  const text: string = json?.content?.[0]?.text ?? '';

  const cleaned = text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  let parsed: any;
  try { parsed = JSON.parse(cleaned); }
  catch { throw new Error('Could not parse terms from the image. Try a clearer photo.'); }

  const terms: ExtractedTerm[] = (parsed.terms ?? [])
    .filter((t: any) => t.word?.trim() && t.definition?.trim())
    .map((t: any) => ({
      word: String(t.word).trim(),
      definition: String(t.definition).trim(),
      notes: String(t.notes ?? '').trim(),
    }));

  return { terms, copyrightWarning: !!parsed.copyright_warning };
}
