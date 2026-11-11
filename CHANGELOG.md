# Registro de cambios

## [0.1.0] - 2026-11-10

- Primera versión de MATRE Pedidos.
- Importación de catálogo desde Excel (.xls / .xlsx) o CSV, con detección de columnas y vista previa antes de confirmar.
- Búsqueda específica: coincidencia exacta arriba como "Coincide", parecidos abajo como "Parecido · no exacto", y lo que no coincide no aparece. Entiende medidas en palabras ("media pulgada" = 1/2, "1 y media" = 1 1/2).
- Pedido: hoja de cantidad con stepper y número, nada se agrega sin confirmar; editar cantidad por línea, quitar líneas y totales (N productos · M piezas).
- Exportar pedido a Excel con Clave, Descripción y Cantidad a pedir.
- Respaldo JSON del catálogo y del pedido (exportar e importar).
- Funciona sin conexión (PWA con service worker).
