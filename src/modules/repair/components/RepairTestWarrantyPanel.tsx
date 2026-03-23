import { useState } from "react";
import RepairLog from "./RepairLog";
import TestChecklist from "./TestChecklist";
import WarrantyCard from "./WarrantyCard";
import ConsumePartPanel from "@/modules/inventory/components/ConsumePartPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Wrench, ClipboardCheck, Shield, Package, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  serviceOrderId: string;
  orderStatus: string;
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, icon, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none pb-3 hover:bg-muted/50 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {icon} {title}
              </CardTitle>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default function RepairTestWarrantyPanel({ serviceOrderId, orderStatus }: Props) {
  return (
    <div className="space-y-4">
      <CollapsibleSection title="Reparo" icon={<Wrench className="h-4 w-4" />} defaultOpen={true}>
        <RepairLog serviceOrderId={serviceOrderId} />
      </CollapsibleSection>

      <CollapsibleSection title="Peças" icon={<Package className="h-4 w-4" />} defaultOpen={true}>
        <ConsumePartPanel serviceOrderId={serviceOrderId} />
      </CollapsibleSection>

      <CollapsibleSection title="Testes" icon={<ClipboardCheck className="h-4 w-4" />} defaultOpen={false}>
        <TestChecklist serviceOrderId={serviceOrderId} />
      </CollapsibleSection>

      <CollapsibleSection title="Garantia" icon={<Shield className="h-4 w-4" />} defaultOpen={false}>
        <WarrantyCard serviceOrderId={serviceOrderId} orderStatus={orderStatus} />
      </CollapsibleSection>
    </div>
  );
}
