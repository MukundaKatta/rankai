import type { Brand, Vertical } from "@rankai/prober";

export interface StructuredDataOutput {
  type: string;
  jsonLd: Record<string, unknown>;
  raw: string;
}

const VERTICAL_SCHEMA_MAP: Record<Vertical, string[]> = {
  restaurant: ["Restaurant", "FoodEstablishment", "LocalBusiness"],
  hotel: ["Hotel", "LodgingBusiness", "LocalBusiness"],
  saas: ["SoftwareApplication", "Organization", "Product"],
  ecommerce: ["Organization", "Store", "Product"],
  healthcare: ["MedicalOrganization", "Physician", "LocalBusiness"],
  legal: ["LegalService", "Attorney", "LocalBusiness"],
  real_estate: ["RealEstateAgent", "Organization", "LocalBusiness"],
  education: ["EducationalOrganization", "Course", "Organization"],
  fitness: ["SportsActivityLocation", "HealthClub", "LocalBusiness"],
  automotive: ["AutoDealer", "AutoRepair", "LocalBusiness"],
  financial: ["FinancialService", "Organization", "LocalBusiness"],
  travel: ["TravelAgency", "Organization", "LocalBusiness"],
  home_services: ["HomeAndConstructionBusiness", "LocalBusiness", "Organization"],
  retail: ["Store", "LocalBusiness", "Organization"],
  general: ["Organization", "LocalBusiness"],
};

export function generateOrganizationSchema(brand: Brand): StructuredDataOutput {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brand.name,
    url: `https://${brand.domain}`,
    description: brand.description,
  };

  if (brand.city || brand.state || brand.country) {
    schema.address = {
      "@type": "PostalAddress",
      ...(brand.city && { addressLocality: brand.city }),
      ...(brand.state && { addressRegion: brand.state }),
      ...(brand.country && { addressCountry: brand.country }),
    };
  }

  if (brand.keywords.length > 0) {
    schema.knowsAbout = brand.keywords;
  }

  return {
    type: "Organization",
    jsonLd: schema,
    raw: JSON.stringify(schema, null, 2),
  };
}

export function generateLocalBusinessSchema(brand: Brand): StructuredDataOutput {
  const verticalTypes = VERTICAL_SCHEMA_MAP[brand.vertical] ?? VERTICAL_SCHEMA_MAP.general;
  const primaryType = verticalTypes[0];

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": primaryType,
    name: brand.name,
    url: `https://${brand.domain}`,
    description: brand.description,
  };

  if (brand.city || brand.state || brand.country) {
    schema.address = {
      "@type": "PostalAddress",
      ...(brand.city && { addressLocality: brand.city }),
      ...(brand.state && { addressRegion: brand.state }),
      ...(brand.country && { addressCountry: brand.country }),
    };
  }

  schema.areaServed = {
    "@type": "City",
    name: brand.city ?? brand.country,
  };

  return {
    type: primaryType,
    jsonLd: schema,
    raw: JSON.stringify(schema, null, 2),
  };
}

export function generateFAQSchema(
  faqs: Array<{ question: string; answer: string }>
): StructuredDataOutput {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return {
    type: "FAQPage",
    jsonLd: schema,
    raw: JSON.stringify(schema, null, 2),
  };
}

export function generateProductSchema(
  brand: Brand,
  product: {
    name: string;
    description: string;
    category?: string;
    ratingValue?: number;
    reviewCount?: number;
    priceRange?: string;
  }
): StructuredDataOutput {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    brand: {
      "@type": "Brand",
      name: brand.name,
    },
    ...(product.category && { category: product.category }),
    ...(product.ratingValue && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: product.ratingValue,
        bestRating: 5,
        ...(product.reviewCount && { reviewCount: product.reviewCount }),
      },
    }),
    ...(product.priceRange && { priceRange: product.priceRange }),
    url: `https://${brand.domain}`,
  };

  return {
    type: "Product",
    jsonLd: schema,
    raw: JSON.stringify(schema, null, 2),
  };
}

export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
): StructuredDataOutput {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return {
    type: "BreadcrumbList",
    jsonLd: schema,
    raw: JSON.stringify(schema, null, 2),
  };
}

export function generateArticleSchema(
  brand: Brand,
  article: {
    title: string;
    description: string;
    datePublished: string;
    dateModified?: string;
    author?: string;
    imageUrl?: string;
    url: string;
  }
): StructuredDataOutput {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.datePublished,
    dateModified: article.dateModified ?? article.datePublished,
    author: {
      "@type": "Organization",
      name: article.author ?? brand.name,
      url: `https://${brand.domain}`,
    },
    publisher: {
      "@type": "Organization",
      name: brand.name,
      url: `https://${brand.domain}`,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": article.url,
    },
    ...(article.imageUrl && {
      image: {
        "@type": "ImageObject",
        url: article.imageUrl,
      },
    }),
  };

  return {
    type: "Article",
    jsonLd: schema,
    raw: JSON.stringify(schema, null, 2),
  };
}

export function generateAllSchemas(brand: Brand): StructuredDataOutput[] {
  const schemas: StructuredDataOutput[] = [
    generateOrganizationSchema(brand),
    generateLocalBusinessSchema(brand),
  ];

  return schemas;
}
