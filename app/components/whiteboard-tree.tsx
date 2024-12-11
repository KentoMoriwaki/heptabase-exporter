import { useState } from "react";
import { ChevronRight, ChevronDown, Trash } from "lucide-react";
import { formatDate } from "../lib/date";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { HBWhiteboardTree, SectionNode } from "@/lib/hb-utils";
import { WhiteboardExportState } from "@/lib/indexed-db";

interface WhiteboardTreeProps {
  tree: HBWhiteboardTree;
  level?: number;
  exportStates: WhiteboardExportState[];
  onExportStateChange: (
    whiteboardId: string,
    state: WhiteboardExportState
  ) => void;
}

export function WhiteboardTree({
  tree,
  level = 0,
  exportStates,
  onExportStateChange,
}: WhiteboardTreeProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const isChecked = exportStates.some(
    (state) => state.whiteboardId === tree.id && state.enabled
  );

  const toggleExpand = () => setIsExpanded(!isExpanded);

  const updateExport = (
    whiteboardId: string,
    updateFn: (
      currentExport: WhiteboardExportState,
      whiteboard: HBWhiteboardTree
    ) => WhiteboardExportState
  ) => {
    const found = exportStates.find(
      (state) => state.whiteboardId === whiteboardId
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
          whiteboard
        )
      );
    }
  };

  const findWhiteboardbyId = (id: string) => {
    // Find whiteboard from whiteboardTree
    const findWhiteboard = (
      tree: HBWhiteboardTree
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

  const onSectionCheck = (sectionId: string, isChecked: boolean) => {
    updateExport(tree.id, (currentExport, whiteboard) => {
      const selectedIds = toggleNodeSelection(
        sectionId,
        whiteboard.sections,
        currentExport.selectedIds
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
    <Card className="mb-2">
      <CardContent className="p-2">
        <div className="flex items-center">
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
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={isChecked}
            onCheckedChange={(checked) => {
              updateExport(tree.id, (currentExport) => ({
                ...currentExport,
                enabled: checked as boolean,
              }));
            }}
            id={`export-${tree.id}`}
            className="mr-2"
          />
          <label
            htmlFor={`export-${tree.id}`}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Export this whiteboard
          </label>
        </div>

        {exportState.enabled && (
          <div className="ml-6 mt-2">
            {tree.sections.map((section) => (
              <SectionTree
                key={section.id}
                section={section}
                onCheck={onSectionCheck}
                checkedSections={exportState.selectedIds}
              />
            ))}
          </div>
        )}
        {isExpanded &&
          tree.children.map((child) => (
            <WhiteboardTree
              key={child.id}
              tree={child}
              level={level + 1}
              exportStates={exportStates}
              onExportStateChange={onExportStateChange}
            />
          ))}
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
  selectedIds: string[]
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
          isSelected(child.id)
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
    parentId: string | null
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
