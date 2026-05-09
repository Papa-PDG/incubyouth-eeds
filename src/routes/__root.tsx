import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
import { Navbar } from "@/components/navbar";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#FAF5FF] to-background px-4 py-12">
      <div className="max-w-lg text-center">
        <svg viewBox="0 0 200 120" className="mx-auto mb-6 h-32 w-auto" aria-hidden="true">
          <path d="M0 110 Q 50 80 100 100 T 200 110 L 200 120 L 0 120 Z" fill="#E9D5FF" />
          <path d="M30 100 L40 70 L50 100 Z" fill="#16A34A" opacity="0.7" />
          <path d="M150 100 L160 65 L170 100 Z" fill="#16A34A" opacity="0.7" />
          <path d="M170 100 L180 75 L190 100 Z" fill="#16A34A" opacity="0.5" />
          <path d="M70 105 L100 55 L130 105 Z" fill="#622599" />
          <path d="M100 55 L100 105" stroke="#1F1535" strokeWidth="1.5" />
          <path d="M95 105 L100 90 L105 105 Z" fill="#1F1535" />
          <circle cx="100" cy="48" r="3" fill="#F59E0B" />
        </svg>
        <h1 className="text-8xl font-extrabold tracking-tight text-primary">404</h1>
        <h2 className="mt-3 text-2xl font-bold text-foreground">
          Oups ! Cette page s'est perdue en forêt
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Même nos meilleurs éclaireurs ne l'ont pas trouvée.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex h-11 items-center justify-center rounded-[10px] bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Retourner à l'accueil
          </Link>
          <Link
            to="/chat"
            className="inline-flex h-11 items-center justify-center rounded-[10px] border-2 border-primary bg-transparent px-5 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft"
          >
            Aller au chat
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Incub'Youth — La plateforme intelligente des scouts sénégalais" },
      { name: "description", content: "Incub'Youth, le chatbot éducatif des Éclaireuses et Éclaireurs du Sénégal (EEDS)." },
      { name: "author", content: "EEDS" },
      { property: "og:title", content: "Incub'Youth" },
      { property: "og:description", content: "La plateforme intelligente des scouts sénégalais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "theme-color", content: "#622599" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "preload",
        as: "style",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Navbar />
        <Outlet />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
