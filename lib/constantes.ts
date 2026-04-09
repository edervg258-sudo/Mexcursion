// ============================================================
//  lib/constantes.ts  —  Datos compartidos entre pantallas
// ============================================================

// ===========================
//  TIPOS Y CATEGORÍAS
// ===========================

export type CategoriaEstado = 'Aventura' | 'Playa' | 'Cultura' | 'Gastronomía' | 'Ciudad';
export type Nivel = 'economico' | 'medio' | 'premium';

export const ETIQUETA_NIVEL: Record<Nivel, string> = {
  economico: 'Económico',
  medio: 'Medio',
  premium: 'Premium'
};

export const CATEGORIAS: CategoriaEstado[] = [
  'Aventura',
  'Playa', 
  'Cultura',
  'Gastronomía',
  'Ciudad'
];

// ===========================
//  RUTAS Y SUGERENCIAS
// ===========================

export interface Sugerencia {
  id: string;
  titulo: string;
  estado: string;
  hotel: string;
  precioHotel: string;
  estilo: string;
  restaurante: string;
  precioRestaurante: string;
  nivel: Nivel;
  imagen: string;
}

export const SUGERENCIAS_RUTAS: Sugerencia[] = [
  // ── QUINTANA ROO ──────────────────────────────────────────────────────────
  { id: 'Quintana Roo|premium',   titulo: 'Tulum de Lujo',        estado: 'Quintana Roo',       hotel: 'Wakax Hacienda Cenote',        precioHotel: 'Desde $3,000/noche', estilo: 'Lujo, naturaleza',         restaurante: 'Rosa Negra',                  precioRestaurante: '$2,000/persona', nivel: 'premium',  imagen: 'https://picsum.photos/seed/tulum/800/600' },
  { id: 'Quintana Roo|medio',     titulo: 'Cancún & Playa',       estado: 'Quintana Roo',       hotel: 'Marriott Cancún Resort',       precioHotel: 'Desde $2,200/noche', estilo: 'Playa, resort',            restaurante: 'El Fish Fritanga',            precioRestaurante: '$500/persona',   nivel: 'medio',    imagen: 'https://picsum.photos/seed/cancun/800/600' },
  { id: 'Quintana Roo|economico', titulo: 'Riviera Maya',         estado: 'Quintana Roo',       hotel: 'Hostal Cozumel',               precioHotel: 'Desde $400/noche',   estilo: 'Playa, mochilero',         restaurante: 'El Pescador',                 precioRestaurante: '$150/persona',   nivel: 'economico', imagen: 'https://picsum.photos/seed/riviera/800/600' },
  // ── YUCATÁN ───────────────────────────────────────────────────────────────
  { id: 'Yucatán|premium',        titulo: 'Mérida Exclusiva',     estado: 'Yucatán',            hotel: 'Chablé Resort & Spa',          precioHotel: 'Desde $4,500/noche', estilo: 'Lujo maya contemporáneo',  restaurante: "Ixi'im Restaurant",           precioRestaurante: '$1,800/persona', nivel: 'premium',  imagen: 'https://picsum.photos/seed/merida/800/600' },
  { id: 'Yucatán|medio',          titulo: 'Chichén Itzá',         estado: 'Yucatán',            hotel: 'Hotel Mayaland',               precioHotel: 'Desde $1,800/noche', estilo: 'Cultural, histórico',      restaurante: 'Hacienda Chichén',            precioRestaurante: '$800/persona',   nivel: 'medio',    imagen: 'https://picsum.photos/seed/chichenitza/800/600' },
  { id: 'Yucatán|economico',      titulo: 'Mérida Colonial',      estado: 'Yucatán',            hotel: 'Hostal Nomadas',               precioHotel: 'Desde $320/noche',   estilo: 'Cultural, colonial',       restaurante: 'La Chaya Maya',               precioRestaurante: '$150/persona',   nivel: 'economico', imagen: 'https://picsum.photos/seed/merida2/800/600' },
  // ── CHIAPAS ───────────────────────────────────────────────────────────────
  { id: 'Chiapas|premium',        titulo: 'Palenque VIP',         estado: 'Chiapas',            hotel: 'Na Bolom Lodge',               precioHotel: 'Desde $2,800/noche', estilo: 'Lujo, selva lacandona',    restaurante: 'La Viña de Bacco',            precioRestaurante: '$900/persona',   nivel: 'premium',  imagen: 'https://picsum.photos/seed/palenque/800/600' },
  { id: 'Chiapas|medio',          titulo: 'San Cristóbal',        estado: 'Chiapas',            hotel: 'Hotel Casa Mexicana',          precioHotel: 'Desde $980/noche',   estilo: 'Colonial, artesanal',      restaurante: 'TierrAdentro',                precioRestaurante: '$380/persona',   nivel: 'medio',    imagen: 'https://picsum.photos/seed/sancristobal/800/600' },
  { id: 'Chiapas|economico',      titulo: 'Cañón del Sumidero',   estado: 'Chiapas',            hotel: 'Hostal Río Lacanjá',           precioHotel: 'Desde $350/noche',   estilo: 'Naturaleza, aventura',     restaurante: 'El Fogón de Jovel',           precioRestaurante: '$120/persona',   nivel: 'economico', imagen: 'https://picsum.photos/seed/sumidero/800/600' },
  // ── OAXACA ────────────────────────────────────────────────────────────────
  { id: 'Oaxaca|premium',         titulo: 'Oaxaca Gourmet',       estado: 'Oaxaca',             hotel: 'Casa Oaxaca Hotel',            precioHotel: 'Desde $3,200/noche', estilo: 'Gastronomía de autor',     restaurante: 'Alcalá by R. Castellanos',    precioRestaurante: '$1,500/persona', nivel: 'premium',  imagen: 'https://picsum.photos/seed/oaxaca/800/600' },
  { id: 'Oaxaca|medio',           titulo: 'Monte Albán',          estado: 'Oaxaca',             hotel: 'Casa Oaxaca',                  precioHotel: 'Desde $2,200/noche', estilo: 'Cultural, gastronómico',   restaurante: 'Los Danzantes',               precioRestaurante: '$1,200/persona', nivel: 'medio',    imagen: 'https://picsum.photos/seed/monteAlban/800/600' },
  { id: 'Oaxaca|economico',       titulo: 'Oaxaca Artesanal',     estado: 'Oaxaca',             hotel: 'Hostal Casa del Río',          precioHotel: 'Desde $380/noche',   estilo: 'Arte, mole, mezcal',       restaurante: 'Mercado Benito Juárez',       precioRestaurante: '$100/persona',   nivel: 'economico', imagen: 'https://picsum.photos/seed/oaxaca3/800/600' },
  // ── CIUDAD DE MÉXICO ──────────────────────────────────────────────────────
  { id: 'Ciudad de México|premium',  titulo: 'CDMX de Lujo',      estado: 'Ciudad de México',   hotel: 'Gran Hotel CDMX',              precioHotel: 'Desde $4,000/noche', estilo: 'Lujo, urbano, histórico',  restaurante: 'Azul Histórico',              precioRestaurante: '$1,500/persona', nivel: 'premium',  imagen: 'https://picsum.photos/seed/cdmx/800/600' },
  { id: 'Ciudad de México|medio',    titulo: 'Coyoacán & Museos', estado: 'Ciudad de México',   hotel: 'Hotel del Carmen',             precioHotel: 'Desde $900/noche',   estilo: 'Arte, bohemio',            restaurante: 'Los Danzantes Coyoacán',      precioRestaurante: '$500/persona',   nivel: 'medio',    imagen: 'https://picsum.photos/seed/coyoacan/800/600' },
  { id: 'Ciudad de México|economico',titulo: 'Centro Histórico',  estado: 'Ciudad de México',   hotel: 'Hotel Isabel',                 precioHotel: 'Desde $450/noche',   estilo: 'Historia, streetfood',     restaurante: 'Café El Popular',             precioRestaurante: '$120/persona',   nivel: 'economico', imagen: 'https://picsum.photos/seed/centrohistorico/800/600' },
  // ── JALISCO ───────────────────────────────────────────────────────────────
  { id: 'Jalisco|premium',        titulo: 'Guadalajara Premium',  estado: 'Jalisco',            hotel: 'One Hotel Guadalajara',        precioHotel: 'Desde $2,800/noche', estilo: 'Diseño, tradición tapatía',restaurante: 'Alcalde',                     precioRestaurante: '$1,200/persona', nivel: 'premium',  imagen: 'https://picsum.photos/seed/guadalajara/800/600' },
  { id: 'Jalisco|medio',          titulo: 'Guadalajara',          estado: 'Jalisco',            hotel: 'Hotel Morales',                precioHotel: 'Desde $1,200/noche', estilo: 'Tradición, tapatío',       restaurante: 'La Chata',                    precioRestaurante: '$400/persona',   nivel: 'medio',    imagen: 'https://picsum.photos/seed/guadalajara2/800/600' },
  { id: 'Jalisco|economico',      titulo: 'Pueblo Tequila',       estado: 'Jalisco',            hotel: 'Hotel Solar de las Ánimas',    precioHotel: 'Desde $900/noche',   estilo: 'Cultural, gastronómico',   restaurante: 'La Antigua Casona',           precioRestaurante: '$500/persona',   nivel: 'economico', imagen: 'https://picsum.photos/seed/tequila/800/600' },
  // ── GUANAJUATO ────────────────────────────────────────────────────────────
  { id: 'Guanajuato|premium',     titulo: 'San Miguel Allende',   estado: 'Guanajuato',         hotel: 'Hotel Rosewood San Miguel',    precioHotel: 'Desde $4,200/noche', estilo: 'Arte, lujo colonial',      restaurante: 'Moxi by Enrique Olvera',      precioRestaurante: '$1,400/persona', nivel: 'premium',  imagen: 'https://picsum.photos/seed/sanmiguel/800/600' },
  { id: 'Guanajuato|medio',       titulo: 'Guanajuato Ciudad',    estado: 'Guanajuato',         hotel: 'Hotel Boutique 1850',          precioHotel: 'Desde $1,100/noche', estilo: 'Colonial, minero',         restaurante: 'La Capellina',                precioRestaurante: '$500/persona',   nivel: 'medio',    imagen: 'https://picsum.photos/seed/guanajuato/800/600' },
  { id: 'Guanajuato|economico',   titulo: 'Festival Cervantino',  estado: 'Guanajuato',         hotel: 'Hostal Cantarranas',           precioHotel: 'Desde $350/noche',   estilo: 'Cultural, callejones',     restaurante: 'Truco 7',                     precioRestaurante: '$130/persona',   nivel: 'economico', imagen: 'https://picsum.photos/seed/cervantino/800/600' },
  // ── GUERRERO ──────────────────────────────────────────────────────────────
  { id: 'Guerrero|premium',       titulo: 'Acapulco VIP',         estado: 'Guerrero',           hotel: 'Hotel Las Brisas Premium',     precioHotel: 'Desde $3,500/noche', estilo: 'Lujo, playa clásica',      restaurante: 'Pez Vela',                    precioRestaurante: '$900/persona',   nivel: 'premium',  imagen: 'https://picsum.photos/seed/acapulco/800/600' },
  { id: 'Guerrero|medio',         titulo: 'Acapulco',             estado: 'Guerrero',           hotel: 'Hotel Las Brisas',             precioHotel: 'Desde $1,800/noche', estilo: 'Playa, aventura',          restaurante: 'El Amigo Miguel',             precioRestaurante: '$600/persona',   nivel: 'medio',    imagen: 'https://picsum.photos/seed/acapulco2/800/600' },
  { id: 'Guerrero|economico',     titulo: 'Zihuatanejo',          estado: 'Guerrero',           hotel: 'Posada La Noria',              precioHotel: 'Desde $500/noche',   estilo: 'Playa tranquila',          restaurante: 'El Patio',                    precioRestaurante: '$220/persona',   nivel: 'economico', imagen: 'https://picsum.photos/seed/zihuatanejo/800/600' },
  // ── PUEBLA ────────────────────────────────────────────────────────────────
  { id: 'Puebla|premium',         titulo: 'Puebla Gourmet',       estado: 'Puebla',             hotel: 'NH Collection Puebla',         precioHotel: 'Desde $2,500/noche', estilo: 'Alta cocina, historia',    restaurante: 'Ephimera',                    precioRestaurante: '$1,100/persona', nivel: 'premium',  imagen: 'https://picsum.photos/seed/puebla/800/600' },
  { id: 'Puebla|medio',           titulo: 'Centro Histórico',     estado: 'Puebla',             hotel: 'Hotel Camino Real Puebla',     precioHotel: 'Desde $1,400/noche', estilo: 'Colonial, cultural',       restaurante: 'La China Poblana',            precioRestaurante: '$500/persona',   nivel: 'medio',    imagen: 'https://picsum.photos/seed/puebla2/800/600' },
  { id: 'Puebla|economico',       titulo: 'Cholula & Pirámide',   estado: 'Puebla',             hotel: 'Hostal Allende',               precioHotel: 'Desde $300/noche',   estilo: 'Historia, cerveza artesanal',restaurante: 'Fonda Santa Clara',           precioRestaurante: '$150/persona',   nivel: 'economico', imagen: 'https://picsum.photos/seed/cholula/800/600' },
  // ── VERACRUZ ──────────────────────────────────────────────────────────────
  { id: 'Veracruz|premium',       titulo: 'Veracruz Premium',     estado: 'Veracruz',           hotel: 'Galería Plaza Veracruz',       precioHotel: 'Desde $2,000/noche', estilo: 'Puerto, historia',         restaurante: 'Villa Rica Mocambo',          precioRestaurante: '$800/persona',   nivel: 'premium',  imagen: 'https://picsum.photos/seed/veracruz/800/600' },
  { id: 'Veracruz|medio',         titulo: 'Tajín & Costa',        estado: 'Veracruz',           hotel: 'Hotel Misión Papantla',        precioHotel: 'Desde $900/noche',   estilo: 'Arqueología, playa',       restaurante: 'El Tajín Restaurant',         precioRestaurante: '$300/persona',   nivel: 'medio',    imagen: 'https://picsum.photos/seed/tajin/800/600' },
  { id: 'Veracruz|economico',     titulo: 'Puerto Jarocho',       estado: 'Veracruz',           hotel: 'Hotel Emporio Veracruz',       precioHotel: 'Desde $1,200/noche', estilo: 'Cultural, playa',          restaurante: 'Gran Café de la Parroquia',   precioRestaurante: '$400/persona',   nivel: 'economico', imagen: 'https://picsum.photos/seed/veracruz3/800/600' },
  // ── MICHOACÁN ─────────────────────────────────────────────────────────────
  { id: 'Michoacán|premium',      titulo: 'Pátzcuaro Boutique',   estado: 'Michoacán',          hotel: 'Hotel Villa Montaña',          precioHotel: 'Desde $2,600/noche', estilo: 'Lujo, cultura purépecha',  restaurante: 'Don Vasco Restaurant',        precioRestaurante: '$900/persona',   nivel: 'premium',  imagen: 'https://picsum.photos/seed/patzcuaro/800/600' },
  { id: 'Michoacán|medio',        titulo: 'Pátzcuaro & Monarca',  estado: 'Michoacán',          hotel: 'Hotel Mansión Iturbe',         precioHotel: 'Desde $950/noche',   estilo: 'Cultural, monarca',        restaurante: 'El Patio',                    precioRestaurante: '$350/persona',   nivel: 'medio',    imagen: 'https://picsum.photos/seed/patzcuaro2/800/600' },
  { id: 'Michoacán|economico',    titulo: 'Santuario Mariposas',  estado: 'Michoacán',          hotel: 'Hostal La Catedral Morelia',   precioHotel: 'Desde $350/noche',   estilo: 'Naturaleza, artesanías',   restaurante: 'Las Mercedes',                precioRestaurante: '$150/persona',   nivel: 'economico', imagen: 'https://picsum.photos/seed/monarca/800/600' },
  // ── SINALOA ───────────────────────────────────────────────────────────────
  { id: 'Sinaloa|premium',        titulo: 'Mazatlán Zona Dorada', estado: 'Sinaloa',            hotel: 'Hotel El Cid Marina',          precioHotel: 'Desde $2,100/noche', estilo: 'Playa, carnaval, lujo',    restaurante: 'Angelo\'s Restaurant',        precioRestaurante: '$800/persona',   nivel: 'premium',  imagen: 'https://picsum.photos/seed/mazatlan/800/600' },
  { id: 'Sinaloa|medio',          titulo: 'Mazatlán',             estado: 'Sinaloa',            hotel: 'Hotel Playa Mazatlán',         precioHotel: 'Desde $800/noche',   estilo: 'Playa, carnaval',          restaurante: 'Pedro & Lola',                precioRestaurante: '$450/persona',   nivel: 'medio',    imagen: 'https://picsum.photos/seed/mazatlan2/800/600' },
  { id: 'Sinaloa|economico',      titulo: 'Mazatlán Histórico',   estado: 'Sinaloa',            hotel: 'Hotel Sinaloa Centro',         precioHotel: 'Desde $420/noche',   estilo: 'Centro histórico, playa',  restaurante: 'El Presidio',                 precioRestaurante: '$180/persona',   nivel: 'economico', imagen: 'https://picsum.photos/seed/mazatlan3/800/600' },
  // ── QUERÉTARO ─────────────────────────────────────────────────────────────
  { id: 'Querétaro|premium',      titulo: 'Querétaro Boutique',   estado: 'Querétaro',          hotel: 'La Casa de la Marquesa',       precioHotel: 'Desde $2,800/noche', estilo: 'Colonial, vinos finos',    restaurante: 'La Viña del Marqués',         precioRestaurante: '$1,000/persona', nivel: 'premium',  imagen: 'https://picsum.photos/seed/queretaro/800/600' },
  { id: 'Querétaro|medio',        titulo: 'Peña de Bernal',       estado: 'Querétaro',          hotel: 'Meson de Bernal',              precioHotel: 'Desde $1,100/noche', estilo: 'Colonial, viticola',       restaurante: 'El Mezquite',                 precioRestaurante: '$420/persona',   nivel: 'medio',    imagen: 'https://picsum.photos/seed/bernal/800/600' },
  { id: 'Querétaro|economico',    titulo: 'Querétaro Histórico',  estado: 'Querétaro',          hotel: 'Hostal 1810',                  precioHotel: 'Desde $380/noche',   estilo: 'Callejones, historia',     restaurante: 'La Flor de Querétaro',        precioRestaurante: '$160/persona',   nivel: 'economico', imagen: 'https://picsum.photos/seed/queretaro3/800/600' },
  // ── SAN LUIS POTOSÍ ───────────────────────────────────────────────────────
  { id: 'San Luis Potosí|premium',titulo: 'Huasteca Premium',     estado: 'San Luis Potosí',    hotel: 'Real de Minas SLP',            precioHotel: 'Desde $2,100/noche', estilo: 'Naturaleza de lujo',       restaurante: 'La Corriente Cebichería',     precioRestaurante: '$900/persona',   nivel: 'premium',  imagen: 'https://picsum.photos/seed/huasteca/800/600' },
  { id: 'San Luis Potosí|medio',  titulo: 'Cascadas Huasteca',    estado: 'San Luis Potosí',    hotel: 'Hotel Valles',                 precioHotel: 'Desde $900/noche',   estilo: 'Cascadas, naturaleza',     restaurante: 'El Callejón',                 precioRestaurante: '$300/persona',   nivel: 'medio',    imagen: 'https://picsum.photos/seed/cascadas/800/600' },
  { id: 'San Luis Potosí|economico',titulo: 'Xilitla Surrealista',estado: 'San Luis Potosí',    hotel: 'Posada El Castillo',           precioHotel: 'Desde $420/noche',   estilo: 'Surrealismo, selva',       restaurante: 'Café Inglés',                 precioRestaurante: '$130/persona',   nivel: 'economico', imagen: 'https://picsum.photos/seed/xilitla/800/600' },
  // ── NUEVO LEÓN ────────────────────────────────────────────────────────────
  { id: 'Nuevo León|premium',     titulo: 'Monterrey Business',   estado: 'Nuevo León',         hotel: 'Galería Plaza Monterrey',      precioHotel: 'Desde $3,200/noche', estilo: 'Negocios, gastronomía regia',restaurante: 'Pangea',                    precioRestaurante: '$1,200/persona', nivel: 'premium',  imagen: 'https://picsum.photos/seed/monterrey/800/600' },
  { id: 'Nuevo León|medio',       titulo: 'Monterrey Cultural',   estado: 'Nuevo León',         hotel: 'Hotel Ancira Hyatt',           precioHotel: 'Desde $1,600/noche', estilo: 'Arte, sierra, urbano',     restaurante: 'El Rey del Cabrito',          precioRestaurante: '$700/persona',   nivel: 'medio',    imagen: 'https://picsum.photos/seed/monterrey2/800/600' },
  { id: 'Nuevo León|economico',   titulo: 'Barrio Antiguo MTY',   estado: 'Nuevo León',         hotel: 'Hostal MTY',                   precioHotel: 'Desde $400/noche',   estilo: 'Barrio Antiguo, cañones',  restaurante: 'Taquitos el Tío',             precioRestaurante: '$180/persona',   nivel: 'economico', imagen: 'https://picsum.photos/seed/barrioAntiguo/800/600' },
  // ── BAJA CALIFORNIA ───────────────────────────────────────────────────────
  { id: 'Baja California|premium',titulo: 'Valle de Guadalupe',   estado: 'Baja California',    hotel: 'Bruma Restaurant & Hotel',     precioHotel: 'Desde $3,800/noche', estilo: 'Enoturismo de lujo',       restaurante: 'Fauna by David Castro',       precioRestaurante: '$1,600/persona', nivel: 'premium',  imagen: 'https://picsum.photos/seed/guadalupe/800/600' },
  { id: 'Baja California|medio',  titulo: 'Ensenada & Vinos',     estado: 'Baja California',    hotel: 'Hotel Misión Santa Isabel',    precioHotel: 'Desde $1,300/noche', estilo: 'Vinos, mariscos',          restaurante: 'Manzanilla',                  precioRestaurante: '$600/persona',   nivel: 'medio',    imagen: 'https://picsum.photos/seed/ensenada/800/600' },
  { id: 'Baja California|economico',titulo: 'Tijuana Gastronómica',estado: 'Baja California',   hotel: 'Hotel Lucerna Tijuana',        precioHotel: 'Desde $700/noche',   estilo: 'Gastronomía urbana',       restaurante: 'Caesar\'s Restaurant',        precioRestaurante: '$250/persona',   nivel: 'economico', imagen: 'https://picsum.photos/seed/tijuana/800/600' },
  // ── BAJA CALIFORNIA SUR ───────────────────────────────────────────────────
  { id: 'Baja California Sur|premium',  titulo: 'Los Cabos Premium',   estado: 'Baja California Sur', hotel: 'The Cape Thompson',       precioHotel: 'Desde $8,000/noche', estilo: 'Ultra lujo, yates, surf',  restaurante: 'El Farallón',                 precioRestaurante: '$2,500/persona', nivel: 'premium',  imagen: 'https://picsum.photos/seed/loscabos/800/600' },
  { id: 'Baja California Sur|medio',    titulo: 'La Paz & Ballenas',   estado: 'Baja California Sur', hotel: 'Hotel Seven Crown La Paz',precioHotel: 'Desde $1,600/noche', estilo: 'Mar de Cortés, naturaleza', restaurante: 'El Bismarkcito',              precioRestaurante: '$500/persona',   nivel: 'medio',    imagen: 'https://picsum.photos/seed/lapaz/800/600' },
  { id: 'Baja California Sur|economico',titulo: 'Loreto & Misiones',   estado: 'Baja California Sur', hotel: 'Hostal Junipero',         precioHotel: 'Desde $500/noche',   estilo: 'Historia, kayak',          restaurante: 'La Palapa',                   precioRestaurante: '$180/persona',   nivel: 'economico', imagen: 'https://picsum.photos/seed/loreto/800/600' },
  // ── HIDALGO ───────────────────────────────────────────────────────────────
  { id: 'Hidalgo|medio',          titulo: 'Prismas Basálticos',   estado: 'Hidalgo',            hotel: 'Camino Real Pachuca',          precioHotel: 'Desde $1,100/noche', estilo: 'Naturaleza, haciendas',    restaurante: 'El Mesón',                    precioRestaurante: '$300/persona',   nivel: 'medio',     imagen: 'https://picsum.photos/seed/prismas/800/600' },
  { id: 'Hidalgo|economico',      titulo: 'Mineral del Monte',    estado: 'Hidalgo',            hotel: 'Posada Real Mineral del Monte', precioHotel: 'Desde $500/noche',  estilo: 'Pueblo mágico, pastes',    restaurante: 'Cantina Real',                precioRestaurante: '$130/persona',   nivel: 'economico', imagen: 'https://picsum.photos/seed/mineral/800/600' },
  // ── NAYARIT ───────────────────────────────────────────────────────────────
  { id: 'Nayarit|premium',        titulo: 'Punta Mita Exclusiva', estado: 'Nayarit',            hotel: 'Four Seasons Punta Mita',      precioHotel: 'Desde $7,000/noche', estilo: 'Lujo absoluto, surf',      restaurante: 'Ketsi',                       precioRestaurante: '$2,000/persona', nivel: 'premium',  imagen: 'https://picsum.photos/seed/puntamita/800/600' },
  { id: 'Nayarit|medio',          titulo: 'Sayulita Surf',        estado: 'Nayarit',            hotel: 'Hotel Boutique DOMe',          precioHotel: 'Desde $1,500/noche', estilo: 'Surf, pueblo artesanal',   restaurante: 'Don Pedro\'s',                precioRestaurante: '$450/persona',   nivel: 'medio',    imagen: 'https://picsum.photos/seed/sayulita/800/600' },
  { id: 'Nayarit|economico',      titulo: 'Sayulita Mochilera',   estado: 'Nayarit',            hotel: 'Hostal Weliwel',               precioHotel: 'Desde $350/noche',   estilo: 'Playa, hippie, surf',      restaurante: 'El Itacate',                  precioRestaurante: '$140/persona',   nivel: 'economico', imagen: 'https://picsum.photos/seed/sayulita2/800/600' },
  // ── SONORA ────────────────────────────────────────────────────────────────
  { id: 'Sonora|premium',         titulo: 'San Carlos Premium',   estado: 'Sonora',             hotel: 'Hotel Marbella San Carlos',    precioHotel: 'Desde $2,400/noche', estilo: 'Mar de Cortés, pesca',     restaurante: 'El Marinero',                 precioRestaurante: '$800/persona',   nivel: 'premium',  imagen: 'https://picsum.photos/seed/sancarlos/800/600' },
  { id: 'Sonora|medio',           titulo: 'Puerto Peñasco',       estado: 'Sonora',             hotel: 'Hotel Peñasco del Sol',        precioHotel: 'Desde $1,200/noche', estilo: 'Playa, Mar de Cortés',     restaurante: 'La Curva',                    precioRestaurante: '$400/persona',   nivel: 'medio',    imagen: 'https://picsum.photos/seed/penasco/800/600' },
  { id: 'Sonora|economico',       titulo: 'Álamos Pueblo Mágico', estado: 'Sonora',             hotel: 'Posada de los Tesoros',        precioHotel: 'Desde $550/noche',   estilo: 'Colonial, historia minera',restaurante: 'El Mesón la Hacienda',        precioRestaurante: '$200/persona',   nivel: 'economico', imagen: 'https://picsum.photos/seed/alamos/800/600' },
  // ── CHIHUAHUA ─────────────────────────────────────────────────────────────
  { id: 'Chihuahua|premium',      titulo: 'Barrancas del Cobre VIP',estado: 'Chihuahua',        hotel: 'Posada del Cobre',             precioHotel: 'Desde $3,500/noche', estilo: 'Aventura de lujo',         restaurante: 'El Divisadero Restaurant',    precioRestaurante: '$900/persona',   nivel: 'premium',  imagen: 'https://picsum.photos/seed/cobre/800/600' },
  { id: 'Chihuahua|medio',        titulo: 'Barrancas Cobre',      estado: 'Chihuahua',          hotel: 'Hotel Misión',                 precioHotel: 'Desde $1,400/noche', estilo: 'Aventura, rarámuris',      restaurante: 'Tarahumara Restaurant',       precioRestaurante: '$450/persona',   nivel: 'medio',    imagen: 'https://picsum.photos/seed/cobre2/800/600' },
  { id: 'Chihuahua|economico',    titulo: 'Chihuahua Capital',    estado: 'Chihuahua',          hotel: 'Hotel San Juan',               precioHotel: 'Desde $500/noche',   estilo: 'Historia, desierto',       restaurante: 'La Calesa de Pancho Villa',   precioRestaurante: '$200/persona',   nivel: 'economico', imagen: 'https://picsum.photos/seed/chihuahua/800/600' },
  // ── COLIMA ────────────────────────────────────────────────────────────────
  { id: 'Colima|medio',           titulo: 'Volcán de Colima',     estado: 'Colima',             hotel: 'Hotel Las Candelas',           precioHotel: 'Desde $1,000/noche', estilo: 'Volcán, mar pacífico',     restaurante: 'Los Naranjos',                precioRestaurante: '$350/persona',   nivel: 'medio',     imagen: 'https://picsum.photos/seed/volcan/800/600' },
  { id: 'Colima|economico',       titulo: 'Manzanillo Playero',   estado: 'Colima',             hotel: 'Posada La Tortuga',            precioHotel: 'Desde $450/noche',   estilo: 'Playa, pesca, descanso',   restaurante: 'El Fogón',                    precioRestaurante: '$160/persona',   nivel: 'economico', imagen: 'https://picsum.photos/seed/manzanillo/800/600' },
  // ── MORELOS ───────────────────────────────────────────────────────
  { id: 'Morelos|medio',          titulo: 'Cuernavaca Histórica', estado: 'Morelos',            hotel: 'Hotel Cortés Cuernavaca',      precioHotel: 'Desde $1,300/noche', estilo: 'Historia, jardines',       restaurante: 'La India Bonita',             precioRestaurante: '$400/persona',   nivel: 'medio',    imagen: 'https://picsum.photos/seed/cuernavaca/800/600' },
  { id: 'Morelos|economico',      titulo: 'Balnearios de Morelos',estado: 'Morelos',            hotel: 'Posada Cuauhtémoc',            precioHotel: 'Desde $400/noche',   estilo: 'Balnearios, relajación',   restaurante: 'Fonda Recreativa',            precioRestaurante: '$130/persona',   nivel: 'economico', imagen: 'https://picsum.photos/seed/balnearios/800/600' },
  // ── ZACATECAS ─────────────────────────────────────────────────────────────
  { id: 'Zacatecas|premium',      titulo: 'Zacatecas Colonial',   estado: 'Zacatecas',          hotel: 'Quinta Real Zacatecas',        precioHotel: 'Desde $3,000/noche', estilo: 'Hacienda, vinos, historia',restaurante: 'El Recoveco',                 precioRestaurante: '$900/persona',   nivel: 'premium',  imagen: 'https://picsum.photos/seed/zacatecas/800/600' },
  { id: 'Zacatecas|medio',        titulo: 'Casco Histórico',      estado: 'Zacatecas',          hotel: 'Hotel Emporio Zacatecas',      precioHotel: 'Desde $1,200/noche', estilo: 'Mining, colonial, arte',   restaurante: 'El Jacalito',                 precioRestaurante: '$380/persona',   nivel: 'medio',    imagen: 'https://picsum.photos/seed/zacatecas2/800/600' },
  { id: 'Zacatecas|economico',    titulo: 'Zacatecas Minas',      estado: 'Zacatecas',          hotel: 'Hostal del Centro',            precioHotel: 'Desde $380/noche',   estilo: 'Teleférico, plata',        restaurante: 'La Cuija',                    precioRestaurante: '$150/persona',   nivel: 'economico', imagen: 'https://picsum.photos/seed/zacatecas3/800/600' },
];

