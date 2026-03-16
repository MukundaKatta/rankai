import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { brandId } = await request.json();

    if (!brandId) {
      return NextResponse.json({ error: "brandId is required" }, { status: 400 });
    }

    // Verify brand access
    const { data: brand } = await supabase
      .from("brands")
      .select("*, organizations(*)")
      .eq("id", brandId)
      .single();

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const serviceClient = await createServiceClient();

    // Create audit run
    const { data: auditRun, error: runError } = await serviceClient
      .from("audit_runs")
      .insert({
        brand_id: brandId,
        status: "pending",
        triggered_by: "manual",
        models_queried: ["chatgpt", "claude", "gemini", "perplexity"],
      })
      .select()
      .single();

    if (runError) {
      return NextResponse.json({ error: runError.message }, { status: 500 });
    }

    // Trigger the edge function (or process inline for dev)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    try {
      await fetch(`${supabaseUrl}/functions/v1/run-audit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ audit_run_id: auditRun.id }),
      });
    } catch {
      // Edge function may not be deployed; mark for background processing
      await serviceClient
        .from("audit_runs")
        .update({ status: "pending" })
        .eq("id", auditRun.id);
    }

    return NextResponse.json({ auditRunId: auditRun.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");

    if (!runId) {
      return NextResponse.json({ error: "runId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: run } = await supabase
      .from("audit_runs")
      .select("*")
      .eq("id", runId)
      .single();

    if (!run) {
      return NextResponse.json({ error: "Audit run not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: run.status,
      totalQueries: run.total_queries,
      completedQueries: run.completed_queries,
      overallScore: run.overall_score,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
