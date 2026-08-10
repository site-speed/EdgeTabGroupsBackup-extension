// Utility helpers (MV3, Edge/Chromium).

export function promisifyChrome(obj, methodName, ...args) {
  return new Promise((resolve, reject) => {
    try {
      obj[methodName](...args, (result) => {
        const err = chrome.runtime.lastError;
        if (err) reject(err);
        else resolve(result);
      });
    } catch (e) {
      reject(e);
    }
  });
}

export function formatTimestampLocal(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function isInternalUrl(url) {
  if (!url) return true;
  const u = url.toLowerCase();
  return u.startsWith('edge://') || u.startsWith('chrome://') || u.startsWith('about:') || u.startsWith('chrome-extension://') || u.startsWith('ms-browser-extension://') || u.startsWith('file://');
}

export function sanitizeFolderName(name) {
  const raw = (name || '').trim();
  if (!raw) return 'Untitled';
  return raw.replace(/[\\/:*?\"<>|]/g, ' - ').replace(/\s+/g, ' ').trim();
}

export function normalizeSafeBackupFolderName(value, defaultName = 'EdgeTabGroupsBackup') {
  if (typeof value !== 'string') return defaultName;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized || normalized.toLowerCase() === 'undefined' || normalized.toLowerCase() === 'null') return defaultName;
  return sanitizeFolderName(normalized);
}

export function chooseDestination({ destinations, markerLabel, markerSource, windowOverrideId, lastUsedDestinationId, safeDestinationId }) {
  const available = (Array.isArray(destinations) ? destinations : []).filter((destination) => destination?.id != null);
  const availableIds = new Set(available.map((destination) => String(destination.id)));
  const markerMatches = markerSource === 'marker' && typeof markerLabel === 'string'
    ? available.filter((destination) => destination.title === markerLabel)
    : [];
  if (markerMatches.length === 1) {
    return { selectedDestinationId: String(markerMatches[0].id), selectionSource: 'marker-exact', markerMatchCount: 1 };
  }
  if (windowOverrideId != null && availableIds.has(String(windowOverrideId))) {
    return { selectedDestinationId: String(windowOverrideId), selectionSource: 'window-override', markerMatchCount: markerMatches.length };
  }
  if (lastUsedDestinationId != null && availableIds.has(String(lastUsedDestinationId))) {
    return { selectedDestinationId: String(lastUsedDestinationId), selectionSource: 'last-used', markerMatchCount: markerMatches.length };
  }
  if (safeDestinationId != null && availableIds.has(String(safeDestinationId))) {
    return { selectedDestinationId: String(safeDestinationId), selectionSource: 'safe-default', markerMatchCount: markerMatches.length };
  }
  if (available.length) {
    return { selectedDestinationId: String(available[0].id), selectionSource: 'first-available', markerMatchCount: markerMatches.length };
  }
  return { selectedDestinationId: null, selectionSource: 'none', markerMatchCount: markerMatches.length };
}

export function isWorkspaceContainerTitle(title) {
  const t = (title || '').toLowerCase();
  return t === 'workspaces favourites' || t === 'workspaces favorites' || t === 'workspaces';
}

export function isSpecialTopLevelTitle(title) {
  const t = (title || '').toLowerCase();
  return t === 'favourites bar' || t === 'favorites bar' || t === 'bookmarks bar' || t === 'other favourites' || t === 'other favorites' || t === 'mobile favourites' || t === 'mobile favorites' || t === 'workspaces favourites' || t === 'workspaces favorites' || t === 'workspaces';
}

export function isBackupFolderTitle(title) {
  return /^Backup \d{4}-\d{2}-\d{2}_\d{4}( \(\d+\))?(?: — .+)?$/.test(title || '');
}

export function backupTimestampKey(title) {
  const m = /^Backup (\d{4}-\d{2}-\d{2}_\d{4})/.exec(title || '');
  return m ? m[1] : null;
}
