import { createFileRoute } from "@tanstack/react-router";
import { ChatView } from "@/components/chat/chat-view";

export const Route = createFileRoute("/chat/")({
  head: () => ({
    meta: [{ title: "Nouvelle discussion — Incub'Youth" }],
  }),
  component: () => <ChatView />,
});