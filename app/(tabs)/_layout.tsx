import { Tabs } from 'expo-router';
import React from 'react';

export default function LayoutPestanas() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
      <Tabs.Screen name="menu"      />
      <Tabs.Screen name="favoritos" />
      <Tabs.Screen name="rutas"     />
      <Tabs.Screen name="perfil"    />
      {/* Pantallas auxiliares — ocultas de la barra de tabs */}
      <Tabs.Screen name="detalle"        options={{ href: null }} />
      <Tabs.Screen name="reserva"        options={{ href: null }} />
      <Tabs.Screen name="pago"           options={{ href: null }} />
      <Tabs.Screen name="confirmacion"   options={{ href: null }} />
      <Tabs.Screen name="mis_reservas"   options={{ href: null }} />
      <Tabs.Screen name="notificaciones" options={{ href: null }} />
      <Tabs.Screen name="resenas"        options={{ href: null }} />
      <Tabs.Screen name="admin"          options={{ href: null }} />
      <Tabs.Screen name="historial"      options={{ href: null }} />
      <Tabs.Screen name="skeletonloader" options={{ href: null }} />
    </Tabs>
  );
}
