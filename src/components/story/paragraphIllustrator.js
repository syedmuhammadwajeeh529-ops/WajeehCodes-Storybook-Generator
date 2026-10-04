import { base44 } from '@/api/base44Client';

// Each "activity" paragraph in a chapter gets its own image whose prompt is
// built directly from that paragraph's described content — so the image
// faithfully mirrors what the paragraph describes.

const activitySchema = {
  type: 'object',
  properties: {
    paragraphs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          has_activity: { type: 'boolean' }
        },
        required: ['index', 'has_activity']
      }
    }
  },
  required: ['paragraphs']
};

// Split a chapter body into paragraphs the same way the reader renders them.
export function splitParagraphs(body) {
  return (body || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
}

// Ask the LLM which paragraphs depict "major activity" — a scene, meaningful
// action, a described character/place, a key moment. Pure dialogue, transitions,
// or connective tissue are skipped to keep image generation meaningful.
async function detectActivityParagraphs(book, chapterHeading, paragraphs) {
  if (!paragraphs.length) return [];
  const prompt = [
    `You decide which paragraphs of a story chapter should be illustrated.`,
    `Book: "${book.title}".`,
    book.genre && book.genre !== 'Auto' && book.genre !== 'Custom' ? `Genre: ${book.genre}.` : '',
    book.setting && book.setting.trim() && book.setting !== 'Auto' ? `Setting: ${book.setting.trim()}.` : '',
    `Chapter heading: ${chapterHeading || '(untitled)'}.`,
    `Here are the paragraphs, each labeled [P1], [P2], …:`,
    paragraphs.map((p, i) => `[P${i + 1}] ${p}`).join('\n\n'),
    `For EACH paragraph, decide has_activity: true if it contains MAJOR activity worth illustrating — a concrete scene, meaningful physical action, a described character or place, a dramatic moment, or a vivid image. Return false for pure short dialogue with no action, brief transitional sentences, or abstract reflection with nothing to depict. Err toward illustrating paragraphs with a clear visual scene.`,
    `Return an object with a "paragraphs" array, one entry per paragraph above, each { index, has_activity }.`
  ].filter(Boolean).join('\n');
  const res = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: activitySchema
  });
  const list = Array.isArray(res?.paragraphs) ? res.paragraphs : [];
  const map = {};
  list.forEach(p => { if (typeof p?.index === 'number' && typeof p?.has_activity === 'boolean') map[p.index] = p.has_activity; });
  return paragraphs.map((_, i) => !!map[i]);
}

// Build an image-model prompt for a single paragraph, grounded in its own text.
function paragraphImagePrompt(book, chapterHeading, paragraph) {
  const parts = [];
  parts.push(`A single story illustration for the following paragraph. The image must faithfully depict what this paragraph describes — the scene, who is present, what they are doing, and the objects and place described. Do not invent details that are not in the paragraph.`);
  parts.push(`Book: "${book.title}".`);
  if (book.genre && book.genre !== 'Auto' && book.genre !== 'Custom') parts.push(`Genre: ${book.genre}.`);
  if (book.setting && book.setting.trim() && book.setting !== 'Auto') parts.push(`Setting / world: ${book.setting.trim()}.`);
  const named = (book.characters || []).filter(c => c.name && c.name.trim()).slice(0, 4);
  if (named.length) parts.push(`Known characters (use these if they appear in the paragraph; keep appearance consistent): ${named.map(c => `${c.name.trim()}${c.traits?.trim() ? ` (${c.traits.trim()})` : ''}`).join(', ')}.`);
  parts.push(`Chapter: ${chapterHeading || ''}`);
  parts.push(`Paragraph to illustrate:\n${paragraph}`);
  parts.push(`Illustrate exactly this moment. Polished, painterly book-illustration style matching the story's atmosphere. No text, no lettering, no captions, no borders. Landscape orientation.`);
  return parts.join('\n');
}

// Generate one paragraph image. Throws on failure so callers can skip.
async function generateParagraphImage(book, chapterHeading, paragraph) {
  const res = await base44.integrations.Core.GenerateImage({ prompt: paragraphImagePrompt(book, chapterHeading, paragraph) });
  if (!res?.url) throw new Error('The paragraph image did not come back.');
  return res.url;
}

// Public: generate illustrations for a chapter's activity paragraphs.
// Returns an object { illustrations: { [paragraphIndex]: url } }.
// Best-effort: never throws; a failed single image is simply skipped.
export async function illustrateChapter(book, chapter) {
  const paragraphs = splitParagraphs(chapter?.body);
  if (!paragraphs.length) return { illustrations: {} };
  let flags;
  try {
    flags = await detectActivityParagraphs(book, chapter.heading, paragraphs);
  } catch {
    // If detection fails, conservatively illustrate every non-trivial paragraph.
    flags = paragraphs.map(p => p.split(/\s+/).length >= 25);
  }
  const illustrations = {};
  const idxs = paragraphs.map((_, i) => i).filter(i => flags[i]);
  for (const i of idxs) {
    try {
      const url = await generateParagraphImage(book, chapter.heading, paragraphs[i]);
      if (url) illustrations[i] = url;
    } catch { /* skip this paragraph; keep others */ }
  }
  return { illustrations };
}