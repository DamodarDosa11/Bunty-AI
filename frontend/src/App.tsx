import { useEffect, useState, useCallback } from "react";
import { api, getToken, clearToken, ApiError } from "./lib/api";
import type { ConversationOut } from "./types/api";
import LoginScreen from "./components/LoginScreen";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";

export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [conversations, setConversations] = useState<ConversationOut[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [providerHealthy, setProviderHealthy] = useState<boolean | null>(null);
  const [providerLabel, setProviderLabel] = useState("ollama");

  const checkAuth = useCallback(async () => {
    if (!getToken()) {
      setAuthed(false);
      return;
    }
    try {
      await api.me();
      setAuthed(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearToken();
      }
      setAuthed(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const refreshConversations = useCallback(async () => {
    const list = await api.listConversations();
    setConversations(list);
    if (!activeId && list.length > 0) setActiveId(list[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (authed) {
      refreshConversations();
      api
        .providerHealth()
        .then((h) => {
          setProviderHealthy(h.healthy);
          setProviderLabel(h.provider);
        })
        .catch(() => setProviderHealthy(false));
    }
  }, [authed, refreshConversations]);

  async function handleNewChat() {
    const conv = await api.createConversation();
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
  }

  async function handleTogglePin(id: string, pinned: boolean) {
    const updated = await api.pinConversation(id, pinned);
    setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }

  async function handleDelete(id: string) {
    await api.deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      setActiveId((prevList) => {
        const remaining = conversations.filter((c) => c.id !== id);
        return remaining[0]?.id ?? null;
      });
    }
  }

  function handleTitleChange(id: string, title: string) {
    setConversations((prev) =>
      prev.map((c) => (c.id === id && c.title === "New Chat" ? { ...c, title } : c))
    );
  }

  if (authed === null) {
    return <div className="h-screen bg-ink-950" />;
  }

  if (!authed) {
    return (
      <div className="h-screen">
        <LoginScreen onLoggedIn={() => setAuthed(true)} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-ink-950">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNewChat={handleNewChat}
        onTogglePin={handleTogglePin}
        onDelete={handleDelete}
        providerHealthy={providerHealthy}
        providerLabel={providerLabel}
      />
      {activeId ? (
        <ChatWindow key={activeId} conversationId={activeId} onTitleChange={handleTitleChange} />
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <button
            onClick={handleNewChat}
            className="rounded-lg border border-ink-700 bg-ink-900 px-4 py-2 text-sm text-ink-200 hover:border-signal/40"
          >
            Start your first chat
          </button>
        </div>
      )}
    </div>
  );
}
