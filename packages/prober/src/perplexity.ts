import OpenAI from "openai";
import type { ProbeQuery, ProbeResult, Brand } from "./types";
import { scoreResponse } from "./scorer";
import { getSystemPromptForProbing } from "./prompts";

export class PerplexityProber {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = "sonar") {
    this.client = new OpenAI({
      apiKey,
      baseURL: "https://api.perplexity.ai",
    });
    this.model = model;
  }

  async probe(query: ProbeQuery, brand: Brand): Promise<ProbeResult> {
    const startTime = Date.now();

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: getSystemPromptForProbing() },
          { role: "user", content: query.rendered },
        ],
        max_tokens: 2048,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content ?? "";
      const latencyMs = Date.now() - startTime;
      const scored = scoreResponse(response, brand);

      return {
        queryId: query.id,
        brandId: brand.id,
        model: "perplexity",
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
        model: "perplexity",
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
