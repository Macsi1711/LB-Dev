import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { BotKpis } from './bot-kpis';
import { MissingSearchesTab } from './missing-searches-tab';
import { QueriesTab } from './queries-tab';
import { TelegramUsersTab } from './telegram-users-tab';

export function BotPage() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-3 sm:p-4">
      <h1 className="text-xl font-semibold">Métricas</h1>
      <BotKpis />
      <Tabs defaultValue="consultas">
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="consultas">Consultas recientes</TabsTrigger>
          <TabsTrigger value="sin-encontrar">No se encuentra</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios de Telegram</TabsTrigger>
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
