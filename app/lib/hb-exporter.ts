import { AsyncZipOptions, zip } from "fflate";
import { filterCardsAndJournalsByViews } from "@/lib/hb-filter";
import { journalsFilter } from "@/lib/hb-journals-filter";
import {
  filterAssetsInWhiteboards,
  filterCardsInWhiteboards,
} from "@/lib/hb-utils";
import {
  AccountDBHandler,
  FileEntity,
  JournalExportState,
  normalizePathPart,
  TagsExportState,
  WhiteboardExportState,
} from "@/lib/indexed-db";
import { formatDate } from "./date";
import { HBCard, HBData, HBJournal } from "./hb-types";
import { ExportSettings } from "@/components/export-setings-modal";

export class HBExporter {
  private dbHandler: AccountDBHandler;
  private hbData: HBData;
  private exports: string[] = [];
  private assets: FileEntity[] = [];
  private logs: string[] = [];
  private exportedFiles: Set<string> = new Set();
  private exportSettings: ExportSettings;

  constructor(
    dbHandler: AccountDBHandler,
    hbData: HBData,
    exportSettings: ExportSettings
  ) {
    this.dbHandler = dbHandler;
    this.hbData = hbData;
    this.exportSettings = exportSettings;
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
      for (const card of cards) {
        await this.exportCard(card);
      }
      if (!this.exportSettings.includeLinkedFiles) continue;
      const assets = filterAssetsInWhiteboards(
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
      for (const asset of assets) {
        const fileName = asset.file.name.substring(
          0,
          asset.file.name.indexOf(".")
        );
        const ext = asset.media
          ? asset.file.name.substring(fileName.length + 1)
          : "pdf";
        const path = asset.media
          ? `Whiteboard/${normalizePathPart(
              asset.whiteboard.name
            )}-assets/${normalizePathPart(fileName)}`
          : `Card Library/${normalizePathPart(fileName)}`;
        const files = await this.dbHandler.getFilesByTitle(path, {
          exact: false,
          ext,
        });
        for (const file of files) {
          if (file.size === asset.file.size) {
            this.exportAssetFile(file);
          }
        }
      }
    }
  }

  async exportJournals(journalExport: JournalExportState) {
    const journals = journalsFilter(this.hbData, journalExport);
    for (const journal of journals) {
      await this.exportJournal(journal);
    }
  }

  async exportTags(tagsExport: TagsExportState) {
    const results = filterCardsAndJournalsByViews(this.hbData, [
      ...tagsExport.selectedViews,
    ]);
    for (const result of results) {
      if ("title" in result) {
        await this.exportCard(result);
      } else {
        await this.exportJournal(result);
      }
    }
  }

  private async exportCard(card: HBCard) {
    let files = await this.dbHandler.getFilesByTitle(
      `Card Library/${normalizePathPart(card.title)}`,
      {
        exact: false,
      }
    );
    if (files.length === 0) {
      this.logs.push(`No file found for card "${card.title}"`);
      return;
    }
    files = this.findBestMatchedFiles(files, card.content);
    if (files.length > 1) {
      this.logs.push(
        `Multiple files found for card "${card.title}". Using all files. ${files
          .map((file) => file.path)
          .join(", ")}`
      );
    }
    for (const file of files) {
      this.exportCardFile(file, {
        "Card Title": card.title,
        "Created At": formatDate(card.createdTime),
        File: file.path,
      });
    }
  }

  private async exportJournal(journal: HBJournal) {
    const files = await this.dbHandler.getFilesByTitle(
      `Journal/${normalizePathPart(journal.date)}.md`,
      { exact: true }
    );
    if (files.length === 0) {
      this.logs.push(`No file found for journal "${journal.date}"`);
      return;
    }

    for (const file of files) {
      this.exportCardFile(file, {
        "Journal Date": journal.date,
        File: file.path,
      });
    }
  }

  private exportCardFile(file: FileEntity, meta: Record<string, string>) {
    if (this.exportedFiles.has(file.path)) return;
    this.exportedFiles.add(file.path);
    const comments = Object.entries(meta).map(
      ([key, value]) => `${key}: ${value}`
    );
    const commentsStr = `<!--\n${comments.join("\n")}\n-->`;
    const content = new TextDecoder().decode(file.content);
    this.exports.push(`---\n\n${commentsStr}\n\n${content}\n\n`);
    if (
      this.exportSettings.includeLinkedCards ||
      this.exportSettings.includeLinkedFiles
    ) {
      const likedFiles = findLinkedFiles(file);
      this.processLinkedFiles(likedFiles);
    }
  }

