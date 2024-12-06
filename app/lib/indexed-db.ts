import { HBData } from "./hb-types";

export type AccountEntity = {
  id: string;
};

export type FileEntity = {
  path: string;
  name: string;
  type: string;
  size: number;
  content: ArrayBuffer;
};

const DBNamePrefix = "HeptabaseDB";
const masterDBName = "HeptabaseMasterDB";

const handlerCache = new Map();

export async function getIDBMasterHandler(): Promise<MasterDBHandler> {
  return _getIDBHandler(masterDBName, MasterDBHandler);
}

export async function getIDBHandler(
  accountId: string
): Promise<AccountDBHandler> {
  const dbName = `${DBNamePrefix}_${accountId}`;
  return _getIDBHandler(dbName, AccountDBHandler);
}

async function _getIDBHandler<T extends IndexedDBHandler>(
  dbName: string,
  HandlerClass: new (dbName: string) => T
): Promise<T> {
  const cachedRef = handlerCache.get(dbName);
  if (cachedRef) {
    const cachedHandler = cachedRef.deref();
    if (cachedHandler) {
      cachedHandler.ready();
      return cachedHandler;
    } else {
      handlerCache.delete(dbName);
    }
  }

  const handler = new HandlerClass(dbName);
  handlerCache.set(dbName, new WeakRef(handler));
  await handler.ready();
  return handler;
}

abstract class IndexedDBHandler {
  protected dbName: string;
  protected db!: IDBDatabase;
  protected initPromise: Promise<void> | null = null;

  constructor(dbName: string) {
    this.dbName = dbName;
  }

  ready(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.init();
    }
    return this.initPromise;
  }

  protected abstract init(): Promise<void>;
}

export class MasterDBHandler extends IndexedDBHandler {
  protected async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("accounts")) {
          db.createObjectStore("accounts", { keyPath: "id" });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveAccount(accountId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction("accounts", "readwrite");
      const store = transaction.objectStore("accounts");
      const request = store.put({ id: accountId });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteAccount(accountId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction("accounts", "readwrite");
      const store = transaction.objectStore("accounts");
      const request = store.delete(accountId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export class AccountDBHandler extends IndexedDBHandler {
  protected async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("files")) {
          const fileStore = db.createObjectStore("files", {
            keyPath: "path",
          });
          fileStore.createIndex("path", "path");
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllDataJson(): Promise<HBData> {
    const transaction = this.db.transaction("files", "readonly");
    const store = transaction.objectStore("files");
    const request = store.get("All-Data.json");

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const file: FileEntity = request.result;
        if (!file) {
          reject(
            new Error(
              'The directory does not contain a file named "All-Data.json".'
            )
          );
        } else {
          const json = new TextDecoder().decode(file.content);
          resolve(JSON.parse(json));
        }
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async saveFile(file: File, path: string): Promise<void> {
    const arrayBuffer = await file.arrayBuffer();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction("files", "readwrite");
      const store = transaction.objectStore("files");
      const entity: FileEntity = {
        path,
        name: file.name.normalize(),
        type: file.type,
        size: file.size,
        content: arrayBuffer,
      };
      const request = store.put(entity);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getFiles(): Promise<Array<FileEntity>> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction("files", "readonly");
      const store = transaction.objectStore("files");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  getFilesByTitle(title: string): Promise<FileEntity[]> {
    return new Promise((resolve, reject) => {
      const normalizedTitle = title.normalize().replaceAll(/[\/\?:]/g, "!");
      const transaction = this.db.transaction("files", "readonly");
      const store = transaction.objectStore("files");
      const index = store.index("path");
      const pathPrefix = "Card Library/";
      const range = IDBKeyRange.bound(
        `${pathPrefix}${normalizedTitle}`,
        `${pathPrefix}${normalizedTitle}\uffff`
      );
      const request = index.openCursor(range);

      const files: FileEntity[] = [];
      request.onsuccess = (event) => {
        const cursor: IDBCursorWithValue | null = (event.target as IDBRequest)
          .result;
        if (cursor) {
          const file = cursor.value;
          files.push(file);
          cursor.continue();
        } else {
          const filteredFiles = files.filter((file) => {
            const name = file.name;
            if (
              name.startsWith(normalizedTitle) &&
              name.substring(normalizedTitle.length).match(/^(\s\d+)?\.md$/)
            ) {
              return true;
            }
            return false;
          });
          resolve(filteredFiles);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFiles(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const transaction = this.db.transaction("files", "readwrite");
      const store = transaction.objectStore("files");
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
