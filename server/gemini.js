
import { GoogleGenAI } from "@google/genai";
import {
  generateStory as openRouterGenerateStory,
  generateStructured as openRouterGenerateStructured,
} from "./openrouter.js";

const GEMINI_MODEL = "gemini-3.8-flash";

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return new GoogleGenAI({ apiKey });
}

function extractResponseText(response) {
  let text = response?.text;

  if (typeof text !== "string" || !text.trim()) {
    const parts = response?.candidates?.flatMap(
      (candidate) => candidate.content?.parts ?? []
    );

    text = parts
      ?.filter((part) => typeof part.text === "string" && !part.thought)
      .map((part) => part.text)
      .join("\n");
  }

  if (typeof text !== "string" || !text.trim()) {
    const reason =
      response?.promptFeedback?.blockReason ||
      response?.candidates?.[0]?.finishReason ||
      "empty response";

    throw new Error(`Gemini returned no usable text: ${reason}`);
  }

  return text.trim();
}

function parseJson(text, provider) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${provider} returned invalid JSON.`);
  }
}

export async function generateStory(prompt) {
  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("A non-empty prompt is required.");
  }

  try {
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    return extractResponseText(response);
  } catch (geminiError) {
    console.warn(
      "Gemini text generation failed. Trying OpenRouter:",
      geminiError.message
    );

    return openRouterGenerateStory(prompt);
  }
}

export async function generateStructured(prompt, schema) {
  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("A non-empty prompt is required.");
  }

  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    throw new Error("A valid JSON schema is required.");
  }

  try {
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: schema,
      },
    });

    const text = extractResponseText(response);
    return parseJson(text, "Gemini");
  } catch (geminiError) {
    console.warn(
      "Gemini structured generation failed. Trying OpenRouter:",
      geminiError.message
    );

    try {
      return await openRouterGenerateStructured(prompt, schema);
    } catch (openRouterError) {
      console.error(
        "Both Gemini and OpenRouter structured generation failed.",
        {
          geminiError: geminiError.message,
          openRouterError: openRouterError.message,
        }
      );

      throw new Error(
        `Idea generation failed with both providers. Gemini: ${geminiError.message}. OpenRouter: ${openRouterError.message}`
      );
    }
  }
}
