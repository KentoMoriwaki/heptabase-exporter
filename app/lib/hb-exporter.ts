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

export class HBExporter {
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
    const files = await this.dbHandler.getFilesByTitle(
      `Card Library/${card.title}`,
      {
        exact: false,
      }
    );
    if (files.length === 0) {
      this.logs.push(`No file found for card "${card.title}"`);
      return;
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
