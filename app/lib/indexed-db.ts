export type AccountEntity = {
  id: string;
};

export type FileEntity = {
  path: string;
  name: string;
  type: string;
  size: number;
  content: ArrayBuffer;
  accountId: string;
};

const defaultDBName = "HeptabaseDB";

const handlerCache = new Map();

export async function getIDBHandler(
  dbName = defaultDBName
): Promise<IndexedDBHandler> {
  const cachedRef = handlerCache.get(dbName);
  if (cachedRef) {
    const cachedHandler = cachedRef.deref();
    if (cachedHandler) {
      cachedHandler.ready();
      return cachedHandler;
    } else {
      // キャッシュ内の無効な参照を削除
      handlerCache.delete(dbName);
    }
  }

  // 新しいインスタンスを作成し、キャッシュに保存
  const handler = new IndexedDBHandler(dbName);
  handlerCache.set(dbName, new WeakRef(handler));
  await handler.ready();
  return handler;
}
export class IndexedDBHandler {
  private dbName: string;
  private db!: IDBDatabase;
  private initPromise: Promise<void> | null = null;

  constructor(dbName: string) {
    this.dbName = dbName;
  }

  ready(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.init();
    }
    return this.initPromise;
  }

  private async init(): Promise<void> {
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

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // TODO: Add name parameter
  async saveAccount(accountId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction("accounts", "readwrite");
      const store = transaction.objectStore("accounts");
      const request = store.put({ id: accountId });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveFile(file: File, path: string, accountId: string): Promise<void> {
    const arrayBuffer = await file.arrayBuffer();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction("files", "readwrite");
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

  async getFilesByAccountId(accountId: string): Promise<Array<FileEntity>> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction("files", "readonly");
      const store = transaction.objectStore("files");
      const index = store.index("accountId");
      const request = index.getAll(accountId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteAccount(accountId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const transaction = this.db.transaction(
        ["accounts", "files"],
        "readwrite"
      );

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
