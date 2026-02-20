"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingBag, Leaf, Plus, User, Star, X, MapPin, CreditCard, Settings, HelpCircle, ChevronRight, Store, ReceiptText } from "lucide-react";
import Image from "next/image";
import { products, categories, Product } from "@/lib/data";

const promoSlides = [
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop"
];

interface DashboardViewProps {
    cartCount: number;
    onOpenCart: () => void;
    onAddToCart: (product: Product) => void;
    onLogout: () => void;
}

export default function DashboardView({ cartCount, onOpenCart, onAddToCart, onLogout }: DashboardViewProps) {
    const [activeCategory, setActiveCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [showToast, setShowToast] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [activeTab, setActiveTab] = useState<"home" | "orders" | "profile">("home");

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % promoSlides.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const filteredProducts = products.filter((p) => {
        const matchesCategory = activeCategory === "All" || p.category === activeCategory;
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handleAddToCart = (product: Product) => {
        onAddToCart(product);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-[#FDFBF7] pb-24"
        >
            {/* Toast Notification */}
            <AnimatePresence>
                {showToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: "-50%" }}
                        animate={{ opacity: 1, y: 0, x: "-50%" }}
                        exit={{ opacity: 0, y: 50, x: "-50%" }}
                        className="fixed bottom-8 left-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-lg shadow-slate-900/20 font-medium flex items-center gap-2"
                    >
                        <Leaf className="w-4 h-4 text-emerald-400" strokeWidth={2} />
                        Added to your cart!
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Dashboard Navbar */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-emerald-50">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center gap-6">
                    <div className="flex items-center gap-2 shrink-0 hidden md:flex">
                        <div className="w-10 h-10 bg-emerald-700 rounded-full flex items-center justify-center">
                            <Leaf className="w-6 h-6 text-white" strokeWidth={1.5} />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-slate-900">
                            Kitchen
                        </span>
                    </div>

                    <div className="flex-1 max-w-xl relative mx-auto">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="w-5 h-5 text-slate-400" strokeWidth={1.5} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search for delicacy..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-gray-100 rounded-full w-full py-3 pl-12 pr-6 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:bg-white transition-all placeholder:text-slate-500 font-medium"
                        />
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onOpenCart}
                            className="relative w-12 h-12 bg-white rounded-full border border-emerald-100 flex items-center justify-center hover:bg-emerald-50 transition-colors"
                        >
                            <ShoppingBag className="w-6 h-6 text-slate-900" strokeWidth={1.5} />
                            {cartCount > 0 && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-[10px] font-bold w-5 h-5 flex items-center justify-center border-2 border-white shadow-sm"
                                >
                                    {cartCount}
                                </motion.div>
                            )}
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setShowProfileModal(true)}
                            className="relative hidden md:flex w-12 h-12 bg-white rounded-full border border-emerald-100 items-center justify-center hover:bg-emerald-50 transition-colors"
                        >
                            <User className="w-6 h-6 text-slate-900" strokeWidth={1.5} />
                        </motion.button>
                    </div>
                </div>
            </header>

            {activeTab === "home" && (
                <>
                    {/* Promo Carousel */}
                    <section className="max-w-6xl mx-auto px-0 sm:px-6 pt-6 -mb-4">
                        <div className="relative w-full aspect-[21/9] sm:rounded-3xl overflow-hidden bg-slate-100 shadow-sm border-y sm:border border-slate-200">
                            <AnimatePresence initial={false}>
                                <motion.div
                                    key={currentSlide}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="absolute inset-0"
                                >
                                    <Image
                                        src={promoSlides[currentSlide]}
                                        alt={`Promo ${currentSlide + 1}`}
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                </motion.div>
                            </AnimatePresence>
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                                {promoSlides.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentSlide(idx)}
                                        className={`h-2 rounded-full transition-all ${currentSlide === idx ? "w-6 bg-white" : "w-2 bg-white/50"
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Categories Bar */}
                    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                        <div className="flex overflow-x-auto pb-4 -mb-4 gap-3 hide-scrollbar">
                            {categories.map((category) => (
                                <motion.button
                                    whileTap={{ scale: 0.96 }}
                                    key={category}
                                    onClick={() => setActiveCategory(category)}
                                    className={`whitespace-nowrap rounded-full px-6 py-2.5 font-semibold text-sm transition-colors border ${activeCategory === category
                                        ? "bg-emerald-700 text-white border-emerald-700"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-emerald-200 hover:bg-emerald-50"
                                        }`}
                                >
                                    {category}
                                </motion.button>
                            ))}
                        </div>
                    </section>

                    {/* Product Grid */}
                    <section className="max-w-6xl mx-auto px-4 sm:px-6">
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Our Menu</h2>
                            <p className="text-slate-500 mt-2 text-lg">Delicious, authentic goodness in every bite</p>
                        </div>

                        {filteredProducts.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {filteredProducts.map((product, idx) => (
                                    <motion.div
                                        key={product.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05, duration: 0.3 }}
                                        className="bg-white rounded-2xl border border-slate-200 shadow-md hover:shadow-lg transition-all overflow-hidden flex flex-row sm:flex-col group"
                                    >
                                        <div className="w-32 sm:w-full shrink-0 aspect-square sm:aspect-[4/3] relative">
                                            <Image
                                                src={product.image}
                                                alt={product.name}
                                                fill
                                                className="object-cover"
                                            />
                                            {product.isBestSeller && (
                                                <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10">
                                                    Best Seller
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3 sm:p-4 flex-1 flex flex-col text-left items-start">
                                            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight line-clamp-1">
                                                {product.name}
                                            </h3>
                                            <div className="flex items-center gap-1 mt-1 mb-1">
                                                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                                <span className="font-bold text-slate-700 text-sm">4.8</span>
                                                <span className="text-slate-400 text-xs">(120+)</span>
                                            </div>
                                            <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 mt-1">
                                                The top choice among all our customers, delicious, authentic and a part of an amazing experience!
                                            </p>
                                            <div className="flex justify-between items-center mt-auto w-full pt-3 sm:pt-4">
                                                <div className="text-base sm:text-lg font-extrabold text-emerald-700">
                                                    ₱{product.price}
                                                </div>
                                                <motion.button
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => handleAddToCart(product)}
                                                    className="bg-emerald-50 text-emerald-700 hover:bg-emerald-700 hover:text-white p-2 sm:p-2.5 rounded-xl transition-colors"
                                                >
                                                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                                                </motion.button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 text-center">
                                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search className="w-10 h-10 text-emerald-200" strokeWidth={1.5} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900">No delights found</h3>
                                <p className="text-slate-500 mt-2">Try adjusting your search or category filter.</p>
                            </div>
                        )}
                    </section>
                </>
            )}

            {activeTab === "orders" && (
                <section className="max-w-6xl mx-auto px-4 sm:px-6 py-32 flex flex-col items-center justify-center text-center">
                    <ReceiptText className="w-16 h-16 text-slate-200 mb-4" />
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">No active orders</h2>
                    <p className="text-slate-500 mt-2">Hungry? Check out our menu and place an order.</p>
                </section>
            )}

            {activeTab === "profile" && (
                <section className="md:max-w-6xl mx-auto md:px-6 py-0 md:py-8 min-h-[calc(100vh-80px)]">
                    <div className="max-w-xl mx-auto bg-slate-50 md:bg-transparent min-h-screen md:min-h-0 pt-0 pb-24 md:pb-0">
                        <div className="bg-white p-6 flex items-center gap-4 mb-2 shadow-sm rounded-none md:rounded-2xl border-b border-slate-100 md:border-none">
                            <div className="bg-slate-200 rounded-full w-16 h-16 flex items-center justify-center shrink-0">
                                <User className="w-8 h-8 text-slate-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Juan Dela Cruz</h2>
                                <p className="text-slate-500 text-sm mt-0.5">+63 912 345 6789</p>
                            </div>
                        </div>

                        <div className="bg-white shadow-sm w-full rounded-none md:rounded-2xl overflow-hidden mb-2">
                            {[
                                { icon: Star, label: "Rewards" },
                                { icon: MapPin, label: "Saved Places" },
                                { icon: CreditCard, label: "Payment Methods" },
                                { icon: Settings, label: "Settings" },
                                { icon: HelpCircle, label: "Help Centre" },
                            ].map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center p-4 py-4 md:py-5 border-b border-slate-100 last:border-0 active:bg-slate-50 hover:bg-slate-50 transition-colors cursor-pointer">
                                    <div className="flex items-center gap-4 text-slate-700 font-medium">
                                        <item.icon className="w-5 h-5 text-slate-600" />
                                        {item.label}
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-300" />
                                </div>
                            ))}
                        </div>

                        <div
                            onClick={onLogout}
                            className="bg-white p-4 py-4 md:py-5 mt-2 shadow-sm flex items-center justify-center cursor-pointer active:bg-slate-50 hover:bg-slate-50 rounded-none md:rounded-2xl transition-colors border-y border-slate-100 md:border-none"
                        >
                            <span className="text-red-600 font-bold">Log Out</span>
                        </div>
                    </div>
                </section>
            )}

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-2 flex justify-between items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
                {[
                    { id: "home", label: "Home", icon: Store },
                    { id: "orders", label: "Orders", icon: ReceiptText },
                    { id: "profile", label: "Account", icon: User },
                ].map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <motion.button
                            key={tab.id}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setActiveTab(tab.id as "home" | "orders" | "profile")}
                            className={`flex flex-col items-center gap-1 min-w-16 p-2 ${isActive ? "text-emerald-700" : "text-slate-400"}`}
                        >
                            <tab.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-[10px] font-semibold">{tab.label}</span>
                        </motion.button>
                    )
                })}
            </div>

            {/* Profile Modal */}
            <AnimatePresence>
                {showProfileModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowProfileModal(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-sm bg-white rounded-3xl p-6 sm:p-8 shadow-2xl z-10"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">My Profile</h2>
                                <button
                                    onClick={() => setShowProfileModal(false)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                    <input
                                        type="text"
                                        defaultValue="Juan Dela Cruz"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-500 transition-all font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        defaultValue="+63 912 345 6789"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-500 transition-all font-medium"
                                    />
                                </div>

                                <div className="pt-2 flex flex-col gap-3">
                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setShowProfileModal(false)}
                                        className="w-full bg-emerald-700 text-white font-semibold rounded-xl py-3 shadow-md shadow-emerald-700/20 hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2"
                                    >
                                        Save Changes
                                    </motion.button>

                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => {
                                            setShowProfileModal(false);
                                            onLogout();
                                        }}
                                        className="w-full bg-red-50 text-red-600 font-bold rounded-xl py-3 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                    >
                                        Logout
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
