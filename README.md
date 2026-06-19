# EdgeTabGroupsBackup (Edge extension)

<!-- start user badges -->
![PRs opened in last 30 days](https://img.shields.io/badge/PRs%20opened%20in%20last%2030%20days-0-green?labelColor=555) ![PRs closed in last 30 days](https://img.shields.io/badge/PRs%20closed%20in%20last%2030%20days-0-red?labelColor=555) ![Open PRs](https://img.shields.io/badge/Open%20PRs-0-blue?labelColor=555)

![Issues opened in last 30 days](https://img.shields.io/badge/Issues%20opened%20in%20last%2030%20days-0-green?labelColor=555) ![Issues closed in last 30 days](https://img.shields.io/badge/Issues%20closed%20in%20last%2030%20days-0-red?labelColor=555) ![Open issues](https://img.shields.io/badge/Open%20issues-0-blue?labelColor=555)

![Lines added (last 30 days)](https://img.shields.io/badge/Lines%20added%20(last%2030%20days)-69-green?labelColor=555) ![Lines deleted (last 30 days)](https://img.shields.io/badge/Lines%20deleted%20(last%2030%20days)-2-red?labelColor=555) ![Commits in last 30 days](https://img.shields.io/badge/Commits%20in%20last%2030%20days-2-blue?labelColor=555)

![Contributors (unique)](https://img.shields.io/badge/Contributors%20(unique)-1-blue?labelColor=555) ![Active contributors (last 30d)](https://img.shields.io/badge/Active%20contributors%20(last%2030d)-1-blue?labelColor=555)
<!-- end user badges -->

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

## Install from Microsoft Edge Add-ons

EdgeTabGroupsBackup is available from Microsoft Edge Add-ons:

[https://microsoftedge.microsoft.com/addons/detail/mebpcikopeeofpoafoicajeniemckkdd](https://microsoftedge.microsoft.com/addons/detail/mebpcikopeeofpoafoicajeniemckkdd)

To install from the Store:

1. Open the Microsoft Edge Add-ons listing.
2. Click **Get**.
3. Confirm the installation prompt in Microsoft Edge.
4. Pin EdgeTabGroupsBackup to the toolbar if you want quick access.
5. Open the extension popup and run your first backup.

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
