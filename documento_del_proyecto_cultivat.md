# 🌱 CultivaT — Documentación Inicial del Proyecto

* **Nombre del Proyecto:** CultivaT
* **Categoría:** EdTech / Gamificación Ambiental (*Phygital*: Kit Físico + App Interactiva)
* **Ubicación / Enfoque Regional:** Culiacán, Sinaloa, México
* **Estado Actual:** Definición completa y arquitectura lista para prototipo MVP (Entrega: Jueves)

---

## 1. Objetivo de la Aplicación

Acercar a niños y jóvenes a la naturaleza de forma divertida y práctica mediante una experiencia **phygital** (combinando un kit físico de cultivo con una mascota/planta virtual interactiva estilo *Pou*). El propósito principal es despertar curiosidad temprana por el cuidado del medio ambiente y fomentar una vocación natural hacia el estudio de carreras relacionadas con la agricultura.

---

## 2. Tipo de Usuarios

* **Usuarios finales (Estudiantes):** Niños y adolescentes de **primaria y secundaria (6 a 14 años)** que aún no eligen su carrera profesional, con enfoque prioritario en escuelas públicas y comunidades de bajos recursos en Culiacán.
* **Clientes institucionales (Compradores B2B):** Escuelas, instituciones educativas y programas sociales que adquieren los kits físicos y el acceso a la plataforma para sus alumnos.
* **Roles del sistema (MVP):** Únicamente perfil de **Usuario Normal (Estudiante)** con acceso simplificado y seguro, sin datos personales sensibles.

---

## 3. Problema que Resuelve

En regiones con alta vocación agrícola como **Culiacán, Sinaloa**, existe una alarmante disminución en el interés de los jóvenes por estudiar carreras vinculadas al campo y la agricultura, un sector vital para la economía y alimentación local.

Enseñar agricultura técnica directamente resulta complejo y poco atractivo para niños pequeños. **CultivaT** resuelve esta barrera introduciéndolos primero al cuidado cotidiano de una planta viva (en casa y en pantalla) para generar empatía, hábito y conocimiento práctico sin que se sienta como una obligación escolar.

---

## 4. Funcionalidades Imprescindibles (MVP — Prototipo Web)

### A. Mi Planta (Pantalla Principal estilo *Pou*)
* **Personaje interactivo animado (SVG):** Cambia de expresión y postura según su estado real (feliz, sedienta, acalorada, hambrienta o marchita si se descuida). Responde al tacto con animaciones y mensajes amigables.
* **Medidores vitales en tiempo real:** 💧 Hidratación, ☀️ Temperatura/Sombra y 🌱 Nutrientes, con botones táctiles de acción rápida (*Regar*, *Dar Sombra*, *Abonar*).
* **Simulación de clima real:** Refleja condiciones reales como el calor intenso de Culiacán (incluye botón *"Simular Calor Culiacán"* para demostrar en vivo cómo el entorno afecta a la planta).
* **Sistema de progreso y rachas:** Racha diaria (`🔥`) para incentivar la constancia, monedas (`🪙`) y etapas de crecimiento (*Semilla → Brote → Planta Joven → Planta Floreciendo*).

### B. Jugar y Aprender
* **Minijuego Arcade (*"Atrapa la Lluvia"* - 30 segundos):** El usuario mueve su maceta de izquierda a derecha para atrapar gotas de agua y abono (gana monedas) mientras esquiva rayos UV extremos.
* **Trivia Relámpago:** Preguntas cortas, visuales y dinámicas sobre naturaleza, cuidado del agua y agricultura en Sinaloa que otorgan monedas por cada acierto.

### C. Mi Kit Real (Seguimiento Semanal)
* **Registro fotográfico semanal:** Permite tomar o subir una fotografía de la planta física del kit (maceta, tierra y planta real) para documentar su evolución semana a semana.
* **Recomendaciones prácticas:** Consejos sencillos y accionables según la etapa de crecimiento para ayudar al niño a cuidar mejor su planta real.

### D. Tienda de Personalización
* Catálogo donde los niños canjean las monedas ganadas jugando por estilos visuales para su planta virtual: **macetas** (barro, artesanal, moderna), **accesorios** (lentes de sol, sombrero de palma, gorra, moño) y **escenarios** (patio, valle agrícola, invernadero).

### E. Guía IA (*"Sabi"*)
* Asistente conversacional amigable adaptado a niños para resolver dudas rápidas sobre el cuidado de su kit y curiosidades del campo, con preguntas sugeridas de un solo toque.

### F. Cuenta en la Nube sin Datos Sensibles
* Inicio de sesión con **Apodo + PIN de 4 dígitos** para guardar el progreso en la nube entre dispositivos sin recopilar correos, teléfonos ni datos privados de menores.
* Incluye un **"Modo Demo Presentación"** precargado para demostraciones rápidas.

---

## 5. Funcionalidades Opcionales (Fase 2 — Post-Prototipo)

Para mantener el prototipo enfocado y viable para el jueves, las siguientes capacidades quedan reservadas para etapas posteriores:
1. **Aplicaciones móviles nativas:** Publicación oficial en Google Play Store (Android) y App Store (iOS).
2. **Pasarela de pagos y monetización B2C:** Habilitación de compras integradas dentro de la app (*In-App Purchases*) y espacios publicitarios controlados.

