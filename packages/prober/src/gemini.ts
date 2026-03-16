import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ProbeQuery, ProbeResult, Brand } from "./types";
import { scoreResponse } from "./scorer";
import { getSystemPromptForProbing } from "./prompts";

export class GeminiProber {
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model: string = "gemini-2.0-flash") {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async probe(query: ProbeQuery, brand: Brand): Promise<ProbeResult> {
    const startTime = Date.now();

    try {
      const genModel = this.client.getGenerativeModel({
        model: this.model,
        systemInstruction: getSystemPromptForProbing(),
      });

      const result = await genModel.generateContent(query.rendered);
      const response = result.response.text();
      const latencyMs = Date.now() - startTime;
      const scored = scoreResponse(response, brand);

      return {
        queryId: query.id,
        brandId: brand.id,
        model: "gemini",
        query: query.rendered,
        response,
        score: scored.score,
        numericScore: scored.numericScore,
        mentionPosition: scored.mentionPosition,
        competitorsMentioned: scored.competitorsMentioned,
        sentiment: scored.sentiment,
        timestamp: new Date(),
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      return {
        queryId: query.id,
        brandId: brand.id,
        model: "gemini",
        query: query.rendered,
        response: `[ERROR] ${errorMessage}`,
        score: "not_mentioned",
        numericScore: 0,
        mentionPosition: null,
        competitorsMentioned: [],
        sentiment: null,
        timestamp: new Date(),
        latencyMs,
      };
    }
  }

  async probeAll(queries: ProbeQuery[], brand: Brand, concurrency: number = 3): Promise<ProbeResult[]> {
    const results: ProbeResult[] = [];
    const queue = [...queries];

    const workers = Array.from({ length: concurrency }, async () => {
      while (queue.length > 0) {
        const query = queue.shift();
        if (!query) break;
        const result = await this.probe(query, brand);
        results.push(result);
      }
    });

    await Promise.all(workers);
    return results;
  }
}
