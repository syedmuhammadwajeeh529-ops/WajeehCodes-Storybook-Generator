import { useState, useCallback, useRef } from 'react';
import { CHAPTER_RANGES } from './story/storyOptions';
import { generateInitialCover, maybeRefreshCover } from './story/coverGenerator';
import { illustrateChapter } from './story/paragraphIllustrator';

// Word-count helpers -----------------------------------------------------------

const countWords = (text) =>
  (text || '').trim()
    ? (text.trim().match(/\S+/g) || []).length
    : 0;

function resolveRange(mode, wordMin, wordMax) {
  if (mode === 'Custom') {
    const min = Number(wordMin) || 0;
    const max = Number(wordMax) > min ? Number(wordMax) : null;
    return [min, max];
  }

  const preset = CHAPTER_RANGES[mode] || CHAPTER_RANGES.Short;
  return [preset[0], preset[1]];
}

// API helpers -----------------------------------------------------------------

async function callGemini(prompt, schema) {
  const response = await fetch('http://localhost:3001/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, schema })
  });

  if (!response.ok) {
    let message = `AI backend request failed with status ${response.status}`;

    try {
      const errorBody = await response.json();
      if (errorBody?.error) message = errorBody.error;
    } catch {}

    throw new Error(message);
  }

  return response.json();
}

async function createBookApi(book) {
  const response = await fetch('http://localhost:3001/api/books', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(book)
  });

  if (!response.ok) {
    let message = 'Failed to create book.';

    try {
      const errorBody = await response.json();
      if (errorBody?.error) message = errorBody.error;
    } catch {}

    throw new Error(message);
  }

  return response.json();
}

async function listBooksApi(limit = 50) {
  const response = await fetch(
    `http://localhost:3001/api/books/query?limit=${encodeURIComponent(limit)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit })
    }
  );

  if (!response.ok) {
    let message = 'Failed to load stories.';

    try {
      const errorBody = await response.json();
      if (errorBody?.error) message = errorBody.error;
    } catch {}

    throw new Error(message);
  }

  return response.json();
}

async function getBookApi(id) {
  const response = await fetch(
    `http://localhost:3001/api/books/${encodeURIComponent(id)}/get`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    }
  );

  if (!response.ok) {
    let message = 'Failed to load the story.';

    try {
      const errorBody = await response.json();
      if (errorBody?.error) message = errorBody.error;
    } catch {}

    throw new Error(message);
  }

  return response.json();
}

async function updateBookApi(id, updates) {
  const response = await fetch(
    `http://localhost:3001/api/books/${encodeURIComponent(id)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    }
  );

  if (!response.ok) {
    let message = 'Failed to update the story.';

    try {
      const errorBody = await response.json();
      if (errorBody?.error) message = errorBody.error;
    } catch {}

    throw new Error(message);
  }

  return response.json();
}

async function deleteBookApi(id) {
  const response = await fetch(
    `http://localhost:3001/api/books/${encodeURIComponent(id)}/delete`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    }
  );

  if (!response.ok) {
    let message = 'Failed to delete the story.';

    try {
      const errorBody = await response.json();
      if (errorBody?.error) message = errorBody.error;
    } catch {}

    throw new Error(message);
  }

  return response.json();
}

// Chapter persistence helpers -------------------------------------------------

// Only chapters explicitly marked as saved are sent to the database.
// chapter_number preserves a chapter's original position if other chapters
// have not been saved.
function savedChaptersOnly(chapters = []) {
  return chapters
    .filter((chapter) => chapter.saved === true)
    .map((chapter, index) => ({
      ...chapter,
      chapter_number:
        Number(chapter.chapter_number) || index + 1
    }))
    .sort((a, b) => a.chapter_number - b.chapter_number);
}

function normalizeLoadedChapters(chapters = []) {
  return [...chapters]
    .sort(
      (a, b) =>
        (Number(a.chapter_number) || 0) -
        (Number(b.chapter_number) || 0)
    )
    .map((chapter, index) => ({
      ...chapter,
      chapter_number:
        Number(chapter.chapter_number) || index + 1,
      saved: true
    }));
}

function getNextChapterNumber(chapters = []) {
  return chapters.reduce(
    (highest, chapter, index) =>
      Math.max(
        highest,
        Number(chapter.chapter_number) || index + 1
      ),
    0
  ) + 1;
}

// Prompt schemas ---------------------------------------------------------------

const DEFAULT_CONFIG = {
  perspective: 'Auto',
  audience: 'Auto',
  format: 'Auto',
  language: 'Auto'
};

const DEFAULT_CHAPTER = {
  genre: 'Auto',
  lengthMode: 'Short',
  wordMin: '',
  wordMax: ''
};

const mapLegacyLength = (s) => {
  if (!s) return 'Medium';
  if (s.includes('5,000')) return 'Long';
  if (s.includes('1,500')) return 'Short';
  return 'Medium';
};

const chapterSchema = {
  type: 'object',
  properties: {
    heading: { type: 'string' },
    body: { type: 'string' },
    title: { type: 'string' }
  },
  required: ['heading', 'body']
};

const nextChapterSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    chapter: {
      type: 'object',
      properties: {
        heading: { type: 'string' },
        body: { type: 'string' }
      },
      required: ['heading', 'body']
    }
  },
  required: ['title', 'chapter']
};

const continueChapterSchema = {
  type: 'object',
  properties: {
    chapter: {
      type: 'object',
      properties: {
        heading: { type: 'string' },
        body: { type: 'string' }
      },
      required: ['heading', 'body']
    }
  },
  required: ['chapter']
};

const questionsSchema = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      maxItems: 3,
      items: { type: 'string' }
    }
  },
  required: ['questions']
};

const suggestionChoiceSchema = {
  type: 'object',
  properties: {
    suggestion: { type: 'string' }
  },
  required: ['suggestion']
};

// Prompt builders -------------------------------------------------------------

function buildCharacterText(characters = []) {
  const filled = characters.filter((c) => c.name && c.name.trim());

  if (!filled.length) return '';

  return (
    'Characters (use these consistently, with the given personality, role, traits, relationships and description):\n' +
    filled
      .map(
        (c) =>
          `- ${c.name.trim()}${
            c.role?.trim() ? ` — ${c.role.trim()}` : ''
          }${
            c.personality?.trim()
              ? `; personality: ${c.personality.trim()}`
              : ''
          }${
            c.traits?.trim() ? `; traits: ${c.traits.trim()}` : ''
          }${
            c.relationships?.trim()
              ? `; relationships: ${c.relationships.trim()}`
              : ''
          }${
            c.description?.trim()
              ? `; extra: ${c.description.trim()}`
              : ''
          }`
      )
      .join('\n')
  );
}

