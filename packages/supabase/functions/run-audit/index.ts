import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY") ?? "";
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY") ?? "";

interface Brand {
  id: string;
  name: string;
  domain: string;
  vertical: string;
  city: string | null;
  state: string | null;
  country: string;
  description: string;
  keywords: string[];
  competitors: string[];
}

interface QueryTemplate {
  template: string;
  category: string;
}

const PROBE_TEMPLATES: QueryTemplate[] = [
  { template: "What is the best {category} in {city}?", category: "best_in_category" },
  { template: "Top 10 {category} companies in {country}", category: "top_list" },
  { template: "Recommend a {category} near {location}", category: "recommendation" },
  { template: "What do people say about {brand}?", category: "review" },
  { template: "Is {brand} good? What are the reviews?", category: "review" },
  { template: "{brand} reviews and reputation", category: "review" },
  { template: "Which {category} should I choose in {city}?", category: "recommendation" },
  { template: "Who are the top {category} providers?", category: "top_list" },
  { template: "I need a {category} recommendation for {city}", category: "recommendation" },
  { template: "Best rated {category} services", category: "best_in_category" },
  { template: "Best {keywords} in {city}", category: "best_in_category" },
  { template: "Top rated {keywords} services in {location}", category: "top_list" },
  { template: "How to find the best {keywords} provider", category: "how_to" },
  { template: "What are alternatives to {competitor}?", category: "alternative" },
  { template: "Compare {brand} vs {competitor}", category: "comparison" },
];

function renderTemplate(template: string, brand: Brand, competitor?: string): string {
  const keyword = brand.keywords.length > 0 ? brand.keywords[Math.floor(Math.random() * brand.keywords.length)] : brand.vertical;
  const location = [brand.city, brand.state, brand.country].filter(Boolean).join(", ");

  return template
    .replace(/\{brand\}/g, brand.name)
    .replace(/\{category\}/g, brand.vertical.replace(/_/g, " "))
    .replace(/\{city\}/g, brand.city ?? brand.country)
    .replace(/\{country\}/g, brand.country)
    .replace(/\{location\}/g, location)
    .replace(/\{keywords\}/g, keyword)
    .replace(/\{competitor\}/g, competitor ?? "competitors");
}

function scoreBrandMention(response: string, brand: Brand): { score: string; numericScore: number; position: number | null; competitorsMentioned: string[]; sentiment: string | null } {
  const lowerResponse = response.toLowerCase();
  const brandLower = brand.name.toLowerCase();
  const domainLower = brand.domain.toLowerCase();

  const brandIndex = lowerResponse.indexOf(brandLower);
  const domainIndex = lowerResponse.indexOf(domainLower);
  const found = brandIndex !== -1 || domainIndex !== -1;
  const position = found ? Math.round(((brandIndex !== -1 ? brandIndex : domainIndex) / response.length) * 100) : null;

  const competitorsMentioned = brand.competitors.filter(c => lowerResponse.includes(c.toLowerCase()));

  if (!found) {
    return { score: "not_mentioned", numericScore: 0, position: null, competitorsMentioned, sentiment: null };
  }

  // Check for top recommendation signals
  const topPatterns = [/\b(?:1\.|#1|top pick|best option|highly recommend|first choice|number one)\b/i];
  const isTop = topPatterns.some(p => p.test(response));

  // Check if brand appears as #1 in a numbered list
  const lines = response.split("\n");
  let isFirstInList = false;
  for (const line of lines) {
    if (/^\s*1[.):]\s/.test(line) && new RegExp(brand.name, "i").test(line)) {
      isFirstInList = true;
      break;
    }
  }

  const recommendPatterns = [/\brecommend\b/i, /\bgreat (?:option|choice)\b/i, /\bworth (?:considering|checking)\b/i, /\bnotable\b/i];
  const isRecommended = recommendPatterns.some(p => p.test(response));

  // Sentiment
  const positiveWords = ["excellent", "outstanding", "trusted", "leading", "popular", "renowned"];
  const negativeWords = ["poor", "avoid", "complaints", "issues", "problematic"];
  const posCount = positiveWords.filter(w => lowerResponse.includes(w)).length;
  const negCount = negativeWords.filter(w => lowerResponse.includes(w)).length;
  const sentiment = posCount > negCount ? "positive" : negCount > posCount ? "negative" : "neutral";

  if (isTop || isFirstInList) {
    return { score: "top_recommendation", numericScore: 3, position, competitorsMentioned, sentiment };
  }
  if (isRecommended) {
    return { score: "recommended", numericScore: 2, position, competitorsMentioned, sentiment };
  }
  return { score: "mentioned", numericScore: 1, position, competitorsMentioned, sentiment };
}

async function queryOpenAI(prompt: string): Promise<{ response: string; latencyMs: number }> {
  const start = Date.now();
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful assistant providing recommendations and information. Mention specific businesses by name when relevant." },
        { role: "user", content: prompt },
      ],
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });
  const data = await res.json();
  return { response: data.choices?.[0]?.message?.content ?? "", latencyMs: Date.now() - start };
}

