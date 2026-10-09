import { useState, useCallback, useRef } from 'react';
import { CHAPTER_RANGES} from './story/storyOptions';
import { generateInitialCover, maybeRefreshCover } from './story/coverGenerator';
import { illustrateChapter } from './story/paragraphIllustrator';

// Word-count helpers -----------------------------------------------------------

const countWords = (text) =>
  (text || '').trim()
    ? (text.trim().match(/\S+/g) || []).length
    : 0;

// Resolve the [min, max] target range for a chapter given its length mode.
function resolveRange(mode, wordMin, wordMax) {
  if (mode === 'Custom') {
    const min = Number(wordMin) || 0;
    const max = Number(wordMax) > min ? Number(wordMax) : null;
    return [min, max];
  }

  const preset = CHAPTER_RANGES[mode] || CHAPTER_RANGES.Short;
  return [preset[0], preset[1]];
}

// Local Node API helpers -------------------------------------------------------

async function callGemini(prompt, schema) {
  const response = await fetch('http://localhost:3001/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prompt, schema })
  });

  if (!response.ok) {
    let message = `AI backend request failed with status ${response.status}`;

    try {
      const errorBody = await response.json();

      if (errorBody?.error) {
        message = errorBody.error;
      }
    } catch {}

    throw new Error(message);
  }

  return response.json();
}

async function createBookApi(book) {
  const response = await fetch('http://localhost:3001/api/books', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(book)
  });

  if (!response.ok) {
    let message = `Failed to create book.`;

    try {
      const errorBody = await response.json();

      if (errorBody?.error) {
        message = errorBody.error;
      }
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
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ limit })
    }
  );

  if (!response.ok) {
    let message = `Failed to load stories.`;

    try {
      const errorBody = await response.json();

      if (errorBody?.error) {
        message = errorBody.error;
      }
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
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    }
  );

  if (!response.ok) {
    let message = `Failed to load the story.`;

    try {
      const errorBody = await response.json();

      if (errorBody?.error) {
        message = errorBody.error;
      }
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
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }
  );

  if (!response.ok) {
    let message = `Failed to update the story.`;

    try {
      const errorBody = await response.json();

      if (errorBody?.error) {
        message = errorBody.error;
      }
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
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    }
  );

  if (!response.ok) {
    let message = 'Failed to delete the story.';

    try {
      const errorBody = await response.json();

      if (errorBody?.error) {
        message = errorBody.error;
      }
    } catch {}

    throw new Error(message);
  }

  return response.json();
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

// Prompt builders -------------------------------------------------------------

