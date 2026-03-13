import "server-only";

import type { PaymentReceiptExtractionResult, PaymentReceiptProvider } from "@/lib/payments/receiptTypes";

type GrokReceiptExtractionRequest = {
  provider: PaymentReceiptProvider;
  imageUrl: string;
};

type XaiChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  model?: string;
};

type ReceiptSchemaPayload = {
  provider: PaymentReceiptProvider;
  reference_number: string | null;
  recipient_name: string | null;
  recipient_mobile_number: string | null;
  amount: number | null;
  currency: string | null;
  transaction_date_text: string | null;
  transaction_timestamp: string | null;
  needs_manual_review: boolean;
};

const DEFAULT_XAI_MODEL = "grok-3";

function getXaiApiKey() {
  return (
    process.env.XAI_API_KEY?.trim() ||
    process.env.GROK_API_KEY?.trim() ||
    process.env.NGROK_API?.trim() ||
    process.env.NGROK_API_KEY?.trim() ||
    ""
  );
}

function safeJsonParse<T>(value: string) {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeTimestamp(value: unknown) {
  const textValue = normalizeString(value);
  if (!textValue) return null;

  const parsed = new Date(textValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function buildReceiptSchema() {
  return {
    name: "wallet_receipt_extraction",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        provider: {
          type: "string",
          enum: ["GCash", "Maya"],
        },
        reference_number: {
          anyOf: [{ type: "string" }, { type: "null" }],
        },
        recipient_name: {
          anyOf: [{ type: "string" }, { type: "null" }],
        },
        recipient_mobile_number: {
          anyOf: [{ type: "string" }, { type: "null" }],
        },
        amount: {
          anyOf: [{ type: "number" }, { type: "null" }],
        },
        currency: {
          anyOf: [{ type: "string" }, { type: "null" }],
        },
        transaction_date_text: {
          anyOf: [{ type: "string" }, { type: "null" }],
        },
        transaction_timestamp: {
          anyOf: [{ type: "string" }, { type: "null" }],
        },
        needs_manual_review: {
          type: "boolean",
        },
      },
      required: [
        "provider",
        "reference_number",
        "recipient_name",
        "recipient_mobile_number",
        "amount",
        "currency",
        "transaction_date_text",
        "transaction_timestamp",
        "needs_manual_review",
      ],
    },
  };
}

export async function extractReceiptWithGrok({
  provider,
  imageUrl,
}: GrokReceiptExtractionRequest): Promise<{
  extraction: PaymentReceiptExtractionResult;
  rawResponse: unknown;
  model: string | null;
}> {
  const apiKey = getXaiApiKey();
  if (!apiKey) {
    throw new Error("Missing xAI API key. Recommended env var: XAI_API_KEY. Supported aliases: GROK_API_KEY, NGROK_API, NGROK_API_KEY.");
  }

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.XAI_RECEIPT_MODEL?.trim() || DEFAULT_XAI_MODEL,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You extract fields from Philippine wallet payment receipts. Return only the structured fields requested. If a field cannot be read reliably, return null and set needs_manual_review to true.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                `Extract the payment details from this ${provider} receipt screenshot.`,
                "Return the recipient name, recipient mobile number, reference number, amount, currency, and transaction date/time.",
                "Focus only on the receipt card and ignore ads, game screenshots, or unrelated UI below the receipt.",
                "If the image is partially obscured or any value is uncertain, use null for that field and set needs_manual_review to true.",
              ].join(" "),
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: buildReceiptSchema(),
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Grok receipt extraction failed: ${errorText || response.statusText}`);
  }

  const body = (await response.json()) as XaiChatCompletionResponse;
  const content = body.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Grok receipt extraction returned an empty response.");
  }

  const parsed = safeJsonParse<ReceiptSchemaPayload>(content);
  if (!parsed) {
    throw new Error("Grok receipt extraction returned invalid JSON.");
  }

  const extraction: PaymentReceiptExtractionResult = {
    provider,
    referenceNumber: normalizeString(parsed.reference_number),
    recipientName: normalizeString(parsed.recipient_name),
    recipientMobileNumber: normalizeString(parsed.recipient_mobile_number),
    amount: normalizeNumber(parsed.amount),
    currency: normalizeString(parsed.currency) ?? "PHP",
    transactionDateText: normalizeString(parsed.transaction_date_text),
    transactionTimestamp: normalizeTimestamp(parsed.transaction_timestamp) ?? normalizeTimestamp(parsed.transaction_date_text),
    needsManualReview:
      Boolean(parsed.needs_manual_review) ||
      !normalizeString(parsed.reference_number) ||
      normalizeNumber(parsed.amount) === null,
  };

  return {
    extraction,
    rawResponse: parsed,
    model: body.model ?? null,
  };
}