function perspectiveDirective(option) {
  switch (option) {
    case 'First person':
      return 'Narrative perspective: First person — narrate from inside a single viewpoint character using "I"; show only what that character sees, thinks and learns. Maintain this voice and its opinionated, limited view throughout the story.';

    case 'Second person':
      return 'Narrative perspective: Second person — address the protagonist as "you", placing the reader inside the story. Keep this "you" voice throughout.';

    case 'Third person limited':
      return 'Narrative perspective: Third person limited — narrate with "he/she/they" but stay tightly inside one viewpoint character per scene, revealing only what that character perceives, knows and feels.';

    case 'Third person omniscient':
      return 'Narrative perspective: Third person omniscient — narrate with "he/she/they" from an all-knowing vantage, freely showing any character\'s thoughts, feelings and unseen events.';

    default:
      return '';
  }
}

function audienceDirective(option) {
  switch (option) {
    case 'Children':
      return 'Audience: Children — write for young readers: short sentences, simple vocabulary, concrete imagery, mild stakes, a warm and kind tone, and no dark, violent or mature content. Explain unfamiliar ideas plainly. This adjusts style only; keep the plot and facts intact.';

    case 'Young adult':
      return 'Audience: Young adult — write for teen readers: engaging, approachable language with moments of depth; themes of identity, growth, friendship and firsts; emotional but not graphic. Keep it fast-moving and relatable.';

    case 'Adult':
      return 'Audience: Adult — write for adult readers: richer and more sophisticated prose, mature themes handled seriously, morally nuanced characters, and no requirement to soften complexity.';

    case 'All ages':
      return 'Audience: All ages — write to engage readers of every age: clear but vivid prose, broad appeal, uplifting values, and nothing that excludes children or feels too young for adults.';

    default:
      return '';
  }
}

function formatDirective(option) {
  switch (option) {
    case 'Auto':
      return 'Story format: Auto — choose the most suitable narrative structure for the story idea. Decide whether it works best as a continuous novel, connected serialized installments, a collection of complete short stories, or self-contained episodes. Follow the chosen structure consistently throughout the book.';

    case 'Novel':
      return 'Story format: Novel — write one continuous, connected narrative across chapters. Develop the main plot, characters, relationships, and conflicts over time. Chapters should advance the larger story, and major story arcs should be resolved at appropriate points rather than prematurely.';

    case 'Serialized chapters':
      return 'Story format: Serialized chapters — write connected installments in an ongoing narrative. Each installment should deliver meaningful progress and a satisfying development, while leaving an appropriate unresolved question, discovery, or hook to encourage the next installment. Maintain continuity across installments.';

    case 'Short story collection':
      return 'Story format: Short story collection — each new entry must be a distinct, complete short story with its own central situation, development, and satisfying resolution. Stories may share a setting, themes, or characters, but each must have its own plot and ending. Do not merely continue the previous entry as another chapter of the same plot.';

    case 'Episodic':
      return 'Story format: Episodic — write self-contained episodes featuring a recurring cast, setting, or premise. Each episode should have its own central event, beginning, development, and resolution. Ongoing character development and longer storylines may continue between episodes, but the main event of each episode should reach a satisfying conclusion.';

    default:
      return '';
  }
}

function languageDirective(option) {
  return `Output language: ${option} — write the entire chapter, including narration, dialogue, chapter heading and descriptions, in ${option}. Do not switch to another language at any point.`;
}

function storyLevelText(book) {
  const parts = [];

  if (book.perspective && book.perspective !== 'Auto') {
    const d = perspectiveDirective(book.perspective);
    if (d) parts.push(d);
  }

  if (book.audience && book.audience !== 'Auto') {
    const d = audienceDirective(book.audience);
    if (d) parts.push(d);
  }

  if (book.format) {
    const d = formatDirective(book.format);
    if (d) parts.push(d);
  }

  if (book.language && book.language !== 'Auto') {
    parts.push(languageDirective(book.language));
  }

  if (parts.length) {
    parts.push(
      'These are stylistic and structural guidelines; always obey the story idea, characters, world, prior chapters, established facts and the rolling summary — they take precedence for plot and facts.'
    );
  }

  return parts.join('\n');
}

function persistentContextStyleFree(book) {
  const parts = [];

  parts.push(`Original story idea (do not lose sight of this): ${book.idea}`);

  if (
    book.genre &&
    book.genre !== 'Auto' &&
    book.genre !== 'Custom'
  ) {
    parts.push(`Overall story genre: ${book.genre}.`);
  }

  if (book.setting && book.setting.trim() && book.setting !== 'Auto') {
    parts.push(`Setting / World: ${book.setting.trim()}.`);
  }

  const charText = buildCharacterText(book.characters || []);
  if (charText) parts.push(charText);

  return parts.join('\n\n');
}

function persistentContext(book) {
  const parts = [];

  parts.push(`Original story idea (do not lose sight of this): ${book.idea}`);

  const sl = storyLevelText(book);
  if (sl) parts.push(sl);

  if (
    book.genre &&
    book.genre !== 'Auto' &&
    book.genre !== 'Custom'
  ) {
    parts.push(`Overall story genre: ${book.genre}.`);
  }

  if (book.setting && book.setting.trim() && book.setting !== 'Auto') {
    parts.push(`Setting / World: ${book.setting.trim()}.`);
  }

  const charText = buildCharacterText(book.characters || []);
  if (charText) parts.push(charText);

  return parts.join('\n\n');
}

function languageOverrideNote(book) {
  if (
    book.language &&
    book.language !== 'Auto' &&
    (book.chapters || []).length > 0
  ) {
    return `Note: write this chapter entirely in ${book.language}, regardless of the language used in the recent chapters above.`;
  }

  return '';
}

