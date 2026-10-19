---
name: diseno-no-generico
description: Usar esta skill SIEMPRE que se cree o modifique cualquier componente visual, página o sección de la app (botones, cards, navegación, formularios, layouts). El objetivo es que el diseño se vea como el de un producto real hecho por un equipo de diseño, no como el resultado default de una IA generando UI.
---

# Diseño que no parece hecho por IA

## El problema que resolvemos
Las IAs (incluida yo) tienden a converger en los mismos patrones cuando generan UI sin dirección específica: gradientes violeta-a-azul, `shadow-lg` genérico en todo, glassmorphism (frosted-glass) puesto porque sí, cards idénticas con ícono arriba y borde de color a la izquierda, badges centrados sobre un título, secuencias "1, 2, 3" con números en círculos, tipografía Inter sin jerarquía, y un único radio de borde (`rounded-xl`) repetido en todo. El resultado es "correcto" pero se siente intercambiable con cualquier otra app hecha con IA — a esto se lo conoce como "AI slop" de diseño.

Esta skill existe para evitar eso activamente en lavado-express, respetando siempre la identidad visual y la paleta que el proyecto ya tiene definida (no se trata de inventar un branding nuevo, sino de ejecutarlo con criterio real de producto).

## Reglas concretas antes de escribir cualquier estilo

### Color
1. **Prohibido el gradiente default IA**: nada de `from-purple-500 to-blue-500` ni variantes similares salvo que se pida explícitamente. Si hace falta un acento, usar un color sólido de la paleta del proyecto, o un gradiente sutil dentro de la MISMA familia de color (ej: verde a verde más oscuro, nunca entre colores opuestos).
2. **Contraste real en modo oscuro**: el texto secundario en dark mode debe cumplir al menos 4.5:1 de contraste contra el fondo. Nada de gris clarito sobre negro que se lea mal — es un error muy común en UI generada por IA y se nota enseguida.
3. **Un único acento, bien usado**: el color de acento de la marca se reserva para lo que realmente importa (CTA principal, estado activo, dato destacado). Si todo tiene color de acento, no destaca nada.

### Componentes y layout
4. **Un solo "primitivo" visual repetido con criterio, no siete estilos mezclados**: elegir un estilo de card, un radio de borde, una altura de botón — y aplicarlo consistentemente en toda la app. Mezclar `rounded-lg` en un lado y `rounded-2xl` en otro es la señal más clara de que distintas partes fueron generadas sin mirarse entre sí.
5. **Nada de glassmorphism por default**: evitar el efecto "vidrio esmerilado" (`backdrop-blur` + fondo semitransparente) a menos que ya sea parte del lenguaje visual existente del proyecto. Preferir fondos sólidos o superposiciones simples con borde.
6. **Cards sin fórmula única**: evitar que todas las cards repitan exactamente el mismo patrón (ícono arriba a la izquierda + borde de color al costado + título + texto). Variar el tratamiento según la importancia de la información: no todo necesita el mismo envoltorio.
7. **Sombras con propósito, no decorativas**: evitar `shadow-lg`/`shadow-xl` puestas "porque sí" en todas las cards. Reservar sombras marcadas solo para elementos realmente elevados (modales, botones flotantes tipo WhatsApp); el resto con sombras sutiles o simplemente bordes de 1px.

### Tipografía y jerarquía
8. **Jerarquía real, no un solo tamaño repetido**: título grande y con peso, texto secundario más chico y con contraste medio (nunca casi invisible), metadatos aún más chicos. Cada pantalla debe tener al menos 3 niveles tipográficos antes de darla por terminada.
9. **Nada de mayúsculas por default en labels**: usar sentence case u oración normal en encabezados de sección, salvo que ya sea una convención existente del proyecto — el "ALL CAPS" en todo es otro tic reconocible de UI genérica.
10. **Reemplazar la tipografía genérica por una pareja con identidad propia**: si el proyecto todavía usa Inter/system-ui por default en todo, reemplazarla por una combinación con más carácter — por ejemplo una fuente display con algo de personalidad para títulos (Geist, Sora, Manrope o similar) combinada con una fuente más neutra para texto de cuerpo (la misma Inter sirve bien acá, o system-ui). La idea no es una tipografía "bonita" suelta, sino una pareja título/cuerpo que se sienta elegida a propósito, no la que trae Tailwind por default. Definirla una sola vez (como variable de Tailwind config o CSS) y aplicarla consistente en toda la app — no mezclar tipografías entre pantallas.

