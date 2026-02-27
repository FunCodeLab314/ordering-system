"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, Truck, ShieldCheck, ArrowRight, ShoppingCart, Star, ChevronDown, X, ShoppingBag, Phone, Mail, ChevronRight, ArrowLeft, CheckCircle2 } from "lucide-react";

import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useProducts } from "@/hooks/useProducts";
import { Product } from "@/lib/data";
import ProductModal from "./ProductModal";

interface LandingViewProps {
    onLogin: () => void;
}

export default function LandingView({ onLogin }: LandingViewProps) {
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [authTab, setAuthTab] = useState<"login" | "signup">("login");
    const [signupMethod, setSignupMethod] = useState<"phone" | "email" | null>(null);
    const [signupStep, setSignupStep] = useState<"method" | "otp">("method");
    const [codeSent, setCodeSent] = useState(false);
    const [otpValue, setOtpValue] = useState(["", "", "", "", "", ""]);
    const [signupInput, setSignupInput] = useState("");
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [signupPassword, setSignupPassword] = useState("");
    const [signupFullName, setSignupFullName] = useState("");
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
    const { products } = useProducts();
    const bestSellers = products.filter((p) => p.isBestSeller).slice(0, 4);

    const resetSignupState = () => {
        setAuthTab("login");
        setSignupMethod(null);
        setSignupStep("method");
        setCodeSent(false);
        setOtpValue(["", "", "", "", "", ""]);
        setSignupInput("");
        setLoginEmail("");
        setLoginPassword("");
        setSignupPassword("");
        setSignupFullName("");
        setAuthError(null);
        setAuthLoading(false);
    };

    const closeAuthModal = () => {
        setShowLoginModal(false);
        resetSignupState();
    };

    const selectSignupMethod = (method: "phone" | "email") => {
        setSignupMethod(method);
        setSignupStep("otp");
        setCodeSent(false);
        setSignupInput("");
        setOtpValue(["", "", "", "", "", ""]);
        setAuthError(null);
    };

    const handleLogin = async () => {
        setAuthError(null);
        setAuthLoading(true);
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({
            email: loginEmail,
            password: loginPassword,
        });
        setAuthLoading(false);
        if (error) {
            setAuthError(error.message);
            return;
        }
        closeAuthModal();
        onLogin();
    };

    const handleSignUp = async () => {
        setAuthError(null);
        setAuthLoading(true);
        const supabase = createClient();

        if (signupMethod === "email") {
            const { error } = await supabase.auth.signUp({
                email: signupInput,
                password: signupPassword,
                options: { data: { full_name: signupFullName } },
            });
            if (error) {
                setAuthError(error.message);
                setAuthLoading(false);
                return;
            }
        } else {
            const { error } = await supabase.auth.signInWithOtp({ phone: signupInput });
            if (error) {
                setAuthError(error.message);
                setAuthLoading(false);
                return;
            }
        }

        setAuthLoading(false);
        closeAuthModal();
        onLogin();
    };

    const handleOtpInput = (index: number, value: string) => {
        const cleaned = value.replace(/\D/g, "").slice(-1);
        const nextValue = [...otpValue];
        nextValue[index] = cleaned;
        setOtpValue(nextValue);

        if (cleaned && index < otpRefs.current.length - 1) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpBackspace = (index: number, key: string) => {
        if (key === "Backspace" && !otpValue[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-[#FDFBF7]"
        >
            {/* 1. Navbar */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-emerald-50">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Image
                            src="/logo.png"
                            alt="Ate Ai's Kitchen Logo"
                            width={40}
                            height={40}
                            className="object-contain"
                            priority
                        />
                        <span className="font-bold text-xl tracking-tight text-slate-900">
                            Ate Ai&apos;s Kitchen
                        </span>
                    </div>

                    <nav className="hidden md:flex items-center gap-8 text-slate-500 font-medium tracking-tight">
                        <a href="#hero" className="hover:text-emerald-700 transition-colors">Home</a>
                        <a href="#bestsellers" className="hover:text-emerald-700 transition-colors">Menu</a>
                        <a href="#about" className="hover:text-emerald-700 transition-colors">About Us</a>
                        <a href="#faq" className="hover:text-emerald-700 transition-colors">FAQ</a>
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
                            className="bg-emerald-700 text-white font-semibold rounded-lg px-6 py-2.5 hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2"
                        >
                            Login
                        </motion.button>
                    </div>
                </div>
            </header>

            {/* 2. Hero Section */}
            <section id="hero" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8">
                        <h1 className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight leading-[1.1]">
                            Authentic Kakanin, <br />
                            <span className="text-emerald-700">Made Fresh</span> for You
                        </h1>
                        <p className="text-lg text-slate-500 max-w-md leading-relaxed">
                            Experience the true taste of Filipino traditions. Handcrafted daily using locally sourced, organic ingredients passed directly from our farm to your table.
                        </p>
                        <ul className="space-y-2 text-slate-600 font-medium pb-2">
                            <li className="flex items-center gap-2"><ArrowRight className="w-4 h-4 text-emerald-600" /> 100% Organic Ingredients</li>
                            <li className="flex items-center gap-2"><ArrowRight className="w-4 h-4 text-emerald-600" /> Passed down family recipes</li>
                            <li className="flex items-center gap-2"><ArrowRight className="w-4 h-4 text-emerald-600" /> Delivered fresh daily</li>
                        </ul>
                        <div className="flex flex-wrap gap-4">
                            <motion.button
                                whileTap={{ scale: 0.96 }}
                                onClick={() => setShowLoginModal(true)}
                                className="bg-emerald-700 text-white font-semibold rounded-lg px-8 py-3.5 hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 text-lg shadow-sm shadow-emerald-700/20"
                            >
                                Order Now <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
                            </motion.button>
                        </div>
                    </div>
                    <div className="relative h-[400px] md:h-[500px] w-full rounded-xl overflow-hidden shadow-2xl shadow-emerald-900/10">
                        <Image
                            src="/images/591464953_1300306415449870_2950367490494058842_n.jpg"
                            alt="Delicious Kakanin"
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>
                </div>
            </section>

            {/* 3. Social Proof 1 (Logos) */}
            <section className="border-y border-emerald-50 bg-white py-10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
                    <p className="text-sm font-semibold text-slate-400 tracking-widest uppercase mb-6">Recommended By</p>
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                        {/* Placeholder Logos */}
                        {["Business Time", "The Daily Foodie", "Local Bites", "Manila Eats", "Morning Brew"].map((logo, idx) => (
                            <div key={idx} className="text-xl font-black tracking-tighter text-slate-800">
                                {logo.toUpperCase()}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 4. Best Sellers */}
            <section id="bestsellers" className="py-20 max-w-6xl mx-auto px-4 sm:px-6">
                <div className="text-center md:text-left mb-10">
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight uppercase">Best Sellers</h2>
                    <p className="text-slate-500 mt-2 text-lg">Taste our most loved recipes</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {bestSellers.map((product) => (
                        <motion.div
                            key={product.id}
                            whileHover={{ y: -4 }}
                            className="bg-white rounded-[24px] p-[10px] shadow-[0_12px_40px_rgba(0,0,0,0.12)] flex flex-row sm:flex-col gap-3 sm:gap-0 group transition-all border border-slate-100/50 hover:shadow-[0_20px_60px_rgba(0,0,0,0.16)] sm:hover:-translate-y-1"
                        >
                            <div className="w-[110px] h-[110px] sm:w-full sm:h-auto sm:aspect-[4/3] relative rounded-[14px] overflow-hidden bg-slate-100 shrink-0">
                                <Image
                                    src={product.image}
                                    alt={product.name}
                                    fill
                                    className="object-cover object-center scale-[1.12]"
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
                                    <span className="text-slate-300 mx-1">ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢</span>
                                    <span className="text-slate-500 line-clamp-1">{product.category}</span>
                                </div>

                                <div className="flex sm:hidden items-center gap-1 mt-0.5 text-[11px] text-slate-500">
                                    <span className="truncate">From 25 mins</span>
                                </div>

                                <p className="hidden sm:block text-sm text-slate-500 line-clamp-2 mt-2 w-full font-medium leading-relaxed">
                                    The top choice among all our customers, delicious, authentic and a part of an amazing experience!
                                </p>

                                <div className="flex justify-between items-end sm:items-center w-full mt-auto sm:pt-4">
                                    <div className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
                                        ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â±{product.price}.00
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
                                        onClick={() => setShowLoginModal(true)}
                                        className="flex sm:hidden w-full h-11 items-center justify-center gap-2 border border-slate-200 rounded-[24px] px-[10px] hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                                            <ShoppingBag className="w-4 h-4 text-emerald-700" />
                                        </div>
                                        <span className="text-[13px] font-bold text-slate-800 leading-none">Add to Cart</span>
                                    </motion.button>

                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setSelectedProduct(product)}
                                        className="hidden sm:block flex-1 bg-white text-emerald-700 border-2 border-emerald-700 font-bold py-2.5 px-[10px] rounded-[24px] hover:bg-emerald-50 transition-colors text-sm shadow-sm"
                                    >
                                        More details
                                    </motion.button>
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setShowLoginModal(true)}
                                        className="hidden sm:flex bg-emerald-700 text-white p-3 rounded-[14px] hover:bg-emerald-800 transition-colors items-center justify-center shrink-0 w-12 h-12 shadow-md shadow-emerald-700/20"
                                    >
                                        <ShoppingCart className="w-5 h-5" strokeWidth={2.5} />
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* 5. Categories */}
            <section className="bg-emerald-50 py-20 overflow-hidden">
                <div className="w-full">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight uppercase">Product Categories</h2>
                        <p className="text-slate-500 mt-2 text-lg">Browse our delectable selections</p>
                    </div>
                    <div className="relative w-full">
                        {/* 
                            We create two identical sliding tracks side by side to ensure an infinite seamless loop.
                            The distance they travel and speed determines how smooth the scroll is.
                        */}
                        <motion.div
                            className="flex gap-4 px-4 w-max"
                            animate={{
                                x: ["0%", "-50%"]
                            }}
                            transition={{
                                ease: "linear",
                                duration: 25,
                                repeat: Infinity,
                            }}
                        >
                            {[...Array(2)].map((_, groupIdx) => (
                                <div key={groupIdx} className="flex gap-4">
                                    {/* Primary Array */}
                                    {[
                                        { name: "Puto", img: "/images/cat_puto.png" },
                                        { name: "Suman", img: "/images/cat_suman.png" },
                                        { name: "Kalamay", img: "/images/cat_kalamay.png" },
                                        { name: "Sweets", img: "/images/cat_sweets.png" },
                                        { name: "Drinks", img: "/images/cat_drinks.png" },
                                        { name: "Merienda", img: "/images/cat_merienda.png" },
                                    ].map((cat, idx) => (
                                        <div key={`${groupIdx}-${idx}`} className="relative bg-white rounded-[24px] p-[10px] text-center shadow-sm cursor-pointer hover:shadow-md transition-all border border-slate-100 flex flex-col items-center justify-end gap-3 h-48 w-40 shrink-0 overflow-hidden group">
                                            <div className="absolute inset-x-[10px] top-[10px] bottom-12 rounded-[14px] overflow-hidden">
                                                <Image src={cat.img} alt={cat.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                                            </div>
                                            <span className="font-bold text-slate-800 z-10 mb-2">{cat.name}</span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </motion.div>

                        {/* Gradient fades on edges */}
                        <div className="absolute top-0 bottom-0 left-0 w-16 bg-gradient-to-r from-emerald-50 to-transparent z-10 pointer-events-none" />
                        <div className="absolute top-0 bottom-0 right-0 w-16 bg-gradient-to-l from-emerald-50 to-transparent z-10 pointer-events-none" />
                    </div>
                </div>
            </section>

            {/* 6. Social Proof 2 (Testimonials) */}
            <section className="py-20 max-w-6xl mx-auto px-4 sm:px-6">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight uppercase">Customer Reviews</h2>
                    <div className="flex justify-center gap-1 mt-3">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                        ))}
                    </div>
                    <p className="text-slate-500 mt-2 font-medium">Over 500+ satisfied customers</p>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        { name: "Maria Santos", review: "Absolutely delicious! The flavors bring me right back to my childhood. The delivery was fast and the food arrived perfectly warm. Will definitely order again." },
                        { name: "Juan Dela Cruz", review: "The biko is the best I have ever had. The latik is generous and the rice is perfectly sticky. You can tell they use real authentic ingredients." },
                        { name: "Ana Reyes", review: "Our family gathering was a hit because of the party trays! Everyone kept asking where I bought the sapin-sapin. 10/10 recommend." }
                    ].map((review, i) => (
                        <div key={i} className="bg-white p-8 rounded-xl border border-slate-100 shadow-sm relative hover:shadow-md transition-shadow">
                            <div className="flex gap-1 mb-4">
                                {[...Array(5)].map((_, sIdx) => (
                                    <Star key={sIdx} className="w-4 h-4 text-amber-400 fill-amber-400" />
                                ))}
                            </div>
                            <p className="text-slate-600 mb-6 font-medium italic">&quot;{review.review}&quot;</p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                                    {review.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">{review.name}</p>
                                    <p className="text-emerald-600 text-xs font-medium">Verified Buyer</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 7. Why Choose Us (Brand Benefits) */}
            <section className="bg-white py-24 border-y border-emerald-50">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-16 items-center">
                    <div className="relative h-[450px] rounded-xl overflow-hidden shadow-2xl shadow-emerald-900/10">
                        <Image src="/images/605127122_1318326396981205_357002003061011921_n.jpg" alt="Placeholder" fill className="object-cover" />
                    </div>
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900 tracking-tight uppercase">Why Choose Ate Ai&apos;s Kitchen?</h2>
                            <p className="text-slate-500 mt-2 text-lg">Authentic flavors, fresh ingredients, delivered with care.</p>
                        </div>
                        <div className="space-y-6">
                            {[
                                { icon: Leaf, title: "100% Organic", desc: "Sourced from local partner farms" },
                                { icon: Truck, title: "Fast Delivery", desc: "Freshness delivered to your door" },
                                { icon: ShieldCheck, title: "Quality Guaranteed", desc: "Made with love and tradition" },
                            ].map((feature, idx) => (
                                <div key={idx} className="flex flex-col items-center text-center space-y-4 p-6 rounded-xl hover:bg-[#FDFBF7] transition-colors group cursor-default">
                                    <div className="w-16 h-16 bg-emerald-50 rounded-lg flex items-center justify-center group-hover:bg-emerald-100 transition-colors group-hover:scale-110 duration-300">
                                        <feature.icon className="w-8 h-8 text-emerald-700" strokeWidth={1.5} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">{feature.title}</h3>
                                        <p className="text-slate-500 mt-2">{feature.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={() => setShowLoginModal(true)}
                            className="bg-emerald-700 text-white font-semibold rounded-lg px-8 py-3.5 hover:bg-emerald-800 transition-colors shadow-sm shadow-emerald-700/20"
                        >
                            Lorem ipsum dolor sit
                        </motion.button>
                    </div>
                </div>
            </section>

            {/* 8. Social Proof 3 (UGC / Photos) */}
            <section className="bg-slate-50 py-20">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight uppercase mb-2">Our Community</h2>
                    <p className="text-slate-500 mb-10 text-lg">See how others are enjoying their Kakanin</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {["/images/593673054_1300306312116547_6490578196211127701_n.jpg", "/images/605188717_1318326246981220_1061114583552849080_n.jpg", "/images/605233392_1317303160416862_4630087036549176694_n.jpg", "/images/605531388_1318326170314561_2523568997260473391_n.jpg", "/images/605729596_1318326473647864_5609203966918017777_n.jpg"].map((src, i) => (
                            <div key={i} className="aspect-square relative rounded-lg overflow-hidden hover:opacity-90 transition-opacity cursor-pointer shadow-sm">
                                <Image src={src} alt="UGC" fill className="object-cover" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 9. About Us / Founder */}
            <section id="about" className="bg-[#f0ede5] py-24">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
                    <div className="mx-auto w-32 h-32 rounded-full overflow-hidden mb-6 border-4 border-white shadow-lg relative">
                        <Image src="/images/605127122_1318326396981205_357002003061011921_n.jpg" alt="Founder" fill className="object-cover" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight uppercase mb-4">About the Founder</h2>
                    <p className="text-slate-600 text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
                        &quot;I started Ate Ai&apos;s Kitchen because I couldn&apos;t find the genuine, comforting taste of my grandmother&apos;s cooking anywhere in the city. What started as a small weekend hobby has blossomed into a passion project to share our rich Filipino food heritage with everyone. Every single product we sell is made with exactly the same care, love, and attention to detail as if I was serving it to my own family.&quot;
                    </p>
                    <p className="font-bold text-emerald-800 text-xl tracking-widest">- Ate Ai</p>
                </div>
            </section>

            {/* 10. Frequently Asked Questions */}
            <section id="faq" className="py-24 max-w-3xl mx-auto px-4 sm:px-6">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight uppercase">Frequently Asked Questions</h2>
                    <p className="text-slate-500 mt-2 text-lg">Got questions? We&apos;ve got answers.</p>
                </div>
                <div className="space-y-4">
                    {[
                        { q: "How long does the food stay fresh?", a: "Our kakanin is best consumed within 2-3 days if refrigerated, and on the same day if left at room temperature." },
                        { q: "Do you offer bulk orders for parties?", a: "Yes! We have party trays available. Please order at least 2 days in advance for large quantities." },
                        { q: "Where do you deliver?", a: "Currently, we deliver across Metro Manila and select areas in Rizal and Cavite." },
                        { q: "Are your ingredients really 100% organic?", a: "Absolutely. We strictly partner with certified organic farms for our rice, coconuts, and natural sweeteners." }
                    ].map((faq, idx) => (
                        <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                            <button
                                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                                className="w-full flex justify-between items-center p-6 text-left font-bold text-slate-800 hover:bg-slate-50 transition-colors"
                            >
                                {faq.q}
                                <ChevronDown className={`w-5 h-5 text-emerald-600 transition-transform ${openFaq === idx ? "rotate-180" : ""}`} />
                            </button>
                            <AnimatePresence>
                                {openFaq === idx && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="px-6 pb-6 text-slate-600 leading-relaxed"
                                    >
                                        {faq.a}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </section>

            {/* 11. Final CTA */}
            <section className="bg-emerald-800 py-24 text-center">
                <div className="max-w-2xl mx-auto px-4 sm:px-6">
                    <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight uppercase mb-6 leading-tight">Ready to taste the tradition?</h2>
                    <p className="text-emerald-50 text-xl md:text-2xl mb-10 font-medium">Sign up now and get 15% off your very first order of delicious, authentic Kakanin.</p>
                    <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setShowLoginModal(true)}
                        className="bg-white text-emerald-800 font-bold rounded-lg px-10 py-5 hover:bg-emerald-50 transition-colors shadow-2xl shadow-emerald-950/40 text-lg mx-auto inline-flex items-center gap-3"
                    >
                        Create your account today <ArrowRight className="w-5 h-5" />
                    </motion.button>
                </div>
            </section>

            {/* 12. Footer */}
            <footer className="bg-[#1e293b] py-16 text-slate-400">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-4 gap-8 mb-12">
                    <div className="md:col-span-2">
                        <div className="flex items-center gap-2 mb-6">
                            <Image
                                src="/logo.png"
                                alt="Ate Ai's Kitchen Logo"
                                width={28}
                                height={28}
                                className="object-contain"
                            />
                            <span className="font-bold text-2xl tracking-tight text-white">
                                Ate Ai&apos;s Kitchen
                            </span>
                        </div>
                        <p className="max-w-sm mb-6">Bringing the authentic taste of Filipino heritage snacks directly to your modern table, fresh every single day.</p>
                    </div>
                    <div>
                        <h4 className="text-white font-bold tracking-widest uppercase text-sm mb-6">Quick Links</h4>
                        <ul className="space-y-3">
                            <li><a href="#hero" className="hover:text-emerald-400 transition-colors">Home</a></li>
                            <li><a href="#bestsellers" className="hover:text-emerald-400 transition-colors">Menu</a></li>
                            <li><a href="#about" className="hover:text-emerald-400 transition-colors">About Us</a></li>
                            <li><a href="#faq" className="hover:text-emerald-400 transition-colors">FAQs</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-bold tracking-widest uppercase text-sm mb-6">Contact</h4>
                        <ul className="space-y-3">
                            <li className="hover:text-emerald-400 transition-colors cursor-pointer">hello@ateaiskitchen.com</li>
                            <li className="hover:text-emerald-400 transition-colors cursor-pointer">+63 912 345 6789</li>
                            <li><span className="text-slate-500">Metro Manila, Philippines</span></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 border-t border-slate-800 text-center text-sm">
                    <p>&copy; {new Date().getFullYear()} Ate Ai&apos;s Kitchen. All rights reserved.</p>
                </div>
            </footer>

            {/* Auth Modal */}
            <AnimatePresence>
                {showLoginModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeAuthModal}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md bg-white rounded-xl shadow-2xl z-10 overflow-hidden"
                        >
                            <div className="px-6 pt-6">
                                <div className="flex justify-between items-center mb-5">
                                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{authTab === "login" ? "Welcome Back" : "Create Account"}</h2>
                                    <button
                                        onClick={closeAuthModal}
                                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="relative border-b border-slate-100 mb-6">
                                    <div className="flex items-center">
                                        <button
                                            onClick={() => setAuthTab("login")}
                                            className={`flex-1 text-sm font-semibold pb-3 transition-colors ${authTab === "login" ? "text-emerald-700" : "text-slate-500 hover:text-slate-700"}`}
                                        >
                                            Login
                                        </button>
                                        <button
                                            onClick={() => setAuthTab("signup")}
                                            className={`flex-1 text-sm font-semibold pb-3 transition-colors ${authTab === "signup" ? "text-emerald-700" : "text-slate-500 hover:text-slate-700"}`}
                                        >
                                            Sign Up
                                        </button>
                                    </div>
                                    <motion.div
                                        animate={{ x: authTab === "login" ? "0%" : "100%" }}
                                        transition={{ duration: 0.2 }}
                                        className="absolute bottom-0 left-0 w-1/2 h-0.5 bg-emerald-700"
                                    />
                                </div>
                            </div>

                            <div className="px-6 pb-6 space-y-4">
                                {authError && (
                                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                                        {authError}
                                    </div>
                                )}
                                {authTab === "login" && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                            <input
                                                type="email"
                                                value={loginEmail}
                                                onChange={(e) => setLoginEmail(e.target.value)}
                                                placeholder="you@email.com"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-500 transition-all font-medium"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                                            <input
                                                type="password"
                                                value={loginPassword}
                                                onChange={(e) => setLoginPassword(e.target.value)}
                                                placeholder="********"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-500 transition-all font-medium"
                                            />
                                        </div>

                                        <motion.button
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleLogin}
                                            disabled={authLoading}
                                            className="w-full bg-emerald-700 text-white font-semibold rounded-lg py-3 mt-2 shadow-md shadow-emerald-700/20 hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {authLoading ? "Signing in..." : "Login"}
                                        </motion.button>

                                        <div className="relative py-2">
                                            <div className="absolute inset-x-0 top-1/2 h-px bg-slate-100 -translate-y-1/2"></div>
                                            <div className="relative flex justify-center">
                                                <span className="bg-white px-4 text-xs font-medium text-slate-400">or continue with</span>
                                            </div>
                                        </div>

                                        <motion.button
                                            whileTap={{ scale: 0.98 }}
                                            className="w-full bg-white border border-slate-200 text-slate-700 font-medium rounded-lg py-3 hover:bg-slate-50 transition-colors flex items-center justify-center gap-3"
                                        >
                                            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                            </svg>
                                            Login with Google
                                        </motion.button>
                                    </>
                                )}

                                {authTab === "signup" && signupStep === "method" && (
                                    <>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900">Create your account</h3>
                                            <p className="text-sm text-slate-500 mt-1">Choose how you&apos;d like to register</p>
                                        </div>

                                        <button
                                            onClick={() => selectSignupMethod("phone")}
                                            className="border border-slate-200 rounded-lg p-4 flex items-center gap-4 hover:bg-slate-50 cursor-pointer transition-colors w-full text-left"
                                        >
                                            <div className="bg-emerald-50 text-emerald-700 rounded-md p-2 shrink-0">
                                                <Phone className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-slate-800">Continue with Phone Number</p>
                                                <p className="text-sm text-slate-500">We&apos;ll send a 6-digit OTP</p>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
                                        </button>

                                        <button
                                            onClick={() => selectSignupMethod("email")}
                                            className="border border-slate-200 rounded-lg p-4 flex items-center gap-4 hover:bg-slate-50 cursor-pointer transition-colors w-full text-left"
                                        >
                                            <div className="bg-blue-50 text-blue-600 rounded-md p-2 shrink-0">
                                                <Mail className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-slate-800">Continue with Email Address</p>
                                                <p className="text-sm text-slate-500">We&apos;ll send a verification code</p>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
                                        </button>

                                        <div className="relative my-2">
                                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
                                            <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-slate-400">or</span></div>
                                        </div>

                                        <button
                                            onClick={handleSignUp}
                                            className="border border-slate-200 rounded-lg p-4 flex items-center gap-4 hover:bg-slate-50 cursor-pointer transition-colors w-full text-left"
                                        >
                                            <div className="w-9 h-9 bg-white rounded-md border border-slate-200 flex items-center justify-center shrink-0">
                                                <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-slate-800">Continue with Google</p>
                                                <p className="text-sm text-slate-500">Quick sign-up with your Google account</p>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
                                        </button>
                                    </>
                                )}

                                {authTab === "signup" && signupStep === "otp" && (
                                    <>
                                        <button
                                            onClick={() => {
                                                setSignupStep("method");
                                                setCodeSent(false);
                                                setOtpValue(["", "", "", "", "", ""]);
                                            }}
                                            className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                                        >
                                            <ArrowLeft className="w-4 h-4 text-slate-600" />
                                        </button>

                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900">{signupMethod === "phone" ? "Enter your phone number" : "Enter your email address"}</h3>
                                        </div>

                                        {signupMethod === "email" && (
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                                <input
                                                    type="text"
                                                    value={signupFullName}
                                                    onChange={(e) => setSignupFullName(e.target.value)}
                                                    placeholder="Juan Dela Cruz"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-500 transition-all font-medium"
                                                />
                                            </div>
                                        )}

                                        <div className="relative">
                                            {signupMethod === "phone" && (
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">ÃƒÂ°Ã…Â¸Ã¢â‚¬Â¡Ã‚ÂµÃƒÂ°Ã…Â¸Ã¢â‚¬Â¡Ã‚Â­</span>
                                            )}
                                            <input
                                                type={signupMethod === "phone" ? "tel" : "email"}
                                                value={signupInput}
                                                onChange={(e) => setSignupInput(e.target.value)}
                                                placeholder={signupMethod === "phone" ? "+63 9XX XXX XXXX" : "you@email.com"}
                                                className={`w-full bg-slate-50 border border-slate-200 rounded-lg py-3 ${signupMethod === "phone" ? "pl-10" : "pl-4"} pr-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-500 transition-all font-medium`}
                                            />
                                        </div>

                                        {signupMethod === "email" && (
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                                                <input
                                                    type="password"
                                                    value={signupPassword}
                                                    onChange={(e) => setSignupPassword(e.target.value)}
                                                    placeholder="Create a password"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-500 transition-all font-medium"
                                                />
                                            </div>
                                        )}

                                        <motion.button
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleSignUp}
                                            disabled={authLoading}
                                            className="w-full bg-emerald-700 text-white font-semibold rounded-lg py-3 shadow-md shadow-emerald-700/20 hover:bg-emerald-800 transition-colors"
                                        >
                                            {authLoading ? "Please wait..." : signupMethod === "phone" ? "Send OTP Code" : "Create Account"}
                                        </motion.button>

                                        {codeSent && (
                                            <>
                                                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex items-start gap-2">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                                                    <p className="text-sm text-emerald-800">Code sent to {signupInput}</p>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {otpValue.map((digit, idx) => (
                                                        <input
                                                            key={idx}
                                                            ref={(el) => { otpRefs.current[idx] = el; }}
                                                            type="text"
                                                            inputMode="numeric"
                                                            maxLength={1}
                                                            value={digit}
                                                            onInput={(e) => handleOtpInput(idx, (e.target as HTMLInputElement).value)}
                                                            onKeyDown={(e) => handleOtpBackspace(idx, e.key)}
                                                            className="w-10 h-12 text-center border border-slate-200 rounded-md text-lg font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                                        />
                                                    ))}
                                                </div>

                                                <div className="text-sm text-slate-500">
                                                    Didn&apos;t receive it?{" "}
                                                    <button
                                                        onClick={handleSignUp}
                                                        className="text-emerald-700 font-semibold cursor-pointer"
                                                    >
                                                        Resend Code
                                                    </button>
                                                </div>

                                                <motion.button
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={handleSignUp}
                                                    className="w-full bg-emerald-700 text-white font-semibold rounded-lg py-3 shadow-md shadow-emerald-700/20 hover:bg-emerald-800 transition-colors"
                                                >
                                                    Verify & Create Account
                                                </motion.button>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
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
                    setSelectedProduct(null);
                    setShowLoginModal(true);
                }}
                actionText="Login to Order"
            />
        </motion.div>
    );
}

