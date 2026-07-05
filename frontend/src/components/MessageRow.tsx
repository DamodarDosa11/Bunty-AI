import { motion } from "framer-motion";
import Markdown from "./Markdown";
import type { MessageOut } from "../types/api";

interface Props {
  message: MessageOut;
  streaming?: boolean;
}

export default function MessageRow({ message, streaming }: Props) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex gap-4 py-4"
    >
      <div
        className={`mt-1 h-full w-0.5 shrink-0 self-stretch rounded-full ${
          isUser ? "bg-ink-700" : "bg-signal/50"
        }`}
      />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 text-xs">
          <span className={`font-medium ${isUser ? "text-ink-300" : "text-signal-soft"}`}>
            {isUser ? "You" : "Bunty"}
          </span>
          {message.latency_ms != null && (
            <span className="text-ink-600">{(message.latency_ms / 1000).toFixed(1)}s</span>
          )}
          {message.token_count != null && (
            <span className="text-ink-600">{message.token_count} tokens</span>
          )}
        </div>
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm text-ink-100">{message.content}</p>
        ) : (
          <div className="text-sm">
            <Markdown content={message.content || (streaming ? "" : "")} />
            {streaming && (
              <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse_dot bg-signal align-middle" />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
