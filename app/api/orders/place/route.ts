import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

type PlaceOrderItemInput = {
  product_id: string;
  quantity: number;
  price?: number;
  name?: string;
};

type PlaceOrderPayload = {
  cartItems: PlaceOrderItemInput[];
  deliveryMode: "Delivery" | "Pick-up";
  deliveryAddress?: string | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  paymentMethod: "COD" | "GCash" | "Maya";
  scheduledDate?: string | null;
  customerName: string;
  customerPhone?: string;
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
  const deliveryMode = body.deliveryMode;
  const paymentMethod = body.paymentMethod;

  if (cartItems.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  if (!["Delivery", "Pick-up"].includes(deliveryMode)) {
    return NextResponse.json({ error: "Invalid delivery mode" }, { status: 400 });
  }

  if (!["COD", "GCash", "Maya"].includes(paymentMethod)) {
    return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
  }

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

  if (sanitizedItems.length === 0) {
    return NextResponse.json({ error: "No valid order items" }, { status: 400 });
  }

  const subtotal = sanitizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = deliveryMode === "Delivery" ? 50 : 0;
  const isWalletPayment = paymentMethod === "GCash" || paymentMethod === "Maya";
  const paymentStatus = isWalletPayment ? "Paid" : "Pending";
  const orderStatus = isWalletPayment ? "Preparing" : "Pending";

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
      delivery_address: deliveryMode === "Delivery" ? body.deliveryAddress?.trim() || null : null,
      delivery_lat: deliveryMode === "Delivery" ? body.deliveryLat ?? null : null,
      delivery_lng: deliveryMode === "Delivery" ? body.deliveryLng ?? null : null,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
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

  const orderItemsPayload = sanitizedItems.map((item) => ({
    order_id: order.id,
    product_id: item.product_id,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
  }));

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
  });
}
