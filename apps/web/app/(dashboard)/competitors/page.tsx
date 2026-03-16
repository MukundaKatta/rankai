"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrandSelector } from "@/components/dashboard/brand-selector";
import { CompetitorChart } from "@/components/charts/competitor-chart";
import { useBrands } from "@/hooks/use-brand";
import { useLatestAudit } from "@/hooks/use-audit";
import { createClient } from "@/lib/supabase/client";
import type { Competitor, Brand } from "@/types/database";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function CompetitorsPage() {
  const { brands, loading: brandsLoading } = useBrands();
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);

  const activeBrandId = selectedBrandId || (brands.length > 0 ? brands[0].id : null);
  const activeBrand = brands.find((b) => b.id === activeBrandId);
  const { results, visibilityScore } = useLatestAudit(activeBrandId);

  useEffect(() => {
    if (!activeBrandId) {
      setLoading(false);
      return;
    }

    const fetchCompetitors = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("competitors")
        .select("*")
        .eq("brand_id", activeBrandId)
        .order("mention_count", { ascending: false });

      setCompetitors(data ?? []);
      setLoading(false);
    };

    fetchCompetitors();
  }, [activeBrandId]);

  // Compute competitor mentions from latest results
  const competitorMentions: Record<string, { count: number; asTopPick: number; avgScore: number }> = {};
  for (const result of results) {
    for (const comp of result.competitors_mentioned) {
      if (!competitorMentions[comp]) {
        competitorMentions[comp] = { count: 0, asTopPick: 0, avgScore: 0 };
      }
      competitorMentions[comp].count++;
    }
  }

  const brandMentionCount = results.filter((r) => r.numeric_score >= 1).length;

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
          <h1 className="text-3xl font-bold">Competitive AI Visibility</h1>
          <p className="text-muted-foreground">
            See how your competitors appear in AI model responses
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
      ) : (
        <>
          {/* Chart */}
          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Mention Comparison</CardTitle>
                <CardDescription>
                  How often your brand vs competitors are mentioned in AI responses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CompetitorChart
                  brandName={activeBrand?.name ?? "Your Brand"}
                  brandMentionCount={brandMentionCount}
                  brandAvgScore={visibilityScore ? Number(visibilityScore.overall_score) / 33.33 : 0}
                  competitors={competitors}
                />
              </CardContent>
            </Card>
          )}

          {/* Competitor Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Your brand card */}
            <Card className="border-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{activeBrand?.name ?? "Your Brand"}</CardTitle>
                  <Badge>You</Badge>
                </div>
                <CardDescription>{activeBrand?.domain}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Mentions</span>
                    <span className="font-medium">{brandMentionCount} / {results.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Visibility Score</span>
                    <span className="font-medium">{visibilityScore ? Number(visibilityScore.overall_score).toFixed(0) : "N/A"}/100</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Recommendation Rate</span>
                    <span className="font-medium">
                      {visibilityScore ? `${(Number(visibilityScore.recommendation_rate) * 100).toFixed(0)}%` : "N/A"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Competitor cards */}
            {Object.entries(competitorMentions)
              .sort(([, a], [, b]) => b.count - a.count)
              .map(([name, data]) => {
                const compRecord = competitors.find((c) => c.name === name);
                const isAhead = data.count > brandMentionCount;

                return (
                  <Card key={name}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{name}</CardTitle>
                        {isAhead ? (
                          <Badge variant="danger">Ahead</Badge>
                        ) : data.count === brandMentionCount ? (
                          <Badge variant="warning">Tied</Badge>
                        ) : (
                          <Badge variant="success">Behind</Badge>
                        )}
                      </div>
                      {compRecord?.domain && (
                        <CardDescription>{compRecord.domain}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Mentions</span>
                          <span className="font-medium">{data.count} / {results.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">vs Your Brand</span>
                          <span className={`font-medium flex items-center gap-1 ${
                            data.count > brandMentionCount ? "text-red-600" :
                            data.count < brandMentionCount ? "text-green-600" :
                            "text-muted-foreground"
                          }`}>
                            {data.count > brandMentionCount ? (
                              <><TrendingUp className="h-3 w-3" /> +{data.count - brandMentionCount}</>
                            ) : data.count < brandMentionCount ? (
                              <><TrendingDown className="h-3 w-3" /> {data.count - brandMentionCount}</>
                            ) : (
                              <><Minus className="h-3 w-3" /> Same</>
                            )}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

            {Object.keys(competitorMentions).length === 0 && (
              <Card className="md:col-span-2">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground">
                    No competitor data yet. Run an audit to see competitor visibility.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