function buildCharacterText(characters) {
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
    case 'Novel':
      return 'Story format: Novel — write a connected chapter that advances the larger plot, developing scenes fully with patient pacing, rising tension and interwoven threads that pay off across the whole book.';

    case 'Serialized chapters':
      return 'Story format: Serialized chapters — write an installment that is satisfying on its own yet ends with a hook that pulls toward the next chapter, with forward momentum and episodic rhythm.';

    case 'Short story collection':
      return 'Story format: Short story collection — give this chapter a self-contained arc with a clear shape, tighter focus and a sense of conclusion, even while it stays connected to the wider characters and world.';

    case 'Episodic':
      return 'Story format: Episodic — write a lively, self-contained episode with a clear beginning, middle and end, focused on one encounter or event while keeping continuity with the ongoing cast.';

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

  if (book.format && book.format !== 'Auto') {
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

  if (
    book.setting &&
    book.setting.trim() &&
    book.setting !== 'Auto'
  ) {
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

  if (
    book.setting &&
    book.setting.trim() &&
    book.setting !== 'Auto'
  ) {
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
    const added =
      (c.heading?.length || 0) +
      (c.body?.length || 0);

    if (used + added > maxChars) break;

    block.unshift(
      `[Earlier chapter — ${c.heading}]\n${c.body}`
    );

    used += added;
  }

  return `Recent chapter text (use this for tone, style and immediate continuity):\n${block.join(
    '\n\n'
  )}`;
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

  parts.push(
    `Write Chapter ${(book.chapters?.length || 0) + 1} of the story "${book.title}".`
  );

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

  parts.push(
    `Write Chapter ${(book.chapters?.length || 0) + 1} of the story "${book.title}".`
  );

  parts.push(persistentContext(book));

  if (book.summary && book.summary.trim()) {
    parts.push(
      `Rolling summary of the story so far (this is binding continuity — do not contradict it):\n${book.summary}`
    );
  }

  const recent = recentChaptersBlock(book, 3500);

  if (recent) parts.push(recent);

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
      ? `Genre for this chapter: ${chapterSettings.genre}.`
      : 'Genre for this chapter: choose one that fits the story and the direction of the narrative.';

  parts.push(genre);

  const [min, max] = resolveRange(
    chapterSettings?.lengthMode,
    chapterSettings?.wordMin,
    chapterSettings?.wordMax
  );

  if (max) {
    parts.push(
      `Length for this chapter ONLY: aim for approximately ${min.toLocaleString()} to ${max.toLocaleString()} words in a single continuous chapter. Do not wrap it up early; develop the scene fully to reach the target length.`
    );
  } else if (min) {
    parts.push(
      `Length for this chapter ONLY: aim for at least approximately ${min.toLocaleString()} words in a single continuous chapter.`
    );
  } else {
    parts.push(
      'Length for this chapter ONLY: a reasonably full chapter (a few hundred words).'
    );
  }

  if (currentInstruction && currentInstruction.trim()) {
    parts.push(
      `The author's own direction for THIS chapter (combine it with the original settings above, do not discard them):\n${currentInstruction.trim()}`
    );
  }

  parts.push(
    'Continue the story naturally from where it ended. If the story feels like it has reached a natural stopping point, resolve arcs satisfyingly while leaving room for the story to continue — never end by saying "the end" unless the author has requested a conclusion, and always allow the narrative to keep going.'
  );

  parts.push(
    'Write ONE chapter only. Return an object with a "chapter" that has a short evocative "heading" and the full narrative "body". Separate paragraphs within the body with two newline characters. Also return the story\'s overall "title" (keep it unchanged unless it genuinely no longer fits).'
  );

  return parts.join('\n\n');
}

function continuePrompt(
  book,
  currentBody,
  pendingInstruction,
  chapterSettings
) {
  const parts = [];

  parts.push(
    `Continue the CURRENT Chapter ${(book.chapters?.length || 0) + 1} of "${book.title}" exactly where it left off. This is the SAME chapter — do not start a new chapter, do not resolve the whole story.`
  );

  parts.push(
    `Here is the chapter so far (extend it from this point, maintaining tone, style and continuity):\n${currentBody || ''}`
  );

  parts.push(
    `Ongoing plot goals for this chapter:\n${persistentContext(book)}\n${
      chapterGenreText(
        book,
        (book.chapters?.length || 0) - 1
      )
        ? `Chapter genre: ${chapterGenreText(
            book,
            (book.chapters?.length || 0) - 1
          )}.`
        : ''
    }`
  );

  const langNote = languageOverrideNote(book);

  if (langNote) parts.push(langNote);

  const [min, max] = resolveRange(
    chapterSettings?.lengthMode,
    chapterSettings?.wordMin,
    chapterSettings?.wordMax
  );

  if (max) {
    parts.push(
      `The chapter needs to reach roughly ${min.toLocaleString()} to ${max.toLocaleString()} words TOTAL. Continue the narrative (don't just summarize) to develop this chapter toward that length, expanding the scene and events naturally.`
    );
  } else if (min) {
    parts.push(
      `The chapter needs to reach roughly ${min.toLocaleString()} words TOTAL. Continue the narrative (don't just summarize) to develop this chapter toward that length.`
    );
  }

  if (pendingInstruction && pendingInstruction.trim()) {
    parts.push(
      `Additional author direction for the continuation:\n${pendingInstruction.trim()}`
    );
  }

  parts.push(
    'Your response must be a DIRECT CONTINUATION of the chapter\'s text — continue writing prose, not a meta-instruction. Return an object with a "chapter" whose "heading" is empty (or repeat the existing heading) and whose "body" is ONLY the new continuation text to append, not the whole chapter. Separate paragraphs with two newline characters.'
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

  parts.push(
    `The latest/provided story content to fold in:\n${changedChapters || ''}`
  );

  parts.push(
    'Preserve important facts: major events, character identities, character relationships and development, important locations, world rules, discoveries, conflicts, important objects, decisions, unresolved plot threads, promises or plans set up for later. Keep it compact but information-dense — a few tight paragraphs. Do not include the full chapter text; this is a summary only.'
  );

  parts.push('Return the summary as a plain string.');

  return parts.join('\n\n');
}

function questionsPrompt(book) {
  const parts = [];

  parts.push(
    `You are helping the author continue the story "${book.title}".`
  );

  parts.push(persistentContextStyleFree(book));

  if (book.summary && book.summary.trim()) {
    parts.push(
      `Rolling summary of the story so far:\n${book.summary}`
    );
  }

  const last = (book.chapters || []).slice(-1)[0];

  if (last) {
    parts.push(
      `The story just ended with chapter "${last.heading}":\n${(
        last.body || ''
      ).slice(0, 1200)}`
    );
  }

  parts.push(
    `Propose 2-3 short, relevant, contextual questions or prompts the author might answer to guide the NEXT chapter. They must grow from the actual story, its characters, setting and unresolved threads — not generic or random. Phrase them as suggestions in the author's voice, e.g. "Have them discover what's inside the vault", "Introduce a rival who knows about the hidden city", "Jump forward a season and show the consequences". Each should be concise.`
  );

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
  const [chapterSettings, setChapterSettings] =
    useState(DEFAULT_CHAPTER);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [coverStatus, setCoverStatus] = useState('idle');
  const [illustratingChapters, setIllustratingChapters] =
    useState({});

  const bookRef = useRef(null);
  bookRef.current = book;

  const generatingRef = useRef(false);

  const statusRef = useRef(status);
  statusRef.current = status;

  const updateBook = async (id, updates) => {
    return updateBookApi(id, updates);
  };

  const illustrateChapterAt = async (
    bookState,
    chapterIndex
  ) => {
    const chapter =
      bookState?.chapters?.[chapterIndex];

    if (!chapter || !chapter.body?.trim()) return;

    setIllustratingChapters((prev) => ({
      ...prev,
      [chapterIndex]: true
    }));

    try {
      const { illustrations } =
        await illustrateChapter(
          bookState,
          chapter
        );

      const current = bookRef.current;

      if (!current) return;

      const updated = current.chapters.map(
        (c, i) =>
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

      const nextBook = {
        ...current,
        chapters: updated
      };

      setBook(nextBook);

      try {
        await updateBook(current.id, {
          chapters: updated,
          chapter_count: updated.length
        });
      } catch {
        /* persist best-effort */
      }
    } catch {
      /* illustration best-effort */
    } finally {
      setIllustratingChapters((prev) => {
        const n = { ...prev };
        delete n[chapterIndex];
        return n;
      });
    }
  };

  const loadBookshelf = useCallback(
    async () => {
      try {
        const shelf =
          await listBooksApi(50);

        setBookshelf(
          shelf.map((b) => ({
            id: b.id,
            title: b.title,
            idea: b.idea || '',
            genre: b.genre,
            chapters:
              Array.isArray(b.chapters)
                ? b.chapters.length
                : Number(b.chapter_count) || 0,
            updated:
              b.updated_date ||
              b.updated_at,
            cover_url:
              b.cover_url || null
          }))
        );
      } catch {
        /* bookshelf best-effort */
      }
    },
    []
  );

  const updateSummary = async (
    chaptersText
  ) => {
    const current = bookRef.current;

    if (!current?.id) return false;

    setStatus('summary');

    try {
      const result = await callGemini(
        summaryUpdatePrompt(
          current,
          chaptersText
        ),
        {
          type: 'object',
          properties: {
            summary: {
              type: 'string'
            }
          },
          required: ['summary']
        }
      );

      const newSummary =
        (result && result.summary) || '';

      const next = {
        ...bookRef.current,
        summary: newSummary
      };

      setBook(next);

      try {
        await updateBook(current.id, {
          summary: newSummary
        });
      } catch {
        /* stored separately */
      }

      return true;
    } catch {
      return false;
    } finally {
      setStatus('idle');
    }
  };

  const loadSuggestions = useCallback(
    async () => {
      setSuggestions([]);

      const current = bookRef.current;

      if (
        !current?.id ||
        !(current.chapters || []).length
      ) {
        return;
      }

      try {
        const res = await callGemini(
          questionsPrompt(current),
          questionsSchema
        );

        setSuggestions(
          Array.isArray(res?.questions)
            ? res.questions.slice(0, 3)
            : []
        );
      } catch {
        /* suggestions optional */
      }
    },
    []
  );

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

  // Generate exactly ONE chapter (Chapter 1) from a new story.
  const generate = async () => {
    if (generatingRef.current) return;

    generatingRef.current = true;

    setStatus('story');
    setError('');
    setSuggestions([]);

    try {
      if (!idea.trim()) {
        throw new Error(
          'Please enter a story idea first.'
        );
      }

      const titleGuess =
        idea.trim().length > 58
          ? idea.trim().slice(0, 58) + '…'
          : idea.trim();

      const base = {
        idea: idea.trim(),
        perspective: config.perspective,
        audience: config.audience,
        format: config.format,
        language: config.language,
        characters,
        setting:
          setting.trim() || 'Auto',
        summary: '',
        directions: []
      };

      const res = await callGemini(
        genPrompt(
          {
            ...base,
            title: titleGuess
          },
          '',
          chapterSettings
        ),
        nextChapterSchema
      );

      console.log(
        'OpenRouter Chapter 1 response:',
        res
      );

      const ch = res?.chapter;

      if (!ch?.body?.trim()) {
        throw new Error(
          'The story did not come back in a readable format. Please try again.'
        );
      }

      const title =
        (res?.title &&
          res.title.trim()) ||
        titleGuess;

      const body =
        await ensureChapterLength(
          base,
          title,
          ch,
          [],
          chapterSettings
        );

      const newCh = {
        heading: (
          ch.heading ||
          'Chapter 1'
        ).trim(),
        body,
        mode: 'ai',
        genre:
          chapterSettings.genre,
        lengthMode:
          chapterSettings.lengthMode,
        wordMin:
          chapterSettings.wordMin,
        wordMax:
          chapterSettings.wordMax,
        wordCount:
          countWords(body)
      };

      const created =
        await createBookApi({
          ...base,
          title,
          genre:
            chapterSettings.genre,
          chapter_count: 1,
          cover_url: null,
          chapters: [newCh]
        });

      const nextBook = {
        id: created.id,
        title,
        ...base,
        genre:
          chapterSettings.genre,
        chapters: [newCh]
      };

      setBook(nextBook);
      setIdea('');
      setCharacters([]);
      setSetting('');
      setConfig(DEFAULT_CONFIG);
      setChapterSettings(
        DEFAULT_CHAPTER
      );

      await loadBookshelf();

      await updateSummary(
        `[Chapter 1 — ${newCh.heading}]\n${newCh.body}`
      );

      await loadSuggestions();

      setCoverStatus('painting');

      try {
        const coverBook = {
          id: created.id,
          title,
          idea: nextBook.idea,
          genre:
            chapterSettings.genre,
          setting: base.setting,
          characters,
          chapters: [newCh],
          summary:
            bookRef.current?.summary ||
            newCh.body
        };

        const url =
          await generateInitialCover(
            coverBook
          );

        if (url) {
          setBook((prev) =>
            prev
              ? {
                  ...prev,
                  cover_url: url
                }
              : prev
          );
        }
      } catch {
        /* cover best-effort */
      } finally {
        setCoverStatus('idle');
      }

      await illustrateChapterAt(
        nextBook,
        0
      );
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

  // Word-count enforcement.
  const ensureChapterLength = async (
    base,
    title,
    ch,
    prevChapters,
    chapterSettings
  ) => {
    const [min] =
      resolveRange(
        chapterSettings?.lengthMode,
        chapterSettings?.wordMin,
        chapterSettings?.wordMax
      );

    if (!min) return ch.body;

    let body = ch.body || '';
    let guard = 0;

    while (
      countWords(body) < min &&
      guard < 3
    ) {
      const res =
        await callGemini(
          continuePrompt(
            {
              ...base,
              title,
              chapters:
                prevChapters
            },
            body,
            '',
            chapterSettings
          ),
          continueChapterSchema
        );

      const piece =
        res?.chapter?.body
          ?.trim?.();

      if (!piece) break;

      body = (
        body.trimEnd() +
        '\n\n' +
        piece
      ).trim();

      guard++;
    }

    return body;
  };

  const generateNextChapter =
    async (direction) => {
      if (generatingRef.current) {
        if (
          statusRef.current ===
          'idle'
        ) {
          generatingRef.current =
            false;
        } else {
          return;
        }
      }

      const current =
        bookRef.current;

      if (!current?.id) return;

      generatingRef.current = true;

      setStatus('next');
      setError('');
      setSuggestions([]);

      try {
        const res =
          await callGemini(
            genPrompt(
              current,
              direction,
              chapterSettings
            ),
            nextChapterSchema
          );

        const ch =
          res?.chapter;

        if (!ch?.body?.trim()) {
          throw new Error(
            'The chapter did not come back in a readable format. Please try again.'
          );
        }

        const title =
          (res?.title &&
            res.title.trim()) ||
          current.title;

        const body =
          await ensureChapterLength(
            current,
            title,
            ch,
            current.chapters ||
              [],
            chapterSettings
          );

        const newCh = {
          heading: (
            ch.heading ||
            `Chapter ${
              (current.chapters
                ?.length || 0) + 1
            }`
          ).trim(),
          body,
          mode: 'ai',
          genre:
            chapterSettings.genre,
          lengthMode:
            chapterSettings.lengthMode,
          wordMin:
            chapterSettings.wordMin,
          wordMax:
            chapterSettings.wordMax,
          wordCount:
            countWords(body)
        };

        const chapters = [
          ...(current.chapters ||
            []),
          newCh
        ];

        const directions =
          direction &&
          direction.trim()
            ? [
                ...(current.directions ||
                  []),
                {
                  text:
                    direction.trim(),
                  chapter_index:
                    current.chapters
                      ?.length || 0,
                  created_at:
                    Date.now()
                }
              ]
            : current.directions ||
              [];

        const next = {
          ...current,
          title,
          chapters,
          directions
        };

        setBook(next);

        await updateBook(
          current.id,
          {
            title,
            chapters,
            directions,
            chapter_count:
              chapters.length
          }
        );

        await updateSummary(
          `[Chapter ${chapters.length} — ${newCh.heading}]\n${newCh.body}`
        );

        setCoverStatus('painting');

        try {
          const coverBook = {
            ...bookRef.current,
            characters:
              current.characters
          };

          const url =
            await maybeRefreshCover(
              coverBook
            );

          if (url) {
            setBook((prev) =>
              prev
                ? {
                    ...prev,
                    cover_url: url
                  }
                : prev
            );
          }
        } catch {
          /* cover best-effort */
        } finally {
          setCoverStatus('idle');
        }

        await illustrateChapterAt(
          next,
          current.chapters
            ?.length || 0
        );

        await loadSuggestions();
        await loadBookshelf();
      } catch (err) {
        setError(
          err?.message ||
            'That chapter could not be generated. Please try again.'
        );
      } finally {
        setStatus('idle');
        setChapterSettings(
          DEFAULT_CHAPTER
        );
        generatingRef.current =
          false;
      }
    };

  const regenerateChapter =
    async (index) => {
      const current =
        bookRef.current;

      if (!current?.id) return;

      setStatus(
        `regen:${index}`
      );
      setError('');

      try {
        const res =
          await callGemini(
            regeneratePrompt(
              current,
              index
            ),
            chapterSchema
          );

        if (!res?.body?.trim()) {
          throw new Error(
            'The chapter did not come back in a readable format. Please try again.'
          );
        }

        const oldCh =
          current.chapters[index];

        const body =
          await ensureChapterLength(
            current,
            current.title,
            {
              heading:
                res.heading ||
                oldCh.heading,
              body: res.body
            },
            current.chapters ||
              [],
            {
              lengthMode:
                oldCh?.lengthMode,
              wordMin:
                oldCh?.wordMin,
              wordMax:
                oldCh?.wordMax
            }
          );

        const newCh = {
          heading: (
            res.heading ||
            oldCh.heading
          ).trim(),
          body,
          mode:
            oldCh.mode || 'ai',
          genre:
            oldCh.genre,
          lengthMode:
            oldCh.lengthMode,
          wordMin:
            oldCh.wordMin,
          wordMax:
            oldCh.wordMax,
          wordCount:
            countWords(body)
        };

        const chapters =
          current.chapters.map(
            (c, i) =>
              i === index
                ? newCh
                : c
          );

        const next = {
          ...current,
          chapters
        };

        setBook(next);

        await updateBook(
          current.id,
          {
            chapters,
            chapter_count:
              chapters.length
          }
        );

        await updateSummary(
          `[Chapter ${index + 1} — ${newCh.heading}]\n${newCh.body}`
        );

        const preRegen = {
          ...bookRef.current,
          chapters
        };

        setBook((prev) => {
          const updated =
            (prev?.chapters ||
              []).map(
              (c, i) =>
                i === index
                  ? {
                      ...c,
                      illustrations: {}
                    }
                  : c
            );

          return prev
            ? {
                ...prev,
                chapters:
                  updated
              }
            : prev;
        });

        await illustrateChapterAt(
          preRegen,
          index
        );

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

  const regeneratePrompt =
    (book, index) => {
      const parts = [];

      parts.push(
        `Rewrite ONLY "Chapter ${
          index + 1
        }" of the story "${book.title}". Keep the rest of the story exactly as it is — do not change events in other chapters.`
      );

      parts.push(
        persistentContext(book)
      );

      if (
        book.summary &&
        book.summary.trim()
      ) {
        parts.push(
          `Rolling summary of the story so far (binding continuity):\n${book.summary}`
        );
      }

      const others =
        (book.chapters || [])
          .map(
            (c, i) =>
              i === index
                ? ''
                : `[Chapter ${
                    i + 1
                  } — ${c.heading}]\n${(
                    c.body || ''
                  ).slice(0, 900)}`
          )
          .filter(Boolean)
          .join('\n\n');

      if (others) {
        parts.push(
          `For continuity, here are the other chapters:\n${others}`
        );
      }

      const oldCh =
        book.chapters[index];

      if (
        oldCh?.genre &&
        oldCh.genre !== 'Auto' &&
        oldCh.genre !== 'Custom'
      ) {
        parts.push(
          `Preserve the genre for this chapter: ${oldCh.genre}.`
        );
      }

      const [min, max] =
        resolveRange(
          oldCh?.lengthMode,
          oldCh?.wordMin,
          oldCh?.wordMax
        );

      if (max) {
        parts.push(
          `Aim for approximately ${min.toLocaleString()} to ${max.toLocaleString()} words for this rewritten chapter.`
        );
      } else if (min) {
        parts.push(
          `Aim for at least approximately ${min.toLocaleString()} words for this rewritten chapter.`
        );
      }

      parts.push(
        'The rewritten chapter should fit seamlessly into the story, stay consistent with tone, continuity and plot progression, and avoid introducing contradictions with the surrounding chapters. Its heading may change slightly.'
      );

      parts.push(
        'Return only this chapter as an object with "heading" and "body". Separate paragraphs within the body with two newline characters.'
      );

      return parts.join(
        '\n\n'
      );
    };

  const saveChapterEdit =
    async (index, ch) => {
      const current =
        bookRef.current;

      if (!current?.id) return;

      const chapters =
        current.chapters.map(
          (c, i) =>
            i === index
              ? {
                  ...c,
                  ...ch,
                  wordCount:
                    countWords(
                      ch.body ??
                        c.body
                    )
                }
              : c
        );

      const next = {
        ...current,
        chapters
      };

      setBook(next);

      await updateBook(
        current.id,
        {
          chapters,
          chapter_count:
            chapters.length
        }
      );

      await updateSummary(
        `[Chapter ${
          index + 1
        } — ${
          chapters[index]
            .heading
        }]\n${
          chapters[index].body
        }`
      );

      await loadBookshelf();
    };

  const addChapterAfter =
    async (
      index,
      mode = 'ai'
    ) => {
      const current =
        bookRef.current;

      if (!current?.id) return;

      const isManual =
        mode === 'manual';

      const heading = isManual
        ? `Chapter ${
            index + 2
          }`
        : '';

      const body = '';

      const newCh = {
        heading,
        body,
        mode,
        manual: isManual,
        genre: 'Auto',
        lengthMode: 'Short',
        lengthLabel: ''
      };

      const chapters = [
        ...current.chapters
      ];

      chapters.splice(
        index + 1,
        0,
        newCh
      );

      const next = {
        ...current,
        chapters
      };

      setBook(next);

      await updateBook(
        current.id,
        {
          chapters,
          chapter_count:
            chapters.length
        }
      );

      await loadBookshelf();

      return newCh;
    };

  const deleteChapter =
    async (index) => {
      const current =
        bookRef.current;

      if (!current?.id) return;

      const chapters =
        current.chapters.filter(
          (_, i) =>
            i !== index
        );

      const next = {
        ...current,
        chapters
      };

      setBook(next);

      await updateBook(
        current.id,
        {
          chapters,
          chapter_count:
            chapters.length
        }
      );

      setStatus('summary');

      try {
        const text =
          chapters
            .map(
              (c, i) =>
                `[Chapter ${
                  i + 1
                } — ${c.heading}]\n${c.body}`
            )
            .join('\n\n');

        const res =
          await callGemini(
            summaryUpdatePrompt(
              {
                ...next,
                summary: ''
              },
              text
            ),
            {
              type: 'object',
              properties: {
                summary: {
                  type: 'string'
                }
              },
              required: [
                'summary'
              ]
            }
          );

        if (res?.summary) {
          setBook((prev) =>
            prev
              ? {
                  ...prev,
                  summary:
                    res.summary
                }
              : prev
          );

          await updateBook(
            current.id,
            {
              summary:
                res.summary
            }
          );
        }
      } catch {
        /* summary best-effort */
      } finally {
        setStatus('idle');
      }

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
  const saveStory =
    async (title) => {
      const current =
        bookRef.current;

      if (!current?.id) return;

      setSaving(true);

      try {
        const next = {
          ...current,
          title
        };

        setBook(next);

        await updateBook(
          current.id,
          {
            title
          }
        );

        await loadBookshelf();
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
      saved =
        await getBookApi(id);
    } catch {
      saved = null;
    }

    if (!saved) {
      setError(
        'That story could not be opened.'
      );
      return;
    }

    const chapters =
      saved.chapters || [];

    setBook({
      id: saved.id,
      title: saved.title,
      idea: saved.idea || '',
      perspective:
        saved.perspective ||
        'Auto',
      audience:
        saved.audience ||
        'Auto',
      format:
        saved.format ||
        'Auto',
      language:
        saved.language ||
        'Auto',
      genre:
        saved.genre || 'Auto',
      characters:
        saved.characters || [],
      setting:
        saved.setting || 'Auto',
      chapters,
      directions:
        saved.directions || [],
      summary:
        saved.summary || '',
      story_length:
        saved.story_length ||
        mapLegacyLength(
          saved.story_length
        ),
      cover_url:
        saved.cover_url || null
    });

    setIdea('');
    setCharacters([]);
    setSetting('');

    setConfig({
      perspective:
        saved.perspective ||
        'Auto',
      audience:
        saved.audience ||
        'Auto',
      format:
        saved.format ||
        'Auto',
      language:
        saved.language ||
        'Auto'
    });

    setChapterSettings(
      DEFAULT_CHAPTER
    );
    setSuggestions([]);
  };

  const continueAutomatically =
    () => generateNextChapter('');

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