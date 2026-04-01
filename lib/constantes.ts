// ============================================================
//  lib/constantes.ts  —  Datos compartidos entre pantallas
// ============================================================

// ===========================
//  TIPOS Y CATEGORÍAS
// ===========================

export type CategoriaEstado = 'Aventura' | 'Playa' | 'Cultura' | 'Gastronomía' | 'Ciudad';
export type Nivel = 'economico' | 'medio' | 'premium';

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
}

export const SUGERENCIAS_RUTAS: Sugerencia[] = [
  // ── QUINTANA ROO ──────────────────────────────────────────────────────────
  { id: 'Quintana Roo|premium',   titulo: 'Tulum de Lujo',        estado: 'Quintana Roo',       hotel: 'Wakax Hacienda Cenote',        precioHotel: 'Desde $3,000/noche', estilo: 'Lujo, naturaleza',         restaurante: 'Rosa Negra',                  precioRestaurante: '$2,000/persona', nivel: 'premium'  },
  { id: 'Quintana Roo|medio',     titulo: 'Cancún & Playa',       estado: 'Quintana Roo',       hotel: 'Marriott Cancún Resort',       precioHotel: 'Desde $2,200/noche', estilo: 'Playa, resort',            restaurante: 'El Fish Fritanga',            precioRestaurante: '$500/persona',   nivel: 'medio'    },
  { id: 'Quintana Roo|economico', titulo: 'Riviera Maya',         estado: 'Quintana Roo',       hotel: 'Hostal Cozumel',               precioHotel: 'Desde $400/noche',   estilo: 'Playa, mochilero',         restaurante: 'El Pescador',                 precioRestaurante: '$150/persona',   nivel: 'economico'},
  // ── YUCATÁN ───────────────────────────────────────────────────────────────
  { id: 'Yucatán|premium',        titulo: 'Mérida Exclusiva',     estado: 'Yucatán',            hotel: 'Chablé Resort & Spa',          precioHotel: 'Desde $4,500/noche', estilo: 'Lujo maya contemporáneo',  restaurante: "Ixi'im Restaurant",           precioRestaurante: '$1,800/persona', nivel: 'premium'  },
  { id: 'Yucatán|medio',          titulo: 'Chichén Itzá',         estado: 'Yucatán',            hotel: 'Hotel Mayaland',               precioHotel: 'Desde $1,800/noche', estilo: 'Cultural, histórico',      restaurante: 'Hacienda Chichén',            precioRestaurante: '$800/persona',   nivel: 'medio'    },
  { id: 'Yucatán|economico',      titulo: 'Mérida Colonial',      estado: 'Yucatán',            hotel: 'Hostal Nomadas',               precioHotel: 'Desde $320/noche',   estilo: 'Cultural, colonial',       restaurante: 'La Chaya Maya',               precioRestaurante: '$150/persona',   nivel: 'economico'},
  // ── CHIAPAS ───────────────────────────────────────────────────────────────
  { id: 'Chiapas|premium',        titulo: 'Palenque VIP',         estado: 'Chiapas',            hotel: 'Na Bolom Lodge',               precioHotel: 'Desde $2,800/noche', estilo: 'Lujo, selva lacandona',    restaurante: 'La Viña de Bacco',            precioRestaurante: '$900/persona',   nivel: 'premium'  },
  { id: 'Chiapas|medio',          titulo: 'San Cristóbal',        estado: 'Chiapas',            hotel: 'Hotel Casa Mexicana',          precioHotel: 'Desde $980/noche',   estilo: 'Colonial, artesanal',      restaurante: 'TierrAdentro',                precioRestaurante: '$380/persona',   nivel: 'medio'    },
  { id: 'Chiapas|economico',      titulo: 'Cañón del Sumidero',   estado: 'Chiapas',            hotel: 'Hostal Río Lacanjá',           precioHotel: 'Desde $350/noche',   estilo: 'Naturaleza, aventura',     restaurante: 'El Fogón de Jovel',           precioRestaurante: '$120/persona',   nivel: 'economico'},
  // ── OAXACA ────────────────────────────────────────────────────────────────
  { id: 'Oaxaca|premium',         titulo: 'Oaxaca Gourmet',       estado: 'Oaxaca',             hotel: 'Casa Oaxaca Hotel',            precioHotel: 'Desde $3,200/noche', estilo: 'Gastronomía de autor',     restaurante: 'Alcalá by R. Castellanos',    precioRestaurante: '$1,500/persona', nivel: 'premium'  },
  { id: 'Oaxaca|medio',           titulo: 'Monte Albán',          estado: 'Oaxaca',             hotel: 'Casa Oaxaca',                  precioHotel: 'Desde $2,200/noche', estilo: 'Cultural, gastronómico',   restaurante: 'Los Danzantes',               precioRestaurante: '$1,200/persona', nivel: 'medio'    },
  { id: 'Oaxaca|economico',       titulo: 'Oaxaca Artesanal',     estado: 'Oaxaca',             hotel: 'Hostal Casa del Río',          precioHotel: 'Desde $380/noche',   estilo: 'Arte, mole, mezcal',       restaurante: 'Mercado Benito Juárez',       precioRestaurante: '$100/persona',   nivel: 'economico'},
  // ── CIUDAD DE MÉXICO ──────────────────────────────────────────────────────
  { id: 'Ciudad de México|premium',  titulo: 'CDMX de Lujo',      estado: 'Ciudad de México',   hotel: 'Gran Hotel CDMX',              precioHotel: 'Desde $4,000/noche', estilo: 'Lujo, urbano, histórico',  restaurante: 'Azul Histórico',              precioRestaurante: '$1,500/persona', nivel: 'premium'  },
  { id: 'Ciudad de México|medio',    titulo: 'Coyoacán & Museos', estado: 'Ciudad de México',   hotel: 'Hotel del Carmen',             precioHotel: 'Desde $900/noche',   estilo: 'Arte, bohemio',            restaurante: 'Los Danzantes Coyoacán',      precioRestaurante: '$500/persona',   nivel: 'medio'    },
  { id: 'Ciudad de México|economico',titulo: 'Centro Histórico',  estado: 'Ciudad de México',   hotel: 'Hotel Isabel',                 precioHotel: 'Desde $450/noche',   estilo: 'Historia, streetfood',     restaurante: 'Café El Popular',             precioRestaurante: '$120/persona',   nivel: 'economico'},
  // ── JALISCO ───────────────────────────────────────────────────────────────
  { id: 'Jalisco|premium',        titulo: 'Guadalajara Premium',  estado: 'Jalisco',            hotel: 'One Hotel Guadalajara',        precioHotel: 'Desde $2,800/noche', estilo: 'Diseño, tradición tapatía',restaurante: 'Alcalde',                     precioRestaurante: '$1,200/persona', nivel: 'premium'  },
  { id: 'Jalisco|medio',          titulo: 'Guadalajara',          estado: 'Jalisco',            hotel: 'Hotel Morales',                precioHotel: 'Desde $1,200/noche', estilo: 'Tradición, tapatío',       restaurante: 'La Chata',                    precioRestaurante: '$400/persona',   nivel: 'medio'    },
  { id: 'Jalisco|economico',      titulo: 'Pueblo Tequila',       estado: 'Jalisco',            hotel: 'Hotel Solar de las Ánimas',    precioHotel: 'Desde $900/noche',   estilo: 'Cultural, gastronómico',   restaurante: 'La Antigua Casona',           precioRestaurante: '$500/persona',   nivel: 'economico'},
  // ── GUANAJUATO ────────────────────────────────────────────────────────────
  { id: 'Guanajuato|premium',     titulo: 'San Miguel Allende',   estado: 'Guanajuato',         hotel: 'Hotel Rosewood San Miguel',    precioHotel: 'Desde $4,200/noche', estilo: 'Arte, lujo colonial',      restaurante: 'Moxi by Enrique Olvera',      precioRestaurante: '$1,400/persona', nivel: 'premium'  },
  { id: 'Guanajuato|medio',       titulo: 'Guanajuato Ciudad',    estado: 'Guanajuato',         hotel: 'Hotel Boutique 1850',          precioHotel: 'Desde $1,100/noche', estilo: 'Colonial, minero',         restaurante: 'La Capellina',                precioRestaurante: '$500/persona',   nivel: 'medio'    },
  { id: 'Guanajuato|economico',   titulo: 'Festival Cervantino',  estado: 'Guanajuato',         hotel: 'Hostal Cantarranas',           precioHotel: 'Desde $350/noche',   estilo: 'Cultural, callejones',     restaurante: 'Truco 7',                     precioRestaurante: '$130/persona',   nivel: 'economico'},
  // ── GUERRERO ──────────────────────────────────────────────────────────────
  { id: 'Guerrero|premium',       titulo: 'Acapulco VIP',         estado: 'Guerrero',           hotel: 'Hotel Las Brisas Premium',     precioHotel: 'Desde $3,500/noche', estilo: 'Lujo, playa clásica',      restaurante: 'Pez Vela',                    precioRestaurante: '$900/persona',   nivel: 'premium'  },
  { id: 'Guerrero|medio',         titulo: 'Acapulco',             estado: 'Guerrero',           hotel: 'Hotel Las Brisas',             precioHotel: 'Desde $1,800/noche', estilo: 'Playa, aventura',          restaurante: 'El Amigo Miguel',             precioRestaurante: '$600/persona',   nivel: 'medio'    },
  { id: 'Guerrero|economico',     titulo: 'Zihuatanejo',          estado: 'Guerrero',           hotel: 'Posada La Noria',              precioHotel: 'Desde $500/noche',   estilo: 'Playa tranquila',          restaurante: 'El Patio',                    precioRestaurante: '$220/persona',   nivel: 'economico'},
  // ── PUEBLA ────────────────────────────────────────────────────────────────
  { id: 'Puebla|premium',         titulo: 'Puebla Gourmet',       estado: 'Puebla',             hotel: 'NH Collection Puebla',         precioHotel: 'Desde $2,500/noche', estilo: 'Alta cocina, historia',    restaurante: 'Ephimera',                    precioRestaurante: '$1,100/persona', nivel: 'premium'  },
  { id: 'Puebla|medio',           titulo: 'Centro Histórico',     estado: 'Puebla',             hotel: 'Hotel Camino Real Puebla',     precioHotel: 'Desde $1,400/noche', estilo: 'Colonial, cultural',       restaurante: 'La China Poblana',            precioRestaurante: '$500/persona',   nivel: 'medio'    },
  { id: 'Puebla|economico',       titulo: 'Cholula & Pirámide',   estado: 'Puebla',             hotel: 'Hostal Allende',               precioHotel: 'Desde $300/noche',   estilo: 'Historia, cerveza artesanal',restaurante: 'Fonda Santa Clara',           precioRestaurante: '$150/persona',   nivel: 'economico'},
  // ── VERACRUZ ──────────────────────────────────────────────────────────────
  { id: 'Veracruz|premium',       titulo: 'Veracruz Premium',     estado: 'Veracruz',           hotel: 'Galería Plaza Veracruz',       precioHotel: 'Desde $2,000/noche', estilo: 'Puerto, historia',         restaurante: 'Villa Rica Mocambo',          precioRestaurante: '$800/persona',   nivel: 'premium'  },
  { id: 'Veracruz|medio',         titulo: 'Tajín & Costa',        estado: 'Veracruz',           hotel: 'Hotel Misión Papantla',        precioHotel: 'Desde $900/noche',   estilo: 'Arqueología, playa',       restaurante: 'El Tajín Restaurant',         precioRestaurante: '$300/persona',   nivel: 'medio'    },
  { id: 'Veracruz|economico',     titulo: 'Puerto Jarocho',       estado: 'Veracruz',           hotel: 'Hotel Emporio Veracruz',       precioHotel: 'Desde $1,200/noche', estilo: 'Cultural, playa',          restaurante: 'Gran Café de la Parroquia',   precioRestaurante: '$400/persona',   nivel: 'economico'},
  // ── MICHOACÁN ─────────────────────────────────────────────────────────────
  { id: 'Michoacán|premium',      titulo: 'Pátzcuaro Boutique',   estado: 'Michoacán',          hotel: 'Hotel Villa Montaña',          precioHotel: 'Desde $2,600/noche', estilo: 'Lujo, cultura purépecha',  restaurante: 'Don Vasco Restaurant',        precioRestaurante: '$900/persona',   nivel: 'premium'  },
  { id: 'Michoacán|medio',        titulo: 'Pátzcuaro & Monarca',  estado: 'Michoacán',          hotel: 'Hotel Mansión Iturbe',         precioHotel: 'Desde $950/noche',   estilo: 'Cultural, monarca',        restaurante: 'El Patio',                    precioRestaurante: '$350/persona',   nivel: 'medio'    },
  { id: 'Michoacán|economico',    titulo: 'Santuario Mariposas',  estado: 'Michoacán',          hotel: 'Hostal La Catedral Morelia',   precioHotel: 'Desde $350/noche',   estilo: 'Naturaleza, artesanías',   restaurante: 'Las Mercedes',                precioRestaurante: '$150/persona',   nivel: 'economico'},
  // ── SINALOA ───────────────────────────────────────────────────────────────
  { id: 'Sinaloa|premium',        titulo: 'Mazatlán Zona Dorada', estado: 'Sinaloa',            hotel: 'Hotel El Cid Marina',          precioHotel: 'Desde $2,100/noche', estilo: 'Playa, carnaval, lujo',    restaurante: 'Angelo\'s Restaurant',        precioRestaurante: '$800/persona',   nivel: 'premium'  },
  { id: 'Sinaloa|medio',          titulo: 'Mazatlán',             estado: 'Sinaloa',            hotel: 'Hotel Playa Mazatlán',         precioHotel: 'Desde $800/noche',   estilo: 'Playa, carnaval',          restaurante: 'Pedro & Lola',                precioRestaurante: '$450/persona',   nivel: 'medio'    },
  { id: 'Sinaloa|economico',      titulo: 'Mazatlán Histórico',   estado: 'Sinaloa',            hotel: 'Hotel Sinaloa Centro',         precioHotel: 'Desde $420/noche',   estilo: 'Centro histórico, playa',  restaurante: 'El Presidio',                 precioRestaurante: '$180/persona',   nivel: 'economico'},
  // ── QUERÉTARO ─────────────────────────────────────────────────────────────
  { id: 'Querétaro|premium',      titulo: 'Querétaro Boutique',   estado: 'Querétaro',          hotel: 'La Casa de la Marquesa',       precioHotel: 'Desde $2,800/noche', estilo: 'Colonial, vinos finos',    restaurante: 'La Viña del Marqués',         precioRestaurante: '$1,000/persona', nivel: 'premium'  },
  { id: 'Querétaro|medio',        titulo: 'Peña de Bernal',       estado: 'Querétaro',          hotel: 'Meson de Bernal',              precioHotel: 'Desde $1,100/noche', estilo: 'Colonial, viticola',       restaurante: 'El Mezquite',                 precioRestaurante: '$420/persona',   nivel: 'medio'    },
  { id: 'Querétaro|economico',    titulo: 'Querétaro Histórico',  estado: 'Querétaro',          hotel: 'Hostal 1810',                  precioHotel: 'Desde $380/noche',   estilo: 'Callejones, historia',     restaurante: 'La Flor de Querétaro',        precioRestaurante: '$160/persona',   nivel: 'economico'},
  // ── SAN LUIS POTOSÍ ───────────────────────────────────────────────────────
  { id: 'San Luis Potosí|premium',titulo: 'Huasteca Premium',     estado: 'San Luis Potosí',    hotel: 'Real de Minas SLP',            precioHotel: 'Desde $2,100/noche', estilo: 'Naturaleza de lujo',       restaurante: 'La Corriente Cebichería',     precioRestaurante: '$900/persona',   nivel: 'premium'  },
  { id: 'San Luis Potosí|medio',  titulo: 'Cascadas Huasteca',    estado: 'San Luis Potosí',    hotel: 'Hotel Valles',                 precioHotel: 'Desde $900/noche',   estilo: 'Cascadas, naturaleza',     restaurante: 'El Callejón',                 precioRestaurante: '$300/persona',   nivel: 'medio'    },
  { id: 'San Luis Potosí|economico',titulo: 'Xilitla Surrealista',estado: 'San Luis Potosí',    hotel: 'Posada El Castillo',           precioHotel: 'Desde $420/noche',   estilo: 'Surrealismo, selva',       restaurante: 'Café Inglés',                 precioRestaurante: '$130/persona',   nivel: 'economico'},
  // ── NUEVO LEÓN ────────────────────────────────────────────────────────────
  { id: 'Nuevo León|premium',     titulo: 'Monterrey Business',   estado: 'Nuevo León',         hotel: 'Galería Plaza Monterrey',      precioHotel: 'Desde $3,200/noche', estilo: 'Negocios, gastronomía regia',restaurante: 'Pangea',                    precioRestaurante: '$1,200/persona', nivel: 'premium'  },
  { id: 'Nuevo León|medio',       titulo: 'Monterrey Cultural',   estado: 'Nuevo León',         hotel: 'Hotel Ancira Hyatt',           precioHotel: 'Desde $1,600/noche', estilo: 'Arte, sierra, urbano',     restaurante: 'El Rey del Cabrito',          precioRestaurante: '$700/persona',   nivel: 'medio'    },
  { id: 'Nuevo León|economico',   titulo: 'Barrio Antiguo MTY',   estado: 'Nuevo León',         hotel: 'Hostal MTY',                   precioHotel: 'Desde $400/noche',   estilo: 'Barrio Antiguo, cañones',  restaurante: 'Taquitos el Tío',             precioRestaurante: '$180/persona',   nivel: 'economico'},
  // ── BAJA CALIFORNIA ───────────────────────────────────────────────────────
  { id: 'Baja California|premium',titulo: 'Valle de Guadalupe',   estado: 'Baja California',    hotel: 'Bruma Restaurant & Hotel',     precioHotel: 'Desde $3,800/noche', estilo: 'Enoturismo de lujo',       restaurante: 'Fauna by David Castro',       precioRestaurante: '$1,600/persona', nivel: 'premium'  },
  { id: 'Baja California|medio',  titulo: 'Ensenada & Vinos',     estado: 'Baja California',    hotel: 'Hotel Misión Santa Isabel',    precioHotel: 'Desde $1,300/noche', estilo: 'Vinos, mariscos',          restaurante: 'Manzanilla',                  precioRestaurante: '$600/persona',   nivel: 'medio'    },
  { id: 'Baja California|economico',titulo: 'Tijuana Gastronómica',estado: 'Baja California',   hotel: 'Hotel Lucerna Tijuana',        precioHotel: 'Desde $700/noche',   estilo: 'Gastronomía urbana',       restaurante: 'Caesar\'s Restaurant',        precioRestaurante: '$250/persona',   nivel: 'economico'},
  // ── BAJA CALIFORNIA SUR ───────────────────────────────────────────────────
  { id: 'Baja California Sur|premium',  titulo: 'Los Cabos Premium',   estado: 'Baja California Sur', hotel: 'The Cape Thompson',       precioHotel: 'Desde $8,000/noche', estilo: 'Ultra lujo, yates, surf',  restaurante: 'El Farallón',                 precioRestaurante: '$2,500/persona', nivel: 'premium'  },
  { id: 'Baja California Sur|medio',    titulo: 'La Paz & Ballenas',   estado: 'Baja California Sur', hotel: 'Hotel Seven Crown La Paz',precioHotel: 'Desde $1,600/noche', estilo: 'Mar de Cortés, naturaleza', restaurante: 'El Bismarkcito',              precioRestaurante: '$500/persona',   nivel: 'medio'    },
  { id: 'Baja California Sur|economico',titulo: 'Loreto & Misiones',   estado: 'Baja California Sur', hotel: 'Hostal Junipero',         precioHotel: 'Desde $500/noche',   estilo: 'Historia, kayak',          restaurante: 'La Palapa',                   precioRestaurante: '$180/persona',   nivel: 'economico'},
  // ── HIDALGO ───────────────────────────────────────────────────────────────
  { id: 'Hidalgo|medio',          titulo: 'Prismas Basálticos',   estado: 'Hidalgo',            hotel: 'Camino Real Pachuca',          precioHotel: 'Desde $1,100/noche', estilo: 'Naturaleza, haciendas',    restaurante: 'El Mesón',                    precioRestaurante: '$300/persona',   nivel: 'medio'    },
  { id: 'Hidalgo|economico',      titulo: 'Mineral del Monte',    estado: 'Hidalgo',            hotel: 'Posada Real Mineral del Monte', precioHotel: 'Desde $500/noche',  estilo: 'Pueblo mágico, pastes',    restaurante: 'Cantina Real',                precioRestaurante: '$130/persona',   nivel: 'economico'},
  // ── NAYARIT ───────────────────────────────────────────────────────────────
  { id: 'Nayarit|premium',        titulo: 'Punta Mita Exclusiva', estado: 'Nayarit',            hotel: 'Four Seasons Punta Mita',      precioHotel: 'Desde $7,000/noche', estilo: 'Lujo absoluto, surf',      restaurante: 'Ketsi',                       precioRestaurante: '$2,000/persona', nivel: 'premium'  },
  { id: 'Nayarit|medio',          titulo: 'Sayulita Surf',        estado: 'Nayarit',            hotel: 'Hotel Boutique DOMe',          precioHotel: 'Desde $1,500/noche', estilo: 'Surf, pueblo artesanal',   restaurante: 'Don Pedro\'s',                precioRestaurante: '$450/persona',   nivel: 'medio'    },
  { id: 'Nayarit|economico',      titulo: 'Sayulita Mochilera',   estado: 'Nayarit',            hotel: 'Hostal Weliwel',               precioHotel: 'Desde $350/noche',   estilo: 'Playa, hippie, surf',      restaurante: 'El Itacate',                  precioRestaurante: '$140/persona',   nivel: 'economico'},
  // ── SONORA ────────────────────────────────────────────────────────────────
  { id: 'Sonora|premium',         titulo: 'San Carlos Premium',   estado: 'Sonora',             hotel: 'Hotel Marbella San Carlos',    precioHotel: 'Desde $2,400/noche', estilo: 'Mar de Cortés, pesca',     restaurante: 'El Marinero',                 precioRestaurante: '$800/persona',   nivel: 'premium'  },
  { id: 'Sonora|medio',           titulo: 'Puerto Peñasco',       estado: 'Sonora',             hotel: 'Hotel Peñasco del Sol',        precioHotel: 'Desde $1,200/noche', estilo: 'Playa, Mar de Cortés',     restaurante: 'La Curva',                    precioRestaurante: '$400/persona',   nivel: 'medio'    },
  { id: 'Sonora|economico',       titulo: 'Álamos Pueblo Mágico', estado: 'Sonora',             hotel: 'Posada de los Tesoros',        precioHotel: 'Desde $550/noche',   estilo: 'Colonial, historia minera',restaurante: 'El Mesón la Hacienda',        precioRestaurante: '$200/persona',   nivel: 'economico'},
  // ── CHIHUAHUA ─────────────────────────────────────────────────────────────
  { id: 'Chihuahua|premium',      titulo: 'Barrancas del Cobre VIP',estado: 'Chihuahua',        hotel: 'Posada del Cobre',             precioHotel: 'Desde $3,500/noche', estilo: 'Aventura de lujo',         restaurante: 'El Divisadero Restaurant',    precioRestaurante: '$900/persona',   nivel: 'premium'  },
  { id: 'Chihuahua|medio',        titulo: 'Barrancas Cobre',      estado: 'Chihuahua',          hotel: 'Hotel Misión',                 precioHotel: 'Desde $1,400/noche', estilo: 'Aventura, rarámuris',      restaurante: 'Tarahumara Restaurant',       precioRestaurante: '$450/persona',   nivel: 'medio'    },
  { id: 'Chihuahua|economico',    titulo: 'Chihuahua Capital',    estado: 'Chihuahua',          hotel: 'Hotel San Juan',               precioHotel: 'Desde $500/noche',   estilo: 'Historia, desierto',       restaurante: 'La Calesa de Pancho Villa',   precioRestaurante: '$200/persona',   nivel: 'economico'},
  // ── COLIMA ────────────────────────────────────────────────────────────────
  { id: 'Colima|medio',           titulo: 'Volcán de Colima',     estado: 'Colima',             hotel: 'Hotel Las Candelas',           precioHotel: 'Desde $1,000/noche', estilo: 'Volcán, mar pacífico',     restaurante: 'Los Naranjos',                precioRestaurante: '$350/persona',   nivel: 'medio'    },
  { id: 'Colima|economico',       titulo: 'Manzanillo Playero',   estado: 'Colima',             hotel: 'Posada La Tortuga',            precioHotel: 'Desde $450/noche',   estilo: 'Playa, pesca, descanso',   restaurante: 'El Fogón',                    precioRestaurante: '$160/persona',   nivel: 'economico'},
  // ── MORELOS ───────────────────────────────────────────────────────────────
  { id: 'Morelos|medio',          titulo: 'Cuernavaca Histórica', estado: 'Morelos',            hotel: 'Hotel Cortés Cuernavaca',      precioHotel: 'Desde $1,300/noche', estilo: 'Historia, jardines',       restaurante: 'La India Bonita',             precioRestaurante: '$400/persona',   nivel: 'medio'    },
  { id: 'Morelos|economico',      titulo: 'Balnearios de Morelos',estado: 'Morelos',            hotel: 'Posada Cuauhtémoc',            precioHotel: 'Desde $400/noche',   estilo: 'Balnearios, relajación',   restaurante: 'Fonda Recreativa',            precioRestaurante: '$130/persona',   nivel: 'economico'},
  // ── ZACATECAS ─────────────────────────────────────────────────────────────
  { id: 'Zacatecas|premium',      titulo: 'Zacatecas Colonial',   estado: 'Zacatecas',          hotel: 'Quinta Real Zacatecas',        precioHotel: 'Desde $3,000/noche', estilo: 'Hacienda, vinos, historia',restaurante: 'El Recoveco',                 precioRestaurante: '$900/persona',   nivel: 'premium'  },
  { id: 'Zacatecas|medio',        titulo: 'Casco Histórico',      estado: 'Zacatecas',          hotel: 'Hotel Emporio Zacatecas',      precioHotel: 'Desde $1,200/noche', estilo: 'Mining, colonial, arte',   restaurante: 'El Jacalito',                 precioRestaurante: '$380/persona',   nivel: 'medio'    },
  { id: 'Zacatecas|economico',    titulo: 'Zacatecas Minas',      estado: 'Zacatecas',          hotel: 'Hostal del Centro',            precioHotel: 'Desde $380/noche',   estilo: 'Teleférico, plata',        restaurante: 'La Cuija',                    precioRestaurante: '$150/persona',   nivel: 'economico'},
];

