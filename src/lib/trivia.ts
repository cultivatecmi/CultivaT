export interface TriviaQuestion {
  id: string;
  emoji: string;
  question: string;
  options: string[];
  answer: number;
  /** por qué es la respuesta correcta */
  explanation: string;
  /** dato curioso extra que se muestra después de responder */
  fact: string;
}

export const TRIVIA_REWARD = 15;
export const TRIVIA_ROUND = 5;
export const TRIVIA_SECONDS = 20;

export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  {
    id: "maiz",
    emoji: "🌽",
    question: "¿Qué cultivo hace que a Sinaloa le digan “el granero de México”?",
    options: ["Maíz", "Café", "Uva", "Cacao"],
    answer: 0,
    explanation: "¡Sinaloa es el estado que más maíz produce en México!",
    fact: "Con el maíz se hacen tortillas, tamales, esquites… ¡y hasta palomitas!",
  },
  {
    id: "tomate",
    emoji: "🍅",
    question: "¿Qué cultivo rojo de Sinaloa viaja hasta otros países?",
    options: ["Zanahoria", "Tomate", "Lechuga", "Papa"],
    answer: 1,
    explanation: "El tomate de Sinaloa se exporta a Estados Unidos y Canadá.",
    fact: "Para los científicos el tomate es una fruta, ¡porque guarda semillas adentro!",
  },
  {
    id: "riego",
    emoji: "💧",
    question: "En días de mucho calor, ¿cuándo es mejor regar tu planta?",
    options: ["Al mediodía", "Temprano en la mañana", "Nunca", "A las 3 de la tarde"],
    answer: 1,
    explanation: "En la mañana el agua no se evapora tan rápido y las raíces la aprovechan.",
    fact: "En verano, Culiacán puede pasar de 40 °C. ¡Las plantas también se acaloran!",
  },
  {
    id: "fotosintesis",
    emoji: "☀️",
    question: "¿Cómo preparan su comida las plantas?",
    options: ["Comiendo tierra", "Con la fotosíntesis", "Bebiendo leche", "Durmiendo"],
    answer: 1,
    explanation: "Con luz del sol, agua y aire (CO₂) fabrican su alimento.",
    fact: "Mientras hacen fotosíntesis, las plantas sueltan el oxígeno que respiramos. 🌬️",
  },
  {
    id: "raiz",
    emoji: "🌱",
    question: "¿Qué parte de la planta absorbe el agua de la tierra?",
    options: ["Las flores", "Las hojas", "La raíz", "El tallo"],
    answer: 2,
    explanation: "Las raíces son como popotes que toman agua y nutrientes.",
    fact: "Las plantas también “sudan” agua por sus hojas: se llama transpiración.",
  },
  {
    id: "abeja",
    emoji: "🐝",
    question: "¿Qué animalito ayuda a que las flores se conviertan en frutos?",
    options: ["La abeja", "El perro", "El pez", "La vaca"],
    answer: 0,
    explanation: "Las abejas llevan polen de flor en flor: ¡eso se llama polinización!",
    fact: "Una abeja puede visitar entre 50 y 100 flores en un solo viaje.",
  },
  {
    id: "composta",
    emoji: "🍂",
    question: "¿Qué es la composta?",
    options: ["Un dulce", "Basura de plástico", "Abono natural de restos de comida y hojas", "Un tipo de piedra"],
    answer: 2,
    explanation: "Cáscaras de fruta, hojas secas y café se convierten en abono para tus plantas.",
    fact: "Casi la mitad de la basura de una casa son restos orgánicos que podrían ser composta.",
  },
  {
    id: "goteo",
    emoji: "🚿",
    question: "¿Qué forma de riego ahorra más agua en el campo?",
    options: ["Manguera abierta todo el día", "Riego por goteo", "Inundar el terreno", "Regar con cubetas al mediodía"],
    answer: 1,
    explanation: "El goteo lleva el agua directo a la raíz. ¡Se usa mucho en Sinaloa!",
    fact: "El riego por goteo se inventó para cultivar en lugares muy secos, como los desiertos.",
  },
  {
    id: "mango",
    emoji: "🥭",
    question: "¿Qué fruta tropical se cultiva mucho en el sur de Sinaloa (Escuinapa y Rosario)?",
    options: ["Manzana", "Mango", "Pera", "Fresa"],
    answer: 1,
    explanation: "¡El mango de Escuinapa es famoso por lo dulce!",
    fact: "Un árbol de mango puede vivir más de 100 años y seguir dando fruta.",
  },
  {
    id: "semilla",
    emoji: "🌰",
    question: "¿Qué necesita una semilla para germinar (despertar)?",
    options: ["Agua, aire y temperatura adecuada", "Solo oscuridad", "Mucho refresco", "Nada"],
    answer: 0,
    explanation: "Con humedad, aire y buena temperatura la semilla despierta y saca su raíz.",
    fact: "¡Algunas semillas pueden dormir cientos de años y aún así germinar!",
  },
  {
    id: "lombriz",
    emoji: "🪱",
    question: "¿Por qué las lombrices son amigas de la tierra?",
    options: ["Porque se comen las plantas", "Hacen túneles y abonan la tierra", "Porque son de colores", "No sirven para nada"],
    answer: 1,
    explanation: "Sus túneles dejan pasar aire y agua, y su popó es súper abono.",
    fact: "Las lombrices no tienen ojos: ¡sienten la luz con su piel!",
  },
  {
    id: "marchita",
    emoji: "🥀",
    question: "¿Qué le pasa a una planta con mucho calor y poca agua?",
    options: ["Se pone feliz", "Se marchita", "Se vuelve azul", "Crece más rápido"],
    answer: 1,
    explanation: "Pierde agua por las hojas y se debilita. ¡Por eso necesita sombra y riego!",
    fact: "Muchas plantas cierran unos poritos de sus hojas cuando hace calor para no perder agua.",
  },
  {
    id: "rios",
    emoji: "🏞️",
    question: "En Culiacán se juntan dos ríos para formar el río Culiacán. ¿Cuáles son?",
    options: ["Humaya y Tamazula", "Nilo y Amazonas", "Bravo y Lerma", "Papaloapan y Usumacinta"],
    answer: 0,
    explanation: "El Humaya y el Tamazula se unen en la ciudad y forman el río Culiacán.",
    fact: "Cerca de Culiacán está la presa Sanalona, que guarda agua para regar el valle.",
  },
  {
    id: "origen-maiz",
    emoji: "🇲🇽",
    question: "¿En qué país se cultivó el maíz por primera vez?",
    options: ["Japón", "México", "Francia", "Egipto"],
    answer: 1,
    explanation: "Los antiguos pueblos de México domesticaron el maíz hace miles de años.",
    fact: "El maíz viene de una planta silvestre llamada teocintle, ¡con mazorcas chiquititas!",
  },
  {
    id: "catarina",
    emoji: "🐞",
    question: "¿Qué comen las catarinas que ayudan a los agricultores?",
    options: ["Pulgones", "Tortillas", "Piedras", "Flores de plástico"],
    answer: 0,
    explanation: "Las catarinas se comen a los pulgones, una plaga de las plantas.",
    fact: "Una catarina puede comerse unos 50 pulgones en un solo día.",
  },
  {
    id: "clorofila",
    emoji: "🍃",
    question: "¿Por qué las hojas son de color verde?",
    options: ["Por la clorofila", "Porque las pintan", "Por el agua", "Porque están enojadas"],
    answer: 0,
    explanation: "La clorofila es un pigmento verde que atrapa la luz del sol.",
    fact: "En otoño, en lugares fríos, la clorofila se va y las hojas se ponen amarillas y rojas.",
  },
  {
    id: "girasol",
    emoji: "🌻",
    question: "¿Qué hacen los girasoles jóvenes durante el día?",
    options: ["Duermen", "Siguen al sol", "Cantan", "Se esconden bajo tierra"],
    answer: 1,
    explanation: "Los girasoles jóvenes giran su cabeza siguiendo al sol de este a oeste.",
    fact: "Ya adultos, la mayoría de los girasoles se quedan mirando hacia el este.",
  },
];
