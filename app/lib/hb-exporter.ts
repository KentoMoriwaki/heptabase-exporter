import { filterCardsAndJournalsByViews } from "@/lib/hb-filter";
import { journalsFilter } from "@/lib/hb-journals-filter";
import { filterCardsInWhiteboards } from "@/lib/hb-utils";
import {
  AccountDBHandler,
  FileEntity,
  JournalExportState,
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
      `Card Library/${card.title}`,
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
      this.exportFile(file, {
        "Card Title": card.title,
        "Created At": formatDate(card.createdTime),
        File: file.path,
      });
    }
  }

  private async exportJournal(journal: HBJournal) {
    const files = await this.dbHandler.getFilesByTitle(
      `Journal/${journal.date}.md`,
      { exact: true }
    );
    if (files.length === 0) {
      this.logs.push(`No file found for journal "${journal.date}"`);
      return;
    }

    for (const file of files) {
      this.exportFile(file, {
        "Journal Date": journal.date,
        File: file.path,
      });
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
    if (this.exportSettings.includeLinkedCards) {
      const likedFiles = findLinkedFiles(file);
      this.processLinkedFiles(likedFiles);
    }
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
            this.exportFile(file, { File: file.path });
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

  getExportData() {
    return this.exports.join("");
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
