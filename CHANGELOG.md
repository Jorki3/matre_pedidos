# Registro de cambios

## [0.1.3] - 2026-11-10

- Corregido: la fecha de las exportaciones usaba UTC y ya pasada la medianoche marcaba el día siguiente (el respaldo JSON salía con 2026-11-11 cuando aquí todavía era 2026-11-10). Ahora el nombre del Excel, el nombre del respaldo JSON y la fecha dentro del respaldo usan la fecha y hora local del dispositivo.
- Cambiado: los emojis de la interfaz ahora son iconos (lupa en Buscar, lista en Mi pedido, caja en Catálogo, disquete en Respaldo y una X para quitar líneas). Ya no hay emojis en la app.

## [0.1.2] - 2026-11-10

- Añadido: lista de dictado en Mi pedido. Cada línea tiene una casilla grande para marcar lo que ya se dictó o pidió; la línea marcada se ve tachada y atenuada, con su casilla en verde. Arriba se ve el progreso: "N de M dictados".
- Añadido: botón "Limpiar marcas" para desmarcar todo sin tocar el pedido (no borra productos ni cantidades).
- Las marcas se guardan igual que el pedido: en el mismo instante y sobreviven a actualizar la página.

## [0.1.1] - 2026-11-10

- Corregido: el pedido se podía perder al actualizar la página. Las escrituras del pedido eran asíncronas y nunca se esperaban, así que un refresh mataba la escritura en vuelo y nada avisaba. Ahora cada cambio se guarda en el mismo instante en un espejo síncrono, las escrituras a la base van en serie y siempre se esperan, y si el pedido cambia en otra pestaña esta se actualiza.
- Añadido: en el buscador, el producto que ya está en el pedido muestra "Ya está en la lista · N piezas".
- Añadido: la hoja de cantidad abre con la cantidad que ya llevas de ese producto y al confirmar ajusta esa línea (no duplica ni suma otra).

## [0.1.0] - 2026-11-10

- Primera versión de MATRE Pedidos.
- Importación de catálogo desde Excel (.xls / .xlsx) o CSV, con detección de columnas y vista previa antes de confirmar.
- Búsqueda específica: coincidencia exacta arriba como "Coincide", parecidos abajo como "Parecido · no exacto", y lo que no coincide no aparece. Entiende medidas en palabras ("media pulgada" = 1/2, "1 y media" = 1 1/2).
- Pedido: hoja de cantidad con stepper y número, nada se agrega sin confirmar; editar cantidad por línea, quitar líneas y totales (N productos · M piezas).
- Exportar pedido a Excel con Clave, Descripción y Cantidad a pedir.
- Respaldo JSON del catálogo y del pedido (exportar e importar).
- Funciona sin conexión (PWA con service worker).
