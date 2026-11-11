# Registro de cambios

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
