import type { Brand, AuditSummary, AIModel } from "@rankai/prober";
import type { AnalysisResult, PrioritizedAction } from "./analyzer";

export interface Recommendation {
  id: string;
  title: string;
  category: PrioritizedAction["category"];
  priority: "critical" | "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  description: string;
  steps: string[];
  estimatedTimeframe: string;
  relatedMetrics: string[];
}

export function generateRecommendations(
  brand: Brand,
  summary: AuditSummary,
  analysis: AnalysisResult
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  let recIndex = 0;

  const addRec = (rec: Omit<Recommendation, "id">) => {
    recommendations.push({ ...rec, id: `rec-${recIndex++}` });
  };

  // Check overall visibility
  if (summary.overallScore < 20) {
    addRec({
      title: "Critical: Brand is nearly invisible to AI models",
      category: "brand_signals",
      priority: "critical",
      effort: "high",
      impact: "high",
      description:
        "Your brand is rarely or never mentioned by AI models. This requires a comprehensive GEO strategy including content creation, structured data implementation, and authority building.",
      steps: [
        "Audit your website for AI-crawlable content",
        "Implement comprehensive Schema.org structured data",
        "Create authoritative, long-form content for each key topic",
        "Build citations on industry-specific directories and platforms",
        "Create a comprehensive FAQ section addressing common queries",
        "Publish comparison content vs known competitors",
      ],
      estimatedTimeframe: "3-6 months",
      relatedMetrics: ["Overall visibility score", "Mention rate", "All model scores"],
    });
  }

  // Check mention rate
  if (summary.mentionRate < 0.3) {
    addRec({
      title: "Increase brand mention rate across AI models",
      category: "content",
      priority: "high",
      effort: "medium",
      impact: "high",
      description: `Only ${Math.round(summary.mentionRate * 100)}% of AI queries mention your brand. Create authoritative content that AI models can reference.`,
      steps: [
        "Publish detailed 'About' and 'What We Do' pages with clear entity descriptions",
        "Create content targeting specific query patterns (e.g., 'Best X in Y' format)",
        "Ensure your brand name appears consistently across all digital properties",
        "List your business on major platforms (Google Business, Yelp, industry directories)",
        "Create Wikipedia-style factual content about your brand's unique value",
      ],
      estimatedTimeframe: "1-3 months",
      relatedMetrics: ["Mention rate", "Brand query scores"],
    });
  }

  // Check recommendation rate
  if (summary.recommendationRate < 0.15 && summary.mentionRate >= 0.3) {
    addRec({
      title: "Upgrade from mentions to recommendations",
      category: "authority",
      priority: "high",
      effort: "medium",
      impact: "high",
      description: `Your brand is mentioned but rarely recommended. Focus on building authority signals.`,
      steps: [
        "Collect and prominently display customer reviews and testimonials",
        "Publish case studies with specific metrics and outcomes",
        "Seek coverage in industry publications and authoritative websites",
        "Create comparison content highlighting your advantages",
        "Build a robust review presence on Google, G2, Trustpilot, etc.",
      ],
      estimatedTimeframe: "2-4 months",
      relatedMetrics: ["Recommendation rate", "Sentiment analysis"],
    });
  }

  // Per-model analysis
  const models: AIModel[] = ["chatgpt", "claude", "gemini", "perplexity"];
  for (const model of models) {
    const score = summary.modelScores[model];
    if (score < 0.5 && score >= 0) {
      addRec({
        title: `Improve visibility on ${model}`,
        category: "content",
        priority: "medium",
        effort: "medium",
        impact: "medium",
        description: `Your brand scores poorly on ${model} (${score}/3). Different AI models weight different signals.`,
        steps: getModelSpecificSteps(model),
        estimatedTimeframe: "1-2 months",
        relatedMetrics: [`${model} score`, `${model} mention rate`],
      });
    }
  }

  // Structured data recommendations
  addRec({
    title: "Implement comprehensive Schema.org structured data",
    category: "structured_data",
    priority: summary.overallScore < 40 ? "high" : "medium",
    effort: "low",
    impact: "medium",
    description:
      "Structured data helps AI models understand your business entity, offerings, and authority. Implement JSON-LD markup on all key pages.",
    steps: [
      "Add Organization schema to your homepage",
      `Add ${brand.vertical === "restaurant" ? "Restaurant" : brand.vertical === "saas" ? "SoftwareApplication" : "LocalBusiness"} schema`,
      "Implement FAQPage schema on your FAQ/support pages",
      "Add Product/Service schema to your offering pages",
      "Add Review/AggregateRating schema where applicable",
      "Add BreadcrumbList schema for site navigation",
      "Validate all markup using Google's Rich Results Test",
    ],
    estimatedTimeframe: "1-2 weeks",
    relatedMetrics: ["Overall visibility score", "Structured data coverage"],
  });

  // Content gap recommendations from analysis
  for (const gap of analysis.contentGaps.slice(0, 5)) {
    addRec({
      title: `Create ${gap.contentType.replace(/_/g, " ")}: ${gap.topic}`,
      category: "content",
      priority: gap.estimatedImpact === "high" ? "high" : "medium",
      effort: gap.contentType === "faq" ? "low" : "medium",
      impact: gap.estimatedImpact,
      description: gap.description,
      steps: getContentCreationSteps(gap.contentType),
      estimatedTimeframe: gap.contentType === "faq" ? "1 week" : "2-3 weeks",
      relatedMetrics: ["Content coverage", "Query-specific scores"],
    });
  }

  // Competitive insights
  for (const insight of analysis.competitiveInsights.slice(0, 3)) {
    addRec({
      title: `Competitive action: Counter ${insight.competitor}`,
      category: "content",
      priority: "medium",
      effort: "medium",
      impact: "medium",
      description: `${insight.advantage}. ${insight.suggestedCounterStrategy}`,
      steps: [
        `Analyze ${insight.competitor}'s content strategy and digital presence`,
        "Create comparison content highlighting your unique advantages",
        "Address the specific areas where they outperform you",
        "Build authority in the shared category space",
      ],
      estimatedTimeframe: "1-2 months",
      relatedMetrics: ["Competitor comparison scores", "Category-specific scores"],
    });
  }

  // Sort by priority
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations;
}

