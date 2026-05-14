# EdgeTabGroupsBackup (Edge extension)

Back up the **current Microsoft Edge window’s** tabs and tab groups into favourites/bookmarks.

## What it does

- Creates a backup folder named `Backup YYYY-mm-DD_hhMM` under the selected destination folder.
- Optionally appends a label when explicitly set using a marker tab, for example `Backup YYYY-mm-DD_hhMM — Coding`.
- Saves:
  - ungrouped tabs as bookmarks;
  - each tab group as a subfolder containing that group’s tab bookmarks.
- Shows a pre-backup preview with tab/group counts.
- Counts tabs that cannot be saved as favourites as **Unsaved**.
- Supports retention: keep only the newest _N_ backups per destination folder.
- Always lists a default backup destination in the popup. The default folder is created under **Other favourites / Other bookmarks** only when selected and used.
- Includes an Options-page cleanup tool for removing backup folders where Edge allows deletion.

## Screenshots

![EdgeTabGroupsBackup popup](assets/store-screenshot-popup-640x400.png)

![EdgeTabGroupsBackup Options page](assets/store-screenshot-options-640x400.png)

## Destination discovery

If Edge Workspaces are available, workspace favourites can appear in either layout:

- **Container layout**: a top-level folder named **Workspaces** / **Workspaces favourites/favorites** containing workspace folders.
- **Top-level layout**: workspace folders appear directly at the top level.

The extension supports both, and also always offers the configurable default backup destination under **Other favourites / Other bookmarks**.

## Window labels

Browser extension APIs do not expose a reliable user-visible Edge window name, so EdgeTabGroupsBackup uses explicit marker-tab labels instead.

- The **Window label (optional)** box is blank by default.
- Click **Set marker** to create/update a pinned extension marker tab such as `[ETGB: Coding]`.
- The marker tab is excluded from backups.
- Backup folder names only include an appended label when:
  - a marker tab exists; or
  - the window is InPrivate, in which case the fixed label is **In-Private**.
- InPrivate marker controls are disabled because marker tabs cannot be reliably created there.

## Unsaved tabs

Only normal web pages can be saved as bookmark/favourite URLs. Empty new tabs, extension pages, internal `edge://` / `chrome://` pages, and `file://` URLs are counted as **Unsaved** and skipped.

## Cleanup

The Options page includes cleanup tooling for:

- the configurable default backup folder under **Other favourites / Other bookmarks**;
- workspace folders, where Edge allows deletion.

For workspace folders, cleanup removes direct child backup folders matching `Backup YYYY-mm-DD_hhMM` first, then only attempts to delete the selected workspace folder if it is empty. Edge may block deletion of Workspace-managed folders.

## Install (Developer mode)

1. Download and unzip the release.
2. Open `edge://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the `public/` folder.

## Use

1. Open the window you want to back up.
2. Open the extension popup.
3. Select the destination folder.
4. Optionally enter a window label and click **Set marker**.
5. Review the preview counts.
6. Click **Run backup now**.

## Options

- **Maximum number of backups to keep (per destination)** (default: 5).
- **Default backup folder name** (default: `EdgeTabGroupsBackup`).
- **Workspace folder cleanup** (best-effort; Edge may block deletion of Workspace-managed folders).

## Privacy

This extension runs locally and uses Edge/Chromium extension APIs to read tabs/tab groups and write bookmarks. See [PRIVACY.md](PRIVACY.md).

Version: **v1.0.0**
