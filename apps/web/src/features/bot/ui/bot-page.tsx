import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { TelegramUsersTab } from './telegram-users-tab';

export function BotPage() {
  return (
    <div className="grid gap-4 p-3 sm:p-4">
      <h1 className="text-xl font-semibold">Bot de Telegram</h1>
      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios">Usuarios habilitados</TabsTrigger>
        </TabsList>
        <TabsContent value="usuarios">
          <TelegramUsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
