import RepairLog from "./RepairLog";
import TestChecklist from "./TestChecklist";
import WarrantyCard from "./WarrantyCard";
import ConsumePartPanel from "@/modules/inventory/components/ConsumePartPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, ClipboardCheck, Shield, Package } from "lucide-react";

interface Props {
  serviceOrderId: string;
  orderStatus: string;
}

export default function RepairTestWarrantyPanel({ serviceOrderId, orderStatus }: Props) {
  return (
    <Tabs defaultValue="repair" className="space-y-4">
      <TabsList>
        <TabsTrigger value="repair" className="gap-2">
          <Wrench className="h-4 w-4" /> Reparo
        </TabsTrigger>
        <TabsTrigger value="parts" className="gap-2">
          <Package className="h-4 w-4" /> Peças
        </TabsTrigger>
        <TabsTrigger value="tests" className="gap-2">
          <ClipboardCheck className="h-4 w-4" /> Testes
        </TabsTrigger>
        <TabsTrigger value="warranty" className="gap-2">
          <Shield className="h-4 w-4" /> Garantia
        </TabsTrigger>
      </TabsList>

      <TabsContent value="repair">
        <RepairLog serviceOrderId={serviceOrderId} />
      </TabsContent>

      <TabsContent value="parts">
        <ConsumePartPanel serviceOrderId={serviceOrderId} />
      </TabsContent>

      <TabsContent value="tests">
        <TestChecklist serviceOrderId={serviceOrderId} />
      </TabsContent>

      <TabsContent value="warranty">
        <WarrantyCard serviceOrderId={serviceOrderId} orderStatus={orderStatus} />
      </TabsContent>
    </Tabs>
  );
}
