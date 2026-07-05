import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { ConversationOut } from "../types/api";
import { ChatBubbleIcon, PinIcon, PlusIcon, SearchIcon, TrashIcon } from "./icons";

interface Props {
  conversations: ConversationOut[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
  providerHealthy: boolean | null;
  providerLabel: string;
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onTogglePin,
  onDelete,
  providerHealthy,
  providerLabel,
}: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations;
    const q = query.toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, query]);

  const pinned = filtered.filter((c) => c.pinned);
  const unpinned = filtered.filter((c) => !c.pinned);

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-ink-800 bg-ink-900">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="h-2 w-2 rounded-full border border-signal/50 bg-signal/20" />
        <span className="font-display text-base font-semibold tracking-tight text-ink-100">
          Bunty
        </span>
      </div>

      <div className="px-3.5 pb-3">
        <motion.button
          onClick={onNewChat}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="flex w-full items-center gap-2 rounded-xl border border-ink-700 bg-ink-850 px-3.5 py-2.5 text-left text-sm font-medium text-ink-200 shadow-sm transition-colors hover:border-signal/40 hover:bg-ink-800 hover:text-ink-100"
        >
          <PlusIcon className="shrink-0 text-signal" />
          New chat
        </motion.button>
      </div>

      <div className="px-3.5 pb-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
            className="w-full rounded-lg border border-ink-800 bg-ink-950 py-2 pl-8 pr-2.5 text-xs text-ink-200 outline-none transition-colors placeholder:text-ink-500 focus:border-signal/40"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pb-2">
        {pinned.length > 0 && (
          <>
            <SectionLabel label="Pinned" />
            {pinned.map((c) => (
              <ConversationRow
                key={c.id}
                conv={c}
                active={c.id === activeId}
                onSelect={onSelect}
                onTogglePin={onTogglePin}
                onDelete={onDelete}
              />
            ))}
          </>
        )}
        <SectionLabel label="Chats" />
        {unpinned.length === 0 && pinned.length === 0 && (
          <p className="px-2.5 py-6 text-center text-xs text-ink-500">No conversations yet.</p>
        )}
        {unpinned.map((c) => (
          <ConversationRow
            key={c.id}
            conv={c}
            active={c.id === activeId}
            onSelect={onSelect}
            onTogglePin={onTogglePin}
            onDelete={onDelete}
          />
        ))}
      </nav>

      <div className="flex items-center gap-2 border-t border-ink-800 px-5 py-3.5 text-xs text-ink-500">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            providerHealthy ? "bg-emerald-400" : providerHealthy === false ? "bg-red-400" : "bg-ink-600"
          }`}
        />
        <span className="font-medium">
          {providerLabel}
          {providerHealthy === false && " · offline"}
        </span>
      </div>
    </aside>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="px-2.5 pb-1.5 pt-3.5 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
      {label}
    </div>
  );
}

function ConversationRow({
  conv,
  active,
  onSelect,
  onTogglePin,
  onDelete,
}: {
  conv: ConversationOut;
  active: boolean;
  onSelect: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ x: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={`group relative mb-0.5 flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${
        active ? "bg-ink-800 text-ink-100" : "text-ink-300 hover:bg-ink-850 hover:text-ink-100"
      }`}
    >
      {active && (
        <motion.span
          layoutId="active-chat-indicator"
          className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-signal"
          transition={{ duration: 0.2, ease: "easeOut" }}
        />
      )}
      <ChatBubbleIcon
        className={`shrink-0 ${active ? "text-signal" : "text-ink-500 group-hover:text-ink-300"}`}
      />
      <button onClick={() => onSelect(conv.id)} className="min-w-0 flex-1 truncate text-left">
        {conv.title || "New chat"}
      </button>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <motion.button
          onClick={() => onTogglePin(conv.id, !conv.pinned)}
          title={conv.pinned ? "Unpin" : "Pin"}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={`rounded-md p-1 transition-colors hover:bg-ink-700 ${
            conv.pinned ? "text-signal" : "text-ink-500 hover:text-signal"
          }`}
        >
          <PinIcon filled={conv.pinned} />
        </motion.button>
        <motion.button
          onClick={() => onDelete(conv.id)}
          title="Delete"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="rounded-md p-1 text-ink-500 transition-colors hover:bg-ink-700 hover:text-red-400"
        >
          <TrashIcon />
        </motion.button>
      </div>
    </motion.div>
  );
}
