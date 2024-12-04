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
          const fileStore = db.createObjectStore("files", {
            keyPath: ["accountId", "path"],
          });
          fileStore.createIndex("accountId", "accountId", { unique: false });
          fileStore.createIndex("accountId_path", ["accountId", "path"]);
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

  /**
   * Get All-Data.json from the root directory of the account
   * @param accountId
   */
  async getAllDataJson(accountId: string): Promise<HBData> {
    const transaction = this.db.transaction("files", "readonly");
    const store = transaction.objectStore("files");
    const request = store.get([accountId, "./All-Data.json"]);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const file: FileEntity = request.result;
        if (!file) {
          reject(
            new Error(
              'The directory does not contain a file named "All-Data.json" for the specified account.'
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

  async saveFile(
    file: File,
    parentPath: string,
    accountId: string
  ): Promise<void> {
    const arrayBuffer = await file.arrayBuffer();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction("files", "readwrite");
      const store = transaction.objectStore("files");
      const entity: FileEntity = {
        path: `${parentPath}/${file.name.normalize()}`,
        name: file.name.normalize(),
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

  /**
   * 同名のファイルが存在する場合、`{Name} 1.md` のように連番が付与されている場合があるので、その場合は全て取得する
   * @param accountId
   * @param title
   */
  getFilesByTitle(accountId: string, title: string): Promise<FileEntity[]> {
    return new Promise((resolve, reject) => {
      const normalizedTitle = title.normalize().replaceAll("/", "!");
      const transaction = this.db.transaction("files", "readonly");
      const store = transaction.objectStore("files");
      const index = store.index("accountId_path");
      const pathPrefix = "./Card Library/";
      const range = IDBKeyRange.bound(
        [accountId, `${pathPrefix}${normalizedTitle}`],
        [accountId, `${pathPrefix}${normalizedTitle}\uffff`]
      );
      // const key = [accountId, `${pathPrefix}${normalizedTitle}.md`];
      const request = index.openCursor(range);

      const files: FileEntity[] = [];
      request.onsuccess = (event) => {
        const cursor: IDBCursorWithValue | null = (event.target as IDBRequest)
          .result;
        // const cursor = request.result;
        if (cursor) {
          const file = cursor.value;
          files.push(file);
          cursor.continue();
        } else {
          // file の名前が `Name.md` か `Name %number.md` という形式のものに絞り込む
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
