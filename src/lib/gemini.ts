import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!ai) {
    const apiKey: string | undefined = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set.");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

/**
 * Generates content using Gemini AI with self-healing model fallback.
 * Tries GEMINI_MODEL env variable first, then attempts standard models in order.
 */
export async function generateGeminiContent(prompt: string): Promise<string> {
  const client = getGeminiClient();
  const modelsToTry: string[] = [];

  // 1. User custom model from environment variables
  if (process.env.GEMINI_MODEL) {
    modelsToTry.push(process.env.GEMINI_MODEL);
  }

  // 2. Default fallback hierarchy
  const defaultModels = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-2.5-flash",
    "gemini-3.1-flash-lite", // Explicit support for gemini-3.1-flash-lite or similar models
  ];

  for (const model of defaultModels) {
    if (!modelsToTry.includes(model)) {
      modelsToTry.push(model);
    }
  }

  let lastError: Error | null = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`[Gemini] Attempting generation with model: ${modelName}`);
      const response = await client.models.generateContent({
        model: modelName,
        contents: prompt,
      });

      const text = response.text?.trim();
      if (text) {
        console.log(`[Gemini] Generation succeeded with model: ${modelName}`);
        return text;
      }
    } catch (err) {
      console.warn(`[Gemini] Model ${modelName} failed:`, (err as Error).message);
      lastError = err as Error;
    }
  }

  throw new Error(
    `Gemini AI generation failed for all models. Last error: ${lastError?.message}`
  );
}
