"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface ModelComparisonProps {
  scores: {
    chatgpt: number;
    claude: number;
    gemini: number;
    perplexity: number;
  };
}

const MODEL_COLORS: Record<string, string> = {
  ChatGPT: "#10b981",
  Claude: "#8b5cf6",
  Gemini: "#f59e0b",
  Perplexity: "#3b82f6",
};

export function ModelComparisonChart({ scores }: ModelComparisonProps) {
  const data = [
    { name: "ChatGPT", score: Number(scores.chatgpt) },
    { name: "Claude", score: Number(scores.claude) },
    { name: "Gemini", score: Number(scores.gemini) },
    { name: "Perplexity", score: Number(scores.perplexity) },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="name" className="text-xs" />
        <YAxis domain={[0, 3]} ticks={[0, 1, 2, 3]} className="text-xs" />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
          formatter={(value: number) => [value.toFixed(2), "Avg Score"]}
        />
        <Bar dataKey="score" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={MODEL_COLORS[entry.name]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
