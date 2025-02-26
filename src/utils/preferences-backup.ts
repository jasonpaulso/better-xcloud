import { StorageKey } from "@/enums/pref-keys";
import { PreferencesDb } from "@/utils/local-db/preferences-db";

// Define the structure of our backup data
export interface PreferencesBackup {
  version: number;
  timestamp: string;
  data: {
    localStorage: {
      [key: string]: any;
    };
    localDb: {
      [key: string]: any;
    };
  };
}

// List of localStorage keys to include in the backup
const LOCALSTORAGE_KEYS = [
  StorageKey.GLOBAL,
  StorageKey.CONTROLLER_SHORTCUTS,
  StorageKey.USER_AGENT,
];

// List of LocalDB stores to include in the backup
const LOCALDB_STORES = [
  "mkb_presets",
  "touch_controller_layouts",
  "controller_vibration",
];

export class PreferencesBackup {
  /**
   * Creates a backup of user preferences
   */
  static async createBackup(): Promise<PreferencesBackup> {
    // Collect localStorage data
    const localStorageData: { [key: string]: any } = {};
    for (const key of LOCALSTORAGE_KEYS) {
      const value = window.localStorage.getItem(key);
      if (value) {
        try {
          // Store as parsed JSON if possible
          localStorageData[key] = JSON.parse(value);
        } catch (e) {
          // Otherwise store as string
          localStorageData[key] = value;
        }
      }
    }

    // Collect LocalDB data
    const localDbData: { [key: string]: any } = {};
    const preferencesDb = PreferencesDb.getInstance();

    for (const storeName of LOCALDB_STORES) {
      try {
        // Get all data from the store
        const storeData = await preferencesDb.getAllFromStore(storeName);
        if (storeData && storeData.length > 0) {
          localDbData[storeName] = storeData;
        }
      } catch (e) {
        console.error(`Error backing up LocalDB store ${storeName}:`, e);
      }
    }

    return {
      version: 1, // Version of the backup format
      timestamp: new Date().toISOString(),
      data: {
        localStorage: localStorageData,
        localDb: localDbData,
      },
    };
  }

  /**
   * Downloads the backup as a JSON file
   */
  static async downloadBackup(): Promise<void> {
    const backup = await this.createBackup();
    const backupStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([backupStr], { type: "application/json" });

    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `better-xcloud-preferences-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }

  /**
   * Restores preferences from a backup file
   * @param backupData The backup data to restore
   * @returns Object with success status and message
   */
  static async restoreBackup(backupData: PreferencesBackup): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Validate backup format
      if (!backupData.version || !backupData.data) {
        return { success: false, message: "Invalid backup format" };
      }

      // Handle legacy format (before LocalDB support)
      if (!backupData.data.localStorage && !backupData.data.localDb) {
        // Assume the data is directly in backupData.data (old format)
        const legacyData = backupData.data as unknown as { [key: string]: any };

        // Restore localStorage from legacy format
        for (const [key, value] of Object.entries(legacyData)) {
          if (LOCALSTORAGE_KEYS.includes(key as StorageKey)) {
            window.localStorage.setItem(
              key,
              typeof value === "string" ? value : JSON.stringify(value)
            );
          }
        }

        return {
          success: true,
          message: "Legacy preferences restored successfully",
        };
      }

      // Restore localStorage
      if (backupData.data.localStorage) {
        for (const [key, value] of Object.entries(
          backupData.data.localStorage
        )) {
          if (LOCALSTORAGE_KEYS.includes(key as StorageKey)) {
            window.localStorage.setItem(
              key,
              typeof value === "string" ? value : JSON.stringify(value)
            );
          }
        }
      }

      // Restore LocalDB
      if (backupData.data.localDb) {
        const preferencesDb = PreferencesDb.getInstance();

        for (const [storeName, storeData] of Object.entries(
          backupData.data.localDb
        )) {
          if (LOCALDB_STORES.includes(storeName)) {
            try {
              // Clear existing data in the store
              await preferencesDb.clearStore(storeName);

              // Add all items from backup
              if (Array.isArray(storeData)) {
                for (const item of storeData) {
                  await preferencesDb.addToStore(storeName, item);
                }
              }
            } catch (e) {
              console.error(`Error restoring LocalDB store ${storeName}:`, e);
            }
          }
        }
      }

      return { success: true, message: "Preferences restored successfully" };
    } catch (e) {
      console.error("Error restoring preferences:", e);
      return {
        success: false,
        message: `Error restoring preferences: ${(e as Error).message}`,
      };
    }
  }

  /**
   * Handles file upload and processes the backup file
   * @param file The uploaded file
   * @returns Promise resolving to the result of the restore operation
   */
  static async processBackupFile(
    file: File
  ): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const backupData = JSON.parse(
            e.target?.result as string
          ) as PreferencesBackup;
          const result = await this.restoreBackup(backupData);
          resolve(result);
        } catch (e) {
          resolve({
            success: false,
            message: `Error parsing backup file: ${(e as Error).message}`,
          });
        }
      };

      reader.onerror = () => {
        resolve({ success: false, message: "Error reading backup file" });
      };

      reader.readAsText(file);
    });
  }
}
