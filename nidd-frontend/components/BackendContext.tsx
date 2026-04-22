"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { pingBackend } from "@/lib/api";

type BackendContextValue = {
  online: boolean | null;
  recheck: () => Promise<void>;
};

const BackendContext = createContext<BackendContextValue | null>(null);

export function BackendProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState<boolean | null>(null);

  const recheck = useCallback(async () => {
    setOnline(await pingBackend());
  }, []);

  useEffect(() => {
    const boot = window.setTimeout(() => void recheck(), 0);
    const id = window.setInterval(() => void recheck(), 30_000);
    return () => {
      window.clearTimeout(boot);
      window.clearInterval(id);
    };
  }, [recheck]);

  const value = useMemo(() => ({ online, recheck }), [online, recheck]);

  return (
    <BackendContext.Provider value={value}>{children}</BackendContext.Provider>
  );
}

export function useBackendStatus() {
  const ctx = useContext(BackendContext);
  if (!ctx) {
    throw new Error("useBackendStatus must be used within BackendProvider");
  }
  return ctx;
}
