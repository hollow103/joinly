# _archivo — restos de la sesión anterior (incompletos)

Estos son los **únicos** ficheros que se han podido recuperar de la primera
versión del rebranding (la que **mantenía el radar concéntrico** como patrón de
descubrimiento):

- `Main.dc.html` — mesa resumen antigua ("Editorial claro / Geométrica viva / Profundidad").
- `canvas.json` — layout antiguo.

## Qué falta y por qué

El `canvas.json` de arriba referencia nueve mesas que **no existen** y no se
pueden recuperar:

```
direccion-a/  RadarA.dc.html   DetalleA.dc.html   MarcaA.dc.html
direccion-b/  RadarB.dc.html   DetalleB.dc.html   MarcaB.dc.html
direccion-c/  RadarC.dc.html   DetalleC.dc.html   MarcaC.dc.html
```

Se borraron al rehacer el rebranding. No estaban en git (eran ficheros sin
seguimiento), `rm` no pasa por la papelera, y no hay copia en Time Machine ni en
el índice de Spotlight. Su contenido no llegó a leerse en la sesión actual, así
que tampoco se puede reconstruir textualmente.

## Estado actual

El trabajo vivo está en `mobile/rebranding/` (fuera de esta carpeta):
tres direcciones nuevas que **rompen con el radar**, organizadas en
`direccion-a/`, `direccion-b/` y `direccion-c/`, más `Main.dc.html` y
`canvas.json`. Esta carpeta `_archivo/` es solo referencia histórica; no entra
en el lienzo publicado.
