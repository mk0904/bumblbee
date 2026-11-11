import { useEffect, useState, useCallback } from 'react';
import { api } from './api.js';

/** REST rehydration + server snapshots. Frontend never computes drone motion. */
export function useDashboard(onUnauthorized) {
  const [data, setData] = useState(null),
    [connection, setConnection] = useState('connecting'),
    [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      setData(await api('/dashboard'));
      setError('');
    } catch (error) {
      if (error.status === 401) onUnauthorized();
      else setError(error.message);
    }
  }, [onUnauthorized]);
  useEffect(() => {
    let stopped = false,
      socket,
      retry;
    function connect() {
      if (stopped) return;
      socket = new WebSocket(
        `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/dashboard`,
      );
      socket.onopen = () => setConnection('live');
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'snapshot') {
            setData(message.payload);
            setError('');
          }
        } catch {
          setError('Invalid live update received');
        }
      };
      socket.onclose = (event) => {
        if (stopped) return;
        setConnection('reconnecting');
        if (event.code === 4003) {
          onUnauthorized();
          return;
        }
        retry = setTimeout(() => {
          refresh();
          connect();
        }, 2000);
      };
    }
    refresh();
    connect();
    const fallback = setInterval(refresh, 10000);
    return () => {
      stopped = true;
      clearTimeout(retry);
      clearInterval(fallback);
      socket?.close();
    };
  }, [refresh, onUnauthorized]);
  return { data, connection, error, refresh };
}
