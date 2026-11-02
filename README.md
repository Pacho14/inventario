# Casa de Oficios · Inventario WebAR

Inventario web mobile-first para explorar piezas y reconocer marcadores fiduciales ArUco. El GLB se carga al iniciar el escáner; Three.js representa el modelo en la pose calculada para el marcador.

## Iniciar

```sh
npm install
npm run dev
```

Abre la URL local que indica Vite. El acceso a cámara funciona en `localhost`; para probar desde un celular se necesita servir el sitio por HTTPS.

## Marcador fiducial

El escáner usa ArUco ID 0 mediante `js-aruco2`, detector JavaScript de marcadores cuadrados que entrega esquinas para estimar la pose. Abre `/compile-target.html` para ver e imprimir el SVG ArUco. Usa el ID 0 para la pieza Tapete de mota. Necesita conexión a Internet para cargar el detector desde jsDelivr.

## Añadir piezas

Edita `public/data/inventory.json` para agregar registros. Vincula `markerId` al ID ArUco impreso y registra el modelo GLB y su imagen de referencia. Copia recursos a `public/assets/models`, `public/assets/targets` y `public/assets/images`. El contenido técnico actual está señalado como pendiente, porque no se suministraron datos del taller.

No hay backend ni almacenamiento administrativo: el inventario es JSON local y los archivos se agregan al proyecto. El catálogo es una alternativa de exploración; el visor principal es la cámara con seguimiento del marcador.

## Recursos recibidos

- `img target.jpg` → marcador índice `0`.
- `Tapete de Mota.glb` → modelo asociado.

El GLB suministrado es glTF 2.0 y pesa aproximadamente 480 KiB. No se verificó el seguimiento físico en un teléfono durante esta implementación.
