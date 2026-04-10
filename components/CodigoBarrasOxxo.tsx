import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

// ── Patrones binarios Code 128 (1 = barra, 0 = espacio) ──────────────────────
// Índices 0-99 = datos, 100-102 = Code B/A/FNC1, 103-105 = Start A/B/C
const PATRONES: string[] = [
  '11011001100','11001101100','11001100110','10010011000','10010001100', //  0– 4
  '10001001100','10011001000','10011000100','10001100100','11001001000', //  5– 9
  '11001000100','11000100100','10110011100','10011011100','10011001110', // 10–14
  '10111001100','10011101100','10011100110','11001110010','11001011100', // 15–19
  '11001001110','11011100100','11001110100','11101101110','11101001100', // 20–24
  '11100101100','11100100110','11101100100','11100110100','11100110010', // 25–29
  '11011011000','11011000110','11000110110','10100011000','10001011000', // 30–34
  '10001000110','10110001000','10001101000','10001100010','11010001000', // 35–39
  '11000101000','11000100010','10110111000','10110001110','10001101110', // 40–44
  '10111011000','10111000110','10001110110','11101110110','11010001110', // 45–49
  '11000101110','11011101000','11011100010','11011101110','11101011000', // 50–54
  '11101000110','11100010110','11101101000','11101100010','11100011010', // 55–59
  '11101111010','11001000010','11110001010','10100110000','10100001100', // 60–64
  '10010110000','10010000110','10000101100','10000100110','10110010000', // 65–69
  '10110000100','10011010000','10011000010','10000110100','10000110010', // 70–74
  '11000010010','11001010000','11110111010','11000010100','10001111010', // 75–79
  '10100111100','10010111100','10010011110','10111100100','10011110100', // 80–84
  '10011110010','11110100100','11110010100','11110010010','11011011110', // 85–89
  '11011110110','11110110110','10101111000','10100011110','10001011110', // 90–94
  '10111101000','10111100010','11110101000','11110100010','10111011110', // 95–99
  '10111101110','11101011110','11110101110',                             // 100–102
  '11010000100','11010010000','11010011100',                             // 103=StartA, 104=StartB, 105=StartC
];
const PATRON_STOP = '1100011101011'; // 13 bits

// ── Encoder Code 128C (pares de dígitos) ─────────────────────────────────────
function bitsCodigo128C(referencia: string): string {
  const soloDigitos = referencia.replace(/\D/g, '');
  // Asegura longitud par
  const datos = soloDigitos.length % 2 === 0 ? soloDigitos : '0' + soloDigitos;

  const pares: number[] = [];
  for (let i = 0; i < datos.length; i += 2) {
    pares.push(parseInt(datos.slice(i, i + 2), 10));
  }

  const INICIO = 105; // Start C
  let bits = PATRONES[INICIO];
  let suma  = INICIO;

  pares.forEach((v, i) => {
    suma += v * (i + 1);
    bits += PATRONES[v];
  });

  bits += PATRONES[suma % 103]; // checksum
  bits += PATRON_STOP;
  return bits;
}

// ── Genera referencia OXXO de 18 dígitos con dígito verificador Luhn ─────────
export function generarReferenciaOxxo(folio: string): string {
  const seed    = folio.replace(/\D/g, '').slice(-8).padStart(8, '0');
  const tiempo  = Date.now().toString().slice(-6);
  const cuerpo  = `4169${seed}${tiempo}`.slice(0, 17); // 17 dígitos base

  // Dígito verificador Luhn
  const digitos = cuerpo.split('').map(Number);
  let suma = 0;
  digitos.forEach((d, i) => {
    let n = i % 2 === 0 ? d * 2 : d;
    if (n > 9) { n -= 9; }
    suma += n;
  });
  const verificador = (10 - (suma % 10)) % 10;
  return `${cuerpo}${verificador}`; // 18 dígitos
}

// ── Componente ────────────────────────────────────────────────────────────────
interface Props {
  referencia: string;
  precio    : string;
  ancho    ?: number;
}

