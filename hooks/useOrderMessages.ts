"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export interface OrderMessage {
  id: string;
  order_id: string;
  sender: "admin" | "user";
  message_type: "receipt" | "rating_prompt" | "general";
  body: string;
  read: boolean;
  created_at: string;
}

export function useOrderMessages(user: User | null) {
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!user) {
      setMessages([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("order_messages")
      .select("id, order_id, sender, message_type, body, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const typed = data as OrderMessage[];
      setMessages(typed);
      setUnreadCount(typed.filter((message) => !message.read).length);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`order-messages-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_messages",
          filter: `user_id=eq.${user.id}`,
        },
        () => void fetchMessages()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchMessages, user]);

  const markRead = useCallback(
    async (messageId: string) => {
      if (!messageId) return;
      const supabase = createClient();
      await supabase.from("order_messages").update({ read: true }).eq("id", messageId);
      void fetchMessages();
    },
    [fetchMessages]
  );

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    await supabase.from("order_messages").update({ read: true }).eq("user_id", user.id).eq("read", false);
    void fetchMessages();
  }, [fetchMessages, user]);

  return {
    messages,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    refetch: fetchMessages,
  };
}
