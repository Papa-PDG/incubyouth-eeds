import { jsPDF } from "jspdf";

export type CampPlan = {
  resume: string;
  materiel: Record<string, string[]>;
  programme: { jour: string; activites: { heure: string; activite: string; duree: string; type: string }[] }[];
  recettes: { nom: string; repas: string; temps: string; ingredients: string[]; etapes: string[] }[];
  securite: { checklist: string[]; contacts_urgence: string[]; regles_camp: string[] };
  conseils: string[];
};

export type CampMeta = {
  nomCamp: string;
  duree: number | string;
  theme: string;
  effectif: string;
  age: string;
  region: string;
};

const MATERIEL_LABELS: Record<string, string> = {
  hebergement: "Hébergement & Couchage",
  cuisine: "Cuisine & Alimentation",
  activites: "Activités & Animation",
  sante: "Santé & Premiers secours",
  hygiene: "Hygiène & Nettoyage",
};

type Section = "all" | "materiel" | "programme" | "recettes" | "securite";

export function exportCampPdf(
  meta: CampMeta,
  plan: CampPlan,
  section: Section = "all",
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 40;
  const marginBottom = 50;
  let y = 50;

  const ensureSpace = (h: number) => {
    if (y + h > pageH - marginBottom) {
      doc.addPage();
      y = 50;
    }
  };

  const writeLines = (text: string, size = 11, bold = false, color: [number, number, number] = [40, 40, 40]) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, pageW - marginX * 2);
    for (const ln of lines) {
      ensureSpace(size + 4);
      doc.text(ln, marginX, y);
      y += size + 4;
    }
  };

  const sectionTitle = (label: string) => {
    ensureSpace(34);
    y += 6;
    doc.setFillColor(98, 37, 153);
    doc.rect(marginX, y - 14, pageW - marginX * 2, 22, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(label, marginX + 8, y + 1);
    y += 18;
  };

  const subTitle = (label: string) => {
    ensureSpace(20);
    y += 4;
    writeLines(label, 12, true, [98, 37, 153]);
  };

  // Header
  doc.setFillColor(98, 37, 153);
  doc.rect(0, 0, pageW, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Incub'Youth — Plan de camp", marginX, 26);

  y = 70;
  writeLines(meta.nomCamp, 18, true, [30, 30, 30]);
  writeLines(
    `${meta.duree} jours · ${meta.theme} · ${meta.effectif} scouts · ${meta.age} · ${meta.region}`,
    10,
    false,
    [110, 110, 110],
  );
  y += 6;

  if (section === "all" && plan.resume) {
    writeLines(plan.resume, 11, false, [60, 60, 60]);
  }

  // MATERIEL
  if (section === "all" || section === "materiel") {
    sectionTitle("Matériel à prévoir");
    Object.entries(plan.materiel || {}).forEach(([k, items]) => {
      subTitle(MATERIEL_LABELS[k] ?? k);
      items.forEach((it) => writeLines(`• ${it}`));
    });
  }

  // PROGRAMME
  if (section === "all" || section === "programme") {
    sectionTitle("Programme");
    (plan.programme || []).forEach((day) => {
      subTitle(day.jour);
      day.activites.forEach((a) => {
        writeLines(`${a.heure}  —  ${a.activite}  (${a.duree}, ${a.type})`);
      });
    });
  }

  // RECETTES
  if (section === "all" || section === "recettes") {
    sectionTitle("Recettes");
    (plan.recettes || []).forEach((r) => {
      subTitle(`${r.nom} — ${r.repas} (${r.temps})`);
      writeLines("Ingrédients :", 11, true);
      r.ingredients.forEach((i) => writeLines(`• ${i}`));
      writeLines("Préparation :", 11, true);
      r.etapes.forEach((s, i) => writeLines(`${i + 1}. ${s}`));
    });
  }

  // SECURITE
  if (section === "all" || section === "securite") {
    sectionTitle("Sécurité");
    subTitle("Checklist obligatoire");
    plan.securite.checklist.forEach((i) => writeLines(`☐ ${i}`));
    subTitle("Contacts d'urgence");
    plan.securite.contacts_urgence.forEach((c) => writeLines(`• ${c}`));
    subTitle("Règles du camp");
    plan.securite.regles_camp.forEach((r) => writeLines(`• ${r}`));
  }

  // CONSEILS
  if (section === "all" && plan.conseils?.length) {
    sectionTitle("Conseils Incub'Youth");
    plan.conseils.forEach((c) => writeLines(`• ${c}`));
  }

  // Footer page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} / ${pageCount}`, pageW - marginX, pageH - 20, { align: "right" });
    doc.text("Incub'Youth · EEDS Sénégal", marginX, pageH - 20);
  }

  const slug = meta.nomCamp.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "camp";
  const suffix = section === "all" ? "" : `-${section}`;
  doc.save(`${slug}${suffix}.pdf`);
}