"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BrandSelector } from "@/components/dashboard/brand-selector";
import { VisibilityTrendChart } from "@/components/charts/visibility-trend";
import { ModelComparisonChart } from "@/components/charts/model-comparison";
import { ScoreRadarChart } from "@/components/charts/score-radar";
import { useBrands } from "@/hooks/use-brand";
import { useLatestAudit } from "@/hooks/use-audit";
import { createClient } from "@/lib/supabase/client";
import type { RankingHistory, Recommendation } from "@/types/database";
import { Loader2, Download, FileText, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function ReportsPage() {
  const { brands, loading: brandsLoading } = useBrands();
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [history, setHistory] = useState<RankingHistory[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const activeBrandId = selectedBrandId || (brands.length > 0 ? brands[0].id : null);
  const activeBrand = brands.find((b) => b.id === activeBrandId);
  const { visibilityScore, auditRun, results } = useLatestAudit(activeBrandId);

  useEffect(() => {
    if (!activeBrandId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const supabase = createClient();

      const [historyRes, recsRes] = await Promise.all([
        supabase
          .from("ranking_history")
          .select("*")
          .eq("brand_id", activeBrandId)
          .order("week_start", { ascending: true })
          .limit(12),
        supabase
          .from("recommendations")
          .select("*")
          .eq("brand_id", activeBrandId)
          .in("priority", ["critical", "high"])
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setHistory(historyRes.data ?? []);
      setRecommendations(recsRes.data ?? []);
      setLoading(false);
    };

    fetchData();
  }, [activeBrandId]);

  const handleExport = () => {
    // Build a simple text report for export
    if (!visibilityScore || !activeBrand) return;

    const reportLines = [
      `RankAI GEO Report - ${activeBrand.name}`,
      `Generated: ${new Date().toLocaleDateString()}`,
      ``,
      `== VISIBILITY SUMMARY ==`,
      `Overall Score: ${visibilityScore.overall_score}/100`,
      `Mention Rate: ${(Number(visibilityScore.mention_rate) * 100).toFixed(1)}%`,
      `Recommendation Rate: ${(Number(visibilityScore.recommendation_rate) * 100).toFixed(1)}%`,
      ``,
      `== PER-MODEL SCORES ==`,
      `ChatGPT: ${visibilityScore.chatgpt_score}/3`,
      `Claude: ${visibilityScore.claude_score}/3`,
      `Gemini: ${visibilityScore.gemini_score}/3`,
      `Perplexity: ${visibilityScore.perplexity_score}/3`,
      ``,
      `== STRENGTHS ==`,
      ...visibilityScore.strengths.map((s) => `- ${s}`),
      ``,
      `== WEAKNESSES ==`,
      ...visibilityScore.weaknesses.map((w) => `- ${w}`),
      ``,
      `== TOP RECOMMENDATIONS ==`,
      ...recommendations.map((r, i) => `${i + 1}. [${r.priority.toUpperCase()}] ${r.title}\n   ${r.description}`),
    ];

    const blob = new Blob([reportLines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rankai-report-${activeBrand.slug || activeBrand.name.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
          <h1 className="text-3xl font-bold">GEO Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive AI visibility reports for your brand
          </p>
        </div>
        <div className="flex items-center gap-4">
          {brands.length > 0 && (
            <BrandSelector
              brands={brands}
              selectedBrandId={activeBrandId ?? ""}
              onBrandChange={setSelectedBrandId}
            />
          )}
          <Button variant="outline" onClick={handleExport} disabled={!visibilityScore}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !visibilityScore ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No report data available</h3>
            <p className="mt-2 text-muted-foreground">Run an audit first to generate reports.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Report Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{activeBrand?.name} GEO Report</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4" />
                    {auditRun?.completed_at ? formatDate(auditRun.completed_at) : "Latest"} |
                    {results.length} queries across {auditRun?.models_queried?.length || 4} AI models
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold">{Number(visibilityScore.overall_score).toFixed(0)}</div>
                  <p className="text-sm text-muted-foreground">Overall Score</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold">{(Number(visibilityScore.mention_rate) * 100).toFixed(0)}%</div>
                <p className="text-sm text-muted-foreground mt-1">Mention Rate</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your brand was mentioned in {(Number(visibilityScore.mention_rate) * 100).toFixed(0)}% of AI queries
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold">{(Number(visibilityScore.recommendation_rate) * 100).toFixed(0)}%</div>
                <p className="text-sm text-muted-foreground mt-1">Recommendation Rate</p>
                <p className="text-xs text-muted-foreground mt-1">
                  AI models actively recommended your brand
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold">{(Number(visibilityScore.top_recommendation_rate) * 100).toFixed(0)}%</div>
                <p className="text-sm text-muted-foreground mt-1">Top Pick Rate</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Listed as the #1 recommendation
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Model Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ModelComparisonChart
                  scores={{
                    chatgpt: Number(visibilityScore.chatgpt_score),
                    claude: Number(visibilityScore.claude_score),
                    gemini: Number(visibilityScore.gemini_score),
                    perplexity: Number(visibilityScore.perplexity_score),
                  }}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ScoreRadarChart categoryScores={visibilityScore.category_scores} />
              </CardContent>
            </Card>
          </div>

          {/* Trend */}
          {history.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Visibility Trend</CardTitle>
                <CardDescription>Score changes over time</CardDescription>
              </CardHeader>
              <CardContent>
                <VisibilityTrendChart data={history} showModels={false} />
              </CardContent>
            </Card>
          )}

          {/* Findings */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Key Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                {visibilityScore.strengths.length > 0 ? (
                  <ul className="space-y-2">
                    {visibilityScore.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5 h-2 w-2 rounded-full bg-green-500 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No strengths identified.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Areas for Improvement</CardTitle>
              </CardHeader>
              <CardContent>
                {visibilityScore.weaknesses.length > 0 ? (
                  <ul className="space-y-2">
                    {visibilityScore.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5 h-2 w-2 rounded-full bg-red-500 shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No weaknesses identified.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Recommendations */}
          {recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Priority Recommendations</CardTitle>
                <CardDescription>Top actions to improve your AI visibility</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recommendations.map((rec, index) => (
                    <div key={rec.id}>
                      {index > 0 && <Separator className="mb-4" />}
                      <div className="flex items-start gap-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
                          {index + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{rec.title}</h4>
                            <Badge variant={rec.priority === "critical" ? "destructive" : "warning"}>
                              {rec.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
