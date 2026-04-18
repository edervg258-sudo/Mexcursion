-- Fix: Enable RLS on tables that have policies but RLS disabled
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)

ALTER TABLE public.historial        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerario_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resenas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas         ENABLE ROW LEVEL SECURITY;
