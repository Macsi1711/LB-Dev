-- sugerir_codigos() compara también contra el nombre del artículo, para las fotos cuyo archivo
-- no trae el código ("filtro kangoo.jpg" → FILTRO DE ACEITE RENAULT KANGOO).
-- El parecido por nombre vale como máximo 0,9: un código que aparece en el archivo siempre gana.
create or replace function public.sugerir_codigos(p_textos text[], p_limit int default 5)
returns table (id bigint, codigo text, nombre text, tiene_foto boolean, similitud real)
language sql
stable
security invoker
set search_path = ''
as $$
  with textos as (
    select regexp_replace(trim(t), '\.[a-z0-9]{2,5}$', '', 'i') as texto
    from unnest(p_textos) as t
    where trim(coalesce(t, '')) <> ''
  ),
  puntajes as (
    select
      v.id, v.codigo, v.nombre, v.tiene_foto,
      max(greatest(
        -- word_similarity premia el código contenido como palabra ("854000 copia" → 854000).
        extensions.similarity(upper(v.codigo), upper(t.texto)),
        extensions.word_similarity(upper(v.codigo), upper(t.texto)),
        -- Nombre: promedio de word_similarity (palabras sueltas) y similarity (desempata).
        0.9 * (
          extensions.word_similarity(
            public.normalizar_busqueda(replace(t.texto, '_', ' ')),
            public.normalizar_busqueda(v.nombre)
          )
          + extensions.similarity(
            public.normalizar_busqueda(replace(t.texto, '_', ' ')),
            public.normalizar_busqueda(v.nombre)
          )
        ) / 2
      )) as puntaje,
      max(extensions.similarity(upper(v.codigo), upper(t.texto))) as desempate
    from public.v_articulos v
    cross join textos t
    where v.codigo is not null and v.codigo <> ''
    group by v.id, v.codigo, v.nombre, v.tiene_foto
  )
  select p.id, p.codigo, p.nombre, p.tiene_foto, p.puntaje::real
  from puntajes p
  where p.puntaje > 0.15
  order by p.puntaje desc, p.desempate desc, p.codigo
  limit least(greatest(coalesce(p_limit, 5), 1), 20)
$$;
