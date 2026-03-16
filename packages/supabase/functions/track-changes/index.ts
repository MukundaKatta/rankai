import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    const { brand_id } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the latest two visibility scores for the brand
    const { data: scores, error: scoresError } = await supabase
      .from("visibility_scores")
      .select("*")
      .eq("brand_id", brand_id)
      .order("created_at", { ascending: false })
      .limit(2);

    if (scoresError || !scores || scores.length === 0) {
      return new Response(JSON.stringify({ error: "No scores found" }), { status: 404 });
    }

    const current = scores[0];
    const previous = scores.length > 1 ? scores[1] : null;

    // Calculate changes
    const changes = {
      brand_id,
      current_score: current.overall_score,
      previous_score: previous?.overall_score ?? null,
      score_change: previous ? current.overall_score - previous.overall_score : null,
      model_changes: {
        chatgpt: {
          current: current.chatgpt_score,
          previous: previous?.chatgpt_score ?? null,
          change: previous ? current.chatgpt_score - previous.chatgpt_score : null,
        },
        claude: {
          current: current.claude_score,
          previous: previous?.claude_score ?? null,
          change: previous ? current.claude_score - previous.claude_score : null,
        },
        gemini: {
          current: current.gemini_score,
          previous: previous?.gemini_score ?? null,
          change: previous ? current.gemini_score - previous.gemini_score : null,
        },
        perplexity: {
          current: current.perplexity_score,
          previous: previous?.perplexity_score ?? null,
          change: previous ? current.perplexity_score - previous.perplexity_score : null,
        },
      },
      mention_rate_change: previous ? current.mention_rate - previous.mention_rate : null,
      recommendation_rate_change: previous ? current.recommendation_rate - previous.recommendation_rate : null,
    };

    // Update ranking history with score change
    if (previous) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      const weekStartStr = weekStart.toISOString().split("T")[0];

      await supabase
        .from("ranking_history")
        .update({ score_change: changes.score_change })
        .eq("brand_id", brand_id)
        .eq("week_start", weekStartStr);
    }

    // Get ranking history for trend analysis
    const { data: history } = await supabase
      .from("ranking_history")
      .select("*")
      .eq("brand_id", brand_id)
      .order("week_start", { ascending: true })
      .limit(52); // Last year

    // Calculate trend
    let trend: "improving" | "declining" | "stable" = "stable";
    if (history && history.length >= 3) {
      const recentScores = history.slice(-3).map(h => Number(h.overall_score));
      const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;

      if (history.length >= 6) {
        const olderScores = history.slice(-6, -3).map(h => Number(h.overall_score));
        const avgOlder = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;

        if (avgRecent - avgOlder > 5) trend = "improving";
        else if (avgOlder - avgRecent > 5) trend = "declining";
      }
    }

    // Get competitor comparison changes
    const { data: latestResults } = await supabase
      .from("audit_results")
      .select("competitors_mentioned, numeric_score")
      .eq("brand_id", brand_id)
      .eq("audit_run_id", current.audit_run_id);

    const competitorStats: Record<string, { mentions: number; avgScore: number }> = {};
    if (latestResults) {
      for (const result of latestResults) {
        for (const comp of (result.competitors_mentioned || [])) {
          if (!competitorStats[comp]) competitorStats[comp] = { mentions: 0, avgScore: 0 };
          competitorStats[comp].mentions++;
        }
      }
    }

    return new Response(JSON.stringify({
      changes,
      trend,
      history: history?.map(h => ({
        weekStart: h.week_start,
        overallScore: h.overall_score,
        chatgptScore: h.chatgpt_score,
        claudeScore: h.claude_score,
        geminiScore: h.gemini_score,
        perplexityScore: h.perplexity_score,
        mentionRate: h.mention_rate,
        scoreChange: h.score_change,
      })),
      competitorStats,
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Track changes error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Internal server error",
    }), { status: 500 });
  }
});
