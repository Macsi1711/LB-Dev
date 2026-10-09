import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { BotKpis } from './bot-kpis';
import { MissingSearchesTab } from './missing-searches-tab';
import { QueriesTab } from './queries-tab';
import { TelegramUsersTab } from './telegram-users-tab';

export function BotPage() {
  return (
    <div className="grid gap-4 p-3 sm:p-4">
      <h1 className="text-xl font-semibold">Bot de Telegram</h1>
      <BotKpis />
      <Tabs defaultValue="consultas">
        <TabsList>
          <TabsTrigger value="consultas">Consultas recientes</TabsTrigger>
          <TabsTrigger value="sin-encontrar">No se encuentra</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
        </TabsList>
        <TabsContent value="consultas">
          <QueriesTab />
        </TabsContent>
        <TabsContent value="sin-encontrar">
          <MissingSearchesTab />
        </TabsContent>
        <TabsContent value="usuarios">
          <TelegramUsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
