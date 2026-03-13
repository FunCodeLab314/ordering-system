import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createDeliveryAddressData } from "@/lib/deliveryAddress";
import { normalizePaymentReference, type PaymentReceiptExtractionResult } from "@/lib/payments/receiptTypes";
import { createServiceClient } from "@/lib/supabase/service";

type PlaceOrderItemInput = {
  product_id: string;
  quantity: number;
  price?: number;
  name?: string;
};

type PlaceOrderPayload = {
  cartItems: PlaceOrderItemInput[];
  customQuoteId?: string | null;
  deliveryMode: "Delivery" | "Pick-up";
  deliveryAddress?: string | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  addressSource?: "map" | "manual" | null;
  regionCode?: string | null;
  regionName?: string | null;
  provinceCode?: string | null;
  provinceName?: string | null;
  cityMunicipalityCode?: string | null;
  cityMunicipalityName?: string | null;
  barangayCode?: string | null;
  barangayName?: string | null;
  streetAddress?: string | null;
  landmark?: string | null;
  completeAddress?: string | null;
  paymentProofUrl?: string | null;
  receiptExtraction?: PaymentReceiptExtractionResult | null;
  paymentMethod: "COD" | "GCash" | "Maya";
  scheduledDate?: string | null;
  customerName: string;
  customerPhone?: string;
};

type QuoteRow = {
  id: string;
  title: string;
  item_description: string;
  quantity: number;
  unit_price: number | string | null;
  quoted_total: number | string;
  status: "Sent" | "Accepted" | "Declined" | "Superseded";
  quote_phase: "blank_from_admin" | "filled_by_customer" | "priced_by_admin";
};

