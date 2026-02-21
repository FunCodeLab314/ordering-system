"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingBag, Leaf, ShoppingCart, User, Star, X, MapPin, CreditCard, Settings, HelpCircle, ChevronRight, Store, ReceiptText, Truck, Bell, MessageCircle, Send, ArrowLeft, Headset } from "lucide-react";
import Image from "next/image";
import { products, categories, Product } from "@/lib/data";
import LocationPicker from "./LocationPicker";
import ProductModal from "./ProductModal";

const promoSlides = [
    "/images/590554498_1300306938783151_7499415934952873_n.jpg",
    "/images/591286853_1300306458783199_3119486838764724933_n.jpg",
    "/images/591396000_1300306605449851_5261874470759623080_n.jpg"
];

const dummyNotifications = [
    { id: 1, title: "Order Confirmed", message: "Your order #1234 is being prepared.", time: "5m ago", unread: true },
    { id: 2, title: "Delivery Update", message: "Your rider is arriving in 5 mins.", time: "10m ago", unread: true },
    { id: 3, title: "Promo Alert", message: "Get 20% off on your next purchase!", time: "1h ago", unread: false }
];

const dummyChatMessages = [
    { id: 1, sender: "store", text: "Hi Juan! How can we help you today?", time: "10:00 AM" },
    { id: 2, sender: "user", text: "I want to follow up on my order.", time: "10:05 AM" },
    { id: 3, sender: "store", text: "Your order is on the way! It should arrive in 5 mins.", time: "10:06 AM" }
];

interface DashboardViewProps {
    cartCount: number;
    onOpenCart: () => void;
    onAddToCart: (product: Product) => void;
    onLogout: () => void;
    shouldRedirectToOrders?: boolean;
    onRedirectHandled?: () => void;
}

