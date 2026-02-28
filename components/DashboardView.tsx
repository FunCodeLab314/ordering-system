"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingBag, Leaf, ShoppingCart, User, Star, X, MapPin, CreditCard, Settings, HelpCircle, ChevronRight, Store, ReceiptText, Bell, MessageCircle, Send, ArrowLeft, Headset, Banknote, Smartphone, Plus, Check, Circle } from "lucide-react";
import Image from "next/image";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useProducts } from "@/hooks/useProducts";
import { useOrders } from "@/hooks/useOrders";
import { useOrderMessages } from "@/hooks/useOrderMessages";
import { categories, Product } from "@/lib/data";
import LocationPicker from "./LocationPicker";
import ProductModal from "./ProductModal";
import RatingModal from "./RatingModal";

const promoSlides = [
    "/images/590554498_1300306938783151_7499415934952873_n.jpg",
    "/images/591286853_1300306458783199_3119486838764724933_n.jpg",
    "/images/591396000_1300306605449851_5261874470759623080_n.jpg"
];

const chatMessages: Array<{ id: number; sender: "store" | "user"; text: string; time: string }> = [];

interface DashboardViewProps {
    user: SupabaseUser | null;
    cartCount: number;
    onOpenCart: () => void;
    onAddToCart: (product: Product) => void;
    onLogout: () => void;
    shouldRedirectToOrders?: boolean;
    onRedirectHandled?: () => void;
}

type DashboardTab = "home" | "orders" | "profile" | "notifications" | "chat" | "custom-order" | "settings";

const orderTrackerSteps = ["Order Placed", "Payment Confirmed", "Preparing", "Out for Delivery", "Delivered"] as const;

function getOrderStepIndex(status: string) {
    if (status === "Pending") return 0;
    if (status === "Preparing") return 2;
    if (status === "Out for Delivery") return 3;
    if (status === "Delivered") return 4;
    return 0;
}

