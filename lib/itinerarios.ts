import { parsearClaveRuta } from './constantes';
import {
  Itinerario,
  alternarDestinoItinerario,
  crearItinerario,
} from './supabase-db';

type RutaSugerida = {
  id?: string | number;
  titulo?: string;
  estado: string;
  nivel: string;
};

export function encontrarItinerarioCreado(
  anteriores: Itinerario[],
  siguientes: Itinerario[],
  nombreNuevo: string
): Itinerario | undefined {
  const idsPrevios = new Set(anteriores.map(iti => iti.id));
  return (
    siguientes.find(iti => !idsPrevios.has(iti.id) && iti.nombre === nombreNuevo) ??
    siguientes.find(iti => !idsPrevios.has(iti.id))
  );
}

export async function crearItinerarioYAgregarDestino(params: {
  usuarioId: string;
  nombreNuevo: string;
  claveDestino: string;
  itinerariosActuales: Itinerario[];
}): Promise<Itinerario[]> {
  const { usuarioId, nombreNuevo, claveDestino, itinerariosActuales } = params;
  const nuevos = await crearItinerario(usuarioId, nombreNuevo);
  const itinerarioCreado = encontrarItinerarioCreado(itinerariosActuales, nuevos, nombreNuevo);
  if (!itinerarioCreado) return nuevos;
  return alternarDestinoItinerario(usuarioId, itinerarioCreado.id, claveDestino);
}

export function resolverRutaDesdeClave(clave: string, sugeridas: RutaSugerida[]) {
  const parsed = parsearClaveRuta(clave);
  const sugerida = sugeridas.find(
    s => String(s.id) === clave || (s.estado === parsed.estado && s.nivel === parsed.nivel)
  );

  if (sugerida) {
    return {
      clave,
      titulo: sugerida.titulo ?? sugerida.estado,
      estado: sugerida.estado,
      nivel: sugerida.nivel,
    };
  }

  return {
    clave,
    titulo: parsed.estado,
    estado: parsed.estado,
    nivel: parsed.nivel,
  };
}
