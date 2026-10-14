import { demoBotQueries, demoTelegramUsers } from '@/shared/demo/extras';
import { normalize } from '@/shared/demo/text';
import { BotDataError, type BotPort } from '../domain/ports';
import { dateRange, UNAUTHORIZED } from '../domain/queries';

const userName = (chatId: number | null) =>
  demoTelegramUsers.find((u) => u.chatId === chatId)?.name ?? null;
const DAY = 24 * 60 * 60_000;

export function createDemoBot(): BotPort {
  return {
    telegramUsers: async () => [...demoTelegramUsers].sort((a, b) => a.name.localeCompare(b.name)),
    async createTelegramUser(u) {
      if (demoTelegramUsers.some((x) => x.chatId === u.chatId))
        throw new BotDataError('duplicado', '23505');
      demoTelegramUsers.push({ ...u, active: true, createdAt: new Date().toISOString() });
    },
    async updateTelegramUser(chatId, patch) {
      const user = demoTelegramUsers.find((u) => u.chatId === chatId);
      if (user)
        Object.assign(
          user,
          Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
        );
    },
    async deleteTelegramUser(chatId) {
      const i = demoTelegramUsers.findIndex((u) => u.chatId === chatId);
      if (i >= 0) demoTelegramUsers.splice(i, 1);
    },
    async recentQueries(f, offset, limit) {
      const range = dateRange(f.from, f.to);
      return demoBotQueries
        .map((q) => ({ ...q, userName: q.userName ?? userName(q.chatId) }))
        .filter((q) => !f.onlyNoResults || q.results === 0)
        .filter((q) => !f.channel || q.channel === f.channel)
        .filter(
          (q) => f.user === null || (f.user === UNAUTHORIZED ? !q.userName : q.chatId === f.user),
        )
        .filter((q) => !f.source || q.source === f.source)
        .filter(
          (q) =>
            (!range.gte || q.createdAt >= new Date(range.gte).toISOString()) &&
            (!range.lt || q.createdAt < new Date(range.lt).toISOString()),
        )
        .slice(offset, offset + limit);
    },
    async kpis() {
      const now = Date.now();
      const week = demoBotQueries.filter((q) => now - Date.parse(q.createdAt) < 7 * DAY);
      const counted = week.filter((q) => q.results !== null);
      const startOfDay = new Date().setHours(0, 0, 0, 0);
      return {
        today: demoBotQueries.filter((q) => Date.parse(q.createdAt) >= startOfDay).length,
        week: week.length,
        noResultsPct: counted.length
          ? (100 * counted.filter((q) => q.results === 0).length) / counted.length
          : null,
        activeUsers: new Set(
          week.filter((q) => q.error !== 'no autorizado').map((q) => q.userName ?? q.chatId),
        ).size,
      };
    },
    async missingSearches(days) {
      const groups = new Map<string, { text: string; times: number; last: string }>();
      for (const q of demoBotQueries) {
        if (q.results !== 0 || q.error || Date.now() - Date.parse(q.createdAt) > days * DAY)
          continue;
        const key = normalize(q.text);
        const g = groups.get(key) ?? { text: q.text, times: 0, last: q.createdAt };
        g.times++;
        if (q.createdAt > g.last) g.last = q.createdAt;
        groups.set(key, g);
      }
      return [...groups.values()].sort((a, b) => b.times - a.times || b.last.localeCompare(a.last));
    },
  };
}
