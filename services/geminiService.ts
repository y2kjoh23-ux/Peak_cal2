
import { GoogleGenAI, Type } from "@google/genai";
import { ResourceConfig, AIAdvice } from "../types";

export const getAIAdvice = async (config: ResourceConfig): Promise<AIAdvice> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `
    As a tactical advisor for a high-stakes resource management scenario (similar to Blue Archive or Arknights resource planning), analyze these metrics:
    - Current Resource: ${config.currentAmount}
    - Daily Income: ${config.dailyIncome}
    - Target: ${config.targetAmount}
    - Bonus Multiplier: ${config.bonusPercentage}%

    Calculate the estimated days to reach the target and provide strategic advice on how to optimize this "Peak" efficiency.
    Consider potential pitfalls or optimization strategies for the user (The "Sensei").
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          efficiencyRating: { type: Type.NUMBER },
          estimatedPeakDate: { type: Type.STRING }
        },
        required: ["summary", "recommendations", "efficiencyRating", "estimatedPeakDate"]
      }
    }
  });

  try {
    return JSON.parse(response.text.trim()) as AIAdvice;
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return {
      summary: "Error analyzing strategy. Please try again.",
      recommendations: ["Ensure your inputs are realistic.", "Check your connection."],
      efficiencyRating: 0,
      estimatedPeakDate: "Unknown"
    };
  }
};
