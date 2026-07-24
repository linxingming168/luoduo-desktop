import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { HealthStatus } from '../api/types';

/** 本地客户端版本（与 package.json 保持同步） */
export const CLIENT_VERSION = '2.0.0';

export function useServerHealth() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [online, setOnline] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [serverVersion, setServerVersion] = useState<string | null>(null);

  const check = useCallback(async () => {
    const h = await api.getHealth();
    setHealth(h);
    setOnline(h !== null);

    // 版本自动检测：后端版本 > 本地版本 → 提示升级
    if (h?.version) {
      setServerVersion(h.version);
      try {
        const sv = h.version.split('.').map(Number);
        const cv = CLIENT_VERSION.split('.').map(Number);
        const newer =
          sv[0] > cv[0] ||
          (sv[0] === cv[0] && sv[1] > cv[1]) ||
          (sv[0] === cv[0] && sv[1] === cv[1] && sv[2] > cv[2]);
        setUpdateAvailable(newer);
      } catch {
        setUpdateAvailable(h.version !== CLIENT_VERSION);
      }
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [check]);

  return { health, online, updateAvailable, serverVersion, clientVersion: CLIENT_VERSION, refresh: check };
}
