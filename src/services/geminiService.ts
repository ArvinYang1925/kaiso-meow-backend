import { GenerateSectionsParams, AIResponseSections, GeneratePromotionPlanParams } from "../types/ai";
import { GoogleGenAI, Type } from "@google/genai";

export async function generateSectionsWithGemini(params: GenerateSectionsParams): Promise<AIResponseSections> {
  const { description, sectionIdea, expectedSectionCount } = params;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `
以下是一門課程的描述，請根據此內容規劃課程章節：

課程敘述：${description}
章節構想：${sectionIdea || "無"}
預期章節數量：${expectedSectionCount || "可自行判斷"}

請輸出 JSON 格式，包含：
- count：章節數量
- sections：每一章包含 title 與 content
`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          count: { type: Type.NUMBER },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING },
              },
              required: ["title", "content"],
            },
          },
        },
        required: ["count", "sections"],
      },
    },
  });

  if (!response.text) {
    throw new Error("Gemini 回傳內容為空，無法解析 JSON");
  }

  return JSON.parse(response.text);
}

export async function generateCouponsPlanWithGemini(params: GeneratePromotionPlanParams) {
  const { description, keywordThemes, numberOfPhases, launchDate, discountType, phaseDurationDays = 14 } = params;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `
請根據以下條件產生 ${numberOfPhases} 段促銷活動內容，包含每段的開始與結束時間，從課程上架日 "${launchDate}" 向前推算，每段促銷持續 ${phaseDurationDays} 天，請均勻分佈。

課程敘述：
${description}

關鍵字：
${keywordThemes || "無"}

折扣類型：
${discountType}

請輸出 JSON，格式如下：
{
  "strategySummary": "摘要說明",
  "coupons": [
    {
      "couponName": "標題",
      "type": "fixed" | "percent",
      "code": "代碼",
      "value": 數字,
      "startsAt": "YYYY-MM-DD",
      "expiresAt": "YYYY-MM-DD"
    }
  ]
}
`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          strategySummary: { type: Type.STRING },
          coupons: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                couponName: { type: Type.STRING },
                type: { type: Type.STRING },
                code: { type: Type.STRING },
                value: { type: Type.NUMBER },
                startsAt: { type: Type.STRING },
                expiresAt: { type: Type.STRING },
              },
              required: ["couponName", "type", "code", "value", "startsAt", "expiresAt"],
            },
          },
        },
        required: ["strategySummary", "coupons"],
      },
    },
  });

  if (!response.text) {
    throw new Error("Gemini 回傳為空，無法解析 JSON");
  }

  return JSON.parse(response.text);
}
