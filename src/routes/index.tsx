import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Tent,
  Scale,
  Leaf,
  Heart,
  UserPlus,
  MessageCircle,
  Bot,
  Star,
  BookOpen,
} from "lucide-react";
import { AnimateOnScroll } from "@/components/ui/animate-on-scroll";
import heroAvif from "@/assets/hero-scout.avif";
import heroWebp from "@/assets/hero-scout.webp";
import heroJpg from "@/assets/hero-scout.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Incub'Youth — L'IA au service des scouts du Sénégal" },
      {
        name: "description",
        content:
          "Pose tes questions sur le scoutisme, tes droits, l'environnement et la santé. Incub'Youth te répond 24h/24 grâce à l'IA.",
      },
      { property: "og:title", content: "Incub'Youth — Plateforme officielle des EEDS" },
      {
        property: "og:description",
        content: "L'intelligence artificielle au service des scouts du Sénégal.",
      },
    ],
  }),
  component: Index,
});

const dotPattern = {
  backgroundImage:
    "radial-gradient(circle, oklch(0.41 0.21 300 / 0.18) 1.2px, transparent 1.2px)",
  backgroundSize: "26px 26px",
};

const themes: ReadonlyArray<{
  Icon: typeof Tent;
  title: string;
  desc: string;
  slug: string;
  to: "/chat" | "/bibliotheque";
}> = [
  {
    Icon: Tent,
    title: "Scoutisme & Mouvement",
    desc: "Histoire, valeurs, techniques scouts, EEDS",
    slug: "scoutisme",
    to: "/chat",
  },
  {
    Icon: Scale,
    title: "Droits de l'enfant",
    desc: "Convention des droits, protection, citoyenneté",
    slug: "droits",
    to: "/chat",
  },
  {
    Icon: Leaf,
    title: "Environnement",
    desc: "Écologie, développement durable, nature",
    slug: "environnement",
    to: "/chat",
  },
  {
    Icon: Heart,
    title: "Santé & Bien-être",
    desc: "Hygiène, nutrition, premiers secours",
    slug: "sante",
    to: "/chat",
  },
  {
    Icon: BookOpen,
    title: "Bibliothèque EEDS",
    desc: "Règlements, programmes, chants et techniques en PDF",
    slug: "bibliotheque",
    to: "/bibliotheque",
  },
];

const steps = [
  { n: "01", Icon: UserPlus, title: "Crée ton compte", text: "Inscription gratuite en 30 secondes avec ton email" },
  { n: "02", Icon: MessageCircle, title: "Pose ta question", text: "Écris ta question en français ou en wolof" },
  { n: "03", Icon: Bot, title: "Reçois une réponse", text: "Incub'Youth te répond instantanément avec des sources fiables" },
] as const;

const stats = [
  { value: "500+", label: "Scouts inscrits" },
  { value: "4", label: "Thèmes couverts" },
  { value: "24/7", label: "Disponibilité" },
  { value: "100%", label: "Gratuit" },
] as const;

const testimonials = [
  {
    quote:
      "Incub'Youth m'a aidé à préparer mon discours sur les droits de l'enfant pour le camp national.",
    name: "Fatou D.",
    meta: "16 ans · Dakar",
    initials: "FD",
  },
  {
    quote:
      "Je pose mes questions en wolof et j'obtiens des réponses claires. Incroyable !",
    name: "Mamadou S.",
    meta: "14 ans · Saint-Louis",
    initials: "MS",
  },
  {
    quote: "Le meilleur outil pour les chefs scouts qui préparent leurs activités.",
    name: "Aïssatou B.",
    meta: "Chef scout · Ziguinchor",
    initials: "AB",
  },
] as const;

