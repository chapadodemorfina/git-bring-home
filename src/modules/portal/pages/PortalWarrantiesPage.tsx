import { useCustomerByAuth, usePortalWarranties } from "../hooks/usePortal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PortalWarrantiesPage() {
  const { data: customer, isLoading: custLoading } = useCustomerByAuth();
  const { data: warranties, isLoading } = usePortalWarranties(customer?.id);

  if (custLoading || isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Garantias</h1>
        <p className="text-muted-foreground">Consulte as garantias dos seus serviços</p>
      </div>

      {!warranties?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Nenhuma garantia encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(warranties as any[]).map((w) => {
            const endDate = new Date(w.end_date);
            const isExpired = isPast(endDate);
            const daysLeft = differenceInDays(endDate, new Date());
            const isVoid = w.is_void;

            let statusIcon;
            let statusText;
            let statusColor;

            if (isVoid) {
              statusIcon = <XCircle className="h-5 w-5 text-destructive" />;
              statusText = "Anulada";
              statusColor = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
            } else if (isExpired) {
              statusIcon = <AlertTriangle className="h-5 w-5 text-amber-500" />;
              statusText = "Expirada";
              statusColor = "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
            } else {
              statusIcon = <CheckCircle className="h-5 w-5 text-green-500" />;
              statusText = `Ativa · ${daysLeft} dias restantes`;
              statusColor = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
            }

            return (
              <Card key={w.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {statusIcon}
                      <div>
                        <p className="font-mono font-bold text-sm">{w.warranty_number}</p>
                        <p className="text-sm text-muted-foreground">OS: {w.order_number}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(w.start_date), "dd/MM/yyyy", { locale: ptBR })} →{" "}
                            {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        {w.coverage_description && (
                          <p className="text-sm mt-2">{w.coverage_description}</p>
                        )}
                      </div>
                    </div>
                    <Badge className={statusColor}>{isVoid ? "Anulada" : isExpired ? "Expirada" : "Ativa"}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
