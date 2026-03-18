import { Building2, ChevronDown, Check } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TenantSwitcher() {
  const { tenants, activeTenant, switchTenant, loading } = useTenant();

  if (loading || tenants.length <= 1) {
    // Show current tenant name if only one, no dropdown needed
    if (activeTenant) {
      return (
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Building2 className="h-4 w-4 text-primary" />
          <span className="hidden md:inline truncate max-w-[140px]">{activeTenant.name}</span>
        </div>
      );
    }
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 max-w-[200px]">
          <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate">{activeTenant?.name || "Selecionar"}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Trocar empresa</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map((m) => (
          <DropdownMenuItem
            key={m.tenant_id}
            onClick={() => switchTenant(m.tenant_id)}
            className="gap-2"
          >
            <Check
              className={`h-3.5 w-3.5 ${
                m.tenant_id === activeTenant?.id ? "opacity-100" : "opacity-0"
              }`}
            />
            <span className="truncate">{m.tenant.name}</span>
            <span className="ml-auto text-xs text-muted-foreground capitalize">
              {m.tenant_role}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
