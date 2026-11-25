import { normalizeText } from "./utils";
import type { GameState } from "./types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const SABI_SUGGESTIONS = [
  "¿Cuánta agua necesita mi kit?",
  "¿Por qué hace tanto calor?",
  "¿Qué se cultiva en Sinaloa?",
  "¿Qué es la fotosíntesis?",
  "¿Cómo hago abono casero?",
  "¿Por qué mi planta tiene hojas amarillas?",
];

export const SABI_GREETING =
  "¡Hola! Soy Sabi 🌻, tu guía del campo. Pregúntame lo que quieras sobre tu kit, las plantas o la agricultura de Sinaloa. ¡Toca una pregunta de abajo para empezar!";

export const SABI_SYSTEM_PROMPT = `Eres "Sabi", un girasol sabio y alegre que es el guía botánico de la app CultivaT.
Hablas con niños de 6 a 14 años de Culiacán, Sinaloa, México.
Reglas:
- Responde SIEMPRE en español mexicano sencillo, cálido y con 1 o 2 emojis.
- Máximo 3 oraciones cortas (menos de 70 palabras).
- Da consejos prácticos y seguros para cuidar una planta en maceta (kit con maceta, tierra y semilla).
- Cuando venga al caso, menciona el campo sinaloense (maíz, tomate, chile, mango, frijol, calor de Culiacán).
- Nunca pidas datos personales (nombre completo, dirección, escuela, teléfono, fotos de personas).
- Si preguntan algo peligroso o que no es para niños, redirige amablemente a temas de plantas y naturaleza y sugiere preguntar a un adulto.
- Anima a la curiosidad y a estudiar carreras del campo (agronomía, biología, ingeniería agrícola).`;

interface KnowledgeEntry {
  keywords: string[];
  answer: string;
}