export const COLORES_NIVEL: Record<Nivel, string> = {
  economico: '#3AB7A5',
  medio: '#e9c46a',
  premium: '#DD331D'
};

// ETIQUETA_NIVEL eliminado: usar t(('rut_' + nivel) as any) directamente en JSX.
// Las claves rut_economico / rut_medio / rut_premium están en traducciones.ts.

// Tipo auxiliar para campos de contenido bilingüe
type L  = { es: string;   en: string   };
type LA = { es: string[]; en: string[] };

export type Paquete = {
  nivel: 'economico' | 'medio' | 'premium';
  color: string; emoji: string;
  precioTotal: string; hotel: string; estrellas: number;
  precioHotel: string; descripcionHotel: L; incluye: LA;
  restaurante: string; tipoCocina: L; precioRestaurante: string;
  platillo: L; transporte: L; precioTransporte: string;
  actividades: LA; diasRecomendados: number; imagenesHotel: string[];
};

export const PAQUETES_POR_ESTADO: Record<string, Paquete[]> = {
  'Chiapas': [
    { nivel:'economico', color:'#3AB7A5', emoji:'$', precioTotal:'$2,500 MXN', hotel:'Hostal Río Lacanjá', estrellas:2, precioHotel:'$350 MXN / noche',
      descripcionHotel:{ es:'Hostal acogedor en el centro de San Cristóbal, con vista a los cerros y desayuno incluido.', en:'Cozy hostel in the heart of San Cristóbal, with hill views and breakfast included.' },
      incluye:{ es:['WiFi gratuito','Desayuno continental','Casilleros seguros'], en:['Free WiFi','Continental breakfast','Secure lockers'] },
      restaurante:'El Fogón de Jovel', tipoCocina:{ es:'Comida típica chiapaneca', en:'Traditional Chiapan cuisine' }, precioRestaurante:'$120 MXN por persona',
      platillo:{ es:'Tasajo con frijoles y tortillas hechas a mano', en:'Tasajo with beans and handmade tortillas' },
      transporte:{ es:'Combi local + caminatas', en:'Local minibus + walks' }, precioTransporte:'$80 MXN / día',
      actividades:{ es:['Cañón del Sumidero en lancha','Mercado de Santo Domingo','Templo de San Cristóbal'], en:['Sumidero Canyon by boat','Santo Domingo market','San Cristóbal temple'] },
      diasRecomendados:3, imagenesHotel:['https://picsum.photos/seed/chiapas-eco-1/800/600','https://picsum.photos/seed/chiapas-eco-2/800/600','https://picsum.photos/seed/chiapas-eco-3/800/600'] },
    { nivel:'medio', color:'#e9c46a', emoji:'★', precioTotal:'$5,800 MXN', hotel:'Hotel Casa Mexicana', estrellas:3, precioHotel:'$980 MXN / noche',
      descripcionHotel:{ es:'Hotel boutique colonial en el corazón de San Cristóbal, con jardín interior y spa.', en:'Colonial boutique hotel in the heart of San Cristóbal, with interior garden and spa.' },
      incluye:{ es:['WiFi gratuito','Desayuno buffet','Piscina','Estacionamiento'], en:['Free WiFi','Buffet breakfast','Pool','Parking'] },
      restaurante:'TierrAdentro', tipoCocina:{ es:'Fusión mexicana contemporánea', en:'Contemporary Mexican fusion' }, precioRestaurante:'$380 MXN por persona',
      platillo:{ es:'Cochinita pibil con achiote y habanero', en:'Cochinita pibil with achiote and habanero' },
      transporte:{ es:'Taxi privado + tours organizados', en:'Private taxi + organized tours' }, precioTransporte:'$250 MXN / día',
      actividades:{ es:['Tour Cascadas de Agua Azul','Palenque ruinas mayas','Pueblo mágico Zinacantán'], en:['Agua Azul Waterfalls tour','Palenque Mayan ruins','Zinacantán magic town'] },
      diasRecomendados:4, imagenesHotel:['https://picsum.photos/seed/chiapas-med-1/800/600','https://picsum.photos/seed/chiapas-med-2/800/600','https://picsum.photos/seed/chiapas-med-3/800/600'] },
    { nivel:'premium', color:'#DD331D', emoji:'◆', precioTotal:'$12,000 MXN', hotel:'Na Bolom Lodge', estrellas:5, precioHotel:'$2,800 MXN / noche',
      descripcionHotel:{ es:'Lodge de lujo ecológico rodeado de selva lacandona, con guías especializados en cultura maya.', en:'Eco-luxury lodge surrounded by Lacandon jungle, with expert Mayan culture guides.' },
      incluye:{ es:['Todo incluido','Spa completo','Tours privados','Traslados en camioneta privada','Guía bilingüe'], en:['All inclusive','Full spa','Private tours','Private van transfers','Bilingual guide'] },
      restaurante:'La Viña de Bacco', tipoCocina:{ es:'Alta cocina mexicana', en:'High-end Mexican cuisine' }, precioRestaurante:'$900 MXN por persona',
      platillo:{ es:'Filete de res con reducción de mezcal y mole negro', en:'Beef tenderloin with mezcal reduction and black mole' },
      transporte:{ es:'Camioneta privada 4x4', en:'Private 4x4 van' }, precioTransporte:'Incluido en paquete',
      actividades:{ es:['Vuelo en helicóptero sobre Cañón del Sumidero','Tour privado Palenque al amanecer','Ceremonia tzeltal con chamán local','Snorkel en Lagos de Montebello'], en:['Helicopter flight over Sumidero Canyon','Private Palenque tour at dawn','Tzeltal ceremony with local shaman','Snorkeling at Montebello Lakes'] },
      diasRecomendados:5, imagenesHotel:['https://picsum.photos/seed/chiapas-pre-1/800/600','https://picsum.photos/seed/chiapas-pre-2/800/600','https://picsum.photos/seed/chiapas-pre-3/800/600'] },
  ],
  'Yucatán': [
    { nivel:'economico', color:'#3AB7A5', emoji:'$', precioTotal:'$2,800 MXN', hotel:'Hostal Nomadas', estrellas:2, precioHotel:'$320 MXN / noche',
      descripcionHotel:{ es:'Hostal céntrico en Mérida, a dos cuadras del Zócalo. Ambiente joven y viajero.', en:'Central hostel in Mérida, two blocks from the Zócalo. Young traveler atmosphere.' },
      incluye:{ es:['WiFi gratuito','Cocina compartida','Bicicletas de préstamo'], en:['Free WiFi','Shared kitchen','Loan bicycles'] },
      restaurante:'La Chaya Maya', tipoCocina:{ es:'Comida yucateca auténtica', en:'Authentic Yucatan cuisine' }, precioRestaurante:'$150 MXN por persona',
      platillo:{ es:'Sopa de lima y panuchos con cochinita', en:'Lime soup and panuchos with cochinita' },
      transporte:{ es:'Bicicleta + ADO bus', en:'Bicycle + ADO bus' }, precioTransporte:'$100 MXN / día',
      actividades:{ es:['Chichén Itzá (entrada general)','Cenote Ik Kil','Paseo en calesa por Mérida'], en:['Chichén Itzá (general admission)','Ik Kil cenote','Horse-drawn carriage ride in Mérida'] },
      diasRecomendados:3, imagenesHotel:['https://picsum.photos/seed/yucatan-eco-1/800/600','https://picsum.photos/seed/yucatan-eco-2/800/600','https://picsum.photos/seed/yucatan-eco-3/800/600'] },
    { nivel:'medio', color:'#e9c46a', emoji:'★', precioTotal:'$6,500 MXN', hotel:'Hacienda Xcanatún', estrellas:4, precioHotel:'$1,400 MXN / noche',
      descripcionHotel:{ es:'Hacienda henequenera del siglo XVIII restaurada, con piscina de aguas termales y spa.', en:'Restored 18th-century henequen hacienda with thermal pool and spa.' },
      incluye:{ es:['Desayuno gourmet','Piscina','Spa','WiFi','Traslado aeropuerto'], en:['Gourmet breakfast','Pool','Spa','WiFi','Airport transfer'] },
      restaurante:'Casa de Piedra', tipoCocina:{ es:'Nouvelle cuisine yucateca', en:'Nouvelle Yucatan cuisine' }, precioRestaurante:'$550 MXN por persona',
      platillo:{ es:'Poc Chuc con ensalada de jícama y naranja', en:'Poc Chuc with jicama and orange salad' },
      transporte:{ es:'Auto rentado + guía turístico', en:'Rental car + tour guide' }, precioTransporte:'$400 MXN / día',
      actividades:{ es:['Tour privado Chichén Itzá + Uxmal','Nado en cenotes privados','Mercado Lucas de Gálvez con chef local'], en:['Private Chichén Itzá + Uxmal tour','Swimming in private cenotes','Lucas de Gálvez market with local chef'] },
      diasRecomendados:4, imagenesHotel:['https://picsum.photos/seed/yucatan-med-1/800/600','https://picsum.photos/seed/yucatan-med-2/800/600','https://picsum.photos/seed/yucatan-med-3/800/600'] },
    { nivel:'premium', color:'#DD331D', emoji:'◆', precioTotal:'$15,000 MXN', hotel:'Chablé Resort & Spa', estrellas:5, precioHotel:'$4,500 MXN / noche',
      descripcionHotel:{ es:'Resort de ultra lujo con cenote privado, villas con piscina individual y conexión espiritual maya.', en:'Ultra-luxury resort with private cenote, villas with individual pool and Mayan spiritual connection.' },
      incluye:{ es:['Todo incluido premium','Cenote privado','Piscina privada en villa','Butler 24h','Helipuerto','Tours exclusivos'], en:['Premium all inclusive','Private cenote','Private villa pool','24h butler','Helipad','Exclusive tours'] },
      restaurante:"Ixi'im Restaurant", tipoCocina:{ es:'Alta cocina maya contemporánea', en:'High-end contemporary Mayan cuisine' }, precioRestaurante:'$1,800 MXN por persona',
      platillo:{ es:'Venado con pepita negra, hierba santa y trufa blanca', en:'Venison with black pepita, holy herb and white truffle' },
      transporte:{ es:'Helicóptero o SUV privado', en:'Helicopter or private SUV' }, precioTransporte:'Incluido en paquete',
      actividades:{ es:['Acceso privado nocturno a Chichén Itzá','Experiencia espiritual con sacerdote maya','Yate privado por la costa yucateca','Clase de cocina con chef Michelín'], en:['Private night access to Chichén Itzá','Spiritual experience with Mayan priest','Private yacht along the Yucatan coast','Cooking class with Michelin chef'] },
      diasRecomendados:6, imagenesHotel:['https://picsum.photos/seed/yucatan-pre-1/800/600','https://picsum.photos/seed/yucatan-pre-2/800/600','https://picsum.photos/seed/yucatan-pre-3/800/600'] },
  ],
  'default': [
    { nivel:'economico', color:'#3AB7A5', emoji:'$', precioTotal:'$2,200 MXN', hotel:'Hostal del Viajero', estrellas:2, precioHotel:'$300 MXN / noche',
      descripcionHotel:{ es:'Hostal céntrico con ambiente familiar, ideal para mochileros y viajeros independientes.', en:'Central hostel with a family atmosphere, ideal for backpackers and independent travelers.' },
      incluye:{ es:['WiFi gratuito','Cocina compartida','Casilleros seguros'], en:['Free WiFi','Shared kitchen','Secure lockers'] },
      restaurante:'Fonda La Tradicional', tipoCocina:{ es:'Comida mexicana casera', en:'Traditional homestyle Mexican cuisine' }, precioRestaurante:'$100 MXN por persona',
      platillo:{ es:'Comida corrida con sopa, guisado y postre', en:'Set lunch with soup, stew and dessert' },
      transporte:{ es:'Transporte público local', en:'Local public transport' }, precioTransporte:'$60 MXN / día',
      actividades:{ es:['Visita al centro histórico','Mercado local','Parque principal'], en:['Historic center visit','Local market','Main park'] },
      diasRecomendados:2, imagenesHotel:['https://picsum.photos/seed/default-eco-1/800/600','https://picsum.photos/seed/default-eco-2/800/600','https://picsum.photos/seed/default-eco-3/800/600'] },
    { nivel:'medio', color:'#e9c46a', emoji:'★', precioTotal:'$5,500 MXN', hotel:'Hotel Boutique Local', estrellas:3, precioHotel:'$900 MXN / noche',
      descripcionHotel:{ es:'Hotel boutique de estilo regional con decoración artesanal y excelente ubicación.', en:'Regional-style boutique hotel with artisan décor and excellent location.' },
      incluye:{ es:['Desayuno incluido','WiFi','Piscina','Estacionamiento'], en:['Breakfast included','WiFi','Pool','Parking'] },
      restaurante:'Restaurante del Centro', tipoCocina:{ es:'Cocina regional mexicana', en:'Regional Mexican cuisine' }, precioRestaurante:'$350 MXN por persona',
      platillo:{ es:'Especialidad regional de temporada', en:'Seasonal regional specialty' },
      transporte:{ es:'Taxi + tours organizados', en:'Taxi + organized tours' }, precioTransporte:'$220 MXN / día',
      actividades:{ es:['Tour guiado por el centro','Visita a zonas arqueológicas cercanas','Taller artesanal local'], en:['Guided downtown tour','Visit to nearby archaeological sites','Local craft workshop'] },
      diasRecomendados:3, imagenesHotel:['https://picsum.photos/seed/default-med-1/800/600','https://picsum.photos/seed/default-med-2/800/600','https://picsum.photos/seed/default-med-3/800/600'] },
    { nivel:'premium', color:'#DD331D', emoji:'◆', precioTotal:'$11,000 MXN', hotel:'Gran Hotel de Lujo', estrellas:5, precioHotel:'$2,500 MXN / noche',
      descripcionHotel:{ es:'Hotel cinco estrellas con spa, restaurante gourmet y servicio de concierge personalizado.', en:'Five-star hotel with spa, gourmet restaurant and personalized concierge service.' },
      incluye:{ es:['Todo incluido','Spa completo','Traslados privados','Guía bilingüe exclusivo','Tours privados'], en:['All inclusive','Full spa','Private transfers','Exclusive bilingual guide','Private tours'] },
      restaurante:'Alta Cocina Regional', tipoCocina:{ es:'Gastronomía de autor', en:'Signature gastronomy' }, precioRestaurante:'$1,200 MXN por persona',
      platillo:{ es:'Menú degustación de 7 tiempos con maridaje', en:'7-course tasting menu with wine pairing' },
      transporte:{ es:'Vehículo privado con chofer', en:'Private vehicle with driver' }, precioTransporte:'Incluido en paquete',
      actividades:{ es:['Tours privados a sitios exclusivos','Experiencia cultural personalizada','Cena de gala en locación histórica','Traslado en helicóptero opcional'], en:['Private tours to exclusive sites','Personalized cultural experience','Gala dinner at historic venue','Optional helicopter transfer'] },
      diasRecomendados:5, imagenesHotel:['https://picsum.photos/seed/default-pre-1/800/600','https://picsum.photos/seed/default-pre-2/800/600','https://picsum.photos/seed/default-pre-3/800/600'] },
  ],
};

