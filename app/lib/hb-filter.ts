import { HBData, HBFilterConfig, HBProperty } from "./hb-types";

export function filterCards(
  {
    cardList,
    objectPropertyRelations,
    properties,
  }: Pick<HBData, "cardList" | "objectPropertyRelations" | "properties">,
  filterConfig: HBFilterConfig
): typeof cardList {
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

  return cardList.filter((card) => {
    const results = filterConfig.rules.map((rule) => {
      const cardProps = cardProperties.get(card.id);
      const value =
        rule.field === "title" ? card.title : cardProps?.get(rule.field);
      const propertyType =
        rule.field === "title" ? "text" : propertyTypes.get(rule.field);

      if (!propertyType) return false;

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

export function filterCardsByViews(
  data: Pick<
    HBData,
    "cardList" | "collectionViews" | "objectPropertyRelations" | "properties"
  >,
  viewIds: string[]
): HBData["cardList"] {
  const { cardList, collectionViews } = data;
  // ビューIDからビューを取得するためのマップを作成
  const viewsMap = new Map(collectionViews.map((view) => [view.id, view]));

  // 結果を格納するオブジェクト
  const result: HBData["cardList"] = [];

  // 各ビューIDに対してフィルタリングを実行
  viewIds.forEach((viewId) => {
    const view = viewsMap.get(viewId);
    if (!view) {
      return;
    }

    if (view.filterConfig) {
      result.push(...filterCards(data, view.filterConfig));
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
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    );
  }
  if (operator === "isNotEmpty") {
    return (
      value !== null &&
      value !== undefined &&
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
  switch (operator) {
    case "=":
      // value と filterValue が両方 null/undefined の場合は true
      if (
        (value === null || value === undefined) &&
        (filterValue === null || filterValue === undefined)
      ) {
        return true;
      }
      // どちらかだけが null/undefined の場合は false
      if (
        value === null ||
        value === undefined ||
        filterValue === null ||
        filterValue === undefined
      ) {
        return false;
      }
      return value === filterValue;

    case "!=":
      // value と filterValue が両方 null/undefined の場合は false
      if (
        (value === null || value === undefined) &&
        (filterValue === null || filterValue === undefined)
      ) {
        return false;
      }
      // どちらかだけが null/undefined の場合は true
      if (
        value === null ||
        value === undefined ||
        filterValue === null ||
        filterValue === undefined
      ) {
        return true;
      }
      return value !== filterValue;

    case "contains":
      if (
        value === null ||
        value === undefined ||
        filterValue === null ||
        filterValue === undefined
      ) {
        return false;
      }
      return value.includes(filterValue);

    case "doesNotContain":
      if (value === null || value === undefined) {
        return true;
      }
      if (filterValue === null || filterValue === undefined) {
        return false;
      }
      return !value.includes(filterValue);

    case "startsWith":
      if (
        value === null ||
        value === undefined ||
        filterValue === null ||
        filterValue === undefined
      ) {
        return false;
      }
      return value.startsWith(filterValue);

    case "endsWith":
      if (
        value === null ||
        value === undefined ||
        filterValue === null ||
        filterValue === undefined
      ) {
        return false;
      }
      return value.endsWith(filterValue);

    default:
      return false;
  }
}

function evaluateNumberValue(
  value: number | null | undefined,
  operator: string,
  filterValue: number | null
): boolean {
  switch (operator) {
    case "=":
      if (
        (value === null || value === undefined) &&
        (filterValue === null || filterValue === undefined)
      ) {
        return true;
      }
      if (
        value === null ||
        value === undefined ||
        filterValue === null ||
        filterValue === undefined
      ) {
        return false;
      }
      return value === filterValue;

    case "!=":
      if (
        (value === null || value === undefined) &&
        (filterValue === null || filterValue === undefined)
      ) {
        return false;
      }
      if (
        value === null ||
        value === undefined ||
        filterValue === null ||
        filterValue === undefined
      ) {
        return true;
      }
      return value !== filterValue;

    case ">":
    case "<":
    case ">=":
    case "<=":
      if (
        value === null ||
        value === undefined ||
        filterValue === null ||
        filterValue === undefined
      ) {
        return false;
      }
      switch (operator) {
        case ">":
          return value > filterValue;
        case "<":
          return value < filterValue;
        case ">=":
          return value >= filterValue;
        case "<=":
          return value <= filterValue;
      }
  }
  return false;
}

function evaluateSelectValue(
  value: string | null | undefined,
  operator: string,
  filterValue: string | null
): boolean {
  switch (operator) {
    case "=":
      if (
        (value === null || value === undefined) &&
        (filterValue === null || filterValue === undefined)
      ) {
        return true;
      }
      if (
        value === null ||
        value === undefined ||
        filterValue === null ||
        filterValue === undefined
      ) {
        return false;
      }
      return value === filterValue;

    case "!=":
      if (
        (value === null || value === undefined) &&
        (filterValue === null || filterValue === undefined)
      ) {
        return false;
      }
      if (
        value === null ||
        value === undefined ||
        filterValue === null ||
        filterValue === undefined
      ) {
        return true;
      }
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
  switch (operator) {
    case "contains":
      if (
        value === null ||
        value === undefined ||
        filterValue === null ||
        filterValue === undefined
      ) {
        return false;
      }
      return value.includes(filterValue);

    case "doesNotContain":
      if (value === null || value === undefined) {
        return true;
      }
      if (filterValue === null || filterValue === undefined) {
        return false;
      }
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
  switch (operator) {
    case "=":
      if (
        (value === null || value === undefined) &&
        (filterValue === null || filterValue === undefined)
      ) {
        return true;
      }
      if (
        value === null ||
        value === undefined ||
        filterValue === null ||
        filterValue === undefined
      ) {
        return false;
      }
      return value === filterValue;

    case "!=":
      if (
        (value === null || value === undefined) &&
        (filterValue === null || filterValue === undefined)
      ) {
        return false;
      }
      if (
        value === null ||
        value === undefined ||
        filterValue === null ||
        filterValue === undefined
      ) {
        return true;
      }
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
  switch (operator) {
    case "contains":
      if (
        value === null ||
        value === undefined ||
        filterValue === null ||
        filterValue === undefined
      ) {
        return false;
      }
      return filterValue.some((v) => value.includes(v));

    case "doesNotContain":
      if (value === null || value === undefined) {
        return true;
      }
      if (filterValue === null || filterValue === undefined) {
        return false;
      }
      return !filterValue.some((v) => value.includes(v));

    default:
      return false;
  }
}
