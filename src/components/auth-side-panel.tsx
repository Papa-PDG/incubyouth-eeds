import logo from "@/assets/logo-mark.png";

export function AuthSidePanel({ title }: { title: string }) {
  return (
    <div className="relative flex flex-col justify-center bg-[#622599] p-8 text-white lg:p-12">
      <div className="mx-auto w-full max-w-sm space-y-8">
        <div className="flex items-center gap-3">
          <img src={logo} alt="EEDS" className="h-12 w-12 rounded-full bg-white p-1" />
          <span className="text-2xl font-bold tracking-tight">Incub'Youth</span>
        </div>
        <h2 className="text-3xl font-bold leading-tight lg:text-4xl">{title}</h2>
        <ul className="space-y-4 text-base">
          {[
            "Répond à tes questions 24h/24",
            "Propulsé par l'intelligence artificielle",
            "Conçu pour les scouts sénégalais",
          ].map((t) => (
            <li key={t} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-white/20 text-sm">
                ✓
              </span>
              <span className="text-white/95">{t}</span>
            </li>
          ))}
        </ul>
        <svg viewBox="0 0 200 120" className="mx-auto mt-6 h-32 w-full opacity-90" fill="none">
          <circle cx="40" cy="20" r="2" fill="white" />
          <circle cx="160" cy="30" r="1.5" fill="white" />
          <circle cx="180" cy="15" r="1" fill="white" />
          <circle cx="20" cy="40" r="1" fill="white" />
          <path
            d="M100 35 L92 55 L100 80 L108 55 Z M85 95 Q100 75 115 95 L115 115 L85 115 Z"
            fill="white"
          />
          <circle cx="100" cy="28" r="6" fill="white" />
        </svg>
      </div>
    </div>
  );
}

export function AuthLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-[40%_60%]">
      <AuthSidePanel title={title} />
      <div className="flex items-center justify-center bg-white px-6 py-10 lg:px-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}