  private exportAssetFile(file: FileEntity) {
    if (this.exportedFiles.has(file.path)) return;
    this.exportedFiles.add(file.path);
    const type = file.type.match(/image|img/)
      ? "image"
      : file.type.match(/audio|video/)
      ? "audio/video"
      : "other";
    if (
      (type === "image" && this.exportSettings.includeImages) ||
      (type === "audio/video" && this.exportSettings.includeAudioVideo) ||
      (type === "other" && this.exportSettings.includeOtherFiles)
    ) {
      this.assets.push(file);
    }
  }

  private async processLinkedFiles(linkedFiles: string[]) {
    for (const linkedFile of linkedFiles) {
      if (this.exportedFiles.has(linkedFile)) continue;
      const parts = linkedFile.split("/");
      const dir = parts[0];
      const subdir = parts.length > 2 ? parts[1] : "";
      const file = parts[parts.length - 1];
      if (subdir.endsWith("-assets") || file.endsWith(".pdf")) {
        if (this.exportSettings.includeLinkedFiles) {
          const [file] = await this.dbHandler.getFilesByTitle(linkedFile, {
            exact: true,
          });
          if (file) {
            this.exportAssetFile(file);
          }
        }
      } else if (this.exportSettings.includeLinkedCards) {
        switch (dir) {
          case "Card Library":
          case "Journal": {
            const [file] = await this.dbHandler.getFilesByTitle(linkedFile, {
              exact: true,
            });
            if (file) {
              this.exportCardFile(file, { File: file.path });
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
  }

  get exportAsZip() {
    return this.exportSettings.includeLinkedFiles;
  }

  getExportMarkdown() {
    return this.exports.join("");
  }

  async getExportZip(): Promise<Uint8Array> {
    const files: { [key: string]: [Uint8Array, AsyncZipOptions] } = {};
    files["export.md"] = [
      new TextEncoder().encode(this.getExportMarkdown()),
      {
        level: 1,
        mtime: new Date(),
      },
    ];

    for (const asset of this.assets) {
      if (!asset.path || !asset.content) continue;

      try {
        files[asset.path] = [
          new Uint8Array(asset.content),
          { mtime: new Date(asset.lastModified) },
        ];
      } catch (err) {
        this.logs.push(`Failed to add ${asset.path} to ZIP: ${err}`);
      }
    }

    return new Promise((resolve, reject) => {
      zip(
        files,
        {
          level: 1,
          mtime: new Date(),
        },
        (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        }
      );
    });
  }

  getLogs() {
    return this.logs;
  }

  getExportCount() {
    return this.exportedFiles.size;
  }

  private findBestMatchedFiles(
    files: FileEntity[],
    content: any
  ): FileEntity[] {
    if (files.length === 0) return [];
    if (files.length === 1) return files;
    // ProseMirror serialized doc is stored in content.
    // Extract textNodes in order from content, search files from the beginning,
    // stop at the point where they are not found, and return the remaining ones.
    const texts = files.map((file) => new TextDecoder().decode(file.content));
    const indices = new Array(files.length).fill(0);
    for (const text of getTextFromContent(JSON.parse(content))) {
      for (let i = 0; i < files.length; i++) {
        if (indices[i] === -1) continue;
        indices[i] = texts[i].indexOf(text, indices[i]);
        if (
          indices[i] === -1 &&
          indices.filter((index) => index !== -1).length === 1
        ) {
          break;
        }
      }
    }
    return files.filter((_, i) => indices[i] !== -1);
  }
}

function* getTextFromContent(node: any): Generator<string> {
  if (node.type === "text") {
    yield node.text;
  }
  if (node.content) {
    for (const child of node.content) {
      for (const text of getTextFromContent(child)) {
        yield text;
      }
    }
  }
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
  const currentDir = currentFilePath.substring(
    0,
    currentFilePath.lastIndexOf("/")
  );
  const segments = relativePath.split("/");
  const resultSegments = currentDir.split("/");
  for (const segment of segments) {
    if (segment === ".") {
      continue;
    } else if (segment === "..") {
      resultSegments.pop();
    } else {
      resultSegments.push(segment);
    }
  }
  return resultSegments.join("/");
}
