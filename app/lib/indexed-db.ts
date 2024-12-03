export class IndexedDBHandler {
  private dbName: string;

  constructor(dbName: string) {
    this.dbName = dbName;
  }

  async init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName);

      request.onupgradeneeded = () => {
        const db = request.result;

        // ディレクトリ情報ストア
        if (!db.objectStoreNames.contains("directories")) {
          db.createObjectStore("directories", { keyPath: "id" });
        }

        // ファイル情報ストア
        if (!db.objectStoreNames.contains("files")) {
          const fileStore = db.createObjectStore("files", { keyPath: "path" });
          fileStore.createIndex("directoryID", "directoryID", {
            unique: false,
          });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveDirectory(db: IDBDatabase, directoryName: string): Promise<string> {
    const id = Math.random().toString(36).substring(2, 10);
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("directories", "readwrite");
      const store = transaction.objectStore("directories");
      const request = store.put({ id, name: directoryName });

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async saveFile(
    db: IDBDatabase,
    file: File,
    path: string,
    directoryID: string
  ): Promise<void> {
    const arrayBuffer = await file.arrayBuffer();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("files", "readwrite");
      const store = transaction.objectStore("files");
      const request = store.put({
        path,
        name: file.name,
        type: file.type,
        size: file.size,
        content: arrayBuffer, // バイナリデータ
        directoryID,
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getFilesByDirectoryID(
    db: IDBDatabase,
    directoryID: string
  ): Promise<
    Array<{
      path: string;
      name: string;
      type: string;
      size: number;
      content: ArrayBuffer;
    }>
  > {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("files", "readonly");
      const store = transaction.objectStore("files");
      const index = store.index("directoryID");
      const request = index.getAll(directoryID);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteDirectory(db: IDBDatabase, directoryID: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const transaction = db.transaction(["directories", "files"], "readwrite");

      const dirStore = transaction.objectStore("directories");
      const dirDeleteRequest = dirStore.delete(directoryID);

      dirDeleteRequest.onsuccess = async () => {
        const fileStore = transaction.objectStore("files");
        const index = fileStore.index("directoryID");
        const fileKeysRequest = index.getAllKeys(directoryID);

        fileKeysRequest.onsuccess = () => {
          const fileKeys = fileKeysRequest.result;
          fileKeys.forEach((key) => fileStore.delete(key));
          resolve();
        };

        fileKeysRequest.onerror = () => reject(fileKeysRequest.error);
      };

      dirDeleteRequest.onerror = () => reject(dirDeleteRequest.error);
    });
  }
}