---

## 6. Diseño y Experiencia de Usuario (UX/UI)

* **Concepto visual:** Inspirado en la simplicidad y carisma de *Pou*, combinado con una estética orgánica y vibrante para niños (divertido, táctil y cero aburrido).
* **Formato Mobile-First:** Interfaz diseñada en un marco vertical centrado de `430px` con barra inferior de 5 pestañas grandes, permitiendo que la web app se vea y se use como una app nativa desde cualquier celular o proyector.
* **Tipografía:** `Fredoka` (títulos, botones y contadores) + `Nunito` (textos educativos y chat), ambas de Google Fonts.

### Paleta de Colores Oficial

| Rol en la interfaz | Color | Código HEX | Uso principal |
| :--- | :--- | :--- | :--- |
| **Fondo Principal** | Crema Cálido | `#FFFDF7` | Fondo general; luminoso y amigable a la vista. |
| **Color Primario** | Verde Hoja Viva | `#4CAF50` | Botones principales, barras de salud y progreso. |
| **Tierra / Maceta** | Café Terracota | `#8D6E63` | Maceta virtual y tarjetas del kit físico. |
| **Energía / Recompensas** | Amarillo Sol | `#FFB300` | Monedas (`🪙`), racha diaria (`🔥`) y medallas. |
| **Agua / Interacción** | Azul Cielo | `#29B6F6` | Riego, hidratación y elementos del minijuego. |
| **Alerta Climática** | Naranja Culiacán | `#FF7043` | Avisos de calor extremo y necesidad de sombra. |

---

## 7. Monetización (Modelo Híbrido B2B + B2C)

**CultivaT** combina impacto social con sostenibilidad financiera mediante dos vías principales:

1. **Modelo B2B (Fuente Principal — Escuelas e Instituciones):**
   * Venta directa del **Kit Físico CultivaT** (maceta, tierra y semilla/planta) junto con el acceso a la aplicación educativa a escuelas, colegios y programas educativos o gubernamentales enfocados en llevar educación ambiental a zonas de bajos recursos.
2. **Modelo B2C (Ingresos Adicionales — Usuarios en App):**
   * **Compras dentro de la app (Freemium):** Venta opcional de paquetes de monedas, macetas especiales o accesorios exclusivos de personalización.
   * **Publicidad controlada:** Implementación de anuncios aptos para público infantil como vía complementaria de ingresos en la versión abierta al público.

---

## 8. Tecnologías Recomendadas (100 % Gratuitas para Prototipo)

* **Frontend:** Next.js (App Router), React, TypeScript y Tailwind CSS.
* **Base de Datos y Nube:** **Supabase (Plan Gratuito)** para almacenar perfiles (apodo + PIN), estado de la planta, monedas, rachas e historial de progreso.
* **Alojamiento / Despliegue:** **Vercel (Plan Gratuito)** para publicar la aplicación web con enlace accesible desde cualquier celular.
* **Flujo de Desarrollo:** Construcción guiada mediante **Claude Code** utilizando arquitectura modular limpia.

---

## 9. Integraciones Necesarias

* **Cámara del dispositivo (`HTML5 Media Capture`):** Para tomar y subir fotografías semanales del kit físico directamente desde el navegador móvil.
* **Notificaciones (Web Push / Alertas en App):** Recordatorios para regar, alimentar o proteger la planta del calor y evitar que el usuario pierda su racha.
* **Inteligencia Artificial (API de LLM):** Conexión en `/api/chat` para impulsar al guía botánico *Sabi* (con respuestas locales de respaldo incluidas).
* *Exclusiones intencionales en MVP:* No utiliza geolocalización GPS (privacidad infantil) ni pasarelas de pago activas.

---

## 10. Plan de Desarrollo (Cronograma de 48 Horas + Prompt Maestro)

### Cronograma de Ejecución (Martes a Jueves)

| Día | Fase | Entregables y Tareas |
| :--- | :--- | :--- |
| **Martes (Hoy)** | **Construcción Base** | Ejecutar el Prompt Maestro en Claude Code; validar pantalla *Mi Planta*, simulación de calor, tienda y navegación móvil. |
| **Miércoles** | **Nube y Pruebas** | Probar minijuego *Atrapa la Lluvia*, captura de foto del kit, conectar Supabase (apodo + PIN) y desplegar en Vercel. |
| **Jueves** | **Presentación** | Abrir el enlace en celular usando el *Modo Demo Presentación*, mostrar el kit físico real en mano y realizar demo de 3 minutos. |

### Prompt Maestro para Claude Code

Copia y pega este prompt en **Claude Code** dentro de una carpeta vacía para generar toda la estructura del prototipo:

```text
Actúa como un desarrollador Full-Stack Senior y diseñador de producto especializado en aplicaciones educativas gamificadas (edtech) para niños. Vamos a construir el prototipo funcional de "CultivaT", una aplicación web mobile-first (estilo Pou) que acompaña a un kit físico de cultivo (maceta, tierra y planta) para niños de primaria y secundaria en Culiacán, Sinaloa, con el objetivo de acercarlos a la naturaleza y despertar interés por la agricultura.

### 1. Stack Técnico y Arquitectura
- Usa Next.js (App Router), TypeScript, Tailwind CSS y Lucide React.
- Configura Google Fonts con "Fredoka" para títulos/botones y "Nunito" para cuerpo de texto.
- Diseño Mobile-First: envuelve la aplicación en un contenedor centrado con apariencia de app móvil (max-w-[430px] mx-auto min-h-screen shadow-2xl border-x border-stone-200 bg-[#FFFDF7]) con navegación fija inferior de 5 pestañas.
- Persistencia y Nube: Integra Supabase (@supabase/supabase-js) usando variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY para guardar el progreso mediante un inicio de sesión seguro sin datos sensibles (solo "Apodo de usuario" + "PIN de 4 dígitos").
- IMPORTANTE (Fallback automático y Modo Demo): Si las variables de entorno de Supabase no están configuradas todavía, la app debe funcionar automáticamente usando localStorage sin romperse. Además, incluye en la pantalla de bienvenida un botón discreto llamado "Modo Demo Presentación" que cargue al instante un perfil con racha de 7 días, 250 monedas, accesorios desbloqueados, historial de fotos y una planta en etapa joven.

### 2. Paleta de Colores Obligatoria
- Fondo principal: #FFFDF7 (Crema cálido)
- Primario (Naturaleza/Salud): #4CAF50
- Tierra/Maceta: #8D6E63
- Monedas/Sol/Racha: #FFB300
- Agua/Botones interactivos: #29B6F6
- Alerta Calor Extremo: #FF7043

### 3. Pantallas y Funcionalidades (MVP)
Construye las siguientes 5 vistas completas e interactivas:

1. **Mi Planta (Home estilo Pou):**
   - Un personaje de planta dibujado en SVG expresivo y animado que cambia de cara y postura según su estado: feliz, sedienta, acalorada, hambrienta o marchita (si sus medidores llegan a 0). Al hacer clic sobre la planta, rebota y muestra un mensaje amigable.
   - 3 barras de estado visuales: Hidratación (💧), Temperatura/Frescura (☀️) y Nutrientes (🌱), con botones de acción rápida debajo (Regar, Dar Sombra/Aire, Abonar).
   - Incluye un botón de prueba en la esquina superior ("Simular Calor Culiacán") que sube la temperatura y activa una alerta naranja para demostrar cómo el niño debe proteger su planta.
   - Header superior con Racha (🔥 días), Monedas (🪙) y barra de experiencia hacia la siguiente etapa (Semilla -> Brote -> Planta Joven -> Planta Floreciendo).
   - Sistema de notificaciones internas (campana con alertas de cuidado y racha).

2. **Jugar y Aprender:**
   - **Minijuego "Atrapa la Lluvia" (Canvas o estado interactivo de 30 segundos):** El usuario mueve su maceta horizontalmente (con botones táctiles o mouse/teclado) para atrapar gotas de agua (+10 pts) y bolsas de abono (+20 pts), esquivando rayos UV extremos (-15 pts). Al terminar, convierte los puntos en monedas reales dentro de la app.
   - **Trivia del Campo:** Un quiz interactivo de 5 preguntas divertidas sobre plantas, cuidado del agua y agricultura en Sinaloa, con retroalimentación inmediata y recompensa de 15 monedas por respuesta correcta.

3. **Mi Kit Real (Progreso Físico):**
   - Formulario con soporte de cámara (`<input type="file" accept="image/*" capture="environment" />`) para subir la foto semanal de la maceta física real, añadir una nota corta y guardar el registro con fecha.
   - Línea de tiempo visual ("Antes y Después") comparando las semanas y mostrando recomendaciones automáticas de cuidado según la semana de cultivo.

4. **Tienda y Estilo:**
   - Sistema para comprar y equipar ítems usando las monedas ganadas: 4 estilos de maceta, 4 accesorios para la planta (lentes de sol, sombrero de palma, gorra, moño) y 3 fondos de escenario (Patio Soleado, Valle de Culiacán, Invernadero). Los ítems equipados deben verse puestos en el SVG de la pantalla "Mi Planta".

5. **Guía IA ("Sabi"):**
   - Interfaz de chat infantil con un personaje guía llamado Sabi. Incluye chips de preguntas rápidas ("¿Cuánta agua necesita mi kit?", "¿Por qué hace tanto calor?", "¿Qué se cultiva en Sinaloa?") y un endpoint `/api/chat` listo para conectar con Gemini API (con respuestas educativas preprogramadas de respaldo si no hay API key configurada).

### 4. Entrega Inicial
Genera toda la estructura de archivos limpia, modular (`src/components/...`, `src/lib/...`, `src/app/...`), con datos iniciales realistas en español, botones grandes con estilo táctil 3D (`border-b-4 active:border-b-0`), y al finalizar dime exactamente qué comandos ejecutar en la terminal para levantar el proyecto y qué tablas crear en Supabase.
```