const KNOWLEDGE: KnowledgeEntry[] = [
  {
    keywords: ["cuanta agua", "regar", "riego", "agua necesita", "cuanto riego", "cada cuando"],
    answer:
      "¡Buena pregunta! 💧 Tu kit necesita más o menos medio vasito de agua cada 1 o 2 días. Mete tu dedo en la tierra: si está seca hasta la primera rayita del dedo, ¡toca regar! Mejor hazlo en la mañana, antes de que caliente el sol.",
  },
  {
    keywords: ["calor", "caliente", "temperatura", "sol fuerte", "bochorno", "por que hace"],
    answer:
      "En Culiacán hace mucho calor porque estamos cerca del Trópico de Cáncer y el sol pega casi derechito 🌞. En verano pasamos de 40 °C. Por eso tu planta necesita sombra de 12 a 4 de la tarde y riego temprano. ¡Igual que tú necesitas gorra y agua!",
  },
  {
    keywords: ["sinaloa", "cultiva", "siembra", "cultivos", "campo", "agricultura", "granero"],
    answer:
      "¡Sinaloa es el granero de México! 🌽 Aquí se cultiva muchísimo maíz, tomate, chile, frijol, papa, garbanzo y mango. Mucha de la comida que llega a otros estados y países sale de nuestros campos. ¡Los agrónomos sinaloenses son muy importantes!",
  },
  {
    keywords: ["fotosintesis", "comen las plantas", "alimento", "como comen"],
    answer:
      "La fotosíntesis es la cocina secreta de las plantas ☀️. Con la luz del sol, el agua de las raíces y el aire que entra por sus hojas, fabrican su propio azúcar para crecer… ¡y de regalo sueltan el oxígeno que respiramos! 🌬️",
  },
  {
    keywords: ["abono", "composta", "fertilizante", "nutrientes", "casero"],
    answer:
      "¡Hacer abono es súper fácil! 🍂 Junta cáscaras de fruta y verdura, hojas secas y restos de café en un bote con tierra. Revuélvelo cada semana y en unos 2 meses tendrás composta. Para tu kit, una cucharada al mes es suficiente. ¡También sirve la cáscara de huevo molida! 🥚",
  },
  {
    keywords: ["amarilla", "amarillas", "amarillo", "hojas cafes", "se seca", "marchita", "enferma"],
    answer:
      "Las hojas amarillas casi siempre significan demasiada agua 💦 o poca luz. Deja que la tierra se seque un poquito antes de volver a regar y ponla donde le dé luz de la mañana. Si las puntas están cafés y tostadas, ¡es mucho sol! Dale sombrita. 🌿",
  },
  {
    keywords: ["luz", "sombra", "donde pongo", "ventana", "lugar"],
    answer:
      "A tu planta le encanta la luz de la mañana 🌤️. Ponla cerca de una ventana o en el patio, pero cuando el sol de Culiacán esté muy fuerte (de 12 a 4) muévela a la sombra. ¡Así no se quema!",
  },
  {
    keywords: ["semilla", "germinar", "brote", "cuando sale", "cuanto tarda"],
    answer:
      "¡Paciencia, pequeño agricultor! 🌰 La mayoría de las semillas despiertan entre 5 y 14 días si la tierra está húmeda y calientita. Primero sale la raíz hacia abajo y luego el brote hacia arriba buscando la luz. 🌱",
  },
  {
    keywords: ["tomate", "jitomate"],
    answer:
      "¡El tomate sinaloense es famoso en el mundo! 🍅 Se cultiva mucho en invernaderos y campos del valle de Culiacán, y viaja en camiones hasta Estados Unidos y Canadá. Necesita sol, riego por goteo y tutores para no caerse.",
  },
  {
    keywords: ["maiz", "elote"],
    answer:
      "¡El maíz es el rey de Sinaloa! 🌽 Se siembra en otoño-invierno y se cosecha en primavera. De él salen tortillas, tamales y elotes. Una sola planta puede dar 1 o 2 mazorcas. ¡Sinaloa produce maíz para medio México!",
  },
  {
    keywords: ["mango"],
    answer:
      "¡El mango de Escuinapa y Rosario es dulcísimo! 🥭 Los árboles de mango aman el calor del sur de Sinaloa y dan fruta en verano. Un árbol puede vivir más de 100 años.",
  },
  {
    keywords: ["abeja", "polinizar", "polinizacion", "insecto", "bicho", "plaga"],
    answer:
      "Las abejas y mariposas son las mejores amigas del campo 🐝: llevan polen de flor en flor para que nazcan frutos. Si ves bichitos que se comen tu planta, lava las hojas con agua y un poquito de jabón neutro, ¡con ayuda de un adulto!",
  },
  {
    keywords: ["carrera", "estudiar", "agronomo", "agronomia", "trabajo", "ser grande", "profesion"],
    answer:
      "¡Me encanta que preguntes! 🎓 Puedes estudiar Agronomía, Biología, Ingeniería Agrícola o Ciencias Ambientales. En Sinaloa hay universidades con estas carreras y el campo necesita gente creativa que use drones, sensores y ciencia para cultivar mejor. 🚜",
  },
  {
    keywords: ["agua ahorrar", "ahorrar agua", "cuidar el agua", "sequia", "presa", "lluvia"],
    answer:
      "El agua es un tesoro 💧. En Sinaloa los campos usan riego por goteo para no desperdiciarla. Tú puedes ayudar regando con un vasito en vez de manguera y usando el agua que sobra de lavar verduras. ¡Cada gota cuenta!",
  },
  {
    keywords: ["hola", "buenos dias", "buenas", "quien eres", "como te llamas"],
    answer:
      "¡Hola, hola! 🌻 Soy Sabi, un girasol curioso que sabe mucho del campo. Puedo ayudarte a cuidar tu kit CultivaT y contarte secretos de las plantas de Sinaloa. ¿Qué quieres saber?",
  },
  {
    keywords: ["gracias", "genial", "chido", "padre"],
    answer: "¡De nada! 💚 Me encanta aprender contigo. Cuida mucho a tu planta y vuelve cuando tengas otra pregunta. 🌱",
  },
];

const DEFAULT_ANSWERS = [
  "¡Qué pregunta tan interesante! 🤔 Todavía estoy aprendiendo sobre eso. Mientras tanto, recuerda: tu planta necesita agua en la mañana, luz suave y abono una vez al mes. ¿Quieres saber algo sobre los cultivos de Sinaloa? 🌽",
  "Hmm, eso no lo sé todavía 🌻, pero puedes preguntarle a tu maestro o maestra y luego contármelo. ¿Te cuento cómo hacer composta casera? 🍂",
];