function getModelSpecificSteps(model: AIModel): string[] {
  switch (model) {
    case "chatgpt":
      return [
        "Ensure your brand appears on Wikipedia or Wikidata if eligible",
        "Maintain an active presence on platforms OpenAI may train on",
        "Create comprehensive, well-structured content with clear headings",
        "Focus on factual, verifiable claims with citations",
        "Build presence on Reddit, Stack Overflow, and community platforms",
      ];
    case "claude":
      return [
        "Create high-quality, nuanced content that demonstrates expertise",
        "Focus on comprehensive, well-reasoned comparisons and analyses",
        "Build presence on authoritative industry publications",
        "Ensure factual accuracy and provide evidence for claims",
        "Create long-form guides that thoroughly cover topics",
      ];
    case "gemini":
      return [
        "Optimize your Google Business Profile completely",
        "Ensure strong presence on Google-indexed platforms",
        "Build quality backlinks from authoritative domains",
        "Create content optimized for Google's Knowledge Graph",
        "Maintain active YouTube presence with branded content",
      ];
    case "perplexity":
      return [
        "Focus on recent, up-to-date content (Perplexity searches the live web)",
        "Ensure your website is fast, accessible, and well-structured",
        "Create content that directly answers common questions",
        "Build citations on news sites and industry publications",
        "Maintain active blog with regular, high-quality posts",
      ];
  }
}

function getContentCreationSteps(contentType: string): string[] {
  switch (contentType) {
    case "blog_post":
      return [
        "Research the topic thoroughly with keyword analysis",
        "Write a 1500-2500 word authoritative article",
        "Include specific data points, statistics, and expert insights",
        "Optimize headings for featured snippets and AI extraction",
        "Add Schema.org Article markup",
        "Promote through social media and email",
      ];
    case "faq":
      return [
        "Research the top 20-30 questions in your space",
        "Write concise, direct answers (2-4 sentences each)",
        "Organize by topic/category",
        "Implement FAQPage Schema.org markup",
        "Link to detailed guides for complex topics",
      ];
    case "landing_page":
      return [
        "Define clear value proposition and target audience",
        "Write compelling above-fold copy with key benefits",
        "Include social proof (reviews, testimonials, logos)",
        "Create feature comparison sections",
        "Add clear CTAs and conversion paths",
        "Implement relevant Schema.org markup",
      ];
    case "case_study":
      return [
        "Select a compelling customer success story",
        "Structure with Challenge / Solution / Results framework",
        "Include specific metrics and data points",
        "Add direct quotes from the customer",
        "Create a downloadable PDF version",
      ];
    case "comparison":
      return [
        "Research competitor features and pricing",
        "Create honest feature comparison tables",
        "Highlight your unique differentiators",
        "Include real user reviews and feedback",
        "Address common objections directly",
        "Add structured data for product comparisons",
      ];
    case "guide":
      return [
        "Outline comprehensive coverage of the topic",
        "Write 2000-3500 words with expert insights",
        "Include step-by-step instructions where applicable",
        "Add visuals, diagrams, and examples",
        "Create downloadable resources (checklists, templates)",
        "Update regularly to maintain freshness",
      ];
    default:
      return [
        "Research the topic and target audience",
        "Create high-quality, comprehensive content",
        "Optimize for both search engines and AI models",
        "Add relevant structured data markup",
        "Promote through appropriate channels",
      ];
  }
}
