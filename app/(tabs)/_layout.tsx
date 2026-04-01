import { Tabs } from 'expo-router';
import React from 'react';


export default function LayoutPestanas() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
      {/* Pantallas principales */}
      <Tabs.Screen name="menu"      options={{ tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="favoritos" options={{ tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="rutas"     options={{ tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="perfil"    options={{ tabBarStyle: { display: 'none' } }} />
      {/* Pantallas auxiliares — ocultas de la barra de tabs */}
      <Tabs.Screen name="detalle"          options={{ href: null }} />
      <Tabs.Screen name="reserva"          options={{ href: null }} />
      <Tabs.Screen name="pago"             options={{ href: null }} />
      <Tabs.Screen name="confirmacion"     options={{ href: null }} />
      <Tabs.Screen name="mis_reservas"     options={{ href: null }} />
      <Tabs.Screen name="notificaciones"   options={{ href: null }} />
      <Tabs.Screen name="resenas"          options={{ href: null }} />
      <Tabs.Screen name="admin"            options={{ href: null }} />
      <Tabs.Screen name="mapa_interactivo" options={{ href: null }} />
      <Tabs.Screen name="skeletonloader"   options={{ href: null }} />
    </Tabs>
  );
}