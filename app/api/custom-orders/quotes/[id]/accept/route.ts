import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

type Params = { params: Promise<{ id: string }> };

type QuoteWithThreadRow = {
  id: string;
  thread_id: string;
  status: "Sent" | "Accepted" | "Declined" | "Superseded";
  quote_phase: "blank_from_admin" | "filled_by_customer" | "priced_by_admin";
  unit_price: number | null;
  custom_order_threads: {
    customer_user_id: string;
  } | null;
};

export async function POST(_req: Request, { params }: Params) {
  try {
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {
            // no-op in route handler
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

    const { id } = await params;
    const supabase = createServiceClient();

    const { data: quote, error: quoteError } = await supabase
      .from("custom_order_quotes")
      .select("id, thread_id, status, quote_phase, unit_price, custom_order_threads!inner(customer_user_id)")
      .eq("id", id)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: quoteError?.message ?? "Quotation not found" }, { status: 404 });
    }

    const typedQuote = quote as unknown as QuoteWithThreadRow;
    if (typedQuote.custom_order_threads?.customer_user_id !== user.id) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    if (typedQuote.status === "Declined" || typedQuote.status === "Superseded") {
      return NextResponse.json({ error: "This quotation is no longer available" }, { status: 400 });
    }

    if (typedQuote.quote_phase !== "priced_by_admin" || typedQuote.unit_price === null) {
      return NextResponse.json({ error: "Quotation is not priced yet" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    const { error: selectedQuoteError } = await supabase
      .from("custom_order_quotes")
      .update({
        status: "Accepted",
        accepted_at: nowIso,
      })
      .eq("id", typedQuote.id);

    if (selectedQuoteError) {
      return NextResponse.json({ error: selectedQuoteError.message }, { status: 500 });
    }

    const { error: supersedeError } = await supabase
      .from("custom_order_quotes")
      .update({ status: "Superseded" })
      .eq("thread_id", typedQuote.thread_id)
      .neq("id", typedQuote.id)
      .in("status", ["Sent", "Accepted"]);

    if (supersedeError) {
      return NextResponse.json({ error: supersedeError.message }, { status: 500 });
    }

    const { error: threadError } = await supabase
      .from("custom_order_threads")
      .update({
        status: "Confirmed",
        accepted_quote_id: typedQuote.id,
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
      body: "I accept this quotation. I will proceed to checkout.",
    });

    if (messageError) {
      return NextResponse.json({ error: messageError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("custom quote accept failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error while accepting quotation" },
      { status: 500 }
    );
  }
}

