import { PreferencesBackup } from "../utils/preferences-backup";
import { FolderPreferences } from "../utils/folder-preferences";
import {
  getPref,
  setPref,
} from "../utils/settings-storages/global-settings-storage";
import { PrefKey } from "@/enums/pref-keys";
import { t } from "@/utils/translation";

export class PreferencesBackupUI {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    // Create UI elements
    const backupSection = document.createElement("div");
    backupSection.className = "bx-settings-section";

    const header = document.createElement("h3");
    header.textContent = "Preferences Backup";
    backupSection.appendChild(header);

    const description = document.createElement("p");
    description.textContent =
      "Backup and restore your Better xCloud preferences.";
    backupSection.appendChild(description);

    // Backup button
    const backupButton = document.createElement("button");
    backupButton.className = "bx-button";
    backupButton.textContent = "Download Backup";
    backupButton.addEventListener("click", () => {
      PreferencesBackup.downloadBackup();
    });
    backupSection.appendChild(backupButton);

    // Restore section
    const restoreContainer = document.createElement("div");
    restoreContainer.className = "bx-restore-container";
    restoreContainer.style.marginTop = "15px";

    const restoreLabel = document.createElement("p");
    restoreLabel.textContent = "Restore from backup:";
    restoreContainer.appendChild(restoreLabel);

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";
    fileInput.style.display = "none";
    fileInput.id = "bx-restore-file-input";

    const restoreButton = document.createElement("button");
    restoreButton.className = "bx-button";
    restoreButton.textContent = "Upload Backup File";
    restoreButton.addEventListener("click", () => {
      fileInput.click();
    });

    const statusMessage = document.createElement("div");
    statusMessage.className = "bx-restore-status";
    statusMessage.style.marginTop = "10px";

    fileInput.addEventListener("change", async (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        statusMessage.textContent = "Processing backup file...";
        statusMessage.style.color = "";

        const result = await PreferencesBackup.processBackupFile(
          target.files[0]
        );

        if (result.success) {
          statusMessage.textContent = result.message;
          statusMessage.style.color = "green";
          // Reset file input
          fileInput.value = "";

          // Notify user they need to reload the page
          setTimeout(() => {
            statusMessage.textContent =
              "Please reload the page to apply restored preferences.";

            const reloadButton = document.createElement("button");
            reloadButton.className = "bx-button";
            reloadButton.textContent = "Reload Now";
            reloadButton.style.marginLeft = "10px";
            reloadButton.addEventListener("click", () => {
              window.location.reload();
            });

            statusMessage.appendChild(reloadButton);
          }, 1000);
        } else {
          statusMessage.textContent = result.message;
          statusMessage.style.color = "red";
          // Reset file input
          fileInput.value = "";
        }
      }
    });

    restoreContainer.appendChild(restoreButton);
    restoreContainer.appendChild(fileInput);
    restoreContainer.appendChild(statusMessage);

    backupSection.appendChild(restoreContainer);

    // Folder Preferences section
    const folderSection = document.createElement("div");
    folderSection.className = "bx-settings-section";
    folderSection.style.marginTop = "20px";

    const folderHeader = document.createElement("h3");
    folderHeader.textContent = t("preferences-folder-path");
    folderSection.appendChild(folderHeader);

    const folderDescription = document.createElement("p");
    folderDescription.textContent = t("preferences-folder-path-note");
    folderSection.appendChild(folderDescription);

    // Folder path display
    const folderPathDisplay = document.createElement("div");
    folderPathDisplay.className = "bx-folder-path";
    folderPathDisplay.style.marginBottom = "10px";
    folderPathDisplay.style.fontStyle = "italic";

    const updateFolderPathDisplay = () => {
      const folderPath = getPref(PrefKey.PREFERENCES_FOLDER_PATH);
      if (folderPath) {
        folderPathDisplay.textContent = t(
          "preferences-folder-selected"
        ).replace("{0}", folderPath);
      } else {
        folderPathDisplay.textContent = "No folder selected";
      }
    };

    updateFolderPathDisplay();
    folderSection.appendChild(folderPathDisplay);

    // Select folder button
    const selectFolderButton = document.createElement("button");
    selectFolderButton.className = "bx-button";
    selectFolderButton.textContent = t("preferences-folder-select");
    selectFolderButton.addEventListener("click", async () => {
      console.log("selectFolderButton clicked");
      const folderPath = await FolderPreferences.selectFolder();
      if (folderPath) {
        updateFolderPathDisplay();
        folderStatusMessage.textContent = t(
          "preferences-folder-selected"
        ).replace("{0}", folderPath);
        folderStatusMessage.style.color = "green";
      } else {
        folderStatusMessage.textContent = t("preferences-folder-error").replace(
          "{0}",
          "Could not access folder"
        );
        folderStatusMessage.style.color = "red";
      }
    });
    folderSection.appendChild(selectFolderButton);

    // Enable folder preferences checkbox
    const folderEnabledContainer = document.createElement("div");
    folderEnabledContainer.style.marginTop = "15px";

    const folderEnabledCheckbox = document.createElement("input");
    folderEnabledCheckbox.type = "checkbox";
    folderEnabledCheckbox.id = "bx-folder-enabled";
    folderEnabledCheckbox.checked = getPref(PrefKey.PREFERENCES_FOLDER_ENABLED);

    const folderEnabledLabel = document.createElement("label");
    folderEnabledLabel.htmlFor = "bx-folder-enabled";
    folderEnabledLabel.textContent = t("preferences-folder-enabled");
    folderEnabledLabel.style.marginLeft = "5px";

    folderEnabledCheckbox.addEventListener("change", () => {
      setPref(
        PrefKey.PREFERENCES_FOLDER_ENABLED,
        folderEnabledCheckbox.checked,
        true
      );

      if (folderEnabledCheckbox.checked) {
        // Save preferences to folder immediately when enabled
        FolderPreferences.savePreferencesToFolder().then((success) => {
          if (success) {
            folderStatusMessage.textContent = t("preferences-folder-success");
            folderStatusMessage.style.color = "green";
          } else {
            folderStatusMessage.textContent = t(
              "preferences-folder-error"
            ).replace("{0}", "Could not save to folder");
            folderStatusMessage.style.color = "red";
          }
        });
      }
    });

    folderEnabledContainer.appendChild(folderEnabledCheckbox);
    folderEnabledContainer.appendChild(folderEnabledLabel);
    folderSection.appendChild(folderEnabledContainer);

    const folderEnabledNote = document.createElement("p");
    folderEnabledNote.textContent = t("preferences-folder-enabled-note");
    folderEnabledNote.style.fontSize = "0.9em";
    folderEnabledNote.style.opacity = "0.8";
    folderEnabledNote.style.marginTop = "5px";
    folderSection.appendChild(folderEnabledNote);

    // Folder status message
    const folderStatusMessage = document.createElement("div");
    folderStatusMessage.className = "bx-folder-status";
    folderStatusMessage.style.marginTop = "10px";
    folderSection.appendChild(folderStatusMessage);

    // Add to container
    this.container.appendChild(backupSection);
    this.container.appendChild(folderSection);
  }
}
