interface CopyTextOptions {
  includePayloadOnFallback?: boolean;
  maxFallbackPayloadLength?: number;
  successMessage?: string;
}

async function copyWithTauriClipboard(payload: string) {
  try {
    const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
    await writeText(payload);
    return true;
  } catch {
    return false;
  }
}

function copyWithLegacyDocumentCommand(payload: string) {
  if (
    typeof document === "undefined" ||
    typeof document.execCommand !== "function"
  ) {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = payload;
  textarea.setAttribute("readonly", "");
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-9999px";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, payload.length);

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  } finally {
    document.body.removeChild(textarea);
  }

  return copied;
}

export async function copyTextWithFallback(
  payload: string,
  label: string,
  options: CopyTextOptions = {},
) {
  const includePayloadOnFallback = options.includePayloadOnFallback ?? true;
  const maxFallbackPayloadLength = options.maxFallbackPayloadLength ?? 1200;
  const successMessage =
    options.successMessage ?? `${label} copied to clipboard`;
  const fallbackPayload =
    payload.length > maxFallbackPayloadLength
      ? `${payload.slice(0, maxFallbackPayloadLength)}… (truncated ${payload.length - maxFallbackPayloadLength} chars)`
      : payload;

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(payload);
      return successMessage;
    } catch {
      if (await copyWithTauriClipboard(payload)) {
        return successMessage;
      }
      if (copyWithLegacyDocumentCommand(payload)) {
        return successMessage;
      }
      if (includePayloadOnFallback) {
        return `Clipboard write blocked. ${label}: ${fallbackPayload}`;
      }
      return `Clipboard write blocked. ${label}`;
    }
  }

  if (await copyWithTauriClipboard(payload)) {
    return successMessage;
  }

  if (copyWithLegacyDocumentCommand(payload)) {
    return successMessage;
  }

  if (includePayloadOnFallback) {
    return `Clipboard unavailable. ${label}: ${fallbackPayload}`;
  }
  return `Clipboard unavailable. ${label}`;
}
