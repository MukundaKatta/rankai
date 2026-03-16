"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandSelector } from "@/components/dashboard/brand-selector";
import { useBrands } from "@/hooks/use-brand";
import { createClient } from "@/lib/supabase/client";
import type { OptimizedContent } from "@/types/database";
import { Loader2, FileText, Plus, Copy, Check } from "lucide-react";

export default function ContentPage() {
  const { brands, loading: brandsLoading } = useBrands();
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [content, setContent] = useState<OptimizedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeBrandId = selectedBrandId || (brands.length > 0 ? brands[0].id : null);

  const fetchContent = useCallback(async () => {
    if (!activeBrandId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("optimized_content")
      .select("*")
      .eq("brand_id", activeBrandId)
      .order("created_at", { ascending: false });

    setContent(data ?? []);
    setLoading(false);
  }, [activeBrandId]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleGenerate = async (contentType: string) => {
    if (!activeBrandId) return;
    setGenerating(true);

    try {
      const response = await fetch("/api/optimize/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId: activeBrandId, contentType }),
      });

      if (response.ok) {
        await fetchContent();
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStatusChange = async (id: string, status: OptimizedContent["status"]) => {
    const supabase = createClient();
    await supabase.from("optimized_content").update({ status }).eq("id", id);
    setContent((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
  };

  const STATUS_COLORS: Record<string, "outline" | "warning" | "success" | "secondary"> = {
    draft: "outline",
    approved: "warning",
    published: "success",
    archived: "secondary",
  };

  const contentTypes = [
    { value: "blog_post", label: "Blog Post" },
    { value: "faq", label: "FAQ Page" },
    { value: "landing_page", label: "Landing Page" },
    { value: "case_study", label: "Case Study" },
    { value: "comparison", label: "Comparison" },
    { value: "guide", label: "Guide" },
  ];

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
          <h1 className="text-3xl font-bold">Optimized Content</h1>
          <p className="text-muted-foreground">
            AI-generated content optimized for AI model visibility
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

      {/* Generate Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generate New Content</CardTitle>
          <CardDescription>
            Create GEO-optimized content based on your audit results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {contentTypes.map((type) => (
              <Button
                key={type.value}
                variant="outline"
                disabled={generating}
                onClick={() => handleGenerate(type.value)}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {type.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Content List */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : content.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No content generated yet</h3>
            <p className="mt-2 text-muted-foreground">
              Click a content type above to generate GEO-optimized content.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {content.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {item.content_type.replace(/_/g, " ")} | {item.word_count} words | Created {new Date(item.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={STATUS_COLORS[item.status]}>{item.status}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {item.meta_description && (
                  <p className="text-sm text-muted-foreground italic">{item.meta_description}</p>
                )}

                {item.target_keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.target_keywords.map((kw) => (
                      <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
                    ))}
                  </div>
                )}

                {expandedId === item.id ? (
                  <div className="rounded-lg bg-muted p-4">
                    <pre className="whitespace-pre-wrap text-sm">{item.content}</pre>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground line-clamp-3">{item.content.substring(0, 300)}...</p>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  >
                    {expandedId === item.id ? "Collapse" : "Expand"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(item.id, item.content)}
                  >
                    {copiedId === item.id ? (
                      <><Check className="h-3 w-3" /> Copied</>
                    ) : (
                      <><Copy className="h-3 w-3" /> Copy</>
                    )}
                  </Button>
                  {item.status === "draft" && (
                    <Button size="sm" onClick={() => handleStatusChange(item.id, "approved")}>
                      Approve
                    </Button>
                  )}
                  {item.status === "approved" && (
                    <Button size="sm" onClick={() => handleStatusChange(item.id, "published")}>
                      Mark Published
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
