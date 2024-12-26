import { ExportLogModal } from "@/components/export-log-modal";
import { JournalExport } from "@/components/journal-export";
import { Tabs, TabsContent, TabsTrigger } from "@/components/tabs";
import { TagsExport } from "@/components/tags-export";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WhiteboardTree } from "@/components/whiteboard-tree";
import { HBExporter } from "@/lib/hb-exporter";
import { HBData } from "@/lib/hb-types";
import { buildWhiteboardTree } from "@/lib/hb-utils";
import {
  ExportStateEntity,
  getIDBHandler,
  getIDBMasterHandler,
  JournalExportState,
  WhiteboardExportState,
} from "@/lib/indexed-db";
import { cn } from "@/lib/utils";
import {
  Copy,
  Download,
  FileDown,
  FolderArchive,
  Settings,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Link, useNavigate } from "react-router";
import { Route } from "./+types/account";
import { ExportHistory } from "@/components/export-history";
import {
  ExportSettings,
  ExportSettingsModal,
} from "@/components/export-setings-modal";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Bundle My Heptabase" },
    {
      name: "description",
      content: "Safely organize exported data for AI tools.",
    },
  ];
}

export async function clientLoader({
  params,
  request,
}: Route.ClientLoaderArgs) {
  const dbHandler = await getIDBHandler(params.accountId);
  const hbData = await dbHandler.getAllDataJson();

  // Get history ID from URL
  const url = new URL(request.url);
  const historyId = url.searchParams.get("h");

  let lastState: ExportStateEntity;
  if (historyId) {
    // If history ID is specified, get that history
    const selectedHistory = await dbHandler.getExportHistoryById(historyId);
    lastState = selectedHistory?.state ?? { id: "default" };
  } else {
    // If not specified, get the latest history
    const latestHistory = await dbHandler.getLatestExportHistory();
    lastState = latestHistory?.state ?? { id: "default" };
  }

  return { hbData, lastState };
}

export default function AccountPage(props: Route.ComponentProps) {
  return (
    <AccountInner
      {...props}
      key={`${props.params.accountId}-${props.loaderData.lastState.id}`}
    />
  );
}

function AccountInner({
  loaderData: { hbData, lastState },
  params: { accountId },
}: Route.ComponentProps) {
  const whiteboardTree = useMemo(() => {
    const tree = buildWhiteboardTree(hbData);
    return tree;
  }, [hbData]);

  const [whiteboardExports, setWhiteboardExports] = useState<
    WhiteboardExportState[]
  >(lastState.whiteboards ?? []);

  const [journalExport, setJournalExport] = useState<{
    enabled?: boolean;
    config: JournalExportState;
  }>({
    enabled: lastState.journals?.enabled,
    config: lastState.journals?.config ?? { type: "this-week" },
  });

  const [tagsExport, setTagsExport] = useState<{
    selectedViews: Set<string>;
  }>(lastState.tags ?? { selectedViews: new Set() });

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [exportSettings, setExportSettings] = useState<ExportSettings>(
    lastState.exportSettings ?? {
      includeLinkedCards: true,
      includeLinkedFiles: false,
      includeImages: false,
      includeAudioVideo: false,
      includeOtherFiles: false,
    }
  );

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
      const exporter = new HBExporter(dbHandler, hbData, exportSettings);

      await exporter.exportWhiteboards(whiteboardExports);
      if (journalExport.enabled) {
        await exporter.exportJournals(journalExport.config);
      }
      await exporter.exportTags(tagsExport);

      // Save export history
      const historyId = crypto.randomUUID();
      await dbHandler.saveExportHistory({
        id: historyId,
        date: new Date(),
        state: {
          id: historyId,
          whiteboards: whiteboardExports,
          journals: journalExport,
          tags: tagsExport,
          exportSettings,
        },
        isStarred: false,
        name: `Export ${new Date().toLocaleString()}`,
      });

      logs.push(...exporter.getLogs());

      if (exporter.exportAsZip) {
        const zipData = await exporter.getExportZip();
        const blob = new Blob([zipData], { type: "application/zip" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Heptabase_export_${new Date().toISOString()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        logs.push(
          `Export completed successfully. ${exporter.getExportCount()} cards/journals exported.`
        );
      } else if (action === "file") {
        const exportData = exporter.getExportMarkdown();
        const blob = new Blob([exportData], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Heptabase_export_${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        logs.push(
          `Export completed successfully. ${exporter.getExportCount()} cards/journals exported.`
        );
      } else {
        const exportData = exporter.getExportMarkdown();
        navigator.clipboard.writeText(exportData);
        logs.push(
          `Export completed successfully. ${exporter.getExportCount()} cards/journals copied to clipboard.`
        );
      }
    } catch (error) {
      logs.push(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
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
  const isExportDisabled =
    whiteboardExportsCount +
      journalExportCount +
      tagsExport.selectedViews.size ===
    0;

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
            <Link to="/home" className="">
              Bundle My Heptabase
            </Link>
          </h1>
        </div>
      </header>
      <div className={cn("container mx-auto p-4")}>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Export</h1>
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
                  {"Export Selected"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport("file")}>
                  {exportSettings.includeLinkedFiles ? (
                    <>
                      <FolderArchive className="w-4 h-4 mr-2" /> Export as ZIP
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4 h-4 mr-2" /> Export as Markdown
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport("clipboard")}
                  disabled={exportSettings.includeLinkedFiles}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy to Clipboard
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={() => setIsSettingsModalOpen(true)}
              variant="outline"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <ExportHistory accountId={accountId} />
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
          <TabsTrigger
            value="tags"
            selectedCount={tagsExport.selectedViews.size}
          >
            Tags
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

          <TabsContent value="tags">
            <TagsExport
              data={hbData}
              selectedViews={tagsExport.selectedViews}
              onSelectedViewsChange={(views) => {
                setTagsExport((prev) => ({ ...prev, selectedViews: views }));
              }}
            />
          </TabsContent>
        </Tabs>

        <ExportLogModal
          isOpen={isLogModalOpen}
          onClose={() => {
            setIsLogModalOpen(false);
            navigate({
              search: "",
            });
          }}
          logs={exportLogs}
        />

        <ExportSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          settings={exportSettings}
          onSettingsChange={setExportSettings}
        />
      </div>
    </div>
  );
}
