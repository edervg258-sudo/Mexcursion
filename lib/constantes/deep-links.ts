import * as Linking from 'expo-linking';

// Expo Router ignora los grupos (paréntesis) en la URL pero los acepta en el path.
// Usar la ruta completa con (tabs) garantiza que el deep link
// mexcursion://detalle?nombre=X&categoria=Y abra la pantalla correcta.

export function crearUrlDestino(nombre: string, categoria: string): string {
  return Linking.createURL('/(tabs)/detalle', {
    queryParams: { nombre, categoria },
  });
}
