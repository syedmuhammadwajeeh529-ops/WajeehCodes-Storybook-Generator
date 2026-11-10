import { GoogleGenAI } from '@google/genai';

const IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

const OPENROUTER_IMAGE_MODEL =
  process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image';

async function generateWithGemini(prompt) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing.');
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
  });

  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: prompt
  });

  const imagePart = response.candidates
    ?.flatMap((candidate) => candidate.content?.parts || [])
    .find((part) => part.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    throw new Error('Gemini did not return an image.');
  }

  const mimeType = imagePart.inlineData.mimeType || 'image/png';

  return {
    url: `data:${mimeType};base64,${imagePart.inlineData.data}`,
    provider: 'Gemini'
  };
}

async function generateWithOpenRouter(prompt) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is missing.');
  }

  const response = await fetch(
    'https://openrouter.ai/api/v1/images',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENROUTER_IMAGE_MODEL,
        prompt,
        aspect_ratio: '3:2'
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
      `OpenRouter image request failed (${response.status}).`
    );
  }

  const image = data?.data?.[0];

  if (image?.b64_json) {
    const mimeType = image.mime_type || 'image/png';

    return {
      url: `data:${mimeType};base64,${image.b64_json}`,
      provider: 'OpenRouter'
    };
  }

  if (image?.url) {
    return {
      url: image.url,
      provider: 'OpenRouter'
    };
  }

  throw new Error('OpenRouter did not return a usable image.');
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

// This generated SVG is a dependable, no-API fallback. It is stored as a
// data URL just like provider-generated images, so the existing cover_url
// persistence and rendering paths can display it without a separate service.
function generateFallbackCover(prompt) {
  const titleMatch = prompt.match(/story titled ["“]([^"”]+)["”]/i);
  const title = (titleMatch?.[1] || 'Your Story').trim().slice(0, 54);
  const words = title.split(/\\s+/);
  const lines = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > 19 && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);

  const titleLines = lines.slice(0, 3);
  const titleSvg = titleLines
    .map((text, index) =>
      `<text x="600" y="${650 + index * 76}" text-anchor="middle" class="title">${escapeXml(text)}</text>`
    )
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#172b3a"/>
        <stop offset=".52" stop-color="#435b61"/>
        <stop offset="1" stop-color="#b17b55"/>
      </linearGradient>
      <radialGradient id="glow"><stop stop-color="#f3d8a4" stop-opacity=".9"/><stop offset="1" stop-color="#f3d8a4" stop-opacity="0"/></radialGradient>
      <pattern id="grain" width="34" height="34" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="5" r="1" fill="#fff" opacity=".12"/>
      </pattern>
      <style>
        .eyebrow{font:600 23px Georgia,serif;letter-spacing:9px;fill:#f2dfbd}
        .title{font: bold 66px Georgia,serif;fill:#fff8e9}
        .rule{stroke:#e9c99b;stroke-width:2;opacity:.8}
      </style>
    </defs>
    <rect width="1200" height="1600" fill="url(#bg)"/>
    <circle cx="600" cy="470" r="420" fill="url(#glow)" opacity=".65"/>
    <circle cx="600" cy="470" r="245" fill="none" stroke="#f1d9ae" stroke-width="2" opacity=".65"/>
    <circle cx="600" cy="470" r="195" fill="none" stroke="#f1d9ae" stroke-width="1" opacity=".4"/>
    <path d="M0 1120 Q260 930 480 1110 T930 1080 T1200 1030 V1600 H0Z" fill="#142a31" opacity=".72"/>
    <path d="M0 1240 Q300 1060 560 1240 T1200 1160 V1600 H0Z" fill="#101f29" opacity=".55"/>
    <path d="M600 210 L625 420 L600 520 L575 420Z" fill="#f3d8a4" opacity=".8"/>
    <path d="M600 520 L790 690 L600 630 L410 690Z" fill="#f3d8a4" opacity=".35"/>
    <rect width="1200" height="1600" fill="url(#grain)"/>
    <text x="600" y="180" text-anchor="middle" class="eyebrow">A STORY AWAITS</text>
    <line x1="390" y1="570" x2="810" y2="570" class="rule"/>
    ${titleSvg}
    <line x1="390" y1="900" x2="810" y2="900" class="rule"/>
    <text x="600" y="1480" text-anchor="middle" class="eyebrow">W A J E E H  C O D E S</text>
  </svg>`;

  return {
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    provider: 'Local fallback'
  };
}

export async function generateImage(prompt) {
  if (typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('An image prompt is required.');
  }

  let geminiError;

  try {
    return await generateWithGemini(prompt.trim());
  } catch (error) {
    geminiError = error;
    console.warn(
      'Gemini image generation failed. Trying OpenRouter:',
      error.message
    );
  }

  try {
    return await generateWithOpenRouter(prompt.trim());
  } catch (openRouterError) {
    console.warn('Both image providers failed. Using local fallback cover.', {
      gemini: geminiError?.message,
      openRouter: openRouterError?.message
    });

    return generateFallbackCover(prompt.trim());
  }
}
