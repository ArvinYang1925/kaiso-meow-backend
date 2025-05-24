import { GenerateSectionsParams, AIResponseSections } from "../types/ai";
import { generateSectionsWithGemini } from "./geminiService";
import { generateSectionsWithOpenAI } from "./openAIService";

const provider = process.env.AI_PROVIDER ?? "gemini"; // 預設用 Gemini

export async function generateSections(params: GenerateSectionsParams): Promise<AIResponseSections> {
  if (provider === "openai") {
    return await generateSectionsWithOpenAI(params);
  } else {
    return await generateSectionsWithGemini(params);
  }
}
