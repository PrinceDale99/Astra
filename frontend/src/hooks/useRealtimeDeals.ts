/** @feature RealtimeDeals - WebSocket client with 3s auto-reconnect, merges NEW_DEAL events into state without full re-fetch, exposes isLive status */
'use client';
import { useState, useEffect, useRef } from 'react';

export interface RealtimeDeal {
  id: string;
  type: string;
  amount: number;
  time: string;
  status: string;
  zkProof: string;
  health_factor: number | null;
}

export function useRealtimeDeals(initialDeals: RealtimeDeal[] = []) {
  const [deals, setDeals] = useState<RealtimeDeal[]>(initialDeals);
  const [isLive, setIsLive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://astra-9mg6.onrender.com';

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => setIsLive(true);
      ws.onclose = () => {
        setIsLive(false);
        // Reconnect after 3 seconds
        setTimeout(connect, 3000);
      };
      ws.onerror = () => {
        setIsLive(false);
        ws.close();
      };
      ws.onmessage = (e) => {
        try {
          const { type, payload } = JSON.parse(e.data);
          if (type === 'NEW_DEAL') {
            setDeals((prev) => [payload, ...prev].slice(0, 50));
          }
        } catch {}
      };
    }

    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [wsUrl]);

  return { deals, setDeals, isLive };
}
