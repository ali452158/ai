"use client";

import { useCallback, useRef, useState } from "react";

interface StreamCallbacks {
  onInit?: (conversationId: string) => void;
  onDelta?: (chunk: string) => void;
  onDone?: () => void;
  onError?: (err: string) => void;
}

interface UseStreamChatReturn {
  stream: (body: unknown, callbacks: StreamCallbacks) => Promise<void>;
  abort: () => void;
  isStreaming: boolean;
}

export function useStreamChat(): UseStreamChatReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const stream = useCallback(
    async (body: unknown, callbacks: StreamCallbacks) => {
      setIsStreaming(true);
      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/code-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...(body as object), stream: true }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        if (!res.body) {
          throw new Error("استجابة بدون بث");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;

            const dataStr = trimmed.slice(5).trim();
            if (!dataStr || dataStr === "[DONE]") continue;

            try {
              const evt = JSON.parse(dataStr);
              if (evt.type === "init" && evt.conversationId) {
                callbacks.onInit?.(evt.conversationId);
              } else if (evt.type === "delta" && typeof evt.content === "string") {
                callbacks.onDelta?.(evt.content);
              } else if (evt.type === "done") {
                if (evt.conversationId) callbacks.onInit?.(evt.conversationId);
                callbacks.onDone?.();
              } else if (evt.type === "error") {
                callbacks.onError?.(evt.error || "خطأ غير معروف");
              }
            } catch {
              // Ignore malformed chunks
            }
          }
        }

        // Process remaining buffer
        if (buffer.trim().startsWith("data:")) {
          const dataStr = buffer.trim().slice(5).trim();
          if (dataStr && dataStr !== "[DONE]") {
            try {
              const evt = JSON.parse(dataStr);
              if (evt.type === "done") callbacks.onDone?.();
              else if (evt.type === "error") callbacks.onError?.(evt.error);
            } catch {
              /* ignore */
            }
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          callbacks.onDone?.();
        } else {
          callbacks.onError?.(err.message || "فشل البث");
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    []
  );

  return { stream, abort, isStreaming };
}
