import { Button } from "@/components/ui/button";
import { WhiteboardTree } from "@/components/whiteboard-tree";
import { HBCard, HBData } from "@/lib/hb-types";
import { buildWhiteboardTree, filterCardsInWhiteboards } from "@/lib/hb-utils";
import { FileEntity, getIDBHandler } from "@/lib/indexed-db";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { useLoaderData } from "react-router";
import { Route } from "./+types/account";
import { formatDate } from "@/lib/date";
import { ExportLogModal } from "@/components/export-log-modal";

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
  const [isExporting, setIsExporting] = useState(false);
  const [exportLogs, setExportLogs] = useState<string[]>([]);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

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
    setIsExporting(true);
    setExportLogs([]);
    const logs: string[] = [];
    // const selectedWhiteboards = whiteboardTree.filter((tree) =>
    //   checkedItems.has(tree.id)
    // );

    try {
      const dbHandler = await getIDBHandler();
      const cards = filterCardsInWhiteboards(
        checkedItems,
        hbData.cardList,
        hbData.cardInstances
      );
      const exports: string[] = [];
      for (const card of cards) {
        const files = await dbHandler.getFilesByTitle(
          hbData.ACCOUNT_ID,
          card.title
        );
        if (files.length === 0) {
          logs.push(`No file found for card "${card.title}"`);
          continue;
        }

        if (files.length > 1) {
          // TODO: card.content と比較して一致するものを選択する
          logs.push(
            `Multiple files found for card "${
              card.title
            }". Including all files.: ${files.map((f) => f.path).join(", ")}`
          );
        }

        const serializedCard = serializeCard(card, files);
        exports.push(serializedCard);
      }

      const exportData = exports.join("");

      const blob = new Blob([exportData], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "exported_whiteboards.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      logs.push("Export completed successfully.");
    } catch (error) {
      logs.push(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsExporting(false);
      setExportLogs(logs);
      setIsLogModalOpen(true);
    }
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
            disabled={checkedItems.size === 0 || isExporting}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Exporting..." : "Export Selected"}
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
      <ExportLogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        logs={exportLogs}
      />
    </div>
  );
}

export function HydrateFallback() {
  return <p>Loading whiteboards...</p>;
}

function serializeCard(card: HBCard, files: FileEntity[]): string {
  const contents = files.map((file) => {
    const comments = [
      `Card Title: ${card.title}`,
      `Created At: ${formatDate(card.createdTime)}`,
      `File: ${file.path}`,
    ];
    const commentsStr = `<!--\n${comments.join("\n")}\n-->`;
    const content = new TextDecoder().decode(file.content);
    return `${commentsStr}\n\n${content}`;
  });

  return contents
    .map((content) => {
      return `---\n\n${content}\n\n`;
    })
    .join("");
}
