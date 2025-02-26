import { LocalDb } from "./local-db";

export class PreferencesDb extends LocalDb {
  private static instance: PreferencesDb;

  static readonly STORE_MKB_PRESETS = "mkb-presets";
  static readonly STORE_TOUCH_CONTROLLER_LAYOUTS = "touch-controller-layouts";
  static readonly STORE_CONTROLLER_VIBRATION = "controller-vibration";

  static readonly STORES = [
    "mkb_presets",
    "touch_controller_layouts",
    "controller_vibration",
  ];

  static getInstance(): PreferencesDb {
    if (!PreferencesDb.instance) {
      PreferencesDb.instance = new PreferencesDb();
    }

    return PreferencesDb.instance;
  }

  protected onUpgradeNeeded(e: IDBVersionChangeEvent): void {
    const db = (e.target as any).result;

    // Create stores if they don't exist
    for (const storeName of PreferencesDb.STORES) {
      if (!db.objectStoreNames.contains(storeName)) {
        if (storeName === "mkb_presets") {
          db.createObjectStore(storeName, { keyPath: "id" });
        } else {
          db.createObjectStore(storeName, {
            keyPath: "id",
            autoIncrement: true,
          });
        }
      }
    }
  }

  async getAllFromStore(storeName: string): Promise<any[]> {
    try {
      // For all stores, use our own implementation
      await this.open();

      // Check if the store exists in our database
      if (!Array.from(this.db.objectStoreNames).includes(storeName)) {
        console.warn(`Store ${storeName} does not exist in database`);
        return [];
      }

      const table = await this.table(storeName, "readonly");
      const [_, result] = await this.getAll(table);
      return result || [];
    } catch (e) {
      console.error(`Error getting data from store ${storeName}:`, e);
      return [];
    }
  }

  async clearStore(storeName: string): Promise<void> {
    try {
      await this.open();

      // Check if the store exists in our database
      if (!Array.from(this.db.objectStoreNames).includes(storeName)) {
        console.warn(`Store ${storeName} does not exist in database`);
        return;
      }

      const table = await this.table(storeName, "readwrite");

      return new Promise((resolve, reject) => {
        const request = table.clear();

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = (e) => {
          console.error(`Error clearing store ${storeName}:`, e);
          reject(e);
        };
      });
    } catch (e) {
      console.error(`Error clearing store ${storeName}:`, e);
    }
  }

  async addToStore(storeName: string, item: any): Promise<void> {
    try {
      await this.open();

      // Check if the store exists in our database
      if (!Array.from(this.db.objectStoreNames).includes(storeName)) {
        console.warn(`Store ${storeName} does not exist in database`);
        return;
      }

      const table = await this.table(storeName, "readwrite");

      return new Promise((resolve, reject) => {
        const request = table.add(item);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = (e) => {
          console.error(`Error adding item to store ${storeName}:`, e);
          reject(e);
        };
      });
    } catch (e) {
      console.error(`Error adding item to store ${storeName}:`, e);
    }
  }
}
