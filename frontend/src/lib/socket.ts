import type { WsServerEvent } from "../types/api";
import { getToken } from "./api";

export function connectChatSocket(
  conversationId: string,
  onEvent: (event: WsServerEvent) => void,
  onClose?: () => void
): { send: (content: string) => void; close: () => void } {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const token = getToken();
  const url = `${protocol}://${window.location.host}/ws/chat/${conversationId}?token=${encodeURIComponent(
    token ?? ""
  )}`;

  const socket = new WebSocket(url);

  socket.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data) as WsServerEvent;
      onEvent(data);
    } catch {
      onEvent({ type: "error", detail: "Received malformed message from server" });
    }
  };

  socket.onerror = () => {
    onEvent({ type: "error", detail: "Connection error" });
  };

  socket.onclose = () => {
    onClose?.();
  };

  return {
    send: (content: string) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "user_message", content }));
      } else {
        onEvent({ type: "error", detail: "Not connected yet — try again in a moment" });
      }
    },
    close: () => socket.close(),
  };
}
