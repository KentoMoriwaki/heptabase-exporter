/**
 * These data types are generated by ChatGPT and might not be accurate.
 */

export interface HBData {
  VERSION: string;
  DB_SCHEMA_VERSION: number;
  SCHEMA_VERSIONS: Record<string, number>;
  ACCOUNT_ID: string;
  mapState: HBMapState[];
  whiteBoardList: HBWhiteboard[];
  cardInstances: HBCardInstance[];
  cardList: HBCard[];
  cardTagList: HBCardTag[];
  collectionPropertyRelations: HBCollectionPropertyRelation[];
  collectionViews: HBCollectionView[];
  collections: HBCollection[];
  connections: HBConnection[];
  customFilterList: any[];
  files: HBFile[];
  highlightElementInstances: HBHighlightElementInstance[];
  highlightElements: HBHighlightElement[];
  insightInstances: any[];
  insights: HBInsight[];
  journalInstances: any[];
  journalList: HBJournal[];
  journalStatus: HBJournalStatus;
  mediaCardInstances: any[];
  mediaCards: any[];
  mediaElements: HBMediaElement[];
  mindMapCardNodes: HBMindMapCardNode[];
  mindMapInstances: HBMindMapInstance[];
  mindMapNodes: HBMindMapNode[];
  mindMapTextNodes: HBMindMapTextNode[];
  mindMaps: HBMindMap[];
  objectPropertyRelations: HBObjectPropertyRelation[];
  pdfCardInstances: any[];
  pdfCards: any[];
  preferences: HBPreferences;
  properties: HBProperty[];
  sectionObjectRelations: HBSectionObjectRelation[];
  sections: HBSection[];
  sources: HBSource[];
  syncedJournalStatus: HBSyncedJournalStatus;
  tabGroups: HBTabGroup[];
  tabs: HBTab[];
  tagGroups: HBTagGroup[];
  tagList: HBTag[];
  templates: HBTemplate[];
  textElements: HBTextElement[];
  tutorialStatus: HBTutorialStatus;
  webElements: any[];
  whiteboardInstances: HBWhiteboardInstance[];
  workspaces: HBWorkspace[];
}

export interface HBMapState {
  id: string;
  createdTime: string;
  lastEditedTime: string;
  createdBy: string;
  spaceId: string;
}

export interface HBWhiteboard {
  id: string;
  name: string;
  isTrashed: boolean;
  createdTime: string;
  lastEditedTime: string;
  createdBy: string;
  spaceId: string;
}

export interface HBCardInstance {
  width: number;
  height: number;
  id: string;
  whiteboardId: string;
  cardId: string;
  color: string;
  x: number;
  y: number;
  isFolded: boolean;
  foldedHeight: number;
  isAutoHeight: boolean;
  createdTime: string;
  lastEditedTime: string;
  createdBy: string;
  spaceId: string;
  sourceSpaceId: string;
}

export interface HBCard {
  id: string;
  title: string;
  content: string;
  createdTime: string;
  lastEditedTime: string;
  createdBy: string;
  spaceId: string;
}

export interface HBCardTag {
  id: string;
  name: string;
  color: string;
}

export interface HBCollectionPropertyRelation {
  id: string;
  collectionId: string;
  propertyId: string;
}

export interface HBCollectionView {
  id: string;
  collectionId: string;
  viewType: string;
  settings: Record<string, any>;
}

export interface HBCollection {
  id: string;
  name: string;
  createdTime: string;
  lastEditedTime: string;
  createdBy: string;
  spaceId: string;
}

export interface HBConnection {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
}

export interface HBFile {
  id: string;
  name: string;
  type: string;
  createdTime: string;
  lastEditedTime: string;
  createdBy: string;
  spaceId: string;
}

export interface HBHighlightElementInstance {
  id: string;
  whiteboardId: string;
  highlightElementId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isAutoHeight: boolean;
  createdTime: string;
  lastEditedTime: string;
  createdBy: string;
  spaceId: string;
}

export interface HBHighlightElement {
  id: string;
  sourceId: string;
  note: string;
  propertiesConfig: any[];
  insights: any[];
  wasInsightGenerated: boolean;
  isTrashed: boolean;
  createdTime: string;
  lastUsedTime: string;
  lastEditedTime: string;
  createdBy: string;
  spaceId: string;
}

export interface HBInsight {
  id: string;
  content: string;
  sourceId: string;
  sourceType: string;
  createdTime: string;
  lastEditedTime: string;
  createdBy: string;
  spaceId: string;
}

export interface HBJournal {
  id: string;
  name: string;
  createdTime: string;
  lastEditedTime: string;
  createdBy: string;
  spaceId: string;
}

export interface HBJournalStatus {
  id: string;
  status: string;
}

export interface HBMindMapCardNode {
  id: string;
  cardId: string;
  isFolded: boolean;
  foldedHeight: number;
  isAutoHeight: boolean;
  lastEditedTime: string;
  createdBy: string;
  spaceId: string;
}

export interface HBMindMapInstance {
  id: string;
  whiteboardId: string;
  mindMapId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdTime: string;
  lastEditedTime: string;
  createdBy: string;
  spaceId: string;
}

export interface HBMindMapNode {
  id: string;
  mindMapId: string;
  parentId: string;
  childNodeIds: string[];
  type: string;
  edgeColor: string;
  side: string;
  isCollapsed: boolean;
  width: number;
  height: number;
  color: string | null;
  createdTime: string;
  lastEditedTime: string;
  createdBy: string;
  spaceId: string;
}

