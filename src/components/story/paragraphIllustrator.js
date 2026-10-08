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

async function generateImage(prompt) {
  const response = await fetch('http://localhost:3001/api/images', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    throw new Error(
      `Image backend request failed with status ${response.status}`
    );
  }

  const data = await response.json();

  if (!data?.url) {
    throw new Error('The paragraph image did not come back.');
  }

  return data.url;
}

export function splitParagraphs(body) {
  return (body || '')
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);
}

async function detectActivityParagraphs(book, chapterHeading, paragraphs) {
  if (!paragraphs.length) {
    return [];
  }

  const prompt = [
    `You decide which paragraphs of a story chapter should be illustrated.`,
    `Book: "${book.title}".`,
    book.genre &&
    book.genre !== 'Auto' &&
    book.genre !== 'Custom'
      ? `Genre: ${book.genre}.`
      : '',
    book.setting &&
    book.setting.trim() &&
    book.setting !== 'Auto'
      ? `Setting: ${book.setting.trim()}.`
      : '',
    `Chapter heading: ${chapterHeading || '(untitled)'}.`,
    `Here are the paragraphs, each labeled [P1], [P2], …:`,
    paragraphs
      .map((p, i) => `[P${i + 1}] ${p}`)
      .join('\n\n'),
    `For EACH paragraph, decide has_activity: true if it contains MAJOR activity worth illustrating — a concrete scene, meaningful physical action, a described character or place, a dramatic moment, or a vivid image. Return false for pure short dialogue with no action, brief transitional sentences, or abstract reflection with nothing to depict. Err toward illustrating paragraphs with a clear visual scene.`,
    `Return an object with a "paragraphs" array, one entry per paragraph above, each { index, has_activity }.`
  ]
    .filter(Boolean)
    .join('\n');

  const response = await fetch(
    'http://localhost:3001/api/gemini',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        schema: activitySchema
      })
    }
  );

  if (!response.ok) {
    throw new Error(
      `Gemini backend request failed with status ${response.status}`
    );
  }

  const res = await response.json();

  const list = Array.isArray(res?.paragraphs)
    ? res.paragraphs
    : [];

  const map = {};

  list.forEach(p => {
    if (
      typeof p?.index === 'number' &&
      typeof p?.has_activity === 'boolean'
    ) {
      map[p.index] = p.has_activity;
    }
  });

  return paragraphs.map((_, i) => !!map[i]);
}

function paragraphImagePrompt(
  book,
  chapterHeading,
  paragraph
) {
  const parts = [];

  parts.push(
    `A single story illustration for the following paragraph. The image must faithfully depict what this paragraph describes — the scene, who is present, what they are doing, and the objects and place described. Do not invent details that are not in the paragraph.`
  );

  parts.push(`Book: "${book.title}".`);

  if (
    book.genre &&
    book.genre !== 'Auto' &&
    book.genre !== 'Custom'
  ) {
    parts.push(`Genre: ${book.genre}.`);
  }

  if (
    book.setting &&
    book.setting.trim() &&
    book.setting !== 'Auto'
  ) {
    parts.push(
      `Setting / world: ${book.setting.trim()}.`
    );
  }

  const named = (book.characters || [])
    .filter(c => c.name && c.name.trim())
    .slice(0, 4);

  if (named.length) {
    parts.push(
      `Known characters (use these if they appear in the paragraph; keep appearance consistent): ${named
        .map(
          c =>
            `${c.name.trim()}${
              c.traits?.trim()
                ? ` (${c.traits.trim()})`
                : ''
            }`
        )
        .join(', ')}.`
    );
  }

  parts.push(
    `Chapter: ${chapterHeading || ''}`
  );

  parts.push(
    `Paragraph to illustrate:\n${paragraph}`
  );

  parts.push(
    `Illustrate exactly this moment. Polished, painterly book-illustration style matching the story's atmosphere. No text, no lettering, no captions, no borders. Landscape orientation.`
  );

  return parts.join('\n');
}

async function generateParagraphImage(
  book,
  chapterHeading,
  paragraph
) {
  return generateImage(
    paragraphImagePrompt(
      book,
      chapterHeading,
      paragraph
    )
  );
}

export async function illustrateChapter(
  book,
  chapter
) {
  const paragraphs = splitParagraphs(
    chapter?.body
  );

  if (!paragraphs.length) {
    return {
      illustrations: {}
    };
  }

  let flags;

  try {
    flags = await detectActivityParagraphs(
      book,
      chapter.heading,
      paragraphs
    );
  } catch {
    flags = paragraphs.map(
      p => p.split(/\s+/).length >= 25
    );
  }

  const illustrations = {};

  const idxs = paragraphs
    .map((_, i) => i)
    .filter(i => flags[i]);

  for (const i of idxs) {
    try {
      const url = await generateParagraphImage(
        book,
        chapter.heading,
        paragraphs[i]
      );

      if (url) {
        illustrations[i] = url;
      }
    } catch {
      // Skip this paragraph; keep others.
    }
  }

  return {
    illustrations
  };
}