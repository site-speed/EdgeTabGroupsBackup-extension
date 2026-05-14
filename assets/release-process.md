# Release Process — EdgeTabGroupsBackup

## Goal

Copy the contents of `public/` from the private working repo into the public repository `EdgeTabGroupsBackup-extension`, then create a package suitable for Microsoft Edge Add-ons submission.

## Public repo bootstrap

1. Create public repo: `EdgeTabGroupsBackup-extension`.
2. Start with placeholder `README.md` and MIT `LICENSE` if desired.
3. Replace/update public repo contents from this repo’s `public/` folder.
4. Ensure no private repo notes, transcripts, internal workflows, or private `STATE.md` are copied.

## Copy checklist

Copy from private repo `public/` to public repo root:

- `manifest.json`
- `README.md`
- `PRIVACY.md`
- `SECURITY.md`
- `LICENSE`
- `src/`
- `icons/`
- `assets/`
- `.github/` issue templates

Do not copy private root files such as `STATE.md`, private `README.md`, or zipped snapshots.

## Release package checklist

1. Confirm `manifest.json` version is correct.
2. Confirm `README.md`, `assets/release-notes.md`, and store listing copy mention the same version.
3. Confirm `assets/store-logo-300.png` exists.
4. Confirm screenshots are 640×400 PNGs.
5. Zip the public repo contents so `manifest.json` is at the ZIP root, not inside a wrapper folder.
6. Upload the ZIP to Microsoft Partner Center.
7. Paste `assets/certification-notes.md` into certification notes, editing if needed.

## Screenshot checklist

Required/desired store screenshots:

- Popup page, resized/padded to 640×400: assets/store-screenshot-popup-640x400.png.
- Options page, resized/cropped to 640×400: assets/store-screenshot-options-640x400.png.

Avoid exposing private URLs, internal site names, or sensitive bookmark names.
