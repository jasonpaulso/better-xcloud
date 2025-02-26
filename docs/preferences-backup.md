# Preferences Backup and Restore System

## Overview

The Preferences Backup and Restore system allows users to:

1. Create a backup of their Better xCloud preferences
2. Download the backup as a JSON file
3. Restore preferences from a previously created backup file

This system is implemented through three main components:

- `PreferencesBackup` utility class for handling backup/restore operations
- `PreferencesBackupUI` component for providing a user interface
- `PreferencesDb` class for accessing IndexedDB data

## How to Use

### As a User

1. Open the Better xCloud settings dialog
2. Navigate to the "Preferences Backup" tab
3. To create a backup:
   - Click the "Download Backup" button
   - The backup will be saved as a JSON file to your device
4. To restore from a backup:
   - Click the "Upload Backup File" button
   - Select your backup JSON file
   - After successful restoration, click "Reload Now" to apply the changes

### For Developers

#### Adding More Settings to Backup

The backup system is designed to be easily extensible. To add more localStorage keys to be included in backups:

1. Open `src/utils/preferences-backup.ts`
2. Find the `LOCALSTORAGE_KEYS` array
3. Add your localStorage key to the array:

```typescript
const LOCALSTORAGE_KEYS = [
  StorageKey.GLOBAL,
  StorageKey.CONTROLLER_SHORTCUTS,
  StorageKey.USER_AGENT,
  // Add your key here, for example:
  StorageKey.YOUR_FEATURE_KEY,
];
```

To add more IndexedDB stores to be included in backups:

1. Open `src/utils/preferences-backup.ts`
2. Find the `LOCALDB_STORES` array
3. Add your store name to the array:

```typescript
const LOCALDB_STORES = [
  "mkb_presets",
  "touch_controller_layouts",
  "controller_vibration",
  // Add your store name here, for example:
  "your_feature_store",
];
```

4. Make sure your store is also added to the `PreferencesDb` class:

```typescript
// In src/utils/local-db/preferences-db.ts
static readonly STORES = [
  "mkb_presets",
  "touch_controller_layouts",
  "controller_vibration",
  // Add your store name here
  "your_feature_store",
];
```

#### Creating a Backup Programmatically

```typescript
import { PreferencesBackup } from "../utils/preferences-backup";

// Create and download a backup
await PreferencesBackup.downloadBackup();

// Or just create a backup object without downloading
const backupData = await PreferencesBackup.createBackup();
console.log(backupData);
```

#### Restoring from a Backup Programmatically

```typescript
import { PreferencesBackup } from "../utils/preferences-backup";

// Restore from a backup object
const backupData = {
  version: 1,
  timestamp: "2023-07-15T12:34:56.789Z",
  data: {
    localStorage: {
      better_xcloud_user_agent: {
        /* user agent settings */
      },
      // Other localStorage settings...
    },
    localDb: {
      mkb_presets: [
        /* MKB preset objects */
      ],
      // Other IndexedDB data...
    },
  },
};

const result = await PreferencesBackup.restoreBackup(backupData);
if (result.success) {
  console.log("Backup restored successfully");
} else {
  console.error("Failed to restore backup:", result.message);
}
```

#### Processing a Backup File

```typescript
import { PreferencesBackup } from "../utils/preferences-backup";

// Process a backup file (e.g., from a file input)
const fileInput = document.getElementById("fileInput") as HTMLInputElement;
fileInput.addEventListener("change", async (e) => {
  if (fileInput.files && fileInput.files.length > 0) {
    const result = await PreferencesBackup.processBackupFile(
      fileInput.files[0]
    );
    if (result.success) {
      console.log("Backup restored successfully");
    } else {
      console.error("Failed to restore backup:", result.message);
    }
  }
});
```

## Architecture

### PreferencesBackup Class

Located in `src/utils/preferences-backup.ts`, this utility class handles:

- Creating backups of preferences stored in localStorage and IndexedDB
- Downloading backups as JSON files
- Restoring preferences from backup files or objects
- Processing uploaded backup files

### PreferencesDb Class

Located in `src/utils/local-db/preferences-db.ts`, this class:

- Extends the abstract `LocalDb` class
- Provides methods to access and modify IndexedDB data
- Handles the backup and restore operations for IndexedDB stores

### PreferencesBackupUI Component

Located in `src/components/preferences-backup.ts`, this UI component provides:

- A button to download the current preferences as a backup
- A file upload mechanism to restore preferences from a backup
- Status messages to inform the user about the restore process

### Integration with Settings Dialog

The backup functionality is integrated into the settings dialog as a dedicated tab, making it easily accessible to users.

## Backup Format

The backup is stored as a JSON file with the following structure:

```json
{
  "version": 1,
  "timestamp": "2023-07-15T12:34:56.789Z",
  "data": {
    "localStorage": {
      "better_xcloud_user_agent": {
        "profile": "DEFAULT",
        "custom": ""
      },
      "better_xcloud": {
        /* Global settings */
      },
      "better_xcloud_controller_shortcuts": {
        /* Controller shortcuts */
      }
    },
    "localDb": {
      "mkb_presets": [
        /* MKB preset objects */
      ],
      "touch_controller_layouts": [
        /* Touch controller layout objects */
      ],
      "controller_vibration": [
        /* Controller vibration settings */
      ]
    }
  }
}
```

- `version`: The version of the backup format (for future compatibility)
- `timestamp`: When the backup was created
- `data.localStorage`: Object containing all backed up localStorage preferences
- `data.localDb`: Object containing all backed up IndexedDB data

## Future Enhancements

Potential improvements to consider:

1. Add cloud storage integration for backups
2. Implement automatic backups at regular intervals
3. Add selective restore (choose which settings to restore)
4. Add backup encryption for sensitive settings
5. Add backup versioning and migration support
