import { HBData } from "./hb-types";

export type JournalFilter =
  | {
      type: "this-week";
    }
  | {
      type: "this-month";
    }
  | {
      type: "last-month";
    }
  | {
      type: "this-year";
    }
  | {
      type: "custom";
      startDate: Date | null;
      endDate: Date | null;
    }
  | {
      type: "last-n-days";
      days: number;
    };

export function journalsFilter(
  { journalList }: Pick<HBData, "journalList">,
  filter: JournalFilter,
) {
  const now = new Date();
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  switch (filter.type) {
    case "this-week": {
      const startOfWeek = now.getDate() - now.getDay();
      startDate = new Date(now.setDate(startOfWeek));
      endDate = new Date(now.setDate(startOfWeek + 6));
      break;
    }
    case "this-month": {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    }
    case "last-month": {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    }
    case "this-year": {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      break;
    }
    case "custom": {
      startDate = filter.startDate;
      endDate = filter.endDate;
      break;
    }
    case "last-n-days": {
      startDate = new Date(now.setDate(now.getDate() - filter.days));
      endDate = new Date();
      break;
    }
    default: {
      const _type: never = filter;
      throw new Error(`Invalid filter type: ${_type}`);
    }
  }

  return journalList.filter((journal) => {
    const journalDate = new Date(journal.date);
    if (startDate && journalDate < startDate) return false;
    if (endDate && journalDate > endDate) return false;
    return true;
  });
}
