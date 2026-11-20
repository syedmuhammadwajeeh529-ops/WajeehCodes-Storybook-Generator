import { apiUrl } from '../../lib/api';

const openingSceneSchema = {
  type: 'object',
  properties: {
    scene_description: { type: 'string' },
    setting: { type: 'string' },
    characters: { type: 'string' },
    key_visual_details: {
      type: 'array',
      items: { type: 'string' }
    },
    composition: { type: 'string' }
  },
  required: ['scene_description']
};

async function callGemini(prompt, schema) {
  const response = await fetch(
    apiUrl('/api/gemini'),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        schema
      })
    }
  );

  if (!response.ok) {
    throw new Error(
      `Gemini backend request failed with status ${response.status}`
    );
  }

  return response.json();
}

async function generateImage(prompt) {
  const response = await fetch(
    apiUrl('/api/images'),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    }
  );

  if (!response.ok) {
    throw new Error(
      `Image backend request failed with status ${response.status}`
    );
  }

  const data = await response.json();

  if (!data?.url) {
    throw new Error('The cover image did not come back.');
  }

  return data.url;
}

async function updateBook(bookId, updates) {
  const response = await fetch(
    apiUrl(`/api/books/${bookId}`),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }
  );

  if (!response.ok) {
    throw new Error(
      `Book update failed with status ${response.status}`
    );
  }

  return response.json();
}

function getOpeningChapter(book) {
  const chapters = Array.isArray(book.chapters)
    ? [...book.chapters]
    : [];

  return (
    chapters.find(
      (chapter) => Number(chapter.chapter_number) === 1
    ) ||
    chapters.sort(
      (a, b) =>
        (Number(a.chapter_number) || 0) -
        (Number(b.chapter_number) || 0)
    )[0] ||
    null
  );
}

async function resolveOpeningScene(book) {
  const openingChapter = getOpeningChapter(book);
  const chapterText = openingChapter?.body?.trim() || '';

  const prompt = [
    `You are preparing the illustration brief for the front cover of "${book.title}". Read the story idea and Chapter 1 carefully, then identify ONE specific, visually clear scene that genuinely happens in Chapter 1.`,
    'SCENE SELECTION RULES:',
    '- Prefer the opening scene. If the opening moment is not visually strong, choose the most visually meaningful moment that occurs later in Chapter 1.',
    '- The scene must come from Chapter 1 only. Do not use events, characters, locations, revelations, or objects introduced only in later chapters or imagined from the genre.',
    '- Describe what is physically happening in the chosen moment: who is present, what each person is doing, where they are, and the important objects or environmental details.',
    '- Preserve the story details exactly. Do not replace specific actions or locations with vague symbols for the story theme.',
    '- Include every important visual detail needed to recognize the scene. If the text says a character is hiding behind bushes while watching a group enter a cave, make that staging explicit.',
    '- Do not invent a character appearance when none is described. Use only details supplied by the story or character notes.',
    'Return a concise but richly visual illustration brief. The scene_description must describe one frozen moment, not a plot summary.',
    `Book title: ${book.title || 'Untitled'}`,
    `Genre: ${book.genre || 'Unspecified'}`,
    `Story idea: ${book.idea || 'Not provided'}`,
    `World and setting notes: ${book.setting || 'Not provided'}`,
    `Character notes: ${(book.characters || [])
      .filter((character) => character.name)
      .map((character) => [
        character.name,
        character.role,
        character.description,
        character.personality
      ].filter(Boolean).join(' | '))
      .join('; ') || 'No separate character notes'}`,
    `Chapter 1 heading: ${openingChapter?.heading || 'Chapter 1'}`,
    `Chapter 1 text:\n${chapterText || '(Chapter text is not available. Use the story idea and setting notes, and do not invent a detailed plot event.)'}`
  ].join('\n\n');

  const result = await callGemini(prompt, openingSceneSchema);

  return {
    sceneDescription:
      result?.scene_description?.trim() ||
      chapterText ||
      book.idea ||
      `The opening scene of ${book.title || 'the story'}`,
    setting: result?.setting?.trim() || book.setting || '',
    characters: result?.characters?.trim() || '',
    visualDetails: Array.isArray(result?.key_visual_details)
      ? result.key_visual_details.filter(Boolean)
      : [],
    composition: result?.composition?.trim() || ''
  };
}

function coverArtPrompt(book, scene) {
  const parts = [
    `Create the actual front-cover illustration for the book "${book.title}".`,
    'THE IMAGE MUST VISUALLY DEPICT THIS SPECIFIC STORY SCENE, not merely its genre, mood, moral, or abstract theme:',
    scene.sceneDescription,
    scene.setting
      ? `Scene location and environment: ${scene.setting}`
      : '',
    scene.characters
      ? `Characters and their actions/positions: ${scene.characters}`
      : '',
    scene.visualDetails.length
      ? `Essential visual details that must appear: ${scene.visualDetails.join('; ')}`
      : '',
    scene.composition
      ? `Suggested composition: ${scene.composition}`
      : '',
    book.idea
      ? `Story context (use only to understand the scene, not to replace it): ${book.idea}`
      : '',
    book.genre && book.genre !== 'Auto' && book.genre !== 'Custom'
      ? `Genre and visual tone: ${book.genre}`
      : '',
    'SCENE ACCURACY IS THE TOP PRIORITY:',
    '- Show the described moment as a coherent, believable scene with the correct characters, actions, setting, and important objects.',
    '- Make the relationships and positions between characters readable. If someone is hiding, show what they are hiding behind and what they are watching. If a group is present, show the group rather than implying it with symbols.',
    '- Do not substitute a generic fantasy castle, a random hero portrait, a symbolic object, or a mood-only landscape for the described scene.',
    '- Do not create a collage, montage, split panel, or a collection of unrelated scenes. Show one cinematic moment.',
    '- Do not add plot details that contradict or go beyond Chapter 1.',
    'ART DIRECTION: Create a polished, richly detailed, professional illustrated book-cover artwork. Use cinematic lighting, strong depth, clear focal hierarchy, expressive environments, and a composition that remains legible at thumbnail size. Portrait book-cover orientation. The artwork itself must contain no text, no lettering, no title, no author name, no logo, and no border. Leave visually calmer space near the top for the book title to be added separately.'
  ];

  return parts.filter(Boolean).join('\n\n');
}

async function generateCoverImage(book) {
  const scene = await resolveOpeningScene(book);
  return generateImage(coverArtPrompt(book, scene));
}

export async function generateInitialCover(book) {
  const url = await generateCoverImage(book);

  await updateBook(book.id, {
    cover_url: url
  });

  return url;
}

// A book's cover represents its opening chapter. Later plot developments must
// not silently replace that defining image with an unrelated scene.
export async function maybeRefreshCover() {
  return null;
}
