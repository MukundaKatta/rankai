"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface ScoreRadarProps {
  categoryScores: Record<string, number>;
}

export function ScoreRadarChart({ categoryScores }: ScoreRadarProps) {
  const data = Object.entries(categoryScores).map(([key, value]) => ({
    category: key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase()),
    score: Number(value),
    fullMark: 3,
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No category data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid className="stroke-muted" />
        <PolarAngleAxis dataKey="category" className="text-xs" />
        <PolarRadiusAxis angle={90} domain={[0, 3]} className="text-xs" />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
        />
        <Radar
          name="Score"
          dataKey="score"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.3}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
