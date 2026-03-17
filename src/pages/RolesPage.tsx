import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, X, Shield, Eye, Edit, Trash2, Plus } from "lucide-react";

const roles = [
  { key: "admin", label: "Admin", color: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200" },
  { key: "manager", label: "Gerente", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200" },
  { key: "front_desk", label: "Recepção", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200" },
  { key: "bench_technician", label: "Téc. Bancada", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200" },
  { key: "field_technician", label: "Téc. Campo", color: "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200" },
  { key: "finance", label: "Financeiro", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200" },
  { key: "collection_point_operator", label: "Op. Coleta", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200" },
  { key: "customer", label: "Cliente", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200" },
];

type Perm = "full" | "read" | "write" | "own" | "none";

interface ModulePermissions {
  module: string;
  label: string;
  permissions: Record<string, Perm>;
}

const permissionMatrix: ModulePermissions[] = [
  {
    module: "dashboard", label: "Dashboard",
    permissions: { admin: "full", manager: "full", front_desk: "read", bench_technician: "none", field_technician: "none", finance: "read", collection_point_operator: "none", customer: "none" },
  },
  {
    module: "service_orders", label: "Ordens de Serviço",
    permissions: { admin: "full", manager: "full", front_desk: "write", bench_technician: "own", field_technician: "own", finance: "read", collection_point_operator: "own", customer: "own" },
  },
  {
    module: "customers", label: "Clientes",
    permissions: { admin: "full", manager: "full", front_desk: "write", bench_technician: "read", field_technician: "read", finance: "read", collection_point_operator: "own", customer: "own" },
  },
  {
    module: "devices", label: "Dispositivos",
    permissions: { admin: "full", manager: "full", front_desk: "write", bench_technician: "read", field_technician: "read", finance: "read", collection_point_operator: "own", customer: "own" },
  },
  {
    module: "diagnostics", label: "Diagnósticos",
    permissions: { admin: "full", manager: "full", front_desk: "read", bench_technician: "write", field_technician: "write", finance: "none", collection_point_operator: "none", customer: "none" },
  },
  {
    module: "quotes", label: "Orçamentos",
    permissions: { admin: "full", manager: "full", front_desk: "read", bench_technician: "read", field_technician: "read", finance: "read", collection_point_operator: "none", customer: "read" },
  },
  {
    module: "repair", label: "Reparos",
    permissions: { admin: "full", manager: "full", front_desk: "none", bench_technician: "write", field_technician: "write", finance: "none", collection_point_operator: "none", customer: "none" },
  },
  {
    module: "inventory", label: "Estoque & Peças",
    permissions: { admin: "full", manager: "full", front_desk: "read", bench_technician: "read", field_technician: "read", finance: "read", collection_point_operator: "none", customer: "none" },
  },
  {
    module: "finance", label: "Financeiro",
    permissions: { admin: "full", manager: "full", front_desk: "none", bench_technician: "none", field_technician: "none", finance: "full", collection_point_operator: "none", customer: "none" },
  },
  {
    module: "logistics", label: "Logística",
    permissions: { admin: "full", manager: "full", front_desk: "write", bench_technician: "none", field_technician: "read", finance: "none", collection_point_operator: "read", customer: "none" },
  },
  {
    module: "collection_points", label: "Pontos de Coleta",
    permissions: { admin: "full", manager: "full", front_desk: "read", bench_technician: "none", field_technician: "none", finance: "read", collection_point_operator: "own", customer: "none" },
  },
  {
    module: "warranties", label: "Garantias",
    permissions: { admin: "full", manager: "full", front_desk: "read", bench_technician: "write", field_technician: "write", finance: "none", collection_point_operator: "none", customer: "read" },
  },
  {
    module: "notifications", label: "Notificações",
    permissions: { admin: "full", manager: "full", front_desk: "none", bench_technician: "none", field_technician: "none", finance: "none", collection_point_operator: "none", customer: "none" },
  },
  {
    module: "users", label: "Usuários",
    permissions: { admin: "full", manager: "read", front_desk: "none", bench_technician: "none", field_technician: "none", finance: "none", collection_point_operator: "none", customer: "none" },
  },
  {
    module: "audit", label: "Auditoria",
    permissions: { admin: "full", manager: "none", front_desk: "none", bench_technician: "none", field_technician: "none", finance: "none", collection_point_operator: "none", customer: "none" },
  },
  {
    module: "settings", label: "Configurações",
    permissions: { admin: "full", manager: "write", front_desk: "none", bench_technician: "none", field_technician: "none", finance: "none", collection_point_operator: "none", customer: "none" },
  },
];

const permIcons: Record<Perm, { icon: React.ReactNode; label: string; className: string }> = {
  full: { icon: <Shield className="h-3.5 w-3.5" />, label: "Acesso total (CRUD + Admin)", className: "text-green-600 dark:text-green-400" },
  write: { icon: <Edit className="h-3.5 w-3.5" />, label: "Leitura + Escrita", className: "text-blue-600 dark:text-blue-400" },
  read: { icon: <Eye className="h-3.5 w-3.5" />, label: "Somente leitura", className: "text-amber-600 dark:text-amber-400" },
  own: { icon: <Check className="h-3.5 w-3.5" />, label: "Apenas próprios registros", className: "text-purple-600 dark:text-purple-400" },
  none: { icon: <X className="h-3.5 w-3.5" />, label: "Sem acesso", className: "text-muted-foreground/40" },
};

function PermCell({ perm }: { perm: Perm }) {
  const config = permIcons[perm];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`flex items-center justify-center ${config.className}`}>
          {config.icon}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">{config.label}</TooltipContent>
    </Tooltip>
  );
}

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Perfis & Permissões</h1>
        <p className="text-muted-foreground">Matriz de controle de acesso por módulo e perfil</p>
      </div>

      <Tabs defaultValue="matrix">
        <TabsList>
          <TabsTrigger value="matrix"><Shield className="mr-1 h-4 w-4" /> Matriz de Permissões</TabsTrigger>
          <TabsTrigger value="roles">Perfis Disponíveis</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="mt-4">
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-4 text-sm">
            {Object.entries(permIcons).map(([key, config]) => (
              <div key={key} className={`flex items-center gap-1.5 ${config.className}`}>
                {config.icon}
                <span>{config.label}</span>
              </div>
            ))}
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[160px]">Módulo</TableHead>
                    {roles.map((r) => (
                      <TableHead key={r.key} className="text-center px-2 min-w-[80px]">
                        <Badge className={`${r.color} text-[10px] font-medium`}>{r.label}</Badge>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissionMatrix.map((mod) => (
                    <TableRow key={mod.module}>
                      <TableCell className="sticky left-0 bg-background z-10 font-medium text-sm">{mod.label}</TableCell>
                      {roles.map((r) => (
                        <TableCell key={r.key} className="text-center px-2">
                          <PermCell perm={mod.permissions[r.key] || "none"} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((r) => {
              const moduleCount = permissionMatrix.filter(m => m.permissions[r.key] !== "none").length;
              const fullCount = permissionMatrix.filter(m => m.permissions[r.key] === "full").length;
              const writeCount = permissionMatrix.filter(m => m.permissions[r.key] === "write").length;
              const readCount = permissionMatrix.filter(m => m.permissions[r.key] === "read").length;
              const ownCount = permissionMatrix.filter(m => m.permissions[r.key] === "own").length;

              return (
                <Card key={r.key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Badge className={r.color}>{r.label}</Badge>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground font-mono">{r.key}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-1">
                      <p className="text-muted-foreground">{moduleCount} de {permissionMatrix.length} módulos</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {fullCount > 0 && <Badge variant="outline" className="text-green-600 border-green-300 text-[10px]"><Shield className="h-2.5 w-2.5 mr-0.5" />{fullCount} total</Badge>}
                        {writeCount > 0 && <Badge variant="outline" className="text-blue-600 border-blue-300 text-[10px]"><Edit className="h-2.5 w-2.5 mr-0.5" />{writeCount} escrita</Badge>}
                        {readCount > 0 && <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]"><Eye className="h-2.5 w-2.5 mr-0.5" />{readCount} leitura</Badge>}
                        {ownCount > 0 && <Badge variant="outline" className="text-purple-600 border-purple-300 text-[10px]"><Check className="h-2.5 w-2.5 mr-0.5" />{ownCount} próprio</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
