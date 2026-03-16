"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScoreCard } from "@/components/dashboard/score-card";
import { BrandSelector } from "@/components/dashboard/brand-selector";
import { AuditResultsTable } from "@/components/dashboard/audit-results-table";
import { ModelComparisonChart } from "@/components/charts/model-comparison";
import { ScoreRadarChart } from "@/components/charts/score-radar";
import { useBrands } from "@/hooks/use-brand";
import { useLatestAudit } from "@/hooks/use-audit";
import { formatDate, formatPercentage } from "@/lib/utils";
import { Play, Loader2 } from "lucide-react";

export default function AuditPage() {
  const { brands, loading: brandsLoading } = useBrands();
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [runningAudit, setRunningAudit] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);

  const activeBrandId = selectedBrandId || (brands.length > 0 ? brands[0].id : null);
  const { auditRun, results, visibilityScore, loading: auditLoading, refetch } = useLatestAudit(activeBrandId);

  const handleRunAudit = useCallback(async () => {
    if (!activeBrandId) return;
    setRunningAudit(true);
    setAuditProgress(0);

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId: activeBrandId }),
      });

      if (!response.ok) {
        throw new Error("Failed to start audit");
      }

      const data = await response.json();

      // Poll for progress
      const pollInterval = setInterval(async () => {
        const statusRes = await fetch(`/api/audit?runId=${data.auditRunId}`);
        const statusData = await statusRes.json();

        if (statusData.status === "completed") {
          clearInterval(pollInterval);
          setAuditProgress(100);
          setRunningAudit(false);
          refetch();
        } else if (statusData.status === "failed") {
          clearInterval(pollInterval);
          setRunningAudit(false);
        } else {
          const progress = statusData.totalQueries > 0
            ? Math.round((statusData.completedQueries / statusData.totalQueries) * 100)
            : 0;
          setAuditProgress(progress);
        }
      }, 3000);
    } catch {
      setRunningAudit(false);
    }
  }, [activeBrandId, refetch]);

  if (brandsLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <h2 className="text-2xl font-bold">No brands yet</h2>
        <p className="text-muted-foreground">Add your first brand to start auditing AI visibility.</p>
        <Button asChild>
          <a href="/api/audit">Add Brand</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Visibility Audit</h1>
          <p className="text-muted-foreground">
            See how AI models perceive and recommend your brand
          </p>
        </div>
        <div className="flex items-center gap-4">
          <BrandSelector
            brands={brands}
            selectedBrandId={activeBrandId ?? ""}
            onBrandChange={setSelectedBrandId}
          />
          <Button onClick={handleRunAudit} disabled={runningAudit || !activeBrandId}>
            {runningAudit ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Audit
              </>
            )}
          </Button>
        </div>
      </div>

      {runningAudit && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Probing AI models...</span>
                <span>{auditProgress}%</span>
              </div>
              <Progress value={auditProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      {auditLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : visibilityScore ? (
        <>
          {/* Score Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <ScoreCard
              title="Overall Visibility"
              score={Number(visibilityScore.overall_score)}
              description="Composite score across all AI models"
            />
            <ScoreCard
              title="Mention Rate"
              score={Number(visibilityScore.mention_rate) * 100}
              suffix="%"
              description="How often AI models mention your brand"
            />
            <ScoreCard
              title="Recommendation Rate"
              score={Number(visibilityScore.recommendation_rate) * 100}
              suffix="%"
              description="How often you're actively recommended"
            />
            <ScoreCard
              title="Top Pick Rate"
              score={Number(visibilityScore.top_recommendation_rate) * 100}
              suffix="%"
              description="How often you're the #1 recommendation"
            />
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                {visibilityScore.strengths.length > 0 ? (
                  <ul className="space-y-2">
                    {visibilityScore.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Badge variant="success" className="mt-0.5 shrink-0">+</Badge>
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No strengths identified yet.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Weaknesses</CardTitle>
              </CardHeader>
              <CardContent>
                {visibilityScore.weaknesses.length > 0 ? (
                  <ul className="space-y-2">
                    {visibilityScore.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Badge variant="danger" className="mt-0.5 shrink-0">!</Badge>
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

          {/* Charts */}
          <Tabs defaultValue="models" className="space-y-4">
            <TabsList>
              <TabsTrigger value="models">Model Comparison</TabsTrigger>
              <TabsTrigger value="categories">Category Breakdown</TabsTrigger>
              <TabsTrigger value="results">Detailed Results</TabsTrigger>
            </TabsList>

            <TabsContent value="models">
              <Card>
                <CardHeader>
                  <CardTitle>Score by AI Model</CardTitle>
                  <CardDescription>
                    Average visibility score per AI model (0-3 scale)
                  </CardDescription>
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
            </TabsContent>

            <TabsContent value="categories">
              <Card>
                <CardHeader>
                  <CardTitle>Score by Query Category</CardTitle>
                  <CardDescription>
                    How well you perform across different types of AI queries
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScoreRadarChart categoryScores={visibilityScore.category_scores} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="results">
              <Card>
                <CardHeader>
                  <CardTitle>All Query Results</CardTitle>
                  <CardDescription>
                    {results.length} queries across {auditRun?.models_queried?.length ?? 0} AI models
                    {auditRun?.completed_at && ` - Last run: ${formatDate(auditRun.completed_at)}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AuditResultsTable results={results} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h3 className="text-lg font-semibold">No audit data yet</h3>
            <p className="mt-2 text-muted-foreground">
              Click &quot;Run Audit&quot; to probe AI models and see how they perceive your brand.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
