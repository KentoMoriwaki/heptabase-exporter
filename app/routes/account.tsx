import { Button } from "@/components/ui/button";
import { WhiteboardTree } from "@/components/whiteboard-tree";
import { HBData } from "@/lib/hb-types";
import { buildWhiteboardTree, filterCardsInWhiteboards } from "@/lib/hb-utils";
import { getIDBHandler } from "@/lib/indexed-db";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { useLoaderData } from "react-router";
import { Route } from "./+types/account";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const dbHandler = await getIDBHandler();
  const hbData = await dbHandler.getAllDataJson(params.accountId);
  return { hbData };
}

export default function Account() {
  const { hbData } = useLoaderData<{
    hbData: HBData;
  }>();

  const whiteboardTree = useMemo(() => {
    const tree = buildWhiteboardTree(
      hbData.whiteBoardList,
      hbData.whiteboardInstances
    );
    return tree;
  }, [hbData]);

  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const handleCheck = (id: string, isChecked: boolean) => {
    setCheckedItems((prevCheckedItems) => {
      const newCheckedItems = new Set(prevCheckedItems);
      if (isChecked) {
        newCheckedItems.add(id);
      } else {
        newCheckedItems.delete(id);
      }
      return newCheckedItems;
    });
  };

  const handleExport = async () => {
    const selectedWhiteboards = whiteboardTree.filter((tree) =>
      checkedItems.has(tree.id)
    );

    const dbHandler = await getIDBHandler();
    const cards = filterCardsInWhiteboards(
      checkedItems,
      hbData.cardList,
      hbData.cardInstances
    );
    for (const card of cards) {
      const files = await dbHandler.getFilesByTitle(
        hbData.ACCOUNT_ID,
        card.title
      );
      if (files.length === 0) {
        console.error(`No file found for card ${card.title}`);
        continue;
      }
      if (files.length === 1) {
        const file = files[0];
        // console.log(file);
        continue;
      }
      console.warn(
        `Multiple files found for card ${card.title}`,
        files.map((f) => f.path)
      );
    }

    console.log(cards);
    // const exportData = JSON.stringify(selectedWhiteboards, null, 2);

    // const blob = new Blob([exportData], { type: "application/json" });
    // const url = URL.createObjectURL(blob);
    // const a = document.createElement("a");
    // a.href = url;
    // a.download = "exported_whiteboards.json";
    // document.body.appendChild(a);
    // a.click();
    // document.body.removeChild(a);
    // URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Heptabase Whiteboard Tree</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {checkedItems.size} item(s) selected
          </span>
          <Button
            onClick={handleExport}
            disabled={checkedItems.size === 0}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Selected
          </Button>
        </div>
      </div>
      {whiteboardTree.map((tree) => (
        <WhiteboardTree
          key={tree.id}
          tree={tree}
          onCheck={handleCheck}
          checkedItems={checkedItems}
        />
      ))}
    </div>
  );
}

export function HydrateFallback() {
  return <p>Loading whiteboards...</p>;
}