export const COLORES_NIVEL: Record<Nivel, string> = {
  economico: '#3AB7A5',
  medio: '#e9c46a',
  premium: '#DD331D'
};

export const ETIQUETA_NIVEL: Record<Nivel, string> = {
  economico: 'Económico',
  medio: 'Medio',
  premium: 'Premium'
};

export type Paquete = {
  nivel: 'economico' | 'medio' | 'premium';
  etiqueta: string; color: string; emoji: string;
  precioTotal: string; hotel: string; estrellas: number;
  precioHotel: string; descripcionHotel: string; incluye: string[];
  restaurante: string; tipoCocina: string; precioRestaurante: string;
  platillo: string; transporte: string; precioTransporte: string;
  actividades: string[]; diasRecomendados: number; imagenesHotel: string[];
};

export const PAQUETES_POR_ESTADO: Record<string, Paquete[]> = {
  'Chiapas': [
    { nivel:'economico', etiqueta:'Económico', color:'#3AB7A5', emoji:'💰', precioTotal:'$2,500 MXN por persona', hotel:'Hostal Río Lacanjá', estrellas:2, precioHotel:'$350 MXN / noche', descripcionHotel:'Hostal acogedor en el centro de San Cristóbal, con vista a los cerros y desayuno incluido.', incluye:['WiFi gratuito','Desayuno continental','Casilleros seguros'], restaurante:'El Fogón de Jovel', tipoCocina:'Comida típica chiapaneca', precioRestaurante:'$120 MXN por persona', platillo:'Tasajo con frijoles y tortillas hechas a mano', transporte:'Combi local + caminatas', precioTransporte:'$80 MXN / día', actividades:['Cañón del Sumidero en lancha','Mercado de Santo Domingo','Templo de San Cristóbal'], diasRecomendados:3, imagenesHotel:['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800','https://images.unsplash.com/photo-1506059612708-99d6c258160e?w=800','https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800'] },
    { nivel:'medio',     etiqueta:'Medio',     color:'#e9c46a', emoji:'⭐', precioTotal:'$5,800 MXN por persona', hotel:'Hotel Casa Mexicana', estrellas:3, precioHotel:'$980 MXN / noche', descripcionHotel:'Hotel boutique colonial en el corazón de San Cristóbal, con jardín interior y spa.', incluye:['WiFi gratuito','Desayuno buffet','Piscina','Estacionamiento'], restaurante:'TierrAdentro', tipoCocina:'Fusión mexicana contemporánea', precioRestaurante:'$380 MXN por persona', platillo:'Cochinita pibil con achiote y habanero', transporte:'Taxi privado + tours organizados', precioTransporte:'$250 MXN / día', actividades:['Tour Cascadas de Agua Azul','Palenque ruinas mayas','Pueblo mágico Zinacantán'], diasRecomendados:4, imagenesHotel:['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800','https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800','https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800'] },
    { nivel:'premium',   etiqueta:'Premium',   color:'#DD331D', emoji:'💎', precioTotal:'$12,000 MXN por persona', hotel:'Na Bolom Lodge', estrellas:5, precioHotel:'$2,800 MXN / noche', descripcionHotel:'Lodge de lujo ecológico rodeado de selva lacandona, con guías especializados en cultura maya.', incluye:['Todo incluido','Spa completo','Tours privados','Traslados en camioneta privada','Guía bilingüe'], restaurante:'La Viña de Bacco', tipoCocina:'Alta cocina mexicana', precioRestaurante:'$900 MXN por persona', platillo:'Filete de res con reducción de mezcal y mole negro', transporte:'Camioneta privada 4x4', precioTransporte:'Incluido en paquete', actividades:['Vuelo en helicóptero sobre Cañón del Sumidero','Tour privado Palenque al amanecer','Ceremonia tzeltal con chamán local','Snorkel en Lagos de Montebello'], diasRecomendados:5, imagenesHotel:['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800','https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800','https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800'] },
  ],
  'Yucatán': [
    { nivel:'economico', etiqueta:'Económico', color:'#3AB7A5', emoji:'💰', precioTotal:'$2,800 MXN por persona', hotel:'Hostal Nomadas', estrellas:2, precioHotel:'$320 MXN / noche', descripcionHotel:'Hostal céntrico en Mérida, a dos cuadras del Zócalo. Ambiente joven y viajero.', incluye:['WiFi gratuito','Cocina compartida','Bicicletas de préstamo'], restaurante:'La Chaya Maya', tipoCocina:'Comida yucateca auténtica', precioRestaurante:'$150 MXN por persona', platillo:'Sopa de lima y panuchos con cochinita', transporte:'Bicicleta + ADO bus', precioTransporte:'$100 MXN / día', actividades:['Chichén Itzá (entrada general)','Cenote Ik Kil','Paseo en calesa por Mérida'], diasRecomendados:3, imagenesHotel:['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800','https://images.unsplash.com/photo-1510525009562-b41a2b2b0c9a?w=800','https://images.unsplash.com/photo-1506059612708-99d6c258160e?w=800'] },
    { nivel:'medio',     etiqueta:'Medio',     color:'#e9c46a', emoji:'⭐', precioTotal:'$6,500 MXN por persona', hotel:'Hacienda Xcanatún', estrellas:4, precioHotel:'$1,400 MXN / noche', descripcionHotel:'Hacienda henequenera del siglo XVIII restaurada, con piscina de aguas termales y spa.', incluye:['Desayuno gourmet','Piscina','Spa','WiFi','Traslado aeropuerto'], restaurante:'Casa de Piedra', tipoCocina:'Nouvelle cuisine yucateca', precioRestaurante:'$550 MXN por persona', platillo:'Poc Chuc con ensalada de jícama y naranja', transporte:'Auto rentado + guía turístico', precioTransporte:'$400 MXN / día', actividades:['Tour privado Chichén Itzá + Uxmal','Nado en cenotes privados','Mercado Lucas de Gálvez con chef local'], diasRecomendados:4, imagenesHotel:['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800','https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800','https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800'] },
    { nivel:'premium',   etiqueta:'Premium',   color:'#DD331D', emoji:'💎', precioTotal:'$15,000 MXN por persona', hotel:'Chablé Resort & Spa', estrellas:5, precioHotel:'$4,500 MXN / noche', descripcionHotel:'Resort de ultra lujo con cenote privado, villas con piscina individual y conexión espiritual maya.', incluye:['Todo incluido premium','Cenote privado','Piscina privada en villa','Butler 24h','Helipuerto','Tours exclusivos'], restaurante:"Ixi'im Restaurant", tipoCocina:'Alta cocina maya contemporánea', precioRestaurante:'$1,800 MXN por persona', platillo:'Venado con pepita negra, hierba santa y trufa blanca', transporte:'Helicóptero o SUV privado', precioTransporte:'Incluido en paquete', actividades:['Acceso privado nocturno a Chichén Itzá','Experiencia espiritual con sacerdote maya','Yate privado por la costa yucateca','Clase de cocina con chef Michelín'], diasRecomendados:6, imagenesHotel:['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800','https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800','https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800'] },
  ],
  'default': [
    { nivel:'economico', etiqueta:'Económico', color:'#3AB7A5', emoji:'💰', precioTotal:'$2,200 MXN por persona', hotel:'Hostal del Viajero', estrellas:2, precioHotel:'$300 MXN / noche', descripcionHotel:'Hostal céntrico con ambiente familiar, ideal para mochileros y viajeros independientes.', incluye:['WiFi gratuito','Cocina compartida','Casilleros seguros'], restaurante:'Fonda La Tradicional', tipoCocina:'Comida mexicana casera', precioRestaurante:'$100 MXN por persona', platillo:'Comida corrida con sopa, guisado y postre', transporte:'Transporte público local', precioTransporte:'$60 MXN / día', actividades:['Visita al centro histórico','Mercado local','Parque principal'], diasRecomendados:2, imagenesHotel:['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800','https://images.unsplash.com/photo-1506059612708-99d6c258160e?w=800','https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800'] },
    { nivel:'medio',     etiqueta:'Medio',     color:'#e9c46a', emoji:'⭐', precioTotal:'$5,500 MXN por persona', hotel:'Hotel Boutique Local', estrellas:3, precioHotel:'$900 MXN / noche', descripcionHotel:'Hotel boutique de estilo regional con decoración artesanal y excelente ubicación.', incluye:['Desayuno incluido','WiFi','Piscina','Estacionamiento'], restaurante:'Restaurante del Centro', tipoCocina:'Cocina regional mexicana', precioRestaurante:'$350 MXN por persona', platillo:'Especialidad regional de temporada', transporte:'Taxi + tours organized', precioTransporte:'$220 MXN / día', actividades:['Tour guiado por el centro','Visita a zonas arqueológicas cercanas','Taller artesanal local'], diasRecomendados:3, imagenesHotel:['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800','https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800','https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800'] },
    { nivel:'premium',   etiqueta:'Premium',   color:'#DD331D', emoji:'💎', precioTotal:'$11,000 MXN por persona', hotel:'Gran Hotel de Lujo', estrellas:5, precioHotel:'$2,500 MXN / noche', descripcionHotel:'Hotel cinco estrellas con spa, restaurante gourmet y servicio de concierge personalizado.', incluye:['Todo incluido','Spa completo','Traslados privados','Guía bilingüe exclusivo','Tours privados'], restaurante:'Alta Cocina Regional', tipoCocina:'Gastronomía de autor', precioRestaurante:'$1,200 MXN por persona', platillo:'Menú degustación de 7 tiempos con maridaje', transporte:'Vehículo privado con chofer', precioTransporte:'Incluido en paquete', actividades:['Tours privados a sitios exclusivos','Experiencia cultural personalizada','Cena de gala en locación histórica','Traslado en helicóptero opcional'], diasRecomendados:5, imagenesHotel:['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800','https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800','https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800'] },
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
 * Parsea una clave de ruta con formato "Estado|nivel"
 */
export const parsearClaveRuta = (clave: string): { estado: string; nivel: Nivel } => {
  const [estado, nivel = 'medio'] = clave.split('|');
  return { estado, nivel: nivel as Nivel };
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