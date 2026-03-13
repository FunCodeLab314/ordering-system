"use client";

import { type ChangeEvent, SVGProps, useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, MapPin, CreditCard, Banknote, Calendar, CheckCircle2, Truck, Store, Upload, QrCode, Phone } from "lucide-react";
import Image from "next/image";
import { Product } from "@/lib/data";
import {
    createSavedDeliveryAddressEntry,
    DEFAULT_CART_ADDRESS,
    SAVED_PLACE_DATA_KEY_PREFIX,
    SAVED_PLACE_LIST_KEY_PREFIX,
    hasSavedDeliveryAddress,
    parseStoredDeliveryAddressList,
    parseStoredDeliveryAddress,
    type DeliveryAddressData,
    type SavedDeliveryAddressEntry,
} from "@/lib/deliveryAddress";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { placeOrder } from "@/lib/orders/placeOrder";
import { normalizePaymentReference, type PaymentReceiptExtractionResult } from "@/lib/payments/receiptTypes";
import LocationPicker from "./LocationPicker";

export interface CartItem extends Product {
    quantity: number;
}

interface CheckoutCustomQuote {
    id: string;
    title: string;
    itemDescription: string;
    quantity: number;
    unitPrice: number;
    quotedTotal: number;
    deliveryDate: string | null;
    notes: string | null;
}

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    cartItems: CartItem[];
    onUpdateQuantity: (id: string, delta: number) => void;
    customQuoteCheckout?: CheckoutCustomQuote | null;
    onClearCustomQuote?: () => void;
    onPlaceOrder: () => void;
}

