import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { QueriesTab } from './queries-tab';
import { TelegramUsersTab } from './telegram-users-tab';

export function BotPage() {
  return (
    <div className="grid gap-4 p-3 sm:p-4">
      <h1 className="text-xl font-semibold">Bot de Telegram</h1>
      <Tabs defaultValue="consultas">
        <TabsList>
          <TabsTrigger value="consultas">Consultas recientes</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios habilitados</TabsTrigger>
        </TabsList>
        <TabsContent value="consultas">
          <QueriesTab />
        </TabsContent>
        <TabsContent value="usuarios">
          <TelegramUsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
