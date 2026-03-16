"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Competitor } from "@/types/database";

interface CompetitorChartProps {
  brandName: string;
  brandMentionCount: number;
  brandAvgScore: number;
  competitors: Competitor[];
}

export function CompetitorChart({
  brandName,
  brandMentionCount,
  brandAvgScore,
  competitors,
}: CompetitorChartProps) {
  const data = [
    { name: brandName, mentions: brandMentionCount, avgScore: Number(brandAvgScore) },
    ...competitors.map((c) => ({
      name: c.name,
      mentions: c.mention_count,
      avgScore: Number(c.avg_score),
    })),
  ].sort((a, b) => b.mentions - a.mentions);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="name" className="text-xs" />
        <YAxis yAxisId="left" className="text-xs" />
        <YAxis yAxisId="right" orientation="right" domain={[0, 3]} className="text-xs" />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
        />
        <Legend />
        <Bar yAxisId="left" dataKey="mentions" name="Mentions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="right" dataKey="avgScore" name="Avg Score" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
