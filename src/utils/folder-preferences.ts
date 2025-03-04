import { PreferencesBackup } from "./preferences-backup";
import { getPref, setPref } from "./settings-storages/global-settings-storage";
import { PrefKey } from "@/enums/pref-keys";
import { BxEvent } from "./bx-event";
import { BxLogger } from "./bx-logger";

// Add type declarations for the File System Access API
declare global {
  interface FileSystemDirectoryHandle {
    queryPermission(descriptor: {
      mode: "read" | "readwrite";
    }): Promise<FileSystemPermissionState>;
    requestPermission(descriptor: {
      mode: "read" | "readwrite";
    }): Promise<FileSystemPermissionState>;
  }

  // Use our own type alias only if PermissionState is not already defined
  type FileSystemPermissionState = "granted" | "denied" | "prompt";

  interface Window {
    showDirectoryPicker(options?: {
      id?: string;
      mode?: "read" | "readwrite";
      startIn?:
        | "desktop"
        | "documents"
        | "downloads"
        | "music"
        | "pictures"
        | "videos";
    }): Promise<FileSystemDirectoryHandle>;
  }
}

export class FolderPreferences {
  private static readonly PREFERENCES_FILENAME =
    "better-xcloud-preferences.json";

  /**
   * Initializes folder preferences by checking if they're enabled and loading them if they are
   */
  static async initialize(): Promise<void> {
    const folderEnabled = getPref(PrefKey.PREFERENCES_FOLDER_ENABLED);
    const folderPath = getPref(PrefKey.PREFERENCES_FOLDER_PATH);

    if (folderEnabled && folderPath) {
      try {
        await this.loadPreferencesFromFolder();
      } catch (error) {
        BxLogger.error("Error loading preferences from folder:", error);
      }
    }
  }

