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
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";

interface JournalExportProps {
  isExportEnabled: boolean;
  onExportEnabledChange: (enabled: boolean) => void;
}

const presetPeriods = [
  {
    label: "This Week",
    value: `${new Date(
      new Date().setDate(new Date().getDate() - new Date().getDay())
    )}-${new Date()}`,
  },
  {
    label: "This Month",
    value: `${new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    )}-${new Date()}`,
  },
  {
    label: "Last Month",
    value: `${new Date(
      new Date().getFullYear(),
      new Date().getMonth() - 1,
      1
    )}-${new Date(new Date().getFullYear(), new Date().getMonth(), 0)}`,
  },
  {
    label: "This Year",
    value: `${new Date(new Date().getFullYear(), 0, 1)}-${new Date()}`,
  },
];

export function JournalExport({
  isExportEnabled,
  onExportEnabledChange,
}: JournalExportProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [customDays, setCustomDays] = useState<string>("");

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
            <Select onValueChange={setSelectedPreset} value={selectedPreset}>
              <SelectTrigger id="period-select">
                <SelectValue placeholder="Select a period" />
              </SelectTrigger>
              <SelectContent>
                {presetPeriods.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom Range</SelectItem>
                <SelectItem value="lastNDays">Last N Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedPreset === "custom" && (
            <div className="flex space-x-4">
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <DatePicker
                  id="start-date"
                  selected={startDate}
                  onSelect={setStartDate}
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <DatePicker
                  id="end-date"
                  selected={endDate}
                  onSelect={setEndDate}
                />
              </div>
            </div>
          )}

          {selectedPreset === "lastNDays" && (
            <div>
              <Label htmlFor="custom-days">Number of Days</Label>
              <Input
                id="custom-days"
                type="number"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                placeholder="Enter number of days"
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
  selected?: Date;
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
          {selected ? format(selected, "PPP") : <span>Pick a date</span>}
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
