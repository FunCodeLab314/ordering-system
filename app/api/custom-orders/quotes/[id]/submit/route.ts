import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

type Params = { params: Promise<{ id: string }> };

type SubmitPayload = {
  title?: string;
  itemDescription?: string;
  quantity?: number;
  deliveryDate?: string | null;
  notes?: string | null;
};

type QuoteWithThreadRow = {
  id: string;
  thread_id: string;
  quote_phase: "blank_from_admin" | "filled_by_customer" | "priced_by_admin";
  custom_order_threads: {
    customer_user_id: string;
  } | null;
};

export async function POST(req: Request, { params }: Params) {
  try {
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {
            // no-op
          },
        },
      }
    );

    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as SubmitPayload;
    const itemDescription = body.itemDescription?.trim();
    const quantity = Number(body.quantity);

    if (!itemDescription || !Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Item description and quantity are required" }, { status: 400 });
    }

    const { id } = await params;
    const supabase = createServiceClient();

    const { data: quote, error: quoteError } = await supabase
      .from("custom_order_quotes")
      .select("id, thread_id, quote_phase, custom_order_threads!inner(customer_user_id)")
      .eq("id", id)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: quoteError?.message ?? "Quotation not found" }, { status: 404 });
    }

    const typedQuote = quote as unknown as QuoteWithThreadRow;
    if (typedQuote.custom_order_threads?.customer_user_id !== user.id) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    if (typedQuote.quote_phase === "priced_by_admin") {
      return NextResponse.json({ error: "This quotation is already priced by admin" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const { data: updatedQuote, error: updateError } = await supabase
      .from("custom_order_quotes")
      .update({
        title: body.title?.trim() || "Custom Order Quote",
        item_description: itemDescription,
        quantity: Math.floor(quantity),
        delivery_date: body.deliveryDate || null,
        notes: body.notes?.trim() || null,
        quote_phase: "filled_by_customer",
        customer_submitted_at: nowIso,
        unit_price: null,
        status: "Sent",
        updated_at: nowIso,
      })
      .eq("id", typedQuote.id)
      .select("id, title, item_description, quantity, unit_price, quoted_total, delivery_date, notes, status, quote_phase, customer_submitted_at, created_at")
      .single();

    if (updateError || !updatedQuote) {
      return NextResponse.json({ error: updateError?.message ?? "Failed to submit quotation details" }, { status: 500 });
    }

    const { error: threadError } = await supabase
      .from("custom_order_threads")
      .update({
        status: "Pending Review",
        updated_at: nowIso,
      })
      .eq("id", typedQuote.thread_id)
      .eq("customer_user_id", user.id);

    if (threadError) {
      return NextResponse.json({ error: threadError.message }, { status: 500 });
    }

    const { error: messageError } = await supabase.from("custom_order_messages").insert({
      thread_id: typedQuote.thread_id,
      sender_role: "customer",
      sender_user_id: user.id,
      body: "I filled out the quotation card details.",
    });

    if (messageError) {
      return NextResponse.json({ error: messageError.message }, { status: 500 });
    }

    return NextResponse.json({
      quote: {
        id: updatedQuote.id,
        title: updatedQuote.title,
        itemDescription: updatedQuote.item_description,
        quantity: Number(updatedQuote.quantity ?? 0),
        unitPrice: Number(updatedQuote.unit_price ?? 0),
        quotedTotal: Number(updatedQuote.quoted_total ?? 0),
        deliveryDate: updatedQuote.delivery_date,
        notes: updatedQuote.notes,
        status: updatedQuote.status,
        quotePhase: updatedQuote.quote_phase,
        customerSubmittedAt: updatedQuote.customer_submitted_at,
        createdAt: updatedQuote.created_at,
      },
    });
  } catch (error) {
    console.error("custom quote submit failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error while submitting quotation details" },
      { status: 500 }
    );
  }
}
