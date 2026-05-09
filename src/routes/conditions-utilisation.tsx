import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/conditions-utilisation")({
  head: () => ({
    meta: [
      { title: "Conditions d'utilisation — Incub'Youth" },
      {
        name: "description",
        content:
          "Conditions générales d'utilisation de la plateforme Incub'Youth des Éclaireuses et Éclaireurs du Sénégal.",
      },
    ],
  }),
  component: CGUPage,
});

function CGUPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link to="/" className="text-sm font-medium text-[#622599] hover:underline">
        ← Retour à l'accueil
      </Link>
      <h1 className="mt-6 text-3xl font-bold text-foreground">
        Conditions d'utilisation
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Dernière mise à jour : mai 2026
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="mb-2 text-lg font-semibold">1. Objet</h2>
          <p>
            Incub'Youth est une plateforme éducative mise à disposition des
            Éclaireuses et Éclaireurs du Sénégal (EEDS). Elle offre un assistant
            conversationnel destiné à accompagner les scouts dans leur parcours
            éducatif et citoyen.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">2. Accès au service</h2>
          <p>
            L'accès est réservé aux membres et sympathisants des EEDS. La création
            d'un compte est gratuite et nécessite une adresse email valide.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">3. Usage responsable</h2>
          <p>
            L'utilisateur s'engage à utiliser la plateforme dans le respect des
            valeurs scoutes : honnêteté, respect d'autrui, esprit d'entraide.
            Tout contenu illicite, injurieux ou contraire aux bonnes mœurs est
            strictement interdit.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">4. Données personnelles</h2>
          <p>
            Les données collectées (nom, prénom, email, groupe scout, région) sont
            utilisées uniquement pour le fonctionnement du service. Elles ne sont
            jamais cédées à des tiers.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">5. Limites de responsabilité</h2>
          <p>
            L'assistant Incub'Youth s'appuie sur l'intelligence artificielle et
            peut produire des réponses imprécises. Il ne remplace en aucun cas un
            avis professionnel (médical, juridique, etc.).
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">6. Contact</h2>
          <p>
            Pour toute question, contacte l'équipe EEDS via les canaux officiels du
            mouvement.
          </p>
        </section>
      </div>
    </main>
  );
}