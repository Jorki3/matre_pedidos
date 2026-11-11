# MATRE Pedidos

Arma tu pedido caminando por la ferretería: busca el producto, pon la cantidad y exporta el pedido en Excel.

## Cómo se usa

1. **Catálogo**: importa tu catálogo en Excel (.xls / .xlsx) o CSV con las columnas Clave, Descripción, Existencia y Clave alterna (opcional). Revisa la vista previa y confirma.
2. **Buscar**: escribe la descripción, la clave o la clave alterna. La coincidencia exacta aparece arriba como **Coincide** y los parecidos abajo como **Parecido · no exacto**. Toca un producto para agregarlo.
3. **Mi pedido**: confirma la cantidad de cada producto, edita o quita líneas, y toca **Exportar pedido** para descargar el Excel con Clave, Descripción y Cantidad a pedir.
4. **Respaldo**: exporta o importa una copia JSON del catálogo y del pedido.

La búsqueda entiende medidas en palabras: "brocha de media pulgada" encuentra la brocha de 1/2, y "brocha de 1 y media" la de 1 1/2.

## Datos

Todo se guarda en tu dispositivo (IndexedDB), funciona sin conexión y no pide cuenta ni contraseña.

## Desarrollo

```bash
bun install
bun run dev        # servidor de desarrollo
bun run check      # revisión de tipos
bun run test       # pruebas con Vitest
bun run build      # salida estática en build/
```

Para publicar en GitHub Pages con la ruta `/matre_pedidos/`, compila con:

```bash
BASE_PATH=matre_pedidos bun run build
```
