-- Abilita realtime per le tabelle repairs e orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.repairs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;