export default function DashboardView({ cartCount, onOpenCart, onAddToCart, onLogout, shouldRedirectToOrders, onRedirectHandled }: DashboardViewProps) {
    const [activeCategory, setActiveCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [showToast, setShowToast] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showMapModal, setShowMapModal] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [activeTab, setActiveTab] = useState<"home" | "orders" | "profile" | "notifications" | "chat" | "custom-order">("home");
    const [savedPlaces, setSavedPlaces] = useState<string>("Pin a location to save your place.");
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [chatMessage, setChatMessage] = useState("");
    const [orderAnimKey, setOrderAnimKey] = useState(0);
    const [expandedOrder, setExpandedOrder] = useState<string | null>("ORD-20241024");

    useEffect(() => {
        if (shouldRedirectToOrders) {
            setActiveTab("orders");
            setOrderAnimKey(prev => prev + 1);
            if (onRedirectHandled) onRedirectHandled();
        }
    }, [shouldRedirectToOrders, onRedirectHandled]);

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
                        initial={{ opacity: 0, y: -50, x: "-50%" }}
                        animate={{ opacity: 1, y: 0, x: "-50%" }}
                        exit={{ opacity: 0, y: -50, x: "-50%" }}
                        className="fixed top-6 left-1/2 z-[60] bg-slate-900 text-white px-6 py-3 rounded-full shadow-lg shadow-slate-900/20 font-medium flex items-center gap-2"
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
                        {/* Notifications Button */}
                        <div className="relative block">
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                    if (window.innerWidth < 768) {
                                        setActiveTab("notifications");
                                    } else {
                                        setShowChat(false);
                                        setShowNotifications(!showNotifications);
                                    }
                                }}
                                className="relative w-12 h-12 bg-white rounded-full border border-emerald-100 flex items-center justify-center hover:bg-emerald-50 transition-colors"
                            >
                                <Bell className="w-6 h-6 text-slate-900" strokeWidth={1.5} />
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-[10px] font-bold w-5 h-5 flex items-center justify-center border-2 border-white shadow-sm"
                                >
                                    2
                                </motion.div>
                            </motion.button>

                            <AnimatePresence>
                                {showNotifications && (
                                    <>
                                        <div className="fixed inset-0 z-40 hidden md:block" onClick={() => setShowNotifications(false)} />
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="hidden md:block absolute -right-16 sm:right-0 top-16 w-[calc(100vw-32px)] sm:w-80 bg-white rounded-2xl shadow-xl z-50 border border-slate-100 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.16)] text-left"
                                        >
                                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                                <h3 className="font-bold text-slate-900">Notifications</h3>
                                                <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-200 p-1">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                            <div className="max-h-[350px] overflow-y-auto">
                                                {dummyNotifications.map(notification => (
                                                    <div key={notification.id} className={`p-4 border-b border-slate-50 hover:bg-green-50/50 transition-colors cursor-pointer ${notification.unread ? 'bg-emerald-50/30' : ''}`}>
                                                        <div className="flex justify-between items-start mb-1">
                                                            <h4 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                                                                {notification.title}
                                                                {notification.unread && <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm"></span>}
                                                            </h4>
                                                            <span className="text-[10px] text-slate-400 shrink-0">{notification.time}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 font-medium leading-relaxed">{notification.message}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="p-3 bg-slate-50 text-center border-t border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
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

                        {/* Profile Button */}
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
                    <section className="max-w-6xl mx-auto px-0 sm:px-6 pt-8 pb-6">
                        <div className="relative w-full h-32 md:h-[120px] md:max-w-[800px] mx-auto sm:rounded-2xl overflow-hidden bg-slate-100 shadow-sm border-y sm:border border-slate-200">
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
                                        className={`h-1.5 rounded-full transition-all ${currentSlide === idx ? "w-6 bg-white" : "w-1.5 bg-white/50"
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
                                    className={`whitespace-nowrap rounded-full px-4 py-2 font-semibold text-sm transition-colors border ${activeCategory === category
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
                                className="whitespace-nowrap rounded-full px-4 py-2 font-semibold text-sm transition-colors border border-emerald-700 bg-emerald-50 text-emerald-800 flex items-center gap-1.5 hover:bg-emerald-100 shrink-0"
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

                        {filteredProducts.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {filteredProducts.map((product, idx) => (
                                    <motion.div
                                        key={product.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05, duration: 0.3 }}
                                        className="bg-white rounded-3xl p-3 sm:p-4 shadow-[0_12px_40px_rgba(0,0,0,0.12)] flex flex-row sm:flex-col gap-3 sm:gap-0 group transition-all border border-slate-100/50 hover:shadow-[0_20px_60px_rgba(0,0,0,0.16)] sm:hover:-translate-y-1"
                                    >
                                        <div className="w-[110px] h-[110px] sm:w-full sm:h-auto sm:aspect-[4/3] relative rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                                            <Image
                                                src={product.image}
                                                alt={product.name}
                                                fill
                                                className="object-cover"
                                            />
                                            {product.isBestSeller && (
                                                <div className="hidden sm:flex absolute top-3 left-3 bg-emerald-800/90 backdrop-blur-md text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg shadow-sm z-10 items-center gap-1.5 border border-emerald-700/50">
                                                    <Star className="w-3.5 h-3.5 fill-white" /> Best Seller
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 flex flex-col text-left items-start sm:pt-4">
                                            <h3 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight line-clamp-1 w-full">
                                                {product.name}
                                            </h3>

                                            <div className="flex items-center gap-1 mt-0.5 sm:mt-1 text-[11px] sm:text-sm">
                                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                                <span className="font-bold text-slate-700">4.9 <span className="font-normal text-slate-500">(500+)</span></span>
                                                <span className="text-slate-300 mx-1">•</span>
                                                <span className="text-slate-500 line-clamp-1">{product.category}</span>
                                            </div>

                                            <div className="flex sm:hidden items-center gap-1 mt-0.5 text-[11px] text-slate-500">
                                                <span className="text-emerald-600 font-bold shrink-0">Free</span>
                                                <span className="line-through text-slate-400 shrink-0">₱45.00</span>
                                                <span className="text-slate-300 mx-1 text-[8px]">•</span>
                                                <span className="truncate">From 25 mins</span>
                                            </div>

                                            <p className="hidden sm:block text-sm text-slate-500 line-clamp-2 mt-2 w-full font-medium leading-relaxed">
                                                The top choice among all our customers, delicious, authentic and a part of an amazing experience!
                                            </p>

                                            <div className="flex justify-between items-end sm:items-center w-full mt-auto sm:pt-4">
                                                <div className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
                                                    ₱{product.price}.00
                                                </div>
                                                <div className="hidden sm:flex gap-0.5 items-center">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} className={`w-3.5 h-3.5 ${i < 4 ? "text-amber-400 fill-amber-400" : "text-amber-400/30 fill-amber-400/30"}`} />
                                                    ))}
                                                    <span className="text-sm font-bold text-slate-700 ml-1.5">4.9</span>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 w-full mt-2 sm:mt-5">
                                                <motion.button
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => handleAddToCart(product)}
                                                    className="flex sm:hidden w-full items-center gap-3 border border-slate-200 rounded-xl py-1.5 px-2 hover:bg-slate-50 transition-colors"
                                                >
                                                    <div className="bg-emerald-100 p-1.5 rounded-lg flex items-center justify-center shrink-0">
                                                        <ShoppingBag className="w-4 h-4 text-emerald-700" />
                                                    </div>
                                                    <div className="flex flex-col text-left justify-center py-0.5">
                                                        <span className="text-[11px] font-bold text-slate-800 leading-none">Add to Cart</span>
                                                        <span className="text-[10px] text-slate-500 leading-none mt-1">Free delivery fee</span>
                                                    </div>
                                                </motion.button>

                                                <motion.button
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => setSelectedProduct(product)}
                                                    className="hidden sm:block flex-1 bg-white text-emerald-700 border-2 border-emerald-700 font-bold py-3 rounded-[14px] hover:bg-emerald-50 transition-colors text-sm shadow-sm"
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
                <motion.section
                    key={orderAnimKey}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="max-w-2xl mx-auto px-4 sm:px-6 py-8 min-h-[calc(100vh-80px)]"
                >
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-6">Your Orders</h2>

                    {[
                        {
                            id: "ORD-20241024",
                            items: "Classic Biko x1, Cassava Cake x1",
                            price: "370.00",
                            method: "Cash on Delivery",
                            status: "Preparing",
                            estDelivery: "3 days from order date"
                        },
                        {
                            id: "ORD-20240915",
                            items: "Puto Cheese x2, Kutsinta x1",
                            price: "250.00",
                            method: "GCash",
                            status: "Delivered",
                            estDelivery: "Delivered on Sep 18"
                        }
                    ].map((order, orderIdx) => {
                        const isExpanded = expandedOrder === order.id;

                        return (
                            <div key={order.id} className="mb-6">
                                {/* Order Card Header */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 + orderIdx * 0.1 }}
                                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                    className={`bg-white p-6 shadow-sm border border-slate-100 cursor-pointer transition-all hover:shadow-md ${isExpanded ? 'rounded-t-3xl border-b-0' : 'rounded-3xl'}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Order #{order.id}</h3>
                                            <p className="text-slate-500 text-sm mt-1 font-medium">{order.method} • ₱{order.price}</p>
                                        </div>
                                        <div className={`font-bold px-3 py-1.5 rounded-full text-xs border uppercase tracking-wider flex items-center gap-2 ${order.status === 'Delivered' ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                            {order.status === 'Preparing' && (
                                                <motion.div
                                                    animate={{ scale: [1, 1.3, 1] }}
                                                    transition={{ repeat: Infinity, duration: 1.2 }}
                                                    className="w-2 h-2 bg-emerald-500 rounded-full"
                                                />
                                            )}
                                            {order.status}
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-slate-800">{order.items}</p>
                                            <p className="text-slate-500 text-xs mt-1 font-medium">{order.estDelivery}</p>
                                        </div>
                                        <motion.div
                                            animate={{ rotate: isExpanded ? 180 : 0 }}
                                            className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0"
                                        >
                                            <ChevronRight className="w-5 h-5 text-slate-400" />
                                        </motion.div>
                                    </div>
                                </motion.div>

                                {/* Expanded Tracker Stepper */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="bg-white rounded-b-3xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.08)] border border-t-0 border-slate-100">
                                                <h4 className="text-[15px] font-black text-slate-900 mb-6 w-full text-left tracking-tight">Tracking Details</h4>
                                                <div className="relative">
                                                    {[
                                                        { title: "Order Placed", desc: "We received your order", time: "Oct 24, 10:00 AM", status: order.status === 'Delivered' ? "completed" : "completed" },
                                                        { title: "Payment Confirmed", desc: "Your payment has been verified", time: "Oct 24, 10:05 AM", status: order.status === 'Delivered' ? "completed" : "completed" },
                                                        { title: "Preparing", desc: "Ate Ai is now preparing your kakanin", time: "Oct 24, 10:15 AM", status: order.status === 'Delivered' ? "completed" : "active" },
                                                        { title: "Out for Delivery", desc: "Your rider is on the way", time: order.status === 'Delivered' ? "Oct 27, 2:00 PM" : "Est. Oct 27, 2:00 PM", status: order.status === 'Delivered' ? "completed" : "upcoming" },
                                                        { title: "Delivered", desc: "Enjoy your order!", time: order.status === 'Delivered' ? "Oct 27, 3:00 PM" : "Est. Oct 27, 3:00 PM", status: order.status === 'Delivered' ? "completed" : "upcoming" },
                                                    ].map((step, idx, arr) => {
                                                        let stepStatus = step.status;
                                                        if (order.status === 'Delivered') {
                                                            stepStatus = 'completed';
                                                        } else if (order.status === 'Preparing') {
                                                            if (idx > 2) stepStatus = 'upcoming';
                                                            else if (idx === 2) stepStatus = 'active';
                                                            else stepStatus = 'completed';
                                                        }

                                                        return (
                                                            <motion.div
                                                                key={idx}
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ delay: 0.1 + idx * 0.1 }}
                                                                className="relative flex"
                                                            >
                                                                {/* Connector Line */}
                                                                {idx !== arr.length - 1 && (
                                                                    <div className="absolute left-[11px] top-6 bottom-[-8px] w-[2px] bg-slate-200">
                                                                        {stepStatus === 'completed' && (
                                                                            <motion.div
                                                                                initial={{ scaleY: 0 }}
                                                                                animate={{ scaleY: 1 }}
                                                                                transition={{ delay: 0.2 + idx * 0.1, duration: 0.3 }}
                                                                                className="w-full h-full bg-emerald-500 origin-top"
                                                                            />
                                                                        )}
                                                                    </div>
                                                                )}

                                                                <div className="relative z-10 shrink-0 mt-1">
                                                                    {stepStatus === "completed" && (
                                                                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center ring-4 ring-white shadow-sm">
                                                                            <motion.svg
                                                                                className="w-3.5 h-3.5"
                                                                                fill="none"
                                                                                viewBox="0 0 24 24"
                                                                                stroke="white"
                                                                                strokeWidth={3}
                                                                            >
                                                                                <motion.path
                                                                                    strokeLinecap="round"
                                                                                    strokeLinejoin="round"
                                                                                    d="M5 13l4 4L19 7"
                                                                                    initial={{ pathLength: 0 }}
                                                                                    animate={{ pathLength: 1 }}
                                                                                    transition={{ delay: 0.3 + idx * 0.1, duration: 0.3 }}
                                                                                />
                                                                            </motion.svg>
                                                                        </div>
                                                                    )}
                                                                    {stepStatus === "active" && (
                                                                        <div className="relative w-6 h-6 rounded-full bg-white border-2 border-emerald-500 flex items-center justify-center ring-4 ring-white shadow-sm">
                                                                            <motion.div
                                                                                animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
                                                                                transition={{ repeat: Infinity, duration: 1.5 }}
                                                                                className="absolute inset-0 rounded-full bg-emerald-400"
                                                                            />
                                                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 relative z-10"></div>
                                                                        </div>
                                                                    )}
                                                                    {stepStatus === "upcoming" && (
                                                                        <div className="w-6 h-6 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center ring-4 ring-white"></div>
                                                                    )}
                                                                </div>

                                                                {/* Content */}
                                                                <div className={`ml-4 flex items-start justify-between w-full ${idx === arr.length - 1 ? '' : 'pb-8'}`}>
                                                                    <div className="pr-4">
                                                                        <h4 className={`font-bold text-[14px] ${stepStatus === 'upcoming' ? 'text-slate-400' : 'text-slate-900'}`}>{step.title}</h4>
                                                                        <p className={`text-[12px] mt-0.5 leading-tight ${stepStatus === 'upcoming' ? 'text-slate-400' : 'text-slate-500'}`}>{step.desc}</p>
                                                                    </div>
                                                                    <div className={`text-right text-[10px] sm:text-[11px] mt-1 whitespace-nowrap shrink-0 ${stepStatus === 'upcoming' ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                                                                        {step.time}
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </motion.section>
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
                                { icon: Star, label: "Rewards", action: () => { } },
                                { icon: MapPin, label: "Saved Places", action: () => setShowMapModal(true) },
                                { icon: CreditCard, label: "Payment Methods", action: () => { } },
                                { icon: Settings, label: "Settings", action: () => { } },
                                { icon: HelpCircle, label: "Help Centre", action: () => { } },
                            ].map((item, idx) => (
                                <div key={idx} onClick={item.action} className="flex justify-between items-center p-4 py-4 md:py-5 border-b border-slate-100 last:border-0 active:bg-slate-50 hover:bg-slate-50 transition-colors cursor-pointer">
                                    <div className="flex items-center gap-4 text-slate-700 font-medium">
                                        <item.icon className="w-5 h-5 text-slate-600" />
                                        <div className="flex flex-col">
                                            <span>{item.label}</span>
                                            {item.label === "Saved Places" && <span className="text-xs text-slate-400 font-normal">{savedPlaces}</span>}
                                        </div>
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

            {/* Mobile Nav & Modals Spacer */}

            {activeTab === "notifications" && (
                <section className="block md:hidden max-w-xl mx-auto bg-slate-50 min-h-screen pt-0 pb-24">
                    <div className="bg-white p-4 border-b border-slate-100 flex items-center gap-3 sticky top-20 z-10 shadow-sm">
                        <Bell className="w-5 h-5 text-emerald-700" />
                        <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {dummyNotifications.map(notification => (
                            <div key={notification.id} className={`p-4 bg-white transition-colors ${notification.unread ? 'bg-emerald-50/40' : ''}`}>
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-semibold text-[15px] text-slate-900 flex items-center gap-2">
                                        {notification.title}
                                        {notification.unread && <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shrink-0"></span>}
                                    </h4>
                                    <span className="text-xs text-slate-400 shrink-0">{notification.time}</span>
                                </div>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed">{notification.message}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {activeTab === "chat" && (
                <section className="block md:hidden max-w-xl mx-auto bg-slate-50 h-[calc(100vh-80px-70px)] flex flex-col pt-0 pb-0">
                    <div className="bg-emerald-700 p-4 border-b border-emerald-800 flex items-center gap-3 sticky top-20 z-10 shadow-sm text-white">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                            <Leaf className="w-5 h-5 text-white" strokeWidth={1.5} />
                        </div>
                        <div>
                            <h3 className="font-bold">Ate Ai's Support</h3>
                            <div className="flex items-center gap-1.5 text-xs text-emerald-100">
                                <span className="w-2 h-2 rounded-full bg-green-400"></span> Online
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                        {dummyChatMessages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${msg.sender === "user" ? "bg-emerald-600 text-white rounded-tr-sm" : "bg-white border border-slate-100 text-slate-800 rounded-tl-sm"}`}>
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
                            className="flex-1 bg-slate-100 border-transparent rounded-full px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:bg-white transition-all placeholder:text-slate-400"
                        />
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => { if (chatMessage.trim()) setChatMessage(""); }}
                            className="w-11 h-11 bg-emerald-700 rounded-full flex items-center justify-center shrink-0 hover:bg-emerald-800 transition-colors shadow-sm shadow-emerald-700/20"
                        >
                            <Send className="w-4 h-4 text-white ml-0.5" strokeWidth={2} />
                        </motion.button>
                    </div>
                </section>
            )}

            {activeTab === "custom-order" && (
                <section className="block max-w-xl mx-auto bg-slate-50 h-[calc(100vh-80px)] md:h-[calc(100vh-80px-70px)] flex flex-col pt-0 pb-0">
                    <div className="bg-emerald-800 p-4 border-b border-emerald-900 flex items-center gap-3 sticky top-20 z-10 shadow-sm text-white">
                        <button
                            onClick={() => setActiveTab("home")}
                            className="hidden md:flex p-2 -ml-2 mr-1 hover:bg-emerald-700/50 rounded-full transition-colors"
                            aria-label="Go back to menu"
                        >
                            <ArrowLeft className="w-5 h-5 text-white" />
                        </button>
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                            <Store className="w-5 h-5 text-white" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold">Custom Order Request</h3>
                            <div className="flex items-center gap-1.5 text-xs text-emerald-100">
                                Let's discuss your special request!
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                        <div className="flex justify-start">
                            <div className="max-w-[85%] rounded-2xl p-3 shadow-sm bg-white border border-slate-100 text-slate-800 rounded-tl-sm">
                                <p className="text-sm font-semibold mb-2">Welcome to Custom Orders!</p>
                                <p className="text-sm text-slate-600">Please let us know the details of your request (e.g., specific flavors, bulk quanties, dietary restrictions).</p>
                                <span className="text-[10px] block mt-2 text-slate-400">Just now</span>
                            </div>
                        </div>
                        {/* We reuse dummyChatMessages or chatMessage state here for a simple implementation */}
                        {chatMessage.trim().length > 0 && false /* Hiding until sent, actually let's just use a separate state or dummy UI */}
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-white flex flex-col gap-3 sticky bottom-[calc(env(safe-area-inset-bottom)+50px)] md:bottom-0">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Describe your custom order..."
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                                className="flex-1 bg-slate-100 border-transparent rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:bg-white transition-all placeholder:text-slate-400"
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

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-2 flex justify-between items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
                {[
                    { id: "home", label: "Home", icon: Store },
                    { id: "orders", label: "Orders", icon: ReceiptText },
                    { id: "chat", label: "Support", icon: Headset },
                    { id: "profile", label: "Account", icon: User },
                ].map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <motion.button
                            key={tab.id}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                                setActiveTab(tab.id as any);
                                if (tab.id === "orders") {
                                    setOrderAnimKey(prev => prev + 1);
                                }
                            }}
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
                            className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl z-10 flex flex-col items-center"
                        >
                            <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-4 w-full text-left">Manage Saved Places</h3>
                            <div className="relative w-full h-80 rounded-2xl overflow-hidden bg-emerald-50 mb-6 border border-slate-100 flex-shrink-0">
                                <LocationPicker
                                    onLocationSelect={(addr, lat, lng) => {
                                        setSavedPlaces(addr);
                                        setShowMapModal(false);
                                    }}
                                />
                            </div>
                            <motion.button
                                whileTap={{ scale: 0.96 }}
                                onClick={() => setShowMapModal(false)}
                                className="w-full text-slate-500 font-semibold rounded-xl py-3 hover:bg-slate-50 transition-colors"
                            >
                                Close
                            </motion.button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
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
