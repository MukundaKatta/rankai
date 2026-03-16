import type { Brand, VisibilityScore } from "./types";
import { SCORE_VALUES } from "./types";

interface ScoringResult {
  score: VisibilityScore;
  numericScore: number;
  mentionPosition: number | null;
  competitorsMentioned: string[];
  sentiment: "positive" | "neutral" | "negative" | null;
}

const POSITIVE_INDICATORS = [
  "highly recommend",
  "top choice",
  "best option",
  "excellent",
  "outstanding",
  "leading",
  "premier",
  "top-rated",
  "first choice",
  "go-to",
  "standout",
  "exceptional",
  "renowned",
  "well-known for",
  "trusted",
  "popular choice",
  "favorite",
  "widely regarded",
  "industry leader",
  "market leader",
];

const NEGATIVE_INDICATORS = [
  "not recommended",
  "avoid",
  "poor",
  "controversial",
  "complaints",
  "issues with",
  "problems with",
  "negative reviews",
  "mixed reviews",
  "inconsistent",
  "declining",
  "struggling",
  "criticized",
  "overpriced",
  "underwhelming",
];

const TOP_RECOMMENDATION_PATTERNS = [
  /(?:^|\n)\s*(?:1\.|#1|first(?:ly)?)[.:\s]/im,
  /\btop (?:pick|choice|recommendation)\b/i,
  /\bhighly recommend\b/i,
  /\bbest (?:option|choice|pick)\b/i,
  /\bmy (?:top|#1|number one) recommendation\b/i,
  /\bstands? out as (?:the )?(?:best|top|leading)\b/i,
  /\bfirst (?:and foremost|on the list|on my list)\b/i,
];

const RECOMMENDATION_PATTERNS = [
  /\brecommend\b/i,
  /\bgreat (?:option|choice)\b/i,
  /\bworth (?:considering|checking out|looking into)\b/i,
  /\bgood (?:option|choice|pick)\b/i,
  /\bsolid (?:option|choice|pick)\b/i,
  /\bnotable\b/i,
  /\bwell[- ]regarded\b/i,
  /\breputable\b/i,
  /\btrusted\b/i,
];

function escapeBrandForRegex(brand: string): string {
  return brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findBrandMention(text: string, brandName: string): { found: boolean; position: number | null } {
  const escaped = escapeBrandForRegex(brandName);
  const regex = new RegExp(`\\b${escaped}\\b`, "gi");
  const match = regex.exec(text);

  if (!match) {
    return { found: false, position: null };
  }

  // Calculate position as percentage through the text
  const position = Math.round((match.index / text.length) * 100);
  return { found: true, position };
}

function findBrandInList(text: string, brandName: string): number | null {
  const escaped = escapeBrandForRegex(brandName);
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check for numbered list items mentioning the brand
    const listMatch = line.match(/^\s*(?:(\d+)[.):]\s|[-*]\s)/);
    if (listMatch && new RegExp(`\\b${escaped}\\b`, "i").test(line)) {
      return listMatch[1] ? parseInt(listMatch[1], 10) : i + 1;
    }
  }

  return null;
}

function analyzeSentiment(text: string, brandName: string): "positive" | "neutral" | "negative" | null {
  const escaped = escapeBrandForRegex(brandName);
  // Extract sentences containing the brand name
  const sentences = text.split(/[.!?]+/).filter((s) =>
    new RegExp(`\\b${escaped}\\b`, "i").test(s)
  );

  if (sentences.length === 0) return null;

  const brandContext = sentences.join(" ").toLowerCase();

  let positiveCount = 0;
  let negativeCount = 0;

  for (const indicator of POSITIVE_INDICATORS) {
    if (brandContext.includes(indicator)) positiveCount++;
  }

  for (const indicator of NEGATIVE_INDICATORS) {
    if (brandContext.includes(indicator)) negativeCount++;
  }

  if (positiveCount > negativeCount && positiveCount > 0) return "positive";
  if (negativeCount > positiveCount && negativeCount > 0) return "negative";
  if (positiveCount > 0 || negativeCount > 0) return "neutral";
  return "neutral";
}

function findCompetitors(text: string, competitors: string[]): string[] {
  const found: string[] = [];

  for (const competitor of competitors) {
    const escaped = escapeBrandForRegex(competitor);
    if (new RegExp(`\\b${escaped}\\b`, "i").test(text)) {
      found.push(competitor);
    }
  }

  return found;
}

function isTopRecommendation(text: string, brandName: string): boolean {
  const escaped = escapeBrandForRegex(brandName);

  // Check if brand is #1 in a numbered list
  const listPosition = findBrandInList(text, brandName);
  if (listPosition === 1) return true;

  // Check for top recommendation patterns near the brand mention
  const brandRegex = new RegExp(`\\b${escaped}\\b`, "gi");
  const match = brandRegex.exec(text);
  if (!match) return false;

  // Get context around the brand mention (300 chars before and after)
  const start = Math.max(0, match.index - 300);
  const end = Math.min(text.length, match.index + brandName.length + 300);
  const context = text.substring(start, end);

  for (const pattern of TOP_RECOMMENDATION_PATTERNS) {
    if (pattern.test(context)) return true;
  }

  return false;
}

function isRecommended(text: string, brandName: string): boolean {
  const escaped = escapeBrandForRegex(brandName);
  const brandRegex = new RegExp(`\\b${escaped}\\b`, "gi");
  const match = brandRegex.exec(text);
  if (!match) return false;

  const start = Math.max(0, match.index - 300);
  const end = Math.min(text.length, match.index + brandName.length + 300);
  const context = text.substring(start, end);

  for (const pattern of RECOMMENDATION_PATTERNS) {
    if (pattern.test(context)) return true;
  }

  // Also check if brand is in a list (any position)
  const listPosition = findBrandInList(text, brandName);
  return listPosition !== null;
}

export function scoreResponse(response: string, brand: Brand): ScoringResult {
  const { found, position } = findBrandMention(response, brand.name);

  if (!found) {
    // Also check for domain mention
    const domainMention = findBrandMention(response, brand.domain);
    if (!domainMention.found) {
      return {
        score: "not_mentioned",
        numericScore: SCORE_VALUES.not_mentioned,
        mentionPosition: null,
        competitorsMentioned: findCompetitors(response, brand.competitors),
        sentiment: null,
      };
    }
  }

  const competitorsMentioned = findCompetitors(response, brand.competitors);
  const sentiment = analyzeSentiment(response, brand.name) ?? analyzeSentiment(response, brand.domain);

  if (isTopRecommendation(response, brand.name)) {
    return {
      score: "top_recommendation",
      numericScore: SCORE_VALUES.top_recommendation,
      mentionPosition: position ?? findBrandMention(response, brand.domain).position,
      competitorsMentioned,
      sentiment,
    };
  }

  if (isRecommended(response, brand.name)) {
    return {
      score: "recommended",
      numericScore: SCORE_VALUES.recommended,
      mentionPosition: position ?? findBrandMention(response, brand.domain).position,
      competitorsMentioned,
      sentiment,
    };
  }

  return {
    score: "mentioned",
    numericScore: SCORE_VALUES.mentioned,
    mentionPosition: position ?? findBrandMention(response, brand.domain).position,
    competitorsMentioned,
    sentiment,
  };
}

export function computeAuditScore(results: ScoringResult[]): number {
  if (results.length === 0) return 0;
  const total = results.reduce((sum, r) => sum + r.numericScore, 0);
  const maxPossible = results.length * SCORE_VALUES.top_recommendation;
  return Math.round((total / maxPossible) * 100);
}