export default function CartDrawer({
    isOpen,
    onClose,
    cartItems,
    onUpdateQuantity,
    customQuoteCheckout = null,
    onClearCustomQuote,
    onPlaceOrder,
}: CartDrawerProps) {
    const { user } = useAuth();
    const metadataName =
        typeof user?.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : typeof user?.user_metadata?.name === "string"
                ? user.user_metadata.name
                : "";
    const [selectedPayment, setSelectedPayment] = useState<string>("cod");
    const [walletProvider, setWalletProvider] = useState<"GCash" | "Maya">("GCash");
    const [showSuccess, setShowSuccess] = useState(false);
    const [deliveryMode, setDeliveryMode] = useState<"delivery" | "pickup">("delivery");
    const [showMapModal, setShowMapModal] = useState(false);
    const [showAddressSelectorModal, setShowAddressSelectorModal] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState<DeliveryAddressData | null>(null);
    const [savedAddress, setSavedAddress] = useState<DeliveryAddressData | null>(null);
    const [savedAddressList, setSavedAddressList] = useState<SavedDeliveryAddressEntry[]>([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentStep, setPaymentStep] = useState<"qr" | "upload">("qr");
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [orderError, setOrderError] = useState<string | null>(null);
    const [accountPhone, setAccountPhone] = useState("");
    const [deliveryPhone, setDeliveryPhone] = useState("");
    const [isLoadingDeliveryPhone, setIsLoadingDeliveryPhone] = useState(false);
    const [receiptFileName, setReceiptFileName] = useState("");
    const [receiptExtraction, setReceiptExtraction] = useState<PaymentReceiptExtractionResult | null>(null);
    const [receiptExtractionError, setReceiptExtractionError] = useState<string | null>(null);
    const [isExtractingReceipt, setIsExtractingReceipt] = useState(false);

    const customQuoteTotal = customQuoteCheckout ? customQuoteCheckout.quotedTotal : 0;
    const hasCheckoutItems = cartItems.length > 0 || Boolean(customQuoteCheckout);
    const totalAmount = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0) + customQuoteTotal;
    const shippingFee = deliveryMode === "delivery" ? 50 : 0;
    const totalPayment = totalAmount + shippingFee;
    const selectedAddressLabel = selectedAddress?.address?.trim() || DEFAULT_CART_ADDRESS;
    const isUsingSavedAddress =
        Boolean(savedAddress?.address) &&
        savedAddress?.address === selectedAddress?.address &&
        savedAddress?.lat === selectedAddress?.lat &&
        savedAddress?.lng === selectedAddress?.lng;
    const hasSavedAddressOptions = savedAddressList.length > 0;

    useEffect(() => {
        if (!user?.id || !isOpen) return;

        const dataStorageKey = `${SAVED_PLACE_DATA_KEY_PREFIX}${user.id}`;
        const listStorageKey = `${SAVED_PLACE_LIST_KEY_PREFIX}${user.id}`;
        const legacyStorageKey = `saved_place_${user.id}`;
        const dataSaved = window.localStorage.getItem(dataStorageKey);
        const listSaved = window.localStorage.getItem(listStorageKey);
        const legacySaved = window.localStorage.getItem(legacyStorageKey);
        const parsedSavedAddress = parseStoredDeliveryAddress(dataSaved, legacySaved, DEFAULT_CART_ADDRESS);
        const parsedSavedAddressList = parseStoredDeliveryAddressList(listSaved, parsedSavedAddress, DEFAULT_CART_ADDRESS);

        const timeoutId = window.setTimeout(() => {
            setSavedAddress(parsedSavedAddress);
            setSavedAddressList(parsedSavedAddressList);
            setSelectedAddress((current) => {
                if (hasSavedDeliveryAddress(current, DEFAULT_CART_ADDRESS)) {
                    return current;
                }
                return parsedSavedAddress ?? parsedSavedAddressList[0]?.data ?? null;
            });
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [user?.id, isOpen]);

    const selectSavedAddress = (addressEntry: SavedDeliveryAddressEntry) => {
        setSelectedAddress(addressEntry.data);
        setSavedAddress(addressEntry.data);
        setOrderError(null);
        setShowAddressSelectorModal(false);

        if (!user?.id) return;

        window.localStorage.setItem(`saved_place_${user.id}`, addressEntry.data.address || DEFAULT_CART_ADDRESS);
        window.localStorage.setItem(
            `${SAVED_PLACE_DATA_KEY_PREFIX}${user.id}`,
            JSON.stringify(addressEntry.data)
        );
    };

    const saveNewAddressFromCart = (selection: DeliveryAddressData) => {
        if (!user?.id) {
            setSelectedAddress(selection);
            setShowMapModal(false);
            return;
        }

        const nextEntry = createSavedDeliveryAddressEntry(selection);
        const nextList = [...savedAddressList, nextEntry];

        setSavedAddress(selection);
        setSavedAddressList(nextList);
        setSelectedAddress(selection);
        setOrderError(null);
        setShowMapModal(false);

        window.localStorage.setItem(`saved_place_${user.id}`, selection.address || DEFAULT_CART_ADDRESS);
        window.localStorage.setItem(
            `${SAVED_PLACE_DATA_KEY_PREFIX}${user.id}`,
            JSON.stringify(selection)
        );
        window.localStorage.setItem(
            `${SAVED_PLACE_LIST_KEY_PREFIX}${user.id}`,
            JSON.stringify(nextList)
        );
    };

    const handleReceiptFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setReceiptFileName(file.name);
        setReceiptExtraction(null);
        setReceiptExtractionError(null);
        setOrderError(null);
        setIsExtractingReceipt(true);

        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    if (typeof reader.result === "string") {
                        resolve(reader.result);
                        return;
                    }
                    reject(new Error("Failed to read the receipt image."));
                };
                reader.onerror = () => reject(new Error("Failed to read the receipt image."));
                reader.readAsDataURL(file);
            });

            const response = await fetch("/api/payments/extract-receipt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider: walletProvider,
                    imageDataUrl: dataUrl,
                }),
            });

            const body = (await response.json()) as {
                error?: string;
                extraction?: PaymentReceiptExtractionResult;
            };

            if (!response.ok || !body.extraction) {
                throw new Error(body.error ?? "Failed to extract receipt details.");
            }

            setReceiptExtraction(body.extraction);
        } catch (error) {
            setReceiptExtractionError(error instanceof Error ? error.message : "Failed to extract receipt details.");
        } finally {
            setIsExtractingReceipt(false);
            event.target.value = "";
        }
    };

    const fetchProfile = useCallback(async () => {
        if (!user) return null;
        const supabase = createClient();
        const { data } = await supabase
            .from("profiles")
            .select("full_name, phone")
            .eq("id", user.id)
            .maybeSingle();
        return data;
    }, [user]);

    useEffect(() => {
        if (!user?.id || !isOpen) return;

        let active = true;

        const loadDeliveryPhone = async () => {
            setIsLoadingDeliveryPhone(true);
            const profile = await fetchProfile();
            if (!active) return;

            const resolvedPhone = profile?.phone?.trim() ?? "";
            setAccountPhone(resolvedPhone);
            setDeliveryPhone((current) => current.trim() || resolvedPhone);
            setIsLoadingDeliveryPhone(false);
        };

        void loadDeliveryPhone();

        return () => {
            active = false;
        };
    }, [fetchProfile, isOpen, user?.id]);

    useEffect(() => {
        setReceiptExtraction(null);
        setReceiptExtractionError(null);
        setReceiptFileName("");
    }, [walletProvider]);

    const submitOrder = async (method: "COD" | "GCash" | "Maya") => {
        if (!user) return;
        if (!hasCheckoutItems) return;
        if (deliveryMode === "delivery" && !hasSavedDeliveryAddress(selectedAddress, DEFAULT_CART_ADDRESS)) {
            setOrderError("Please select or pin your delivery address first.");
            return;
        }

        setOrderError(null);
        setIsPlacingOrder(true);

        try {
            const profile = await fetchProfile();
            const resolvedAccountPhone = profile?.phone?.trim() || accountPhone;
            const resolvedDeliveryPhone = deliveryPhone.trim() || resolvedAccountPhone || "";

            if (deliveryMode === "delivery" && !resolvedDeliveryPhone) {
                setOrderError("Please add a working delivery mobile number before placing the order.");
                setIsPlacingOrder(false);
                return;
            }

            if (method !== "COD" && !receiptExtraction) {
                setOrderError("Please upload your wallet receipt first so we can extract the payment details.");
                setIsPlacingOrder(false);
                return;
            }

            if (method !== "COD") {
                const walletReceipt = receiptExtraction;
                const normalizedReference = normalizePaymentReference(walletReceipt?.referenceNumber);

                if (!normalizedReference) {
                    setReceiptExtractionError("We could not verify the receipt reference number. Please upload a clearer receipt.");
                    setOrderError(null);
                    setIsPlacingOrder(false);
                    return;
                }

                if (!walletReceipt || walletReceipt.amount === null || walletReceipt.amount <= 0) {
                    setReceiptExtractionError("We could not verify the receipt amount. Please upload a clearer receipt.");
                    setOrderError(null);
                    setIsPlacingOrder(false);
                    return;
                }

                if (Math.abs(walletReceipt.amount - totalPayment) > 0.01) {
                    setReceiptExtractionError(`Receipt amount does not match your order total of PHP ${totalPayment.toFixed(2)}.`);
                    setOrderError(null);
                    setIsPlacingOrder(false);
                    return;
                }
            }

            await placeOrder({
                cartItems: cartItems.map((item) => ({
                    product_id: item.id,
                    quantity: item.quantity,
                    price: item.price,
                    name: item.name,
                })),
                customQuoteId: customQuoteCheckout?.id ?? null,
                deliveryMode: deliveryMode === "delivery" ? "Delivery" : "Pick-up",
                deliveryAddress: deliveryMode === "delivery" ? selectedAddress?.address ?? null : null,
                deliveryLat: deliveryMode === "delivery" ? selectedAddress?.lat ?? null : null,
                deliveryLng: deliveryMode === "delivery" ? selectedAddress?.lng ?? null : null,
                addressSource: deliveryMode === "delivery" ? selectedAddress?.source ?? "map" : null,
                regionCode: deliveryMode === "delivery" ? selectedAddress?.regionCode ?? null : null,
                regionName: deliveryMode === "delivery" ? selectedAddress?.regionName ?? null : null,
                provinceCode: deliveryMode === "delivery" ? selectedAddress?.provinceCode ?? null : null,
                provinceName: deliveryMode === "delivery" ? selectedAddress?.provinceName ?? null : null,
                cityMunicipalityCode: deliveryMode === "delivery" ? selectedAddress?.cityMunicipalityCode ?? null : null,
                cityMunicipalityName: deliveryMode === "delivery" ? selectedAddress?.cityMunicipalityName ?? null : null,
                barangayCode: deliveryMode === "delivery" ? selectedAddress?.barangayCode ?? null : null,
                barangayName: deliveryMode === "delivery" ? selectedAddress?.barangayName ?? null : null,
                streetAddress: deliveryMode === "delivery" ? selectedAddress?.streetAddress ?? null : null,
                landmark: deliveryMode === "delivery" ? selectedAddress?.landmark ?? null : null,
                completeAddress: deliveryMode === "delivery" ? selectedAddress?.completeAddress ?? selectedAddress?.address ?? null : null,
                paymentProofUrl: null,
                receiptExtraction: method !== "COD" ? receiptExtraction : null,
                paymentMethod: method,
                scheduledDate: null,
                customerName: profile?.full_name?.trim() || metadataName || user.email || "Customer",
                customerPhone: resolvedDeliveryPhone,
            });

            triggerSuccessState();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to place order";
            const isDuplicateReceipt = message.toLowerCase().includes("reference number has already been used");

            if (isDuplicateReceipt) {
                setReceiptExtractionError("This receipt reference was already used for another order. Please upload a different payment receipt.");
                setReceiptExtraction(null);
                setReceiptFileName("");
                setOrderError(null);
            } else {
                setOrderError(message);
            }
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const handlePlaceOrder = async () => {
        if (!user) return;
        setOrderError(null);

        if (selectedPayment === "online") {
            setShowPaymentModal(true);
            setPaymentStep("qr");
            setReceiptExtractionError(null);
            return;
        }

        await submitOrder("COD");
    };

    const triggerSuccessState = () => {
        setShowPaymentModal(false);
        setShowSuccess(true);
        setTimeout(() => {
            setShowSuccess(false);
            onClearCustomQuote?.();
            onPlaceOrder();
        }, 3000);
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        key="drawer"
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-emerald-50 flex items-center justify-between bg-white shrink-0">
                            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Your Cart</h2>
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={onClose}
                                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                            >
                                <X className="w-5 h-5" strokeWidth={1.5} />
                            </motion.button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 space-y-8">
                            {/* Cart Items */}
                            {!hasCheckoutItems ? (
                                <div className="text-center py-12">
                                    <div className="w-20 h-20 bg-emerald-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                                        <ShoppingBagIcon className="w-10 h-10 text-emerald-200" strokeWidth={1.5} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900">Your cart is empty</h3>
                                    <p className="text-slate-500 mt-1 text-sm">Add some delicious kakanin to get started!</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {customQuoteCheckout && (
                                        <div className="rounded-md border border-emerald-100 bg-emerald-50/70 p-4 shadow-sm">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Custom Quotation</p>
                                                    <h4 className="mt-1 text-sm font-bold text-slate-900">{customQuoteCheckout.title}</h4>
                                                    <p className="mt-1 text-sm text-slate-700">{customQuoteCheckout.itemDescription}</p>
                                                </div>
                                                <button
                                                    onClick={() => onClearCustomQuote?.()}
                                                    className="rounded-md border border-emerald-200 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                            <div className="mt-2 grid gap-1 text-xs text-slate-600">
                                                <p>Qty: <span className="font-semibold text-slate-900">{customQuoteCheckout.quantity}</span></p>
                                                <p>Unit: <span className="font-semibold text-slate-900">PHP {customQuoteCheckout.unitPrice.toFixed(2)}</span></p>
                                                <p>Total: <span className="font-bold text-emerald-700">PHP {customQuoteCheckout.quotedTotal.toFixed(2)}</span></p>
                                                {customQuoteCheckout.deliveryDate && <p>Target date: <span className="font-semibold text-slate-900">{customQuoteCheckout.deliveryDate}</span></p>}
                                            </div>
                                            {customQuoteCheckout.notes && <p className="mt-2 rounded-md bg-white p-2 text-xs text-slate-600">{customQuoteCheckout.notes}</p>}
                                        </div>
                                    )}
                                    {cartItems.map((item) => (
                                        <div key={item.id} className="flex gap-4 bg-white p-3 rounded-md border border-slate-100 shadow-sm">
                                            <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-50">
                                                <Image src={item.image} alt={item.name} fill className="object-cover" />
                                            </div>
                                            <div className="flex-1 flex flex-col justify-between py-1">
                                                <div>
                                                    <h4 className="font-semibold text-slate-900 leading-tight">{item.name}</h4>
                                                    <div className="text-emerald-700 font-bold text-sm mt-1">PHP {item.price * item.quantity}</div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => onUpdateQuantity(item.id, -1)}
                                                        className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 text-slate-600 transition-colors"
                                                    >
                                                        <Minus className="w-3 h-3" strokeWidth={2} />
                                                    </button>
                                                    <span className="font-semibold text-sm w-4 text-center">{item.quantity}</span>
                                                    <button
                                                        onClick={() => onUpdateQuantity(item.id, 1)}
                                                        className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 text-slate-600 transition-colors"
                                                    >
                                                        <Plus className="w-3 h-3" strokeWidth={2} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Checkout Form */}
                            {hasCheckoutItems && (
                                <div className="space-y-6 bg-white p-6 rounded-md border border-slate-100 shadow-sm">
                                    <h3 className="text-lg font-bold tracking-tight text-slate-900">Order Details</h3>

                                    <div className="flex bg-slate-100 p-1 rounded-md mb-2">
                                        <button
                                            onClick={() => setDeliveryMode("delivery")}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${deliveryMode === "delivery" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                                        >
                                            <Truck className="w-4 h-4" /> Delivery
                                        </button>
                                        <button
                                            onClick={() => setDeliveryMode("pickup")}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${deliveryMode === "pickup" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                                        >
                                            <Store className="w-4 h-4" /> Pick-up
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Date Picker (Simulated) */}
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Pickup/Delivery Date</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" strokeWidth={1.5} />
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value="Oct 24, 2024"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-md py-3 pl-12 pr-4 text-slate-900 font-medium cursor-pointer hover:bg-slate-100 transition-colors outline-none focus:border-emerald-500"
                                                />
                                            </div>
                                            <p className="text-xs text-amber-600 mt-1.5 ml-1 font-medium">*Requires 3 days advance notice</p>
                                        </div>

                                        {/* Location Pin */}
                                        {deliveryMode === "delivery" && (
                                            <div>
                                                <div className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Delivery Address</div>
                                                {hasSavedAddressOptions && (
                                                    <button
                                                        onClick={() => setShowAddressSelectorModal(true)}
                                                        className="mb-2 inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                                                    >
                                                        <MapPin className="h-3.5 w-3.5" />
                                                        Select saved address
                                                    </button>
                                                )}
                                                <div
                                                    onClick={() => setShowAddressSelectorModal(true)}
                                                    className="relative cursor-pointer rounded-md overflow-hidden bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
                                                >
                                                    {/* Shopee-style stripe */}
                                                    <div className="h-1 w-full" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #ef4444, #ef4444 10px, transparent 10px, transparent 20px, #3b82f6 20px, #3b82f6 30px, transparent 30px, transparent 40px)' }}></div>
                                                    <div className="p-4 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <MapPin className="w-5 h-5 text-emerald-600" strokeWidth={1.5} />
                                                            <div>
                                                                <p className="font-medium text-slate-700">{selectedAddressLabel}</p>
                                                                {isUsingSavedAddress && (
                                                                    <p className="mt-0.5 text-xs font-semibold text-emerald-700">Using your selected saved address</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-semibold text-slate-400">SELECT</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {deliveryMode === "delivery" && (
                                            <div className="space-y-3">
                                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                                    <div className="flex items-start gap-3">
                                                        <div className="mt-0.5 rounded-lg bg-emerald-100 p-2 text-emerald-700">
                                                            <Phone className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-800">Delivery Contact Number</p>
                                                            <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                                                {accountPhone
                                                                    ? `We will use your account mobile number ${accountPhone} for delivery updates. You can enter another phone number below if the rider should contact a different number.`
                                                                    : "Add a working mobile number below so the rider has a delivery contact for this order."}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Alternate Delivery Mobile Number</label>
                                                    <input
                                                        type="tel"
                                                        value={deliveryPhone}
                                                        onChange={(event) => setDeliveryPhone(event.target.value)}
                                                        placeholder={isLoadingDeliveryPhone ? "Loading mobile number..." : "e.g. 09171234567"}
                                                        className="w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 transition-colors outline-none focus:border-emerald-500"
                                                    />
                                                    <p className="mt-1.5 ml-1 text-xs text-slate-400">
                                                        Leave this as is to use the account phone number, or replace it for this delivery only.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Payment Method */}
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">Payment Method</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <motion.button
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => setSelectedPayment("cod")}
                                                    className={`flex items-center gap-3 p-3 rounded-md border transition-all ${selectedPayment === "cod"
                                                        ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500/20"
                                                        : "border-slate-200 hover:border-slate-300"
                                                        }`}
                                                >
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedPayment === "cod" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                                        <Banknote className="w-4 h-4" strokeWidth={1.5} />
                                                    </div>
                                                    <span className={`font-medium text-sm ${selectedPayment === "cod" ? "text-emerald-900" : "text-slate-700"}`}>Cash</span>
                                                </motion.button>

                                                <motion.button
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => setSelectedPayment("online")}
                                                    className={`flex items-center gap-3 p-3 rounded-md border transition-all ${selectedPayment === "online"
                                                        ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500/20"
                                                        : "border-slate-200 hover:border-slate-300"
                                                        }`}
                                                >
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedPayment === "online" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                                                        <CreditCard className="w-4 h-4" strokeWidth={1.5} />
                                                    </div>
                                                    <span className={`font-medium text-sm ${selectedPayment === "online" ? "text-emerald-900" : "text-slate-700"}`}>GCash / Maya</span>
                                                </motion.button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer with sticky CTA */}
                        {hasCheckoutItems && (
                            <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] shrink-0 z-10">
                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between items-center text-sm text-slate-500">
                                        <span>Products Subtotal</span>
                                        <span>PHP {(totalAmount - customQuoteTotal).toFixed(2)}</span>
                                    </div>
                                    {customQuoteCheckout && (
                                        <div className="flex justify-between items-center text-sm text-slate-500">
                                            <span>Custom Quote</span>
                                            <span>PHP {customQuoteTotal.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {deliveryMode === "delivery" && (
                                        <div className="flex justify-between items-center text-sm text-slate-500">
                                            <span>Shipping Fee</span>
                                            <span>PHP {shippingFee.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center font-bold text-lg text-slate-900 border-t border-slate-100 pt-3 mt-2">
                                        <span>Total Payment</span>
                                        <span className="text-emerald-700">PHP {totalPayment.toFixed(2)}</span>
                                    </div>
                                </div>
                                {orderError && (
                                    <div className="mb-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                                        {orderError}
                                    </div>
                                )}
                                <motion.button
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => void handlePlaceOrder()}
                                    disabled={isPlacingOrder || !hasCheckoutItems}
                                    className="w-full bg-emerald-700 text-white font-semibold rounded-lg py-4 shadow-lg shadow-emerald-700/20 hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 text-lg disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isPlacingOrder ? "Placing Order..." : `Place Order - PHP ${totalPayment.toFixed(2)}`}
                                </motion.button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showAddressSelectorModal && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAddressSelectorModal(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative z-10 flex w-full max-w-lg flex-col rounded-md bg-white p-6 shadow-2xl"
                        >
                            <h3 className="mb-4 text-xl font-bold tracking-tight text-slate-900">Select Delivery Address</h3>
                            <div className="max-h-[60vh] space-y-3 overflow-y-auto">
                                {savedAddressList.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                                        No saved addresses yet. Add one first from My Addresses.
                                    </div>
                                ) : (
                                    savedAddressList.map((entry) => {
                                        const isSelected =
                                            selectedAddress?.address === entry.data.address &&
                                            selectedAddress?.completeAddress === entry.data.completeAddress &&
                                            selectedAddress?.lat === entry.data.lat &&
                                            selectedAddress?.lng === entry.data.lng;

                                        return (
                                            <button
                                                key={entry.id}
                                                onClick={() => selectSavedAddress(entry)}
                                                className={`w-full rounded-lg border px-4 py-4 text-left transition-colors ${isSelected
                                                    ? "border-emerald-300 bg-emerald-50"
                                                    : "border-slate-200 bg-white hover:bg-slate-50"
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-3">
                                                        <div className={`rounded-lg p-2 ${isSelected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                                            <MapPin className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-800">
                                                                {entry.data.address}
                                                            </p>
                                                            {entry.data.source === "manual" && (
                                                                <p className="mt-1 text-xs font-medium text-slate-400">Manual address</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className={`text-xs font-semibold ${isSelected ? "text-emerald-700" : "text-slate-400"}`}>
                                                        {isSelected ? "Selected" : "Use"}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        setShowAddressSelectorModal(false);
                                        setShowMapModal(true);
                                    }}
                                    className="flex-1 rounded-md border border-emerald-600 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                                >
                                    Add Another Address
                                </motion.button>
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setShowAddressSelectorModal(false)}
                                    className="flex-1 rounded-md py-3 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50"
                                >
                                    Close
                                </motion.button>
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
                            className="relative z-10 flex w-full max-w-lg flex-col items-center rounded-md bg-white p-6 shadow-2xl"
                        >
                            <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-4 w-full text-left">Pin Location</h3>
                            <div className="relative mb-6 h-[min(72vh,40rem)] w-full flex-shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-emerald-50">
                                <LocationPicker
                                    onLocationSelect={saveNewAddressFromCart}
                                    initialValue={selectedAddress ?? savedAddress}
                                />
                            </div>
                            <motion.button
                                whileTap={{ scale: 0.96 }}
                                onClick={() => setShowMapModal(false)}
                                className="w-full text-slate-500 font-semibold rounded-md py-3 hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </motion.button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Online Payment Modal Flow */}
            <AnimatePresence>
                {showPaymentModal && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowPaymentModal(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-sm bg-white rounded-md p-6 shadow-2xl z-10 flex flex-col items-center"
                        >
                            <div className="absolute top-4 right-4">
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {paymentStep === "qr" ? (
                                <>
                                    <div className="w-16 h-16 bg-emerald-50 rounded-lg flex items-center justify-center mb-4 mt-2">
                                        <QrCode className="w-8 h-8 text-emerald-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-1 text-center">Scan to Pay</h3>
                                    <p className="text-slate-500 text-sm mb-4 text-center">
                                        Send exactly <strong className="text-emerald-700 font-bold">PHP {totalPayment}</strong> to proceed.
                                    </p>
                                    <div className="mb-6 grid w-full grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
                                        <button
                                            onClick={() => setWalletProvider("GCash")}
                                            className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${walletProvider === "GCash" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                                        >
                                            Pay via GCash
                                        </button>
                                        <button
                                            onClick={() => setWalletProvider("Maya")}
                                            className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${walletProvider === "Maya" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                                        >
                                            Pay via Maya
                                        </button>
                                    </div>

                                    <div className="w-48 h-48 bg-slate-100 rounded-lg mb-6 flex items-center justify-center border-2 border-dashed border-slate-300 relative overflow-hidden">
                                        {/* Placeholder QR Image - swap with real one later */}
                                        <Image src="/placeholder.png" alt="QR Code" fill className="object-cover opacity-30 mix-blend-multiply" />
                                        <QrCode className="w-12 h-12 text-slate-400 absolute" />
                                    </div>

                                    <div className="w-full bg-slate-50 rounded-md p-4 mb-6 border border-slate-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Name</span>
                                            <span className="text-sm font-bold text-slate-900">Ate Ai</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Number</span>
                                            <span className="text-sm font-bold text-slate-900 tracking-tight font-mono">+63 912 345 6789</span>
                                        </div>
                                    </div>
                                    <motion.button
                                        whileTap={{ scale: 0.96 }}
                                        onClick={() => setPaymentStep("upload")}
                                        className="w-full bg-emerald-700 text-white font-bold rounded-md py-4 shadow-lg shadow-emerald-700/20 hover:bg-emerald-800 transition-colors"
                                    >
                                        I have paid, Next Step
                                    </motion.button>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center mb-4 mt-2">
                                        <Upload className="w-8 h-8 text-blue-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-1 text-center">Upload Receipt</h3>
                                    <p className="text-slate-500 text-sm mb-6 text-center">Please attach a screenshot of your successful transaction. Gemini will extract the payment details for review.</p>

                                    <label className="w-full h-32 bg-slate-50 border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 transition-colors rounded-lg mb-6 flex flex-col items-center justify-center cursor-pointer group">
                                        <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-500 mb-2 transition-colors" strokeWidth={2} />
                                        <span className="text-sm font-medium text-slate-600 group-hover:text-emerald-700 transition-colors">
                                            {isExtractingReceipt ? "Extracting payment details..." : receiptFileName || "Tap to select photo"}
                                        </span>
                                        <input type="file" className="hidden" accept="image/*" onChange={(event) => void handleReceiptFileChange(event)} />
                                    </label>

                                    {receiptExtractionError && (
                                        <div className="mb-4 w-full rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                                            {receiptExtractionError}
                                        </div>
                                    )}

                                    {orderError && (
                                        <div className="mb-4 w-full rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                                            {orderError}
                                        </div>
                                    )}

                                    {receiptExtraction && (
                                        <div className="mb-4 w-full rounded-lg border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-slate-700">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Extracted Payment Details</p>
                                            <div className="mt-2 space-y-1">
                                                <p>Reference: <span className="font-semibold text-slate-900">{receiptExtraction.referenceNumber ?? "Not detected"}</span></p>
                                                <p>Name: <span className="font-semibold text-slate-900">{receiptExtraction.recipientName ?? "Not detected"}</span></p>
                                                <p>Mobile: <span className="font-semibold text-slate-900">{receiptExtraction.recipientMobileNumber ?? "Not detected"}</span></p>
                                                <p>Amount: <span className="font-semibold text-slate-900">{receiptExtraction.amount !== null ? `PHP ${receiptExtraction.amount.toFixed(2)}` : "Not detected"}</span></p>
                                                <p>Date: <span className="font-semibold text-slate-900">{receiptExtraction.transactionDateText ?? receiptExtraction.transactionTimestamp ?? "Not detected"}</span></p>
                                            </div>
                                            {receiptExtraction.needsManualReview && (
                                                <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                                                    Some fields need manual review. You can still submit, but the extracted receipt details should be checked by admin.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <motion.button
                                        whileTap={{ scale: 0.96 }}
                                        onClick={() => void submitOrder(walletProvider)}
                                        disabled={isPlacingOrder || isExtractingReceipt}
                                        className="w-full bg-emerald-700 text-white font-bold rounded-md py-4 shadow-lg shadow-emerald-700/20 hover:bg-emerald-800 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isExtractingReceipt ? "Extracting..." : isPlacingOrder ? "Submitting..." : "Submit Order"}
                                    </motion.button>
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Success Overlay */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-emerald-900/40 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white p-10 rounded-md shadow-2xl flex flex-col items-center max-w-sm mx-4 text-center"
                        >
                            <div className="w-24 h-24 bg-emerald-100 rounded-lg flex items-center justify-center mb-6">
                                <CheckCircle2 className="w-12 h-12 text-emerald-600" strokeWidth={2} />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">Order Placed!</h2>
                            <p className="text-slate-500 text-lg leading-relaxed">
                                Thank you! Ate Ai is now preparing your delicious kakanin.
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

// Simple fallback icon
function ShoppingBagIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={props.strokeWidth || "2"}
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <path d="M3 6h18" />
            <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
    );
}