type OrderItemPayload = {
  order_id: string;
  product_id: string | null;
  name: string;
  quantity: number;
  price: number;
};

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {
          // No cookie mutations from this route.
        },
      },
    }
  );
  const serviceSupabase = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PlaceOrderPayload;
  try {
    body = (await req.json()) as PlaceOrderPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const cartItems = Array.isArray(body.cartItems) ? body.cartItems : [];
  const customQuoteId = body.customQuoteId?.trim() || null;
  const deliveryMode = body.deliveryMode;
  const paymentMethod = body.paymentMethod;

  if (cartItems.length === 0 && !customQuoteId) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  if (!["Delivery", "Pick-up"].includes(deliveryMode)) {
    return NextResponse.json({ error: "Invalid delivery mode" }, { status: 400 });
  }

  if (!["COD", "GCash", "Maya"].includes(paymentMethod)) {
    return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
  }

  const normalizedAddress =
    deliveryMode === "Delivery"
      ? createDeliveryAddressData({
          address: body.deliveryAddress,
          completeAddress: body.completeAddress,
          lat: body.deliveryLat,
          lng: body.deliveryLng,
          source: body.addressSource === "manual" ? "manual" : "map",
          regionCode: body.regionCode,
          regionName: body.regionName,
          provinceCode: body.provinceCode,
          provinceName: body.provinceName,
          cityMunicipalityCode: body.cityMunicipalityCode,
          cityMunicipalityName: body.cityMunicipalityName,
          barangayCode: body.barangayCode,
          barangayName: body.barangayName,
          streetAddress: body.streetAddress,
          landmark: body.landmark,
        })
      : null;

  if (deliveryMode === "Delivery" && !normalizedAddress?.address.trim()) {
    return NextResponse.json({ error: "Delivery address is required" }, { status: 400 });
  }

  const orderItemsForInsert: Omit<OrderItemPayload, "order_id">[] = [];

  if (cartItems.length > 0) {
    const productIds = [...new Set(cartItems.map((item) => item.product_id).filter(Boolean))];
    if (productIds.length === 0) {
      return NextResponse.json({ error: "No valid products in cart" }, { status: 400 });
    }

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, price")
      .in("id", productIds);

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 500 });
    }

    const productById = new Map(
      (products ?? []).map((product) => [
        product.id,
        {
          name: product.name,
          price: Number(product.price ?? 0),
        },
      ])
    );

    const sanitizedItems = cartItems
      .map((item) => {
        const quantity = Number(item.quantity);
        const product = productById.get(item.product_id);
        if (!product || !Number.isFinite(quantity) || quantity <= 0) {
          return null;
        }

        return {
          product_id: item.product_id,
          quantity: Math.floor(quantity),
          name: product.name,
          price: product.price,
        };
      })
      .filter((item): item is { product_id: string; quantity: number; name: string; price: number } => item !== null);

    for (const item of sanitizedItems) {
      orderItemsForInsert.push({
        product_id: item.product_id,
        quantity: item.quantity,
        name: item.name,
        price: item.price,
      });
    }
  }

  if (customQuoteId) {
    const { data: quote, error: quoteError } = await supabase
      .from("custom_order_quotes")
      .select("id, title, item_description, quantity, unit_price, quoted_total, status, quote_phase")
      .eq("id", customQuoteId)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: quoteError?.message ?? "Quotation not found" }, { status: 400 });
    }

    const typedQuote = quote as QuoteRow;
    if (!["Sent", "Accepted"].includes(typedQuote.status)) {
      return NextResponse.json({ error: "Quotation is no longer valid for checkout" }, { status: 400 });
    }
    if (typedQuote.quote_phase !== "priced_by_admin") {
      return NextResponse.json({ error: "Quotation is not priced by admin yet" }, { status: 400 });
    }

    const quantity = Math.max(1, Math.floor(Number(typedQuote.quantity ?? 1)));
    const unitPrice = Number(typedQuote.unit_price);

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return NextResponse.json({ error: "Invalid quotation amount" }, { status: 400 });
    }

    orderItemsForInsert.push({
      product_id: null,
      quantity,
      name: `${typedQuote.title} - ${typedQuote.item_description}`,
      price: unitPrice,
    });
  }

  if (orderItemsForInsert.length === 0) {
    return NextResponse.json({ error: "No valid order items" }, { status: 400 });
  }

  const subtotal = orderItemsForInsert.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = deliveryMode === "Delivery" ? 50 : 0;
  const isWalletPayment = paymentMethod === "GCash" || paymentMethod === "Maya";
  // Match current schema enum values: Pending | Awaiting Verification | Verified | Rejected
  const paymentStatus = isWalletPayment ? "Awaiting Verification" : "Pending";
  const orderStatus = "Pending";

  const scheduledDate =
    body.scheduledDate && !Number.isNaN(Date.parse(body.scheduledDate))
      ? new Date(body.scheduledDate).toISOString().slice(0, 10)
      : null;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      customer_name: body.customerName?.trim() || user.email || "Customer",
      customer_phone: body.customerPhone?.trim() || "",
      delivery_mode: deliveryMode,
      delivery_address: deliveryMode === "Delivery" ? normalizedAddress?.address ?? null : null,
      delivery_lat: deliveryMode === "Delivery" ? normalizedAddress?.lat ?? null : null,
      delivery_lng: deliveryMode === "Delivery" ? normalizedAddress?.lng ?? null : null,
      region_code: deliveryMode === "Delivery" ? normalizedAddress?.regionCode ?? null : null,
      region_name: deliveryMode === "Delivery" ? normalizedAddress?.regionName ?? null : null,
      province_code: deliveryMode === "Delivery" ? normalizedAddress?.provinceCode ?? null : null,
      province_name: deliveryMode === "Delivery" ? normalizedAddress?.provinceName ?? null : null,
      city_municipality_code: deliveryMode === "Delivery" ? normalizedAddress?.cityMunicipalityCode ?? null : null,
      city_municipality_name: deliveryMode === "Delivery" ? normalizedAddress?.cityMunicipalityName ?? null : null,
      barangay_code: deliveryMode === "Delivery" ? normalizedAddress?.barangayCode ?? null : null,
      barangay_name: deliveryMode === "Delivery" ? normalizedAddress?.barangayName ?? null : null,
      street_address: deliveryMode === "Delivery" ? normalizedAddress?.streetAddress ?? null : null,
      landmark: deliveryMode === "Delivery" ? normalizedAddress?.landmark ?? null : null,
      complete_address: deliveryMode === "Delivery" ? normalizedAddress?.completeAddress ?? null : null,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      payment_proof_url: body.paymentProofUrl?.trim() || null,
      status: orderStatus,
      subtotal,
      delivery_fee: deliveryFee,
      scheduled_date: scheduledDate,
    })
    .select("id, order_number")
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: orderError?.message ?? "Failed to create order" }, { status: 500 });
  }

  const orderItemsPayload: OrderItemPayload[] = orderItemsForInsert.map((item) => ({
    order_id: order.id,
    product_id: item.product_id,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
  }));

  let receiptExtractionWarning: string | null = null;

  if (body.receiptExtraction && (paymentMethod === "GCash" || paymentMethod === "Maya")) {
    const extraction = body.receiptExtraction;
    const extractionStatus = extraction.needsManualReview ? "needs_review" : "completed";
    const normalizedReference = normalizePaymentReference(extraction.referenceNumber);

    const { error: extractionError } = await serviceSupabase.from("payment_receipt_extractions").upsert(
      {
        order_id: order.id,
        provider: paymentMethod,
        source_image_url: body.paymentProofUrl?.trim() || null,
        extraction_status: extractionStatus,
        reference_number: extraction.referenceNumber,
        recipient_name: extraction.recipientName,
        recipient_mobile_number: extraction.recipientMobileNumber,
        amount: extraction.amount,
        currency: extraction.currency,
        transaction_date_text: extraction.transactionDateText,
        transaction_timestamp: extraction.transactionTimestamp,
        extracted_model: null,
        raw_response: extraction,
        extraction_error: null,
      },
      { onConflict: "order_id" }
    );

    if (extractionError) {
      if (extractionError.code === "23505" && normalizedReference) {
        await serviceSupabase.from("orders").delete().eq("id", order.id);
        return NextResponse.json(
          { error: "This payment reference number has already been used in another order." },
          { status: 409 }
        );
      }

      receiptExtractionWarning = `Receipt extraction was not saved: ${extractionError.message}`;
      console.error("Failed to save receipt extraction for order", {
        orderId: order.id,
        error: extractionError.message,
      });
    }
  }

  const { error: itemsError } = await supabase.from("order_items").insert(orderItemsPayload);
  if (itemsError) {
    await supabase.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: "Failed to save order items" }, { status: 500 });
  }

  const { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (cart?.id) {
    await supabase.from("cart_items").delete().eq("cart_id", cart.id);
  }

  return NextResponse.json({
    success: true,
    orderId: order.id,
    orderNumber: order.order_number,
    receiptExtractionWarning,
  });
}

