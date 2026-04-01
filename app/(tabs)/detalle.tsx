import { useFocusEffect } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import { router, useLocalSearchParams, usePathname } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions, Image,
  Modal,
  Platform, ScrollView,
  StatusBar, StyleSheet, Text,
  TextInput,
  TouchableOpacity, View, useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PESTANAS } from '../../lib/constantes';
import { Itinerario, alternarDestinoItinerario, crearItinerario, obtenerItinerarios, obtenerUsuarioActivo } from '../../lib/supabase-db';

const { width: W } = Dimensions.get('window');
const CARD_W = Math.min(W, 800);

import { PAQUETES_POR_ESTADO, Paquete } from '../../lib/constantes';

const Estrellas = ({ n }: { n: number }) => (
  <View style={{ flexDirection:'row', gap:2 }}>
    {Array.from({ length:5 }).map((_,i) => (
      <Text key={i} style={{ fontSize:12, color: i < n ? '#e9c46a' : '#ddd' }}>★</Text>
    ))}
  </View>
);

const CarruselImagenes = ({ imagenes, color }: { imagenes: string[]; color: string }) => {
  const [indice, setIndice] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const ancho = Math.min(W - 28 * 2, CARD_W - 28);
  const alScroll = (e: any) => setIndice(Math.round(e.nativeEvent.contentOffset.x / ancho));
  return (
    <View style={{ marginBottom:14 }}>
      <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={alScroll} style={{ borderRadius:12, overflow:'hidden' }}>
        {imagenes.map((uri, i) => (
          <Image key={i} source={{ uri }} style={{ width:ancho, height:180, borderRadius:12, borderWidth:1.5, borderColor:'#eee' }} resizeMode="cover" />
        ))}
      </ScrollView>
      <View style={{ flexDirection:'row', justifyContent:'center', gap:6, marginTop:8 }}>
        {imagenes.map((_,i) => (
          <TouchableOpacity key={i} onPress={() => { scrollRef.current?.scrollTo({ x:ancho*i, animated:true }); setIndice(i); }}>
            <View style={{ width: i===indice ? 20 : 8, height:8, borderRadius:4, backgroundColor: i===indice ? color : '#ddd' }} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const extraerPrecio = (precioTotal: string) => {
  const match = precioTotal.replace(/,/g,'').match(/\d+/);
  return match ? match[0] : '3500';
};

// ─────────────────────────────────────────────────────────────────────────────
//  Sidebar (PC) — fuera del componente para evitar remount en cada render
// ─────────────────────────────────────────────────────────────────────────────
const Sidebar = React.memo(({ estaActiva, navegarPestana }: {
  estaActiva: (ruta: string) => boolean;
  navegarPestana: (ruta: string) => void;
}) => (
  <View style={estilos.sidebar}>
    <Image source={require('../../assets/images/logo.png')} style={estilos.logoSidebar} resizeMode="contain" />
    <View style={estilos.separadorSidebar} />
    {PESTANAS.map(p => {
      const activa = estaActiva(p.ruta);
      return (
        <TouchableOpacity key={p.ruta} style={[estilos.itemSidebar, activa && estilos.itemSidebarActivo]} onPress={() => navegarPestana(p.ruta)} activeOpacity={0.75}>
          <Image source={activa ? p.iconoRojo : p.iconoGris} style={estilos.iconoSidebar} resizeMode="contain" />
        </TouchableOpacity>
      );
    })}
  </View>
));

export default function DetalleScreen() {
  const { nombre, categoria } = useLocalSearchParams<{ nombre:string; categoria:string }>();
  const rutaActual = usePathname();
  const { width }  = useWindowDimensions();
  const esPC       = width >= 768;

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('visible');
      NavigationBar.setButtonStyleAsync('dark');
    }
  }, []);

  const [paqueteExpandido, setPaqueteExpandido] = useState<string | null>('economico');
  const [itinerarios, setItinerarios]           = useState<Itinerario[]>([]);
  const [usuarioId, setUsuarioId]               = useState<string | null>(null);

  // Modal selector
  const [modalVisible, setModalVisible]         = useState(false);
  const [nuevoNombre, setNuevoNombre]           = useState('');
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    const cargar = async () => {
      const usuario = await obtenerUsuarioActivo();
      if (!usuario) return;
      setUsuarioId(usuario.id);
      setItinerarios(await obtenerItinerarios(usuario.id));
    };
    cargar();
  }, []));

  const paquetes   = PAQUETES_POR_ESTADO[nombre ?? ''] ?? PAQUETES_POR_ESTADO['default'];
  const claveRuta  = (nivel: string) => `${nombre}-${nivel}`;
  const navegarPestana = useCallback((ruta: string) => router.replace(ruta as any), []);
  const estaActiva = useCallback((ruta: string) => rutaActual.endsWith(ruta.replace('/(tabs)', '')), [rutaActual]);

  const estaEnRuta = (nivel: string) => {
    const clave = claveRuta(nivel);
    return itinerarios.some(iti => iti.items?.includes(clave));
  };

  const abrirSeleccionRuta = (nivel: string) => {
    if (!usuarioId) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para agregar a tus rutas.');
      return;
    }
    setPaqueteSeleccionado(claveRuta(nivel));
    setModalVisible(true);
  };

  const agregarAItinerario = async (id_itinerario: number) => {
    if (!usuarioId || !paqueteSeleccionado) return;
    setItinerarios(await alternarDestinoItinerario(usuarioId, id_itinerario, paqueteSeleccionado));
    setModalVisible(false);
  };

  const crearYNuevoItinerario = async () => {
    if (!usuarioId || !paqueteSeleccionado || !nuevoNombre.trim()) return;
    const nuevos = await crearItinerario(usuarioId, nuevoNombre.trim());
    if (nuevos.length > 0) {
      setItinerarios(await alternarDestinoItinerario(usuarioId, nuevos[0].id, paqueteSeleccionado));
    }
    setModalVisible(false);
    setNuevoNombre('');
  };

  const irAReserva = (paquete: Paquete) => {
    router.push({ pathname:'/(tabs)/reserva' as any, params:{ nombre, precio:extraerPrecio(paquete.precioTotal), paquete:paquete.etiqueta } });
  };

  const irAResenas = () => {
    router.push({ pathname:'/(tabs)/resenas' as any, params:{ nombre } });
  };
  // ── Contenido ──────────────────────────────────────────────────────────
  //  Variable JSX (no componente) → React no lo desmonta/remonta en cada render
  const contenidoJSX = (
    <View style={{ flex:1 }}>
      <View style={estilos.encabezado}>
        <TouchableOpacity style={estilos.botonAtras} onPress={() => router.back()}>
          <Text style={estilos.textoAtras}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={estilos.tituloEncabezado}>{nombre}</Text>
        <View style={estilos.iconosEncabezado}>
          <TouchableOpacity style={estilos.botonIcono} onPress={() => router.push('/(tabs)/notificaciones' as any)}>
            <Image source={require('../../assets/images/notificaciones.png')} style={estilos.iconoEncabezado} resizeMode="contain" />
          </TouchableOpacity>
          <TouchableOpacity style={estilos.botonIcono} onPress={() => navegarPestana('/(tabs)/perfil')}>
            <Image source={require('../../assets/images/cuenta.png')} style={estilos.iconoEncabezado} resizeMode="contain" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={estilos.scroll}>
        <View style={estilos.contenedorCentrado}>
          <View style={estilos.filaHero}>
            <View style={estilos.heroBadge}>
              <Text style={estilos.heroBadgeTexto}>{categoria}</Text>
            </View>
            <TouchableOpacity style={estilos.btnResenas} onPress={irAResenas} activeOpacity={0.8}>
              <Text style={estilos.txtBtnResenas}>★ Ver reseñas</Text>
            </TouchableOpacity>
          </View>

          <Text style={estilos.subtitulo}>Elige tu paquete ideal</Text>

          {paquetes.map(paquete => {
            const expandido = paqueteExpandido === paquete.nivel;
            const enRuta    = estaEnRuta(paquete.nivel);
            return (
              <View key={paquete.nivel} style={[estilos.tarjetaPaquete, { borderColor:paquete.color }]}>
                <TouchableOpacity
                  style={[estilos.cabeceraPaquete, { backgroundColor:paquete.color }]}
                  onPress={() => setPaqueteExpandido(expandido ? null : paquete.nivel)}
                  activeOpacity={0.85}
                >
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                    <Text style={estilos.emojiPaquete}>{paquete.emoji}</Text>
                    <View>
                      <Text style={estilos.etiquetaPaquete}>{paquete.etiqueta}</Text>
                      <Text style={estilos.precioPaquete}>{paquete.precioTotal}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                    <Text style={estilos.diasPaquete}>{paquete.diasRecomendados} días</Text>
                    <Text style={estilos.chevron}>{expandido ? '▲' : '▼'}</Text>
                  </View>
                </TouchableOpacity>

                {expandido && (
                  <View style={estilos.cuerpoPaquete}>
                    <CarruselImagenes imagenes={paquete.imagenesHotel} color={paquete.color} />

                    <View style={estilos.seccionInfo}>
                      <View style={estilos.filaSeccion}><Text style={estilos.iconoSeccion}>🏨</Text><Text style={estilos.tituloSeccion}>Hotel</Text></View>
                      <Text style={estilos.nombreHotel}>{paquete.hotel}</Text>
                      <Estrellas n={paquete.estrellas} />
                      <Text style={estilos.textoInfo}>{paquete.descripcionHotel}</Text>
                      <Text style={estilos.precioLinea}>{paquete.precioHotel}</Text>
                      <View style={estilos.listaIncluye}>
                        {paquete.incluye.map(inc => (
                          <View key={inc} style={estilos.chipIncluye}>
                            <Text style={estilos.textoChipIncluye}>✓ {inc}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    <View style={estilos.divisor} />

                    <View style={estilos.seccionInfo}>
                      <View style={estilos.filaSeccion}><Text style={estilos.iconoSeccion}>🍽️</Text><Text style={estilos.tituloSeccion}>Restaurante</Text></View>
                      <Text style={estilos.nombreHotel}>{paquete.restaurante}</Text>
                      <Text style={estilos.tipoCocina}>{paquete.tipoCocina}</Text>
                      <Text style={estilos.textoInfo}>Platillo recomendado: <Text style={{ fontWeight:'700', color:'#333' }}>{paquete.platillo}</Text></Text>
                      <Text style={estilos.precioLinea}>{paquete.precioRestaurante}</Text>
                    </View>

                    <View style={estilos.divisor} />

                    <View style={estilos.seccionInfo}>
                      <View style={estilos.filaSeccion}><Text style={estilos.iconoSeccion}>🚗</Text><Text style={estilos.tituloSeccion}>Transporte</Text></View>
                      <Text style={estilos.textoInfo}>{paquete.transporte}</Text>
                      <Text style={estilos.precioLinea}>{paquete.precioTransporte}</Text>
                    </View>

                    <View style={estilos.divisor} />

                    <View style={estilos.seccionInfo}>
                      <View style={estilos.filaSeccion}><Text style={estilos.iconoSeccion}>🎯</Text><Text style={estilos.tituloSeccion}>Actividades incluidas</Text></View>
                      {paquete.actividades.map((act, i) => (
                        <View key={i} style={estilos.filaActividad}>
                          <View style={[estilos.puntoActividad, { backgroundColor:paquete.color }]} />
                          <Text style={estilos.textoActividad}>{act}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={estilos.filaBotones}>
                      <TouchableOpacity style={[estilos.botonRuta, enRuta && estilos.botonRutaActivo]} onPress={() => abrirSeleccionRuta(paquete.nivel)}>
                        <Text style={estilos.textoBotonRuta}>{enRuta ? '✓ En mi ruta' : '＋ Mi ruta'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[estilos.botonReservar, { backgroundColor:paquete.color }]} onPress={() => irAReserva(paquete)} activeOpacity={0.85}>
                        <Text style={estilos.textoBotonReservar}>Reservar →</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
          <View style={{ height:20 }} />
        </View>
      </ScrollView>
    </View>
  );

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <View style={estilos.contenedor}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF7F0" />
      <Image source={require('../../assets/images/mapa.png')} style={estilos.imagenMapa} resizeMode="contain" />
      {!esPC && <Image source={require('../../assets/images/logo.png')} style={estilos.logoFijo} resizeMode="contain" />}

      {esPC ? (
        <View style={estilos.layoutPC}>
          <Sidebar estaActiva={estaActiva} navegarPestana={navegarPestana} />
          <SafeAreaView style={estilos.areaSeguraPC}>
            {contenidoJSX}
          </SafeAreaView>
        </View>
      ) : (
        <View style={estilos.layoutMovil}>
          <SafeAreaView style={estilos.areaSegura}>
            {contenidoJSX}
          </SafeAreaView>
          <View style={estilos.envolturaBarra}>
            <View style={estilos.barraPestanas}>
              {PESTANAS.map(p => {
                const activa = estaActiva(p.ruta);
                return (
                  <TouchableOpacity key={p.ruta} style={estilos.itemPestana} activeOpacity={1} onPress={() => navegarPestana(p.ruta)}>
                    <Image source={activa ? p.iconoRojo : p.iconoGris} style={{ width:28, height:28 }} resizeMode="contain" />
                    <Text style={[estilos.etiquetaPestana, activa && estilos.etiquetaPestanaActiva]}>{p.etiqueta}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Modal para seleccionar / crear ruta */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalContent}>
            <Text style={estilos.modalTitle}>Agregar a un itinerario</Text>
            
            <ScrollView style={{ maxHeight: 200, width: '100%', marginBottom: 15 }}>
              {itinerarios.map(iti => {
                const yaEsta = iti.items?.includes(paqueteSeleccionado ?? '');
                return (
                  <TouchableOpacity
                    key={iti.id}
                    style={[estilos.modalItiCard, yaEsta && estilos.modalItiCardActivo]}
                    onPress={() => agregarAItinerario(iti.id)}
                  >
                    <Text style={[estilos.modalItiText, yaEsta && estilos.modalItiTextActivo]}>
                      {iti.nombre} {yaEsta ? '(Quitar)' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {itinerarios.length === 0 && (
                <Text style={estilos.textoInfo}>No tienes itinerarios, crea uno nuevo abajo.</Text>
              )}
            </ScrollView>

            <View style={{ width: '100%', marginBottom: 15 }}>
              <Text style={estilos.modalLabel}>O crea uno nuevo:</Text>
              <TextInput
                style={estilos.modalInput}
                placeholder="Ej. Vacaciones de Verano"
                value={nuevoNombre}
                onChangeText={setNuevoNombre}
                placeholderTextColor="#999"
              />
              <TouchableOpacity
                style={[estilos.modalBtnCrear, !nuevoNombre.trim() && { opacity: 0.5 }]}
                disabled={!nuevoNombre.trim()}
                onPress={crearYNuevoItinerario}
              >
                <Text style={estilos.modalBtnCrearTxt}>Crear y agregar</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={estilos.modalBtnCerrar} onPress={() => { setModalVisible(false); setNuevoNombre(''); }}>
              <Text style={estilos.modalBtnCerrarTxt}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor:            { flex:1, backgroundColor:'#FAF7F0' },
  imagenMapa:            { opacity:0.15, position:'absolute', width:'90%', height:'100%', alignSelf:'center' },
  logoFijo:              { position:'absolute', top:12, left:12, width:50, height:50, zIndex:10 },
  layoutPC:              { flex:1, flexDirection:'row' },
  layoutMovil:           { flex:1, flexDirection:'column' },
  areaSegura:            { flex: 1 },
  areaSeguraPC:          { flex:1 },
  sidebar:               { width:64, backgroundColor:'#fff', borderRightWidth:1, borderRightColor:'#e8e8e8', alignItems:'center', paddingTop:16, paddingBottom:20, gap:4 },
  logoSidebar:           { width: 48, height: 48, marginBottom: 6 },
  separadorSidebar:      { width: 40, height: 1, backgroundColor: '#eee', marginVertical: 12 },
  itemSidebar:           { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  itemSidebarActivo:     { backgroundColor: '#f0faf9' },
  iconoSidebar:          { width: 28, height: 28 },
  encabezado:            { flexDirection:'row', alignItems:'center', paddingHorizontal:14, paddingVertical:6, gap:8, width:'100%', maxWidth:800, alignSelf:'center' },
  botonAtras:            { width:36, height:36, justifyContent:'center', alignItems:'center' },
  textoAtras:            { fontSize:28, color:'#333', fontWeight:'300', lineHeight:32 },
  tituloEncabezado:      { flex:1, fontSize:16, fontWeight:'700', color:'#333', textAlign:'center' },
  iconosEncabezado:      { flexDirection:'row', gap:6 },
  botonIcono:            { width:50, height:50, borderRadius:25, backgroundColor:'#FAF7F0', borderWidth:1.5, borderColor:'#3AB7A5', alignItems:'center', justifyContent:'center', elevation:2 },
  iconoEncabezado:       { width:28, height:28 },
  scroll:                { paddingBottom:10 },
  contenedorCentrado:    { width:'100%', maxWidth:800, alignSelf:'center', paddingHorizontal:14 },
  filaHero:              { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:14 },
  heroBadge:             { backgroundColor:'#3AB7A5', paddingHorizontal:12, paddingVertical:4, borderRadius:20 },
  heroBadgeTexto:        { color:'#fff', fontWeight:'700', fontSize:12 },
  btnResenas:            { flexDirection:'row', alignItems:'center', paddingHorizontal:14, paddingVertical:7, borderRadius:20, borderWidth:1.5, borderColor:'#e9c46a', backgroundColor:'#fef9e7' },
  txtBtnResenas:         { fontSize:13, fontWeight:'700', color:'#c8a000' },
  subtitulo:             { fontSize:18, fontWeight:'800', color:'#333', marginBottom:14 },
  tarjetaPaquete:        { borderRadius:18, borderWidth:2, marginBottom:16, overflow:'hidden', backgroundColor:'#fff' },
  cabeceraPaquete:       { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:16, paddingVertical:14 },
  emojiPaquete:          { fontSize:24 },
  etiquetaPaquete:       { fontSize:16, fontWeight:'800', color:'#fff' },
  precioPaquete:         { fontSize:12, color:'rgba(255,255,255,0.85)', marginTop:2 },
  diasPaquete:           { fontSize:12, color:'#fff', fontWeight:'600', backgroundColor:'rgba(0,0,0,0.2)', paddingHorizontal:8, paddingVertical:3, borderRadius:10 },
  chevron:               { fontSize:12, color:'#fff', fontWeight:'700' },
  cuerpoPaquete:         { padding:16 },
  seccionInfo:           { marginBottom:4 },
  filaSeccion:           { flexDirection:'row', alignItems:'center', gap:6, marginBottom:6 },
  iconoSeccion:          { fontSize:16 },
  tituloSeccion:         { fontSize:14, fontWeight:'700', color:'#333' },
  nombreHotel:           { fontSize:15, fontWeight:'700', color:'#222', marginBottom:4 },
  tipoCocina:            { fontSize:12, color:'#3AB7A5', fontWeight:'600', marginBottom:4 },
  textoInfo:             { fontSize:13, color:'#666', lineHeight:19, marginBottom:4 },
  precioLinea:           { fontSize:13, fontWeight:'700', color:'#DD331D', marginTop:2 },
  listaIncluye:          { flexDirection:'row', flexWrap:'wrap', gap:6, marginTop:8 },
  chipIncluye:           { backgroundColor:'#f0faf9', borderRadius:10, paddingHorizontal:8, paddingVertical:3, borderWidth:1, borderColor:'#3AB7A5' },
  textoChipIncluye:      { fontSize:11, color:'#3AB7A5', fontWeight:'600' },
  divisor:               { height:1, backgroundColor:'#eee', marginVertical:14 },
  filaActividad:         { flexDirection:'row', alignItems:'center', gap:8, marginBottom:6 },
  puntoActividad:        { width:8, height:8, borderRadius:4 },
  textoActividad:        { fontSize:13, color:'#444', flex:1 },
  filaBotones:           { flexDirection:'row', gap:10, marginTop:16 },
  botonRuta:             { flex:1, backgroundColor:'#3AB7A5', paddingVertical:13, borderRadius:25, alignItems:'center', elevation:3 },
  botonRutaActivo:       { backgroundColor:'#aaa' },
  textoBotonRuta:        { color:'#fff', fontWeight:'700', fontSize:14 },
  botonReservar:         { flex:1, paddingVertical:13, borderRadius:25, alignItems:'center', elevation:3 },
  textoBotonReservar:    { color:'#fff', fontWeight:'700', fontSize:14 },
  envolturaBarra:        { width:'100%', backgroundColor:'#fff', borderTopWidth:1, borderTopColor:'#e0e0e0', paddingBottom: Platform.OS==='android' ? 16 : 8 },
  barraPestanas:         { flexDirection:'row', backgroundColor:'#fff', width:'100%', maxWidth:800, alignSelf:'center' },
  itemPestana:           { flex:1, alignItems:'center', justifyContent:'center', paddingVertical:8, height:56 },
  etiquetaPestana:       { fontSize:10, color:'#999', marginTop:2 },
  etiquetaPestanaActiva: { color:'#DD331D', fontWeight:'600' },
  textoVacio:            { fontSize:14, color:'#888', textAlign:'center', marginTop:10 },
  
  // ── Modal Itinerarios ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', zIndex: 999 },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, alignItems: 'center'
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 15 },
  modalItiCard: {
    padding: 14, backgroundColor: '#f9f9f9', borderRadius: 10,
    borderWidth: 1, borderColor: '#eee', marginBottom: 8, alignItems: 'center'
  },
  modalItiCardActivo: { backgroundColor: '#FFECEB', borderColor: '#DD331D' },
  modalItiText: { fontSize: 15, fontWeight: '600', color: '#444' },
  modalItiTextActivo: { color: '#DD331D' },
  modalLabel: { fontSize: 13, color: '#666', marginBottom: 6, alignSelf: 'flex-start' },
  modalInput: {
    backgroundColor: '#f5f5f5', borderRadius: 10, padding: 12, fontSize: 15,
    borderWidth: 1, borderColor: '#e0e0e0', color: '#333', marginBottom: 10
  },
  modalBtnCrear: { backgroundColor: '#333', borderRadius: 10, padding: 12, alignItems: 'center' },
  modalBtnCrearTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalBtnCerrar: { marginTop: 10, padding: 10 },
  modalBtnCerrarTxt: { color: '#888', fontSize: 14, fontWeight: '600' }
});