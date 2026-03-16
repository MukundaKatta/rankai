import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, getScoreColor, getChangeIndicator } from "@/lib/utils";

interface ScoreCardProps {
  title: string;
  score: number;
  maxScore?: number;
  change?: number | null;
  description?: string;
  suffix?: string;
}

export function ScoreCard({ title, score, maxScore = 100, change, description, suffix = "" }: ScoreCardProps) {
  const changeInfo = change !== undefined ? getChangeIndicator(change) : null;
  const percentage = Math.min(100, (score / maxScore) * 100);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {changeInfo && (
          <span className={cn("text-xs font-medium", changeInfo.color)}>
            {changeInfo.text}
          </span>
        )}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", getScoreColor(percentage))}>
          {typeof score === "number" ? score.toFixed(score % 1 === 0 ? 0 : 1) : score}
          {suffix}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        <div className="mt-3 h-2 w-full rounded-full bg-secondary">
          <div
            className={cn(
              "h-2 rounded-full transition-all",
              percentage >= 70 ? "bg-green-500" : percentage >= 40 ? "bg-yellow-500" : "bg-red-500"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
