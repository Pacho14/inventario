# Casa de Oficios · Inventario WebAR

Inventario web mobile-first para explorar piezas y reconocer marcadores fiduciales ArUco. El GLB se carga al iniciar el escáner; Three.js representa el modelo en la pose calculada para el marcador.

## Iniciar

```sh
npm install
npm run dev
```

Abre la URL local que indica Vite. El acceso a cámara funciona en `localhost`; para probar desde un celular se necesita servir el sitio por HTTPS.

## Marcadores fiduciales

El escáner usa ArUco mediante `js-aruco2`, detector JavaScript de marcadores cuadrados que entrega esquinas para estimar la pose. Abre `/compile-target.html?id=0` para el marcador del Tapete de mota y `/compile-target.html?id=1` para el Anillo Ancestral. La página genera y descarga el SVG asociado a cada registro. Necesita conexión a Internet para cargar el generador y detector desde jsDelivr.

## Añadir piezas

Edita `public/data/inventory.json` para agregar registros. Asigna un `markerId` ArUco que no esté repetido; el escáner busca automáticamente todos los IDs registrados y carga el modelo de la pieza reconocida. Copia los GLB a `public/assets/models` y las imágenes de referencia a `public/assets/images`. La autoría de las piezas sigue pendiente de confirmación.

No hay backend ni almacenamiento administrativo: el inventario es JSON local y los archivos se agregan al proyecto. El catálogo es una alternativa de exploración; el visor principal es la cámara con seguimiento del marcador.

## Recursos recibidos

- `img target.jpg` → marcador índice `0`.
- `motas1.glb` → modelo actual del Tapete de mota.
- `Anillo Ancestral.glb` → modelo de `public/assets/models/anillo-ancestral.glb`, ArUco ID 1.
- Las imágenes de materia prima se sirven optimizadas en WebP dentro de las fichas; las portadas se mantienen como recursos independientes para cada pieza.

El GLB suministrado es glTF 2.0 y pesa aproximadamente 480 KiB. No se verificó el seguimiento físico en un teléfono durante esta implementación.
