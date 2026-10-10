import { describe, expect, it } from 'vitest';
import { telegramUserErrorMessage, validateTelegramUser } from './telegram-user';

describe('validateTelegramUser', () => {
  it('acepta un chat_id numérico (los grupos son negativos) y un nombre', () => {
    expect(validateTelegramUser({ chatId: ' 123456789 ', name: ' Juan ', notes: '' })).toEqual({
      ok: true,
      value: { chatId: 123456789, name: 'Juan', notes: null },
    });
    expect(
      validateTelegramUser({ chatId: '-1001234567890', name: 'Mostrador', notes: 'grupo' }),
    ).toEqual({
      ok: true,
      value: { chatId: -1001234567890, name: 'Mostrador', notes: 'grupo' },
    });
  });

  it('rechaza un chat_id que no es un número entero', () => {
    for (const chatId of ['', 'abc', '12.5', '1e5', '99999999999999999999']) {
      expect(validateTelegramUser({ chatId, name: 'Juan', notes: '' })).toEqual({
        ok: false,
        error: 'El chat_id tiene que ser un número, como aparece en Consultas recientes.',
      });
    }
  });

  it('pide un nombre', () => {
    expect(validateTelegramUser({ chatId: '1', name: '  ', notes: '' })).toEqual({
      ok: false,
      error: 'Poné un nombre para saber quién es.',
    });
  });
});

describe('telegramUserErrorMessage', () => {
  it('avisa si el chat_id ya estaba cargado', () => {
    expect(telegramUserErrorMessage('23505')).toBe('Ese chat_id ya está habilitado.');
  });

  it('usa un mensaje genérico para el resto', () => {
    expect(telegramUserErrorMessage(undefined)).toBe('No se pudo guardar. Probá de nuevo.');
  });
});
