import "server-only";

import type { PaymentReceiptExtractionResult, PaymentReceiptProvider } from "@/lib/payments/receiptTypes";

type GeminiReceiptExtractionRequest = {
  provider: PaymentReceiptProvider;
  imageDataUrl: string;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  modelVersion?: string;
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

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

function getGeminiApiKey() {
  return process.env.GEMINI_API?.trim() || "";
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

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    throw new Error("Receipt image must be a valid base64 data URL.");
  }

  return {
    mimeType: match[1],
    data: match[2],
  };
}

function buildReceiptSchema() {
  return {
    type: "OBJECT",
    properties: {
      provider: {
        type: "STRING",
        enum: ["GCash", "Maya"],
      },
      reference_number: {
        type: "STRING",
        nullable: true,
      },
      recipient_name: {
        type: "STRING",
        nullable: true,
      },
      recipient_mobile_number: {
        type: "STRING",
        nullable: true,
      },
      amount: {
        type: "NUMBER",
        nullable: true,
      },
      currency: {
        type: "STRING",
        nullable: true,
      },
      transaction_date_text: {
        type: "STRING",
        nullable: true,
      },
      transaction_timestamp: {
        type: "STRING",
        nullable: true,
      },
      needs_manual_review: {
        type: "BOOLEAN",
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
  };
}

export async function extractReceiptWithGemini({
  provider,
  imageDataUrl,
}: GeminiReceiptExtractionRequest): Promise<{
  extraction: PaymentReceiptExtractionResult;
  rawResponse: unknown;
  model: string | null;
}> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Missing Gemini API key. Set GEMINI_API in your environment.");
  }

  const model = process.env.GEMINI_RECEIPT_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const { mimeType, data } = parseDataUrl(imageDataUrl);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: [
                  `Extract the payment details from this ${provider} receipt screenshot.`,
                  "Return the recipient name, recipient mobile number, reference number, amount, currency, and transaction date/time.",
                  "Focus only on the receipt card and ignore ads, game screenshots, or unrelated UI below the receipt.",
                  "If the image is partially obscured or any value is uncertain, use null for that field and set needs_manual_review to true.",
                ].join(" "),
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: buildReceiptSchema(),
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini receipt extraction failed: ${errorText || response.statusText}`);
  }

  const body = (await response.json()) as GeminiGenerateContentResponse;
  const content = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new Error("Gemini receipt extraction returned an empty response.");
  }

  const parsed = safeJsonParse<ReceiptSchemaPayload>(content);
  if (!parsed) {
    throw new Error("Gemini receipt extraction returned invalid JSON.");
  }

  const extraction: PaymentReceiptExtractionResult = {
    provider,
    referenceNumber: normalizeString(parsed.reference_number),
    recipientName: normalizeString(parsed.recipient_name),
    recipientMobileNumber: normalizeString(parsed.recipient_mobile_number),
    amount: normalizeNumber(parsed.amount),
    currency: normalizeString(parsed.currency) ?? "PHP",
    transactionDateText: normalizeString(parsed.transaction_date_text),
    transactionTimestamp:
      normalizeTimestamp(parsed.transaction_timestamp) ?? normalizeTimestamp(parsed.transaction_date_text),
    needsManualReview:
      Boolean(parsed.needs_manual_review) ||
      !normalizeString(parsed.reference_number) ||
      normalizeNumber(parsed.amount) === null,
  };

  return {
    extraction,
    rawResponse: parsed,
    model: body.modelVersion ?? model,
  };
}
