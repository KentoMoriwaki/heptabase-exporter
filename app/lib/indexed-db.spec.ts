import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { IndexedDBHandler } from "./indexed-db";
import "fake-indexeddb/auto";

let dbHandler: IndexedDBHandler;
let db: IDBDatabase;

describe("IndexedDBHandler", () => {
  beforeAll(() => {
    dbHandler = new IndexedDBHandler("TestDB");
  });

  beforeEach(async () => {
    db = await dbHandler.init();
  });

  afterEach(async () => {
    db.close();
    indexedDB.deleteDatabase("TestDB");
  });

  it("should save and retrieve files with binary content", async () => {
    const dirName = "TestDirectory";
    const directoryID = await dbHandler.saveDirectory(db, dirName);

    const content = "Hello, binary world!";
    const file = new File([content], "test.txt", { type: "text/plain" });
    await dbHandler.saveFile(db, file, "test.txt", directoryID);

    const files = await dbHandler.getFilesByDirectoryID(db, directoryID);

    expect(files).toHaveLength(1);
    expect(files[0].name).toBe("test.txt");
    expect(files[0].type).toBe("text/plain");
    expect(files[0].size).toBe(content.length);

    const decoder = new TextDecoder();
    const fileContent = decoder.decode(files[0].content);
    expect(fileContent).toBe(content);
  });
});
