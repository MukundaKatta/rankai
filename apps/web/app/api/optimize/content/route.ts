import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ContentGenerator, Analyzer } from "@rankai/optimizer";
import type { ContentGap } from "@rankai/optimizer";
import type { Brand as ProberBrand, AuditSummary, ProbeResult, AIModel } from "@rankai/prober";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { brandId, contentType } = await request.json();

    // Get brand
    const { data: brand } = await supabase
      .from("brands")
      .select("*")
      .eq("id", brandId)
      .single();

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // Get latest audit data
    const { data: latestRun } = await supabase
      .from("audit_runs")
      .select("*")
      .eq("brand_id", brandId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    if (!latestRun) {
      return NextResponse.json({ error: "Run an audit first" }, { status: 400 });
    }

    const { data: auditResults } = await supabase
      .from("audit_results")
      .select("*")
      .eq("audit_run_id", latestRun.id);

    const { data: visScore } = await supabase
      .from("visibility_scores")
      .select("*")
      .eq("audit_run_id", latestRun.id)
      .single();

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const proberBrand: ProberBrand = {
      id: brand.id,
      name: brand.name,
      domain: brand.domain,
      vertical: brand.vertical,
      city: brand.city ?? undefined,
      state: brand.state ?? undefined,
      country: brand.country,
      description: brand.description,
      competitors: brand.competitors ?? [],
      keywords: brand.keywords ?? [],
    };

    // Build analysis for the generator
    const probeResults: ProbeResult[] = (auditResults ?? []).map((r) => ({
      queryId: r.id,
      brandId: r.brand_id,
      model: r.model as AIModel,
      query: r.query_rendered,
      response: r.response,
      score: r.visibility_score as ProbeResult["score"],
      numericScore: r.numeric_score,
      mentionPosition: r.mention_position,
      competitorsMentioned: r.competitors_mentioned,
      sentiment: r.sentiment as ProbeResult["sentiment"],
      timestamp: new Date(r.created_at),
      latencyMs: r.latency_ms,
    }));

    const summary: AuditSummary = {
      brandId: brand.id,
      overallScore: Number(visScore?.overall_score ?? 0),
      modelScores: {
        chatgpt: Number(visScore?.chatgpt_score ?? 0),
        claude: Number(visScore?.claude_score ?? 0),
        gemini: Number(visScore?.gemini_score ?? 0),
        perplexity: Number(visScore?.perplexity_score ?? 0),
      },
      categoryScores: (visScore?.category_scores ?? {}) as Record<string, number>,
      totalQueries: auditResults?.length ?? 0,
      mentionRate: Number(visScore?.mention_rate ?? 0),
      recommendationRate: Number(visScore?.recommendation_rate ?? 0),
      topRecommendationRate: Number(visScore?.top_recommendation_rate ?? 0),
      competitorComparison: [],
      strengths: visScore?.strengths ?? [],
      weaknesses: visScore?.weaknesses ?? [],
      timestamp: new Date(),
    };

    const analyzer = new Analyzer(anthropicKey);
    const analysis = await analyzer.analyze(proberBrand, probeResults, summary);

    // Create a content gap for the requested type
    const contentGap: ContentGap = {
      topic: `${brand.name} - ${contentType.replace(/_/g, " ")} for AI visibility`,
      description: `Generate a ${contentType.replace(/_/g, " ")} to improve ${brand.name}'s visibility across AI models. Focus on ${brand.keywords.join(", ")}.`,
      contentType,
      estimatedImpact: "high",
    };

    const generator = new ContentGenerator(anthropicKey);
    const generated = await generator.generateContent(proberBrand, contentGap, analysis);

    // Save to database
    const serviceClient = await createServiceClient();
    const { data: saved } = await serviceClient
      .from("optimized_content")
      .insert({
        brand_id: brandId,
        title: generated.title,
        content_type: contentType,
        content: generated.content,
        meta_description: generated.metaDescription,
        target_keywords: generated.targetKeywords,
        word_count: generated.estimatedWordCount,
        structured_data_suggestion: generated.structuredDataSuggestion,
        internal_linking_suggestions: generated.internalLinkingSuggestions,
        call_to_action: generated.callToAction,
      })
      .select()
      .single();

    return NextResponse.json({
      contentId: saved?.id,
      title: generated.title,
      wordCount: generated.estimatedWordCount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
