import { GenerateSectionsParams, AIResponseSections, GeneratePromotionPlanParams } from "../types/ai";
import { generateSectionsWithGemini, generateCouponsPlanWithGemini } from "./geminiService";
import { generateSectionsWithOpenAI, generateCouponsPlanWithOpenAI } from "./openAIService";

const provider = process.env.AI_PROVIDER ?? "gemini"; // 預設用 Gemini

export async function generateSections(params: GenerateSectionsParams): Promise<AIResponseSections> {
  if (provider === "openai") {
    return await generateSectionsWithOpenAI(params);
  } else {
    return await generateSectionsWithGemini(params);
  }
}

export async function generateCouponsPlan(params: GeneratePromotionPlanParams) {
  const provider = process.env.AI_PROVIDER ?? "gemini";

  if (provider === "openai") {
    return await generateCouponsPlanWithOpenAI(params);
  } else {
    return await generateCouponsPlanWithGemini(params);
  }
}