export interface HBPreferences {
  version: number;
  theme: "light" | "dark";
  navigationMode: "trackpad" | "mouse";
  mapZoom: number;
  mapOffset: { x: number; y: number };
  shouldOpenSidebar: boolean;
  sidebarWidth: number;
  whiteboardPanelWidth: number;
  tabList: HBPreferencesTabList;
  cardLibraryMode: "grid" | "list";
  lastVisitedRoute: {
    workspaceId: string;
    page: string; // e.g., "card", "whiteboard"
    id: string;
    tabId: string;
  };
  shouldShowCardInfo: boolean;
  highlightApp: {
    rightPanelWidth: number;
    sourceScrollTopMap: Record<string, number>;
  };
  searchIndexStatus: "built" | "building" | "not_built";
  connectionSettings: {
    lineStyle: string; // e.g., "regular"
    headStyle: string; // e.g., "default"
    lineThickness: number;
    type: "curve" | "straight" | "angled";
    color: string; // e.g., "white", "black"
  };
  lastUsedHighlightColorInPdfReader: string; // e.g., "yellow", "blue"
  currentTabGroupId: string;
  manualBackupLocation: string;
  todoGroupsStatus: Record<string, { isOpen: boolean }>;
  whiteboardQuickAccessStatus: Record<string, { isFolded: boolean }>;
  shouldShowLargeTextAtSmallZoom: boolean;
  insightGenerationOptions: {
    promptId: string; // e.g., "article"
    language: string; // e.g., "日本語", "English"
  };
}

export interface HBPreferencesTabList {
  cardTabRightSidebarWidth: number;
  byId: Record<string, HBPreferencesTab>;
  all: string[]; // Array of all tab IDs
}

export interface HBPreferencesTab {
  tabId: string;
  zoom: number;
  offset: { x: number; y: number };
  tool: "select" | "draw" | "erase" | "move";
  selectedObjects: Array<{
    id: string;
    type: "whiteboardInstance" | "cardInstance";
  }>;
  shouldShowAllConnections: boolean;
  sourcePanelScrollTopMap: Record<string, number>;
  references: {
    scrollTop: number;
    byId: Record<
      string,
      {
        shouldUnfold: boolean;
        shouldShowCardInfo: boolean;
      }
    >;
  };
  currentRightSidebarPanelId: string; // e.g., "cardReferences", "insightPanel"
  panel?: string; // e.g., "split", optional
  previouslyFocusedWhiteboardObject?: {
    id: string;
    type: string; // e.g., "cardInstance"
  };
  insight?: {
    sourceCardId: string;
    sourceCardType: string; // e.g., "note", "task"
    scrollTopMap: Record<string, number>;
  };
}

export interface HBProperty {
  id: string;
  name: string;
  type: string;
  settings: Record<string, any>;
}

export interface HBSectionObjectRelation {
  id: string;
  sectionId: string;
  objectId: string;
  objectType: string;
}

export interface HBSection {
  id: string;
  name: string;
  createdTime: string;
  lastEditedTime: string;
  createdBy: string;
  spaceId: string;
}

export interface HBSource {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  metadata: Record<string, any>;
  createdTime: string;
  lastEditedTime: string;
  createdBy: string;
  spaceId: string;
}

export interface HBSyncedJournalStatus {
  id: string;
  status: string;
}

export interface HBTabGroup {
  id: string;
  name: string;
  tabs: string[];
}

export interface HBTab {
  id: string;
  name: string;
  groupId: string;
}

export interface HBTagGroup {
  id: string;
  name: string;
  tags: string[];
}

export interface HBTag {
  id: string;
  name: string;
  color: string;
}

export interface HBTemplate {
  id: string;
  title: string;
  content: string;
  createdTime: string;
  lastUsedTime: string;
  lastEditedTime: string;
  createdBy: string;
}

export interface HBTextElement {
  id: string;
  whiteboardId: string;
  content: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdTime: string;
  lastEditedTime: string;
  createdBy: string;
  spaceId: string;
}

export interface HBTutorialStatus {
  id: string;
  status: string;
}

export interface HBWorkspace {
  id: string;
  name: string;
  createdTime: string;
  lastEditedTime: string;
  createdBy: string;
  spaceId: string;
}

export interface HBMediaElement {
  id: string;
  whiteboardId: string;
  type: string; // "video" | "image" | other
  fileId: string | null;
  link: string | null;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdTime: string;
  lastEditedTime: string;
  createdBy: string;
  spaceId: string;
}

export interface HBMindMapTextNode {
  id: string;
  content: any;
  lastEditedTime: string;
  createdBy: string;
  spaceId: string;
}

export interface HBMindMap {
  id: string;
  createdTime: string;
  lastEditedTime: string;
  createdBy: string;
  spaceId: string;
}

export interface HBObjectPropertyRelation {
  id: string;
  objectId: string;
  propertyId: string;
}

export interface HBWhiteboardInstance {
  id: string; // インスタンスの一意なID
  whiteboardId: string; // このインスタンスに対応するホワイトボードのID
  containerId: string; // 親要素のID (例: 親ホワイトボードまたはマップのID)
  containerType: "map" | "whiteboard"; // 親要素のタイプ
  isChild: boolean; // 子要素であるかどうか
  color: string; // インスタンスの色設定
  x: number; // インスタンスのX座標
  y: number; // インスタンスのY座標
  width: number; // インスタンスの幅
  height: number; // インスタンスの高さ
  createdTime: string; // 作成日時 (ISOフォーマット)
  lastEditedTime: string; // 最終編集日時 (ISOフォーマット)
  createdBy: string; // 作成者のID
  spaceId: string; // 所属するスペースのID
}