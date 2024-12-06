import { HBData } from "./hb-types";

export type AccountEntity = {
  id: string;
  name: string;
  folderName: string;
  lastOpened: number;
  lastUploaded: number;
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
    const cachedHandler: T | undefined = cachedRef.deref();
    if (cachedHandler) {
      await cachedHandler.ready();
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

  async getAccounts(): Promise<AccountEntity[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction("accounts", "readonly");
      const store = transaction.objectStore("accounts");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveAccount(accountId: string, folderName: string): Promise<void> {
    const currentAccounts = await this.getAccounts();
    const existingAccount = currentAccounts.find((a) => a.id === accountId);
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction("accounts", "readwrite");
      const store = transaction.objectStore("accounts");
      const account: AccountEntity = {
        id: accountId,
        name: existingAccount
          ? existingAccount.name
          : currentAccounts.length === 0
          ? "Default Account"
          : `Account ${currentAccounts.length + 1}`,
        folderName,
        lastOpened: Date.now(),
        lastUploaded: Date.now(),
      };
      const request = store.put(account);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateAccount(
    account: Partial<AccountEntity> & { id: string }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction("accounts", "readwrite");
      const store = transaction.objectStore("accounts");
      const request = store.get(account.id);

      request.onsuccess = () => {
        const existingAccount = request.result;
        if (!existingAccount) {
          reject(new Error(`Account ${account.id} not found`));
          return;
        }
        const updatedAccount = { ...existingAccount, ...account };
        const updateRequest = store.put(updatedAccount);

        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      };
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
        if (!db.objectStoreNames.contains("exportState")) {
          db.createObjectStore("exportState", { keyPath: "id" });
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
        path: path.normalize(),
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

  async saveLastExportState(state: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction("exportState", "readwrite");
      const store = transaction.objectStore("exportState");
      const request = store.put({ id: "lastExportState", state });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getLastExportState(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction("exportState", "readonly");
      const store = transaction.objectStore("exportState");
      const request = store.get("lastExportState");

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.state : []);
      };
      request.onerror = () => reject(request.error);
    });
  }
}
