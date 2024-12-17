import {
  HBCard,
  HBData,
  HBFilterConfig,
  HBJournal,
  HBProperty,
} from "./hb-types";

export function filterCardsAndJournals(
  {
    cardList,
    journalList,
    objectPropertyRelations,
    properties,
  }: Pick<
    HBData,
    "cardList" | "journalList" | "objectPropertyRelations" | "properties"
  >,
  filterConfig: HBFilterConfig
): Array<HBCard | HBJournal> {
  // カードIDごとにプロパティ値をマッピング
  const cardProperties = new Map<string, Map<string, any>>();

  objectPropertyRelations.forEach((relation) => {
    if (!cardProperties.has(relation.objectId)) {
      cardProperties.set(relation.objectId, new Map());
    }
    const propertyMap = cardProperties.get(relation.objectId)!;
    propertyMap.set(relation.propertyId, relation.value.value);
  });

  // プロパティIDからプロパティ型へのマッピング
  const propertyTypes = new Map(properties.map((prop) => [prop.id, prop.type]));

  return [...cardList, ...journalList].filter((card) => {
    const results = filterConfig.rules.map((rule) => {
      const cardProps = cardProperties.get(
        "title" in card ? card.id : card.date
      );
      const value =
        rule.field === "title"
          ? "title" in card
            ? card.title
            : card.date
          : cardProps?.get(rule.field);
      const propertyType =
        rule.field === "title" ? "text" : propertyTypes.get(rule.field);

      if (value == null || !propertyType) return false;

      return evaluateValue(
        value,
        rule.operator,
        rule.value,
        propertyType as PropertyType
      );
    });

    return filterConfig.combinator === "and"
      ? results.every(Boolean)
      : results.some(Boolean);
  });
}

export function filterCardsAndJournalsByViews(
  data: Pick<
    HBData,
    | "cardList"
    | "journalList"
    | "collectionViews"
    | "objectPropertyRelations"
    | "properties"
  >,
  viewIds: string[]
): Array<HBCard | HBJournal> {
  const { collectionViews } = data;
  // ビューIDからビューを取得するためのマップを作成
  const viewsMap = new Map(collectionViews.map((view) => [view.id, view]));

  // 結果を格納するオブジェクト
  const result: Array<HBCard | HBJournal> = [];

  // 各ビューIDに対してフィルタリングを実行
  viewIds.forEach((viewId) => {
    const view = viewsMap.get(viewId);
    if (!view) {
      return;
    }

    if (view.filterConfig) {
      result.push(...filterCardsAndJournals(data, view.filterConfig));
    }
  });

  return result;
}

export type PropertyType =
  | "text"
  | "number"
  | "select"
  | "multiSelect"
  | "date"
  | "checkbox"
  | "url"
  | "phone"
  | "email"
  | "relation";

function evaluateValue(
  value: any,
  operator: string,
  filterValue: any,
  propertyType: PropertyType
): boolean {
  // 空チェック系の演算子
  if (operator === "isEmpty") {
    return (
      value == null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    );
  }
  if (operator === "isNotEmpty") {
    return (
      value != null &&
      value !== "" &&
      (!Array.isArray(value) || value.length > 0)
    );
  }

  // プロパティタイプごとの評価
  switch (propertyType) {
    case "text":
    case "url":
    case "phone":
    case "email":
    case "date":
      return evaluateTextValue(value, operator, filterValue);

    case "number":
      return evaluateNumberValue(value, operator, filterValue);

    case "select":
      return evaluateSelectValue(value, operator, filterValue);

    case "multiSelect":
      return evaluateMultiSelectValue(value, operator, filterValue);

    case "checkbox":
      return evaluateCheckboxValue(value, operator, filterValue);

    case "relation":
      return evaluateRelationValue(value, operator, filterValue);

    default:
      return false;
  }
}

function evaluateTextValue(
  value: string | null | undefined,
  operator: string,
  filterValue: string | null
): boolean {
  // filterValue を使用する operator の場合、filterValue が空なら true を返す
  if (filterValue === null || filterValue === undefined) {
    return [
      "=",
      "!=",
      "contains",
      "doesNotContain",
      "startsWith",
      "endsWith",
    ].includes(operator);
  }

  switch (operator) {
    case "=":
      return value === filterValue;
    case "!=":
      return value !== filterValue;
    case "contains":
      return value?.includes(filterValue) ?? false;
    case "doesNotContain":
      return value?.includes(filterValue) === false;
    case "startsWith":
      return value?.startsWith(filterValue) ?? false;
    case "endsWith":
      return value?.endsWith(filterValue) ?? false;
    default:
      return false;
  }
}

function evaluateNumberValue(
  value: number | null | undefined,
  operator: string,
  filterValue: number | null
): boolean {
  // filterValue を使用する operator の場合、filterValue が空なら true を返す
  if (filterValue === null || filterValue === undefined) {
    return ["=", "!=", ">", "<", ">=", "<="].includes(operator);
  }

  if (value === null || value === undefined) return false;

  switch (operator) {
    case "=":
      return value === filterValue;
    case "!=":
      return value !== filterValue;
    case ">":
      return value > filterValue;
    case "<":
      return value < filterValue;
    case ">=":
      return value >= filterValue;
    case "<=":
      return value <= filterValue;
    default:
      return false;
  }
}

function evaluateSelectValue(
  value: string | null | undefined,
  operator: string,
  filterValue: string | null
): boolean {
  // filterValue を使用する operator の場合、filterValue が空なら true を返す
  if (filterValue === null || filterValue === undefined) {
    return ["=", "!="].includes(operator);
  }

  switch (operator) {
    case "=":
      return value === filterValue;
    case "!=":
      return value !== filterValue;
    default:
      return false;
  }
}

function evaluateMultiSelectValue(
  value: string[] | null | undefined,
  operator: string,
  filterValue: string | null
): boolean {
  // filterValue を使用する operator の場合、filterValue が空なら true を返す
  if (filterValue === null || filterValue === undefined) {
    return ["contains", "doesNotContain"].includes(operator);
  }

  if (value === null || value === undefined) return false;

  switch (operator) {
    case "contains":
      return value.includes(filterValue);
    case "doesNotContain":
      return !value.includes(filterValue);
    default:
      return false;
  }
}

function evaluateCheckboxValue(
  value: boolean | null | undefined,
  operator: string,
  filterValue: boolean | null
): boolean {
  // filterValue を使用する operator の場合、filterValue が空なら true を返す
  if (filterValue === null || filterValue === undefined) {
    return ["=", "!="].includes(operator);
  }

  if (value === null || value === undefined) return false;

  switch (operator) {
    case "=":
      return value === filterValue;
    case "!=":
      return value !== filterValue;
    default:
      return false;
  }
}

function evaluateRelationValue(
  value: string[] | null | undefined,
  operator: string,
  filterValue: string[] | null
): boolean {
  // filterValue を使用する operator の場合、filterValue が空なら true を返す
  if (filterValue === null || filterValue === undefined) {
    return ["contains", "doesNotContain"].includes(operator);
  }

  if (value === null || value === undefined) return false;

  switch (operator) {
    case "contains":
      return filterValue.some((v) => value.includes(v));
    case "doesNotContain":
      return !filterValue.some((v) => value.includes(v));
    default:
      return false;
  }
}
