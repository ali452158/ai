"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEYS = {
  youtube: "codementor-youtube-api-key",
  telegram: "codementor-telegram-bot-token",
  binance: "codementor-binance-api-key",
  binanceSecret: "codementor-binance-api-secret",
  github: "codementor-github-token",
  discord: "codementor-discord-webhook-url",
} as const;

export type PlatformKey =
  | "youtube"
  | "telegram"
  | "binance"
  | "binanceSecret"
  | "github"
  | "discord";

export interface ApiKeys {
  youtubeApiKey: string;
  telegramBotToken: string;
  binanceApiKey: string;
  binanceApiSecret: string;
  githubToken: string;
  discordWebhookUrl: string;
}

// Module-level event emitter so all hook instances stay in sync
type Listener = () => void;
const listeners = new Set<Listener>();
let cachedKeys: ApiKeys | null = null;

function readKeys(): ApiKeys {
  if (cachedKeys) return cachedKeys;
  try {
    cachedKeys = {
      youtubeApiKey: localStorage.getItem(STORAGE_KEYS.youtube) || "",
      telegramBotToken: localStorage.getItem(STORAGE_KEYS.telegram) || "",
      binanceApiKey: localStorage.getItem(STORAGE_KEYS.binance) || "",
      binanceApiSecret: localStorage.getItem(STORAGE_KEYS.binanceSecret) || "",
      githubToken: localStorage.getItem(STORAGE_KEYS.github) || "",
      discordWebhookUrl: localStorage.getItem(STORAGE_KEYS.discord) || "",
    };
    return cachedKeys;
  } catch {
    return {
      youtubeApiKey: "",
      telegramBotToken: "",
      binanceApiKey: "",
      binanceApiSecret: "",
      githubToken: "",
      discordWebhookUrl: "",
    };
  }
}

function writeKey(platform: PlatformKey, value: string) {
  try {
    if (value) {
      localStorage.setItem(STORAGE_KEYS[platform], value);
    } else {
      localStorage.removeItem(STORAGE_KEYS[platform]);
    }
    cachedKeys = null;
    listeners.forEach((l) => l());
  } catch {
    // ignore
  }
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKeys>(() => readKeys());

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setApiKeys(readKeys());
    });
    return unsubscribe;
  }, []);

  const saveApiKey = useCallback(
    (platform: PlatformKey, value: string) => {
      writeKey(platform, value);
      return true;
    },
    []
  );

  const clearApiKey = useCallback((platform: PlatformKey) => {
    writeKey(platform, "");
  }, []);

  return {
    apiKeys,
    saveApiKey,
    clearApiKey,
    hasYouTube: !!apiKeys.youtubeApiKey,
    hasTelegram: !!apiKeys.telegramBotToken,
    hasBinance: !!apiKeys.binanceApiKey && !!apiKeys.binanceApiSecret,
    hasGitHub: !!apiKeys.githubToken,
    hasDiscord: !!apiKeys.discordWebhookUrl,
    // Count of active platforms
    activeCount: [
      !!apiKeys.youtubeApiKey,
      !!apiKeys.telegramBotToken,
      !!apiKeys.binanceApiKey && !!apiKeys.binanceApiSecret,
      !!apiKeys.githubToken,
      !!apiKeys.discordWebhookUrl,
    ].filter(Boolean).length,
  };
}
