import { base44 } from '@/api/base44Client';

// Cover generation utilities for Storykind books.
// A cover is produced after Chapter 1. It depicts the STORY'S THEME — the
// central meaning the whole book is fundamentally about — rendered through the
// character's most vulnerable, defining moment. The cover is only ever
// regenerated if the theme itself meaningfully shifts; ordinary plot events,
// reveals, or new characters never trigger a new cover.

const coverDecisionSchema = {
  type: 'object',
  properties: {
    regenerate: { type: 'boolean' },
    theme: { type: 'string' },
    reason: { type: 'string' }
  },
  required: ['regenerate']
};

// Extract the story's theme (its central meaning), then describe the cover image.
async function resolveCoverDirective(book) {
  const themePrompt = [
    `Identify the THEME of this story — the central idea or underlying meaning it is fundamentally about, stated in a few words (e.g. "loss and letting go", "the cost of ambition", "identity and belonging", "hope against despair"). Do not describe plot twists, events, or scenes. Give the single deepest theme that the whole book grapples with.`,
    `Book title: "${book.title}".`,
    `Core idea: ${book.idea || ''}`,
    (book.genre && book.genre !== 'Auto' && book.genre !== 'Custom') ? `Genre: ${book.genre}.` : '',
    `Story so far: ${book.summary && book.summary.trim() ? book.summary.trim() : '(not yet written)'}`,
    `Return an object with the "theme" as a short string.`
  ].filter(Boolean).join('\n');

  const themeRes = await base44.integrations.Core.InvokeLLM({
    prompt: themePrompt,
    response_json_schema: { type: 'object', properties: { theme: { type: 'string' } }, required: ['theme'] }
  });
  return (themeRes && themeRes.theme && themeRes.theme.trim()) ? themeRes.theme.trim() : (book.idea || '');
}

// Build the text prompt describing the book's cover for the image model. The
// subject is the story's THEME made visible through the character's most
// vulnerable situation — never a litany of current plot events.
function coverArtPrompt(book, theme) {
  const parts = [];
  parts.push(`Book cover art for a story titled "${book.title}".`);
  if (book.genre && book.genre !== 'Auto' && book.genre !== 'Custom') parts.push(`Genre: ${book.genre}.`);
  if (book.setting && book.setting.trim() && book.setting !== 'Auto') parts.push(`Setting / world: ${book.setting.trim()}.`);
  parts.push(`THEME of the story (this is what the cover must express above all): "${theme}".`);
  parts.push(`Core idea for context: ${book.idea || ''}`);
  // The story so far is context only — it must NOT change what the cover depicts.
  if (book.summary && book.summary.trim()) {
    parts.push(`Story so far (use ONLY as context to portray the theme authentically; do not depict an arbitrary event from it): ${book.summary.trim()}`);
  }
  const named = (book.characters || []).filter(c => c.name && c.name.trim()).slice(0, 3);
  if (named.length) parts.push(`Key characters who may appear: ${named.map(c => c.name.trim()).join(', ')}.`);
  parts.push(`Depict the theme through the character's most vulnerable, emotionally defining situation — the moment that lays bare what the story is truly about. Use it as the single evocative central image.`);
  parts.push('Design it as a single, polished book cover illustration — no text, no typography, no title letters, no author name, no borders. One central image that captures the atmosphere and the theme through its most vulnerable moment. Rich, painterly or illustrative style, balanced composition with room that a real cover would use for a title block. Portrait orientation.');
  return parts.join('\n');
}

// Ask the LLM whether the story's THEME has shifted enough to warrant a new
// cover. Only a genuine change in the central meaning triggers regeneration —
// new events, reveals, characters, or plot twists do NOT. Returns
// { regenerate: boolean, theme }.
async function shouldRegenerateCover(book) {
  const prompt = [
    `You decide whether a book cover needs to be regenerated after a new chapter.`,
    `The cover depicts the STORY'S THEME — its central meaning — not any particular event.`,
    `Book title: "${book.title}".`,
    `Core idea: ${book.idea || ''}.`,
    `Here is the updated rolling summary of the story so far:`,
    book.summary || '(no summary yet)',
    `Decide: has the underlying THEME of the story changed in a way that would make the cover's central image no longer represent what the book is truly about? Ordinary plot progress, new events, reveals, characters, or turning points do NOT count — the theme must itself have shifted (e.g. the story started as one about hope and is now fundamentally about grief, or began as adventure and is now about forgiveness). If the theme is the same, answer false. Only if the deepest meaning of the story has genuinely changed, answer true.`,
    `Return an object with a boolean "regenerate", the current one-line "theme", and a one-line "reason".`
  ].join('\n');
  const res = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: coverDecisionSchema
  });
  return { regenerate: !!(res && res.regenerate), theme: res?.theme || '', reason: res?.reason || '' };
}

// Generate a cover image for a resolved theme. Throws on failure.
async function generateCoverImage(book, theme) {
  const res = await base44.integrations.Core.GenerateImage({ prompt: coverArtPrompt(book, theme) });
  if (!res?.url) throw new Error('The cover image did not come back.');
  return res.url;
}

// Public API -----------------------------------------------------------------

// First cover, right after Chapter 1 is created. Always generates, depicting
// the story's theme through its most vulnerable moment.
export async function generateInitialCover(book) {
  const theme = await resolveCoverDirective(book);
  const url = await generateCoverImage(book, theme);
  await base44.entities.Book.update(book.id, { cover_url: url });
  return url;
}

// Decide + regenerate after a later chapter. Only regenerates when the
// story's THEME itself has meaningfully changed — never on plot events.
// Best-effort: never throws into the chapter flow; failures are swallowed
// and the old cover is kept.
export async function maybeRefreshCover(book) {
  try {
    const decision = await shouldRegenerateCover(book);
    if (!decision.regenerate) return null;
    const theme = decision.theme && decision.theme.trim()
      ? decision.theme.trim()
      : await resolveCoverDirective(book);
    const url = await generateCoverImage(book, theme);
    await base44.entities.Book.update(book.id, { cover_url: url });
    return url;
  } catch {
    return null;
  }
}