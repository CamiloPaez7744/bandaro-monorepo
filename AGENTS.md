# Reglas Inviolables del Repositorio Bandaro

Todas las peticiones y tareas en este proyecto deben seguir estrictamente estas 10 reglas:

1. **Bilingüe (EN/ES)**: Siempre que se haga un nuevo desarrollo o cambio de texto, debe validarse e implementarse en inglés y español.
2. **Modo Claro y Oscuro**: Colores y componentes deben ajustarse dinámicamente al tema (`isDark`, `palette`, `useColorScheme`).
3. **Reseteo tras Tiro**: Al ejecutar un tiro en el simulador, se deben resetear efecto, tome de bola y potencia a 0.
4. **Guías en Línea Recta por Defecto**: La configuración inicial y por defecto de las guías es línea recta (`straight` / `solid`).
5. **Trayectorias Post-Tiro y Borrado tras 1s**: Al terminar un tiro, se muestra la trayectoria en línea recta con su color reglamentario (Blanca: `#ffffff`, Amarilla: `#facc15`, Roja: `#ef4444`), y se eliminan 1 segundo después de que paren las bolas.
6. **Modo Edición Limpio**: En modo edición, el taco y las guías NO se mostrarán.
7. **Color Propio del Simulador**: La mesa y sus marcos no adoptan colores del catálogo ni colorean sus bordes según la jugada.
8. **Apuntado Corto por Defecto**: El modelo de apuntado por defecto es corto (línea recta a bola fantasma, círculo de impacto, y desvíos cortos rectos para ambas bolas).
9. **Modales Responsive**: Todos los modales deben ser responsive, con scroll interior y adaptables al tamaño de pantalla y tema.
10. **Commits Prohibidos sin Autorización**: NUNCA hacer commit sin haber probado la funcionalidad y sin que el usuario lo haya pedido explícitamente.
