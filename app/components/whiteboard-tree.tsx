import React, { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, Trash } from "lucide-react";
import { formatDate } from "../lib/date";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { HBWhiteboardTree, SectionNode } from "@/lib/hb-utils";

interface WhiteboardTreeProps {
  tree: HBWhiteboardTree;
  level?: number;
  onWhiteboardCheck: (whitebaordId: string, isChecked: boolean) => void;
  checkedItems: Set<string>;
  checkedSections: Map<string, boolean | null>;
  onSectionCheck: (
    whiteboardId: string,
    sectionId: string,
    isChecked: boolean
  ) => void;
}

export function WhiteboardTree({
  tree,
  level = 0,
  onWhiteboardCheck,
  checkedItems,
  checkedSections,
  onSectionCheck,
}: WhiteboardTreeProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const isChecked = checkedItems.has(tree.id);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  const handleCheck = (checked: boolean) => {
    onWhiteboardCheck(tree.id, checked);
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
          {(tree.children.length > 0 || tree.sections.length > 0) && (
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
        {isExpanded && (
          <div className="ml-6 mt-2">
            {tree.sections.map((section) => (
              <SectionTree
                key={section.id}
                section={section}
                onSectionCheck={onSectionCheck}
                checkedSections={checkedSections}
                tree={tree}
              />
            ))}
            {tree.children.map((child) => (
              <WhiteboardTree
                key={child.id}
                tree={child}
                level={level + 1}
                onWhiteboardCheck={onWhiteboardCheck}
                checkedItems={checkedItems}
                checkedSections={checkedSections}
                onSectionCheck={onSectionCheck}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SectionTree(props: {
  section: SectionNode;
  onSectionCheck: (
    whiteboardId: string,
    sectionId: string,
    isChecked: boolean
  ) => void;
  checkedSections: Map<string, boolean | null>;
  tree: HBWhiteboardTree;
}) {
  const { section, onSectionCheck, checkedSections, tree } = props;

  const selectionState = checkedSections.get(section.id);
  const isChecked = selectionState === true;
  const isIndeterminate = selectionState === null;

  const handleCheck = (checked: boolean) => {
    onSectionCheck(tree.id, section.id, checked as boolean);
  };

  return (
    <div key={section.id} className="ml-4">
      <Checkbox
        checked={isIndeterminate ? "indeterminate" : isChecked}
        onCheckedChange={handleCheck}
        className="mr-2"
      />
      <span>{section.title}</span>
      {section.children.length > 0 && (
        <div className="ml-4">
          {section.children.map((child) => (
            <SectionTree
              key={child.id}
              section={child}
              onSectionCheck={onSectionCheck}
              checkedSections={checkedSections}
              tree={tree}
            />
          ))}
        </div>
      )}
    </div>
  );
}
