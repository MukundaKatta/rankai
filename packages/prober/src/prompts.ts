import type { Brand, ProbeQuery, QueryCategory, Vertical } from "./types";

const UNIVERSAL_TEMPLATES: Array<{ template: string; category: QueryCategory }> = [
  { template: "What is the best {category} in {city}?", category: "best_in_category" },
  { template: "Top 10 {category} companies in {country}", category: "top_list" },
  { template: "Recommend a {category} near {location}", category: "recommendation" },
  { template: "What do people say about {brand}?", category: "review" },
  { template: "Is {brand} good? What are the reviews?", category: "review" },
  { template: "{brand} reviews and reputation", category: "review" },
  { template: "Compare {brand} vs {competitor}", category: "comparison" },
  { template: "What are the best alternatives to {competitor}?", category: "alternative" },
  { template: "Which {category} should I choose in {city}?", category: "recommendation" },
  { template: "Who are the top {category} providers?", category: "top_list" },
  { template: "I need a {category} recommendation for {city}", category: "recommendation" },
  { template: "Best rated {category} services", category: "best_in_category" },
];

const VERTICAL_TEMPLATES: Record<Vertical, Array<{ template: string; category: QueryCategory }>> = {
  restaurant: [
    { template: "Best {keywords} restaurant in {city}", category: "best_in_category" },
    { template: "Where should I eat {keywords} food in {city}?", category: "recommendation" },
    { template: "Top rated restaurants for {keywords} in {location}", category: "top_list" },
    { template: "Best place for dinner in {city} {keywords}", category: "recommendation" },
    { template: "What is the best fine dining in {city}?", category: "best_in_category" },
  ],
  hotel: [
    { template: "Best hotels in {city} for business travel", category: "best_in_category" },
    { template: "Where should I stay in {city}?", category: "recommendation" },
    { template: "Top luxury hotels in {city}", category: "top_list" },
    { template: "Best value hotels in {city} {keywords}", category: "recommendation" },
    { template: "Hotel recommendations near {location}", category: "recommendation" },
  ],
  saas: [
    { template: "Best {keywords} software for small business", category: "best_in_category" },
    { template: "What {keywords} tool should I use?", category: "recommendation" },
    { template: "Top {keywords} platforms compared", category: "comparison" },
    { template: "How to choose the right {keywords} software", category: "how_to" },
    { template: "{brand} vs competitors: which is best?", category: "comparison" },
    { template: "Best {keywords} solution for enterprise", category: "best_in_category" },
  ],
  ecommerce: [
    { template: "Best place to buy {keywords} online", category: "best_in_category" },
    { template: "Where to shop for {keywords}?", category: "recommendation" },
    { template: "Most trusted online {keywords} stores", category: "top_list" },
    { template: "Best deals on {keywords}", category: "recommendation" },
    { template: "{brand} online shopping review", category: "review" },
  ],
  healthcare: [
    { template: "Best {keywords} doctor in {city}", category: "best_in_category" },
    { template: "Top rated {keywords} clinic near {location}", category: "recommendation" },
    { template: "Where to get {keywords} treatment in {city}", category: "recommendation" },
    { template: "Best {keywords} specialist in {city}", category: "best_in_category" },
    { template: "How to find a good {keywords} provider", category: "how_to" },
  ],
  legal: [
    { template: "Best {keywords} lawyer in {city}", category: "best_in_category" },
    { template: "Top law firms for {keywords} in {city}", category: "top_list" },
    { template: "How to find a {keywords} attorney", category: "how_to" },
    { template: "Recommended {keywords} lawyers near {location}", category: "recommendation" },
    { template: "{keywords} legal services in {city}", category: "industry_specific" },
  ],
  real_estate: [
    { template: "Best real estate agents in {city}", category: "best_in_category" },
    { template: "Top real estate companies in {city} for {keywords}", category: "top_list" },
    { template: "Who to hire for {keywords} in {city}", category: "recommendation" },
    { template: "Best {keywords} real estate services", category: "best_in_category" },
    { template: "How to find a good realtor in {city}", category: "how_to" },
  ],
  education: [
    { template: "Best {keywords} courses online", category: "best_in_category" },
    { template: "Top {keywords} programs in {city}", category: "top_list" },
    { template: "Where to learn {keywords}", category: "recommendation" },
    { template: "Best {keywords} training for professionals", category: "best_in_category" },
    { template: "Online vs in-person {keywords} education", category: "industry_specific" },
  ],
  fitness: [
    { template: "Best {keywords} gym in {city}", category: "best_in_category" },
    { template: "Top fitness centers near {location}", category: "top_list" },
    { template: "Where to work out in {city}", category: "recommendation" },
    { template: "Best {keywords} classes in {city}", category: "best_in_category" },
    { template: "{keywords} fitness programs compared", category: "comparison" },
  ],
  automotive: [
    { template: "Best {keywords} dealership in {city}", category: "best_in_category" },
    { template: "Top auto repair shops near {location}", category: "top_list" },
    { template: "Where to buy a {keywords} car in {city}", category: "recommendation" },
    { template: "Best {keywords} service center", category: "best_in_category" },
    { template: "{keywords} car maintenance tips", category: "industry_specific" },
  ],
  financial: [
    { template: "Best {keywords} services in {city}", category: "best_in_category" },
    { template: "Top financial advisors for {keywords}", category: "top_list" },
    { template: "How to choose a {keywords} provider", category: "how_to" },
    { template: "Best {keywords} companies compared", category: "comparison" },
    { template: "{keywords} financial planning advice", category: "industry_specific" },
  ],
  travel: [
    { template: "Best {keywords} travel agency", category: "best_in_category" },
    { template: "Top {keywords} tour operators in {city}", category: "top_list" },
    { template: "Where to book {keywords} trips", category: "recommendation" },
    { template: "Best {keywords} travel deals", category: "recommendation" },
    { template: "How to plan a {keywords} vacation", category: "how_to" },
  ],
  home_services: [
    { template: "Best {keywords} service in {city}", category: "best_in_category" },
    { template: "Top rated {keywords} companies near {location}", category: "top_list" },
    { template: "How to find a reliable {keywords} service", category: "how_to" },
    { template: "Best {keywords} contractor in {city}", category: "recommendation" },
    { template: "{keywords} service cost in {city}", category: "industry_specific" },
  ],
  retail: [
    { template: "Best {keywords} stores in {city}", category: "best_in_category" },
    { template: "Where to buy {keywords} near {location}", category: "recommendation" },
    { template: "Top {keywords} shops reviewed", category: "top_list" },
    { template: "Best places for {keywords} shopping", category: "recommendation" },
    { template: "{keywords} store recommendations", category: "recommendation" },
  ],
  general: [
    { template: "Best {keywords} services in {city}", category: "best_in_category" },
    { template: "Top {keywords} companies reviewed", category: "top_list" },
    { template: "How to choose a {keywords} provider in {city}", category: "how_to" },
    { template: "Recommended {keywords} near {location}", category: "recommendation" },
    { template: "{keywords} industry leaders", category: "industry_specific" },
  ],
};

