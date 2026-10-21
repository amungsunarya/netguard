import { useEffect, useRef, useState } from 'react';

export type WSMessage = {
  type: 'alert_created' | 'alert_acked' | 'alert_blocked'
      | 'device_created' | 'device_updated' | 'device_deleted'
      | 'log_created' | 'ping';
  data: any;
  time: string;
};

export function useWebSocket(onMessage: (msg: WSMessage) => void) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number>(0);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    let mounted = true;

    function connect() {
      if (!mounted) return;

      const ws = new WebSocket('ws://localhost:8080/ws');

      ws.onopen = () => {
        if (!mounted) return;
        setConnected(true);
        reconnectRef.current = 0;
        console.log('[WS] Connected');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WSMessage;
          if (msg.type === 'ping') return;
          onMessageRef.current(msg);
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };

      ws.onclose = () => {
        if (!mounted) return;
        setConnected(false);
        wsRef.current = null;

        const delay = Math.min(1000 * Math.pow(2, reconnectRef.current), 30000);
        reconnectRef.current++;
        console.log(`[WS] Disconnected. Reconnect in ${delay}ms`);
        setTimeout(() => { if (mounted) connect(); }, delay);
      };

      wsRef.current = ws;
    }

    connect();

    return () => {
      mounted = false;
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return { connected };
}