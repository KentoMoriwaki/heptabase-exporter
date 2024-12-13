import {
  HBCard,
  HBCardInstance,
  HBCollectionView,
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
        if (!instanceMap[instance.whiteboardId].isTrashed) {
          roots.push(instanceMap[instance.whiteboardId]);
        }
      }
    } else {
      if (!instanceMap[instance.whiteboardId].isTrashed) {
        roots.push(instanceMap[instance.whiteboardId]);
      }
    }
  });

  return roots;
}

export function filterCardsInWhiteboards(
  whiteboardIds: Set<string>,
  {
    cardList,
    cardInstances,
    sectionObjectRelations,
  }: Pick<HBData, "cardList" | "cardInstances" | "sectionObjectRelations">,
  options: {
    includeSections?: string[];
    excludeSections?: string[];
  }
): HBCard[] {
  const instanceMap: Record<string, HBCardInstance> = {};
  cardInstances.forEach((instance) => {
    instanceMap[instance.cardId] = instance;
  });
  const cardSections: Record<string, string> = {}; // cardId -> sectionId
  sectionObjectRelations.forEach((relation) => {
    if (relation.objectType === "cardInstance") {
      const cardId = relation.objectId;
      const sectionId = relation.sectionId;
      cardSections[cardId] = sectionId;
    }
  });

  return cardList.filter((card) => {
    const instance = instanceMap[card.id];
    if (!instance) {
      return false;
    }
    if (!whiteboardIds.has(instance.whiteboardId)) {
      return false;
    }
    if (options.includeSections) {
      return (
        cardSections[instance.id] &&
        options.includeSections.includes(cardSections[instance.id])
      );
    }
    if (options.excludeSections) {
      return (
        cardSections[instance.id] &&
        !options.excludeSections.includes(cardSections[instance.id])
      );
    }
    return true;
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

type AggregatedTagGroup = {
  groupName: string | null; // group に所属していない tag もある
  tags: Array<{
    tagId: string;
    tagName: string;
    // tag が持つ views は .collections.queryConfig.type == "tag" になっているものの、.collections.queryConfig.id から引っ張れる
    views: HBCollectionView[];
  }>;
};

export function aggeregateToTagGroups(data: HBData): AggregatedTagGroup[] {
  // Create a map of collection views by collection ID for faster lookup
  const collectionViewsByCollectionId = new Map<string, HBCollectionView[]>();
  data.collectionViews.forEach((view) => {
    const views = collectionViewsByCollectionId.get(view.collectionId) || [];
    views.push(view);
    collectionViewsByCollectionId.set(view.collectionId, views);
  });

  // Create a map of collections by tag ID for faster lookup
  const collectionsByTagId = new Map<string, string[]>();
  data.collections.forEach((collection) => {
    if (collection.queryConfig.type === "tag") {
      const tagId = collection.queryConfig.id;
      const collections = collectionsByTagId.get(tagId) || [];
      collections.push(collection.id);
      collectionsByTagId.set(tagId, collections);
    }
  });

  // Create a map of tags by ID for faster lookup
  const tagsById = new Map(data.tagList.map((tag) => [tag.id, tag]));

  // Process tag groups
  const tagGroups: AggregatedTagGroup[] = [];

  // First, handle tags that belong to groups
  data.tagGroups.forEach((group) => {
    const tags = group.tags
      .map((tagId) => {
        const tag = tagsById.get(tagId);
        if (!tag) return null;

        // Get all collection IDs associated with this tag
        const collectionIds = collectionsByTagId.get(tagId) || [];

        // Get all views for these collections
        const views = collectionIds.flatMap(
          (collectionId) =>
            collectionViewsByCollectionId.get(collectionId) || []
        );

        return {
          tagId,
          tagName: tag.name,
          views,
        };
      })
      .filter((tag): tag is NonNullable<typeof tag> => tag !== null);

    if (tags.length > 0) {
      tagGroups.push({
        groupName: group.name,
        tags,
      });
    }
  });

  // Then, handle ungrouped tags
  const groupedTagIds = new Set(data.tagGroups.flatMap((group) => group.tags));

  const ungroupedTags = data.tagList
    .filter((tag) => !groupedTagIds.has(tag.id))
    .map((tag) => {
      const collectionIds = collectionsByTagId.get(tag.id) || [];
      const views = collectionIds.flatMap(
        (collectionId) => collectionViewsByCollectionId.get(collectionId) || []
      );

      return {
        tagId: tag.id,
        tagName: tag.name,
        views,
      };
    });

  if (ungroupedTags.length > 0) {
    tagGroups.push({
      groupName: null,
      tags: ungroupedTags,
    });
  }

  return tagGroups;
}
