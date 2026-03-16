"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { RankingHistory } from "@/types/database";

interface VisibilityTrendProps {
  data: RankingHistory[];
  showModels?: boolean;
}

export function VisibilityTrendChart({ data, showModels = true }: VisibilityTrendProps) {
  const chartData = data.map((item) => ({
    date: new Date(item.week_start).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    overall: Number(item.overall_score),
    chatgpt: Number(item.chatgpt_score) * 33.33,
    claude: Number(item.claude_score) * 33.33,
    gemini: Number(item.gemini_score) * 33.33,
    perplexity: Number(item.perplexity_score) * 33.33,
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="date" className="text-xs" />
        <YAxis domain={[0, 100]} className="text-xs" />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="overall"
          name="Overall Score"
          stroke="hsl(var(--primary))"
          strokeWidth={3}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
        {showModels && (
          <>
            <Line type="monotone" dataKey="chatgpt" name="ChatGPT" stroke="#10b981" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="claude" name="Claude" stroke="#8b5cf6" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="gemini" name="Gemini" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="perplexity" name="Perplexity" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
          </>
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
