import type { ItemCategory } from "./types";

export interface ShopItem {
  id: string;
  name: string;
  category: ItemCategory;
  price: number;
  emoji: string;
  description: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  // ------------------------------ 8 macetas ------------------------------
  { id: "pot-barro", name: "Barro Clásico", category: "pot", price: 0, emoji: "🏺", description: "La maceta de tu kit: fresca y tradicional." },
  { id: "pot-talavera", name: "Talavera Azul", category: "pot", price: 80, emoji: "🎨", description: "Pintada a mano con flores azules." },
  { id: "pot-madera", name: "Madera Rústica", category: "pot", price: 70, emoji: "🪵", description: "Tablitas de madera como de rancho." },
  { id: "pot-arcoiris", name: "Maceta Arcoíris", category: "pot", price: 110, emoji: "🌈", description: "¡Todos los colores en una maceta!" },
  { id: "pot-fresa", name: "Maceta de Fresa", category: "pot", price: 120, emoji: "🍓", description: "Rojita, con semillas y hojitas verdes." },
  { id: "pot-robot", name: "Maceta Robot", category: "pot", price: 150, emoji: "🤖", description: "Futurista, con pantalla y luces." },
  { id: "pot-volcan", name: "Maceta Volcán", category: "pot", price: 200, emoji: "🌋", description: "¡Con lava brillante que escurre!" },
  { id: "pot-dorada", name: "Maceta Dorada", category: "pot", price: 300, emoji: "🏆", description: "Para los jardineros campeones." },
  // ---------------------------- 10 accesorios ----------------------------
  { id: "acc-sombrero", name: "Sombrero de Palma Sinaloense", category: "accessory", price: 90, emoji: "👒", description: "Como los que usan en el campo sinaloense." },
  { id: "acc-lentes", name: "Lentes de Sol", category: "accessory", price: 50, emoji: "🕶️", description: "Para el sol de mediodía en Culiacán." },
  { id: "acc-estrella", name: "Lentes de Estrella", category: "accessory", price: 60, emoji: "⭐", description: "¡Para brillar como estrella de cine!" },
  { id: "acc-gorra", name: "Gorra Deportiva", category: "accessory", price: 70, emoji: "🧢", description: "Gorra azul cielo con el número 7." },
  { id: "acc-audifonos", name: "Audífonos Gamer", category: "accessory", price: 120, emoji: "🎧", description: "Con luces de colores y micrófono." },
  { id: "acc-corona", name: "Corona Real", category: "accessory", price: 250, emoji: "👑", description: "Para la reina o el rey del jardín." },
  { id: "acc-mono", name: "Moño Elegante", category: "accessory", price: 40, emoji: "🎀", description: "Un toque coqueto para tu planta." },
  { id: "acc-bandana", name: "Bandana de Explorador", category: "accessory", price: 55, emoji: "🧭", description: "Paliacate rojo para explorar el campo." },
  { id: "acc-flor", name: "Flor en la Cabeza", category: "accessory", price: 45, emoji: "🌺", description: "Una flor rosa para lucir bonita." },
  { id: "acc-bigote", name: "Bigote Simpático", category: "accessory", price: 35, emoji: "🥸", description: "¡Bigotón de charro para reír!" },
  // ---------------------------- 4 escenarios ----------------------------
  { id: "bg-patio", name: "Patio Soleado", category: "background", price: 0, emoji: "🏡", description: "El patio de tu casa con bugambilias." },
  { id: "bg-valle", name: "Valle de Culiacán", category: "background", price: 150, emoji: "🌾", description: "Campos de cultivo y la sierra al fondo." },
  { id: "bg-invernadero", name: "Invernadero Cristal", category: "background", price: 200, emoji: "🏠", description: "Como los invernaderos de tomate de Sinaloa." },
  { id: "bg-bosque", name: "Bosque Mágico", category: "background", price: 280, emoji: "🍄", description: "Árboles gigantes, hongos y luciérnagas." },
];

export const DEFAULT_OWNED = ["pot-barro", "bg-patio"];

export const DEFAULT_EQUIPPED = {
  pot: "pot-barro",
  accessory: null as string | null,
  background: "bg-patio",
};

/** artículos retirados del catálogo → su reemplazo (para no perder compras viejas) */
export const RETIRED_ITEMS: Record<string, string> = {
  "pot-moderna": "pot-robot",
  "pot-reciclada": "pot-madera",
};

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  pot: "Macetas",
  accessory: "Accesorios",
  background: "Escenarios",
};

export function getItem(id: string) {
  return SHOP_ITEMS.find((i) => i.id === id);
}
