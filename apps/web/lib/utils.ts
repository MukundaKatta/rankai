import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatScore(score: number): string {
  return Math.round(score).toString();
}

export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getScoreColor(score: number): string {
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-yellow-600";
  return "text-red-600";
}

export function getScoreBgColor(score: number): string {
  if (score >= 70) return "bg-green-100 text-green-800";
  if (score >= 40) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

export function getChangeIndicator(change: number | null): { icon: string; color: string; text: string } {
  if (change === null) return { icon: "-", color: "text-muted-foreground", text: "N/A" };
  if (change > 0) return { icon: "+", color: "text-green-600", text: `+${change.toFixed(1)}` };
  if (change < 0) return { icon: "", color: "text-red-600", text: change.toFixed(1) };
  return { icon: "", color: "text-muted-foreground", text: "0" };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
