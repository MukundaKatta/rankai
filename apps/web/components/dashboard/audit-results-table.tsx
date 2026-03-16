"use client";

import { Badge } from "@/components/ui/badge";
import type { AuditResult } from "@/types/database";

interface AuditResultsTableProps {
  results: AuditResult[];
}

const SCORE_BADGE_VARIANT: Record<string, "success" | "warning" | "danger" | "secondary"> = {
  top_recommendation: "success",
  recommended: "success",
  mentioned: "warning",
  not_mentioned: "danger",
};

const SCORE_LABELS: Record<string, string> = {
  top_recommendation: "Top Pick",
  recommended: "Recommended",
  mentioned: "Mentioned",
  not_mentioned: "Not Found",
};

const MODEL_COLORS: Record<string, string> = {
  chatgpt: "bg-emerald-100 text-emerald-800",
  claude: "bg-violet-100 text-violet-800",
  gemini: "bg-amber-100 text-amber-800",
  perplexity: "bg-blue-100 text-blue-800",
};

export function AuditResultsTable({ results }: AuditResultsTableProps) {
  if (results.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        No audit results yet. Run an audit to see results.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Query</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Model</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Score</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sentiment</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Competitors</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr key={result.id} className="border-b hover:bg-muted/50">
              <td className="px-4 py-3 max-w-xs truncate" title={result.query_rendered}>
                {result.query_rendered}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${MODEL_COLORS[result.model] || ""}`}>
                  {result.model}
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {result.query_category.replace(/_/g, " ")}
              </td>
              <td className="px-4 py-3">
                <Badge variant={SCORE_BADGE_VARIANT[result.visibility_score] || "secondary"}>
                  {SCORE_LABELS[result.visibility_score] || result.visibility_score}
                </Badge>
              </td>
              <td className="px-4 py-3">
                {result.sentiment && (
                  <span className={`text-xs ${
                    result.sentiment === "positive" ? "text-green-600" :
                    result.sentiment === "negative" ? "text-red-600" :
                    "text-muted-foreground"
                  }`}>
                    {result.sentiment}
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                {result.competitors_mentioned.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {result.competitors_mentioned.join(", ")}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
