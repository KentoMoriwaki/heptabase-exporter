import { HBWhiteboard, HBWhiteboardInstance } from "./hb-types";

export interface HBWhiteboardTree extends HBWhiteboard {
  instance: HBWhiteboardInstance;
  children: HBWhiteboardTree[];
}

export function buildWhiteboardTree(
  whiteboardList: HBWhiteboard[],
  instances: HBWhiteboardInstance[]
): HBWhiteboardTree[] {
  // インスタンスをIDでマッピング
  const instanceMap: Record<string, HBWhiteboardTree> = {};
  whiteboardList.forEach((whiteboard) => {
    const instance = instances.find(
      (ins) => ins.whiteboardId === whiteboard.id
    );
    if (instance) {
      instanceMap[whiteboard.id] = { ...whiteboard, instance, children: [] };
    } else {
      console.log(`Instance not found for whiteboard: ${whiteboard.id}`);
    }
  });

  const roots: HBWhiteboardTree[] = [];

  instances.forEach((instance) => {
    if (instance.containerType === "whiteboard") {
      const parentInstance = instances.find(
        (parent) => parent.whiteboardId === instance.containerId
      );
      if (parentInstance) {
        instanceMap[parentInstance.whiteboardId].children.push(
          instanceMap[instance.whiteboardId]
        );
      } else {
        roots.push(instanceMap[instance.whiteboardId]);
      }
    } else {
      roots.push(instanceMap[instance.whiteboardId]);
    }
  });

  return roots;
}
