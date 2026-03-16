import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Analyzer } from "@rankai/optimizer";
import { generateRecommendations } from "@rankai/optimizer";
import type { Brand as ProberBrand, AuditSummary, ProbeResult, AIModel } from "@rankai/prober";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { brandId } = await request.json();

    // Get brand
    const { data: brand } = await supabase
      .from("brands")
      .select("*")
      .eq("id", brandId)
      .single();

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // Get latest audit results
    const { data: latestRun } = await supabase
      .from("audit_runs")
      .select("*")
      .eq("brand_id", brandId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    if (!latestRun) {
      return NextResponse.json({ error: "No completed audit found. Run an audit first." }, { status: 400 });
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

    if (!auditResults || !visScore) {
      return NextResponse.json({ error: "Audit data incomplete" }, { status: 400 });
    }

    // Build prober types
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

    const probeResults: ProbeResult[] = auditResults.map((r) => ({
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
      overallScore: Number(visScore.overall_score),
      modelScores: {
        chatgpt: Number(visScore.chatgpt_score),
        claude: Number(visScore.claude_score),
        gemini: Number(visScore.gemini_score),
        perplexity: Number(visScore.perplexity_score),
      },
      categoryScores: visScore.category_scores as Record<string, number>,
      totalQueries: auditResults.length,
      mentionRate: Number(visScore.mention_rate),
      recommendationRate: Number(visScore.recommendation_rate),
      topRecommendationRate: Number(visScore.top_recommendation_rate),
      competitorComparison: [],
      strengths: visScore.strengths,
      weaknesses: visScore.weaknesses,
      timestamp: new Date(visScore.created_at),
    };

    // Run analysis with Claude
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const analyzer = new Analyzer(anthropicKey);
    const analysis = await analyzer.analyze(proberBrand, probeResults, summary);

    // Generate recommendations
    const recs = generateRecommendations(proberBrand, summary, analysis);

    const serviceClient = await createServiceClient();

    // Save analysis
    const { data: analysisRecord } = await serviceClient
      .from("analysis_results")
      .insert({
        brand_id: brandId,
        audit_run_id: latestRun.id,
        visibility_gaps: analysis.visibilityGaps,
        content_gaps: analysis.contentGaps,
        competitive_insights: analysis.competitiveInsights,
        prioritized_actions: analysis.prioritizedActions,
        overall_assessment: analysis.overallAssessment,
      })
      .select()
      .single();

    // Save recommendations
    const recsToInsert = recs.map((rec) => ({
      brand_id: brandId,
      analysis_id: analysisRecord?.id ?? null,
      title: rec.title,
      category: rec.category,
      priority: rec.priority,
      effort: rec.effort,
      impact: rec.impact,
      description: rec.description,
      steps: rec.steps,
      estimated_timeframe: rec.estimatedTimeframe,
      related_metrics: rec.relatedMetrics,
    }));

    await serviceClient.from("recommendations").insert(recsToInsert);

    return NextResponse.json({
      analysisId: analysisRecord?.id,
      recommendationCount: recs.length,
      assessment: analysis.overallAssessment,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
