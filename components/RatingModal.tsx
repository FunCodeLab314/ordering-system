"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Star, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface RatingModalProps {
  orderId: string;
  orderNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function RatingModal({
  orderId,
  orderNumber,
  isOpen,
  onClose,
  onSubmitted,
}: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!orderId || rating === 0 || submitting) return;
    setSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("orders")
      .update({ rated: true, rating, rating_note: note.trim() || null })
      .eq("id", orderId);

    setSubmitting(false);
    if (error) return;
    onSubmitted();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative z-10 w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
                A
              </div>
              <h3 className="text-xl font-bold text-slate-900">Thank you for your order</h3>
              <p className="mt-1 text-sm text-slate-500">
                Order <strong>#{orderNumber}</strong> was marked delivered. How was your experience?
              </p>
            </div>

            <div className="mb-4">
              <div className="mb-2 flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                    aria-label={`Set rating ${star}`}
                  >
                    <Star
                      className={`h-9 w-9 ${
                        star <= (hovered || rating) ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="h-4 text-center text-xs text-slate-400">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very good"}
                {rating === 5 && "Excellent"}
              </p>
            </div>

            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Any comments? (optional)"
              rows={3}
              className="mb-4 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
            />

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
              className="w-full rounded-lg bg-emerald-700 py-3 font-bold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Submitting..." : "Submit Rating"}
            </motion.button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
