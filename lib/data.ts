// lib/data.ts
// Static fallback data ONLY — actual data comes from Supabase
// This file is kept for TypeScript type compatibility but
// the products array is now EMPTY. Use useProducts() hook instead.

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  isBestSeller?: boolean;
  tags?: string[];
};

// EMPTY — data now comes from Supabase via useProducts hook
export const products: Product[] = [];

export const categories = ["All", "Kakanin", "Suman", "Party Trays"];
