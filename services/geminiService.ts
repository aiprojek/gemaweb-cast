import { GoogleGenAI, Type } from "@google/genai";
import { AIScript } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateShowScript(topic: string, tone: string): Promise<AIScript> {
    const prompt = `
      Create a short radio broadcast script for a DJ.
      Topic: ${topic}
      Tone: ${tone}
      
      Structure the response as a JSON object with:
      - title: A catchy name for this segment.
      - content: The spoken script for the DJ (approx 100 words).
      - suggestedTracks: A list of 3 real songs that would fit this mood.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              suggestedTracks: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["title", "content", "suggestedTracks"]
          }
        }
      });

      if (response.text) {
        return JSON.parse(response.text) as AIScript;
      }
      throw new Error("Empty response from AI");
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();