function renderTemplate(template: string, brand: Brand, competitor?: string): string {
  const keyword = brand.keywords.length > 0 ? brand.keywords[Math.floor(Math.random() * brand.keywords.length)] : brand.vertical;
  const location = [brand.city, brand.state, brand.country].filter(Boolean).join(", ");

  return template
    .replace(/\{brand\}/g, brand.name)
    .replace(/\{category\}/g, brand.vertical.replace(/_/g, " "))
    .replace(/\{city\}/g, brand.city || brand.country)
    .replace(/\{state\}/g, brand.state || "")
    .replace(/\{country\}/g, brand.country)
    .replace(/\{location\}/g, location)
    .replace(/\{keywords\}/g, keyword)
    .replace(/\{competitor\}/g, competitor || "competitors");
}

export function generateProbeQueries(brand: Brand): ProbeQuery[] {
  const queries: ProbeQuery[] = [];
  let queryIndex = 0;

  const createQuery = (template: string, category: QueryCategory, competitor?: string): ProbeQuery => ({
    id: `${brand.id}-q${queryIndex++}`,
    brandId: brand.id,
    template,
    rendered: renderTemplate(template, brand, competitor),
    category,
  });

  // Add universal templates
  for (const { template, category } of UNIVERSAL_TEMPLATES) {
    queries.push(createQuery(template, category));
  }

  // Add vertical-specific templates
  const verticalTemplates = VERTICAL_TEMPLATES[brand.vertical] || VERTICAL_TEMPLATES.general;
  for (const { template, category } of verticalTemplates) {
    queries.push(createQuery(template, category));
  }

  // Add competitor comparison queries
  for (const competitor of brand.competitors.slice(0, 5)) {
    queries.push(
      createQuery("Compare {brand} vs {competitor}", "comparison", competitor)
    );
    queries.push(
      createQuery("Is {brand} better than {competitor}?", "comparison", competitor)
    );
    queries.push(
      createQuery("What are the best alternatives to {competitor}?", "alternative", competitor)
    );
  }

  // Add keyword-specific queries
  for (const keyword of brand.keywords.slice(0, 3)) {
    queries.push(
      createQuery(`Best ${keyword} provider in {city}`, "best_in_category")
    );
    queries.push(
      createQuery(`Who offers the best ${keyword} services?`, "recommendation")
    );
  }

  return queries;
}

export function getSystemPromptForProbing(): string {
  return "You are a helpful assistant providing recommendations and information. Answer naturally and thoroughly. If you know specific businesses or brands relevant to the query, mention them by name. Provide honest assessments based on your knowledge.";
}