  /**
   * Checks if the File System Access API is available in this browser
   */
  static isFileSystemAccessSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      "showDirectoryPicker" in window &&
      typeof window.showDirectoryPicker === "function"
    );
  }

  /**
   * Checks if we're in a secure context (required for File System Access API)
   */
  static isSecureContext(): boolean {
    return typeof window !== "undefined" && window.isSecureContext === true;
  }

  /**
   * Selects a folder for storing preferences
   */
  static async selectFolder(): Promise<string | null> {
    try {
      BxLogger.info("Starting folder selection process");
      console.log("Starting folder selection process");

      // Check if we're in a secure context
      if (!this.isSecureContext()) {
        BxLogger.error("Not in a secure context");
        console.error("Not in a secure context");

        // Fall back to a simple folder path input
        return this.selectFolderFallback();
      }

      // Check if the File System Access API is available
      if (!this.isFileSystemAccessSupported()) {
        BxLogger.error("File System Access API not supported");
        console.error("File System Access API not supported");

        // Fall back to a simple folder path input
        return this.selectFolderFallback();
      }

      BxLogger.info("Showing directory picker");
      console.log("Showing directory picker");

      // Use the File System Access API to select a folder
      try {
        const dirHandle = await window.showDirectoryPicker({
          id: "better-xcloud-preferences",
          mode: "readwrite",
          startIn: "documents",
        });

        BxLogger.info("Directory selected:", dirHandle.name);
        console.log("Directory selected:", dirHandle.name);

        // Verify we have permission to access the folder
        const permissionStatus = await dirHandle.queryPermission({
          mode: "readwrite",
        });
        if (permissionStatus !== "granted") {
          const newPermission = await dirHandle.requestPermission({
            mode: "readwrite",
          });
          if (newPermission !== "granted") {
            throw new Error("Permission to access the folder was denied");
          }
        }

        // Store the folder path
        const folderPath = dirHandle.name;
        setPref(PrefKey.PREFERENCES_FOLDER_PATH, folderPath, true);

        // Store the directory handle in sessionStorage for later use
        sessionStorage.setItem(
          "better_xcloud_folder_handle",
          JSON.stringify({
            name: dirHandle.name,
            // We can't directly store the handle, but we'll keep it in memory
          })
        );

        // Store the handle in memory
        (window as any).betterXcloudFolderHandle = dirHandle;

        BxLogger.info("Folder selection complete:", folderPath);
        console.log("Folder selection complete:", folderPath);

        return folderPath;
      } catch (dirError: unknown) {
        // Handle specific directory picker errors
        if (dirError instanceof DOMException) {
          if (dirError.name === "AbortError") {
            BxLogger.info("User cancelled folder selection");
            console.log("User cancelled folder selection");
            return null;
          } else if (dirError.name === "NotAllowedError") {
            const errorMsg = "Permission to access the folder was denied";
            BxLogger.error(errorMsg, dirError);
            console.error(errorMsg, dirError);

            // Fall back to a simple folder path input
            return this.selectFolderFallback();
          }
        }

        BxLogger.error("Error with directory picker:", dirError);
        console.error("Error with directory picker:", dirError);

        // Fall back to a simple folder path input
        return this.selectFolderFallback();
      }
    } catch (error: unknown) {
      BxLogger.error("Error selecting folder:", error);
      console.error("Error selecting folder:", error);

      // Fall back to a simple folder path input
      return this.selectFolderFallback();
    }
  }

  /**
   * Fallback method for selecting a folder when the File System Access API is not available
   */
  private static selectFolderFallback(): string | null {
    BxLogger.info("Using fallback folder selection method");
    console.log("Using fallback folder selection method");

    // Prompt the user to enter a folder path
    const folderPath = prompt("Enter the path to your preferences folder:", "");

    if (!folderPath) {
      return null;
    }

    // Store the folder path
    setPref(PrefKey.PREFERENCES_FOLDER_PATH, folderPath, true);

    BxLogger.info("Folder path set:", folderPath);
    console.log("Folder path set:", folderPath);

    return folderPath;
  }

  /**
   * Loads preferences from the selected folder
   */
  static async loadPreferencesFromFolder(): Promise<boolean> {
    try {
      const dirHandle = await this.getFolderHandle();
      if (!dirHandle) {
        return false;
      }

      // Try to get the preferences file
      try {
        const fileHandle = await dirHandle.getFileHandle(
          this.PREFERENCES_FILENAME
        );
        const file = await fileHandle.getFile();
        const backupData = JSON.parse(await file.text());

        // Restore preferences from the backup
        const result = await PreferencesBackup.restoreBackup(backupData);
        return result.success;
      } catch (error) {
        // File doesn't exist yet, that's okay
        BxLogger.info(
          "No preferences file found in folder, will create on next save"
        );
        return false;
      }
    } catch (error) {
      BxLogger.error("Error loading preferences from folder:", error);
      return false;
    }
  }

  /**
   * Saves preferences to the selected folder
   */
  static async savePreferencesToFolder(): Promise<boolean> {
    try {
      const dirHandle = await this.getFolderHandle();
      if (!dirHandle) {
        return false;
      }

      // Create a backup of the current preferences
      const backupData = await PreferencesBackup.createBackup();

      // Save the backup to the folder
      const fileHandle = await dirHandle.getFileHandle(
        this.PREFERENCES_FILENAME,
        { create: true }
      );
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(backupData, null, 2));
      await writable.close();

      return true;
    } catch (error) {
      BxLogger.error("Error saving preferences to folder:", error);
      return false;
    }
  }

  /**
   * Gets the folder handle from session storage or memory
   */
  private static async getFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
    // First check if we have the handle in memory
    if ((window as any).betterXcloudFolderHandle) {
      return (window as any).betterXcloudFolderHandle;
    }

    // If not, check if we have the path in preferences
    const folderPath = getPref(PrefKey.PREFERENCES_FOLDER_PATH);
    if (!folderPath) {
      return null;
    }

    // Try to get the handle from session storage
    const storedHandle = sessionStorage.getItem("better_xcloud_folder_handle");
    if (!storedHandle) {
      // We need to ask the user to select the folder again
      await this.selectFolder();
      return (window as any).betterXcloudFolderHandle;
    }

    // We have the path but not the handle, so we need to ask the user to select the folder again
    await this.selectFolder();
    return (window as any).betterXcloudFolderHandle;
  }
}

// Listen for settings changes to save preferences to folder if enabled
window.addEventListener(BxEvent.SETTINGS_CHANGED, async (e: any) => {
  const folderEnabled = getPref(PrefKey.PREFERENCES_FOLDER_ENABLED);

  // If folder preferences are enabled, save to folder on any settings change
  if (folderEnabled) {
    await FolderPreferences.savePreferencesToFolder();
  }
});
