import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { extractReceiptWithGrok } from "@/lib/payments/grokReceiptExtraction";
import type { PaymentReceiptProvider } from "@/lib/payments/receiptTypes";

type ExtractReceiptPayload = {
  provider?: PaymentReceiptProvider;
  imageDataUrl?: string | null;
  imageUrl?: string | null;
  orderId?: string | null;
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

  let body: ExtractReceiptPayload;
  try {
    body = (await req.json()) as ExtractReceiptPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const provider = body.provider;
  const imageSource = body.imageDataUrl?.trim() || body.imageUrl?.trim() || "";
  const orderId = body.orderId?.trim() || null;

  if (!provider || !["GCash", "Maya"].includes(provider)) {
    return NextResponse.json({ error: "Unsupported payment provider" }, { status: 400 });
  }

  if (!imageSource) {
    return NextResponse.json({ error: "Receipt image is required" }, { status: 400 });
  }

  if (orderId) {
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, user_id")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    if (!order || order.user_id !== user.id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
  }

  try {
    const result = await extractReceiptWithGrok({
      provider,
      imageUrl: imageSource,
    });

    if (orderId) {
      const { error: saveError } = await supabase
        .from("payment_receipt_extractions")
        .upsert(
          {
            order_id: orderId,
            provider,
            source_image_url: body.imageUrl?.trim() || null,
            extraction_status: result.extraction.needsManualReview ? "needs_review" : "completed",
            reference_number: result.extraction.referenceNumber,
            recipient_name: result.extraction.recipientName,
            recipient_mobile_number: result.extraction.recipientMobileNumber,
            amount: result.extraction.amount,
            currency: result.extraction.currency,
            transaction_date_text: result.extraction.transactionDateText,
            transaction_timestamp: result.extraction.transactionTimestamp,
            extracted_model: result.model,
            raw_response: result.rawResponse,
            extraction_error: null,
          },
          { onConflict: "order_id" }
        );

      if (saveError) {
        return NextResponse.json({ error: saveError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      extraction: result.extraction,
      model: result.model,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Receipt extraction failed",
      },
      { status: 500 }
    );
  }
}
