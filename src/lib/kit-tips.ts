export interface WeekTip {
  week: number;
  title: string;
  emoji: string;
  tips: string[];
}

export const WEEK_TIPS: WeekTip[] = [
  {
    week: 1,
    title: "Semana 1 · Despertar la semilla",
    emoji: "🌰",
    tips: [
      "Mantén la tierra húmeda como esponja exprimida, ¡no encharcada!",
      "Pon la maceta donde reciba luz, pero no sol directo todo el día.",
      "La semilla va a 1 o 2 cm de profundidad.",
    ],
  },
  {
    week: 2,
    title: "Semana 2 · ¡Sale el brote!",
    emoji: "🌱",
    tips: [
      "Riega poquito en las mañanas con un vasito o atomizador.",
      "Gira la maceta cada 2 días para que crezca derechita.",
      "No toques el brote: todavía es muy delicado.",
    ],
  },
  {
    week: 3,
    title: "Semana 3 · Primeras hojas",
    emoji: "🍃",
    tips: [
      "Cuenta sus hojas y anótalo en tu foto semanal.",
      "Si las hojas se ponen amarillas, quizá tiene demasiada agua.",
      "Quita hierbitas que crezcan junto a tu planta.",
    ],
  },
  {
    week: 4,
    title: "Semana 4 · Hora de abonar",
    emoji: "🍂",
    tips: [
      "Agrega una cucharada de composta o cáscara de huevo molida.",
      "Afloja la tierra de arriba con un palito para que respire.",
      "En Culiacán, protégela del sol fuerte de 12 a 4 de la tarde.",
    ],
  },
  {
    week: 5,
    title: "Semana 5 · Planta fuerte",
    emoji: "🌿",
    tips: [
      "Si hace mucho calor, riega en la mañana y revisa la tierra en la tarde.",
      "Busca bichitos bajo las hojas; lávalas con agua y jabón neutro.",
      "Mide su altura con una regla y compárala con la semana pasada.",
    ],
  },
  {
    week: 6,
    title: "Semana 6+ · ¡Casi florece!",
    emoji: "🌻",
    tips: [
      "Si las raíces salen por abajo, pide ayuda para pasarla a una maceta más grande.",
      "Las flores necesitan polinizadores: ¡las abejas son bienvenidas!",
      "Comparte con tu salón cómo cuidaste tu planta. 🏫",
    ],
  },
];

export function tipsForWeek(week: number): WeekTip {
  return WEEK_TIPS[Math.min(WEEK_TIPS.length, Math.max(1, week)) - 1];
}