// ===========================
//  NAVEGACIÓN PRINCIPAL
// ===========================

interface Pestana {
  iconoGris: any;
  iconoRojo: any;
  etiqueta: string;
  ruta: string;
}

export const PESTANAS: Pestana[] = [
  { 
    iconoGris: require('../assets/images/inicio_gris.png'),
    iconoRojo: require('../assets/images/inicio_rojo.png'),
    etiqueta: 'Inicio',
    ruta: '/(tabs)/menu'
  },
  { 
    iconoGris: require('../assets/images/favoritos_gris.png'),
    iconoRojo: require('../assets/images/favoritos_rojo.png'),
    etiqueta: 'Favoritos',
    ruta: '/(tabs)/favoritos'
  },
  { 
    iconoGris: require('../assets/images/rutas_gris.png'),
    iconoRojo: require('../assets/images/rutas_rojo.png'),
    etiqueta: 'Rutas',
    ruta: '/(tabs)/rutas'
  },
  { 
    iconoGris: require('../assets/images/perfil_gris.png'),
    iconoRojo: require('../assets/images/perfil_rojo.png'),
    etiqueta: 'Perfil',
    ruta: '/(tabs)/perfil'
  },
];

// ===========================
//  RUTAS DE LA APLICACIÓN
// ===========================

