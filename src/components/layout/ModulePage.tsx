import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface ModuleTab {
  key: string;
  label: string;
  icon?: LucideIcon;
  content: React.ReactNode;
}

interface ModulePageProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  tabs: ModuleTab[];
  defaultTab?: string;
}

export default function ModulePage({ title, description, icon: Icon, tabs, defaultTab }: ModulePageProps) {
  const [params, setParams] = useSearchParams();
  const currentTab = params.get("tab") || defaultTab || tabs[0]?.key;

  const handleTabChange = (value: string) => {
    setParams({ tab: value }, { replace: true });
  };

  return (
    <div className="space-y-4">
      {title && (
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {Icon && <Icon className="h-6 w-6" />}
            {title}
          </h1>
          {description && <p className="text-muted-foreground text-sm mt-1">{description}</p>}
        </div>
      )}

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <div className="overflow-x-auto -mx-6 px-6 scrollbar-hide">
          <TabsList className={cn("inline-flex h-10 w-auto min-w-full sm:min-w-0")}>
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className="whitespace-nowrap gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
              >
                {tab.icon && <tab.icon className="h-3.5 w-3.5" />}
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {tabs.map((tab) => (
          <TabsContent key={tab.key} value={tab.key} className="mt-4">
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
