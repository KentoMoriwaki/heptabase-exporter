import {
  HBCard,
  HBCardInstance,
  HBWhiteboard,
  HBWhiteboardInstance,
} from "./hb-types";

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

export function filterCardsInWhiteboards(
  whiteboardIds: Set<string>,
  cards: HBCard[],
  instances: HBCardInstance[]
): HBCard[] {
  const instanceMap: Record<string, HBCardInstance> = {};
  instances.forEach((instance) => {
    instanceMap[instance.cardId] = instance;
  });

  return cards.filter((card) => {
    const instance = instanceMap[card.id];
    if (!instance) {
      return false;
    }
    return whiteboardIds.has(instance.whiteboardId);
  });
}
