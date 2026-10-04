import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

export async function generateStory(prompt) {
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
  });

  return response.text;
}