export const RUTAS_APP = {
  // Tabs principales
  MENU: '/(tabs)/menu',
  FAVORITOS: '/(tabs)/favoritos',
  RUTAS: '/(tabs)/rutas',
  PERFIL: '/(tabs)/perfil',
  
  // Detalles y búsqueda
  DETALLE_ESTADO: '/detalle-estado',
  BUSQUEDA: '/busqueda',
  RESULTADOS: '/resultados',
  FILTROS: '/filtros',
  MAPA: '/mapa',
  
  // Reservas (flujo completo)
  RESERVA_PASO_1: '/reserva/paso1',
  RESERVA_PASO_2: '/reserva/paso2',
  RESERVA_PASO_3: '/reserva/paso3',
  RESERVA_PASO_4: '/reserva/paso4',
  RESERVA_CONFIRMACION: '/reserva/confirmacion',
  
  // Perfil y gestión de usuario
  EDITAR_PERFIL: '/perfil/editar',
  HISTORIAL_RESERVAS: '/perfil/historial',
  DETALLE_RESERVA: '/perfil/reserva',
  METODOS_PAGO: '/perfil/pagos',
  AGREGAR_TARJETA: '/perfil/agregar-tarjeta',
  NOTIFICACIONES: '/perfil/notificaciones',
  CONFIGURACION: '/perfil/configuracion',
  AYUDA: '/perfil/ayuda',
  TERMINOS: '/perfil/terminos',
  PRIVACIDAD: '/perfil/privacidad',
  
  // Autenticación
  LOGIN: '/auth/login',
  REGISTRO: '/auth/registro',
  RECUPERAR_PASSWORD: '/auth/recuperar',
  VERIFICAR_CODIGO: '/auth/verificar',
  CAMBIAR_PASSWORD: '/auth/cambiar-password',
  
  // Admin
  ADMIN_PANEL: '/admin/panel',
  ADMIN_ESTADOS: '/admin/estados',
  ADMIN_RESERVAS: '/admin/reservas',
  ADMIN_USUARIOS: '/admin/usuarios',
  ADMIN_ESTADISTICAS: '/admin/estadisticas',
  ADMIN_CONFIGURACION: '/admin/configuracion',
} as const;

