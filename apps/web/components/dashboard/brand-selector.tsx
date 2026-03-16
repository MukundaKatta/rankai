"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Brand } from "@/types/database";

interface BrandSelectorProps {
  brands: Brand[];
  selectedBrandId: string;
  onBrandChange: (brandId: string) => void;
}

export function BrandSelector({ brands, selectedBrandId, onBrandChange }: BrandSelectorProps) {
  return (
    <Select value={selectedBrandId} onValueChange={onBrandChange}>
      <SelectTrigger className="w-[280px]">
        <SelectValue placeholder="Select a brand" />
      </SelectTrigger>
      <SelectContent>
        {brands.map((brand) => (
          <SelectItem key={brand.id} value={brand.id}>
            <div className="flex items-center gap-2">
              <span className="font-medium">{brand.name}</span>
              <span className="text-xs text-muted-foreground">{brand.domain}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
