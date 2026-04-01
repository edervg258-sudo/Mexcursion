-- ============================================================
--  MEXCURSIÓN — Datos iniciales (seed)
--  Pega esto en el SQL Editor DESPUÉS de ejecutar schema.sql
--  Es seguro correrlo varias veces (ON CONFLICT DO NOTHING)
-- ============================================================


-- ════════════════════════════════════════════════════════════
--  ESTADOS DE MÉXICO  (IDs fijos — deben coincidir con
--  TODOS_LOS_ESTADOS en lib/constantes.ts para que los
--  favoritos funcionen correctamente)
-- ════════════════════════════════════════════════════════════

INSERT INTO public.estados (id, nombre, categoria, descripcion, precio, activo) VALUES
  ( 1, 'Aguascalientes',    'Cultura',      'Feria, viñedos y arquitectura colonial',             1800, 1),
  ( 2, 'Baja California',   'Aventura',     'Valle de Guadalupe, playas y ballenas',              2500, 1),
  ( 3, 'Baja California Sur','Playa',       'El Arco, mar de Cortés y vida marina',               3800, 1),
  ( 4, 'Campeche',          'Cultura',      'Ciudad amurallada, maya y colonial',                 2000, 1),
  ( 5, 'Chiapas',           'Aventura',     'Selva, cascadas y cañones impresionantes',           2500, 1),
  ( 6, 'Chihuahua',         'Aventura',     'Barrancas del Cobre y desierto',                     2200, 1),
  ( 7, 'Ciudad de México',  'Ciudad',       'Historia, arte, gastronomía y vida nocturna',        1500, 1),
  ( 8, 'Coahuila',          'Aventura',     'Cuatro Ciénegas y desierto de Chihuahua',            1800, 1),
  ( 9, 'Colima',            'Aventura',     'Volcán de Colima y playas del Pacífico',             1700, 1),
  (10, 'Durango',           'Aventura',     'Cañones, sierras y escenarios de western',           1900, 1),
  (11, 'Estado de México',  'Cultura',      'Teotihuacán, Valle de Bravo y mariposas',            1500, 1),
  (12, 'Guanajuato',        'Cultura',      'Callejones coloniales y Festival Cervantino',        2000, 1),
  (13, 'Guerrero',          'Playa',        'Acapulco, Ixtapa y costas bravas del sur',           1800, 1),
  (14, 'Hidalgo',           'Cultura',      'Prismas basálticos, haciendas y pulque',             1600, 1),
  (15, 'Jalisco',           'Gastronomía',  'Tequila, mariachi y tradición tapatía',              2100, 1),
  (16, 'Michoacán',         'Cultura',      'Mariposas monarca, Pátzcuaro y artesanías',          1900, 1),
  (17, 'Morelos',           'Cultura',      'Haciendas, balnearios y Xochicalco',                 1500, 1),
  (18, 'Nayarit',           'Playa',        'Sayulita, Islas Marietas y surf',                    2300, 1),
  (19, 'Nuevo León',        'Ciudad',       'Monterrey, cañones y vida industrial',               1800, 1),
  (20, 'Oaxaca',            'Gastronomía',  'Arte, mole negro, mezcal y Monte Albán',             2800, 1),
  (21, 'Puebla',            'Cultura',      'Talavera, chiles en nogada y conventos',             1900, 1),
  (22, 'Querétaro',         'Cultura',      'Acueducto, vinos y Peña de Bernal',                  1800, 1),
  (23, 'Quintana Roo',      'Playa',        'Mar turquesa, arrecifes y cenotes',                  4500, 1),
  (24, 'San Luis Potosí',   'Cultura',      'Huasteca Potosina, cascadas y cañones',              1800, 1),
  (25, 'Sinaloa',           'Playa',        'Mazatlán, playas y gastronomía de mar',              2000, 1),
  (26, 'Sonora',            'Aventura',     'Desierto de Altar, Mar de Cortés y playa',           2000, 1),
  (27, 'Tabasco',           'Cultura',      'Cultura olmeca, ríos y selva tropical',              1700, 1),
  (28, 'Tamaulipas',        'Ciudad',       'Tampico, playas del Golfo y frontera',               1600, 1),
  (29, 'Tlaxcala',          'Cultura',      'Carnaval, Cacaxtla y tradiciones vivas',             1400, 1),
  (30, 'Veracruz',          'Cultura',      'Puerto, son jarocho, Tajín y cascadas',              1800, 1),
  (31, 'Yucatán',           'Cultura',      'Chichén Itzá, cenotes y haciendas mayas',            3200, 1),
  (32, 'Zacatecas',         'Cultura',      'Minas de plata, teleférico y arte barroco',          1900, 1)
ON CONFLICT (id) DO NOTHING;

-- Avanza la secuencia para que los próximos INSERTs sin ID no colisionen
SELECT setval(
  pg_get_serial_sequence('public.estados', 'id'),
  GREATEST((SELECT MAX(id) FROM public.estados), 1)
);


-- ════════════════════════════════════════════════════════════
--  SUGERENCIAS DE RUTAS
-- ════════════════════════════════════════════════════════════