// ===========================
//  ESTADOS DE MÉXICO
// ===========================

interface Estado {
  id: number;
  nombre: string;
  categoria: CategoriaEstado;
  descripcion: string;
  imagen: any;
  precio: number;
}

export const TODOS_LOS_ESTADOS: Estado[] = [
  { 
    id: 1,
    nombre: 'Aguascalientes',
    categoria: 'Cultura',
    descripcion: 'Feria, viñedos y arquitectura colonial',
    imagen: require('../assets/images/aguascalientes.png'),
    precio: 1800
  },
  { 
    id: 2,
    nombre: 'Baja California',
    categoria: 'Aventura',
    descripcion: 'Valle de Guadalupe, playas y ballenas',
    imagen: require('../assets/images/baja_california.png'),
    precio: 2500
  },
  { 
    id: 3,
    nombre: 'Baja California Sur',
    categoria: 'Playa',
    descripcion: 'El Arco, mar de Cortés y vida marina',
    imagen: require('../assets/images/baja_california_sur.png'),
    precio: 3800
  },
  { 
    id: 4,
    nombre: 'Campeche',
    categoria: 'Cultura',
    descripcion: 'Ciudad amurallada, maya y colonial',
    imagen: require('../assets/images/campeche.png'),
    precio: 2000
  },
  { 
    id: 5,
    nombre: 'Chiapas',
    categoria: 'Aventura',
    descripcion: 'Selva, cascadas y cañones impresionantes',
    imagen: require('../assets/images/chiapas.png'),
    precio: 2500
  },
  { 
    id: 6,
    nombre: 'Chihuahua',
    categoria: 'Aventura',
    descripcion: 'Barrancas del Cobre y desierto',
    imagen: require('../assets/images/chihuahua.png'),
    precio: 2200
  },
  { 
    id: 7,
    nombre: 'Ciudad de México',
    categoria: 'Ciudad',
    descripcion: 'Historia, arte, gastronomía y vida nocturna',
    imagen: require('../assets/images/cdmx.png'),
    precio: 1500
  },
  { 
    id: 8,
    nombre: 'Coahuila',
    categoria: 'Aventura',
    descripcion: 'Cuatro Ciénegas y desierto de Chihuahua',
    imagen: require('../assets/images/coahuila.png'),
    precio: 1800
  },
  { 
    id: 9,
    nombre: 'Colima',
    categoria: 'Aventura',
    descripcion: 'Volcán de Colima y playas del Pacífico',
    imagen: require('../assets/images/colima.png'),
    precio: 1700
  },
  { 
    id: 10,
    nombre: 'Durango',
    categoria: 'Aventura',
    descripcion: 'Cañones, sierras y escenarios de western',
    imagen: require('../assets/images/durango.png'),
    precio: 1900
  },
  { 
    id: 11,
    nombre: 'Estado de México',
    categoria: 'Cultura',
    descripcion: 'Teotihuacán, Valle de Bravo y mariposas',
    imagen: require('../assets/images/estado_mex.png'),
    precio: 1500
  },
  { 
    id: 12,
    nombre: 'Guanajuato',
    categoria: 'Cultura',
    descripcion: 'Callejones coloniales y Festival Cervantino',
    imagen: require('../assets/images/guanajuato.png'),
    precio: 2000
  },
  { 
    id: 13,
    nombre: 'Guerrero',
    categoria: 'Playa',
    descripcion: 'Acapulco, Ixtapa y costas bravas del sur',
    imagen: require('../assets/images/guerrero.png'),
    precio: 1800
  },
  { 
    id: 14,
    nombre: 'Hidalgo',
    categoria: 'Cultura',
    descripcion: 'Prismas basálticos, haciendas y pulque',
    imagen: require('../assets/images/hidalgo.png'),
    precio: 1600
  },
  { 
    id: 15,
    nombre: 'Jalisco',
    categoria: 'Gastronomía',
    descripcion: 'Tequila, mariachi y tradición tapatía',
    imagen: require('../assets/images/jalisco.png'),
    precio: 2100
  },
  { 
    id: 16,
    nombre: 'Michoacán',
    categoria: 'Cultura',
    descripcion: 'Mariposas monarca, Pátzcuaro y artesanías',
    imagen: require('../assets/images/michoacan.png'),
    precio: 1900
  },
  { 
    id: 17,
    nombre: 'Morelos',
    categoria: 'Cultura',
    descripcion: 'Haciendas, balnearios y Xochicalco',
    imagen: require('../assets/images/morelos.png'),
    precio: 1500
  },
  { 
    id: 18,
    nombre: 'Nayarit',
    categoria: 'Playa',
    descripcion: 'Sayulita, Islas Marietas y surf',
    imagen: require('../assets/images/nayarit.png'),
    precio: 2300
  },
  { 
    id: 19,
    nombre: 'Nuevo León',
    categoria: 'Ciudad',
    descripcion: 'Monterrey, cañones y vida industrial',
    imagen: require('../assets/images/nuevo_leon.png'),
    precio: 1800
  },
  { 
    id: 20,
    nombre: 'Oaxaca',
    categoria: 'Gastronomía',
    descripcion: 'Arte, mole negro, mezcal y Monte Albán',
    imagen: require('../assets/images/oaxaca.png'),
    precio: 2800
  },
  { 
    id: 21,
    nombre: 'Puebla',
    categoria: 'Cultura',
    descripcion: 'Talavera, chiles en nogada y conventos',
    imagen: require('../assets/images/puebla.png'),
    precio: 1900
  },
  { 
    id: 22,
    nombre: 'Querétaro',
    categoria: 'Cultura',
    descripcion: 'Acueducto, vinos y Peña de Bernal',
    imagen: require('../assets/images/queretaro.png'),
    precio: 1800
  },
  { 
    id: 23,
    nombre: 'Quintana Roo',
    categoria: 'Playa',
    descripcion: 'Mar turquesa, arrecifes y cenotes',
    imagen: require('../assets/images/quintana_roo.png'),
    precio: 4500
  },
  { 
    id: 24,
    nombre: 'San Luis Potosí',
    categoria: 'Cultura',
    descripcion: 'Huasteca Potosina, cascadas y cañones',
    imagen: require('../assets/images/san_luis_potosi.png'),
    precio: 1800
  },
  { 
    id: 25,
    nombre: 'Sinaloa',
    categoria: 'Playa',
    descripcion: 'Mazatlán, playas y gastronomía de mar',
    imagen: require('../assets/images/sinaloa.png'),
    precio: 2000
  },
  { 
    id: 26,
    nombre: 'Sonora',
    categoria: 'Aventura',
    descripcion: 'Desierto de Altar, Mar de Cortés y playa',
    imagen: require('../assets/images/sonora.png'),
    precio: 2000
  },
  { 
    id: 27,
    nombre: 'Tabasco',
    categoria: 'Cultura',
    descripcion: 'Cultura olmeca, ríos y selva tropical',
    imagen: require('../assets/images/tabasco.png'),
    precio: 1700
  },
  { 
    id: 28,
    nombre: 'Tamaulipas',
    categoria: 'Ciudad',
    descripcion: 'Tampico, playas del Golfo y frontera',
    imagen: require('../assets/images/tamaulipas.png'),
    precio: 1600
  },
  { 
    id: 29,
    nombre: 'Tlaxcala',
    categoria: 'Cultura',
    descripcion: 'Carnaval, Cacaxtla y tradiciones vivas',
    imagen: require('../assets/images/tlaxcala.png'),
    precio: 1400
  },
  { 
    id: 30,
    nombre: 'Veracruz',
    categoria: 'Cultura',
    descripcion: 'Puerto, son jarocho, Tajín y cascadas',
    imagen: require('../assets/images/veracruz.png'),
    precio: 1800
  },
  { 
    id: 31,
    nombre: 'Yucatán',
    categoria: 'Cultura',
    descripcion: 'Chichén Itzá, cenotes y haciendas mayas',
    imagen: require('../assets/images/yucatan.png'),
    precio: 3200
  },
  { 
    id: 32,
    nombre: 'Zacatecas',
    categoria: 'Cultura',
    descripcion: 'Minas de plata, teleférico y arte barroco',
    imagen: require('../assets/images/zacatecas.png'),
    precio: 1900
  },
];

