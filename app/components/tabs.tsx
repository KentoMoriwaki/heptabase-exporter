import * as React from "react";
import { cn } from "@/lib/utils";

export const TabsContext = React.createContext<ReturnType<
  typeof useTabsContext
> | null>(null);

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

function useTabsContext() {
  const [value, setValue] = React.useState<string | undefined>(undefined);
  const setContextValue = (newValue: string) => setValue(newValue);
  return { value, setValue: setContextValue };
}

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
  ...props
}: TabsProps) {
  const context = useTabsContext();
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : context.value ?? defaultValue;
  const setValue = React.useCallback(
    (newValue: string) => {
      if (!isControlled) {
        context.setValue(newValue);
      }
      onValueChange?.(newValue);
    },
    [context, isControlled, onValueChange]
  );

  return (
    <TabsContext.Provider value={{ ...context, value, setValue }}>
      <div {...props}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  selectedCount?: number;
}

export function TabsTrigger({
  value,
  selectedCount,
  className,
  children,
  ...props
}: TabsTriggerProps) {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("TabsTrigger must be used within a Tabs component");
  }

  const isSelected = context.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      onClick={() => context.setValue(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isSelected
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
      {...props}
    >
      {children}
      {selectedCount !== undefined && selectedCount > 0 && (
        <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
          {selectedCount}
        </span>
      )}
    </button>
  );
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsContent({
  value,
  className,
  children,
  ...props
}: TabsContentProps) {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("TabsContent must be used within a Tabs component");
  }

  return context.value === value ? (
    <div role="tabpanel" className={cn("mt-2", className)} {...props}>
      {children}
    </div>
  ) : null;
}
