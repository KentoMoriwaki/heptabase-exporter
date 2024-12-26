import { ChevronRight, ChevronDown, Trash } from "lucide-react";
import { formatDate } from "../lib/date";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { HBWhiteboardTree, SectionNode } from "@/lib/hb-utils";
import { WhiteboardExportState } from "@/lib/indexed-db";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

interface WhiteboardTreeProps {
  tree: HBWhiteboardTree;
  level?: number;
  exportStates: WhiteboardExportState[];
  onExportStateChange: (
    whiteboardId: string,
    state: WhiteboardExportState,
  ) => void;
}

export function WhiteboardTree({
  tree,
  level = 0,
  exportStates,
  onExportStateChange,
}: WhiteboardTreeProps) {
  const isChecked = exportStates.some(
    (state) => state.whiteboardId === tree.id && state.enabled,
  );

  const updateExport = (
    whiteboardId: string,
    updateFn: (
      currentExport: WhiteboardExportState,
      whiteboard: HBWhiteboardTree,
    ) => WhiteboardExportState,
  ) => {
    const found = exportStates.find(
      (state) => state.whiteboardId === whiteboardId,
    );
    const whiteboard = findWhiteboardbyId(whiteboardId);
    if (!whiteboard) return;
    if (found) {
      onExportStateChange(whiteboardId, updateFn(found, whiteboard));
    } else {
      onExportStateChange(
        whiteboardId,
        updateFn(
          {
            whiteboardId,
            enabled: false,
            selectType: "all",
            selectedIds: [],
          },
          whiteboard,
        ),
      );
    }
  };

  const findWhiteboardbyId = (id: string) => {
    // Find whiteboard from whiteboardTree
    const findWhiteboard = (
      tree: HBWhiteboardTree,
    ): HBWhiteboardTree | null => {
      if (tree.id === id) {
        return tree;
      }
      for (const child of tree.children) {
        const found = findWhiteboard(child);
        if (found) {
          return found;
        }
      }
      return null;
    };
    const found = findWhiteboard(tree);
    if (found) return found;
  };

  const onSectionCheck = (sectionId: string) => {
    updateExport(tree.id, (currentExport, whiteboard) => {
      const selectedIds = toggleNodeSelection(
        sectionId,
        whiteboard.sections,
        currentExport.selectedIds,
      );
      return { ...currentExport, selectedIds };
    });
  };

  const exportState = (() => {
    const found = exportStates.find((state) => state.whiteboardId === tree.id);
    if (found) return found;
    return {
      whiteboardId: tree.id,
      enabled: false,
      selectType: "all",
      selectedIds: [],
    };
  })();

  return (
    <Card className="">
      <CardContent className="px-4 py-2">
        <div className="flex items-start">
          <div className="flex-grow">
            <h3 className="text-lg font-semibold">{tree.name}</h3>
            <p className="text-sm text-gray-500">
              Created: {formatDate(tree.createdTime)} | Last edited:{" "}
              {formatDate(tree.lastEditedTime)}
            </p>
          </div>
          {tree.isTrashed && <Trash className="h-4 w-4 text-red-500 ml-2" />}
        </div>

        <div className="flex items-center space-x-2 my-2">
          <Checkbox
            checked={isChecked}
            onCheckedChange={(checked) => {
              updateExport(tree.id, (currentExport) => ({
                ...currentExport,
                enabled: checked as boolean,
              }));
            }}
            id={`export-${tree.id}`}
          />
          <label
            htmlFor={`export-${tree.id}`}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Export this whiteboard
          </label>
        </div>

        {exportState.enabled && (
          <div className="mt-2 flex gap-2">
            <Select
              value={exportState.selectType ?? "all"}
              onValueChange={(value) => {
                updateExport(tree.id, (currentExport) => ({
                  ...currentExport,
                  selectType:
                    value === "all" ||
                    value === "include" ||
                    value === "exclude"
                      ? value
                      : "all",
                }));
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select cards to include" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cards</SelectItem>
                <SelectItem value="include">
                  Include cards in sections
                </SelectItem>
                <SelectItem value="exclude">
                  Exclude cards in sections
                </SelectItem>
              </SelectContent>
            </Select>
            {exportState.selectType === "include" ||
            exportState.selectType === "exclude" ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="secondary">
                    {exportState.selectedIds.length > 0
                      ? `Sections (${exportState.selectedIds.length})`
                      : "Select sections"}
                    {exportState.selectedIds.length > 0 ? (
                      <ChevronDown className="h-4 w-4 ml-1" />
                    ) : (
                      <ChevronRight className="h-4 w-4 ml-1" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  {tree.sections.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {tree.sections.map((section) => (
                        <SectionTree
                          key={section.id}
                          section={section}
                          onCheck={onSectionCheck}
                          checkedSections={exportState.selectedIds}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm italic">
                      No sections in this whiteboard
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            ) : null}
          </div>
        )}
        {tree.children.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            {tree.children.map((child) => (
              <WhiteboardTree
                key={child.id}
                tree={child}
                level={level + 1}
                exportStates={exportStates}
                onExportStateChange={onExportStateChange}
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
  onCheck: (sectionId: string, isChecked: boolean) => void;
  checkedSections: string[];
}) {
  const { section, onCheck, checkedSections } = props;

  const isChecked = checkedSections.includes(section.id);
  const isIndeterminate =
    !isChecked &&
    section.children.some((child) => checkedSections.includes(child.id));

  const handleCheck = (checked: boolean) => {
    onCheck(section.id, checked as boolean);
  };

  return (
    <div key={section.id} className="mt-1">
      <div className="flex items-center">
        <Checkbox
          checked={isIndeterminate ? "indeterminate" : isChecked}
          onCheckedChange={handleCheck}
          className="mr-2"
          id={`section-${section.id}`}
        />
        <label
          htmlFor={`section-${section.id}`}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {section.title}
        </label>
      </div>
      {section.children.length > 0 && (
        <div className="ml-4 mt-1 flex flex-col gap-1">
          {section.children.map((child) => (
            <SectionTree
              key={child.id}
              section={child}
              onCheck={onCheck}
              checkedSections={checkedSections}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function toggleNodeSelection(
  nodeId: string,
  tree: SectionNode[],
  selectedIds: string[],
): string[] {
  // Helper function to check if a node is selected
  function isSelected(id: string): boolean {
    return selectedIds.includes(id);
  }

  // Helper function to add a node and its children to selectedIds
  function selectNodeAndDescendants(node: SectionNode): void {
    if (!isSelected(node.id)) {
      selectedIds.push(node.id);
    }
    node.children.forEach(selectNodeAndDescendants);
  }

  // Helper function to remove a node and its children from selectedIds
  function deselectNodeAndDescendants(node: SectionNode): void {
    selectedIds = selectedIds.filter((id) => id !== node.id);
    node.children.forEach(deselectNodeAndDescendants);
  }

  // Helper function to update parent node state based on its children
  function updateParentState(node: SectionNode, parentId: string | null): void {
    if (parentId) {
      const parent = findNodeById(tree, parentId);
      if (parent) {
        const someChildrenSelected = parent.children.some((child) =>
          isSelected(child.id),
        );

        if (someChildrenSelected) {
          selectedIds = selectedIds.filter((id) => id !== parent.id);
        } else {
          selectedIds = selectedIds.filter((id) => id !== parent.id);
        }
      }
    }
  }

  // Helper function to find a node by its ID
  function findNodeById(nodes: SectionNode[], id: string): SectionNode | null {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
    return null;
  }

  // Recursive function to traverse the tree and toggle the node
  function traverseAndToggle(
    node: SectionNode,
    parentId: string | null,
  ): boolean {
    if (node.id === nodeId) {
      if (isSelected(node.id)) {
        // Node is currently selected; deselect it and its descendants
        deselectNodeAndDescendants(node);
      } else {
        // Node is currently not selected; select it and its descendants
        selectNodeAndDescendants(node);
      }
      updateParentState(node, parentId);
      return true;
    }
    for (const child of node.children) {
      if (traverseAndToggle(child, node.id)) {
        updateParentState(node, parentId);
        return true;
      }
    }
    return false;
  }

  // Traverse the tree to find and toggle the target node
  tree.forEach((node) => traverseAndToggle(node, null));

  return selectedIds;
}