function recentChaptersBlock(book, maxChars) {
  const chapters = book.chapters || [];
  const newest = chapters[chapters.length - 1];

  if (!newest) return '';

  const block = [
    `[Latest chapter — ${newest.heading}]\n${newest.body || ''}`
  ];

  let used = newest.body?.length || 0;

  for (let i = chapters.length - 2; i >= 0; i--) {
    const c = chapters[i];
    const added = (c.heading?.length || 0) + (c.body?.length || 0);

    if (used + added > maxChars) break;

    block.unshift(`[Earlier chapter — ${c.heading}]\n${c.body || ''}`);
    used += added;
  }

  return `Recent chapter text (use this for tone, style and immediate continuity):\n${block.join('\n\n')}`;
}

function chapterGenreText(book, index) {
  const ch = (book.chapters || [])[index];

  if (
    ch &&
    ch.genre &&
    ch.genre !== 'Auto' &&
    ch.genre !== 'Custom'
  ) {
    return ch.genre;
  }

  return '';
}

function sharedContext(book) {
  const parts = [];
  const nextNumber = getNextChapterNumber(book.chapters || []);

  parts.push(`Write Chapter ${nextNumber} of the story "${book.title}".`);
  parts.push(persistentContext(book));

  if (book.summary && book.summary.trim()) {
    parts.push(
      `Rolling summary of the story so far (this is binding continuity — do not contradict it):\n${book.summary}`
    );
  }

  const recent = recentChaptersBlock(book, 3500);
  if (recent) parts.push(recent);

  const directions = (book.directions || []).filter(
    (d) =>
      d.chapter_index !== undefined &&
      d.chapter_index >= (book.chapters?.length || 0) - 1
  );

  if (directions.length) {
    parts.push(
      `Recent directions the author requested (honor these and current continuity):\n${directions
        .map((d) => `- ${d.text}`)
        .join('\n')}`
    );
  }

  return parts.join('\n\n');
}

function genPrompt(book, currentInstruction, chapterSettings) {
  const parts = [];
  const nextNumber = getNextChapterNumber(book.chapters || []);
  const format = book.format || 'Auto';

  const continuationInstruction =
    format === 'Short story collection'
      ? 'Write a new, distinct short story for this entry. Give it its own beginning, development, and satisfying ending. It may reuse the established world or characters, but do not simply continue the previous story’s central plot.'
      : format === 'Episodic'
        ? 'Write a self-contained episode with its own central event and satisfying resolution. Maintain continuity with established characters and longer storylines where appropriate, but resolve the main event of this episode.'
        : format === 'Novel'
          ? 'Continue the same connected narrative, advancing the larger plot and developing characters and conflicts naturally across chapters.'
          : format === 'Serialized chapters'
            ? 'Continue the ongoing serialized narrative. Make meaningful progress in this installment and end with an appropriate hook or unresolved question that encourages the next installment.'
            : 'Choose the narrative structure best suited to the story idea and keep it consistent. Maintain continuity where appropriate and give each entry an ending that suits the chosen structure.';

  const entryLabel =
    format === 'Short story collection'
      ? 'short story'
      : format === 'Episodic'
        ? 'episode'
        : 'chapter';

  const lengthLabel =
    format === 'Short story collection'
      ? 'this short story ONLY'
      : format === 'Episodic'
        ? 'this episode ONLY'
        : 'this chapter ONLY';

  parts.push(
    format === 'Short story collection'
      ? `Write Short Story ${nextNumber} in the collection "${book.title}".`
      : format === 'Episodic'
        ? `Write Episode ${nextNumber} of "${book.title}".`
        : `Write Chapter ${nextNumber} of the story "${book.title}".`
  );

  parts.push(persistentContext(book));

  if (book.summary && book.summary.trim()) {
    parts.push(
      `Rolling summary of the story so far (use it to preserve relevant continuity, but allow a new short story to have its own plot):\n${book.summary}`
    );
  }

  const recent = recentChaptersBlock(book, 3500);
  if (recent) {
    parts.push(
      format === 'Short story collection'
        ? `Recent entries for reference. Preserve shared-world details when useful, but create a distinct plot for the new story:\n${recent}`
        : `Recent entries for continuity:\n${recent}`
    );
  }

  const langNote = languageOverrideNote(book);
  if (langNote) parts.push(langNote);

  if ((book.directions || []).length) {
    parts.push(
      `Previous directions the author requested (honor these and current continuity):\n${book.directions
        .map((d) => `- ${d.text}`)
        .join('\n')}`
    );
  }

  const genre =
    chapterSettings?.genre &&
    chapterSettings.genre !== 'Auto' &&
    chapterSettings.genre !== 'Custom'
      ? `Genre for this ${entryLabel}: ${chapterSettings.genre}.`
      : `Genre for this ${entryLabel}: choose one that fits the story idea and the direction of the narrative.`;

  parts.push(genre);

  const [min, max] = resolveRange(
    chapterSettings?.lengthMode,
    chapterSettings?.wordMin,
    chapterSettings?.wordMax
  );

  if (max) {
    parts.push(
      `Length for ${lengthLabel}: aim for approximately ${min.toLocaleString()} to ${max.toLocaleString()} words. Develop the narrative fully to reach the target length without unnecessary padding.`
    );
  } else if (min) {
    parts.push(
      `Length for ${lengthLabel}: aim for at least approximately ${min.toLocaleString()} words.`
    );
  } else {
    parts.push(
      `Length for ${lengthLabel}: write a reasonably full, developed narrative.`
    );
  }

  if (currentInstruction && currentInstruction.trim()) {
    parts.push(
      `The author's own direction for this ${entryLabel} (combine it with the original settings above; do not discard them):\n${currentInstruction.trim()}`
    );
  }

  parts.push(continuationInstruction);

  const outputInstruction =
    book.chapters?.length
      ? `Write ONE ${entryLabel} only. Return an object with a "chapter" that has a short, evocative "heading" and the full narrative "body". Separate paragraphs within the body with two newline characters. Also return the story's overall "title" unchanged unless it genuinely no longer fits.`
      : `Create a concise, memorable overall title inspired by the story idea. Do not simply copy or rephrase the story idea. The overall title must be distinct from the entry heading. Write ONE ${entryLabel} only. Return an object with a "title" and a "chapter" that has a short, evocative "heading" and the full narrative "body". Separate paragraphs within the body with two newline characters.`;

  parts.push(outputInstruction);

  return parts.join('\n\n');
}

