import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLANS } from "@/lib/stripe";
import { Eye, LineChart, Sparkles, Swords, BarChart3, Shield } from "lucide-react";

const features = [
  {
    icon: Eye,
    title: "AI Visibility Audit",
    description: "Discover how ChatGPT, Claude, Gemini, and Perplexity see your brand. Run comprehensive audits across 20-50 queries per AI model.",
  },
  {
    icon: LineChart,
    title: "Ranking Monitor",
    description: "Track your AI visibility score over time. Get weekly snapshots and trend analysis to measure the impact of your optimization efforts.",
  },
  {
    icon: Sparkles,
    title: "Content Optimization",
    description: "AI-generated content recommendations tailored for Generative Engine Optimization. Get blog posts, FAQs, and landing pages optimized for AI discovery.",
  },
  {
    icon: Swords,
    title: "Competitive Intelligence",
    description: "See how your competitors rank in AI model responses. Understand their strategies and find opportunities to outrank them.",
  },
  {
    icon: BarChart3,
    title: "GEO Reports",
    description: "Monthly comprehensive reports with actionable insights, trend analysis, and prioritized recommendations.",
  },
  {
    icon: Shield,
    title: "Structured Data",
    description: "Generate Schema.org JSON-LD markup that helps AI models understand your business entity, offerings, and authority.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Eye className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">RankAI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Get Discovered by <span className="text-primary">AI Models</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          RankAI is the first Generative Engine Optimization (GEO) platform. Monitor how ChatGPT, Claude, Gemini, and Perplexity recommend your brand, and optimize to get ranked higher.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/signup">
            <Button size="lg" className="text-lg px-8">
              Start Free Audit
            </Button>
          </Link>
          <Link href="#features">
            <Button size="lg" variant="outline" className="text-lg px-8">
              Learn More
            </Button>
          </Link>
        </div>
        <div className="mt-8 text-sm text-muted-foreground">
          Free plan includes 1 brand, 20 queries/audit, all core features. No credit card required.
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container py-24">
        <h2 className="text-center text-3xl font-bold">
          Everything you need for AI visibility
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
          Traditional SEO optimizes for search engines. GEO optimizes for AI models. RankAI gives you the tools to win in both.
        </p>
        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <feature.icon className="h-8 w-8 text-primary" />
                <CardTitle className="mt-4">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="container py-24">
        <h2 className="text-center text-3xl font-bold">Simple, transparent pricing</h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
          Start free and scale as your GEO needs grow.
        </p>
        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {Object.entries(PLANS).map(([key, plan]) => (
            <Card key={key} className={key === "professional" ? "border-primary shadow-lg" : ""}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  {plan.price > 0 && <span className="text-muted-foreground">/mo</span>}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <svg className="h-4 w-4 mt-0.5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="mt-6 block">
                  <Button className="w-full" variant={key === "professional" ? "default" : "outline"}>
                    {plan.price === 0 ? "Start Free" : "Get Started"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container flex flex-col items-center gap-4 text-center text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
              <Eye className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">RankAI</span>
          </div>
          <p>Generative Engine Optimization for the AI era.</p>
        </div>
      </footer>
    </div>
  );
}
