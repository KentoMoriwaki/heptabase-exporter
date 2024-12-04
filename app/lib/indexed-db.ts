type AccountEntity = {
  id: string;
};

type FileEntity = {
  path: string;
  name: string;
  type: string;
  size: number;
  content: ArrayBuffer;
  accountId: string;
};

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

        // アカウント情報ストア
        if (!db.objectStoreNames.contains("accounts")) {
          db.createObjectStore("accounts", { keyPath: "id" });
        }

        // ファイル情報ストア
        if (!db.objectStoreNames.contains("files")) {
          const fileStore = db.createObjectStore("files", { keyPath: "path" });
          fileStore.createIndex("accountId", "accountId", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // TODO: Add name parameter
  async saveAccount(db: IDBDatabase, accountId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("accounts", "readwrite");
      const store = transaction.objectStore("accounts");
      const request = store.put({ id: accountId });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveFile(
    db: IDBDatabase,
    file: File,
    path: string,
    accountId: string
  ): Promise<void> {
    const arrayBuffer = await file.arrayBuffer();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("files", "readwrite");
      const store = transaction.objectStore("files");
      const entity: FileEntity = {
        path,
        name: file.name,
        type: file.type,
        size: file.size,
        content: arrayBuffer,
        accountId,
      };
      const request = store.put(entity);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getFilesByAccountId(
    db: IDBDatabase,
    accountId: string
  ): Promise<Array<FileEntity>> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("files", "readonly");
      const store = transaction.objectStore("files");
      const index = store.index("accountId");
      const request = index.getAll(accountId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteAccount(db: IDBDatabase, accountId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const transaction = db.transaction(["accounts", "files"], "readwrite");

      const accountStore = transaction.objectStore("accounts");
      const accountDeleteRequest = accountStore.delete(accountId);

      accountDeleteRequest.onsuccess = async () => {
        const fileStore = transaction.objectStore("files");
        const index = fileStore.index("accountId");
        const fileKeysRequest = index.getAllKeys(accountId);

        fileKeysRequest.onsuccess = () => {
          const fileKeys = fileKeysRequest.result;
          fileKeys.forEach((key) => fileStore.delete(key));
          resolve();
        };

        fileKeysRequest.onerror = () => reject(fileKeysRequest.error);
      };

      accountDeleteRequest.onerror = () => reject(accountDeleteRequest.error);
    });
  }
}
