import {
  HBCard,
  HBCardInstance,
  HBData,
  HBWhiteboard,
  HBWhiteboardInstance,
} from "./hb-types";

export interface SectionNode {
  id: string;
  title: string;
  children: SectionNode[];
}

export interface HBWhiteboardTree extends HBWhiteboard {
  instance: HBWhiteboardInstance;
  children: HBWhiteboardTree[];
  sections: SectionNode[];
}
export function buildWhiteboardTree({
  whiteBoardList,
  whiteboardInstances,
  sections,
  sectionObjectRelations,
}: Pick<
  HBData,
  | "whiteBoardList"
  | "whiteboardInstances"
  | "sections"
  | "sectionObjectRelations"
>): HBWhiteboardTree[] {
  // インスタンスをIDでマッピング
  const instanceMap: Record<string, HBWhiteboardTree> = {};
  whiteBoardList.forEach((whiteboard) => {
    const instance = whiteboardInstances.find(
      (ins) => ins.whiteboardId === whiteboard.id
    );
    if (instance) {
      instanceMap[whiteboard.id] = {
        ...whiteboard,
        instance,
        children: [],
        sections: getSectionsInWhiteboard(whiteboard.id, {
          sections,
          sectionObjectRelations,
        }),
      };
    }
  });

  const roots: HBWhiteboardTree[] = [];

  whiteboardInstances.forEach((instance) => {
    if (instance.containerType === "whiteboard") {
      const parentInstance = whiteboardInstances.find(
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
// 指定したセクションに所属するカードを取得する関数
export function getCardsInSection(sectionId: string, data: HBData): string[] {
  const { sectionObjectRelations } = data;

  // 再帰的にセクションとその子孫セクションを探索してカードを取得
  const findCards = (currentSectionId: string): string[] => {
    const cards = sectionObjectRelations
      .filter(
        (relation) =>
          relation.sectionId === currentSectionId &&
          relation.objectType === "cardInstance"
      )
      .map((relation) => relation.objectId);

    const childSections = sectionObjectRelations
      .filter(
        (relation) =>
          relation.sectionId === currentSectionId &&
          relation.objectType === "section"
      )
      .map((relation) => relation.objectId);

    for (const childSectionId of childSections) {
      cards.push(...findCards(childSectionId));
    }

    return cards;
  };

  return findCards(sectionId);
}

// 指定したホワイトボードに含まれるセクションを取得する関数
function getSectionsInWhiteboard(
  whiteboardId: string,
  data: Pick<HBData, "sections" | "sectionObjectRelations">
): SectionNode[] {
  const { sections, sectionObjectRelations } = data;

  // 指定されたホワイトボードに属するセクションを取得
  const whiteboardSections = sections.filter(
    (section) => section.whiteboardId === whiteboardId
  );

  // セクションIDをキーにセクションをマッピング
  const sectionMap: Record<string, SectionNode> = {};
  whiteboardSections.forEach((section) => {
    sectionMap[section.id] = {
      id: section.id,
      title: section.title,
      children: [],
    };
  });

  // 親子関係を構築
  sectionObjectRelations.forEach((relation) => {
    if (relation.objectType === "section" && sectionMap[relation.objectId]) {
      const parentSection = sectionMap[relation.sectionId];
      const childSection = sectionMap[relation.objectId];
      if (parentSection && childSection) {
        parentSection.children.push(childSection);
      }
    }
  });

  // トップレベルのセクションを抽出
  const rootSections = whiteboardSections.filter(
    (section) =>
      !sectionObjectRelations.some(
        (relation) =>
          relation.objectType === "section" && relation.objectId === section.id
      )
  );

  return rootSections.map((section) => sectionMap[section.id]);
}
