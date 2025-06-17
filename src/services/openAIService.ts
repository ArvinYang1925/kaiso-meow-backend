// src/services/openAIService.ts
import { GenerateSectionsParams, AIResponseSections, GeneratePromotionPlanParams } from "../types/ai";
import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateSectionsWithOpenAI(params: GenerateSectionsParams): Promise<AIResponseSections> {
  const { description, sectionIdea, expectedSectionCount } = params;
  const userPrompt = `
以下是一門課程的描述，請根據此內容規劃課程章節。

課程敘述：${description}
章節構想：${sectionIdea || "無"}
預期章節數量：${expectedSectionCount || "可自行判斷"}

請輸出 JSON 格式，包含：
{
  "count": number,
  "sections": [
    {
      "title": string,
      "content": string
    }
  ]
}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0].message.content;
  if (!content) throw new Error("OpenAI 回傳為空");

  return JSON.parse(content);
}

export async function generateCouponsPlanWithOpenAI(params: GeneratePromotionPlanParams) {
  const { description, keywordThemes, numberOfPhases, launchDate, discountType, phaseDurationDays = 14 } = params;

  const prompt = `
請根據下列資訊產出 ${numberOfPhases} 段課程促銷活動，包含完整時間規劃與行銷摘要：

課程描述：
${description}

行銷關鍵字建議：
${keywordThemes || "無"}

預計上架日：
${launchDate}

折扣型態：
${discountType}（fixed 表示固定金額；percent 表示百分比）

每段促銷期持續天數：
${phaseDurationDays} 天

請從「上架日往前」倒推時間，平均規劃出每段促銷時間，並產出以下 JSON 格式內容：

{
  "strategySummary": "摘要說明",
  "coupons": [
    {
      "couponName": "中文標題",
      "type": "fixed" | "percent",
      "code": "折扣碼",
      "value": 數字,
      "startsAt": "YYYY-MM-DD",
      "expiresAt": "YYYY-MM-DD"
    }
  ]
}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0].message.content;
  if (!content) throw new Error("OpenAI 回傳為空");

  return JSON.parse(content);
}
