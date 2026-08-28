"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Headphones, MessageCircle, Minimize2, X, ArrowLeft, Bot, Sparkles, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatMessageContent } from "@/components/chat/chat-message-content";
import { MobileChatShell, useMobileChatClose } from "@/components/chat/mobile-chat-shell";
import { appendMessage, mergeMessagesById } from "@/lib/chat/merge-messages";
import { subscribeToConversationInserts } from "@/lib/chat/subscribe-messages";
import { markConversationReadClient, sendMessageClient } from "@/lib/chat/send-message-client";
import { useChatAutoScroll } from "@/lib/chat/use-chat-auto-scroll";
import { CHAT_SCROLL_CLASS } from "@/lib/chat/chat-layout";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/database";

interface UserQuickChatProps {
  open: boolean;
  conversationId: string;
  userId: string;
  onClose: () => void;
}

function QuickChatPanel({
  conversationId,
  userId,
  onClose,
  isMobile,
}: {
  conversationId: string;
  userId: string;
  onClose: () => void;
  isMobile: boolean;
}) {
  const closeViaBack = useMobileChatClose();
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatMode, setChatMode] = useState<"ai" | "human">("ai");
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    if (!supabase || !conversationId) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setMessages((prev) => mergeMessagesById(prev, data ?? []));
    void markConversationReadClient(supabase, conversationId, userId);
  }, [supabase, conversationId, userId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!supabase || !conversationId || !userId) return;

    return subscribeToConversationInserts(
      supabase,
      `quick-chat-${conversationId}`,
      conversationId,
      (msg) => {
        setMessages((prev) => appendMessage(prev, msg));
        if (msg.sender_id !== userId) {
          void markConversationReadClient(supabase, conversationId, userId);
        }
      }
    );
  }, [supabase, conversationId, userId]);

  useEffect(() => {
    if (!supabase || !conversationId) return;

    const poll = () => {
      if (document.visibilityState !== "visible") return;
      void loadMessages();
    };

    poll();
    const interval = setInterval(poll, 1200);
    return () => clearInterval(interval);
  }, [supabase, conversationId, loadMessages]);

  const fingerprint = messages.length > 0 ? messages[messages.length - 1]?.id : "";
  const { onScroll: onScrollMessages } = useChatAutoScroll(scrollRef, messages.length, fingerprint);

  async function sendCustomText(text: string) {
    if (!conversationId || !userId || !supabase || loading) return;
    setLoading(true);
    const result = await sendMessageClient(supabase, {
      conversationId,
      senderId: userId,
      content: text,
      kind: "user",
    });
    if (result.message) {
      setMessages((prev) => appendMessage(prev, result.message!));
    }
    setLoading(false);
  }

  async function handleSend(file: File | null): Promise<boolean> {
    if ((!input.trim() && !file) || !conversationId || !userId || !supabase) return false;

    setLoading(true);
    const content = input.trim();
    setInput("");

    const result = await sendMessageClient(supabase, {
      conversationId,
      senderId: userId,
      content,
      kind: "user",
    });

    if (result.error) {
      setInput(content);
      setLoading(false);
      return false;
    }

    if (result.message) {
      setMessages((prev) => appendMessage(prev, result.message!));
    }

    setLoading(false);
    return true;
  }

  async function handleSwitchToHuman() {
    setChatMode("human");
    await sendCustomText("🎧 I need to speak with a Real Human Agent.");
  }

  function handleClose() {
    if (closeViaBack) {
      closeViaBack();
      return;
    }
    onClose();
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden bg-[#0a0a0f]">
      {/* Top Header with Mode Selector */}
      <div className="flex flex-col border-b border-[rgba(201,168,76,0.15)] bg-[#0d0d14] shrink-0 safe-area-top">
        <div className="flex items-center gap-2 px-3 pt-3 pb-1">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-gray-300 hover:text-white"
              onClick={handleClose}
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300",
              chatMode === "ai"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            )}
          >
            {chatMode === "ai" ? <Bot className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {chatMode === "ai" ? "Casinova AI Assistant" : "Live Human Support"}
            </p>
            <p className="text-[10px] text-gray-400 truncate">
              {chatMode === "ai" ? "Instant 24/7 AI Bot Answers" : "Direct line to Real Support Agents"}
            </p>
          </div>
          <Link
            href={`/dashboard/messages?conversation=${conversationId}`}
            className="text-[10px] font-medium text-[#c9a84c] hover:text-[#f0d080] px-1.5 shrink-0"
          >
            Full view
          </Link>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white shrink-0"
            aria-label={isMobile ? "Close chat" : "Minimize chat"}
          >
            {isMobile ? <X className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </button>
        </div>

        {/* AI vs Real Agent Mode Tabs */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#07070d]">
          <button
            type="button"
            onClick={() => setChatMode("ai")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg text-[11px] font-medium transition-all",
              chatMode === "ai"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
            )}
          >
            <Bot className="h-3 w-3" />
            <span>AI Assistant</span>
          </button>

          <button
            type="button"
            onClick={handleSwitchToHuman}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg text-[11px] font-medium transition-all",
              chatMode === "human"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
            )}
          >
            <UserCheck className="h-3 w-3" />
            <span>Real Agent</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollRef}
        onScroll={onScrollMessages}
        className={cn(CHAT_SCROLL_CLASS, "flex-1 min-h-0 p-3 space-y-2 bg-[#0a0a1e]")}
      >
        {chatMode === "human" && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-2.5 text-center mb-2">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-400 mb-0.5">
              <Headphones className="h-3.5 w-3.5" />
              <span>Real Support Agent Mode</span>
            </div>
            <p className="text-[10px] text-emerald-200/80">
              An agent has been notified on Telegram and will reply in this chat shortly.
            </p>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="h-8 w-8 text-[#6b6d8f] mx-auto mb-2" />
            <p className="text-xs text-[#6b6d8f]">Say hello — we reply fast.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === userId;
            return (
              <div key={msg.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-xs break-words",
                    isOwn
                      ? "bg-gradient-to-b from-[#d4ae52] to-[#a07830] text-[#0a0a0f] rounded-br-md"
                      : "bg-[#13131a] border border-[rgba(255,255,255,0.06)] text-[#f0f0f5] rounded-bl-md"
                  )}
                >
                  <ChatMessageContent message={msg} />
                  <p className="text-[9px] opacity-60 mt-1">{formatRelativeTime(msg.created_at)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* AI Quick Topic Buttons */}
      {chatMode === "ai" && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 overflow-x-auto bg-[#070712] border-t border-white/5 scrollbar-none shrink-0">
          <button
            type="button"
            onClick={() => sendCustomText("How do I deposit money?")}
            className="px-2.5 py-1 rounded-full text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 whitespace-nowrap hover:bg-amber-500/20"
          >
            💳 How to Deposit
          </button>
          <button
            type="button"
            onClick={() => sendCustomText("How do I check my game balance?")}
            className="px-2.5 py-1 rounded-full text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 whitespace-nowrap hover:bg-amber-500/20"
          >
            ⚡ Check Balance
          </button>
          <button
            type="button"
            onClick={() => handleSwitchToHuman()}
            className="px-2.5 py-1 rounded-full text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 whitespace-nowrap hover:bg-emerald-500/20"
          >
            🎧 Talk to Real Agent
          </button>
        </div>
      )}

      {/* Composer */}
      <ChatComposer
        value={input}
        onChange={setInput}
        onSend={handleSend}
        loading={loading}
        placeholder={chatMode === "ai" ? "Ask AI Assistant..." : "Message Real Agent..."}
        className="bg-[#050510] border-[rgba(0, 229, 255,0.1)] shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      />
    </div>
  );
}

export function UserQuickChat({ open, conversationId, userId, onClose }: UserQuickChatProps) {
  const isMobile = useMediaQuery("(max-width: 767px)");

  if (!open) return null;

  const panel = (
    <QuickChatPanel
      conversationId={conversationId}
      userId={userId}
      onClose={onClose}
      isMobile={isMobile}
    />
  );

  if (isMobile) {
    return (
      <MobileChatShell open={open} onClose={onClose}>
        {panel}
      </MobileChatShell>
    );
  }

  return (
    <div className="fixed bottom-[5.5rem] right-6 z-[140] w-[min(100vw-2rem,22rem)] h-[min(70vh,28rem)] rounded-2xl border border-[rgba(201,168,76,0.15)] bg-[#0a0a0f] shadow-2xl shadow-black/60 flex flex-col overflow-hidden">
      {panel}
    </div>
  );
}
