/**
 * Sistema de gestão técnica i9
 * Desenvolvido por Alvo Sistemas e Gestão
 *
 * Diagnóstico de divergência role vs permissão — Fase 3.5.
 *
 * Compara, para um usuário selecionado, o acesso ATUAL (por role via
 * `ROUTE_ROLES`) com o acesso FUTURO (por permissão via `ROUTE_PERMISSIONS`).
 *
 * Não bloqueia nada, não altera enforcement. Apenas leitura.
 */
import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, ShieldQuestion } from "lucide-react";
import { ROUTE_ROLES, type AppRole } from "@/lib/permissions";
import { ROUTE_PERMISSIONS, type RoutePermissionKey } from "@/lib/routePermissions";
import { useEffectivePermissions } from "../hooks/usePermissions";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Props {
  userId: string;
  userLabel: string;
  userRoles: string[];
}

type RowDivergence = "ok-allow" | "ok-deny" | "role-only" | "perm-only";

interface DiagRow {
  key: RoutePermissionKey;
  roles: readonly string[];
  perms: readonly string[];
  byRole: boolean;
  byPerm: boolean;
  divergence: RowDivergence;
}

export function PermissionDivergenceDiagnostic({ userId, userLabel, userRoles }: Props) {
  const { data: effective, isLoading, error } = useEffectivePermissions(userId);

  const rows: DiagRow[] = useMemo(() => {
    const permMap = new Map<string, boolean>();
    (effective || []).forEach((p) => permMap.set(p.key, !!p.effective));

    const keys = Object.keys(ROUTE_PERMISSIONS) as RoutePermissionKey[];
    return keys.map((key) => {
      const routeRoles = (ROUTE_ROLES as Record<string, readonly AppRole[]>)[key] || [];
      const perms = ROUTE_PERMISSIONS[key].anyOf;
      const byRole =
        routeRoles.length > 0 &&
        userRoles.some((r) => routeRoles.includes(r as AppRole));
      const byPerm = perms.some((k) => permMap.get(k) === true);

      let divergence: RowDivergence;
      if (byRole && byPerm) divergence = "ok-allow";
      else if (!byRole && !byPerm) divergence = "ok-deny";
      else if (byRole && !byPerm) divergence = "role-only";
      else divergence = "perm-only";

      return { key, roles: routeRoles, perms, byRole, byPerm, divergence };
    });
  }, [effective, userRoles]);

  const summary = useMemo(() => {
    const s = { ok: 0, roleOnly: 0, permOnly: 0 };
    rows.forEach((r) => {
      if (r.divergence === "ok-allow" || r.divergence === "ok-deny") s.ok++;
      else if (r.divergence === "role-only") s.roleOnly++;
      else s.permOnly++;
    });
    return s;
  }, [rows]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldQuestion className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Diagnóstico role vs permissão</CardTitle>
        </div>
        <CardDescription>
          Comparação entre o acesso atual (por role) e o acesso futuro (por permissão) para{" "}
          <span className="font-medium">{userLabel}</span>. Somente leitura — não altera enforcement.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="text-sm text-destructive">
            Erro ao carregar permissões efetivas: {(error as Error).message}
          </div>
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">OK: {summary.ok}</Badge>
              <Badge variant="destructive">Role permite / permissão negaria: {summary.roleOnly}</Badge>
              <Badge>Permissão permite / role negaria: {summary.permOnly}</Badge>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rota/Módulo</TableHead>
                    <TableHead>Roles atuais</TableHead>
                    <TableHead>Permissões (anyOf)</TableHead>
                    <TableHead>Por role</TableHead>
                    <TableHead>Por permissão</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.key}>
                      <TableCell className="font-mono text-xs">{r.key}</TableCell>
                      <TableCell className="text-xs">{r.roles.join(", ") || "—"}</TableCell>
                      <TableCell className="text-xs">{r.perms.join(", ")}</TableCell>
                      <TableCell>
                        <Badge variant={r.byRole ? "default" : "outline"}>
                          {r.byRole ? "Permite" : "Nega"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.byPerm ? "default" : "outline"}>
                          {r.byPerm ? "Permite" : "Nega"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DivergenceBadge value={r.divergence} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DivergenceBadge({ value }: { value: RowDivergence }) {
  if (value === "ok-allow" || value === "ok-deny") {
    return (
      <Badge variant="secondary" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        OK
      </Badge>
    );
  }
  if (value === "role-only") {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Role permite / permissão negaria
      </Badge>
    );
  }
  return (
    <Badge className="gap-1">
      <AlertTriangle className="h-3 w-3" />
      Permissão permite / role negaria
    </Badge>
  );
}

export default PermissionDivergenceDiagnostic;