async function queryClaude(prompt: string): Promise<{ response: string; latencyMs: number }> {
  const start = Date.now();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = data.content?.[0]?.type === "text" ? data.content[0].text : "";
  return { response: text, latencyMs: Date.now() - start };
}

async function queryGemini(prompt: string): Promise<{ response: string; latencyMs: number }> {
  const start = Date.now();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return { response: text, latencyMs: Date.now() - start };
}

async function queryPerplexity(prompt: string): Promise<{ response: string; latencyMs: number }> {
  const start = Date.now();
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${PERPLEXITY_API_KEY}` },
    body: JSON.stringify({
      model: "sonar",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048,
    }),
  });
  const data = await res.json();
  return { response: data.choices?.[0]?.message?.content ?? "", latencyMs: Date.now() - start };
}

const MODEL_QUERY_FNS: Record<string, (prompt: string) => Promise<{ response: string; latencyMs: number }>> = {
  chatgpt: queryOpenAI,
  claude: queryClaude,
  gemini: queryGemini,
  perplexity: queryPerplexity,
};

serve(async (req) => {
  try {
    const { audit_run_id } = await req.json();

    if (!audit_run_id) {
      return new Response(JSON.stringify({ error: "audit_run_id is required" }), { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the audit run
    const { data: auditRun, error: runError } = await supabase
      .from("audit_runs")
      .select("*")
      .eq("id", audit_run_id)
      .single();

    if (runError || !auditRun) {
      return new Response(JSON.stringify({ error: "Audit run not found" }), { status: 404 });
    }

    // Get the brand
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("*")
      .eq("id", auditRun.brand_id)
      .single();

    if (brandError || !brand) {
      return new Response(JSON.stringify({ error: "Brand not found" }), { status: 404 });
    }

    // Mark audit as running
    await supabase
      .from("audit_runs")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", audit_run_id);

    // Generate queries
    const queries: Array<{ template: string; rendered: string; category: string }> = [];

    for (const tpl of PROBE_TEMPLATES) {
      queries.push({
        template: tpl.template,
        rendered: renderTemplate(tpl.template, brand),
        category: tpl.category,
      });
    }

    // Add competitor-specific queries
    for (const comp of (brand.competitors || []).slice(0, 5)) {
      queries.push({
        template: "Compare {brand} vs {competitor}",
        rendered: renderTemplate("Compare {brand} vs {competitor}", brand, comp),
        category: "comparison",
      });
      queries.push({
        template: "What are the best alternatives to {competitor}?",
        rendered: renderTemplate("What are the best alternatives to {competitor}?", brand, comp),
        category: "alternative",
      });
    }

    // Update total queries count
    const models = auditRun.models_queried || ["chatgpt", "claude", "gemini", "perplexity"];
    const totalQueries = queries.length * models.length;
    await supabase.from("audit_runs").update({ total_queries: totalQueries }).eq("id", audit_run_id);

    // Run queries against each model
    let completedQueries = 0;
    const allResults: Array<Record<string, unknown>> = [];

    for (const model of models) {
      const queryFn = MODEL_QUERY_FNS[model];
      if (!queryFn) continue;

      // Check if API key is available
      const keyMap: Record<string, string> = {
        chatgpt: OPENAI_API_KEY,
        claude: ANTHROPIC_API_KEY,
        gemini: GOOGLE_AI_API_KEY,
        perplexity: PERPLEXITY_API_KEY,
      };
      if (!keyMap[model]) continue;

      for (const query of queries) {
        try {
          const { response, latencyMs } = await queryFn(query.rendered);
          const scored = scoreBrandMention(response, brand);

          allResults.push({
            audit_run_id,
            brand_id: brand.id,
            model,
            query_template: query.template,
            query_rendered: query.rendered,
            query_category: query.category,
            response,
            visibility_score: scored.score,
            numeric_score: scored.numericScore,
            mention_position: scored.position,
            competitors_mentioned: scored.competitorsMentioned,
            sentiment: scored.sentiment,
            latency_ms: latencyMs,
          });
        } catch (error) {
          allResults.push({
            audit_run_id,
            brand_id: brand.id,
            model,
            query_template: query.template,
            query_rendered: query.rendered,
            query_category: query.category,
            response: `[ERROR] ${error instanceof Error ? error.message : "Unknown"}`,
            visibility_score: "not_mentioned",
            numeric_score: 0,
            mention_position: null,
            competitors_mentioned: [],
            sentiment: null,
            latency_ms: 0,
          });
        }

        completedQueries++;

        // Update progress every 5 queries
        if (completedQueries % 5 === 0) {
          await supabase.from("audit_runs").update({ completed_queries: completedQueries }).eq("id", audit_run_id);
        }
      }
    }

    // Insert all results
    if (allResults.length > 0) {
      await supabase.from("audit_results").insert(allResults);
    }

    // Compute aggregated scores
    const validResults = allResults.filter(r => !(r.response as string).startsWith("[ERROR]"));
    const overallScore = validResults.length > 0
      ? Math.round((validResults.reduce((s, r) => s + (r.numeric_score as number), 0) / (validResults.length * 3)) * 100)
      : 0;

    const modelScores: Record<string, number> = {};
    for (const model of models) {
      const modelResults = validResults.filter(r => r.model === model);
      modelScores[model] = modelResults.length > 0
        ? Math.round((modelResults.reduce((s, r) => s + (r.numeric_score as number), 0) / (modelResults.length * 3)) * 100) / 100
        : 0;
    }

    const mentionRate = validResults.length > 0
      ? validResults.filter(r => (r.numeric_score as number) >= 1).length / validResults.length
      : 0;

    const recommendationRate = validResults.length > 0
      ? validResults.filter(r => (r.numeric_score as number) >= 2).length / validResults.length
      : 0;

    const topRecRate = validResults.length > 0
      ? validResults.filter(r => (r.numeric_score as number) >= 3).length / validResults.length
      : 0;

    // Insert visibility score
    await supabase.from("visibility_scores").insert({
      audit_run_id,
      brand_id: brand.id,
      overall_score: overallScore,
      chatgpt_score: modelScores.chatgpt ?? 0,
      claude_score: modelScores.claude ?? 0,
      gemini_score: modelScores.gemini ?? 0,
      perplexity_score: modelScores.perplexity ?? 0,
      mention_rate: Math.round(mentionRate * 10000) / 10000,
      recommendation_rate: Math.round(recommendationRate * 10000) / 10000,
      top_recommendation_rate: Math.round(topRecRate * 10000) / 10000,
      category_scores: {},
    });

    // Insert ranking history
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekStartStr = weekStart.toISOString().split("T")[0];

    await supabase.from("ranking_history").upsert({
      brand_id: brand.id,
      audit_run_id,
      week_start: weekStartStr,
      overall_score: overallScore,
      chatgpt_score: modelScores.chatgpt ?? 0,
      claude_score: modelScores.claude ?? 0,
      gemini_score: modelScores.gemini ?? 0,
      perplexity_score: modelScores.perplexity ?? 0,
      mention_rate: Math.round(mentionRate * 10000) / 10000,
      recommendation_rate: Math.round(recommendationRate * 10000) / 10000,
      total_queries: validResults.length,
    }, { onConflict: "brand_id,week_start" });

    // Mark audit as completed
    await supabase.from("audit_runs").update({
      status: "completed",
      completed_queries: completedQueries,
      overall_score: overallScore,
      completed_at: new Date().toISOString(),
    }).eq("id", audit_run_id);

    return new Response(JSON.stringify({
      success: true,
      audit_run_id,
      overall_score: overallScore,
      total_results: allResults.length,
      model_scores: modelScores,
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Audit error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Internal server error",
    }), { status: 500 });
  }
});
