"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Menu } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import {
  Eye,
  LineChart,
  Sparkles,
  Swords,
  FileText,
  BarChart3,
} from "lucide-react";

const mobileNavItems = [
  { href: "/audit", label: "Audit", icon: Eye },
  { href: "/monitor", label: "Monitor", icon: LineChart },
  { href: "/optimize", label: "Optimize", icon: Sparkles },
  { href: "/competitors", label: "Competitors", icon: Swords },
  { href: "/content", label: "Content", icon: FileText },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export function Header() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
        <div className="flex items-center gap-4 lg:hidden">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-lg font-bold">RankAI</span>
        </div>

        <div className="hidden lg:block" />

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden">
          <div className="fixed inset-y-0 left-0 w-64 bg-card shadow-lg">
            <div className="flex h-16 items-center justify-between border-b px-6">
              <span className="text-xl font-bold">RankAI</span>
              <button onClick={() => setMobileMenuOpen(false)}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="space-y-1 p-4">
              {mobileNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
