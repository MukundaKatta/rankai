import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId");

    if (!brandId) {
      return NextResponse.json({ error: "brandId is required" }, { status: 400 });
    }

    // Get visibility score history
    const { data: history } = await supabase
      .from("ranking_history")
      .select("*")
      .eq("brand_id", brandId)
      .order("week_start", { ascending: true });

    // Get latest visibility score
    const { data: latestScore } = await supabase
      .from("visibility_scores")
      .select("*")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Get recommendations
    const { data: recommendations } = await supabase
      .from("recommendations")
      .select("*")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Get latest analysis
    const { data: analysis } = await supabase
      .from("analysis_results")
      .select("*")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      history: history ?? [],
      latestScore,
      recommendations: recommendations ?? [],
      analysis,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
