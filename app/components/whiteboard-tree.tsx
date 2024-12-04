import React, { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, Trash } from "lucide-react";
import { formatDate } from "../lib/date";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { HBWhiteboardTree } from "@/lib/hb-utils";

interface WhiteboardTreeProps {
  tree: HBWhiteboardTree;
  level?: number;
  onCheck: (id: string, isChecked: boolean) => void;
  checkedItems: Set<string>;
}

export function WhiteboardTree({
  tree,
  level = 0,
  onCheck,
  checkedItems,
}: WhiteboardTreeProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const isChecked = checkedItems.has(tree.id);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  const handleCheck = (checked: boolean) => {
    onCheck(tree.id, checked);
  };

  return (
    <Card className="mb-2">
      <CardContent className="p-2">
        <div className="flex items-center">
          <Checkbox
            checked={isChecked}
            onCheckedChange={handleCheck}
            className="mr-2"
          />
          {tree.children.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleExpand}
              className="mr-2"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
          <div className="flex-grow">
            <h3 className="text-lg font-semibold">{tree.name}</h3>
            <p className="text-sm text-gray-500">
              Created: {formatDate(tree.createdTime)} | Last edited:{" "}
              {formatDate(tree.lastEditedTime)}
            </p>
          </div>
          {tree.isTrashed && <Trash className="h-4 w-4 text-red-500 ml-2" />}
        </div>
        {isExpanded && tree.children.length > 0 && (
          <div className="ml-6 mt-2">
            {tree.children.map((child) => (
              <WhiteboardTree
                key={child.id}
                tree={child}
                level={level + 1}
                onCheck={onCheck}
                checkedItems={checkedItems}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
