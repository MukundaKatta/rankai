"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AuditRun, AuditResult, VisibilityScore } from "@/types/database";

export function useLatestAudit(brandId: string | null) {
  const [auditRun, setAuditRun] = useState<AuditRun | null>(null);
  const [results, setResults] = useState<AuditResult[]>([]);
  const [visibilityScore, setVisibilityScore] = useState<VisibilityScore | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!brandId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Get latest completed audit run
    const { data: run } = await supabase
      .from("audit_runs")
      .select("*")
      .eq("brand_id", brandId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    if (run) {
      setAuditRun(run);

      // Get results for this audit run
      const { data: auditResults } = await supabase
        .from("audit_results")
        .select("*")
        .eq("audit_run_id", run.id)
        .order("created_at", { ascending: true });

      setResults(auditResults ?? []);

      // Get visibility score
      const { data: score } = await supabase
        .from("visibility_scores")
        .select("*")
        .eq("audit_run_id", run.id)
        .single();

      setVisibilityScore(score);
    }

    setLoading(false);
  }, [brandId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { auditRun, results, visibilityScore, loading, refetch: fetch };
}

export function useAuditHistory(brandId: string | null) {
  const [runs, setRuns] = useState<AuditRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!brandId) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      const supabase = createClient();

      const { data } = await supabase
        .from("audit_runs")
        .select("*")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false })
        .limit(20);

      setRuns(data ?? []);
      setLoading(false);
    };

    fetchHistory();
  }, [brandId]);

  return { runs, loading };
}
