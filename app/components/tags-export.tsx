import { HBData } from "@/lib/hb-types";
import { aggeregateToTagGroups } from "@/lib/hb-utils";
import {
  Columns,
  Grid3X3,
  Hash,
  LayoutGrid,
  List,
  SquareKanban,
} from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";

export function TagsExport({
  data,
  selectedViews,
  onSelectedViewsChange,
}: {
  data: HBData;
  selectedViews: Set<string>;
  onSelectedViewsChange: (views: Set<string>) => void;
}) {
  const tagGroups = aggeregateToTagGroups(data);

  return (
    <div className="mt-8 space-y-6">
      {tagGroups.map((group) => (
        <div key={group.groupName || "ungrouped"} className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">
            {group.groupName || "Ungrouped Tags"}
          </h3>
          {group.tags.map((tag) => (
            <div key={tag.tagId} className="space-y-2">
              <h4 className="font-medium text-gray-600 flex items-center gap-2">
                <Hash className="w-4 h-4 text-yellow-500" />
                {tag.tagName}
              </h4>
              <div className="ml-6 space-y-2">
                {tag.views.map((view) => (
                  <div key={view.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={view.id}
                      checked={selectedViews.has(view.id)}
                      onCheckedChange={() => {
                        const next = new Set(selectedViews);
                        if (next.has(view.id)) {
                          next.delete(view.id);
                        } else {
                          next.add(view.id);
                        }
                        onSelectedViewsChange(next);
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <ViewIcon type={view.type} />
                      <Label htmlFor={view.id} className="text-sm">
                        {view.name}
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ViewIcon({ type }: { type: string }) {
  switch (type.toLowerCase()) {
    case "table":
      return <Grid3X3 className="w-4 h-4 text-gray-500" />;
    case "kanban":
      return <SquareKanban className="w-4 h-4 text-gray-500" />;
    default:
      return <List className="w-4 h-4 text-gray-500" />;
  }
}