function continuePrompt(book, currentBody, pendingInstruction, chapterSettings) {
  const parts = [];
  const format = book.format || 'Auto';

  const entryLabel =
    format === 'Short story collection'
      ? 'short story'
      : format === 'Episodic'
        ? 'episode'
        : 'chapter';

  const continuationGoal =
    format === 'Short story collection'
      ? 'Continue the current short story, developing its existing events and characters. Bring this story to a satisfying conclusion when its central conflict is resolved. Do not turn it into a continuation of a previous story.'
      : format === 'Episodic'
        ? 'Continue the current episode, developing its central event and moving toward a satisfying resolution. Preserve continuity with the established cast and world.'
        : format === 'Serialized chapters'
          ? 'Continue this installment naturally, developing its events and moving toward a satisfying installment ending or hook when appropriate.'
          : format === 'Novel'
            ? 'Continue the current chapter of the ongoing novel, maintaining continuity and advancing the larger narrative naturally.'
            : 'Continue the current narrative in a way that fits its established structure, maintaining continuity and giving the entry an appropriate ending.';

  parts.push(
    `Continue the CURRENT ${entryLabel} of "${book.title}" exactly where it left off. This is the SAME entry. Do not restart it or repeat the existing text.`
  );

  parts.push(
    `Here is the ${entryLabel} so far (extend it from this point, maintaining tone, style and continuity):\n${currentBody || ''}`
  );

  parts.push(
    `Narrative goals and established context:\n${persistentContext(book)}\n${
      chapterGenreText(book, (book.chapters?.length || 0) - 1)
        ? `Genre: ${chapterGenreText(book, (book.chapters?.length || 0) - 1)}.`
        : ''
    }`
  );

  parts.push(continuationGoal);

  const langNote = languageOverrideNote(book);
  if (langNote) parts.push(langNote);

  const [min, max] = resolveRange(
    chapterSettings?.lengthMode,
    chapterSettings?.wordMin,
    chapterSettings?.wordMax
  );

  if (max) {
    parts.push(
      `The ${entryLabel} needs to reach roughly ${min.toLocaleString()} to ${max.toLocaleString()} words TOTAL. Continue the narrative rather than summarizing it, developing events naturally toward the target length. Do not add unnecessary filler or delay a resolution that has already been earned.`
    );
  } else if (min) {
    parts.push(
      `The ${entryLabel} needs to reach roughly ${min.toLocaleString()} words TOTAL. Continue the narrative rather than summarizing it, developing events naturally toward the target length without unnecessary filler.`
    );
  }

  if (pendingInstruction && pendingInstruction.trim()) {
    parts.push(
      `Additional author direction for this continuation:\n${pendingInstruction.trim()}`
    );
  }

  parts.push(
    'Your response must be a DIRECT CONTINUATION of the existing text, not a meta-instruction. Return an object with a "chapter" whose "heading" is empty or repeats the existing heading, and whose "body" contains ONLY the new prose to append, not the entire entry. Separate paragraphs with two newline characters.'
  );

  return parts.join('\n\n');
}

function summaryUpdatePrompt(book, changedChapters) {
  const parts = [];

  parts.push(
    `Maintain a compact rolling summary of the story "${book.title}". This summary is used as continuity context so the AI never forgets earlier events.`
  );

  if (book.summary && book.summary.trim()) {
    parts.push(
      `Previous summary (update it — incorporate the changes below, drop anything no longer true):\n${book.summary}`
    );
  }

  parts.push(`The latest/provided story content to fold in:\n${changedChapters || ''}`);

  parts.push(
    'Preserve important facts: major events, character identities, character relationships and development, important locations, world rules, discoveries, conflicts, important objects, decisions, unresolved plot threads, promises or plans set up for later. Keep it compact but information-dense — a few tight paragraphs. Do not include the full chapter text; this is a summary only.'
  );

  parts.push('Return the summary as a plain string.');
  return parts.join('\n\n');
}

function questionsPrompt(book) {
  const parts = [];

  parts.push(`You are helping the author continue the story "${book.title}".`);
  parts.push(persistentContextStyleFree(book));

  if (book.summary && book.summary.trim()) {
    parts.push(`Rolling summary of the story so far:\n${book.summary}`);
  }

  const last = (book.chapters || []).slice(-1)[0];

  if (last) {
    parts.push(
      `The story just ended with chapter "${last.heading}":\n${(last.body || '').slice(0, 1200)}`
    );
  }

  parts.push(
    'Propose 2-3 short, relevant, contextual questions or prompts the author might answer to guide the NEXT chapter. They must grow from the actual story, its characters, setting and unresolved threads — not generic or random. Phrase them as suggestions in the author\'s voice, e.g. "Have them discover what\'s inside the vault", "Introduce a rival who knows about the hidden city", "Jump forward a season and show the consequences". Each should be concise.'
  );

  return parts.join('\n\n');
}

function chooseSuggestionPrompt(book, options) {
  const parts = [
    `Choose the strongest next-chapter direction for the story "${book.title}".`,
    persistentContextStyleFree(book)
  ];

  if (book.summary && book.summary.trim()) {
    parts.push(`Rolling story summary:\n${book.summary}`);
  }

  const recent = recentChaptersBlock(book, 1800);
  if (recent) parts.push(`Recent story events:\n${recent}`);

  parts.push(
    'Select exactly one supplied suggestion. Choose the option that best develops the story while respecting its established characters, world, continuity, and unresolved threads. Do not invent a new option. Return the exact text of the selected suggestion.'
  );
  parts.push(`Available suggestions:\n${options.map((option, index) => `${index + 1}. ${option}`).join('\n')}`);

  return parts.join('\n\n');
}

// Main hook -------------------------------------------------------------------