INSERT INTO public.sugerencias_rutas (titulo, estado, nivel, activo) VALUES

  -- Quintana Roo
  ('Tulum de Lujo',           'Quintana Roo',       'premium',   1),
  ('Cancún & Playa',          'Quintana Roo',       'medio',     1),
  ('Riviera Maya',            'Quintana Roo',       'economico', 1),

  -- Yucatán
  ('Mérida Exclusiva',        'Yucatán',            'premium',   1),
  ('Chichén Itzá',            'Yucatán',            'medio',     1),
  ('Mérida Colonial',         'Yucatán',            'economico', 1),

  -- Chiapas
  ('Palenque VIP',            'Chiapas',            'premium',   1),
  ('San Cristóbal',           'Chiapas',            'medio',     1),
  ('Cañón del Sumidero',      'Chiapas',            'economico', 1),

  -- Oaxaca
  ('Oaxaca Gourmet',          'Oaxaca',             'premium',   1),
  ('Monte Albán',             'Oaxaca',             'medio',     1),
  ('Oaxaca Artesanal',        'Oaxaca',             'economico', 1),

  -- Ciudad de México
  ('CDMX de Lujo',            'Ciudad de México',   'premium',   1),
  ('Coyoacán & Museos',       'Ciudad de México',   'medio',     1),
  ('Centro Histórico',        'Ciudad de México',   'economico', 1),

  -- Jalisco
  ('Guadalajara Premium',     'Jalisco',            'premium',   1),
  ('Guadalajara',             'Jalisco',            'medio',     1),
  ('Pueblo Tequila',          'Jalisco',            'economico', 1),

  -- Guanajuato
  ('San Miguel Allende',      'Guanajuato',         'premium',   1),
  ('Guanajuato Ciudad',       'Guanajuato',         'medio',     1),
  ('Festival Cervantino',     'Guanajuato',         'economico', 1),

  -- Guerrero
  ('Acapulco VIP',            'Guerrero',           'premium',   1),
  ('Acapulco',                'Guerrero',           'medio',     1),
  ('Zihuatanejo',             'Guerrero',           'economico', 1),

  -- Puebla
  ('Puebla Gourmet',          'Puebla',             'premium',   1),
  ('Centro Histórico Puebla', 'Puebla',             'medio',     1),
  ('Cholula & Pirámide',      'Puebla',             'economico', 1),

  -- Veracruz
  ('Veracruz Premium',        'Veracruz',           'premium',   1),
  ('Tajín & Costa',           'Veracruz',           'medio',     1),
  ('Puerto Jarocho',          'Veracruz',           'economico', 1),

  -- Michoacán
  ('Pátzcuaro Boutique',      'Michoacán',          'premium',   1),
  ('Pátzcuaro & Monarca',     'Michoacán',          'medio',     1),
  ('Santuario Mariposas',     'Michoacán',          'economico', 1),

  -- Sinaloa
  ('Mazatlán Zona Dorada',    'Sinaloa',            'premium',   1),
  ('Mazatlán',                'Sinaloa',            'medio',     1),
  ('Mazatlán Histórico',      'Sinaloa',            'economico', 1),

  -- Querétaro
  ('Querétaro Boutique',      'Querétaro',          'premium',   1),
  ('Peña de Bernal',          'Querétaro',          'medio',     1),
  ('Querétaro Histórico',     'Querétaro',          'economico', 1),

  -- San Luis Potosí
  ('Huasteca Premium',        'San Luis Potosí',    'premium',   1),
  ('Cascadas Huasteca',       'San Luis Potosí',    'medio',     1),
  ('Xilitla Surrealista',     'San Luis Potosí',    'economico', 1),

  -- Nuevo León
  ('Monterrey Business',      'Nuevo León',         'premium',   1),
  ('Monterrey Cultural',      'Nuevo León',         'medio',     1),
  ('Barrio Antiguo MTY',      'Nuevo León',         'economico', 1),

  -- Baja California
  ('Valle de Guadalupe',      'Baja California',    'premium',   1),
  ('Ensenada & Vinos',        'Baja California',    'medio',     1),
  ('Tijuana Gastronómica',    'Baja California',    'economico', 1),

  -- Baja California Sur
  ('Los Cabos Premium',       'Baja California Sur','premium',   1),
  ('La Paz & Ballenas',       'Baja California Sur','medio',     1),
  ('Loreto & Misiones',       'Baja California Sur','economico', 1),

  -- Hidalgo
  ('Prismas Basálticos',      'Hidalgo',            'medio',     1),
  ('Mineral del Monte',       'Hidalgo',            'economico', 1),

  -- Nayarit
  ('Punta Mita Exclusiva',    'Nayarit',            'premium',   1),
  ('Sayulita Surf',           'Nayarit',            'medio',     1),
  ('Sayulita Mochilera',      'Nayarit',            'economico', 1),

  -- Sonora
  ('San Carlos Premium',      'Sonora',             'premium',   1),
  ('Puerto Peñasco',          'Sonora',             'medio',     1),
  ('Álamos Pueblo Mágico',    'Sonora',             'economico', 1),

  -- Chihuahua
  ('Barrancas del Cobre VIP', 'Chihuahua',          'premium',   1),
  ('Barrancas Cobre',         'Chihuahua',          'medio',     1),
  ('Chihuahua Capital',       'Chihuahua',          'economico', 1),

  -- Colima
  ('Volcán de Colima',        'Colima',             'medio',     1),
  ('Manzanillo Playero',      'Colima',             'economico', 1),

  -- Morelos
  ('Cuernavaca Histórica',    'Morelos',            'medio',     1),
  ('Balnearios de Morelos',   'Morelos',            'economico', 1),

  -- Zacatecas
  ('Zacatecas Colonial',      'Zacatecas',          'premium',   1),
  ('Casco Histórico',         'Zacatecas',          'medio',     1),
  ('Zacatecas Minas',         'Zacatecas',          'economico', 1)

ON CONFLICT DO NOTHING;
