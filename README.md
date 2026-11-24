# 🌱 CultivaT — Prototipo MVP

Mascota-planta virtual (estilo *Pou*) que acompaña a un kit físico de cultivo para niños de 6 a 14 años en Culiacán, Sinaloa.
Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (opcional) · Gemini (opcional).

## ▶️ Levantar el proyecto

```bash
npm install        # solo la primera vez
npm run dev        # modo desarrollo → http://localhost:3000
```

Versión optimizada (más rápida, ideal para la presentación):

```bash
npm run build
npm start          # → http://localhost:3000
```

Para abrirla desde un celular en la misma red Wi-Fi: `npm run dev:lan` y entra a `http://<IP-de-tu-PC>:3000`.

> Sin configurar nada, la app funciona al 100 % guardando el progreso en el navegador (localStorage).
> En la pantalla de bienvenida está el botón discreto **"Modo Demo Presentación"** (racha de 7 días, 250 monedas, accesorios, 3 fotos semanales y planta joven).

## ☁️ Conectar Supabase (opcional)

1. Crea un proyecto gratis en <https://supabase.com>.
2. Abre **SQL Editor**, pega el contenido de [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**.
   Crea la tabla `cultivat_profiles` (apodo, PIN con bcrypt, progreso en JSON) con RLS activo, y las funciones `cultivat_login` / `cultivat_save`.
3. Copia `.env.local.example` como `.env.local` y llena `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API).
4. Reinicia `npm run dev`. En la bienvenida aparecerá "Tu progreso se guarda en la nube".

## 🌻 Conectar la IA de Sabi (opcional)

Agrega `GEMINI_API_KEY` en `.env.local` (clave gratuita en <https://aistudio.google.com/apikey>). Sin clave, Sabi responde con su "libreta" de respuestas educativas preprogramadas.

## 🚀 Desplegar en Vercel

1. Sube la carpeta a un repositorio de GitHub.
2. En <https://vercel.com> → *Add New Project* → importa el repo.
3. Agrega las mismas variables de entorno de `.env.local` y despliega.

## 🗂️ Estructura

```
src/
  app/            layout, página principal, /api/chat, manifest
  components/
    GameProvider  estado global, guardado local/nube, reloj del juego
    plant/        personaje SVG, escenarios y escena animada
    screens/      Mi Planta · Jugar · Mi Kit · Tienda · Sabi
    games/        Atrapa la Lluvia (canvas) · Trivia del Campo
    layout/       header, barra inferior, avisos, toasts
  lib/            lógica del juego, tienda, trivia, consejos, Supabase, clima
supabase/schema.sql
```

## 🔒 Privacidad infantil

- Solo **Apodo + PIN** (sin correo, teléfono ni nombre real). El PIN se guarda con bcrypt en Supabase.
- El clima es una simulación interactiva (Soleado 25 °C · Ola de calor 42 °C · Lluvia 19 °C): no usa GPS ni servicios externos.
- Los efectos de sonido se sintetizan con Web Audio API (sin archivos de audio); el botón 🔊/🔇 se recuerda en el dispositivo.

## 🎮 Pantalla "Mi Planta"

- Escenario a pantalla completa con nubes en movimiento, sol, lluvia y el fondo comprado en la tienda.
- Toca la etiqueta `🌡️ 25°C Culiacán` para cambiar el clima en vivo.
- Brotín sigue tu dedo con la mirada, parpadea, rebota al tocarlo y suelta corazones al acariciarlo (sube 😊 Felicidad).
- Bandeja de herramientas: arrástralas hacia Brotín (o tócalas para usarlas automáticamente): 🚿 Regar · 🧪 Abono · ☂️ Sombrilla · 🧽 Esponja · ⚽ Pelota.
- Cada 15-20 s aparece un pulgón: tócalo para atraparlo (+3 🪙). De vez en cuando caen manchitas de tierra que se limpian con la esponja.

## 🎮 Sala de Juegos (pestaña "Jugar")

| Juego | Cómo se juega | Premio |
| :--- | :--- | :--- |
| 🌧️ **Atrapa la Lluvia** | 30 s moviendo la maceta: gotas +10, abono +20, rayos UV y plagas −15, combo cada 5 seguidas +5 | puntos ÷ 10 en 🪙 |
| 🐛 **Aplasta Plagas** | 6 macetas, 30 s: gusanos +10, pulgones +15, ¡no tocar catarinas! −20 | puntos ÷ 10 en 🪙 |
| 🃏 **Memorama Botánico** | 8 pares (tomate, maíz, chile, mango, agua, sol, abeja, catarina) con dato curioso por par | 45 🪙 con 8 movimientos (−2 por movimiento extra, mínimo 10) |
| 🧠 **Trivia del Campo** | 5 preguntas de 20 s, racha de aciertos y dato curioso tras cada respuesta | 15 🪙 por acierto, +5 con racha de 3 y +10 con racha de 5 |

Cada juego guarda tu récord y entrega XP para que la planta crezca.

## 🌱 Brotín por etapas

Semilla (semillita con ojitos) → Brote (tallo con 2 hojas-brazo) → Planta Joven (corona de 4 hojas) → Floreciendo (girasol). La geometría de cada etapa está en `src/components/plant/geometry.ts` y la usan el SVG, los accesorios y la pantalla principal.

## 🛍️ Tienda

8 macetas, 10 accesorios y 4 escenarios (`src/lib/shop.ts`). Las macetas retiradas (Moderna y Reciclada) se cambian automáticamente por Robot y Madera Rústica para no perder compras.

## 🧭 Mi Kit (Diario de Explorador)

Fotos estilo Polaroid con sello "¡Verificado!", comparador Antes vs. Hoy y progreso de 8 semanas. Al registrar una foto corre el Escáner Botánico (1.5 s): la primera foto de cada semana da **+50 🪙 y +30 XP**; las fotos extra de la misma semana dan +5 🪙.

## 🌻 Sabi

Además del chat: **🩺 Diagnosticar a mi planta** (lee Agua, Nutrientes, Frescura y Felicidad en tiempo real) y **🎯 Mini-reto** (verdadero/falso y adivinanzas, +10 🪙 por acierto).
- Las fotos del kit se comprimen y se guardan junto al progreso del niño.
