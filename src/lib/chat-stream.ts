import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

export async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
  signal,
}: {
  messages: Msg[];
  onDelta: (chunk: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
  signal?: AbortSignal;
}) {
  try {
    // Garder les 10 derniers messages pour économiser les tokens
    const history = messages.slice(-10);

    // Timeout client 30s
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    const onAbort = () => ctrl.abort();
    signal?.addEventListener("abort", onAbort);

    type AiData = { content?: string; error?: string; code?: string } | null;
    type InvokeErr = { message?: string } | null;
    let data: AiData = null;
    let invokeError: InvokeErr = null;
    try {
      const res = await supabase.functions.invoke("chat-ai", {
        body: { conversationHistory: history },
      });
      data = res.data as AiData;
      invokeError = res.error as InvokeErr;
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        if (signal?.aborted) return;
        onError("La requête a pris trop de temps. Réessaie.");
        return;
      }
      throw e;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }

    if (signal?.aborted) return;

    if (data?.error) {
      onError(data.error);
      return;
    }
    if (invokeError) {
      onError(invokeError.message || "Incub'Youth ne répond pas. Réessaie.");
      return;
    }

    const content: string | undefined = data?.content;
    if (!content) {
      onError("Incub'Youth ne répond pas. Réessaie.");
      return;
    }

    // Effet "streaming" en émettant le texte par petits morceaux
    const chunkSize = 6;
    for (let i = 0; i < content.length; i += chunkSize) {
      if (signal?.aborted) return;
      onDelta(content.slice(i, i + chunkSize));
      await new Promise((r) => setTimeout(r, 12));
    }
    onDone();
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
    onError("Incub'Youth ne répond pas. Réessaie.");
  }
}