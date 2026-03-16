export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: "free" | "starter" | "professional" | "enterprise";
  plan_period_end: string | null;
  max_brands: number;
  max_queries_per_audit: number;
  audit_frequency: "weekly" | "biweekly" | "monthly";
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  organization_id: string;
  name: string;
  domain: string;
  vertical: string;
  description: string;
  city: string | null;
  state: string | null;
  country: string;
  keywords: string[];
  competitors: string[];
  logo_url: string | null;
  website_screenshot_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditRun {
  id: string;
  brand_id: string;
  status: "pending" | "running" | "completed" | "failed";
  triggered_by: "manual" | "scheduled" | "api";
  models_queried: string[];
  total_queries: number;
  completed_queries: number;
  overall_score: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface AuditResult {
  id: string;
  audit_run_id: string;
  brand_id: string;
  model: "chatgpt" | "claude" | "gemini" | "perplexity";
  query_template: string;
  query_rendered: string;
  query_category: string;
  response: string;
  visibility_score: "not_mentioned" | "mentioned" | "recommended" | "top_recommendation";
  numeric_score: number;
  mention_position: number | null;
  competitors_mentioned: string[];
  sentiment: "positive" | "neutral" | "negative" | null;
  latency_ms: number;
  created_at: string;
}

export interface VisibilityScore {
  id: string;
  audit_run_id: string;
  brand_id: string;
  overall_score: number;
  chatgpt_score: number;
  claude_score: number;
  gemini_score: number;
  perplexity_score: number;
  mention_rate: number;
  recommendation_rate: number;
  top_recommendation_rate: number;
  category_scores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  created_at: string;
}

export interface Competitor {
  id: string;
  brand_id: string;
  name: string;
  domain: string | null;
  mention_count: number;
  avg_score: number;
  last_audit_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OptimizedContent {
  id: string;
  brand_id: string;
  title: string;
  content_type: "blog_post" | "faq" | "landing_page" | "case_study" | "comparison" | "guide";
  content: string;
  meta_description: string | null;
  target_keywords: string[];
  word_count: number;
  structured_data_suggestion: string | null;
  internal_linking_suggestions: string[];
  call_to_action: string | null;
  status: "draft" | "approved" | "published" | "archived";
  created_at: string;
  updated_at: string;
}

export interface RankingHistory {
  id: string;
  brand_id: string;
  audit_run_id: string | null;
  week_start: string;
  overall_score: number;
  chatgpt_score: number;
  claude_score: number;
  gemini_score: number;
  perplexity_score: number;
  mention_rate: number;
  recommendation_rate: number;
  total_queries: number;
  score_change: number | null;
  created_at: string;
}

export interface Recommendation {
  id: string;
  brand_id: string;
  analysis_id: string | null;
  title: string;
  category: "content" | "technical_seo" | "structured_data" | "authority" | "brand_signals";
  priority: "critical" | "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  description: string;
  steps: string[];
  estimated_timeframe: string | null;
  related_metrics: string[];
  status: "pending" | "in_progress" | "completed" | "dismissed";
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}
