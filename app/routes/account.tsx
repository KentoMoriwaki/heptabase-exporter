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
import { HBCard, HBData, HBJournal } from "@/lib/hb-types";
import { buildWhiteboardTree, filterCardsInWhiteboards } from "@/lib/hb-utils";
import {
  AccountDBHandler,
  FileEntity,
  getIDBHandler,
  getIDBMasterHandler,
  JournalExportState,
  TagsExportState,
  WhiteboardExportState,
} from "@/lib/indexed-db";
import { cn } from "@/lib/utils";
import { Copy, Download, FileDown, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router";
import { Route } from "./+types/account";
import { TagsExport } from "@/components/tags-export";
import { filterCardsByViews } from "@/lib/hb-filter";
import { journalsFilter } from "@/lib/hb-journals-filter";

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

  const [tagsExport, setTagsExport] = useState<{
    selectedViews: Set<string>;
  }>(lastExportState.tags ?? { selectedViews: new Set() });

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
      const exporter = new Exporter(dbHandler, hbData);

      await exporter.exportWhiteboards(whiteboardExports);
      if (journalExport.enabled) {
        await exporter.exportJournals(journalExport.config);
      }
      await exporter.exportTags(tagsExport);

      const exportData = exporter.getExportData();
      logs.push(...exporter.getLogs());

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
        tags: tagsExport,
      });
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
            Bundle My Heptabase
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

function serializeJournal(journal: HBJournal, files: FileEntity[]): string {
  const contents = files.map((file) => {
    const comments = [`Journal Date: ${journal.date}`, `File: ${file.path}`];
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

function findLinkedFiles(file: FileEntity) {
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const content = new TextDecoder().decode(file.content);
  const linkedFiles: string[] = [];
  let match;
  while ((match = markdownLinkRegex.exec(content)) !== null) {
    const relativePath = decodeURIComponent(match[2]);
    const resolvedPath = resolveAbsolutePath(file.path, relativePath);
    linkedFiles.push(resolvedPath);
  }
  return linkedFiles;
}
function resolveAbsolutePath(
  currentFilePath: string,
  relativePath: string
): string {
  // 1. 現在のファイルのディレクトリパスを取得
  const currentDir = currentFilePath.substring(
    0,
    currentFilePath.lastIndexOf("/")
  );

  // 2. 相対パスのセグメントを分割
  const segments = relativePath.split("/");

  // 3. 現在のディレクトリから始まるパスセグメントの配列を作成
  const resultSegments = currentDir.split("/");

  // 4. 各セグメントを処理
  for (const segment of segments) {
    if (segment === ".") {
      continue; // 現在のディレクトリは無視
    } else if (segment === "..") {
      resultSegments.pop(); // 一つ上のディレクトリへ
    } else {
      resultSegments.push(segment); // 通常のパスセグメントを追加
    }
  }

  // 5. パスセグメントを結合して最終的な絶対パスを作成
  return resultSegments.join("/");
}

class Exporter {
  private dbHandler: AccountDBHandler;
  private hbData: HBData;
  private exports: string[] = [];
  private logs: string[] = [];
  private exportedFiles: Set<string> = new Set();

  constructor(dbHandler: AccountDBHandler, hbData: HBData) {
    this.dbHandler = dbHandler;
    this.hbData = hbData;
  }

  async exportWhiteboards(whiteboardExports: WhiteboardExportState[]) {
    for (const exportState of whiteboardExports) {
      if (!exportState.enabled) continue;
      const cards = filterCardsInWhiteboards(
        new Set([exportState.whiteboardId]),
        this.hbData,
        {
          includeSections:
            exportState.selectType === "include"
              ? exportState.selectedIds
              : undefined,
          excludeSections:
            exportState.selectType === "exclude"
              ? exportState.selectedIds
              : undefined,
        }
      );
      await this.exportCards(cards);
    }
  }

  async exportJournals(journalExport: JournalExportState) {
    const journals = journalsFilter(this.hbData, journalExport);
    for (const journal of journals) {
      const files = await this.dbHandler.getFilesByTitle(
        `Journal/${journal.date}.md`,
        { exact: true }
      );
      if (files.length === 0) {
        this.logs.push(`No file found for journal "${journal.date}"`);
        continue;
      }

      for (const file of files) {
        this.exportFile(file, {
          "Journal Date": journal.date,
          File: file.path,
        });
      }
    }
  }

  async exportTags(tagsExport: TagsExportState) {
    const tagCards = filterCardsByViews(this.hbData, [
      ...tagsExport.selectedViews,
    ]);
    await this.exportCards(tagCards);
  }

  private async exportCards(cards: HBCard[]) {
    for (const card of cards) {
      const files = await this.dbHandler.getFilesByTitle(
        `Card Library/${card.title}`,
        {
          exact: false,
        }
      );
      if (files.length === 0) {
        this.logs.push(`No file found for card "${card.title}"`);
        continue;
      }
      // TODO: Handle multiple files for a card
      for (const file of files) {
        this.exportFile(file, {
          "Card Title": card.title,
          "Created At": formatDate(card.createdTime),
          File: file.path,
        });
      }
    }
  }

  private exportFile(file: FileEntity, meta: Record<string, string>) {
    if (this.exportedFiles.has(file.path)) return;
    this.exportedFiles.add(file.path);
    const comments = Object.entries(meta).map(
      ([key, value]) => `${key}: ${value}`
    );
    const commentsStr = `<!--\n${comments.join("\n")}\n-->`;
    const content = new TextDecoder().decode(file.content);
    this.exports.push(`---\n\n${commentsStr}\n\n${content}\n\n`);
    const likedFiles = findLinkedFiles(file);
    this.processLinkedFiles(likedFiles);
  }

  private async processLinkedFiles(linkedFiles: string[]) {
    for (const linkedFile of linkedFiles) {
      if (this.exportedFiles.has(linkedFile)) continue;
      const dir = linkedFile.split("/")[0];
      switch (dir) {
        case "Card Library":
        case "Journal": {
          const [file] = await this.dbHandler.getFilesByTitle(linkedFile, {
            exact: true,
          });
          if (file) {
            this.exportedFiles.add(linkedFile);
            this.exports.push(
              `---\n\n${new TextDecoder().decode(file.content)}\n\n`
            );
            const furtherLinkedFiles = findLinkedFiles(file);
            await this.processLinkedFiles(furtherLinkedFiles);
          }
          break;
        }
        default: {
          this.logs.push(
            `Linked file "${linkedFile}" is not in "Card Library" or "Journal".`
          );
        }
      }
    }
  }

  private async addFilesToExport(files: FileEntity[]) {
    for (const file of files) {
      if (this.exportedFiles.has(file.path)) continue;
      this.exportedFiles.add(file.path);
    }
  }

  getExportData() {
    return this.exports.join("");
  }

  getLogs() {
    return this.logs;
  }
}