### Íconos y navegación
11. **Íconos con criterio, no decoración**: no poner un ícono al lado de cada palabra "porque queda prolijo". Usarlos solo donde ayudan a escanear más rápido (estados, acciones primarias, navegación). Revisar la librería de íconos ya usada en el proyecto antes de sumar otra.
12. **Nada de emojis como reemplazo de íconos** en navegación o UI seria (sí están bien en mensajes de chat o notificaciones informales, si el tono del producto ya lo admite).

### Detalles de producto maduro
13. **Estados vacíos diseñados**, no un simple "No hay datos": mensaje breve + acción sugerida.
14. **Estados de carga con skeletons**, no solo un spinner genérico centrado.
15. **Micro-interacciones con timing real**: transiciones de 150-250ms en hovers y cambios de estado — ni instantáneo (se siente roto) ni de 500ms+ (se siente lento).
16. **Datos formateados como en un producto real**: moneda con separador de miles, fechas relativas ("hace 2 horas") en vez de timestamps crudos.
17. **Nada de placeholders con cara de placeholder**: si falta contenido real, usar datos de ejemplo creíbles para el rubro (nombres argentinos comunes, direcciones de zonas reales si aplica, precios en pesos con montos realistas) en vez de "Lorem ipsum", "Usuario 1" o "test@test.com".

### Copy (si en algún momento se toca texto de UI, no de contenido del negocio)
18. **Evitar palabras gastadas de landing genérica** tipo "Potenciá", "Desbloqueá", "Transformá tu experiencia" o títulos de feature abstractos ("Integración perfecta") cuando se pueda decir lo mismo de forma directa y concreta.

## Consistencia con lo que YA existe (regla más importante de todas)
Antes de definir cualquier estilo nuevo, revisar los componentes ya construidos en el proyecto (colores usados, radios de borde, familia tipográfica, espaciados, tratamiento de sombras) y seguir esos patrones. Un componente nuevo con un estilo distinto al resto es la señal más clara de que "lo agregó una IA sin mirar el resto". Esta skill nunca autoriza inventar una paleta o un sistema de diseño nuevo — solo ejecutar el existente con más criterio, salvo el cambio de tipografía indicado en el punto 10, que sí está permitido hacer una vez y de forma consistente en todo el proyecto.

## Guardia automática: un linter para las reglas de color/estilo
Un linter es una herramienta que revisa el código automáticamente y avisa (o directamente rompe el build) cuando encuentra un patrón prohibido. Configurar un linter para esta skill sirve para que, aunque en el futuro se agregue código nuevo (por otra sesión de Claude Code, u otra persona), no se cuelen silenciosamente los patrones que esta skill prohíbe.

Qué hacer:
- Agregar una regla de ESLint (o el linter que ya use el proyecto) que falle el build si aparecen en el código clases de Tailwind como `from-purple-500`, `to-blue-500`, `backdrop-blur` combinado con fondo semitransparente, u otras clases específicas que se quieran bloquear según la paleta real del proyecto
- Esto se configura una sola vez en el archivo de configuración del linter (por ejemplo `.eslintrc` o el archivo equivalente que use el proyecto) con una regla de "no-restricted-syntax" o similar sobre esos strings de clases
- No hace falta que el usuario entienda los detalles técnicos de esto — es tarea de Claude Code implementarlo cuando se le pida explícitamente "agregá un linter que bloquee los patrones prohibidos de esta skill"

## Antes de dar por terminado cualquier cambio visual
Preguntarse: "¿esto se parece a una pantalla de un producto que la gente usa de verdad (Rappi, MercadoLibre, Uber), o se parece a un mockup genérico de IA?" Si se parece más a lo segundo, revisar contra los puntos de arriba antes de entregar.

## Antes de dar por terminado cualquier cambio visual
Preguntarse: "¿esto se parece a una pantalla de un producto que la gente usa de verdad (Rappi, MercadoLibre, Uber), o se parece a un mockup genérico?" Si se parece más a lo segundo, revisar contra los puntos de arriba antes de entregar.