// ===========================
//  FUNCIONES AUXILIARES
// ===========================

/**
 * Obtiene todos los estados de una categoría específica
 */
export const obtenerEstadosPorCategoria = (categoria: CategoriaEstado): Estado[] => {
  return TODOS_LOS_ESTADOS.filter(estado => estado.categoria === categoria);
};

/**
 * Busca estados por texto en nombre o descripción
 */
export const buscarEstados = (texto: string): Estado[] => {
  const textoLower = texto.toLowerCase();
  return TODOS_LOS_ESTADOS.filter(estado => 
    estado.nombre.toLowerCase().includes(textoLower) ||
    estado.descripcion.toLowerCase().includes(textoLower)
  );
};

/**
 * Obtiene un estado por su ID
 */
export const obtenerEstadoPorId = (id: number): Estado | undefined => {
  return TODOS_LOS_ESTADOS.find(estado => estado.id === id);
};

/**
 * Filtra estados por rango de precio
 */
export const filtrarPorPrecio = (min: number, max: number): Estado[] => {
  return TODOS_LOS_ESTADOS.filter(estado => 
    estado.precio >= min && estado.precio <= max
  );
};

/**
 * Ordena estados por precio (ascendente o descendente)
 */
export const ordenarPorPrecio = (ascendente: boolean = true): Estado[] => {
  return [...TODOS_LOS_ESTADOS].sort((a, b) => 
    ascendente ? a.precio - b.precio : b.precio - a.precio
  );
};