export default function DashboardView({ user, cartCount, onOpenCart, onAddToCart, onLogout, shouldRedirectToOrders, onRedirectHandled }: DashboardViewProps) {
    const { products, loading: productsLoading } = useProducts();
    const { orders, loading: ordersLoading, refetch: refetchOrders } = useOrders(user);
    const { messages, unreadCount: messagesUnread, markRead, markAllRead } = useOrderMessages(user);
    const [activeCategory, setActiveCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [showToast, setShowToast] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showMapModal, setShowMapModal] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [activeTab, setActiveTab] = useState<DashboardTab>("home");
    const [settingsPage, setSettingsPage] = useState<"main" | "account-security" | "addresses" | "payment-methods">("main");
    const [showPasswordFields, setShowPasswordFields] = useState(false);
    const [savedPlaces, setSavedPlaces] = useState<string>("Pin a location to save your place.");
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showNotifications, setShowNotifications] = useState(false);
    const [chatMessage, setChatMessage] = useState("");
    const [orderAnimKey, setOrderAnimKey] = useState(0);
    const [ratingOrderId, setRatingOrderId] = useState<string | null>(null);
    const [ratingOrderNumber, setRatingOrderNumber] = useState("");
    const [ratingMessageId, setRatingMessageId] = useState<string | null>(null);

    useEffect(() => {
        if (shouldRedirectToOrders) {
            const timeoutId = setTimeout(() => {
                setActiveTab("orders");
                setOrderAnimKey(prev => prev + 1);
            }, 0);
            if (onRedirectHandled) onRedirectHandled();
            return () => clearTimeout(timeoutId);
        }
    }, [shouldRedirectToOrders, onRedirectHandled]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % promoSlides.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const autoRatingPrompt = useMemo(() => {
        const prompt = messages.find((message) => message.message_type === "rating_prompt" && !message.read);
        if (!prompt) return null;

        const order = orders.find((item) => item.id === prompt.order_id);
        if (!order || order.rated) return null;

        return {
            messageId: prompt.id,
            orderId: order.id,
            orderNumber: order.order_number,
        };
    }, [messages, orders]);

    const activeRatingOrderId = ratingOrderId ?? autoRatingPrompt?.orderId ?? null;
    const activeRatingOrderNumber =
        ratingOrderId !== null ? ratingOrderNumber : autoRatingPrompt?.orderNumber ?? "";
    const activeRatingMessageId = ratingMessageId ?? autoRatingPrompt?.messageId ?? null;

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
            className="min-h-screen bg-[#FDFBF7] pb-20"
        >
            {/* Toast Notification */}
            <AnimatePresence>
                {showToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, x: "-50%" }}
                        animate={{ opacity: 1, y: 0, x: "-50%" }}
                        exit={{ opacity: 0, y: -50, x: "-50%" }}
                        className="fixed top-6 left-1/2 z-[60] bg-slate-900 text-white px-6 py-3 rounded-lg shadow-lg shadow-slate-900/20 font-medium flex items-center gap-2"
                    >
                        <Leaf className="w-4 h-4 text-emerald-400" strokeWidth={2} />
                        Added to your cart!
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Dashboard Navbar */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-emerald-50">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center gap-6">
                    <div className="flex items-center gap-2 shrink-0 hidden lg:flex">
                        <Image
                            src="/logo.png"
                            alt="Ate Ai's Kitchen Logo"
                            width={42}
                            height={42}
                            className="object-contain"
                            priority
                        />
                        <span className="font-bold text-xl tracking-tight text-slate-900">
                            Ate Ai&apos;s Kitchen
                        </span>
                    </div>

                    {activeTab === "home" ? (
                        <div className="flex-1 max-w-xl relative mx-auto">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="w-5 h-5 text-slate-400" strokeWidth={1.5} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search for delicacy..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-gray-100 rounded-lg w-full py-3 pl-12 pr-6 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:bg-white transition-all placeholder:text-slate-500 font-medium"
                            />
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center gap-3">
                            <Image
                                src="/logo.png"
                                alt="Ate Ai's Kitchen Logo"
                                width={38}
                                height={38}
                                className="object-contain lg:hidden"
                                priority
                            />
                            <span className="font-bold text-lg tracking-tight text-slate-900 lg:hidden">
                                Ate Ai&apos;s Kitchen
                            </span>
                        </div>
                    )}

                    <div className="flex items-center gap-3 shrink-0">
                        {/* Notifications Button */}
                        <div className="relative block">
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                    if (window.innerWidth < 768) {
                                        setActiveTab("notifications");
                                    } else {
                                        setShowNotifications(!showNotifications);
                                    }
                                }}
                                className="relative w-12 h-12 bg-white rounded-lg border border-emerald-100 flex items-center justify-center hover:bg-emerald-50 transition-colors"
                            >
                                <Bell className="w-6 h-6 text-slate-900" strokeWidth={1.5} />
                                {messagesUnread > 0 && (
                                    <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-[10px] font-bold w-5 h-5 flex items-center justify-center border-2 border-white shadow-sm">
                                        {messagesUnread > 9 ? "9+" : messagesUnread}
                                    </div>
                                )}
                            </motion.button>

                            <AnimatePresence>
                                {showNotifications && (
                                    <>
                                        <div className="fixed inset-0 z-40 hidden lg:block" onClick={() => setShowNotifications(false)} />
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="hidden lg:block absolute -right-16 sm:right-0 top-16 w-[calc(100vw-32px)] sm:w-80 bg-white rounded-lg shadow-xl z-50 border border-slate-100 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.16)] text-left"
                                        >
                                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                                <h3 className="font-bold text-slate-900">Notifications</h3>
                                                <button onClick={() => setShowNotifications(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                            <div className="max-h-[350px] overflow-y-auto">
                                                {messages.length === 0 ? (
                                                    <div className="p-6 text-center text-sm text-slate-400">No notifications yet.</div>
                                                ) : (
                                                    messages.slice(0, 6).map((message) => (
                                                        <div
                                                            key={message.id}
                                                            onClick={() => void markRead(message.id)}
                                                            className={`cursor-pointer border-b border-slate-50 p-4 transition-colors hover:bg-green-50/50 ${!message.read ? "bg-emerald-50/40" : ""}`}
                                                        >
                                                            <div className="mb-1 flex items-start justify-between">
                                                                <h4 className="font-semibold text-sm text-slate-900">
                                                                    {message.message_type === "receipt" && "Order Delivered"}
                                                                    {message.message_type === "rating_prompt" && "Rate your order"}
                                                                    {message.message_type === "general" && "Message from Ate Ai"}
                                                                </h4>
                                                                <span className="text-[10px] text-slate-400 shrink-0">
                                                                    {new Date(message.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2 whitespace-pre-line">{message.body}</p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                            <div
                                                onClick={() => {
                                                    setShowNotifications(false);
                                                    setActiveTab("notifications");
                                                }}
                                                className="p-3 bg-slate-50 text-center border-t border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
                                            >
                                                <span className="text-sm font-bold text-emerald-700">View All Activities</span>
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Cart Button */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onOpenCart}
                            className="relative w-12 h-12 bg-white rounded-lg border border-emerald-100 flex items-center justify-center hover:bg-emerald-50 transition-colors"
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

                        {/* Profile Button */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setShowProfileModal(true)}
                            className="relative hidden lg:flex w-12 h-12 bg-white rounded-lg border border-emerald-100 items-center justify-center hover:bg-emerald-50 transition-colors"
                        >
                            <User className="w-6 h-6 text-slate-900" strokeWidth={1.5} />
                        </motion.button>
                    </div>
                </div>
            </header>

            <div className="lg:flex lg:gap-0 lg:h-[calc(100vh-80px)] lg:overflow-hidden">
                <aside className="hidden lg:flex lg:flex-col w-56 shrink-0 h-full overflow-y-hidden border-r border-slate-100 bg-white">
                    <div className="p-5 border-b border-slate-100">
                        <div className="bg-slate-200 rounded-full w-12 h-12 flex items-center justify-center shrink-0 mb-3">
                            <User className="w-6 h-6 text-slate-500" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">Juan Dela Cruz</h3>
                        <p className="text-xs text-slate-500 mt-0.5">+63 912 345 6789</p>
                    </div>

                    <div className="py-2">
                        {[
                            { id: "home", label: "Home", icon: Store },
                            { id: "orders", label: "Orders", icon: ReceiptText },
                            { id: "notifications", label: "Notifications", icon: Bell },
                            { id: "chat", label: "Support / Chat", icon: Headset },
                            { id: "profile", label: "Account", icon: User },
                        ].map((item) => {
                            const isActive = activeTab === item.id || (item.id === "profile" && activeTab === "settings");
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setActiveTab(item.id as typeof activeTab);
                                        if (item.id === "orders") setOrderAnimKey(prev => prev + 1);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors text-sm font-medium border-l-2 ${isActive
                                        ? "bg-emerald-50 text-emerald-700 font-semibold border-emerald-700"
                                        : "text-slate-600 hover:bg-slate-50 border-transparent"
                                        }`}
                                >
                                    <div className="relative">
                                        <item.icon className="w-4 h-4" />
                                    </div>
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-auto p-4 border-t border-slate-100">
                        <button
                            onClick={onLogout}
                            className="w-full text-left text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors px-3 py-2 rounded-md"
                        >
                            Log Out
                        </button>
                    </div>
                </aside>

                <div className="flex-1 overflow-hidden lg:h-full lg:overflow-y-auto">
            {activeTab === "home" && (
                <>
                    {/* Promo Carousel */}
                    <section className="max-w-6xl mx-auto px-0 sm:px-6 pt-8 pb-6">
                        <div className="relative w-full h-32 md:h-[120px] md:max-w-[800px] mx-auto sm:rounded-lg overflow-hidden bg-slate-100 shadow-sm border-y sm:border border-slate-200">
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
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                                {promoSlides.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentSlide(idx)}
                                        className={`h-1.5 rounded-lg transition-all ${currentSlide === idx ? "w-6 bg-white" : "w-1.5 bg-white/50"
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Categories Bar */}
                    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
                        <div className="flex overflow-x-auto pb-4 -mb-4 gap-1.5 hide-scrollbar items-center">
                            {categories.map((category) => (
                                <motion.button
                                    whileTap={{ scale: 0.96 }}
                                    key={category}
                                    onClick={() => setActiveCategory(category)}
                                    className={`whitespace-nowrap rounded-lg px-4 py-2 font-semibold text-sm transition-colors border ${activeCategory === category
                                        ? "bg-emerald-700 text-white border-emerald-700"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-emerald-200 hover:bg-emerald-50"
                                        }`}
                                >
                                    {category}
                                </motion.button>
                            ))}
                            <div className="w-[1px] h-6 bg-slate-200 mx-0.5 shrink-0"></div>
                            <motion.button
                                whileTap={{ scale: 0.96 }}
                                onClick={() => setActiveTab("custom-order")}
                                className="whitespace-nowrap rounded-lg px-4 py-2 font-semibold text-sm transition-colors border border-emerald-700 bg-emerald-50 text-emerald-800 flex items-center gap-1.5 hover:bg-emerald-100 shrink-0"
                            >
                                <MessageCircle className="w-4 h-4" />
                                Custom Order
                            </motion.button>
                        </div>
                    </section>

                    {/* Product Grid */}
                    <section className="max-w-6xl mx-auto px-4 sm:px-6">
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Our Menu</h2>
                            <p className="text-slate-500 mt-2 text-lg">Delicious, authentic goodness in every bite</p>
                        </div>

                        {productsLoading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="rounded-2xl bg-slate-100 animate-pulse aspect-square" />
                                ))}
                            </div>
                        ) : filteredProducts.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                                {filteredProducts.map((product, idx) => (
                                    <motion.div
                                        key={product.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05, duration: 0.3 }}
                                        className="relative bg-transparent rounded-none p-0 border-0 shadow-none flex flex-col gap-2 sm:bg-white sm:rounded-[24px] sm:p-[10px] sm:shadow-[0_12px_40px_rgba(0,0,0,0.12)] sm:gap-0 group transition-all sm:border sm:border-slate-100/50 sm:hover:shadow-[0_20px_60px_rgba(0,0,0,0.16)] sm:hover:-translate-y-1"
                                    >
                                        <div
                                            onClick={() => setSelectedProduct(product)}
                                            className="relative w-full aspect-square sm:aspect-[4/3] rounded-[14px] overflow-hidden bg-slate-100 text-left cursor-pointer"
                                        >
                                            <Image
                                                src={product.image}
                                                alt={product.name}
                                                fill
                                                className="object-cover object-center scale-[1.12]"
                                            />
                                            {product.isBestSeller && (
                                                <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-emerald-700 text-white text-[10px] sm:text-[11px] font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-[14px] z-10 items-center gap-1.5 border border-emerald-700/50 inline-flex">
                                                    <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-white" /> Most ordered
                                                </div>
                                            )}
                                            <motion.button
                                                whileTap={{ scale: 0.92 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAddToCart(product);
                                                }}
                                                className="absolute bottom-2 right-2 sm:hidden w-10 h-10 bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-md shadow-emerald-700/25"
                                                aria-label={`Add ${product.name} to cart`}
                                            >
                                                <Plus className="w-5 h-5" />
                                            </motion.button>
                                        </div>
                                        <div className="flex-1 flex flex-col text-left items-start sm:pt-4 px-0.5 sm:px-0">
                                            <h3 className="text-[16px] sm:text-xl font-semibold sm:font-bold text-slate-900 tracking-tight line-clamp-2 sm:line-clamp-1 w-full leading-tight">
                                                {product.name}
                                            </h3>

                                            <div className="hidden sm:flex items-center gap-1 mt-0.5 sm:mt-1 text-[11px] sm:text-sm">
                                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                                <span className="font-bold text-slate-700">4.9 <span className="font-normal text-slate-500">(500+)</span></span>
                                                <span className="text-slate-300 mx-1">|</span>
                                                <span className="text-slate-500 line-clamp-1">{product.category}</span>
                                            </div>

                                            <div className="hidden sm:flex items-center gap-1 mt-0.5 text-[11px] text-slate-500">
                                                <span className="truncate">From 25 mins</span>
                                            </div>

                                            <p className="hidden sm:block text-sm text-slate-500 line-clamp-2 mt-2 w-full font-medium leading-relaxed">
                                                The top choice among all our customers, delicious, authentic and a part of an amazing experience!
                                            </p>

                                            <div className="flex justify-between items-end sm:items-center w-full mt-1 sm:mt-auto sm:pt-4">
                                                <div className="text-[14px] sm:text-xl font-black text-slate-900 tracking-tight">
                                                    PHP {Number(product.price).toFixed(2)}
                                                </div>
                                                <div className="hidden sm:flex gap-0.5 items-center">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} className={`w-3.5 h-3.5 ${i < 4 ? "text-amber-400 fill-amber-400" : "text-amber-400/30 fill-amber-400/30"}`} />
                                                    ))}
                                                    <span className="text-sm font-bold text-slate-700 ml-1.5">4.9</span>
                                                </div>
                                            </div>

                                            <div className="hidden sm:flex gap-2 w-full mt-2 sm:mt-5">
                                                <motion.button
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => setSelectedProduct(product)}
                                                    className="hidden sm:block flex-1 bg-white text-emerald-700 border-2 border-emerald-700 font-bold py-2.5 px-[10px] rounded-[24px] hover:bg-emerald-50 transition-colors text-sm shadow-sm"
                                                >
                                                    More details
                                                </motion.button>
                                                <motion.button
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => handleAddToCart(product)}
                                                    className="hidden sm:flex bg-emerald-700 text-white p-3 rounded-[14px] hover:bg-emerald-800 transition-colors items-center justify-center shrink-0 w-12 h-12 shadow-md shadow-emerald-700/20"
                                                >
                                                    <ShoppingCart className="w-5 h-5" strokeWidth={2.5} />
                                                </motion.button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 text-center">
                                <div className="w-20 h-20 bg-emerald-50 rounded-lg flex items-center justify-center mx-auto mb-4">
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
                <motion.section
                    key={orderAnimKey}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="max-w-2xl mx-auto px-4 sm:px-6 py-8 min-h-[calc(100vh-80px)]"
                >
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-6">Your Orders</h2>
                    {ordersLoading ? (
                        <div className="space-y-4">
                            {[1, 2].map((skeleton) => (
                                <div key={skeleton} className="h-40 animate-pulse rounded-xl bg-slate-100" />
                            ))}
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="rounded-md border border-slate-200 bg-white p-8 text-center">
                            <h3 className="text-lg font-bold text-slate-900">No orders yet</h3>
                            <p className="mt-2 text-sm text-slate-500">Place your first order from our menu.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {orders.map((order) => {
                                const activeStep = getOrderStepIndex(order.status);
                                const isCancelled = order.status === "Cancelled";
                                const isDelivered = order.status === "Delivered";
                                return (
                                    <article key={order.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Order #{order.order_number}</p>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    {new Date(order.created_at).toLocaleString("en-PH", {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                        hour: "numeric",
                                                        minute: "2-digit",
                                                    })}
                                                </p>
                                            </div>
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                    isCancelled
                                                        ? "bg-red-50 text-red-600"
                                                        : isDelivered
                                                            ? "bg-emerald-50 text-emerald-700"
                                                            : "bg-slate-100 text-slate-700"
                                                }`}
                                            >
                                                {order.status}
                                            </span>
                                        </div>

                                        <div className="mt-3 space-y-1">
                                            {order.items.map((item) => (
                                                <div key={item.id} className="flex items-center justify-between text-sm text-slate-600">
                                                    <span>{item.quantity}x {item.product_name}</span>
                                                    <span>PHP {(item.quantity * item.unit_price).toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                                            <span className="text-slate-500">{order.payment_method} · {order.payment_status}</span>
                                            <span className="font-bold text-emerald-700">PHP {Number(order.total).toFixed(2)}</span>
                                        </div>

                                        {!isCancelled && (
                                            <div className="mt-4">
                                                <div className="flex items-center gap-1">
                                                    {orderTrackerSteps.map((step, stepIndex) => {
                                                        const completed = stepIndex < activeStep || (isDelivered && stepIndex <= activeStep);
                                                        const active = stepIndex === activeStep && !isDelivered;
                                                        return (
                                                            <div key={`${order.id}-${step}`} className="flex flex-1 items-center">
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <div className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                                                                        completed
                                                                            ? "border-emerald-700 bg-emerald-700 text-white"
                                                                            : active
                                                                                ? "border-emerald-700 text-emerald-700"
                                                                                : "border-slate-200 text-slate-300"
                                                                    }`}>
                                                                        {completed ? <Check className="h-3 w-3" /> : <Circle className="h-2.5 w-2.5 fill-current" />}
                                                                    </div>
                                                                    <span className={`hidden text-[10px] text-center sm:block ${
                                                                        completed || active ? "text-slate-700" : "text-slate-400"
                                                                    }`}>
                                                                        {step}
                                                                    </span>
                                                                </div>
                                                                {stepIndex < orderTrackerSteps.length - 1 && (
                                                                    <div className={`mx-1 h-0.5 flex-1 ${stepIndex < activeStep || isDelivered ? "bg-emerald-700" : "bg-slate-200"}`} />
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {order.payment_method === "COD" && order.status === "Pending" && (
                                            <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700">
                                                Awaiting admin approval based on your delivery location.
                                            </div>
                                        )}

                                        {isCancelled && order.rejection_reason && (
                                            <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-600">
                                                <strong>Order Cancelled:</strong> {order.rejection_reason}
                                            </div>
                                        )}

                                        {isDelivered && !order.rated && (
                                            <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
                                                Please leave a rating for this order.
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </motion.section>
            )}

            {activeTab === "profile" && (
                <section className="md:max-w-6xl mx-auto md:px-6 py-0 md:py-8 min-h-[calc(100vh-80px)]">
                    <div className="max-w-xl mx-auto bg-slate-50 md:bg-transparent min-h-screen md:min-h-0 pt-0 pb-28 md:pb-0">
                        <div className="bg-white p-6 flex items-center gap-4 mb-2 shadow-sm rounded-none md:rounded-lg border-b border-slate-100 md:border-none">
                            <div className="bg-slate-200 rounded-full w-16 h-16 flex items-center justify-center shrink-0">
                                <User className="w-8 h-8 text-slate-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Juan Dela Cruz</h2>
                                <p className="text-slate-500 text-sm mt-0.5">+63 912 345 6789</p>
                            </div>
                        </div>

                        <div className="bg-white shadow-sm w-full rounded-none md:rounded-lg overflow-hidden mb-2">
                            {[
                                { icon: Star, label: "Rewards", action: () => { } },
                                { icon: Settings, label: "Settings", action: () => setActiveTab("settings") },
                                { icon: HelpCircle, label: "Help Centre", action: () => { } },
                            ].map((item, idx) => (
                                <div key={idx} onClick={item.action} className="flex justify-between items-center p-4 py-4 md:py-5 border-b border-slate-100 last:border-0 active:bg-slate-50 hover:bg-slate-50 transition-colors cursor-pointer">
                                    <div className="flex items-center gap-4 text-slate-700 font-medium">
                                        <item.icon className="w-5 h-5 text-slate-600" />
                                        <span>{item.label}</span>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-300" />
                                </div>
                            ))}
                        </div>

                        <div
                            onClick={onLogout}
                            className="bg-white p-4 py-4 md:py-5 mt-2 shadow-sm flex items-center justify-center cursor-pointer active:bg-slate-50 hover:bg-slate-50 rounded-none md:rounded-lg transition-colors border-y border-slate-100 md:border-none"
                        >
                            <span className="text-red-600 font-bold">Log Out</span>
                        </div>
                    </div>
                </section>
            )}

            {activeTab === "settings" && (
                <section className="max-w-xl mx-auto bg-slate-100 min-h-[calc(100vh-80px)] pt-0 pb-24">

                    {/* â”€â”€ MAIN SETTINGS PAGE â”€â”€ */}
                    {settingsPage === "main" && (
                        <>
                            <div className="bg-white px-4 h-14 flex items-center gap-3 border-b border-slate-100 z-10">
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => { setActiveTab("profile"); setSettingsPage("main"); }}
                                    className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors shrink-0"
                                >
                                    <ArrowLeft className="w-4 h-4 text-slate-600" />
                                </motion.button>
                                <h2 className="text-base font-bold text-slate-900">Settings</h2>
                            </div>

                            <div className="pt-2 pb-4">

                                <div className="px-4 pt-4 pb-1.5">
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">My Account</p>
                                </div>
                                <div className="bg-white border-y border-slate-200">
                                    {[
                                        { label: "Account & Security", sub: "Name, username, email, password", page: "account-security" as const },
                                        { label: "My Addresses", sub: "Saved delivery locations", page: "addresses" as const },
                                        { label: "Payment Methods", sub: "GCash, Maya, Cash on Delivery", page: "payment-methods" as const },
                                    ].map((item, idx, arr) => (
                                        <div
                                            key={item.page}
                                            onClick={() => setSettingsPage(item.page)}
                                            className={`flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-slate-50 active:bg-slate-100 transition-colors ${idx !== arr.length - 1 ? "border-b border-slate-100" : ""}`}
                                        >
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">{item.sub}</p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                                        </div>
                                    ))}
                                </div>

                                <div className="px-4 pt-5 pb-1.5">
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Support</p>
                                </div>
                                <div className="bg-white border-y border-slate-200">
                                    {[
                                        { label: "Help Centre", sub: "FAQs and customer support" },
                                        { label: "Privacy Policy", sub: "How we handle your data" },
                                        { label: "About", sub: "App version and info" },
                                    ].map((item, idx, arr) => (
                                        <div
                                            key={item.label}
                                            className={`flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-slate-50 active:bg-slate-100 transition-colors ${idx !== arr.length - 1 ? "border-b border-slate-100" : ""}`}
                                        >
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">{item.sub}</p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                                        </div>
                                    ))}
                                </div>

                                <div className="px-4 pt-5 pb-1.5">
                                    <p className="text-[11px] font-semibold text-red-300 uppercase tracking-widest">Account Actions</p>
                                </div>
                                <div className="bg-white border-y border-slate-200">
                                    <div
                                        onClick={onLogout}
                                        className="flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-red-50 active:bg-red-100 transition-colors border-b border-slate-100"
                                    >
                                        <p className="text-sm font-semibold text-red-500">Log Out</p>
                                        <ChevronRight className="w-4 h-4 text-red-300 shrink-0" />
                                    </div>
                                    <div className="flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-red-50 active:bg-red-100 transition-colors">
                                        <p className="text-sm font-semibold text-red-400">Request Account Deletion</p>
                                        <ChevronRight className="w-4 h-4 text-red-200 shrink-0" />
                                    </div>
                                </div>

                            </div>
                        </>
                    )}

                    {/* â”€â”€ ACCOUNT & SECURITY â”€â”€ */}
                    {settingsPage === "account-security" && (
                        <>
                            <div className="bg-white px-4 h-14 flex items-center gap-3 border-b border-slate-100 z-10">
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => { setSettingsPage("main"); setShowPasswordFields(false); }}
                                    className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors shrink-0"
                                >
                                    <ArrowLeft className="w-4 h-4 text-slate-600" />
                                </motion.button>
                                <h2 className="text-base font-bold text-slate-900">Account & Security</h2>
                            </div>

                            <div className="p-4 space-y-3">

                                <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
                                    <div className="px-4 pt-4 pb-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Personal Info</p>
                                    </div>
                                    <div className="px-4 pb-4 pt-2 space-y-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Full Name</label>
                                            <input type="text" defaultValue="Juan Dela Cruz" placeholder="Enter your full name"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-500 transition-all" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Username / Display Name</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">@</span>
                                                <input type="text" defaultValue="juandelacruz" placeholder="username"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-7 pr-3 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-500 transition-all" />
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-1">This is how others see you.</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Phone Number</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm select-none">ðŸ‡µðŸ‡­</span>
                                                <input type="tel" defaultValue="+63 912 345 6789" placeholder="+63 9XX XXX XXXX"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-9 pr-3 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-500 transition-all" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Email Address</label>
                                            <input type="email" defaultValue="juan@email.com" placeholder="you@email.com"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-500 transition-all" />
                                        </div>
                                    </div>
                                    <div className="h-px bg-slate-100 mx-4" />
                                    <div className="px-4 py-3">
                                        <motion.button whileTap={{ scale: 0.98 }}
                                            className="w-full bg-emerald-700 text-white font-semibold rounded-lg py-3 hover:bg-emerald-800 transition-colors text-sm">
                                            Save Changes
                                        </motion.button>
                                    </div>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
                                    <div className="px-4 pt-4 pb-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Security</p>
                                    </div>
                                    <div
                                        onClick={() => setShowPasswordFields(prev => !prev)}
                                        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 active:bg-slate-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                                                <Settings className="w-4 h-4 text-slate-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">Reset Password</p>
                                                <p className="text-xs text-slate-400">Change your account password</p>
                                            </div>
                                        </div>
                                        <motion.div animate={{ rotate: showPasswordFields ? 90 : 0 }} transition={{ duration: 0.2 }}>
                                            <ChevronRight className="w-4 h-4 text-slate-300" />
                                        </motion.div>
                                    </div>
                                    <AnimatePresence>
                                        {showPasswordFields && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.22 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Current Password</label>
                                                        <input type="password" placeholder="Enter current password"
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-500 transition-all" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-500 mb-1">New Password</label>
                                                        <input type="password" placeholder="Enter new password"
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-500 transition-all" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Confirm New Password</label>
                                                        <input type="password" placeholder="Re-enter new password"
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-500 transition-all" />
                                                    </div>
                                                    <motion.button whileTap={{ scale: 0.98 }}
                                                        className="w-full bg-slate-900 text-white font-semibold rounded-lg py-3 hover:bg-slate-700 transition-colors text-sm">
                                                        Update Password
                                                    </motion.button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                            </div>
                        </>
                    )}

                    {/* â”€â”€ MY ADDRESSES â”€â”€ */}
                    {settingsPage === "addresses" && (
                        <>
                            <div className="bg-white px-4 h-14 flex items-center gap-3 border-b border-slate-100 z-10">
                                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSettingsPage("main")}
                                    className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors shrink-0">
                                    <ArrowLeft className="w-4 h-4 text-slate-600" />
                                </motion.button>
                                <h2 className="text-base font-bold text-slate-900">My Addresses</h2>
                            </div>
                            <div className="p-4">
                                <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
                                    <div
                                        onClick={() => setShowMapModal(true)}
                                        className="flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                                                <MapPin className="w-4 h-4 text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">Saved Location</p>
                                                <p className="text-xs text-slate-400 mt-0.5 max-w-[220px] truncate">{savedPlaces}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                                    </div>
                                </div>
                                <motion.button whileTap={{ scale: 0.98 }} onClick={() => setShowMapModal(true)}
                                    className="w-full mt-3 border border-emerald-600 text-emerald-700 font-semibold rounded-lg py-3 hover:bg-emerald-50 transition-colors text-sm">
                                    + Add New Address
                                </motion.button>
                            </div>
                        </>
                    )}

                    {/* â”€â”€ PAYMENT METHODS â”€â”€ */}
                    {settingsPage === "payment-methods" && (
                        <>
                            <div className="bg-white px-4 h-14 flex items-center gap-3 border-b border-slate-100 z-10">
                                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSettingsPage("main")}
                                    className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors shrink-0">
                                    <ArrowLeft className="w-4 h-4 text-slate-600" />
                                </motion.button>
                                <h2 className="text-base font-bold text-slate-900">Payment Methods</h2>
                            </div>
                            <div className="p-4">
                                <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
                                    {[
                                        { label: "Cash on Delivery", sub: "Pay when your order arrives", icon: Banknote, iconClass: "bg-slate-100 text-slate-600" },
                                        { label: "GCash", sub: "Linked: +63 912 345 6789", icon: Smartphone, iconClass: "bg-blue-50 text-blue-600" },
                                        { label: "Maya", sub: "Not linked", icon: CreditCard, iconClass: "bg-green-50 text-green-600" },
                                    ].map((method, idx, arr) => (
                                        <div key={method.label}
                                            className={`flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-slate-50 transition-colors ${idx !== arr.length - 1 ? "border-b border-slate-100" : ""}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${method.iconClass}`}>
                                                    <method.icon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">{method.label}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">{method.sub}</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                </section>
            )}

            {activeTab === "notifications" && (
                <section className="max-w-xl mx-auto bg-slate-50 min-h-screen pt-0 pb-28">
                    <div className="bg-white p-4 border-b border-slate-100 flex items-center justify-between gap-3 z-10 shadow-sm">
                        <div className="flex items-center gap-3">
                            <Bell className="w-5 h-5 text-emerald-700" />
                            <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
                        </div>
                        {messagesUnread > 0 && (
                            <button onClick={() => void markAllRead()} className="text-xs font-semibold text-emerald-700 hover:underline">
                                Mark all read
                            </button>
                        )}
                    </div>
                    {messages.length === 0 ? (
                        <div className="text-center py-20 text-slate-400">
                            <Bell className="w-12 h-12 mx-auto mb-3 opacity-40" />
                            <p className="font-semibold">No notifications yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    onClick={() => void markRead(message.id)}
                                    className={`cursor-pointer p-4 transition-colors hover:bg-slate-50 ${!message.read ? "bg-emerald-50/40" : "bg-white"}`}
                                >
                                    <div className="mb-1 flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">
                                                {message.message_type === "receipt" ? "R" : message.message_type === "rating_prompt" ? "S" : "M"}
                                            </span>
                                            <h4 className={`text-[14px] text-slate-900 ${!message.read ? "font-bold" : "font-semibold"}`}>
                                                {message.message_type === "receipt" && "Order Delivered"}
                                                {message.message_type === "rating_prompt" && "How was your order?"}
                                                {message.message_type === "general" && "Message from Ate Ai"}
                                                {!message.read && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-emerald-500 align-middle" />}
                                            </h4>
                                        </div>
                                        <span className="text-[10px] text-slate-400 shrink-0">
                                            {new Date(message.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{message.body}</p>
                                    {message.message_type === "rating_prompt" && !message.read && (
                                        <button
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                const order = orders.find((item) => item.id === message.order_id);
                                                if (order && !order.rated) {
                                                    setRatingOrderId(order.id);
                                                    setRatingOrderNumber(order.order_number);
                                                    setRatingMessageId(message.id);
                                                }
                                            }}
                                            className="mt-2 text-xs font-bold text-emerald-700 hover:underline"
                                        >
                                            Rate your order
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {activeTab === "chat" && (
                <section className="max-w-xl mx-auto bg-slate-50 h-[calc(100vh-80px-70px)] flex flex-col pt-0 pb-0">
                    <div className="bg-emerald-700 p-4 border-b border-emerald-800 flex items-center gap-3 z-10 shadow-sm text-white">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                            <Leaf className="w-5 h-5 text-white" strokeWidth={1.5} />
                        </div>
                        <div>
                            <h3 className="font-bold">Ate Ai&apos;s Support</h3>
                            <div className="flex items-center gap-1.5 text-xs text-emerald-100">
                                <span className="w-2 h-2 rounded-full bg-green-400"></span> Online
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                        {chatMessages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[85%] rounded-lg p-3 shadow-sm ${msg.sender === "user" ? "bg-emerald-600 text-white rounded-tr-sm" : "bg-white border border-slate-100 text-slate-800 rounded-tl-sm"}`}>
                                    <p className="text-sm">{msg.text}</p>
                                    <span className={`text-[10px] block mt-1 ${msg.sender === "user" ? "text-emerald-200 text-right" : "text-slate-400"}`}>{msg.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-white flex items-center gap-2 sticky bottom-[calc(env(safe-area-inset-bottom)+50px)] sm:bottom-0">
                        <input
                            type="text"
                            placeholder="Type a message..."
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && chatMessage.trim()) {
                                    setChatMessage("");
                                }
                            }}
                            className="flex-1 bg-slate-100 border-transparent rounded-lg px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:bg-white transition-all placeholder:text-slate-400"
                        />
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => { if (chatMessage.trim()) setChatMessage(""); }}
                            className="w-11 h-11 bg-emerald-700 rounded-lg flex items-center justify-center shrink-0 hover:bg-emerald-800 transition-colors shadow-sm shadow-emerald-700/20"
                        >
                            <Send className="w-4 h-4 text-white ml-0.5" strokeWidth={2} />
                        </motion.button>
                    </div>
                </section>
            )}

            {activeTab === "custom-order" && (
                <section className="block max-w-xl mx-auto bg-slate-50 h-[calc(100vh-80px)] md:h-[calc(100vh-80px-70px)] flex flex-col pt-0 pb-0">
                    <div className="bg-emerald-800 p-4 border-b border-emerald-900 flex items-center gap-3 z-10 shadow-sm text-white">
                        <button
                            onClick={() => setActiveTab("home")}
                            className="hidden lg:flex p-2 -ml-2 mr-1 hover:bg-emerald-700/50 rounded-lg transition-colors"
                            aria-label="Go back to menu"
                        >
                            <ArrowLeft className="w-5 h-5 text-white" />
                        </button>
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                            <Store className="w-5 h-5 text-white" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold">Custom Order Request</h3>
                            <div className="flex items-center gap-1.5 text-xs text-emerald-100">
                                Let&apos;s discuss your special request!
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                        <div className="flex justify-start">
                            <div className="max-w-[85%] rounded-lg p-3 shadow-sm bg-white border border-slate-100 text-slate-800 rounded-tl-sm">
                                <p className="text-sm font-semibold mb-2">Welcome to Custom Orders!</p>
                                <p className="text-sm text-slate-600">Please let us know the details of your request (e.g., specific flavors, bulk quanties, dietary restrictions).</p>
                                <span className="text-[10px] block mt-2 text-slate-400">Just now</span>
                            </div>
                        </div>
                        {/* We reuse chatMessages or chatMessage state here for a simple implementation */}
                        {chatMessage.trim().length > 0 && false /* Hiding until sent, actually let's just use a separate state or dummy UI */}
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-white flex flex-col gap-3 sticky bottom-[calc(env(safe-area-inset-bottom)+50px)] md:bottom-0">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Describe your custom order..."
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                                className="flex-1 bg-slate-100 border-transparent rounded-md px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:bg-white transition-all placeholder:text-slate-400"
                            />
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => { if (chatMessage.trim()) setChatMessage(""); }}
                                className="w-12 h-12 bg-emerald-800 rounded-xl flex items-center justify-center shrink-0 hover:bg-emerald-900 transition-colors shadow-sm"
                            >
                                <Send className="w-5 h-5 text-white ml-0.5" strokeWidth={1.5} />
                            </motion.button>
                        </div>
                    </div>
                </section>
            )}
                </div>
            </div>

            {/* Mobile + Tablet Bottom Navigation */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <div className="flex items-center justify-around px-2 h-16">
                    {[
                        { id: "home" as DashboardTab, label: "Home", icon: Store },
                        { id: "orders" as DashboardTab, label: "Orders", icon: ReceiptText },
                        { id: "chat" as DashboardTab, label: "Support", icon: Headset },
                        { id: "profile" as DashboardTab, label: "Account", icon: User },
                    ].map((tab) => {
                        const isActive = activeTab === tab.id || (tab.id === "profile" && activeTab === "settings");
                        return (
                            <motion.button
                                key={tab.id}
                                whileTap={{ scale: 0.92 }}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    if (tab.id === "orders") {
                                        setOrderAnimKey(prev => prev + 1);
                                    }
                                }}
                                className="relative flex flex-col items-center justify-center gap-1 flex-1 h-full"
                            >
                                <tab.icon
                                    className={`w-5 h-5 transition-colors duration-200 ${isActive ? "text-emerald-700" : "text-slate-400"
                                        }`}
                                    strokeWidth={isActive ? 2.5 : 1.8}
                                />
                                <span className={`text-[11px] font-semibold transition-colors duration-200 ${isActive ? "text-emerald-700" : "text-slate-400"
                                    }`}>
                                    {tab.label}
                                </span>
                                {isActive && (
                                    <motion.div
                                        layoutId="nav-indicator"
                                        className="absolute bottom-0 w-10 h-[2.5px] bg-emerald-700 rounded-full"
                                    />
                                )}
                            </motion.button>
                        );
                    })}
                </div>
            </nav>

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
                            className="relative w-full max-w-sm bg-white rounded-md p-6 sm:p-8 shadow-2xl z-10"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">My Profile</h2>
                                <button
                                    onClick={() => setShowProfileModal(false)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
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
                                        className="w-full bg-emerald-700 text-white font-semibold rounded-md py-3 shadow-md shadow-emerald-700/20 hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2"
                                    >
                                        Save Changes
                                    </motion.button>

                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => {
                                            setShowProfileModal(false);
                                            onLogout();
                                        }}
                                        className="w-full bg-red-50 text-red-600 font-bold rounded-md py-3 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                    >
                                        Logout
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Map Simulation Modal */}
            <AnimatePresence>
                {showMapModal && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowMapModal(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-sm bg-white rounded-md p-6 shadow-2xl z-10 flex flex-col items-center"
                        >
                            <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-4 w-full text-left">Manage Saved Places</h3>
                            <div className="relative w-full h-80 rounded-lg overflow-hidden bg-emerald-50 mb-6 border border-slate-100 flex-shrink-0">
                                <LocationPicker
                                    onLocationSelect={(addr) => {
                                        setSavedPlaces(addr);
                                        setShowMapModal(false);
                                    }}
                                />
                            </div>
                            <motion.button
                                whileTap={{ scale: 0.96 }}
                                onClick={() => setShowMapModal(false)}
                                className="w-full text-slate-500 font-semibold rounded-md py-3 hover:bg-slate-50 transition-colors"
                            >
                                Close
                            </motion.button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <RatingModal
                key={activeRatingOrderId ?? "rating-modal"}
                orderId={activeRatingOrderId ?? ""}
                orderNumber={activeRatingOrderNumber}
                isOpen={Boolean(activeRatingOrderId)}
                onClose={() => {
                    setRatingOrderId(null);
                    setRatingOrderNumber("");
                    if (activeRatingMessageId) void markRead(activeRatingMessageId);
                    setRatingMessageId(null);
                }}
                onSubmitted={() => {
                    setRatingOrderId(null);
                    setRatingOrderNumber("");
                    setRatingMessageId(null);
                    void refetchOrders();
                    if (activeRatingMessageId) void markRead(activeRatingMessageId);
                }}
            />
            {/* Product Details Modal */}
            <ProductModal
                product={selectedProduct}
                isOpen={!!selectedProduct}
                onClose={() => setSelectedProduct(null)}
                onAction={() => {
                    if (selectedProduct) {
                        handleAddToCart(selectedProduct);
                        setSelectedProduct(null);
                    }
                }}
                actionText="Add to Cart"
            />
        </motion.div>
    );
}



