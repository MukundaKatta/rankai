import Anthropic from "@anthropic-ai/sdk";
import type { AuditSummary, Brand, ProbeResult } from "@rankai/prober";

export interface AnalysisResult {
  brandId: string;
  visibilityGaps: VisibilityGap[];
  contentGaps: ContentGap[];
  competitiveInsights: CompetitiveInsight[];
  prioritizedActions: PrioritizedAction[];
  overallAssessment: string;
}

export interface VisibilityGap {
  model: string;
  queryCategory: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  suggestedFix: string;
}

export interface ContentGap {
  topic: string;
  description: string;
  contentType: "blog_post" | "faq" | "landing_page" | "case_study" | "comparison" | "guide";
  estimatedImpact: "high" | "medium" | "low";
}

export interface CompetitiveInsight {
  competitor: string;
  advantage: string;
  suggestedCounterStrategy: string;
}

export interface PrioritizedAction {
  rank: number;
  action: string;
  category: "content" | "technical_seo" | "structured_data" | "authority" | "brand_signals";
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  description: string;
}

export class Analyzer {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async analyze(brand: Brand, results: ProbeResult[], summary: AuditSummary): Promise<AnalysisResult> {
    const modelBreakdown = this.buildModelBreakdown(results);
    const categoryBreakdown = this.buildCategoryBreakdown(results);
    const competitorAnalysis = this.buildCompetitorAnalysis(results, brand);

    const analysisPrompt = `You are an AI visibility and GEO (Generative Engine Optimization) expert. Analyze the following AI visibility audit results for a brand and provide detailed, actionable insights.

## Brand Information
- Name: ${brand.name}
- Domain: ${brand.domain}
- Vertical: ${brand.vertical}
- Location: ${[brand.city, brand.state, brand.country].filter(Boolean).join(", ")}
- Description: ${brand.description}
- Keywords: ${brand.keywords.join(", ")}
- Competitors: ${brand.competitors.join(", ")}

## Audit Summary
- Overall Score: ${summary.overallScore}/100
- Total Queries: ${summary.totalQueries}
- Mention Rate: ${Math.round(summary.mentionRate * 100)}%
- Recommendation Rate: ${Math.round(summary.recommendationRate * 100)}%
- Top Recommendation Rate: ${Math.round(summary.topRecommendationRate * 100)}%

## Per-Model Scores
${Object.entries(summary.modelScores).map(([m, s]) => `- ${m}: ${s}/3`).join("\n")}

## Per-Category Scores
${Object.entries(summary.categoryScores).map(([c, s]) => `- ${c}: ${s}/3`).join("\n")}

## Model Breakdown
${modelBreakdown}

## Category Breakdown
${categoryBreakdown}

## Competitor Analysis
${competitorAnalysis}

## Strengths
${summary.strengths.map((s) => `- ${s}`).join("\n") || "None identified"}

## Weaknesses
${summary.weaknesses.map((w) => `- ${w}`).join("\n") || "None identified"}

Provide your analysis in the following JSON format (no markdown, just raw JSON):
{
  "visibilityGaps": [
    {
      "model": "model name",
      "queryCategory": "category",
      "description": "what the gap is",
      "severity": "critical|high|medium|low",
      "suggestedFix": "how to fix it"
    }
  ],
  "contentGaps": [
    {
      "topic": "topic to cover",
      "description": "why this content is needed",
      "contentType": "blog_post|faq|landing_page|case_study|comparison|guide",
      "estimatedImpact": "high|medium|low"
    }
  ],
  "competitiveInsights": [
    {
      "competitor": "competitor name",
      "advantage": "what they do better",
      "suggestedCounterStrategy": "how to compete"
    }
  ],
  "prioritizedActions": [
    {
      "rank": 1,
      "action": "action title",
      "category": "content|technical_seo|structured_data|authority|brand_signals",
      "effort": "low|medium|high",
      "impact": "high|medium|low",
      "description": "detailed description"
    }
  ],
  "overallAssessment": "2-3 paragraph assessment of the brand's AI visibility"
}`;

    const message = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: analysisPrompt }],
    });

    const responseText = message.content[0]?.type === "text" ? message.content[0].text : "{}";

    try {
      const parsed = JSON.parse(responseText);
      return {
        brandId: brand.id,
        visibilityGaps: parsed.visibilityGaps ?? [],
        contentGaps: parsed.contentGaps ?? [],
        competitiveInsights: parsed.competitiveInsights ?? [],
        prioritizedActions: parsed.prioritizedActions ?? [],
        overallAssessment: parsed.overallAssessment ?? "",
      };
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        return {
          brandId: brand.id,
          visibilityGaps: parsed.visibilityGaps ?? [],
          contentGaps: parsed.contentGaps ?? [],
          competitiveInsights: parsed.competitiveInsights ?? [],
          prioritizedActions: parsed.prioritizedActions ?? [],
          overallAssessment: parsed.overallAssessment ?? "",
        };
      }

      return {
        brandId: brand.id,
        visibilityGaps: [],
        contentGaps: [],
        competitiveInsights: [],
        prioritizedActions: [],
        overallAssessment: "Analysis could not be parsed. Raw response available in logs.",
      };
    }
  }

  private buildModelBreakdown(results: ProbeResult[]): string {
    const byModel: Record<string, ProbeResult[]> = {};
    for (const r of results) {
      if (!byModel[r.model]) byModel[r.model] = [];
      byModel[r.model].push(r);
    }

    return Object.entries(byModel)
      .map(([model, modelResults]) => {
        const mentioned = modelResults.filter((r) => r.numericScore >= 1).length;
        const recommended = modelResults.filter((r) => r.numericScore >= 2).length;
        const top = modelResults.filter((r) => r.numericScore >= 3).length;
        return `### ${model}\n- Queries: ${modelResults.length}\n- Mentioned: ${mentioned}\n- Recommended: ${recommended}\n- Top recommendation: ${top}`;
      })
      .join("\n\n");
  }

  private buildCategoryBreakdown(results: ProbeResult[]): string {
    const byCategory: Record<string, ProbeResult[]> = {};
    for (const r of results) {
      const category = r.query.includes("best") ? "best_in_category" :
        r.query.includes("recommend") ? "recommendation" :
        r.query.includes("review") ? "review" :
        r.query.includes("compare") || r.query.includes("vs") ? "comparison" :
        "other";
      if (!byCategory[category]) byCategory[category] = [];
      byCategory[category].push(r);
    }

    return Object.entries(byCategory)
      .map(([cat, catResults]) => {
        const avg = catResults.reduce((s, r) => s + r.numericScore, 0) / catResults.length;
        return `- ${cat}: avg score ${avg.toFixed(2)} (${catResults.length} queries)`;
      })
      .join("\n");
  }

  private buildCompetitorAnalysis(results: ProbeResult[], brand: Brand): string {
    const competitorMentions: Record<string, number> = {};
    for (const r of results) {
      for (const comp of r.competitorsMentioned) {
        competitorMentions[comp] = (competitorMentions[comp] ?? 0) + 1;
      }
    }

    const brandMentions = results.filter((r) => r.numericScore >= 1).length;

    return [
      `- ${brand.name}: mentioned in ${brandMentions}/${results.length} responses`,
      ...Object.entries(competitorMentions)
        .sort(([, a], [, b]) => b - a)
        .map(([comp, count]) => `- ${comp}: mentioned in ${count}/${results.length} responses`),
    ].join("\n");
  }
}
