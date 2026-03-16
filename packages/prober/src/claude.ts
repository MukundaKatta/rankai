import Anthropic from "@anthropic-ai/sdk";
import type { ProbeQuery, ProbeResult, Brand } from "./types";
import { scoreResponse } from "./scorer";
import { getSystemPromptForProbing } from "./prompts";

export class ClaudeProber {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = "claude-sonnet-4-20250514") {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async probe(query: ProbeQuery, brand: Brand): Promise<ProbeResult> {
    const startTime = Date.now();

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 2048,
        system: getSystemPromptForProbing(),
        messages: [{ role: "user", content: query.rendered }],
      });

      const response =
        message.content[0]?.type === "text" ? message.content[0].text : "";
      const latencyMs = Date.now() - startTime;
      const scored = scoreResponse(response, brand);

      return {
        queryId: query.id,
        brandId: brand.id,
        model: "claude",
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
        model: "claude",
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
