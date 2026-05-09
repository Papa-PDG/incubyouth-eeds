import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { nomCamp, duree, theme, effectif, age, region, besoinsSpeciaux } =
      await req.json();
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY non configurée" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const prompt = `Tu es Incub'Youth, assistant des EEDS au Sénégal. Génère un plan de camp scout complet et détaillé pour :

NOM : ${nomCamp}
DURÉE : ${duree} jours
THÈME : ${theme}
EFFECTIF : ${effectif} scouts
ÂGE : ${age}
RÉGION : ${region}, Sénégal
BESOINS SPÉCIAUX : ${besoinsSpeciaux || "Aucun"}

Réponds UNIQUEMENT avec un JSON valide (pas de markdown, pas de texte avant ou après) selon cette structure exacte :
{
  "resume": "Court résumé du camp en 2 phrases",
  "materiel": {
    "hebergement": ["item", ...],
    "cuisine": ["item", ...],
    "activites": ["item", ...],
    "sante": ["item", ...],
    "hygiene": ["item", ...]
  },
  "programme": [
    {
      "jour": "Jour 1 — Titre",
      "activites": [
        {"heure": "08h00", "activite": "Description", "duree": "1h", "type": "installation"}
      ]
    }
  ],
  "recettes": [
    {
      "nom": "Nom du plat sénégalais",
      "repas": "Petit-déjeuner|Déjeuner|Dîner",
      "temps": "30 min",
      "ingredients": ["ingrédient (quantité pour ${effectif} scouts)"],
      "etapes": ["Étape 1"]
    }
  ],
  "securite": {
    "checklist": ["item"],
    "contacts_urgence": ["SAMU : 15", "Police : 17"],
    "regles_camp": ["règle"]
  },
  "conseils": ["Conseil pour ${region}", "Conseil pour ${theme}"]
}

Adapte au contexte sénégalais : recettes traditionnelles (thiéboudienne, mafé, yassa, ceebu jën...), ressources locales, climat de ${region}, thème ${theme}. 4 à 6 items par liste, programme complet sur ${duree} jours, types d'activités parmi : installation, atelier, sport, repas, cérémonie, veillée. Sois concis, pas de phrases longues.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: 32768,
              temperature: 0.7,
              responseMimeType: "application/json",
            },
          }),
        },
      );
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        return new Response(
          JSON.stringify({ error: "La génération a pris trop de temps. Réessaie." }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw e;
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini error:", data);
      const raw = data.error?.message || `HTTP ${response.status}`;
      let message = raw;
      if (response.status === 429 || /quota|rate/i.test(raw)) {
        message = "Limite d'utilisation atteinte. Réessaie dans quelques instants.";
      } else if (response.status >= 500) {
        message = "Le service IA est momentanément indisponible.";
      }
      return new Response(
        JSON.stringify({ error: message }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const finishReason = data.candidates?.[0]?.finishReason;
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

    let plan;
    try {
      plan = JSON.parse(text);
    } catch (_e) {
      // Try to repair truncated JSON by closing open structures
      try {
        plan = JSON.parse(repairJson(text));
      } catch (e2) {
        console.error("Parse error:", e2, "finishReason:", finishReason, text.slice(-500));
        const msg = finishReason === "MAX_TOKENS"
          ? "Réponse trop longue. Réessaie avec moins de jours ou un effectif réduit."
          : "Réponse IA invalide. Réessaie.";
        return new Response(
          JSON.stringify({ error: msg }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    return new Response(JSON.stringify({ plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-camp error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function repairJson(input: string): string {
  let s = input.trim();
  // Drop trailing partial token after last complete value
  // Close any open string
  let inStr = false;
  let escape = false;
  const stack: string[] = [];
  let lastSafe = -1;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (inStr) {
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === "{" ) stack.push("}");
    else if (c === "[") stack.push("]");
    else if (c === "}" || c === "]") stack.pop();
    if (!inStr && (c === "," || c === "}" || c === "]")) lastSafe = i;
  }
  if (inStr) {
    // cut to last safe boundary
    if (lastSafe > 0) s = s.slice(0, lastSafe + 1);
    inStr = false;
  }
  // remove trailing commas
  s = s.replace(/,\s*$/g, "");
  // recompute stack after potential cut
  const stack2: string[] = [];
  let inStr2 = false, esc2 = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (esc2) { esc2 = false; continue; }
    if (c === "\\") { esc2 = true; continue; }
    if (inStr2) { if (c === '"') inStr2 = false; continue; }
    if (c === '"') { inStr2 = true; continue; }
    if (c === "{") stack2.push("}");
    else if (c === "[") stack2.push("]");
    else if (c === "}" || c === "]") stack2.pop();
  }
  while (stack2.length) s += stack2.pop();
  s = s.replace(/,(\s*[}\]])/g, "$1");
  return s;
}