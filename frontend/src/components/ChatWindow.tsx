import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { connectChatSocket } from "../lib/socket";
import type { MessageOut, WsServerEvent } from "../types/api";
import MessageRow from "./MessageRow";
import MessageInput from "./MessageInput";

export default function ChatWindow({
  conversationId,
  onTitleChange,
}: {
  conversationId: string;
  onTitleChange: (id: string, title: string) => void;
}) {
  const [messages, setMessages] = useState<MessageOut[]>([]);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<ReturnType<typeof connectChatSocket> | null>(null);

  // Load history + open socket whenever the active conversation changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setStreamingText(null);

    api.getConversation(conversationId).then((conv) => {
      if (cancelled) return;
      setMessages(conv.messages);
      setLoading(false);
    });

    const socket = connectChatSocket(conversationId, handleEvent);
    socketRef.current = socket;

    function handleEvent(event: WsServerEvent) {
      if (cancelled) return;
      switch (event.type) {
        case "user_message_saved":
          setMessages((prev) => [...prev, event.message]);
          setStreamingText("");
          setError(null);
          onTitleChange(conversationId, event.message.content.slice(0, 60));
          break;
        case "token":
          setStreamingText((prev) => (prev ?? "") + event.delta);
          break;
        case "assistant_message_saved":
          setMessages((prev) => [...prev, event.message]);
          setStreamingText(null);
          break;
        case "error":
          setError(event.detail);
          setStreamingText(null);
          break;
      }
    }

    return () => {
      cancelled = true;
      socket.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamingText]);

  function handleSend(content: string) {
    socketRef.current?.send(content);
  }

  const isStreaming = streamingText !== null;

  return (
    <div className="flex h-full flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6">
        <div className="mx-auto max-w-3xl divide-y divide-ink-900">
          {loading && <p className="py-8 text-center text-sm text-ink-500">Loading…</p>}
          {!loading && messages.length === 0 && !isStreaming && (
            <div className="py-16 text-center">
              <p className="font-display text-lg text-ink-300">Start the conversation</p>
              <p className="mt-1 text-sm text-ink-500">Ask anything — it runs on your machine.</p>
            </div>
          )}
          {messages.map((m) => (
            <MessageRow key={m.id} message={m} />
          ))}
          {isStreaming && (
            <MessageRow
              message={{
                id: "streaming",
                role: "assistant",
                content: streamingText ?? "",
                token_count: null,
                latency_ms: null,
                created_at: new Date().toISOString(),
              }}
              streaming
            />
          )}
        </div>
        {error && (
          <div className="mx-auto max-w-3xl pb-4">
            <p role="alert" className="rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          </div>
        )}
      </div>
      <MessageInput onSend={handleSend} disabled={loading} />
    </div>
  );
}
