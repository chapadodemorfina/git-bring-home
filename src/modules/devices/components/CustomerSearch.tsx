import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Search, User } from "lucide-react";

const db = supabase as any;

interface CustomerSearchProps {
  value: string;
  onChange: (id: string) => void;
  onNameSelected?: (name: string) => void;
}

export function CustomerSearch({ value, onChange }: CustomerSearchProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ id: string; full_name: string; document: string | null }[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [open, setOpen] = useState(false);

  // Load selected customer name on mount
  useEffect(() => {
    if (value && !selectedName) {
      db.from("customers").select("full_name").eq("id", value).single().then(({ data }: any) => {
        if (data) setSelectedName(data.full_name);
      });
    }
  }, [value]);

  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    const timeout = setTimeout(async () => {
      const { data } = await db
        .from("customers")
        .select("id, full_name, document")
        .or(`full_name.ilike.%${search}%,document.ilike.%${search}%`)
        .eq("is_active", true)
        .limit(10);
      setResults(data || []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  if (selectedName && value) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 h-10">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm flex-1">{selectedName}</span>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => { onChange(""); setSelectedName(""); setSearch(""); }}
        >
          Alterar
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente por nome ou CPF/CNPJ..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="pl-9"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-auto">
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex justify-between"
              onClick={() => {
                onChange(c.id);
                setSelectedName(c.full_name);
                setOpen(false);
                setSearch("");
              }}
            >
              <span>{c.full_name}</span>
              {c.document && <span className="text-muted-foreground text-xs">{c.document}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
