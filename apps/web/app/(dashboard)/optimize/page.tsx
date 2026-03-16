"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrandSelector } from "@/components/dashboard/brand-selector";
import { RecommendationCard } from "@/components/dashboard/recommendation-card";
import { useBrands } from "@/hooks/use-brand";
import { createClient } from "@/lib/supabase/client";
import type { Recommendation } from "@/types/database";
import { Loader2, Sparkles, CheckCircle, Clock, AlertTriangle } from "lucide-react";

export default function OptimizePage() {
  const { brands, loading: brandsLoading } = useBrands();
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");

  const activeBrandId = selectedBrandId || (brands.length > 0 ? brands[0].id : null);

  const fetchRecommendations = useCallback(async () => {
    if (!activeBrandId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("recommendations")
      .select("*")
      .eq("brand_id", activeBrandId)
      .order("created_at", { ascending: false });

    setRecommendations(data ?? []);
    setLoading(false);
  }, [activeBrandId]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleGenerateRecommendations = async () => {
    if (!activeBrandId) return;
    setGenerating(true);

    try {
      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId: activeBrandId }),
      });

      if (response.ok) {
        await fetchRecommendations();
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleStatusChange = async (id: string, status: Recommendation["status"]) => {
    const supabase = createClient();
    await supabase
      .from("recommendations")
      .update({
        status,
        ...(status === "completed" ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq("id", id);

    setRecommendations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status, ...(status === "completed" ? { completed_at: new Date().toISOString() } : {}) } : r))
    );
  };

  const filteredRecs = filter === "all"
    ? recommendations
    : recommendations.filter((r) => r.status === filter);

  const stats = {
    total: recommendations.length,
    pending: recommendations.filter((r) => r.status === "pending").length,
    inProgress: recommendations.filter((r) => r.status === "in_progress").length,
    completed: recommendations.filter((r) => r.status === "completed").length,
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
          <h1 className="text-3xl font-bold">Optimization</h1>
          <p className="text-muted-foreground">
            AI-generated recommendations to improve your visibility
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
          <Button onClick={handleGenerateRecommendations} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer" onClick={() => setFilter("all")}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Recommendations</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setFilter("pending")}>
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <div>
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setFilter("in_progress")}>
          <CardContent className="pt-6 flex items-center gap-3">
            <Clock className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-2xl font-bold">{stats.inProgress}</div>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setFilter("completed")}>
          <CardContent className="pt-6 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <div className="text-2xl font-bold">{stats.completed}</div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredRecs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">
              {recommendations.length === 0
                ? "No recommendations yet"
                : "No recommendations match this filter"}
            </h3>
            <p className="mt-2 text-muted-foreground">
              {recommendations.length === 0
                ? "Run an audit first, then generate optimization recommendations."
                : "Try a different filter to see recommendations."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRecs.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
