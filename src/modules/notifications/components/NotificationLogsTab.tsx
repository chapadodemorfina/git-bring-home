import { useState } from "react";
import { useNotificationLogsPaginated } from "../hooks/useNotifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import DataPagination from "@/components/ui/data-pagination";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function NotificationLogsTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotificationLogsPaginated(page);
  const logs = data?.items || [];
  const total = data?.total || 0;

  if (isLoading) return <p className="text-muted-foreground py-8 text-center">Carregando...</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logs de Entrega</CardTitle>
      </CardHeader>
      <CardContent>
        {!logs.length ? (
          <p className="text-center py-8 text-muted-foreground">Nenhum log registrado.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status HTTP</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Resposta</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell><Badge variant="outline">{l.provider_key || "—"}</Badge></TableCell>
                      <TableCell>
                        {l.response_status ? (
                          <Badge className={l.response_status < 400 ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}>
                            {l.response_status}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {(l.request_payload as any)?.recipient || "—"}
                      </TableCell>
                      <TableCell className="text-xs max-w-[300px] truncate text-muted-foreground">
                        {l.response_payload ? JSON.stringify(l.response_payload).substring(0, 100) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(l.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DataPagination page={page} pageSize={data?.pageSize || 25} total={total} onPageChange={setPage} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
