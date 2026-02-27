"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import LandingView from "@/components/LandingView";
import DashboardView from "@/components/DashboardView";
import CartDrawer from "@/components/CartDrawer";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import type { Product } from "@/lib/data";

export default function Home() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { cartItems, cartCount, addToCart, updateQuantity, clearCart } = useCart(user);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [shouldRedirectToOrders, setShouldRedirectToOrders] = useState(false);

  const handleAddToCart = (product: Product) => {
    addToCart(product);
  };

  const handlePlaceOrder = () => {
    clearCart();
    setIsCartOpen(false);
    setShouldRedirectToOrders(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-emerald-700 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="font-sans antialiased text-slate-900 bg-[#FDFBF7] min-h-screen">
      <AnimatePresence mode="wait">
        {!user ? (
          <LandingView key="landing" onLogin={() => {}} />
        ) : (
          <DashboardView
            key="dashboard"
            cartCount={cartCount}
            onOpenCart={() => setIsCartOpen(true)}
            onAddToCart={handleAddToCart}
            onLogout={signOut}
            shouldRedirectToOrders={shouldRedirectToOrders}
            onRedirectHandled={() => setShouldRedirectToOrders(false)}
          />
        )}
      </AnimatePresence>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems.map((item) => ({
          ...item,
          id: item.product_id,
        }))}
        onUpdateQuantity={(productId, delta) => {
          const cartItem = cartItems.find((i) => i.product_id === productId);
          if (cartItem) updateQuantity(cartItem.id, delta);
        }}
        onPlaceOrder={handlePlaceOrder}
      />
    </div>
  );
}
