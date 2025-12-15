-- Add platform setting for direct-to-centro commission multiplier
INSERT INTO public.platform_settings (key, value, label, description, min_value, max_value) 
VALUES ('direct_to_centro_commission_multiplier', 50, 'Moltiplicatore Consegna Diretta', 'Percentuale della commissione Corner quando il cliente va direttamente al Centro (es. 50% = metà commissione)', 0, 100)
ON CONFLICT (key) DO NOTHING;