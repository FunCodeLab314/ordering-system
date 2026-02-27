"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Product } from "@/lib/data";

type ProductRow = {
  name: string;
  price: number;
  image_url: string | null;
  description: string | null;
  category: string;
  is_best_seller: boolean;
  tags: string[];
};

type CartItemRow = {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  products: ProductRow[] | null;
};

export interface CartItemWithProduct {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  name: string;
  price: number;
  image: string;
  description: string;
  category: string;
  isBestSeller?: boolean;
  tags?: string[];
}

export function useCart(user: User | null) {
  const [cartItems, setCartItems] = useState<CartItemWithProduct[]>([]);
  const [cartId, setCartId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const initCart = useCallback(async () => {
    if (!user) {
      setCartItems([]);
      setCartId(null);
      return;
    }

    setLoading(true);
    try {
      let { data: cart } = await supabase
        .from("carts")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!cart) {
        const { data: newCart } = await supabase
          .from("carts")
          .insert({ user_id: user.id })
          .select("id")
          .single();
        cart = newCart;
      }

      if (!cart) return;
      setCartId(cart.id);

      const { data: items } = await supabase
        .from("cart_items")
        .select("id, cart_id, product_id, quantity, products(name, price, image_url, description, category, is_best_seller, tags)")
        .eq("cart_id", cart.id);

      if (items) {
        setCartItems((items as unknown as CartItemRow[]).map((item) => {
          const p = item.products?.[0];
          return {
            id: item.id,
            cart_id: item.cart_id,
            product_id: item.product_id,
            quantity: item.quantity,
            name: p?.name ?? "",
            price: p?.price ?? 0,
            image: p?.image_url ?? "/placeholder.png",
            description: p?.description ?? "",
            category: p?.category ?? "",
            isBestSeller: p?.is_best_seller,
            tags: p?.tags,
          };
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    void initCart();
  }, [initCart]);

  const addToCart = useCallback(async (product: Product) => {
    if (!user || !cartId) return;

    setCartItems((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, {
        id: `temp-${product.id}`,
        cart_id: cartId,
        product_id: product.id,
        quantity: 1,
        name: product.name,
        price: product.price,
        image: product.image,
        description: product.description,
        category: product.category,
        isBestSeller: product.isBestSeller,
        tags: product.tags,
      }];
    });

    const existing = cartItems.find((i) => i.product_id === product.id);
    if (existing) {
      await supabase
        .from("cart_items")
        .update({ quantity: existing.quantity + 1 })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("cart_items")
        .insert({ cart_id: cartId, product_id: product.id, quantity: 1 });
    }

    await initCart();
  }, [user, cartId, cartItems, supabase, initCart]);

  const updateQuantity = useCallback(async (cartItemId: string, delta: number) => {
    const item = cartItems.find((i) => i.id === cartItemId);
    if (!item) return;

    const newQty = Math.max(0, item.quantity + delta);

    if (newQty === 0) {
      setCartItems((prev) => prev.filter((i) => i.id !== cartItemId));
      await supabase.from("cart_items").delete().eq("id", cartItemId);
    } else {
      setCartItems((prev) =>
        prev.map((i) => (i.id === cartItemId ? { ...i, quantity: newQty } : i))
      );
      await supabase.from("cart_items").update({ quantity: newQty }).eq("id", cartItemId);
    }
  }, [cartItems, supabase]);

  const clearCart = useCallback(async () => {
    if (!cartId) return;
    setCartItems([]);
    await supabase.from("cart_items").delete().eq("cart_id", cartId);
  }, [cartId, supabase]);

  return {
    cartItems,
    cartCount: cartItems.reduce((acc, i) => acc + i.quantity, 0),
    loading,
    addToCart,
    updateQuantity,
    clearCart,
  };
}
