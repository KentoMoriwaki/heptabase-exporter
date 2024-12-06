import { ExportLogModal } from "@/components/export-log-modal";
import { Button } from "@/components/ui/button";
import { WhiteboardTree } from "@/components/whiteboard-tree";
import { formatDate } from "@/lib/date";
import { HBCard, HBData } from "@/lib/hb-types";
import { buildWhiteboardTree, filterCardsInWhiteboards } from "@/lib/hb-utils";
import {
  FileEntity,
  getIDBHandler,
  getIDBMasterHandler,
} from "@/lib/indexed-db";
import { cn } from "@/lib/utils";
import { Download, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Route } from "./+types/account";
import { useNavigate } from "react-router";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const dbHandler = await getIDBHandler(params.accountId);
  const hbData = await dbHandler.getAllDataJson();
  return { hbData };
}

export default function Account({
  loaderData: { hbData },
  params: { accountId },
}: Route.ComponentProps) {
  const whiteboardTree = useMemo(() => {
    const tree = buildWhiteboardTree(
      hbData.whiteBoardList,
      hbData.whiteboardInstances
    );
    return tree;
  }, [hbData]);

  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [exportLogs, setExportLogs] = useState<string[]>([]);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  const navigate = useNavigate();

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

    try {
      const dbHandler = await getIDBHandler(accountId);
      const cards = filterCardsInWhiteboards(
        checkedItems,
        hbData.cardList,
        hbData.cardInstances
      );
      const exports: string[] = [];
      for (const card of cards) {
        const files = await dbHandler.getFilesByTitle(card.title);
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

  const onDrop = (acceptedFiles: File[]) => {
    setIsUploading(true);
    const file = acceptedFiles[0];
    const reader = new FileReader();

    reader.onabort = () => console.log("file reading was aborted");
    reader.onerror = () => console.log("file reading has failed");
    reader.onload = async () => {
      try {
        let allDataFile: File | undefined;
        for (const file of acceptedFiles) {
          if (file.name === "All-Data.json") {
            allDataFile = file;
            break;
          }
        }
        if (!allDataFile) {
          throw new Error(
            'The directory does not contain a file named "All-Data.json".'
          );
        }
        const allData: HBData = JSON.parse(await allDataFile.text());
        if (allData.ACCOUNT_ID !== accountId) {
          throw new Error(
            `The uploaded data is for account ID ${allData.ACCOUNT_ID}, not ${accountId}.`
          );
        }
        const accountDb = await getIDBHandler(accountId);
        await accountDb.deleteFiles();
        const rootDirPath = allDataFile.webkitRelativePath
          .split("/")
          .slice(0, allDataFile.webkitRelativePath.startsWith("/") ? 2 : 1)
          .join("/");

        for (const file of acceptedFiles) {
          await accountDb.saveFile(
            file,
            file.webkitRelativePath.substring(rootDirPath.length)
          );
        }
        setExportLogs([
          "File uploaded and data updated successfully. Will reload the page.",
        ]);
        setIsLogModalOpen(true);
        setTimeout(() => {
          navigate(0);
        }, 1000);
      } catch (error) {
        setExportLogs(["Error: Invalid JSON file."]);
        setIsLogModalOpen(true);
      }
      setIsUploading(false);
    };

    reader.readAsText(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    useFsAccessApi: false,
    onDrop,
  });
  const { onClick: onClickDropzone, ...rootProps } = getRootProps();

  return (
    <div
      {...rootProps}
      className={cn(
        "min-h-screen",
        isDragActive && "bg-primary/10 border-2 border-dashed border-primary"
      )}
    >
      <div className={cn("container mx-auto p-4")}>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Heptabase Whiteboard Tree</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {checkedItems.size} item(s) selected
            </span>
            <div>
              <input
                {...getInputProps({
                  // @ts-expect-error
                  webkitdirectory: "true",
                })}
              />
              <Button
                disabled={isUploading}
                className="flex items-center gap-2"
                onClick={onClickDropzone}
              >
                <Upload className="w-4 h-4" />
                {isUploading ? "Uploading..." : "Upload New Data"}
              </Button>
            </div>
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
