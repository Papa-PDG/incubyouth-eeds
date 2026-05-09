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

    const { data, error } = await supabase.functions.invoke("chat-ai", {
      body: { conversationHistory: history },
    });

    if (signal?.aborted) return;

    if (error) {
      onError(error.message || "Incub'Youth ne répond pas. Réessaie.");
      return;
    }
    if (data?.error) {
      onError(data.error);
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