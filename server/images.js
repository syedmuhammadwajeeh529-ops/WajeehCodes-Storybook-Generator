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
    console.error('Both image providers failed.', {
      gemini: geminiError?.message,
      openRouter: openRouterError?.message
    });

    throw new Error(
      `Image generation failed with both providers. ` +
      `Gemini: ${geminiError?.message || 'Unknown error'}. ` +
      `OpenRouter: ${openRouterError?.message || 'Unknown error'}.`
    );
  }
}