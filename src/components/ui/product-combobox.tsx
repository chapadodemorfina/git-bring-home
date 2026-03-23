import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ProductOption {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  sale_price?: number;
  cost_price?: number;
}

interface ProductComboboxProps {
  products: ProductOption[];
  value: string;
  onValueChange: (id: string, product?: ProductOption) => void;
  placeholder?: string;
  showStock?: boolean;
  filterInStock?: boolean;
  disabled?: boolean;
}

export function ProductCombobox({
  products,
  value,
  onValueChange,
  placeholder = "Selecione um produto...",
  showStock = true,
  filterInStock = false,
  disabled = false,
}: ProductComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = products ?? [];
    if (filterInStock) list = list.filter((p) => p.quantity > 0);
    if (!search.trim()) return list;
    const term = search.toLowerCase();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term)
    );
  }, [products, search, filterInStock]);

  const selected = products?.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          <span className="truncate">
            {selected
              ? `${selected.sku} — ${selected.name}`
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Buscar por nome ou SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border-0 p-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <ScrollArea className="max-h-[240px]">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum produto encontrado.
            </p>
          ) : (
            <div className="p-1">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer",
                    value === p.id && "bg-accent"
                  )}
                  onClick={() => {
                    onValueChange(p.id, p);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      value === p.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">
                    {p.sku} — {p.name}
                    {showStock && (
                      <span className="text-muted-foreground ml-1">
                        (estoque: {p.quantity})
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
