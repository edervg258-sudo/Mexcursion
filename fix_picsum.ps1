$file = 'lib\constantes.ts'
$c = Get-Content $file -Raw -Encoding UTF8

# Unsplash restantes -> picsum con semilla unica por destino
# Yucatan
$c = $c -replace "(id: 'Yucat.n\|premium'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/merida/800/600`${2}"
$c = $c -replace "(id: 'Yucat.n\|medio'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/chichenitza/800/600`${2}"
$c = $c -replace "(id: 'Yucat.n\|economico'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/merida2/800/600`${2}"
# Chiapas
$c = $c -replace "(id: 'Chiapas\|premium'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/palenque/800/600`${2}"
$c = $c -replace "(id: 'Chiapas\|medio'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/sancristobal/800/600`${2}"
$c = $c -replace "(id: 'Chiapas\|economico'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/sumidero/800/600`${2}"
# Oaxaca
$c = $c -replace "(id: 'Oaxaca\|premium'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/oaxaca/800/600`${2}"
$c = $c -replace "(id: 'Oaxaca\|medio'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/monteAlban/800/600`${2}"
$c = $c -replace "(id: 'Oaxaca\|economico'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/oaxaca3/800/600`${2}"
# CDMX
$c = $c -replace "(id: 'Ciudad de M.xico\|premium'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/cdmx/800/600`${2}"
$c = $c -replace "(id: 'Ciudad de M.xico\|medio'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/coyoacan/800/600`${2}"
$c = $c -replace "(id: 'Ciudad de M.xico\|economico'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/centrohistorico/800/600`${2}"
# Jalisco
$c = $c -replace "(id: 'Jalisco\|premium'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/guadalajara/800/600`${2}"
$c = $c -replace "(id: 'Jalisco\|medio'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/guadalajara2/800/600`${2}"
$c = $c -replace "(id: 'Jalisco\|economico'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/tequila/800/600`${2}"
# Guanajuato
$c = $c -replace "(id: 'Guanajuato\|premium'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/sanmiguel/800/600`${2}"
$c = $c -replace "(id: 'Guanajuato\|medio'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/guanajuato/800/600`${2}"
$c = $c -replace "(id: 'Guanajuato\|economico'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/cervantino/800/600`${2}"
# Guerrero
$c = $c -replace "(id: 'Guerrero\|premium'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/acapulco/800/600`${2}"
$c = $c -replace "(id: 'Guerrero\|medio'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/acapulco2/800/600`${2}"
$c = $c -replace "(id: 'Guerrero\|economico'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/zihuatanejo/800/600`${2}"
# Puebla
$c = $c -replace "(id: 'Puebla\|premium'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/puebla/800/600`${2}"
$c = $c -replace "(id: 'Puebla\|medio'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/puebla2/800/600`${2}"
$c = $c -replace "(id: 'Puebla\|economico'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/cholula/800/600`${2}"
# Veracruz
$c = $c -replace "(id: 'Veracruz\|premium'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/veracruz/800/600`${2}"
$c = $c -replace "(id: 'Veracruz\|medio'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/tajin/800/600`${2}"
$c = $c -replace "(id: 'Veracruz\|economico'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/veracruz3/800/600`${2}"
# Michoacan
$c = $c -replace "(id: 'Michoac.n\|premium'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/patzcuaro/800/600`${2}"
$c = $c -replace "(id: 'Michoac.n\|medio'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/patzcuaro2/800/600`${2}"
$c = $c -replace "(id: 'Michoac.n\|economico'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/monarca/800/600`${2}"
# Sinaloa
$c = $c -replace "(id: 'Sinaloa\|premium'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/mazatlan/800/600`${2}"
$c = $c -replace "(id: 'Sinaloa\|medio'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/mazatlan2/800/600`${2}"
$c = $c -replace "(id: 'Sinaloa\|economico'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/mazatlan3/800/600`${2}"
# Queretaro
$c = $c -replace "(id: 'Quer.taro\|premium'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/queretaro/800/600`${2}"
$c = $c -replace "(id: 'Quer.taro\|medio'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/bernal/800/600`${2}"
$c = $c -replace "(id: 'Quer.taro\|economico'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/queretaro3/800/600`${2}"
# San Luis Potosi
$c = $c -replace "(id: 'San Luis Potos.\|premium'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/huasteca/800/600`${2}"
$c = $c -replace "(id: 'San Luis Potos.\|medio'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/cascadas/800/600`${2}"
$c = $c -replace "(id: 'San Luis Potos.\|economico'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/xilitla/800/600`${2}"
# Nuevo Leon
$c = $c -replace "(id: 'Nuevo Le.n\|premium'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/monterrey/800/600`${2}"
$c = $c -replace "(id: 'Nuevo Le.n\|medio'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/monterrey2/800/600`${2}"
$c = $c -replace "(id: 'Nuevo Le.n\|economico'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/barrioAntiguo/800/600`${2}"
# Baja California
$c = $c -replace "(id: 'Baja California\|premium'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/guadalupe/800/600`${2}"
$c = $c -replace "(id: 'Baja California\|medio'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/ensenada/800/600`${2}"
$c = $c -replace "(id: 'Baja California\|economico'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/tijuana/800/600`${2}"
# Baja California Sur
$c = $c -replace "(id: 'Baja California Sur\|premium'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/loscabos/800/600`${2}"
$c = $c -replace "(id: 'Baja California Sur\|medio'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/lapaz/800/600`${2}"
$c = $c -replace "(id: 'Baja California Sur\|economico'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/loreto/800/600`${2}"
# Hidalgo
$c = $c -replace "(id: 'Hidalgo\|medio'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/prismas/800/600`${2}"
$c = $c -replace "(id: 'Hidalgo\|economico'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/mineral/800/600`${2}"
# Nayarit
$c = $c -replace "(id: 'Nayarit\|premium'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/puntamita/800/600`${2}"
$c = $c -replace "(id: 'Nayarit\|medio'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/sayulita/800/600`${2}"
$c = $c -replace "(id: 'Nayarit\|economico'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/sayulita2/800/600`${2}"
# Sonora
$c = $c -replace "(id: 'Sonora\|premium'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/sancarlos/800/600`${2}"
$c = $c -replace "(id: 'Sonora\|medio'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/penasco/800/600`${2}"
$c = $c -replace "(id: 'Sonora\|economico'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/alamos/800/600`${2}"
# Chihuahua
$c = $c -replace "(id: 'Chihuahua\|premium'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/cobre/800/600`${2}"
$c = $c -replace "(id: 'Chihuahua\|medio'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/cobre2/800/600`${2}"
$c = $c -replace "(id: 'Chihuahua\|economico'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/chihuahua/800/600`${2}"
# Colima
$c = $c -replace "(id: 'Colima\|medio'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/volcan/800/600`${2}"
$c = $c -replace "(id: 'Colima\|economico'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/manzanillo/800/600`${2}"
# Morelos
$c = $c -replace "(id: 'Morelos\|medio'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/cuernavaca/800/600`${2}"
$c = $c -replace "(id: 'Morelos\|economico'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/balnearios/800/600`${2}"
# Zacatecas
$c = $c -replace "(id: 'Zacatecas\|premium'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/zacatecas/800/600`${2}"
$c = $c -replace "(id: 'Zacatecas\|medio'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/zacatecas2/800/600`${2}"
$c = $c -replace "(id: 'Zacatecas\|economico'[^}]*imagen: ')[^']*(')", "`${1}https://picsum.photos/seed/zacatecas3/800/600`${2}"

Set-Content $file $c -Encoding UTF8 -NoNewline

# Contar cuantas URLs de picsum quedaron vs unsplash
$picsumCount = ([regex]::Matches($c, 'picsum.photos')).Count
$unsplashCount = ([regex]::Matches($c, 'images.unsplash.com')).Count
Write-Host "picsum.photos: $picsumCount URLs"
Write-Host "images.unsplash.com: $unsplashCount URLs (en SUGERENCIAS_RUTAS deberian ser 0)"
Write-Host "Listo."
