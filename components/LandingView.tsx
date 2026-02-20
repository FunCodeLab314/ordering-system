"use client";

import { useState } from "react";


import { motion, AnimatePresence } from "framer-motion";
import { Leaf, Truck, ShieldCheck, ArrowRight, ShoppingBag, X, Plus } from "lucide-react";

import Image from "next/image";
import { products } from "@/lib/data";

interface LandingViewProps {
    onLogin: () => void;
}

export default function LandingView({ onLogin }: LandingViewProps) {
    const [showLoginModal, setShowLoginModal] = useState(false);
    const bestSellers = products.filter((p) => p.isBestSeller).slice(0, 4);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-[#FDFBF7]"
        >
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-emerald-50">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-emerald-700 rounded-full flex items-center justify-center">
                            <Leaf className="w-6 h-6 text-white" strokeWidth={1.5} />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-slate-900">
                            Ate Ai's Kitchen
                        </span>
                    </div>

                    <nav className="hidden md:flex items-center gap-8 text-slate-500 font-medium tracking-tight">
                        <a href="#story" className="hover:text-emerald-700 transition-colors">Our Story</a>
                        <a href="#menu" className="hover:text-emerald-700 transition-colors">Menu</a>
                        <a href="#features" className="hover:text-emerald-700 transition-colors">Features</a>
                    </nav>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowLoginModal(true)}
                            className="hidden sm:block text-slate-900 font-semibold hover:text-emerald-700 transition-colors tracking-tight px-4"
                        >
                            Sign Up
                        </button>
                        <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={() => setShowLoginModal(true)}
                            className="bg-emerald-700 text-white font-semibold rounded-full px-6 py-2.5 hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2"
                        >
                            Login
                        </motion.button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section id="story" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8">
                        <h1 className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight leading-[1.1]">
                            Authentic Kakanin, <br />
                            <span className="text-emerald-700">Made Fresh</span> for You
                        </h1>
                        <p className="text-lg text-slate-500 max-w-md leading-relaxed">
                            Experience the true taste of Filipino traditions. Handcrafted daily using locally sourced, organic ingredients passed directly from our farm to your table.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <motion.button
                                whileTap={{ scale: 0.96 }}
                                onClick={() => setShowLoginModal(true)}
                                className="bg-emerald-700 text-white font-semibold rounded-full px-8 py-3.5 hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 text-lg shadow-sm shadow-emerald-700/20"
                            >
                                Order Now <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.96 }}
                                onClick={() => {
                                    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
                                }}
                                className="bg-emerald-50 text-emerald-800 font-semibold rounded-full px-8 py-3.5 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 text-lg"
                            >
                                View Menu
                            </motion.button>
                        </div>
                    </div>
                    <div className="relative h-[400px] md:h-[500px] w-full rounded-[2.5rem] overflow-hidden shadow-2xl shadow-emerald-900/10">
                        <Image
                            src="https://images.unsplash.com/photo-1512485800893-b08ec1ea59b1?q=80&w=1000&auto=format&fit=crop"
                            alt="Delicious Kakanin"
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>
                </div>
            </section>

            {/* Features Row */}
            <section id="features" className="bg-white py-16 border-y border-emerald-50">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="grid sm:grid-cols-3 gap-8">
                        {[
                            { icon: Leaf, title: "100% Organic", desc: "Sourced from local partner farms" },
                            { icon: Truck, title: "Fast Delivery", desc: "Freshness delivered to your door" },
                            { icon: ShieldCheck, title: "Quality Guaranteed", desc: "Made with love and tradition" },
                        ].map((feature, idx) => (
                            <div key={idx} className="flex flex-col items-center text-center space-y-4 p-6 rounded-3xl hover:bg-[#FDFBF7] transition-colors group cursor-default">
                                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center group-hover:bg-emerald-100 transition-colors group-hover:scale-110 duration-300">
                                    <feature.icon className="w-8 h-8 text-emerald-700" strokeWidth={1.5} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">{feature.title}</h3>
                                    <p className="text-slate-500 mt-2">{feature.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Best Sellers */}
            <section id="menu" className="py-20 max-w-6xl mx-auto px-4 sm:px-6">
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Our Best Sellers</h2>
                        <p className="text-slate-500 mt-2 text-lg">Taste our most loved recipes</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {bestSellers.map((product) => (
                        <motion.div
                            key={product.id}
                            whileHover={{ y: -8 }}
                            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all"
                        >
                            <div className="aspect-[4/3] w-full relative">
                                <Image
                                    src={product.image}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                />
                                <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10">
                                    Best Seller
                                </div>
                            </div>
                            <div className="p-4 flex-1 flex flex-col text-left items-start">
                                <h3 className="text-lg font-bold text-slate-900 tracking-tight line-clamp-1">
                                    {product.name}
                                </h3>
                                <p className="text-sm text-slate-500 line-clamp-2 mt-1">
                                    The top choice among all our customers, delicious, authentic and a part of an amazing experience!
                                </p>
                                <div className="flex justify-between items-center mt-auto w-full pt-4">
                                    <div className="text-lg font-extrabold text-emerald-700">
                                        ₱{product.price}
                                    </div>
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setShowLoginModal(true)}
                                        className="bg-emerald-50 text-emerald-700 hover:bg-emerald-700 hover:text-white p-2.5 rounded-xl transition-colors"
                                    >
                                        <Plus className="w-5 h-5" strokeWidth={2.5} />
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white py-12 border-t border-emerald-50 text-center text-slate-500">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <Leaf className="w-5 h-5 text-emerald-700" strokeWidth={1.5} />
                    <span className="font-bold text-lg tracking-tight text-slate-900">
                        Ate Ai's Kitchen
                    </span>
                </div>
                <p>&copy; {new Date().getFullYear()} Ate Ai's Kitchen. All rights reserved.</p>
            </footer>

            {/* Login Modal */}
            <AnimatePresence>
                {showLoginModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowLoginModal(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl z-10"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome Back</h2>
                                <button
                                    onClick={() => setShowLoginModal(false)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email or Phone Number</label>
                                    <input
                                        type="text"
                                        placeholder="Enter your details"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-500 transition-all"
                                    />
                                </div>

                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onLogin}
                                    className="w-full bg-emerald-700 text-white font-semibold rounded-xl py-3 mt-2 shadow-md shadow-emerald-700/20 hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2"
                                >
                                    Login
                                </motion.button>

                                <div className="relative py-4">
                                    <div className="absolute inset-x-0 top-1/2 h-px bg-slate-100 -translate-y-1/2"></div>
                                    <div className="relative flex justify-center">
                                        <span className="bg-white px-4 text-xs font-medium text-slate-400">or continue with</span>
                                    </div>
                                </div>

                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full bg-white border border-slate-200 text-slate-700 font-medium rounded-xl py-3 hover:bg-slate-50 transition-colors flex items-center justify-center gap-3"
                                >
                                    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    Login with Google
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
