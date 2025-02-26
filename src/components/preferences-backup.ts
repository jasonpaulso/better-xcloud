import { PreferencesBackup } from "../utils/preferences-backup";

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

    // Add to container
    this.container.appendChild(backupSection);
  }
}
