import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connect, inTransaction } from './db';

let db: pg.Client;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

describe('articulos: contrato con n8n', () => {
  it('conserva las columnas con sus nombres literales y tipo text', async () => {
    const { rows } = await db.query<{ column_name: string; data_type: string }>(
      `select column_name, data_type from information_schema.columns
       where table_schema = 'public' and table_name = 'articulos'`,
    );
    const columnas = Object.fromEntries(rows.map((r) => [r.column_name, r.data_type]));
    for (const nombre of [
      'Codigo',
      'Nombre artículo',
      'Descripción',
      'observaciones',
      'codigo  familia',
      'Nombre familia',
      'Imagen',
    ]) {
      expect(columnas[nombre], nombre).toBe('text');
    }
  });

  it('actualiza actualizado_en cuando n8n escribe la foto', async () => {
    await inTransaction(db, async (tx) => {
      await tx.query(
        `update articulos set actualizado_en = '2000-01-01' where "Codigo" = '854001'`,
      );
      const { rows } = await tx.query<{ actualizado_en: Date }>(
        `update articulos set "Imagen" = 'https://drive.google.com/file/d/X/view?usp=drivesdk'
         where upper(trim("Codigo")) = any($1) returning actualizado_en`,
        [['854001']],
      );
      expect(rows[0]?.actualizado_en.getFullYear()).toBeGreaterThan(2000);
    });
  });
});

describe('familias: la tabla que ya existe en producción', () => {
  it('conserva "Código" y "Nombre" como text y suma es_producto', async () => {
    const { rows } = await db.query<{ column_name: string; data_type: string }>(
      `select column_name, data_type from information_schema.columns
       where table_schema = 'public' and table_name = 'familias'`,
    );
    const columnas = Object.fromEntries(rows.map((r) => [r.column_name, r.data_type]));
    expect(columnas).toMatchObject({ Código: 'text', Nombre: 'text', es_producto: 'boolean' });
  });

  it('v_familias da nombres limpios y una fila por código, aunque la tabla repita', async () => {
    await inTransaction(db, async (tx) => {
      await tx.query(`insert into familias ("Código", "Nombre") values ('PF', 'REPETIDA')`);
      const { rows } = await tx.query(
        `select codigo, nombre, es_producto from v_familias where codigo = 'PF'`,
      );
      expect(rows).toEqual([{ codigo: 'PF', nombre: 'PASTILLAS DE FRENO', es_producto: true }]);
    });
  });

  it('sincronizar_familias agrega las que faltan sin duplicar las que ya están', async () => {
    await inTransaction(db, async (tx) => {
      await tx.query(`delete from familias where "Código" = 'AM'`);
      const { rows } = await tx.query<{ nuevas: number }>(
        'select sincronizar_familias() as nuevas',
      );
      expect(rows[0]?.nuevas).toBe(1);
      const pf = await tx.query(`select count(*)::int as n from familias where "Código" = 'PF'`);
      expect(pf.rows[0].n).toBe(1);
      const dv = await tx.query(`select es_producto from familias where "Código" = 'DV'`);
      expect(dv.rows).toEqual([{ es_producto: false }]);
    });
  });
});

describe('v_articulos', () => {
  it('limpia el código, saca el ID de Drive y marca si tiene foto', async () => {
    const { rows } = await db.query(
      `select codigo, imagen_drive_id, tiene_foto from v_articulos
       where codigo in ('854000', '854100', '120-33') order by codigo`,
    );
    expect(rows).toEqual([
      { codigo: '120-33', imagen_drive_id: '1GOLfiltro_xyz', tiene_foto: true },
      { codigo: '854000', imagen_drive_id: '1ONIXdelantera_abc-123', tiene_foto: true },
      { codigo: '854100', imagen_drive_id: null, tiene_foto: false },
    ]);
  });
});
