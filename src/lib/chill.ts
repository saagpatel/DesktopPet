import { readLocalStorage, writeLocalStorage } from "./safeStorage";

export interface ChillSignals {
  fullscreen: boolean;
  meeting: boolean;
  heavyTyping: boolean;
  focusMode: boolean;
  timestamp: number;
}

const CHANNEL_NAME = "desktop-pet-chill-signals";

function supportsBroadcastChannel() {
  return (
    typeof window !== "undefined" && typeof BroadcastChannel !== "undefined"
  );
}

function readFallback(): ChillSignals | null {
  const raw = readLocalStorage(CHANNEL_NAME);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as ChillSignals;
  } catch {
    return null;
  }
}

export function publishChillSignals(signals: ChillSignals) {
  if (supportsBroadcastChannel()) {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(signals);
    channel.close();
    return;
  }
  writeLocalStorage(CHANNEL_NAME, JSON.stringify(signals));
}

export function listenForChillSignals(
  handler: (signals: ChillSignals) => void,
): () => void {
  if (supportsBroadcastChannel()) {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<ChillSignals>) =>
      handler(event.data);
    return () => channel.close();
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== CHANNEL_NAME || !event.newValue) {
      return;
    }
    try {
      handler(JSON.parse(event.newValue) as ChillSignals);
    } catch {
      // Ignore malformed updates.
    }
  };

  window.addEventListener("storage", onStorage);
  const initial = readFallback();
  if (initial) {
    handler(initial);
  }

  return () => {
    window.removeEventListener("storage", onStorage);
  };
}
