import Anthropic from "@anthropic-ai/sdk";
import type { Brand } from "@rankai/prober";
import type { AnalysisResult, ContentGap } from "./analyzer";

export interface GeneratedContent {
  brandId: string;
  title: string;
  contentType: ContentGap["contentType"];
  content: string;
  metaDescription: string;
  targetKeywords: string[];
  estimatedWordCount: number;
  structuredDataSuggestion: string;
  internalLinkingSuggestions: string[];
  callToAction: string;
}

export class ContentGenerator {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateContent(
    brand: Brand,
    contentGap: ContentGap,
    analysis: AnalysisResult
  ): Promise<GeneratedContent> {
    const prompt = this.buildGenerationPrompt(brand, contentGap, analysis);

    const message = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = message.content[0]?.type === "text" ? message.content[0].text : "";

    try {
      const parsed = JSON.parse(responseText);
      return {
        brandId: brand.id,
        title: parsed.title ?? contentGap.topic,
        contentType: contentGap.contentType,
        content: parsed.content ?? "",
        metaDescription: parsed.metaDescription ?? "",
        targetKeywords: parsed.targetKeywords ?? brand.keywords,
        estimatedWordCount: parsed.content?.split(/\s+/).length ?? 0,
        structuredDataSuggestion: parsed.structuredDataSuggestion ?? "",
        internalLinkingSuggestions: parsed.internalLinkingSuggestions ?? [],
        callToAction: parsed.callToAction ?? "",
      };
    } catch {
      // Extract JSON from code blocks
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        return {
          brandId: brand.id,
          title: parsed.title ?? contentGap.topic,
          contentType: contentGap.contentType,
          content: parsed.content ?? "",
          metaDescription: parsed.metaDescription ?? "",
          targetKeywords: parsed.targetKeywords ?? brand.keywords,
          estimatedWordCount: parsed.content?.split(/\s+/).length ?? 0,
          structuredDataSuggestion: parsed.structuredDataSuggestion ?? "",
          internalLinkingSuggestions: parsed.internalLinkingSuggestions ?? [],
          callToAction: parsed.callToAction ?? "",
        };
      }

      return {
        brandId: brand.id,
        title: contentGap.topic,
        contentType: contentGap.contentType,
        content: responseText,
        metaDescription: "",
        targetKeywords: brand.keywords,
        estimatedWordCount: responseText.split(/\s+/).length,
        structuredDataSuggestion: "",
        internalLinkingSuggestions: [],
        callToAction: "",
      };
    }
  }

  async generateBatch(
    brand: Brand,
    contentGaps: ContentGap[],
    analysis: AnalysisResult
  ): Promise<GeneratedContent[]> {
    const results: GeneratedContent[] = [];
    for (const gap of contentGaps) {
      const content = await this.generateContent(brand, gap, analysis);
      results.push(content);
    }
    return results;
  }

  private buildGenerationPrompt(
    brand: Brand,
    contentGap: ContentGap,
    analysis: AnalysisResult
  ): string {
    const contentTypeGuide: Record<ContentGap["contentType"], string> = {
      blog_post: "Write a comprehensive, authoritative blog post (1500-2500 words). Use clear headings, include statistics and data points, cite authoritative sources, and naturally integrate the brand. Structure for featured snippets with clear Q&A sections.",
      faq: "Create a thorough FAQ page (20-30 questions) organized by topic. Each answer should be 2-4 sentences, factual, and directly useful. Include Schema.org FAQPage markup suggestions.",
      landing_page: "Write conversion-focused landing page copy with clear value propositions, social proof sections, feature highlights, and strong CTAs. Include both above-fold and below-fold content.",
      case_study: "Write a detailed case study with the challenge/solution/results framework. Include specific metrics, quotes, and a clear narrative arc. Make it data-driven and credible.",
      comparison: "Create a fair, thorough comparison guide that positions the brand favorably while being credible. Include feature tables, pros/cons, and clear recommendations for different use cases.",
      guide: "Write an in-depth, authoritative guide (2000-3500 words) that demonstrates expertise. Include step-by-step instructions, expert tips, and comprehensive coverage of the topic.",
    };

    return `You are a GEO (Generative Engine Optimization) content strategist. Generate optimized content that will improve a brand's visibility in AI model responses.

## Brand Information
- Name: ${brand.name}
- Domain: ${brand.domain}
- Vertical: ${brand.vertical}
- Location: ${[brand.city, brand.state, brand.country].filter(Boolean).join(", ")}
- Description: ${brand.description}
- Keywords: ${brand.keywords.join(", ")}

## Content Gap to Address
- Topic: ${contentGap.topic}
- Description: ${contentGap.description}
- Content Type: ${contentGap.contentType}

## Content Guidelines
${contentTypeGuide[contentGap.contentType]}

## GEO Optimization Requirements
1. **Entity-first writing**: Clearly establish the brand as an entity with consistent naming, descriptions, and attributes
2. **Structured information**: Use clear headings, lists, and structured formats that AI models can easily parse
3. **Authoritative tone**: Write with expertise and confidence; cite data points and industry knowledge
4. **Natural brand integration**: Mention the brand name naturally 3-5 times without keyword stuffing
5. **Semantic richness**: Use related terms, synonyms, and industry terminology throughout
6. **Factual density**: Include specific numbers, statistics, and verifiable claims
7. **Comprehensive coverage**: Cover the topic thoroughly to become a reference source
8. **Clear answers**: Provide direct, concise answers to common questions (optimized for AI extraction)

## Key Weaknesses to Address
${analysis.overallAssessment.substring(0, 500)}

Generate the content in JSON format (no markdown wrapper):
{
  "title": "SEO-optimized title (60-70 chars)",
  "content": "Full content in markdown format",
  "metaDescription": "Compelling meta description (150-160 chars)",
  "targetKeywords": ["keyword1", "keyword2", ...],
  "structuredDataSuggestion": "Schema.org JSON-LD markup suggestion",
  "internalLinkingSuggestions": ["page1", "page2", ...],
  "callToAction": "Recommended CTA text"
}`;
  }
}
