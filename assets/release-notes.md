### EdgeTabGroupsBackup v1.1.0

- Automatically selects a unique destination whose name exactly matches the current window marker.
- Gives marker matches priority whenever the popup opens, while still allowing a temporary manual choice in the open popup.
- Detects an out-of-sync popup, Options page, and background worker and offers a safe extension reload instead of displaying `undefined` or `Unknown message type`.
- Repairs missing or corrupted default-folder settings without requiring the folder to be created manually.
- Keeps the default destination lazy: its favourites folder is still created only when first used for a backup.
- Prevents unlabelled backups from incorrectly gaining an `Untitled` suffix.
- Adds dependency-free behavioral tests for message compatibility, settings migration, marker creation, and destination selection.