/**
 * Parsea una clave de ruta con formato "Estado|nivel" o "Estado-nivel" (legacy).
 * Soporta ambos separadores para retrocompatibilidad con datos ya almacenados.
 */
export const parsearClaveRuta = (clave: string): { estado: string; nivel: Nivel } => {
  // Separador canónico: |
  if (clave.includes('|')) {
    const [estado, nivel = 'medio'] = clave.split('|');
    return { estado, nivel: nivel as Nivel };
  }
  // Separador legacy: - (último guión = separador, lo anterior = nombre del estado)
  const ultimoGuion = clave.lastIndexOf('-');
  if (ultimoGuion > 0) {
    const posibleNivel = clave.slice(ultimoGuion + 1);
    if (['economico', 'medio', 'premium'].includes(posibleNivel)) {
      return { estado: clave.slice(0, ultimoGuion), nivel: posibleNivel as Nivel };
    }
  }
  // Fallback: asumir medio
  return { estado: clave, nivel: 'medio' };
};

/**
 * Genera una clave de ruta estandarizada con el formato canónico "Estado|nivel".
 */
export const generarClaveRuta = (estado: string, nivel: Nivel): string => {
  return `${estado}|${nivel}`;
};

/**
 * Resuelve información completa de una ruta a partir de su clave.
 * Busca primero en SUGERENCIAS_RUTAS, luego en PAQUETES_POR_ESTADO, luego fallback.
 */
