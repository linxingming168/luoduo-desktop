import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { HealthStatus } from '../api/types';

export function useServerHealth() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [online, setOnline] = useState(false);

  const check = useCallback(async () => {
    const h = await api.getHealth();
    setHealth(h);
    setOnline(h !== null);
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [check]);

  return { health, online, refresh: check };
}
