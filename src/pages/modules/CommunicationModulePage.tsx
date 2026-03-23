import { MessageSquare, Bell } from "lucide-react";
import ModulePage from "@/components/layout/ModulePage";
import WhatsAppPage from "@/modules/whatsapp/pages/WhatsAppPage";
import MessageHistoryPage from "@/modules/messaging/pages/MessageHistoryPage";
import NotificationsPage from "@/modules/notifications/pages/NotificationsPage";

export default function CommunicationModulePage() {
  return (
    <ModulePage
      title="Comunicação"
      description="WhatsApp, mensagens e notificações"
      icon={MessageSquare}
      tabs={[
        { key: "whatsapp", label: "WhatsApp", icon: MessageSquare, content: <WhatsAppPage /> },
        { key: "messages", label: "Mensagens", icon: MessageSquare, content: <MessageHistoryPage /> },
        { key: "notifications", label: "Notificações", icon: Bell, content: <NotificationsPage /> },
      ]}
    />
  );
}
