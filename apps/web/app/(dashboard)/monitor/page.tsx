"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreCard } from "@/components/dashboard/score-card";
import { BrandSelector } from "@/components/dashboard/brand-selector";
import { VisibilityTrendChart } from "@/components/charts/visibility-trend";
import { useBrands } from "@/hooks/use-brand";
import { createClient } from "@/lib/supabase/client";
import type { RankingHistory } from "@/types/database";
import { Loader2 } from "lucide-react";

export default function MonitorPage() {
  const { brands, loading: brandsLoading } = useBrands();
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [history, setHistory] = useState<RankingHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const activeBrandId = selectedBrandId || (brands.length > 0 ? brands[0].id : null);

  useEffect(() => {
    if (!activeBrandId) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("ranking_history")
        .select("*")
        .eq("brand_id", activeBrandId)
        .order("week_start", { ascending: true })
        .limit(52);

      setHistory(data ?? []);
      setLoading(false);
    };

    fetchHistory();
  }, [activeBrandId]);

  const latest = history.length > 0 ? history[history.length - 1] : null;
  const previous = history.length > 1 ? history[history.length - 2] : null;

  const scoreChange = latest && previous
    ? Number(latest.overall_score) - Number(previous.overall_score)
    : null;

  const mentionChange = latest && previous
    ? Number(latest.mention_rate) - Number(previous.mention_rate)
    : null;

  if (brandsLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ranking Monitor</h1>
          <p className="text-muted-foreground">
            Track your AI visibility changes over time
          </p>
        </div>
        {brands.length > 0 && (
          <BrandSelector
            brands={brands}
            selectedBrandId={activeBrandId ?? ""}
            onBrandChange={setSelectedBrandId}
          />
        )}
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : history.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h3 className="text-lg font-semibold">No ranking data yet</h3>
            <p className="mt-2 text-muted-foreground">
              Run at least two audits to see ranking trends over time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <ScoreCard
              title="Current Score"
              score={latest ? Number(latest.overall_score) : 0}
              change={scoreChange}
              description="Overall AI visibility score"
            />
            <ScoreCard
              title="Mention Rate"
              score={latest ? Number(latest.mention_rate) * 100 : 0}
              suffix="%"
              change={mentionChange ? mentionChange * 100 : null}
              description="Percentage of queries mentioning your brand"
            />
            <ScoreCard
              title="Data Points"
              score={history.length}
              maxScore={52}
              description="Weekly snapshots collected"
            />
            <ScoreCard
              title="Total Queries"
              score={latest ? latest.total_queries : 0}
              maxScore={200}
              description="Queries in latest audit"
            />
          </div>

          {/* Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Visibility Trend</CardTitle>
              <CardDescription>
                Overall score and per-model scores over time (normalized to 0-100)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VisibilityTrendChart data={history} showModels />
            </CardContent>
          </Card>

          {/* Per-model trend cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {(["chatgpt", "claude", "gemini", "perplexity"] as const).map((model) => {
              const currentScore = latest ? Number(latest[`${model}_score` as keyof RankingHistory]) : 0;
              const prevScore = previous ? Number(previous[`${model}_score` as keyof RankingHistory]) : null;
              const change = prevScore !== null ? Number(currentScore) - prevScore : null;

              return (
                <Card key={model}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium capitalize">{model}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{Number(currentScore).toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">avg score (0-3 scale)</p>
                    {change !== null && (
                      <p className={`text-xs mt-1 ${change > 0 ? "text-green-600" : change < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                        {change > 0 ? "+" : ""}{change.toFixed(2)} from last audit
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
