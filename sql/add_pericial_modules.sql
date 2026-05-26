-- Ejecutar en Supabase Central (yytyzvhcfqksozusowdn)
ALTER TABLE portal_modulos DROP CONSTRAINT IF EXISTS tipo_check;
ALTER TABLE portal_modulos DROP CONSTRAINT IF EXISTS portal_modulos_tipo_check;
ALTER TABLE portal_modulos ADD CONSTRAINT portal_modulos_tipo_check 
  CHECK (tipo = ANY(ARRAY['leads','citas','conversaciones','generico','webs','empresas','email','agente_pericial','clientes_pericial','informes_pericial','citas_pericial','documentacion_pericial']));
