export type PlaceOrderCartItem = {
  product_id: string;
  quantity: number;
  price: number;
  name: string;
};

export type PlaceOrderPayload = {
  cartItems: PlaceOrderCartItem[];
  deliveryMode: "Delivery" | "Pick-up";
  deliveryAddress: string | null;
  deliveryLat: number | null;
  deliveryLng: number | null;
  paymentMethod: "COD" | "GCash" | "Maya";
  scheduledDate: string | null;
  customerName: string;
  customerPhone: string;
};

export type PlaceOrderResponse = {
  success: boolean;
  orderId: string;
  orderNumber: string;
};

export async function placeOrder(payload: PlaceOrderPayload) {
  const response = await fetch("/api/orders/place", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = (await response.json()) as PlaceOrderResponse & { error?: string };

  if (!response.ok) {
    throw new Error(body.error ?? "Failed to place order");
  }

  return body;
}
