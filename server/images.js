import { GoogleGenAI } from '@google/genai';

const IMAGE_MODEL = 'gemini-2.5-flash-image';

export async function generateImage(prompt) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required to generate images.');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: prompt
  });

  const imagePart = response.candidates
    ?.flatMap((candidate) => candidate.content?.parts || [])
    .find((part) => part.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    throw new Error('The image model did not return an image.');
  }

  const mimeType = imagePart.inlineData.mimeType || 'image/png';
  return {
    url: `data:${mimeType};base64,${imagePart.inlineData.data}`
  };
}
