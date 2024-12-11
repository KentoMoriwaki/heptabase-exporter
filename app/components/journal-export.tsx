import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JournalExportState } from "@/lib/indexed-db";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

type JournalExportType = JournalExportState["type"];

const exportLabels: {
  [key in JournalExportType]: string;
} = {
  "this-week": "This Week",
  "this-month": "This Month",
  "last-month": "Last Month",
  "this-year": "This Year",
  custom: "Custom Range",
  "last-n-days": "Last N Days",
};

interface JournalExportProps {
  isExportEnabled: boolean;
  value: JournalExportState;
  onExportEnabledChange: (enabled: boolean) => void;
  onValueChange: (value: JournalExportState) => void;
}

export function JournalExport({
  isExportEnabled,
  value,
  onExportEnabledChange,
  onValueChange,
}: JournalExportProps) {
  const onSelectChange = (value: string) => {
    switch (value) {
      case "custom":
        onValueChange({ type: "custom", startDate: null, endDate: null });
        break;
      case "last-n-days":
        onValueChange({ type: "last-n-days", days: 7 });
        break;
      case "this-week":
      case "this-month":
      case "last-month":
      case "this-year":
        onValueChange({ type: value });
        break;
      default:
        throw new Error(`Unsupported value: ${value}`);
    }
  };

  return (
    <div className="mt-8 p-4 border rounded-lg">
      <h2 className="text-xl font-bold mb-4">Export Journals</h2>
      <div className="flex items-center space-x-2 mb-4">
        <Checkbox
          id="export-journals"
          checked={isExportEnabled}
          onCheckedChange={(checked) =>
            onExportEnabledChange(checked as boolean)
          }
        />
        <Label htmlFor="export-journals">Export Journals</Label>
      </div>
      {isExportEnabled && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="period-select">Select Period</Label>
            <Select
              onValueChange={(value) => onSelectChange(value)}
              value={value.type}
            >
              <SelectTrigger id="period-select" className="w-[180px]">
                <SelectValue placeholder="Select a period" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(exportLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {value.type === "custom" && (
            <div className="flex space-x-4">
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <DatePicker
                  id="start-date"
                  selected={value.startDate ?? undefined}
                  onSelect={(date) => {
                    onValueChange({
                      ...value,
                      startDate: date ?? null,
                    });
                  }}
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <DatePicker
                  id="end-date"
                  selected={value.endDate ?? undefined}
                  onSelect={(date) => {
                    onValueChange({
                      ...value,
                      endDate: date ?? null,
                    });
                  }}
                />
              </div>
            </div>
          )}

          {value.type === "last-n-days" && (
            <div>
              <Label htmlFor="custom-days">Number of Days</Label>
              <Input
                id="custom-days"
                className="w-[180px]"
                type="number"
                placeholder="Enter number of days"
                value={value.days}
                onChange={(e) => {
                  onValueChange({ ...value, days: parseInt(e.target.value) });
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DatePicker({
  id,
  selected,
  onSelect,
}: {
  id?: string;
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant={"outline"}
          className={cn(
            "w-[240px] justify-start text-left font-normal",
            !selected && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected ? selected.toLocaleDateString() : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={onSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
