# Reglas Obligatorias de Desarrollo - Bandaro Monorepo

Estas reglas son mandatorias, inviolables y deben cumplirse en **cualquier cambio, nueva funcionalidad o petición futura** en el repositorio.

---

### Regla 1: Validación y Adaptación de Idioma (i18n)
- Siempre que se realice un nuevo desarrollo o se agregue/modifique texto, labels, tooltips, modales, alertas o mensajes, se debe validar y adaptar tanto al **inglés (en)** como al **español (es)**, tal como está construida toda la aplicación.
- Utilizar el sistema de traducción existente (`useI18n()` / `MESSAGES` / `language === 'en' ? ... : ...`).
- Queda terminantemente prohibido dejar textos únicamente en inglés o únicamente en español.

---

### Regla 2: Soporte Completo de Colores (Modo Oscuro y Modo Claro)
- Los colores de la aplicación y de cualquier componente nuevo o modificado deben ajustarse estrictamente al tema de la aplicación (`getPalette(colorScheme)`, `useColorScheme()`, tokens de `theme`).
- Todo componente, panel, modal, botón y texto debe lucir consistente, legible y contrastado tanto en **modo oscuro** (`dark`) como en **modo claro** (`light`).

---

### Regla 3: Reseteo de Efecto, Tome de Bola y Potencia a 0 tras cada Tiro
- Por defecto, cada vez que se ejecute un tiro en el simulador (`executeShot` / botón de disparo), se deben resetear de inmediato a 0:
  1. **Efecto (Spin / English)** $\to$ `{ x: 0, y: 0, magnitude: 0 }`.
  2. **Tome de bola (Thickness / Cut offset)** $\to$ 0 (mira directa centrada sin corte lateral).
  3. **Potencia (Power)** $\to$ 0 (0% y nivel 0).

---

### Regla 4: Configuración por Defecto de Guías en Línea Recta
- Por defecto, la configuración de las guías de apuntado y visualización debe ser **línea recta** (`aimMode: 'straight'`, `strokeStyle: 'solid'`).
- Al resetear o iniciar un tiro, las guías vuelven a su configuración por defecto recta.

---

### Regla 5: Visualización de Trayectorias Post-Tiro y Eliminación tras 1 Segundo
- Luego de realizar la ejecución de un tiro en el simulador, se mostrará la trayectoria recorrida de cada una de las bolas, con su respectivo color oficial (`Blanca: #ffffff`, `Amarilla: #facc15`, `Roja: #ef4444`), también en **línea recta** (tramos simplificados sin ruidos colineales).
- Estas trayectorias se **eliminarán automáticamente exactamente 1 segundo después** de que hayan parado todas las bolas.

---

### Regla 6: Ocultamiento del Taco y Guías en Modo Edición
- Cuando el simulador se encuentre en **modo edición** (`isEditMode === true`):
  1. El **taco de billar** NO se mostrará.
  2. Las **guías de apuntado y bola fantasma** NO se mostrarán.
- Solo se muestran los elementos propios de la edición (bolas interactivas arrastrables y controles de edición).

---

### Regla 7: Color Propio e Invariable del Simulador
- El color del simulador (paño, bandas, maderas y bordes) será el propio configurado por defecto en las preferencias de la mesa.
- **NO tomará colores del catálogo** ni modificará los bordes u otros elementos del marco de la mesa según la categoría o jugada que se vaya a realizar.

---

### Regla 8: Modelo de Apuntar por Defecto Corto (Estilo 8-Ball / Bola Fantasma)
- El modelo de apuntado por defecto es **corto**:
  1. Línea recta desde la bola tiradora hasta el punto de contacto (bola fantasma) de la primera bola objetivo.
  2. Círculo de la **bola fantasma** en el punto de contacto reglamentario.
  3. Desvío corto en línea recta para la bola tiradora tras el impacto (~18 cm).
  4. Trayectoria corta en línea recta para la bola objetivo tras el impacto (~18 cm).
  5. En caso de no haber impacto directo con bola, trazo recto hasta la primera banda con rebote corto.

---

### Regla 9: Modales Responsive, Adaptativos y Temáticos
- Todos los modales deben ser **completamente responsive**:
  1. Su tamaño (`width`, `height`, `maxWidth`, `maxHeight`) debe adaptarse a las dimensiones de la pantalla donde se visualiza (mobile portrait, mobile landscape, tablet, desktop/web).
  2. En pantallas con altura o anchura reducida, el contenido debe estar dentro de un `ScrollView` que no desborde ni tape los botones de cierre o acción.
  3. Los fondos, bordes y textos deben adaptarse dinámicamente al modo oscuro y modo claro según la paleta de la aplicación.

---

### Regla 10: Prohibición Estricta de Commits sin Aprobación y Pruebas
- **NUNCA** hacer commit en Git de alguna funcionalidad o cambio sin:
  1. Haber sido verificado y probado exhaustivamente (tests automáticos y validaciones de tipos).
  2. Haber sido **explícitamente solicitado y autorizado el commit por el usuario**.

---

### Regla 11: Ubicación Canónica de Llegadas y Límite No Negativo en Sistemas de Billar
- En todos los sistemas de billar a 3 bandas (Base 50, Sistema Conti, etc.):
  1. Las **Salidas** y los **Ataques** se miden, proyectan y ubican sobre los **diamantes** (marco exterior de madera de la mesa).
  2. **TODAS las Llegadas** (3ª banda y 4ª banda) siempre van **frente al caucho, es decir en la banda** (en el filo de goma / cushion nose interior). **Solo las llegadas**.
  3. Queda terminantemente prohibido posicionar las llegadas sobre los diamantes de madera del marco exterior o hacer que se superpongan en la misma línea exterior que las salidas o los ataques.
  4. **Prohibición Estricta de Números Negativos**: El sistema **no permite números negativos**. El límite inferior del sistema es **cero (0) en ataque** (en la esquina de 1ª a 2ª banda) y **cero (0) en llegada** (en la esquina de 2ª a 3ª banda). Ninguna fórmula, pin o selector puede arrojar o mostrar números negativos ($\text{Ataque} \ge 0, \text{Llegada} \ge 0$).
  5. **Escalas Canónicas Base 50 (Arista Abajo-Izquierda)**:
     - **Ataque (1ª Banda - Superior de der a izq)**: `0` (límite en esquina), `10`, `20`, `30`, `40`, `50`, `70`, `90`.
     - **Llegada (3ª Banda - Inferior frente al caucho)**: `0` (en la esquina), `10`, `20`, `30`, `45`, `60`, `80`, `100`.


