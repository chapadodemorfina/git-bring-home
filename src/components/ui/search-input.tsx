import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps extends Omit<React.ComponentProps<"input">, "onChange"> {
  value: string;
  onSearch: (value: string) => void;
  /** Debounce delay in ms (default 300) */
  debounce?: number;
  containerClassName?: string;
}

export function SearchInput({
  value,
  onSearch,
  debounce = 300,
  placeholder = "Buscar...",
  containerClassName,
  className,
  ...props
}: SearchInputProps) {
  const [internal, setInternal] = React.useState(value);
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>();

  // Sync external value → internal (e.g. reset)
  React.useEffect(() => {
    setInternal(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInternal(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSearch(v), debounce);
  };

  const handleClear = () => {
    setInternal("");
    clearTimeout(timerRef.current);
    onSearch("");
  };

  React.useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div className={cn("relative flex-1 min-w-[200px]", containerClassName)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        value={internal}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn("pl-9 pr-8", className)}
        {...props}
      />
      {internal && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-sm text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
