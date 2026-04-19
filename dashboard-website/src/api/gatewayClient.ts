import { fetchValidated } from "./apiClient";
import { StatsResponseSchema, WebSocketMessageSchema } from "../model/analytics";
import type { StatsResponse, WebSocketMessage } from "../model/analytics";

const GATEWAY_HTTP = import.meta.env.VITE_GATEWAY_HTTP ?? "https://websocket-gateway-811910590920.us-central1.run.app";
const GATEWAY_WS = import.meta.env.VITE_GATEWAY_WS ?? "wss://websocket-gateway-811910590920.us-central1.run.app";

export function fetchStats(): Promise<StatsResponse> {
    return fetchValidated(`${GATEWAY_HTTP}/stats`, StatsResponseSchema);
}

export function createWebSocketConnection(
    onMessage: (msg: WebSocketMessage) => void,
    onOpen: () => void,
    onClose: () => void
): WebSocket {
    const ws = new WebSocket(GATEWAY_WS);

    ws.onopen = onOpen;
    ws.onclose = onClose;
    ws.onerror = () => ws.close();

    ws.onmessage = (event) => {
        try {
            const raw = JSON.parse(event.data);
            const msg = WebSocketMessageSchema.parse(raw);
            onMessage(msg);
        } catch (_) {}
    };

    return ws;
}
