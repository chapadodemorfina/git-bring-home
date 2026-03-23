import { MessageSquare, Bell } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import ModulePage from "@/components/layout/ModulePage";
import CommunicationHubDashboard from "@/modules/messaging/components/CommunicationHubDashboard";
import WhatsAppPage from "@/modules/whatsapp/pages/WhatsAppPage";
import MessageHistoryPage from "@/modules/messaging/pages/MessageHistoryPage";
import NotificationsPage from "@/modules/notifications/pages/NotificationsPage";

export default function CommunicationModulePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6" /> Comunicação
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          WhatsApp, mensagens e notificações
        </p>
      </div>

      <CommunicationHubDashboard />

      <Separator />

      <ModulePage
        title=""
        tabs={[
          { key: "whatsapp", label: "WhatsApp", icon: MessageSquare, content: <WhatsAppPage /> },
          { key: "messages", label: "Mensagens", icon: MessageSquare, content: <MessageHistoryPage /> },
          { key: "notifications", label: "Notificações", icon: Bell, content: <NotificationsPage /> },
        ]}
      />
    </div>
  );
}
