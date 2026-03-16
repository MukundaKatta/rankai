import { z } from "zod";

export const AIModelSchema = z.enum(["chatgpt", "claude", "gemini", "perplexity"]);
export type AIModel = z.infer<typeof AIModelSchema>;

export const VisibilityScoreSchema = z.enum(["not_mentioned", "mentioned", "recommended", "top_recommendation"]);
export type VisibilityScore = z.infer<typeof VisibilityScoreSchema>;

export const SCORE_VALUES: Record<VisibilityScore, number> = {
  not_mentioned: 0,
  mentioned: 1,
  recommended: 2,
  top_recommendation: 3,
};

export const VerticalSchema = z.enum([
  "restaurant",
  "hotel",
  "saas",
  "ecommerce",
  "healthcare",
  "legal",
  "real_estate",
  "education",
  "fitness",
  "automotive",
  "financial",
  "travel",
  "home_services",
  "retail",
  "general",
]);
export type Vertical = z.infer<typeof VerticalSchema>;

export interface Brand {
  id: string;
  name: string;
  domain: string;
  vertical: Vertical;
  city?: string;
  state?: string;
  country: string;
  description: string;
  competitors: string[];
  keywords: string[];
}

export interface ProbeQuery {
  id: string;
  brandId: string;
  template: string;
  rendered: string;
  category: QueryCategory;
}

export type QueryCategory =
  | "best_in_category"
  | "recommendation"
  | "review"
  | "comparison"
  | "industry_specific"
  | "how_to"
  | "alternative"
  | "top_list";

export interface ProbeResult {
  queryId: string;
  brandId: string;
  model: AIModel;
  query: string;
  response: string;
  score: VisibilityScore;
  numericScore: number;
  mentionPosition: number | null;
  competitorsMentioned: string[];
  sentiment: "positive" | "neutral" | "negative" | null;
  timestamp: Date;
  latencyMs: number;
}

export interface AuditSummary {
  brandId: string;
  overallScore: number;
  modelScores: Record<AIModel, number>;
  categoryScores: Record<QueryCategory, number>;
  totalQueries: number;
  mentionRate: number;
  recommendationRate: number;
  topRecommendationRate: number;
  competitorComparison: Array<{
    competitor: string;
    mentionCount: number;
    avgScore: number;
  }>;
  strengths: string[];
  weaknesses: string[];
  timestamp: Date;
}

export interface ProberConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  googleAiApiKey?: string;
  perplexityApiKey?: string;
  concurrency?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
}
