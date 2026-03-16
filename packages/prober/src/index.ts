import type { AIModel, AuditSummary, Brand, ProbeResult, ProberConfig, QueryCategory } from "./types";
import { SCORE_VALUES } from "./types";
import { ChatGPTProber } from "./chatgpt";
import { ClaudeProber } from "./claude";
import { GeminiProber } from "./gemini";
import { PerplexityProber } from "./perplexity";
import { generateProbeQueries } from "./prompts";
import { computeAuditScore } from "./scorer";

export { ChatGPTProber } from "./chatgpt";
export { ClaudeProber } from "./claude";
export { GeminiProber } from "./gemini";
export { PerplexityProber } from "./perplexity";
export { generateProbeQueries, getSystemPromptForProbing } from "./prompts";
export { scoreResponse, computeAuditScore } from "./scorer";
export * from "./types";

export class Prober {
  private chatgpt?: ChatGPTProber;
  private claude?: ClaudeProber;
  private gemini?: GeminiProber;
  private perplexity?: PerplexityProber;
  private concurrency: number;

  constructor(config: ProberConfig) {
    if (config.openaiApiKey) {
      this.chatgpt = new ChatGPTProber(config.openaiApiKey);
    }
    if (config.anthropicApiKey) {
      this.claude = new ClaudeProber(config.anthropicApiKey);
    }
    if (config.googleAiApiKey) {
      this.gemini = new GeminiProber(config.googleAiApiKey);
    }
    if (config.perplexityApiKey) {
      this.perplexity = new PerplexityProber(config.perplexityApiKey);
    }
    this.concurrency = config.concurrency ?? 3;
  }

  get availableModels(): AIModel[] {
    const models: AIModel[] = [];
    if (this.chatgpt) models.push("chatgpt");
    if (this.claude) models.push("claude");
    if (this.gemini) models.push("gemini");
    if (this.perplexity) models.push("perplexity");
    return models;
  }

  async runAudit(brand: Brand, models?: AIModel[]): Promise<{ results: ProbeResult[]; summary: AuditSummary }> {
    const queries = generateProbeQueries(brand);
    const targetModels = models ?? this.availableModels;
    const allResults: ProbeResult[] = [];

    for (const model of targetModels) {
      const prober = this.getProber(model);
      if (!prober) continue;

      const results = await prober.probeAll(queries, brand, this.concurrency);
      allResults.push(...results);
    }

    const summary = this.computeSummary(brand, allResults);
    return { results: allResults, summary };
  }

  async runSingleModel(brand: Brand, model: AIModel): Promise<ProbeResult[]> {
    const queries = generateProbeQueries(brand);
    const prober = this.getProber(model);
    if (!prober) {
      throw new Error(`Model ${model} is not configured. Provide the API key.`);
    }
    return prober.probeAll(queries, brand, this.concurrency);
  }

  private getProber(model: AIModel) {
    switch (model) {
      case "chatgpt": return this.chatgpt;
      case "claude": return this.claude;
      case "gemini": return this.gemini;
      case "perplexity": return this.perplexity;
    }
  }

  private computeSummary(brand: Brand, results: ProbeResult[]): AuditSummary {
    const modelScores: Record<string, number[]> = {};
    const categoryScores: Record<string, number[]> = {};
    const competitorCounts: Record<string, { mentions: number; scores: number[] }> = {};

    for (const result of results) {
      // Model scores
      if (!modelScores[result.model]) modelScores[result.model] = [];
      modelScores[result.model].push(result.numericScore);

      // Competitor tracking
      for (const comp of result.competitorsMentioned) {
        if (!competitorCounts[comp]) competitorCounts[comp] = { mentions: 0, scores: [] };
        competitorCounts[comp].mentions++;
        competitorCounts[comp].scores.push(result.numericScore);
      }
    }

    // Compute category scores from queries
    const queries = generateProbeQueries(brand);
    for (const result of results) {
      const query = queries.find((q) => q.id === result.queryId);
      if (query) {
        if (!categoryScores[query.category]) categoryScores[query.category] = [];
        categoryScores[query.category].push(result.numericScore);
      }
    }

    const avgScores = (scores: number[]) =>
      scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : 0;

    const mentionedResults = results.filter((r) => r.numericScore >= SCORE_VALUES.mentioned);
    const recommendedResults = results.filter((r) => r.numericScore >= SCORE_VALUES.recommended);
    const topResults = results.filter((r) => r.numericScore >= SCORE_VALUES.top_recommendation);

    const modelScoresAvg: Record<AIModel, number> = {
      chatgpt: avgScores(modelScores["chatgpt"] ?? []),
      claude: avgScores(modelScores["claude"] ?? []),
      gemini: avgScores(modelScores["gemini"] ?? []),
      perplexity: avgScores(modelScores["perplexity"] ?? []),
    };

    const categoryScoresAvg = Object.fromEntries(
      Object.entries(categoryScores).map(([k, v]) => [k, avgScores(v)])
    ) as Record<QueryCategory, number>;

    // Determine strengths and weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    const overallScore = computeAuditScore(results.map((r) => ({
      score: r.score,
      numericScore: r.numericScore,
      mentionPosition: r.mentionPosition,
      competitorsMentioned: r.competitorsMentioned,
      sentiment: r.sentiment,
    })));

    // Analyze per-model performance
    for (const [model, score] of Object.entries(modelScoresAvg)) {
      if (score >= 2) strengths.push(`Strong presence on ${model} (avg score: ${score})`);
      else if (score < 1 && (modelScores[model]?.length ?? 0) > 0) weaknesses.push(`Low visibility on ${model} (avg score: ${score})`);
    }

    // Analyze categories
    for (const [category, score] of Object.entries(categoryScoresAvg)) {
      if (score >= 2) strengths.push(`Well ranked for "${category.replace(/_/g, " ")}" queries`);
      else if (score < 0.5) weaknesses.push(`Poorly ranked for "${category.replace(/_/g, " ")}" queries`);
    }

    if (results.length > 0 && mentionedResults.length / results.length > 0.7) {
      strengths.push("High mention rate across AI models");
    }
    if (results.length > 0 && mentionedResults.length / results.length < 0.3) {
      weaknesses.push("Low mention rate - brand is largely invisible to AI");
    }

    const mentionRate = results.length > 0 ? mentionedResults.length / results.length : 0;
    const recommendationRate = results.length > 0 ? recommendedResults.length / results.length : 0;
    const topRecommendationRate = results.length > 0 ? topResults.length / results.length : 0;

    return {
      brandId: brand.id,
      overallScore,
      modelScores: modelScoresAvg,
      categoryScores: categoryScoresAvg,
      totalQueries: results.length,
      mentionRate: Math.round(mentionRate * 100) / 100,
      recommendationRate: Math.round(recommendationRate * 100) / 100,
      topRecommendationRate: Math.round(topRecommendationRate * 100) / 100,
      competitorComparison: Object.entries(competitorCounts)
        .map(([competitor, data]) => ({
          competitor,
          mentionCount: data.mentions,
          avgScore: avgScores(data.scores),
        }))
        .sort((a, b) => b.mentionCount - a.mentionCount),
      strengths,
      weaknesses,
      timestamp: new Date(),
    };
  }
}
