-- Datos de ejemplo SOLO para desarrollo local y tests. Nunca se cargan en producción.
insert into public.articulos
  ("Codigo", "Nombre artículo", "Descripción", observaciones, "codigo  familia", "Nombre familia", "Imagen")
values
  ('854000', 'PASTILLA FRENO DEL. CHEVROLET ONIX', 'Juego x4, eje delantero', null, 'PF', 'PASTILLAS DE FRENO',
   'https://drive.google.com/file/d/1ONIXdelantera_abc-123/view?usp=drivesdk'),
  ('854001', 'PASTILLA FRENO TRAS. CHEVROLET ONIX', 'Juego x4, eje trasero', 'Consultar stock antes de vender', 'PF', 'PASTILLAS DE FRENO', null),
  ('854100', 'PASTILLA FRENO DEL. FIAT CRONOS', 'Juego x4', null, 'PF', 'PASTILLAS DE FRENO', ''),
  ('8540', 'PASTILLA FRENO DEL. PEUGEOT 208', 'Juego x4', null, 'PF', 'PASTILLAS DE FRENO', null),
  (' 120-33 ', 'FILTRO DE ACEITE VW GOL TREND', 'Rosca 3/4', null, 'FA', 'FILTROS DE ACEITE',
   'https://drive.google.com/file/d/1GOLfiltro_xyz/view?usp=drivesdk'),
  ('120-34', 'FILTRO DE ACEITE RENAULT KANGOO', null, 'Reemplaza al 120-30', 'FA', 'FILTROS DE ACEITE', null),
  ('AMO-500', 'AMORTIGUADOR DEL. CHEVROLET CORSA', 'Gas, par', null, 'AM', 'AMORTIGUADORES', null),
  ('BUJ-10', 'BUJÍA IRIDIUM NGK', 'Para motores nafteros', null, 'BU', 'BUJÍAS', null),
  ('999001', 'DESCUENTO ESPECIAL', null, null, '999', 'VARIOS', null),
  ('DV01', 'DEVOLUCIÓN', null, null, 'DV', 'DEVOLUCIONES', null);

-- Las migraciones corren antes que este seed: las familias se cargan acá.
select public.sincronizar_familias();

-- Fotos que n8n no pudo asignar (solo local), para probar la pantalla Fotos.
insert into public.fotos_sin_match (drive_id, archivo, candidatos, link) values
  ('1SINMATCHonix_copia', '854000 copia.jpg', '854000 COPIA|854000COPIA',
   'https://drive.google.com/file/d/1SINMATCHonix_copia/view?usp=drivesdk'),
  ('1SINMATCHbujia', 'bujia ngk.png', 'BUJIA NGK|BUJIANGK',
   'https://drive.google.com/file/d/1SINMATCHbujia/view?usp=drivesdk')
on conflict (drive_id) do nothing;

-- Bot de Telegram (solo local): un usuario habilitado y algunas consultas.
insert into public.usuarios_telegram (chat_id, nombre, notas) values (111111111, 'Juan (mostrador)', 'Ejemplo local')
on conflict (chat_id) do nothing;
insert into public.consultas_bot (chat_id, fuente, texto, sql_generado, cantidad, error, created_at) values
  (111111111, 'texto', 'pastilla onix', 'SELECT "Codigo" FROM articulos WHERE "Nombre artículo" ILIKE ''%ONIX%''', 2, null, now() - interval '5 minutes'),
  (111111111, 'audio', 'amortiguador trasero gol', 'SELECT "Codigo" FROM articulos WHERE false', 0, null, now() - interval '1 hour'),
  (111111111, 'foto', 'amortiguador trasero gol', 'SELECT "Codigo" FROM articulos WHERE false', 0, null, now() - interval '2 days'),
  (222222222, 'texto', 'hola', null, null, 'no autorizado', now() - interval '3 hours');
