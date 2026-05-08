-- ============================================================
--  MEXCURSIÓN — Add imagen_url, latitude, longitude to estados
--  Migration: 20260508_100000
-- ============================================================

ALTER TABLE public.estados ADD COLUMN IF NOT EXISTS imagen_url TEXT;
ALTER TABLE public.estados ADD COLUMN IF NOT EXISTS latitude   NUMERIC;
ALTER TABLE public.estados ADD COLUMN IF NOT EXISTS longitude  NUMERIC;

-- Poblar imagen_url y coordenadas para los 32 estados
-- Las URLs usan picsum.photos con seed determinístico por estado.
-- El admin puede actualizarlas desde el panel en cualquier momento.
UPDATE public.estados SET
  imagen_url = CASE id
    WHEN  1 THEN 'https://picsum.photos/seed/mexcursion1/800/500'
    WHEN  2 THEN 'https://picsum.photos/seed/mexcursion2/800/500'
    WHEN  3 THEN 'https://picsum.photos/seed/mexcursion3/800/500'
    WHEN  4 THEN 'https://picsum.photos/seed/mexcursion4/800/500'
    WHEN  5 THEN 'https://picsum.photos/seed/mexcursion5/800/500'
    WHEN  6 THEN 'https://picsum.photos/seed/mexcursion6/800/500'
    WHEN  7 THEN 'https://picsum.photos/seed/mexcursion7/800/500'
    WHEN  8 THEN 'https://picsum.photos/seed/mexcursion8/800/500'
    WHEN  9 THEN 'https://picsum.photos/seed/mexcursion9/800/500'
    WHEN 10 THEN 'https://picsum.photos/seed/mexcursion10/800/500'
    WHEN 11 THEN 'https://picsum.photos/seed/mexcursion11/800/500'
    WHEN 12 THEN 'https://picsum.photos/seed/mexcursion12/800/500'
    WHEN 13 THEN 'https://picsum.photos/seed/mexcursion13/800/500'
    WHEN 14 THEN 'https://picsum.photos/seed/mexcursion14/800/500'
    WHEN 15 THEN 'https://picsum.photos/seed/mexcursion15/800/500'
    WHEN 16 THEN 'https://picsum.photos/seed/mexcursion16/800/500'
    WHEN 17 THEN 'https://picsum.photos/seed/mexcursion17/800/500'
    WHEN 18 THEN 'https://picsum.photos/seed/mexcursion18/800/500'
    WHEN 19 THEN 'https://picsum.photos/seed/mexcursion19/800/500'
    WHEN 20 THEN 'https://picsum.photos/seed/mexcursion20/800/500'
    WHEN 21 THEN 'https://picsum.photos/seed/mexcursion21/800/500'
    WHEN 22 THEN 'https://picsum.photos/seed/mexcursion22/800/500'
    WHEN 23 THEN 'https://picsum.photos/seed/mexcursion23/800/500'
    WHEN 24 THEN 'https://picsum.photos/seed/mexcursion24/800/500'
    WHEN 25 THEN 'https://picsum.photos/seed/mexcursion25/800/500'
    WHEN 26 THEN 'https://picsum.photos/seed/mexcursion26/800/500'
    WHEN 27 THEN 'https://picsum.photos/seed/mexcursion27/800/500'
    WHEN 28 THEN 'https://picsum.photos/seed/mexcursion28/800/500'
    WHEN 29 THEN 'https://picsum.photos/seed/mexcursion29/800/500'
    WHEN 30 THEN 'https://picsum.photos/seed/mexcursion30/800/500'
    WHEN 31 THEN 'https://picsum.photos/seed/mexcursion31/800/500'
    WHEN 32 THEN 'https://picsum.photos/seed/mexcursion32/800/500'
  END,
  latitude = CASE id
    WHEN  1 THEN  21.8853
    WHEN  2 THEN  30.8406
    WHEN  3 THEN  24.1426
    WHEN  4 THEN  19.8301
    WHEN  5 THEN  16.7569
    WHEN  6 THEN  28.6353
    WHEN  7 THEN  19.4326
    WHEN  8 THEN  25.4232
    WHEN  9 THEN  19.2452
    WHEN 10 THEN  24.0277
    WHEN 11 THEN  19.2926
    WHEN 12 THEN  21.0190
    WHEN 13 THEN  17.5506
    WHEN 14 THEN  20.1011
    WHEN 15 THEN  20.6597
    WHEN 16 THEN  19.7060
    WHEN 17 THEN  18.9242
    WHEN 18 THEN  21.5000
    WHEN 19 THEN  25.6866
    WHEN 20 THEN  17.0732
    WHEN 21 THEN  19.0414
    WHEN 22 THEN  20.5881
    WHEN 23 THEN  21.1743
    WHEN 24 THEN  22.1565
    WHEN 25 THEN  24.8048
    WHEN 26 THEN  29.0892
    WHEN 27 THEN  17.9869
    WHEN 28 THEN  23.7369
    WHEN 29 THEN  19.3182
    WHEN 30 THEN  19.1738
    WHEN 31 THEN  20.9674
    WHEN 32 THEN  22.7709
  END,
  longitude = CASE id
    WHEN  1 THEN -102.2916
    WHEN  2 THEN -115.2838
    WHEN  3 THEN -110.3128
    WHEN  4 THEN  -90.5349
    WHEN  5 THEN  -93.1292
    WHEN  6 THEN -106.0889
    WHEN  7 THEN  -99.1332
    WHEN  8 THEN -101.0053
    WHEN  9 THEN -103.7241
    WHEN 10 THEN -104.6532
    WHEN 11 THEN  -99.6532
    WHEN 12 THEN -101.2574
    WHEN 13 THEN  -99.5024
    WHEN 14 THEN  -98.7624
    WHEN 15 THEN -103.3496
    WHEN 16 THEN -101.1950
    WHEN 17 THEN  -99.2216
    WHEN 18 THEN -104.8940
    WHEN 19 THEN -100.3161
    WHEN 20 THEN  -96.7266
    WHEN 21 THEN  -98.2063
    WHEN 22 THEN -100.3899
    WHEN 23 THEN  -86.8467
    WHEN 24 THEN -100.9855
    WHEN 25 THEN -107.3940
    WHEN 26 THEN -110.9606
    WHEN 27 THEN  -92.9303
    WHEN 28 THEN  -99.1332
    WHEN 29 THEN  -98.2375
    WHEN 30 THEN  -96.1342
    WHEN 31 THEN  -89.5926
    WHEN 32 THEN -102.5832
  END
WHERE id BETWEEN 1 AND 32;

-- ════════════════════════════════════════════════════════════
-- MIGRATION TRACKING
-- ════════════════════════════════════════════════════════════
INSERT INTO schema_migrations (version, description, type, success)
VALUES ('20260508_100000', 'Add imagen_url, latitude, longitude to estados + seed URLs', 'schema', true)
ON CONFLICT (version) DO NOTHING;
