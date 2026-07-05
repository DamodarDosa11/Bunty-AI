import { KeyboardEvent, ReactNode, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MicIcon, PaperclipIcon, SendIcon } from "./icons";

export default function MessageInput({
  onSend,
  disabled,
}: {
  onSend: (content: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function handleInput() {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }

  const canSend = !disabled && value.trim().length > 0;

  return (
    <div className="border-t border-ink-800 bg-ink-950 px-6 py-4">
      <div className="mx-auto flex max-w-3xl items-end gap-1.5 rounded-2xl border border-ink-700 bg-ink-900 p-2 shadow-sm transition-colors focus-within:border-signal/50">
        <IconButton title="Attach a file (coming soon)" disabled>
          <PaperclipIcon />
        </IconButton>

        <textarea
          ref={ref}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            handleInput();
          }}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Message Bunty…"
          disabled={disabled}
          className="max-h-[220px] flex-1 resize-none bg-transparent px-1 py-2 text-sm leading-relaxed text-ink-100 outline-none placeholder:text-ink-500 disabled:opacity-50"
        />

        <IconButton title="Voice input (coming soon)" disabled>
          <MicIcon />
        </IconButton>

        <motion.button
          onClick={submit}
          disabled={!canSend}
          whileHover={canSend ? { scale: 1.05 } : undefined}
          whileTap={canSend ? { scale: 0.95 } : undefined}
          transition={{ duration: 0.12, ease: "easeOut" }}
          title="Send message"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
            canSend
              ? "bg-signal text-ink-950 hover:bg-signal-soft"
              : "bg-ink-800 text-ink-600"
          }`}
        >
          <SendIcon />
        </motion.button>
      </div>
      <p className="mx-auto mt-1.5 max-w-3xl text-center text-[11px] text-ink-600">
        Enter to send · Shift + Enter for a new line
      </p>
    </div>
  );
}

function IconButton({
  children,
  title,
  disabled,
}: {
  children: ReactNode;
  title: string;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      title={title}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.08 }}
      whileTap={disabled ? undefined : { scale: 0.94 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-500 transition-colors hover:bg-ink-800 hover:text-ink-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-500"
    >
      {children}
    </motion.button>
  );
}