export const resolverInfoRuta = (clave: string): {
  titulo: string;
  estado: string;
  nivel: Nivel;
  hotel: string;
  precioHotel: string;
  restaurante: string;
  precioRestaurante: string;
  estilo: string;
  precioTotal: string;
  diasRecomendados: number;
  transporte: L;
  precioTransporte: string;
  actividades: LA;
} => {
  const { estado, nivel } = parsearClaveRuta(clave);
  
  // 1. Buscar en sugerencias por clave canónica o por estado+nivel
  const claveCanonica = generarClaveRuta(estado, nivel);
  const sugerencia = SUGERENCIAS_RUTAS.find(
    s => s.id === claveCanonica || s.id === clave || (s.estado === estado && s.nivel === nivel)
  );
  
  // 2. Buscar paquete detallado en PAQUETES_POR_ESTADO
  const paquetesEstado = PAQUETES_POR_ESTADO[estado] ?? PAQUETES_POR_ESTADO['default'];
  const paquete = paquetesEstado.find(p => p.nivel === nivel) ?? paquetesEstado[0];
  
  return {
    titulo: sugerencia?.titulo ?? estado,
    estado,
    nivel,
    hotel: sugerencia?.hotel ?? paquete?.hotel ?? '',
    precioHotel: sugerencia?.precioHotel ?? paquete?.precioHotel ?? '',
    restaurante: sugerencia?.restaurante ?? paquete?.restaurante ?? '',
    precioRestaurante: sugerencia?.precioRestaurante ?? paquete?.precioRestaurante ?? '',
    estilo: sugerencia?.estilo ?? '',
    precioTotal: paquete?.precioTotal ?? '',
    diasRecomendados: paquete?.diasRecomendados ?? 3,
    transporte: paquete?.transporte ?? { es: '', en: '' },
    precioTransporte: paquete?.precioTransporte ?? '',
    actividades: paquete?.actividades ?? { es: [], en: [] },
  };
};

/**
 * Obtiene una sugerencia por su ID
 */
export const obtenerSugerenciaPorId = (id: string): Sugerencia | undefined => {
  return SUGERENCIAS_RUTAS.find(s => s.id === id);
};

/**
 * Obtiene todas las sugerencias de un estado
 */
export const obtenerSugerenciasPorEstado = (estado: string): Sugerencia[] => {
  return SUGERENCIAS_RUTAS.filter(s => s.estado === estado);
};

/**
 * Obtiene todas las sugerencias de un nivel
 */
export const obtenerSugerenciasPorNivel = (nivel: Nivel): Sugerencia[] => {
  return SUGERENCIAS_RUTAS.filter(s => s.nivel === nivel);
};