export default function useStorybook() {
  const [book, setBook] = useState(null);
  const [started, setStarted] = useState(false);
  const [view, setView] = useState('start');
  const [bookshelf, setBookshelf] = useState([]);
  const [idea, setIdea] = useState('');
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [characters, setCharacters] = useState([]);
  const [setting, setSetting] = useState('');
  const [chapterSettings, setChapterSettings] = useState(DEFAULT_CHAPTER);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [coverStatus, setCoverStatus] = useState('idle');
  const [illustratingChapters, setIllustratingChapters] = useState({});

  const bookRef = useRef(null);
  bookRef.current = book;

  const generatingRef = useRef(false);
  const statusRef = useRef(status);
  statusRef.current = status;

  // Persist only explicitly saved chapters.
  const updateBook = async (id, updates) => {
    const safeUpdates = { ...updates };


    if (Array.isArray(safeUpdates.chapters)) {
      safeUpdates.chapters = savedChaptersOnly(safeUpdates.chapters);
      safeUpdates.chapter_count = safeUpdates.chapters.length;
    }

    return updateBookApi(id, safeUpdates);
  };

  // Update a chapter's illustrations in the working copy. If the chapter has
  // already been explicitly saved, its updated illustrations can be persisted.
  const illustrateChapterAt = async (bookState, chapterIndex) => {
    const chapter = bookState?.chapters?.[chapterIndex];

    if (!chapter || !chapter.body?.trim()) return;

    setIllustratingChapters((prev) => ({
      ...prev,
      [chapterIndex]: true
    }));

    try {
      const { illustrations } = await illustrateChapter(bookState, chapter);
      const current = bookRef.current;

      if (!current) return;

      const updated = (current.chapters || []).map((c, i) =>
        i === chapterIndex
          ? {
              ...c,
              illustrations: {
                ...(c.illustrations || {}),
                ...illustrations
              }
            }
          : c
      );

      const nextBook = { ...current, chapters: updated };
      setBook(nextBook);

      // Illustrations must not cause an unsaved chapter to be stored.
      if (updated[chapterIndex]?.saved === true) {
        try {
          await updateBook(current.id, { chapters: updated });
        } catch {
          /* illustration persistence is best-effort */
        }
      }
    } catch {
      /* illustration best-effort */
    } finally {
      setIllustratingChapters((prev) => {
        const next = { ...prev };
        delete next[chapterIndex];
        return next;
      });
    }
  };

  // Only show stories that have at least one explicitly saved chapter.
  // Empty metadata records remain in the database so active workspaces can
  // continue using their book IDs, but they do not appear on the bookshelf.
  const loadBookshelf = useCallback(async () => {
    try {
      const shelf = await listBooksApi(100);

      const savedBooks = shelf
        .map((b) => {
          const chapters = Array.isArray(b.chapters)
            ? b.chapters.filter((chapter) => chapter?.saved === true)
            : [];

          return {
            id: b.id,
            title: b.title,
            idea: b.idea || '',
            genre: b.genre,
            chapters: chapters.length,
            updated: b.updated_date || b.updated_at,
            cover_url: b.cover_url || null
          };
        })
        .filter((b) => b.chapters > 0);

      setBookshelf(savedBooks);
    } catch {
      /* bookshelf best-effort */
    }
  }, []);

  // Update the rolling summary in memory. Database persistence happens only
  // when the author explicitly saves a chapter.
  const updateSummary = async (chaptersText, { persist = false } = {}) => {
    const current = bookRef.current;
    if (!current?.id) return false;

    setStatus('summary');

    try {
      const result = await callGemini(
        summaryUpdatePrompt(current, chaptersText),
        {
          type: 'object',
          properties: { summary: { type: 'string' } },
          required: ['summary']
        }
      );

      const newSummary = (result && result.summary) || '';
      const latest = bookRef.current;

      if (!latest) return false;

      const next = { ...latest, summary: newSummary };
      setBook(next);

      if (persist) {
        try {
          await updateBook(current.id, { summary: newSummary });
        } catch {
          /* summary persistence is best-effort */
        }
      }

      return true;
    } catch {
      return false;
    } finally {
      setStatus('idle');
    }
  };

  const loadSuggestions = useCallback(async () => {
    setSuggestions([]);

    const current = bookRef.current;

    if (!current?.id || !(current.chapters || []).length) return;

    try {
      const res = await callGemini(questionsPrompt(current), questionsSchema);

      setSuggestions(
        Array.isArray(res?.questions) ? res.questions.slice(0, 3) : []
      );
    } catch {
      /* suggestions optional */
    }
  }, []);

  const startNewStory = useCallback(() => {
    setBook(null);
    setIdea('');
    setCharacters([]);
    setSetting('');
    setConfig(DEFAULT_CONFIG);
    setChapterSettings(DEFAULT_CHAPTER);
    setError('');
    setSuggestions([]);
    setView('workspace');
    setStarted(true);
  }, []);

  const goToStart = useCallback(() => {
    setBook(null);
    setView('start');
    setStarted(false);
    setIdea('');
    setCharacters([]);
    setSetting('');
    setConfig(DEFAULT_CONFIG);
    setChapterSettings(DEFAULT_CHAPTER);
    setError('');
    setSuggestions([]);
  }, []);

  const goToStories = useCallback(() => {
    setView('stories');
  }, []);

  // Generate Chapter 1, but do not persist its text.
  const generate = async () => {
    if (generatingRef.current) return;

    generatingRef.current = true;
    setStatus('story');
    setError('');
    setSuggestions([]);

    try {
      if (!idea.trim()) {
        throw new Error('Please enter a story idea first.');
      }

      const titleGuess = 'Untitled Story';

      const base = {
        idea: idea.trim(),
        perspective: config.perspective,
        audience: config.audience,
        format: config.format,
        language: config.language,
        characters,
        setting: setting.trim() || 'Auto',
        summary: '',
        directions: []
      };

      const res = await callGemini(
        genPrompt(
          { ...base, title: titleGuess, chapters: [] },
          '',
          chapterSettings
        ),
        nextChapterSchema
      );

      const ch = res?.chapter;

      if (!ch?.body?.trim()) {
        throw new Error(
          'The story did not come back in a readable format. Please try again.'
        );
      }

      const title = (res?.title && res.title.trim()) || titleGuess;

      const body = await ensureChapterLength(
        base,
        title,
        ch,
        [],
        chapterSettings
      );

      const newCh = {
        heading: (ch.heading || 'Chapter 1').trim(),
        body,
        mode: 'ai',
        genre: chapterSettings.genre,
        lengthMode: chapterSettings.lengthMode,
        wordMin: chapterSettings.wordMin,
        wordMax: chapterSettings.wordMax,
        wordCount: countWords(body),
        chapter_number: 1,
        saved: false
      };

      // Create the story metadata only. No chapter text is stored.
      const created = await createBookApi({
        ...base,
        title,
        genre: chapterSettings.genre,
        chapter_count: 0,
        cover_url: null,
        chapters: []
      });

      const nextBook = {
        id: created.id,
        title,
        ...base,
        genre: chapterSettings.genre,
        chapters: [newCh]
      };

      setBook(nextBook);
      setIdea('');
      setCharacters([]);
      setSetting('');
      setConfig(DEFAULT_CONFIG);
      setChapterSettings(DEFAULT_CHAPTER);

      await loadBookshelf();

      // Summary is working-copy context until a chapter is explicitly saved.
      await updateSummary(`[Chapter 1 — ${newCh.heading}]\n${newCh.body}`);

      await loadSuggestions();

      setCoverStatus('painting');

      try {
        const coverBook = {
          ...nextBook,
          characters,
          chapters: [newCh],
          summary: bookRef.current?.summary || newCh.body
        };

        const url = await generateInitialCover(coverBook);

        if (url) {
          setBook((prev) => (prev ? { ...prev, cover_url: url } : prev));
        }
      } catch {
        /* cover best-effort */
      } finally {
        setCoverStatus('idle');
      }

      await illustrateChapterAt(nextBook, 0);
    } catch (err) {
      setError(
        err?.message ||
          'The story could not be created. Please try again.'
      );
    } finally {
      setStatus('idle');
      generatingRef.current = false;
    }
  };

  const ensureChapterLength = async (
    base,
    title,
    ch,
    prevChapters,
    chapterSettings
  ) => {
    const [min] = resolveRange(
      chapterSettings?.lengthMode,
      chapterSettings?.wordMin,
      chapterSettings?.wordMax
    );

    if (!min) return ch.body;

    let body = ch.body || '';
    let guard = 0;

    while (countWords(body) < min && guard < 3) {
      const res = await callGemini(
        continuePrompt(
          { ...base, title, chapters: prevChapters },
          body,
          '',
          chapterSettings
        ),
        continueChapterSchema
      );

      const piece = res?.chapter?.body?.trim?.();
      if (!piece) break;

      body = (body.trimEnd() + '\n\n' + piece).trim();
      guard++;
    }

    return body;
  };

  const generateNextChapter = async (direction) => {
    if (generatingRef.current) {
      if (statusRef.current === 'idle') {
        generatingRef.current = false;
      } else {
        return;
      }
    }

    const current = bookRef.current;
    if (!current?.id) return;

    generatingRef.current = true;
    setStatus('next');
    setError('');
    setSuggestions([]);

    try {
      const res = await callGemini(
        genPrompt(current, direction, chapterSettings),
        nextChapterSchema
      );

      const ch = res?.chapter;

      if (!ch?.body?.trim()) {
        throw new Error(
          'The chapter did not come back in a readable format. Please try again.'
        );
      }

      const title = (res?.title && res.title.trim()) || current.title;
      const chapterNumber = getNextChapterNumber(current.chapters || []);

      const body = await ensureChapterLength(
        current,
        title,
        ch,
        current.chapters || [],
        chapterSettings
      );

      const newCh = {
        heading: (ch.heading || `Chapter ${chapterNumber}`).trim(),
        body,
        mode: 'ai',
        genre: chapterSettings.genre,
        lengthMode: chapterSettings.lengthMode,
        wordMin: chapterSettings.wordMin,
        wordMax: chapterSettings.wordMax,
        wordCount: countWords(body),
        chapter_number: chapterNumber,
        saved: false
      };

      const chapters = [...(current.chapters || []), newCh];

      const directions =
        direction && direction.trim()
          ? [
              ...(current.directions || []),
              {
                text: direction.trim(),
                chapter_index: chapters.length - 1,
                created_at: Date.now()
              }
            ]
          : current.directions || [];

      const next = { ...current, title, chapters, directions };
      setBook(next);

      // Do not send chapters to the database here.
      // Only the title and author directions are updated.
      await updateBook(current.id, { title, directions });

      await updateSummary(
        `[Chapter ${chapterNumber} — ${newCh.heading}]\n${newCh.body}`
      );

      setCoverStatus('painting');

      try {
        const coverBook = {
          ...bookRef.current,
          characters: current.characters
        };

        const url = await maybeRefreshCover(coverBook);

        if (url) {
          setBook((prev) => (prev ? { ...prev, cover_url: url } : prev));
        }
      } catch {
        /* cover best-effort */
      } finally {
        setCoverStatus('idle');
      }

      await illustrateChapterAt(next, chapters.length - 1);
      await loadSuggestions();
      await loadBookshelf();
    } catch (err) {
      setError(
        err?.message ||
          'That chapter could not be generated. Please try again.'
      );
    } finally {
      setStatus('idle');
      setChapterSettings(DEFAULT_CHAPTER);
      generatingRef.current = false;
    }
  };

  const regenerateChapter = async (index) => {
    const current = bookRef.current;
    if (!current?.id) return;

    setStatus(`regen:${index}`);
    setError('');

    try {
      const res = await callGemini(
        regeneratePrompt(current, index),
        chapterSchema
      );

      if (!res?.body?.trim()) {
        throw new Error(
          'The chapter did not come back in a readable format. Please try again.'
        );
      }

      const oldCh = current.chapters[index];
      const chapterNumber =
        Number(oldCh.chapter_number) || index + 1;

      const body = await ensureChapterLength(
        current,
        current.title,
        {
          heading: res.heading || oldCh.heading,
          body: res.body
        },
        current.chapters || [],
        {
          lengthMode: oldCh?.lengthMode,
          wordMin: oldCh?.wordMin,
          wordMax: oldCh?.wordMax
        }
      );

      const newCh = {
        ...oldCh,
        heading: (res.heading || oldCh.heading).trim(),
        body,
        wordCount: countWords(body),
        chapter_number: chapterNumber,
        saved: false,
        illustrations: {}
      };

      const chapters = current.chapters.map((c, i) =>
        i === index ? newCh : c
      );

      const next = { ...current, chapters };
      setBook(next);

      // Regeneration is a new unsaved draft, even if the previous version
      // had been saved. The author must click Save Chapter to persist it.
      await updateSummary(
        `[Chapter ${chapterNumber} — ${newCh.heading}]\n${newCh.body}`
      );

      await illustrateChapterAt(next, index);
      await loadBookshelf();
    } catch (err) {
      setError(
        err?.message ||
          'That chapter could not be regenerated. Please try again.'
      );
    } finally {
      setStatus('idle');
    }
  };

  // Build a format-aware prompt for rewriting only the selected entry.
  const regeneratePrompt = (book, index) => {
    const parts = [];
    const oldCh = book.chapters[index];

    const chapterNumber =
      Number(oldCh?.chapter_number) || index + 1;

    const format = book.format || 'Auto';

    const entryLabel =
      format === 'Short story collection'
        ? 'short story'
        : format === 'Episodic'
          ? 'episode'
          : 'chapter';

    const rewriteInstruction =
      format === 'Short story collection'
        ? `Rewrite ONLY Short Story ${chapterNumber} in the collection "${book.title}". Make this a complete, independent short story with its own central situation, development, and satisfying resolution. It may share characters or a world with other stories, but must have its own plot. Do not rewrite any other entry.`
        : format === 'Episodic'
          ? `Rewrite ONLY Episode ${chapterNumber} of "${book.title}". Give the episode a clear central event and a satisfying resolution while preserving continuity with the recurring cast and world. Do not rewrite any other episode.`
          : format === 'Serialized chapters'
            ? `Rewrite ONLY Chapter ${chapterNumber} of the serialized story "${book.title}". Preserve the ongoing plot and give the installment appropriate forward momentum and, where suitable, a hook for the next installment. Do not rewrite other chapters.`
            : format === 'Novel'
              ? `Rewrite ONLY Chapter ${chapterNumber} of the novel "${book.title}". Preserve the connected narrative, character development, and larger plot. Do not rewrite other chapters.`
              : `Rewrite ONLY ${entryLabel} ${chapterNumber} of "${book.title}". Preserve the established narrative structure and the entry's appropriate ending. Do not rewrite any other entries.`;

    parts.push(rewriteInstruction);
    parts.push(persistentContext(book));

    if (book.summary && book.summary.trim()) {
      parts.push(
        `Rolling summary of the story so far. Use it to preserve relevant continuity, while respecting the selected format:\n${book.summary}`
      );
    }

    const others = (book.chapters || [])
      .map((c, i) =>
        i === index
          ? ''
          : `[${format === 'Short story collection'
              ? 'Other short story'
              : format === 'Episodic'
                ? 'Other episode'
                : 'Other chapter'} ${Number(c.chapter_number) || i + 1} — ${c.heading}]\n${(
              c.body || ''
            ).slice(0, 900)}`
      )
      .filter(Boolean)
      .join('\n\n');

    if (others) {
      parts.push(
        format === 'Short story collection'
          ? `Other stories for reference. Preserve shared-world details when useful, but do not copy their central plots or merge them into the story being rewritten:\n${others}`
          : `Other entries for continuity. Do not rewrite or contradict them:\n${others}`
      );
    }

    if (
      oldCh?.genre &&
      oldCh.genre !== 'Auto' &&
      oldCh.genre !== 'Custom'
    ) {
      parts.push(`Preserve the genre for this ${entryLabel}: ${oldCh.genre}.`);
    }

    const [min, max] = resolveRange(
      oldCh?.lengthMode,
      oldCh?.wordMin,
      oldCh?.wordMax
    );

    if (max) {
      parts.push(
        `Aim for approximately ${min.toLocaleString()} to ${max.toLocaleString()} words for this rewritten ${entryLabel}. Develop it fully without unnecessary padding.`
      );
    } else if (min) {
      parts.push(
        `Aim for at least approximately ${min.toLocaleString()} words for this rewritten ${entryLabel}.`
      );
    }

    parts.push(
      `The rewritten ${entryLabel} must fit the selected format and remain consistent with the established characters, setting, tone, and relevant continuity.`
    );

    parts.push(
      'Return only this entry as an object with "heading" and "body". The heading should be short and evocative. Separate paragraphs within the body with two newline characters.'
    );

    return parts.join('\n\n');
  };

  // Explicit Save Chapter action. Only this function marks the edited chapter
  // as saved and sends the saved chapter collection to MySQL.
  const saveChapterEdit = async (index, ch) => {
    const current = bookRef.current;
    if (!current?.id) return;

    const existingChapter = current.chapters[index];
    if (!existingChapter) return;

    const chapterNumber =
      Number(existingChapter.chapter_number) || index + 1;

    const chapters = current.chapters.map((c, i) =>
      i === index
        ? {
            ...c,
            ...ch,
            chapter_number: chapterNumber,
            saved: true,
            wordCount: countWords(ch.body ?? c.body)
          }
        : c
    );

    const next = { ...current, chapters };
    setBook(next);
    setSaving(true);
    setError('');

    try {
      await updateBook(current.id, {
        chapters,
        chapter_count: savedChaptersOnly(chapters).length
      });

      // The chapter is explicitly saved, so now update and persist the
      // rolling summary based on saved chapters.
      const savedText = savedChaptersOnly(chapters)
        .map(
          (chapter) =>
            `[Chapter ${chapter.chapter_number} — ${chapter.heading}]\n${chapter.body || ''}`
        )
        .join('\n\n');

      await updateSummary(savedText, { persist: true });
      await loadBookshelf();
    } catch (err) {
      setError(err?.message || 'The chapter could not be saved.');

      // Keep the local draft, but revert its saved flag if persistence failed.
      setBook((previous) => {
        if (!previous) return previous;

        return {
          ...previous,
          chapters: previous.chapters.map((chapter, i) =>
            i === index
              ? { ...chapter, saved: false }
              : chapter
          )
        };
      });
    } finally {
      setSaving(false);
    }
  };

  // Adding a chapter creates a draft only. It is not stored in MySQL.
  const addChapterAfter = async (index, mode = 'ai') => {
    const current = bookRef.current;
    if (!current?.id) return;

    const isManual = mode === 'manual';
    const chapterNumber = index + 2;

    const newCh = {
      heading: isManual ? `Chapter ${chapterNumber}` : '',
      body: '',
      mode,
      manual: isManual,
      genre: 'Auto',
      lengthMode: 'Short',
      lengthLabel: '',
      chapter_number: chapterNumber,
      saved: false
    };

    const chapters = [...current.chapters];
    chapters.splice(index + 1, 0, newCh);

    // Keep stored chapter numbers aligned with the order shown in the reader.
    const orderedChapters = chapters.map((chapter, chapterIndex) => ({
      ...chapter,
      heading:
        chapter.manual && /^Chapter \d+$/i.test(chapter.heading || '')
          ? `Chapter ${chapterIndex + 1}`
          : chapter.heading,
      chapter_number: chapterIndex + 1
    }));

    setBook({ ...current, chapters: orderedChapters });
    return newCh;
  };

  // Deleting a chapter explicitly removes it from the working copy.
  // If it was saved, persist the deletion without saving any draft chapters.
  // The active workspace stays open even when the last saved chapter is removed.
  const deleteChapter = async (index) => {
    const current = bookRef.current;
    if (!current?.id) return;

    const removedChapter = current.chapters[index];
    if (!removedChapter) return;

    const savedCountBefore = savedChaptersOnly(
      current.chapters || []
    ).length;

    const isLastSavedChapter =
      removedChapter.saved === true && savedCountBefore === 1;

    // StoryReader already displays the first deletion confirmation.
    // These three additional confirmations apply only to the last saved chapter.
    if (isLastSavedChapter) {
      const stageTwo = window.confirm(
        'This is your last saved chapter. Deleting it will remove this story from Saved Stories. Continue?'
      );

      if (!stageTwo) return;

      const stageThree = window.confirm(
        'Your current writing workspace will remain open, but this story will no longer appear in Saved Stories until you save a chapter again. Do you understand?'
      );

      if (!stageThree) return;

      const stageFour = window.confirm(
        'FINAL CONFIRMATION: Delete the last saved chapter? This action cannot be undone.'
      );

      if (!stageFour) return;
    }

    const chapters = current.chapters
      .filter((_, i) => i !== index)
      .map((chapter, chapterIndex) => ({
        ...chapter,
        heading:
          chapter.manual && /^Chapter \d+$/i.test(chapter.heading || '')
            ? `Chapter ${chapterIndex + 1}`
            : chapter.heading,
        chapter_number: chapterIndex + 1
      }));
    const next = { ...current, chapters };

    setBook(next);
    setError('');

    try {
      await updateBook(current.id, {
        chapters,
        chapter_count: savedChaptersOnly(chapters).length
      });
    } catch (err) {
      // Restore the original workspace if the database update fails.
      setBook(current);
      setError(err?.message || 'The chapter could not be deleted.');
      return;
    }

    // Refresh the summary using only the remaining saved chapters.
    const savedText = savedChaptersOnly(chapters)
      .map(
        (chapter) =>
          `[Chapter ${chapter.chapter_number} — ${chapter.heading}]\n${chapter.body || ''}`
      )
      .join('\n\n');

    if (savedText.trim()) {
      await updateSummary(savedText, { persist: true });
    } else {
      setBook((previous) =>
        previous ? { ...previous, summary: '' } : previous
      );

      try {
        await updateBook(current.id, { summary: '' });
      } catch {
        /* summary persistence is best-effort */
      }
    }

    // The story remains active in the workspace, but disappears from the shelf
    // when it has no saved chapters.
    await loadBookshelf();
  };

  const deleteSavedBook = async (id) => {
    const confirmed = window.confirm(
      'Delete this story and all its chapters? This cannot be undone.'
    );

    if (!confirmed) return false;

    await deleteBookApi(id);

    setBookshelf((previous) =>
      previous.filter(
        (savedBook) => String(savedBook.id) !== String(id)
      )
    );

    if (String(bookRef.current?.id) === String(id)) {
      setBook(null);
      setStarted(false);
      setView('stories');
    }

    return true;
  };

  // Save Story saves metadata such as the title, not unsaved chapter drafts.
  // A story cannot be saved to My Stories unless it has at least one saved chapter.
  const saveStory = async (title) => {
    const current = bookRef.current;
    if (!current?.id) return;

    if (savedChaptersOnly(current.chapters || []).length === 0) {
      setError(
        'Save at least one chapter before saving this story to My Stories.'
      );
      return;
    }

    setSaving(true);
    setError('');

    try {
      const next = { ...current, title };
      setBook(next);

      await updateBook(current.id, { title });
      await loadBookshelf();
    } catch (err) {
      setError(err?.message || 'The story could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const openBook = async (id) => {
    setError('');
    setView('workspace');
    setStarted(true);

    let saved;

    try {
      saved = await getBookApi(id);
    } catch {
      saved = null;
    }

    if (!saved) {
      setError('That story could not be opened.');
      return;
    }

    const chapters = normalizeLoadedChapters(saved.chapters || []);

    setBook({
      id: saved.id,
      title: saved.title,
      idea: saved.idea || '',
      perspective: saved.perspective || 'Auto',
      audience: saved.audience || 'Auto',
      format: saved.format || 'Auto',
      language: saved.language || 'Auto',
      genre: saved.genre || 'Auto',
      characters: saved.characters || [],
      setting: saved.setting || 'Auto',
      chapters,
      directions: saved.directions || [],
      summary: saved.summary || '',
      story_length:
        saved.story_length || mapLegacyLength(saved.story_length),
      cover_url: saved.cover_url || null
    });

    setIdea('');
    setCharacters([]);
    setSetting('');

    setConfig({
      perspective: saved.perspective || 'Auto',
      audience: saved.audience || 'Auto',
      format: saved.format || 'Auto',
      language: saved.language || 'Auto'
    });

    setChapterSettings(DEFAULT_CHAPTER);
    setSuggestions([]);
  };

  const continueAutomatically = async () => {
    const current = bookRef.current;
    if (!current?.id) return;

    const options = suggestions
      .filter((suggestion) => typeof suggestion === 'string' && suggestion.trim())
      .slice(0, 3);

    if (!options.length) {
      return generateNextChapter('');
    }

    if (generatingRef.current) return;

    generatingRef.current = true;
    setStatus('choosing');
    setError('');

    try {
      const result = await callGemini(
        chooseSuggestionPrompt(current, options),
        suggestionChoiceSchema
      );

      const selected = options.find(
        (option) => option === result?.suggestion?.trim()
      ) || options[0];

      generatingRef.current = false;
      await generateNextChapter(selected);
    } catch (err) {
      generatingRef.current = false;
      setStatus('idle');
      setError(
        err?.message || 'The next chapter direction could not be selected. Please try again.'
      );
    }
  };

  return {
    book,
    started,
    view,
    startNewStory,
    goToStart,
    goToStories,
    bookshelf,
    loadBookshelf,
    idea,
    setIdea,
    config,
    setConfig,
    characters,
    setCharacters,
    setting,
    setSetting,
    chapterSettings,
    setChapterSettings,
    status,
    error,
    suggestions,
    saving,
    coverStatus,
    illustratingChapters,
    generate,
    generateNextChapter,
    continueAutomatically,
    regenerateChapter,
    saveChapterEdit,
    addChapterAfter,
    deleteChapter,
    deleteSavedBook,
    saveStory,
    openBook
  };
}