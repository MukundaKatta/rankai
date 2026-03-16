export { Analyzer } from "./analyzer";
export type {
  AnalysisResult,
  VisibilityGap,
  ContentGap,
  CompetitiveInsight,
  PrioritizedAction,
} from "./analyzer";

export { ContentGenerator } from "./generator";
export type { GeneratedContent } from "./generator";

export {
  generateOrganizationSchema,
  generateLocalBusinessSchema,
  generateFAQSchema,
  generateProductSchema,
  generateBreadcrumbSchema,
  generateArticleSchema,
  generateAllSchemas,
} from "./structured-data";
export type { StructuredDataOutput } from "./structured-data";

export { generateRecommendations } from "./recommendations";
export type { Recommendation } from "./recommendations";
