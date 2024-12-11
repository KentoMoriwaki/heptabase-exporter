import { ExportLogModal } from "@/components/export-log-modal";
import { JournalExport } from "@/components/journal-export";
import { Tabs, TabsContent, TabsTrigger } from "@/components/tabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WhiteboardTree } from "@/components/whiteboard-tree";
import { formatDate } from "@/lib/date";
import { HBCard, HBData } from "@/lib/hb-types";
import {
  buildWhiteboardTree,
  filterCardsInWhiteboards,
  HBWhiteboardTree,
  SectionNode,
} from "@/lib/hb-utils";
import {
  FileEntity,
  getIDBHandler,
  getIDBMasterHandler,
  JournalExportState,
  WhiteboardExportState,
} from "@/lib/indexed-db";
import { cn } from "@/lib/utils";
import { Copy, Download, FileDown, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router";
import { Route } from "./+types/account";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Bundle My Heptabase" },
    {
      name: "description",
      content: "Safely organize exported data for AI tools.",
    },
  ];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const dbHandler = await getIDBHandler(params.accountId);
  const hbData = await dbHandler.getAllDataJson();
  const lastExportState = await dbHandler.getLastExportState();
  return { hbData, lastExportState };
}

export default function Account({
  loaderData: { hbData, lastExportState },
  params: { accountId },
}: Route.ComponentProps) {
  const whiteboardTree = useMemo(() => {
    const tree = buildWhiteboardTree(hbData);
    return tree;
  }, [hbData]);

  const [whiteboardExports, setWhiteboardExports] = useState<
    WhiteboardExportState[]
  >(lastExportState.whiteboards ?? []);

  const [journalExport, setJournalExport] = useState<{
    enabled?: boolean;
    config: JournalExportState;
  }>({
    enabled: lastExportState.journals?.enabled,
    config: lastExportState.journals?.config ?? { type: "this-week" },
  });

  const [isExporting, setIsExporting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [exportLogs, setExportLogs] = useState<string[]>([]);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("whiteboards");

  const onWhiteboardExportsChanged = (
    whiteboardId: string,
    state: WhiteboardExportState
  ) => {
    setWhiteboardExports((exports) => {
      let found = false;
      const newExports = exports.map((exportState) => {
        if (exportState.whiteboardId === whiteboardId) {
          found = true;
          return { ...exportState, ...state };
        }
        return exportState;
      });
      if (found) {
        return newExports;
      }
      return [...newExports, { ...state }];
    });
  };

  const handleExport = async (action: "file" | "clipboard") => {
    setIsExporting(true);
    setExportLogs([]);
    const logs: string[] = [];

    try {
      const dbHandler = await getIDBHandler(accountId);
      const cards = filterCardsInWhiteboards(
        new Set(
          whiteboardExports.filter((e) => e.enabled).map((e) => e.whiteboardId)
        ),
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

      if (action === "clipboard") {
        navigator.clipboard.writeText(exportData);
        logs.push("Export completed successfully. Copied to clipboard.");
      } else {
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
      }
      await dbHandler.saveLastExportState({
        whiteboards: whiteboardExports,
        journals: journalExport,
      });
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

  const onDrop = async (acceptedFiles: Array<File & { path?: string }>) => {
    setIsUploading(true);

    try {
      let allDataFile: (typeof acceptedFiles)[0] | undefined;
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

      const mainData = await getIDBMasterHandler();
      const allDataPath = allDataFile.path || allDataFile.webkitRelativePath;
      const rootDirPath = allDataPath.slice(
        0,
        allDataPath.length - "All-Data.json".length
      );
      const folderName = rootDirPath.replace(/^[/.]+|[/.]+$/g, "");
      await mainData.updateAccount({
        id: accountId,
        folderName,
        lastUploaded: Date.now(),
      });

      const accountDb = await getIDBHandler(accountId);
      await accountDb.deleteFiles();

      for (const file of acceptedFiles) {
        const path = file.path || file.webkitRelativePath;
        await accountDb.saveFile(file, path.substring(rootDirPath.length));
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

  useEffect(() => {
    let mounted = true;
    const update = async () => {
      const mainDb = await getIDBMasterHandler();
      if (!mounted) return;
      await mainDb.updateAccount({
        id: accountId,
        lastOpened: Date.now(),
      });
    };
    update().catch((e) => {
      console.error(e);
    });
    return () => {
      mounted = false;
    };
  }, [accountId]);

  const whiteboardExportsCount = whiteboardExports.filter(
    (e) => e.enabled
  ).length;
  const journalExportCount = journalExport?.enabled ? 1 : 0;
  const isExportDisabled = whiteboardExportsCount + journalExportCount === 0;

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
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-center">
            Bundle My Heptabase
          </h1>
        </div>
      </header>
      <div className={cn("container mx-auto p-4")}>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Heptabase Whiteboard Tree</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {whiteboardExportsCount + journalExportCount} item(s) selected
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  disabled={isExportDisabled || isExporting}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {isExporting ? "Exporting..." : "Export Selected"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport("file")}>
                  <FileDown className="w-4 h-4 mr-2" />
                  Export as File
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("clipboard")}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy to Clipboard
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Note: The uploaded data is stored locally in your browser and is not
          sent to the server.
        </p>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsTrigger
            value="whiteboards"
            selectedCount={whiteboardExportsCount}
          >
            Whiteboards
          </TabsTrigger>
          <TabsTrigger
            value="journals"
            selectedCount={journalExport?.enabled ? 1 : 0}
          >
            Journals
          </TabsTrigger>
          <TabsContent value="whiteboards">
            <div className="flex flex-col gap-2">
              {whiteboardTree.map((tree) => (
                <WhiteboardTree
                  key={tree.id}
                  tree={tree}
                  exportStates={whiteboardExports}
                  onExportStateChange={onWhiteboardExportsChanged}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="journals">
            <JournalExport
              isExportEnabled={journalExport?.enabled ?? false}
              onExportEnabledChange={(enabled) => {
                setJournalExport((prev) => ({ ...prev, enabled }));
              }}
              value={journalExport.config}
              onValueChange={(config) => {
                setJournalExport((prev) => ({ ...prev, config }));
              }}
            />
          </TabsContent>
        </Tabs>

        <ExportLogModal
          isOpen={isLogModalOpen}
          onClose={() => setIsLogModalOpen(false)}
          logs={exportLogs}
        />
      </div>
    </div>
  );
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