export default function CodigoBarrasOxxo({ referencia, precio, ancho = 300 }: Props) {
  const bits = useMemo(() => bitsCodigo128C(referencia), [referencia]);

  const zonasSilencio = 20; // módulos de margen (10 izq + 10 der)
  const modulo  = ancho / (bits.length + zonasSilencio);
  const alto    = 64;
  const offsetX = modulo * 10;

  // Formatea referencia en grupos de 4: XXXX XXXX XXXX XXXX XX
  const referenciaFormateada = referencia.replace(/(\d{4})(?=\d)/g, '$1 ');

  return (
    <View style={eo.contenedor}>

      {/* Cabecera roja OXXO */}
      <View style={eo.cabecera}>
        <Text style={eo.textoOxxo}>OXXO Pay</Text>
        <Text style={eo.subCabecera}>Paga en cualquier tienda OXXO</Text>
      </View>

      {/* Código de barras SVG */}
      <View style={eo.wrapperBarras}>
        <Svg width={ancho} height={alto + 4} style={{ backgroundColor: '#fff' }}>
          {bits.split('').map((bit, idx) =>
            bit === '1' ? (
              <Rect
                key={idx}
                x={offsetX + idx * modulo}
                y={2}
                width={modulo + 0.3} // leve solapado para evitar huecos
                height={alto}
                fill="#1a1a1a"
              />
            ) : null
          )}
        </Svg>
      </View>

      {/* Número legible */}
      <Text style={eo.referenciaTxt}>{referenciaFormateada}</Text>

      {/* Monto */}
      <View style={eo.filaMonto}>
        <Text style={eo.labelMonto}>Monto a pagar</Text>
        <Text style={eo.valorMonto}>${parseInt(precio ?? '0').toLocaleString()} MXN</Text>
      </View>

      {/* Instrucciones */}
      <View style={eo.instrucciones}>
        <Text style={eo.instrTitulo}>¿Cómo pagar?</Text>
        {[
          '1. Acude a la tienda OXXO más cercana',
          '2. Indica al cajero un pago OXXO Pay',
          '3. Proporciona la referencia o muestra el código',
          '4. Paga el monto exacto mostrado arriba',
        ].map((p) => (
          <Text key={p} style={eo.instrPaso}>{p}</Text>
        ))}
        <View style={eo.notaVencimiento}>
          <Text style={eo.notaVencimientoTxt}>⚠️  Este código vence en 72 horas</Text>
        </View>
      </View>

    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const eo = StyleSheet.create({
  contenedor: {
  width: '100%',
  backgroundColor: '#fff',
  borderRadius: 18,
  overflow: 'hidden',
  borderWidth: 1.5,
  borderColor: '#DD331D',
  marginBottom: 16,
  elevation: 4,
  boxShadow: '0px 3px 8px rgba(221,51,29,0.15)'
},

  cabecera:            { backgroundColor: '#DD331D', paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center' },
  textoOxxo:           { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1.5 },
  subCabecera:         { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },

  wrapperBarras:       { alignItems: 'center', paddingTop: 18, paddingBottom: 4, paddingHorizontal: 8, backgroundColor: '#fff' },

  referenciaTxt:       { textAlign: 'center', fontSize: 13, letterSpacing: 4, color: '#222', fontWeight: '700', paddingVertical: 10, backgroundColor: '#fff' },

  filaMonto:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#f0f0f0', backgroundColor: '#fafafa' },
  labelMonto:          { fontSize: 13, color: '#888', fontWeight: '600' },
  valorMonto:          { fontSize: 20, color: '#DD331D', fontWeight: '900' },

  instrucciones:       { padding: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  instrTitulo:         { fontSize: 11, fontWeight: '800', color: '#555', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  instrPaso:           { fontSize: 12, color: '#666', lineHeight: 22 },
  notaVencimiento:     { marginTop: 10, backgroundColor: '#fff8e1', borderRadius: 8, padding: 10 },
  notaVencimientoTxt:  { fontSize: 11, color: '#b45309', fontWeight: '600' },
});
