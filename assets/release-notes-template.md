# Release Notes Template — EdgeTabGroupsBackup

Use this template for each public GitHub release and Edge Add-ons package update.

## EdgeTabGroupsBackup v{version}

### Changed

- {one-line change 1}
- {one-line change 2}

### Notes

- This extension runs locally in Microsoft Edge and stores backups in favourites/bookmarks.
- Internal browser pages, extension pages, blank new tabs, and `file://` URLs are counted as **Unsaved** and skipped.
- Edge may block deletion of Workspace-managed folders; cleanup is best-effort.

### Install / update

1. Download the release ZIP.
2. For local testing, load the unpacked `public/` folder from `edge://extensions/`.
3. For store distribution, upload the packaged extension ZIP in Microsoft Partner Center.
