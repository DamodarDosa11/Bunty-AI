import { ChangeEvent, KeyboardEvent, ReactNode, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../lib/api";
import { FileIcon, MicIcon, PaperclipIcon, SendIcon, XIcon } from "./icons";

/** Total combined extracted-text size we're willing to feed into the prompt. */
const MAX_TOTAL_CHARS = 300_000; // ~300 KB of text keeps us within most local model context windows
const MAX_FILES = 8;

interface AttachedFile {
  id: string;
  name: string;
  content: string;
  truncated: boolean;
}

interface PendingUpload {
  id: string;
  name: string;
}

export default function MessageInput({
  onSend,
  disabled,
}: {
  onSend: (content: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function totalChars(list: AttachedFile[]) {
    return list.reduce((sum, f) => sum + f.content.length, 0);
  }

  async function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-selecting the same file later
    if (selected.length === 0) return;

    if (files.length + selected.length > MAX_FILES) {
      setFileError(`You can attach up to ${MAX_FILES} files at a time.`);
      return;
    }

    setFileError(null);
    const pendingEntries = selected.map((f) => ({ id: `${f.name}-${f.lastModified}-${f.size}`, name: f.name }));
    setPending((prev) => [...prev, ...pendingEntries]);

    try {
      // A single request handles the whole batch — and if any file is a ZIP,
      // the backend unpacks it and returns one result per file inside it.
      const results = await api.extractFiles(selected);

      const successes: AttachedFile[] = [];
      const warnings: string[] = [];

      for (const r of results) {
        if (!r.text) {
          if (r.warning) warnings.push(`${r.name}: ${r.warning}`);
          continue;
        }
        successes.push({ id: `${r.name}-${Date.now()}-${Math.random()}`, name: r.name, content: r.text, truncated: r.truncated });
        if (r.warning) warnings.push(`${r.name}: ${r.warning}`);
      }

      setFiles((prev) => {
        const next = [...prev, ...successes];
        if (totalChars(next) > MAX_TOTAL_CHARS) {
          setFileError(
            `That would put attached text over the ${Math.round(MAX_TOTAL_CHARS / 1000)} KB limit. Remove a file first.`
          );
          return prev;
        }
        return next;
      });

      if (warnings.length > 0) {
        setFileError(warnings.join(" \u00b7 "));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setFileError(`Couldn't read the file(s): ${message}`);
    } finally {
      setPending((prev) => prev.filter((p) => !pendingEntries.some((pe) => pe.id === p.id)));
    }
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setFileError(null);
  }

  function buildMessageContent(): string {
    const trimmed = value.trim();
    if (files.length === 0) return trimmed;

    const attachmentBlocks = files
      .map((f) => `--- Attached file: ${f.name}${f.truncated ? " (truncated)" : ""} ---\n\`\`\`\n${f.content}\n\`\`\``)
      .join("\n\n");

    return trimmed ? `${trimmed}\n\n${attachmentBlocks}` : attachmentBlocks;
  }

  function submit() {
    const content = buildMessageContent();
    if (!content.trim() || disabled || pending.length > 0) return;
    onSend(content);
    setValue("");
    setFiles([]);
    setFileError(null);
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

  const canSend = !disabled && pending.length === 0 && (value.trim().length > 0 || files.length > 0);

  return (
    <div className="border-t border-ink-800 bg-ink-950 px-6 py-4">
      <div className="mx-auto max-w-3xl">
        <AnimatePresence>
          {(files.length > 0 || pending.length > 0) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2 flex flex-wrap gap-1.5 overflow-hidden"
            >
              {files.map((f) => (
                <span
                  key={f.id}
                  className="flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900 px-2 py-1 text-xs text-ink-200"
                >
                  <FileIcon className="h-3.5 w-3.5 text-ink-500" />
                  <span className="max-w-[180px] truncate">{f.name}</span>
                  {f.truncated && <span className="text-ink-600">(truncated)</span>}
                  <button
                    type="button"
                    onClick={() => removeFile(f.id)}
                    title="Remove file"
                    className="ml-0.5 text-ink-500 hover:text-ink-200"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {pending.map((p) => (
                <span
                  key={p.id}
                  className="flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900 px-2 py-1 text-xs text-ink-500"
                >
                  <FileIcon className="h-3.5 w-3.5 animate-pulse" />
                  <span className="max-w-[180px] truncate">{p.name}</span>
                  <span>reading…</span>
                </span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {fileError && (
          <p role="alert" className="mb-2 text-xs text-red-400">
            {fileError}
          </p>
        )}

        <div className="flex items-end gap-1.5 rounded-2xl border border-ink-700 bg-ink-900 p-2 shadow-sm transition-colors focus-within:border-signal/50">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />
          <IconButton
            title="Attach files for Bunty to read (text, code, PDF, Word, Excel, ZIP)"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
          >
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
      </div>
      <p className="mx-auto mt-1.5 max-w-3xl text-center text-[11px] text-ink-600">
        Enter to send · Shift + Enter for a new line · Attach text, code, PDF, Word, Excel, or ZIP files
      </p>
    </div>
  );
}

function IconButton({
  children,
  title,
  disabled,
  onClick,
}: {
  children: ReactNode;
  title: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      whileHover={disabled ? undefined : { scale: 1.08 }}
      whileTap={disabled ? undefined : { scale: 0.94 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-500 transition-colors hover:bg-ink-800 hover:text-ink-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-500"
    >
      {children}
    </motion.button>
  );
}