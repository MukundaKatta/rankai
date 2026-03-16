"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Brand } from "@/types/database";

export function useBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const { data: memberships } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      setBrands([]);
      setLoading(false);
      return;
    }

    const orgIds = memberships.map((m) => m.organization_id);
    const { data, error: fetchError } = await supabase
      .from("brands")
      .select("*")
      .in("organization_id", orgIds)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setBrands(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  return { brands, loading, error, refetch: fetchBrands };
}

export function useBrand(brandId: string | null) {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!brandId) {
      setBrand(null);
      setLoading(false);
      return;
    }

    const fetchBrand = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("brands")
        .select("*")
        .eq("id", brandId)
        .single();
      setBrand(data);
      setLoading(false);
    };

    fetchBrand();
  }, [brandId]);

  return { brand, loading };
}