function Index() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-background">
        <div className="absolute inset-0" style={dotPattern} aria-hidden />
        <div
          className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-primary-subtle to-transparent"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-[100px] sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-8">
          <div className="text-center lg:text-left">
            <span className="anim-fade-up inline-flex items-center rounded-full bg-primary-soft px-4 py-1.5 text-[13px] font-medium text-primary">
              ✦ Plateforme officielle des EEDS
            </span>
            <h1 className="anim-fade-up delay-2 mt-6 text-[30px] font-bold leading-[1.15] tracking-tight text-foreground sm:text-[40px] lg:text-[52px]">
              L'intelligence artificielle au service des{" "}
              <span className="relative inline-block text-primary">
                Éclaireuses et Éclaireurs du Sénégal
                <span className="absolute -bottom-1 left-0 right-0 h-1 rounded-full bg-primary/80" />
              </span>
            </h1>
            <p className="anim-fade-up delay-4 mx-auto mt-6 max-w-[600px] text-[16px] leading-relaxed text-muted-foreground sm:text-[18px] lg:mx-0">
              Pose tes questions sur le scoutisme, tes droits, l'environnement et la santé.
              Incub'Youth te répond 24h/24 avec l'IA.
            </p>
            <div className="anim-fade-up delay-6 mt-10 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link
                to="/register"
                className="btn-bounce group inline-flex h-12 items-center gap-2 rounded-[10px] bg-primary px-7 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Commencer gratuitement{" "}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/chat"
                className="btn-bounce inline-flex h-12 items-center rounded-[10px] border-2 border-primary bg-transparent px-7 text-[15px] font-semibold text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Voir une démo
              </Link>
            </div>
            <p className="anim-fade-up delay-8 mt-6 text-[13px] text-muted-foreground">
              Déjà 500+ scouts inscrits · Gratuit · Sans publicité
            </p>
          </div>

          <AnimateOnScroll animation="scale-in">
            <div className="relative mx-auto w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-none">
              <div
                aria-hidden
                className="absolute -inset-6 rounded-[2rem] bg-gradient-to-tr from-primary/30 via-primary/10 to-transparent blur-2xl"
              />
              <div
                aria-hidden
                className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/20 blur-2xl"
              />
              <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-2xl ring-1 ring-primary/10 transition-transform duration-500 hover:scale-[1.02] hover:shadow-primary/20">
                <picture>
                  <source srcSet={heroAvif} type="image/avif" />
                  <source srcSet={heroWebp} type="image/webp" />
                  <img
                    src={heroJpg}
                    alt="Éclaireur sénégalais en uniforme scout consultant l'application Incub'Youth sur un smartphone"
                    width={900}
                    height={900}
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                    className="block h-auto w-full object-cover"
                  />
                </picture>
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-transparent"
                />
              </div>
              <div aria-hidden className="absolute -bottom-5 -left-5 hidden items-center gap-2 rounded-full border border-border bg-card/95 px-4 py-2 text-[12px] font-medium text-foreground shadow-lg backdrop-blur sm:flex">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                IA disponible 24/7
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* THEMES */}
      <section className="bg-primary-subtle py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll animation="fade-up">
            <h2 className="text-center text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]">
              Sur quoi veux-tu apprendre ?
            </h2>
          </AnimateOnScroll>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {themes.map(({ Icon, title, desc, slug, to }, i) => (
              <AnimateOnScroll key={slug} animation="fade-up" delay={i * 0.08}>
                <Link
                  to={to}
                  search={to === "/chat" ? ({ theme: slug } as never) : undefined}
                  className="card-hover group flex items-start gap-5 rounded-2xl border border-border bg-card p-6 hover:bg-primary-soft/40 sm:p-7"
                >
                  <div className="flex h-14 w-14 flex-none items-center justify-center rounded-xl bg-primary-soft text-primary transition-all duration-200 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-7 w-7" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-[18px] font-semibold text-foreground">{title}</h3>
                    <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted-foreground">
                      {desc}
                    </p>
                  </div>
                </Link>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-background py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll animation="fade-up">
            <h2 className="text-center text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]">
              Simple comme bonjour
            </h2>
          </AnimateOnScroll>
          <div className="relative mt-16 grid gap-12 md:grid-cols-3 md:gap-6">
            <div
              aria-hidden
              className="absolute left-[16.66%] right-[16.66%] top-7 hidden h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent md:block"
            />
            {steps.map(({ n, Icon, title, text }, i) => (
              <AnimateOnScroll key={n} animation="fade-up" delay={i * 0.12}>
                <div className="group relative flex flex-col items-center text-center">
                  <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary bg-background text-primary transition-transform duration-200 group-hover:scale-110">
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <span className="mt-4 text-[13px] font-semibold tracking-widest text-primary">
                    {n}
                  </span>
                  <h3 className="mt-2 text-[20px] font-semibold text-foreground">{title}</h3>
                  <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-muted-foreground">
                    {text}
                  </p>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-primary py-20 text-primary-foreground">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 px-4 sm:px-6 md:grid-cols-4 lg:px-8">
          {stats.map((s, i) => (
            <AnimateOnScroll key={s.label} animation="scale-in" delay={i * 0.08}>
              <div className="text-center">
                <div className="text-[44px] font-bold leading-none tracking-tight sm:text-[48px]">
                  {s.value}
                </div>
                <div className="mt-3 text-[15px] text-white/80 sm:text-[16px]">{s.label}</div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-primary-subtle py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll animation="fade-up">
            <h2 className="text-center text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]">
              Ce que disent nos scouts
            </h2>
          </AnimateOnScroll>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <AnimateOnScroll key={t.name} animation="fade-up" delay={i * 0.1}>
                <figure className="card-hover flex h-full flex-col rounded-2xl border border-border bg-card p-7">
                  <div className="flex gap-0.5 text-[#F59E0B]">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-current" strokeWidth={0} />
                    ))}
                  </div>
                  <blockquote className="mt-5 flex-1 text-[15.5px] italic leading-relaxed text-foreground">
                    « {t.quote} »
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {t.initials}
                    </div>
                    <div>
                      <div className="text-[14.5px] font-semibold text-foreground">{t.name}</div>
                      <div className="text-[13px] text-muted-foreground">{t.meta}</div>
                    </div>
                  </figcaption>
                </figure>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-background py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <AnimateOnScroll animation="fade-up">
            <h2 className="text-[32px] font-semibold tracking-tight text-foreground sm:text-[36px]">
              Prêt à commencer ?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[17px] text-muted-foreground">
              Rejoins des centaines de scouts qui apprennent avec Incub'Youth.
            </p>
            <Link
              to="/register"
              className="btn-bounce anim-pulse-soft group mt-10 inline-flex h-14 items-center gap-2 rounded-[10px] bg-primary px-8 text-[16px] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Créer mon compte gratuitement{" "}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </AnimateOnScroll>
        </div>
      </section>
    </>
  );
}