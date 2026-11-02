export async function getInventory() {
  const response = await fetch('/data/inventory.json');
  if (!response.ok) throw new Error('No se pudo leer el inventario.');
  return response.json();
}
