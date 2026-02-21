"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import LandingView from "@/components/LandingView";
import DashboardView from "@/components/DashboardView";
import CartDrawer, { CartItem } from "@/components/CartDrawer";
import { Product } from "@/lib/data";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [shouldRedirectToOrders, setShouldRedirectToOrders] = useState(false);

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleAddToCart = (product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handlePlaceOrder = () => {
    setCartItems([]);
    setIsCartOpen(false);
    setShouldRedirectToOrders(true);
  };

  return (
    <div className="font-sans antialiased text-slate-900 bg-[#FDFBF7] min-h-screen">
      <AnimatePresence mode="wait">
        {!isLoggedIn ? (
          <LandingView key="landing" onLogin={() => setIsLoggedIn(true)} />
        ) : (
          <DashboardView
            key="dashboard"
            cartCount={cartCount}
            onOpenCart={() => setIsCartOpen(true)}
            onAddToCart={handleAddToCart}
            onLogout={() => setIsLoggedIn(false)}
            shouldRedirectToOrders={shouldRedirectToOrders}
            onRedirectHandled={() => setShouldRedirectToOrders(false)}
          />
        )}
      </AnimatePresence>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onPlaceOrder={handlePlaceOrder}
      />
    </div>
  );
}
