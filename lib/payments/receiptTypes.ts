export type PaymentReceiptProvider = "GCash" | "Maya";

export interface PaymentReceiptExtractionResult {
  provider: PaymentReceiptProvider;
  referenceNumber: string | null;
  recipientName: string | null;
  recipientMobileNumber: string | null;
  amount: number | null;
  currency: string | null;
  transactionDateText: string | null;
  transactionTimestamp: string | null;
  needsManualReview: boolean;
}

export function normalizePaymentReference(reference: string | null | undefined) {
  return (reference ?? "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "");
}
