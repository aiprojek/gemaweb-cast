import { AIScript } from "../types";

export class PollinationsService {
  private baseUrl = "https://text.pollinations.ai/";

  private async fetchAI(prompt: string): Promise<string> {
    try {
      // Using a random seed to ensure variety
      const seed = Math.floor(Math.random() * 1000000);
      const response = await fetch(`${this.baseUrl}${encodeURIComponent(prompt)}?seed=${seed}&model=openai`);
      
      if (!response.ok) {
        throw new Error("Failed to reach Pollinations AI");
      }
      return await response.text();
    } catch (error) {
      console.error("Pollinations API Error:", error);
      throw error;
    }
  }

  /**
   * Enhances a simple topic into a detailed prompt description
   */
  async enhancePrompt(simpleTopic: string): Promise<string> {
    const prompt = `
      Act as a creative director for a radio show. 
      Take this simple topic: "${simpleTopic}".
      Rewrite it into a detailed, engaging, and descriptive context for a radio segment. 
      Keep it under 30 words. Just output the description, no quotes.
    `;
    
    return await this.fetchAI(prompt);
  }

  async generateShowScript(topic: string, tone: string): Promise<AIScript> {
    const systemInstruction = `
      You are a professional radio DJ script writer.
      Strictly output ONLY valid JSON. Do not use Markdown code blocks (like \`\`\`json).
      
      Structure:
      {
        "title": "Catchy Segment Title",
        "content": "The spoken script for the DJ (approx 100 words)",
        "suggestedTracks": ["Artist - Song", "Artist - Song", "Artist - Song"]
      }
    `;

    const userPrompt = `
      Topic: ${topic}
      Tone: ${tone}
      
      Write a script based on the above. Ensure the JSON is valid.
    `;

    try {
      const rawText = await this.fetchAI(`${systemInstruction}\n${userPrompt}`);
      
      // Clean up potential markdown leakage
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return JSON.parse(cleanJson) as AIScript;
    } catch (error) {
      console.error("Failed to parse AI response", error);
      throw new Error("AI response was not valid JSON. Please try again.");
    }
  }
}

export const pollinationsService = new PollinationsService();