// ---------------------------------------------------------------------------
// 🩺 Diagnóstico de la planta (usa los medidores reales del jugador)
// ---------------------------------------------------------------------------

export type DiagStatus = "ok" | "warn" | "bad";

export interface DiagItem {
  emoji: string;
  label: string;
  value: number;
  status: DiagStatus;
  tip: string;
}

export interface Diagnosis {
  overall: DiagStatus;
  title: string;
  items: DiagItem[];
  extras: string[];
  /** resumen en texto (para el historial del chat) */
  summary: string;
}

const statusOf = (v: number): DiagStatus => (v >= 60 ? "ok" : v >= 30 ? "warn" : "bad");

const TIPS: Record<"water" | "nutrients" | "fresh" | "happy", Record<DiagStatus, string>> = {
  water: {
    ok: "Hidratación perfecta. ¡Sigue así! 💧",
    warn: "Pronto tendrá sed: riégala en la mañana con la regadera 🚿.",
    bad: "¡Tiene mucha sed! Usa la regadera 🚿. En tu kit real, toca la tierra: si está seca, dale medio vasito de agua.",
  },
  nutrients: {
    ok: "Bien alimentada con nutrientes 🌱.",
    warn: "Un poquito de abono 🧪 la pondrá más fuerte.",
    bad: "Le faltan nutrientes: dale abono 🧪. En tu kit real, una cucharadita de composta.",
  },
  fresh: {
    ok: "Temperatura agradable, está fresquita ☀️.",
    warn: "Empieza a acalorarse: ponle la sombrilla ☂️ al mediodía.",
    bad: "¡Tiene mucho calor! Abre la sombrilla ☂️ y pon tu kit real a la sombra de 12 a 4.",
  },
  happy: {
    ok: "¡Está muy feliz contigo! 😊",
    warn: "Le encantaría jugar contigo: entra a Jugar 🎮 y termina un minijuego.",
    bad: "Se siente solita 😢. Juega una partida en Jugar 🎮: cada juego le sube la felicidad.",
  },
};

export function diagnosePlant(s: GameState): Diagnosis {
  const items: DiagItem[] = [
    { emoji: "💧", label: "Agua", value: Math.round(s.water), status: statusOf(s.water), tip: TIPS.water[statusOf(s.water)] },
    { emoji: "🌱", label: "Nutrientes", value: Math.round(s.nutrients), status: statusOf(s.nutrients), tip: TIPS.nutrients[statusOf(s.nutrients)] },
    { emoji: "☀️", label: "Frescura", value: Math.round(s.fresh), status: statusOf(s.fresh), tip: TIPS.fresh[statusOf(s.fresh)] },
    { emoji: "😊", label: "Felicidad", value: Math.round(s.happy), status: statusOf(s.happy), tip: TIPS.happy[statusOf(s.happy)] },
  ];
  const extras: string[] = [];
  if (s.climate === "calor") extras.push("🔥 Hoy hay ola de calor en Culiacán (42 °C): riega temprano y usa la sombrilla.");
  if (s.climate === "lluvia") extras.push("🌧️ Está lloviendo: la lluvia la riega sola, ¡no necesita tanta agua!");
  if (s.dirt > 0) extras.push(`🧽 Tiene ${s.dirt} ${s.dirt === 1 ? "manchita" : "manchitas"} de tierra: frótala con el dedo para limpiarla.`);
  const bad = items.filter((i) => i.status === "bad").length;
  const warn = items.filter((i) => i.status === "warn").length;
  const overall: DiagStatus = bad ? "bad" : warn ? "warn" : "ok";
  const title =
    overall === "bad"
      ? `🚨 ${s.plantName} necesita tu ayuda`
      : overall === "warn"
        ? `⚠️ ${s.plantName} está bien, pero puede estar mejor`
        : `🌟 ¡${s.plantName} está súper sana!`;
  const summary = `${title}. ${items.map((i) => `${i.label} ${i.value}%`).join(", ")}.`;
  return { overall, title, items, extras, summary };
}

