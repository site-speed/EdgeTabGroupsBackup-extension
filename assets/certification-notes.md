EdgeTabGroupsBackup backs up the current Microsoft Edge window’s normal web tabs and tab groups into the user’s favourites/bookmarks.

Suggested test steps:
1. Install/load the extension and pin it to the toolbar.
2. Open a normal Edge window with several normal web pages. Optionally create one or more tab groups.
3. Open the extension popup. Confirm the destination dropdown includes the default destination marked with a star.
4. Click Run backup now. Confirm a timestamped Backup folder is created under the selected destination in favourites/bookmarks.
5. Confirm ungrouped tabs are saved as bookmarks and tab groups are saved as subfolders.
6. In Options, change the maximum backups value and confirm older backup folders are pruned after repeated backups.
7. Optionally enter a Window label and click Set marker. Confirm a pinned marker tab appears and the next backup folder includes that label.
8. Open an InPrivate window, if extension use is allowed there. Confirm the label is fixed to In-Private and marker controls are disabled/hidden.
9. Open edge:// or blank new-tab pages. Confirm these are counted as Unsaved and are not saved as bookmarks.

Notes:
- The extension has no backend and does not transmit tab/bookmark data to the author.
- Internal browser pages, extension pages, blank new tabs, and file:// URLs cannot be saved as normal favourites and are intentionally skipped.
- Edge may block deletion of Workspace-managed folders; cleanup is best-effort and reports blocked deletions.
