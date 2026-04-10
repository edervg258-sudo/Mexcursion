// ============================================================
//  lib/datos/estados.ts  —  Datos de los 32 estados de México
// ============================================================

import type { Estado, CategoriaEstado } from '../tipos';

// ===========================
//  TODOS LOS ESTADOS DE MÉXICO
// ===========================

export const TODOS_LOS_ESTADOS: Estado[] = [
  {
    id: 1,
    nombre: 'Aguascalientes',
    categoria: 'Cultura' as CategoriaEstado,
    descripcion: 'Feria, viñedos y arquitectura colonial',
    imagen: require('../../assets/images/aguascalientes.png'),
    precio: 1800,
    latitude: 21.8853,
    longitude: -102.2916
  },
  {
    id: 2,
    nombre: 'Baja California',
    categoria: 'Aventura' as CategoriaEstado,
    descripcion: 'Valle de Guadalupe, playas y ballenas',
    imagen: require('../../assets/images/baja_california.png'),
    precio: 2500,
    latitude: 30.8406,
    longitude: -115.2838
  },
  {
    id: 3,
    nombre: 'Baja California Sur',
    categoria: 'Playa' as CategoriaEstado,
    descripcion: 'El Arco, mar de Cortés y vida marina',
    imagen: require('../../assets/images/baja_california_sur.png'),
    precio: 3800,
    latitude: 24.1426,
    longitude: -110.3128
  },
  {
    id: 4,
    nombre: 'Campeche',
    categoria: 'Cultura' as CategoriaEstado,
    descripcion: 'Ciudad amurallada, maya y colonial',
    imagen: require('../../assets/images/campeche.png'),
    precio: 2000,
    latitude: 19.8301,
    longitude: -90.5349
  },
  {
    id: 5,
    nombre: 'Chiapas',
    categoria: 'Aventura' as CategoriaEstado,
    descripcion: 'Selva, cascadas y cañones impresionantes',
    imagen: require('../../assets/images/chiapas.png'),
    precio: 2500,
    latitude: 16.7569,
    longitude: -93.1292
  },
  {
    id: 8,
    nombre: 'Chihuahua',
    categoria: 'Aventura' as CategoriaEstado,
    descripcion: 'Sierra Madre, Barrancas del Cobre',
    imagen: require('../../assets/images/chihuahua.png'),
    precio: 1800,
    latitude: 28.6353,
    longitude: -106.0889
  },
  {
    id: 7,
    nombre: 'Ciudad de México',
    categoria: 'Ciudad' as CategoriaEstado,
    descripcion: 'Historia, arte, gastronomía y vida nocturna',
    imagen: require('../../assets/images/cdmx.png'),
    precio: 1500,
    latitude: 19.4326,
    longitude: -99.1332
  },
  {
    id: 6,
    nombre: 'Coahuila',
    categoria: 'Aventura' as CategoriaEstado,
    descripcion: 'Desiertos, minas y dinosaurios',
    imagen: require('../../assets/images/coahuila.png'),
    precio: 2200,
    latitude: 25.4232,
    longitude: -101.0053
  },
  {
    id: 9,
    nombre: 'Colima',
    categoria: 'Aventura' as CategoriaEstado,
    descripcion: 'Volcán de Colima y playas del Pacífico',
    imagen: require('../../assets/images/colima.png'),
    precio: 1700
  },
  {
    id: 10,
    nombre: 'Durango',
    categoria: 'Aventura' as CategoriaEstado,
    descripcion: 'Cañones, sierras y escenarios de western',
    imagen: require('../../assets/images/durango.png'),
    precio: 1900
  },
  {
    id: 11,
    nombre: 'Estado de México',
    categoria: 'Cultura' as CategoriaEstado,
    descripcion: 'Teotihuacán, Valle de Bravo y mariposas',
    imagen: require('../../assets/images/estado_mex.png'),
    precio: 1500
  },
  {
    id: 12,
    nombre: 'Guanajuato',
    categoria: 'Cultura' as CategoriaEstado,
    descripcion: 'Callejones coloniales y Festival Cervantino',
    imagen: require('../../assets/images/guanajuato.png'),
    precio: 2000
  },
  {
    id: 13,
    nombre: 'Guerrero',
    categoria: 'Playa' as CategoriaEstado,
    descripcion: 'Acapulco, Ixtapa y costas bravas del sur',
    imagen: require('../../assets/images/guerrero.png'),
    precio: 1800
  },
  {
    id: 14,
    nombre: 'Hidalgo',
    categoria: 'Cultura' as CategoriaEstado,
    descripcion: 'Prismas basálticos, haciendas y pulque',
    imagen: require('../../assets/images/hidalgo.png'),
    precio: 1600
  },
  {
    id: 15,
    nombre: 'Jalisco',
    categoria: 'Gastronomía' as CategoriaEstado,
    descripcion: 'Tequila, mariachi y tradición tapatía',
    imagen: require('../../assets/images/jalisco.png'),
    precio: 2100
  },
  {
    id: 16,
    nombre: 'Michoacán',
    categoria: 'Cultura' as CategoriaEstado,
    descripcion: 'Mariposas monarca, Pátzcuaro y artesanías',
    imagen: require('../../assets/images/michoacan.png'),
    precio: 1900
  },
  {
    id: 17,
    nombre: 'Morelos',
    categoria: 'Cultura' as CategoriaEstado,
    descripcion: 'Haciendas, balnearios y Xochicalco',
    imagen: require('../../assets/images/morelos.png'),
    precio: 1500
  },
  {
    id: 18,
    nombre: 'Nayarit',
    categoria: 'Playa' as CategoriaEstado,
    descripcion: 'Sayulita, Islas Marietas y surf',
    imagen: require('../../assets/images/nayarit.png'),
    precio: 2300
  },
  {
    id: 19,
    nombre: 'Nuevo León',
    categoria: 'Ciudad' as CategoriaEstado,
    descripcion: 'Monterrey, cañones y vida industrial',
    imagen: require('../../assets/images/nuevo_leon.png'),
    precio: 1800
  },
  {
    id: 20,
    nombre: 'Oaxaca',
    categoria: 'Gastronomía' as CategoriaEstado,
    descripcion: 'Arte, mole negro, mezcal y Monte Albán',
    imagen: require('../../assets/images/oaxaca.png'),
    precio: 2800,
    latitude: 17.0732,
    longitude: -96.7266
  },
  {
    id: 21,
    nombre: 'Puebla',
    categoria: 'Cultura' as CategoriaEstado,
    descripcion: 'Talavera, chiles en nogada y conventos',
    imagen: require('../../assets/images/puebla.png'),
    precio: 1900
  },
  {
    id: 22,
    nombre: 'Querétaro',
    categoria: 'Cultura' as CategoriaEstado,
    descripcion: 'Acueducto, vinos y Peña de Bernal',
    imagen: require('../../assets/images/queretaro.png'),
    precio: 1800
  },
  {
    id: 23,
    nombre: 'Quintana Roo',
    categoria: 'Playa' as CategoriaEstado,
    descripcion: 'Mar turquesa, arrecifes y cenotes',
    imagen: require('../../assets/images/quintana_roo.png'),
    precio: 4500
  },
  {
    id: 24,
    nombre: 'San Luis Potosí',
    categoria: 'Cultura' as CategoriaEstado,
    descripcion: 'Huasteca Potosina, cascadas y cañones',
    imagen: require('../../assets/images/san_luis_potosi.png'),
    precio: 1800
  },
  {
    id: 25,
    nombre: 'Sinaloa',
    categoria: 'Playa' as CategoriaEstado,
    descripcion: 'Mazatlán, playas y gastronomía de mar',
    imagen: require('../../assets/images/sinaloa.png'),
    precio: 2000
  },
  {
    id: 26,
    nombre: 'Sonora',
    categoria: 'Aventura' as CategoriaEstado,
    descripcion: 'Desierto de Altar, Mar de Cortés y playa',
    imagen: require('../../assets/images/sonora.png'),
    precio: 2000
  },
  {
    id: 27,
    nombre: 'Tabasco',
    categoria: 'Cultura' as CategoriaEstado,
    descripcion: 'Cultura olmeca, ríos y selva tropical',
    imagen: require('../../assets/images/tabasco.png'),
    precio: 1700
  },
  {
    id: 28,
    nombre: 'Tamaulipas',
    categoria: 'Ciudad' as CategoriaEstado,
    descripcion: 'Tampico, playas del Golfo y frontera',
    imagen: require('../../assets/images/tamaulipas.png'),
    precio: 1600
  },
  {
    id: 29,
    nombre: 'Tlaxcala',
    categoria: 'Cultura' as CategoriaEstado,
    descripcion: 'Carnaval, Cacaxtla y tradiciones vivas',
    imagen: require('../../assets/images/tlaxcala.png'),
    precio: 1400
  },
  {
    id: 30,
    nombre: 'Veracruz',
    categoria: 'Cultura' as CategoriaEstado,
    descripcion: 'Puerto, son jarocho, Tajín y cascadas',
    imagen: require('../../assets/images/veracruz.png'),
    precio: 1800
  },
  {
    id: 31,
    nombre: 'Yucatán',
    categoria: 'Cultura' as CategoriaEstado,
    descripcion: 'Mérida colonial, cenotes y ruinas mayas',
    imagen: require('../../assets/images/yucatan.png'),
    precio: 3200,
    latitude: 20.9674,
    longitude: -89.5926
  },
  {
    id: 32,
    nombre: 'Zacatecas',
    categoria: 'Cultura' as CategoriaEstado,
    descripcion: 'Minas de plata, teleférico y arte barroco',
    imagen: require('../../assets/images/zacatecas.png'),
    precio: 1900
  },
];