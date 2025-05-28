import { GenerateSectionsParams, AIResponseSections } from "../types/ai";

export async function generateSectionsWithGemini(params: GenerateSectionsParams): Promise<AIResponseSections> {
  const { description, sectionIdea, expectedSectionCount } = params;
  const { GoogleGenAI, Type } = await import("@google/genai");

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
- sections：每一章包含 title 與 description
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
                description: { type: Type.STRING },
              },
              required: ["title", "description"],
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
