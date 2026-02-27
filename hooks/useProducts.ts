"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Product as DBProduct } from "@/lib/types/database";
import type { Product } from "@/lib/data";

function mapProduct(p: DBProduct): Product {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? "",
    price: p.price,
    image: p.image_url ?? "/placeholder.png",
    category: p.category,
    isBestSeller: p.is_best_seller,
    tags: p.tags,
  };
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function fetchProducts() {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_available", true)
        .order("sort_order", { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setProducts((data ?? []).map(mapProduct));
      }
      setLoading(false);
    }

    fetchProducts();
  }, []);

  return { products, loading, error };
}
