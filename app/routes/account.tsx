import { WhiteboardTree } from "@/components/whiteboard-tree";
import { HBData } from "@/lib/hb-types";
import { buildWhiteboardTree } from "@/lib/hb-utils";
import { getIDBHandler } from "@/lib/indexed-db";
import React, { useMemo, useState } from "react";
import { useLoaderData } from "react-router";
import { Route } from "./+types/account";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const dbHandler = await getIDBHandler();
  const hbData = await dbHandler.getAllDataJson(params.accountId);
  return { hbData };
}

const Account: React.FC = () => {
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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Heptabase Whiteboard Tree</h1>
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
};

export default Account;
