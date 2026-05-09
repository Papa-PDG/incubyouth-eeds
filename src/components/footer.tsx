import { Link } from "@tanstack/react-router";
import { Mail, Twitter, Facebook, Instagram } from "lucide-react";
import logoEeds from "@/assets/logo-incubyouth.png";

export function Footer() {
  return (
    <footer className="bg-[#1F1535] text-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <Link to="/" className="flex items-center gap-2">
            <img
              src={logoEeds}
              alt="Logo EEDS"
              className="h-9 w-9 rounded-full bg-white object-contain p-0.5"
            />
            <span className="text-[22px] font-bold tracking-tight">Incub'Youth</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-7 text-white/70">
            La plateforme intelligente des Éclaireuses et Éclaireurs du Sénégal.
            L'IA au service du scoutisme.
          </p>
          <p className="mt-6 text-xs text-white/50">© 2024 EEDS Sénégal</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white/90">
            Navigation
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-white/70">
            {[
              { to: "/", label: "Accueil" },
              { to: "/chat", label: "Discussion" },
              { to: "/espace", label: "Mon Espace" },
              { to: "/login", label: "Connexion" },
            ].map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="transition-colors hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white/90">
            Contact
          </h3>
          <a
            href="mailto:eeds@incubyouth.sn"
            className="mt-4 inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
          >
            <Mail className="h-4 w-4" /> eeds@incubyouth.sn
          </a>
          <div className="mt-6 flex items-center gap-3">
            {[
              { Icon: Twitter, href: "#", label: "X" },
              { Icon: Facebook, href: "#", label: "Facebook" },
              { Icon: Instagram, href: "#", label: "Instagram" },
            ].map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-white/40 hover:text-white"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-white/50 sm:px-6 lg:px-8">
          Fait avec ☘ pour les scouts du Sénégal.
        </div>
      </div>
    </footer>
  );
}