// ---------------------------------------------------------------------------
// 🎯 Mini-retos de Sabi
// ---------------------------------------------------------------------------

export interface SabiChallenge {
  id: string;
  kind: "vf" | "adivinanza";
  question: string;
  options: string[];
  answer: number;
  explain: string;
}

export const CHALLENGE_REWARD = 10;

const VF = ["✅ Verdadero", "❌ Falso"];

export const SABI_CHALLENGES: SabiChallenge[] = [
  { id: "estomas", kind: "vf", question: "Las plantas respiran por poritos diminutos en sus hojas.", options: VF, answer: 0, explain: "Se llaman estomas y por ahí entra el aire y sale el agua." },
  { id: "mediodia", kind: "vf", question: "Regar con mucho sol al mediodía es lo mejor para la planta.", options: VF, answer: 1, explain: "Es mejor en la mañana: al mediodía el agua se evapora rapidísimo." },
  { id: "catarinas", kind: "vf", question: "Las catarinas son plagas que dañan los cultivos.", options: VF, answer: 1, explain: "¡Al contrario! Se comen a los pulgones y protegen las plantas." },
  { id: "maiz-mx", kind: "vf", question: "El maíz es originario de México.", options: VF, answer: 0, explain: "Se domesticó aquí hace miles de años a partir del teocintle." },
  { id: "raices", kind: "vf", question: "Las raíces crecen hacia arriba buscando el sol.", options: VF, answer: 1, explain: "Las raíces crecen hacia abajo buscando agua; el tallo es el que busca la luz." },
  { id: "composta", kind: "vf", question: "La composta se hace con cáscaras de fruta, verduras y hojas secas.", options: VF, answer: 0, explain: "¡Sí! Esos restos se convierten en abono natural." },
  { id: "granero", kind: "vf", question: "A Sinaloa le dicen “el granero de México”.", options: VF, answer: 0, explain: "Porque es el estado que más maíz produce en el país." },
  { id: "tomate", kind: "adivinanza", question: "Verde en la mata, roja en la ensalada, de Sinaloa al mundo viaja empacada. ¿Qué es?", options: ["🍅 Tomate", "🥬 Lechuga", "🥒 Pepino"], answer: 0, explain: "¡El tomate sinaloense llega hasta Canadá!" },
  { id: "elote", kind: "adivinanza", question: "Tengo barbas y no soy señor, me visto de hojas y me como en tortilla. ¿Quién soy?", options: ["🫘 Frijol", "🌽 Maíz", "🌶️ Chile"], answer: 1, explain: "¡El elote! Sus “barbas” son los pelitos de la mazorca." },
  { id: "abeja", kind: "adivinanza", question: "Vuelo de flor en flor y hago miel con mucho amor. ¿Quién soy?", options: ["🦋 Mariposa", "🪰 Mosca", "🐝 Abeja"], answer: 2, explain: "Las abejas polinizan las flores para que nazcan los frutos." },
  { id: "lluvia", kind: "adivinanza", question: "Caigo del cielo sin hacer daño y riego los campos todo el año. ¿Qué soy?", options: ["🌧️ La lluvia", "💨 El viento", "☀️ El sol"], answer: 0, explain: "¡La lluvia! Por eso hay que cuidar cada gota." },
  { id: "girasol", kind: "adivinanza", question: "Amarillo y redondo, de joven sigo al sol con mi corona. ¿Quién soy?", options: ["🍋 Limón", "🌻 Girasol", "🍊 Naranja"], answer: 1, explain: "¡El girasol! Igual que yo, Sabi 🌻." },
];

export function getFallbackAnswer(question: string): string {
  const q = normalizeText(question);
  if (!q) return SABI_GREETING;
  let best: KnowledgeEntry | null = null;
  let bestScore = 0;
  for (const entry of KNOWLEDGE) {
    let score = 0;
    for (const kw of entry.keywords) {
      const k = normalizeText(kw);
      if (q.includes(k)) score += k.split(" ").length + 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  if (best) return best.answer;
  return DEFAULT_ANSWERS[q.length % DEFAULT_ANSWERS.length];
}
