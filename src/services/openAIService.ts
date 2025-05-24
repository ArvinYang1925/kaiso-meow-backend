// src/services/openAIService.ts
import { GenerateSectionsParams, AIResponseSections } from "../types/ai";
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
      "description": string
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
