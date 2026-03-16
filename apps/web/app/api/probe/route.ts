import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Prober, type Brand as ProberBrand } from "@rankai/prober";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { brandId, models } = await request.json();

    const { data: brand } = await supabase
      .from("brands")
      .select("*")
      .eq("id", brandId)
      .single();

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
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

    const prober = new Prober({
      openaiApiKey: process.env.OPENAI_API_KEY,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      googleAiApiKey: process.env.GOOGLE_AI_API_KEY,
      perplexityApiKey: process.env.PERPLEXITY_API_KEY,
      concurrency: 2,
    });

    const { results, summary } = await prober.runAudit(proberBrand, models);

    return NextResponse.json({
      results: results.map((r) => ({
        model: r.model,
        query: r.query,
        score: r.score,
        numericScore: r.numericScore,
        sentiment: r.sentiment,
        competitorsMentioned: r.competitorsMentioned,
        latencyMs: r.latencyMs,
      })),
      summary: {
        overallScore: summary.overallScore,
        modelScores: summary.modelScores,
        mentionRate: summary.mentionRate,
        recommendationRate: summary.recommendationRate,
        strengths: summary.strengths,
        weaknesses: summary.weaknesses,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
