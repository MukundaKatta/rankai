"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Recommendation } from "@/types/database";
import { CheckCircle, Clock, ArrowRight } from "lucide-react";

interface RecommendationCardProps {
  recommendation: Recommendation;
  onStatusChange?: (id: string, status: Recommendation["status"]) => void;
}

const PRIORITY_COLORS: Record<string, "destructive" | "warning" | "secondary" | "outline"> = {
  critical: "destructive",
  high: "warning",
  medium: "secondary",
  low: "outline",
};

const CATEGORY_LABELS: Record<string, string> = {
  content: "Content",
  technical_seo: "Technical SEO",
  structured_data: "Structured Data",
  authority: "Authority",
  brand_signals: "Brand Signals",
};

export function RecommendationCard({ recommendation, onStatusChange }: RecommendationCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">{recommendation.title}</CardTitle>
          <div className="flex gap-1 shrink-0">
            <Badge variant={PRIORITY_COLORS[recommendation.priority]}>
              {recommendation.priority}
            </Badge>
            <Badge variant="outline">
              {CATEGORY_LABELS[recommendation.category]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{recommendation.description}</p>

        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Effort: {recommendation.effort}
          </span>
          <span className="flex items-center gap-1">
            <ArrowRight className="h-3 w-3" />
            Impact: {recommendation.impact}
          </span>
          {recommendation.estimated_timeframe && (
            <span>{recommendation.estimated_timeframe}</span>
          )}
        </div>

        {recommendation.steps.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium">Steps:</p>
            <ul className="space-y-1">
              {recommendation.steps.slice(0, 3).map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-muted flex items-center justify-center text-[10px]">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
              {recommendation.steps.length > 3 && (
                <li className="text-xs text-muted-foreground">
                  +{recommendation.steps.length - 3} more steps
                </li>
              )}
            </ul>
          </div>
        )}

        {onStatusChange && recommendation.status !== "completed" && (
          <div className="flex gap-2 pt-2">
            {recommendation.status === "pending" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusChange(recommendation.id, "in_progress")}
              >
                Start Working
              </Button>
            )}
            <Button
              size="sm"
              variant="default"
              onClick={() => onStatusChange(recommendation.id, "completed")}
            >
              <CheckCircle className="h-3 w-3" />
              Mark Complete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
