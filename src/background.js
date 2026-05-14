import { promisifyChrome, formatTimestampLocal, isInternalUrl, sanitizeFolderName, isWorkspaceContainerTitle, isSpecialTopLevelTitle, isBackupFolderTitle, backupTimestampKey } from './utils.js';

const STORAGE_KEYS = { windowOverrides: 'windowOverrides', lastUsedWorkspaceId: 'lastUsedWorkspaceId', maxBackupsPerWorkspace: 'maxBackupsPerWorkspace', safeBackupFolderName: 'safeBackupFolderName' };
const DEFAULT_MAX_BACKUPS = 5;
const DEFAULT_SAFE_BACKUP_FOLDER_NAME = 'EdgeTabGroupsBackup';
const SAFE_DESTINATION_ID = '__edge_tab_groups_backup_safe_destination__';
const OTHER_BOOKMARKS_TITLES = ['other favourites', 'other favorites', 'other bookmarks'];

async function getBookmarkTree() { return await promisifyChrome(chrome.bookmarks, 'getTree'); }

async function getBookmarkRootNode() {
  const tree = await getBookmarkTree();
  return tree?.[0] || null;
}

async function getTopLevelFolders() {
  const root = await getBookmarkRootNode();
  return (root?.children || []).filter((n) => !n.url);
}

async function isIncognitoWindow(windowId) {
  if (windowId == null) return false;
  try {
    const win = await promisifyChrome(chrome.windows, 'get', windowId);
    return !!win?.incognito;
  } catch {}
  try {
    const tabs = await promisifyChrome(chrome.tabs, 'query', { windowId });
    return !!tabs?.[0]?.incognito;
  } catch {}
  return false;
}


function findOtherBookmarksFolder(topLevelFolders) {
  return topLevelFolders.find((n) => !n.url && (OTHER_BOOKMARKS_TITLES.includes((n.title || '').toLowerCase()) || n.folderType === 'other')) || null;
}

async function getSafeBackupFolderNameSetting() {
  const store = await promisifyChrome(chrome.storage.local, 'get', [STORAGE_KEYS.safeBackupFolderName]);
  const value = String(store[STORAGE_KEYS.safeBackupFolderName] || '').replace(/\s+/g, ' ').trim();
  return value || DEFAULT_SAFE_BACKUP_FOLDER_NAME;
}

async function setSafeBackupFolderNameSetting(newName) {
  const cleaned = sanitizeFolderName(String(newName || '').replace(/\s+/g, ' ').trim()) || DEFAULT_SAFE_BACKUP_FOLDER_NAME;
  const oldName = await getSafeBackupFolderNameSetting();
  const top = await getTopLevelFolders();
  const other = findOtherBookmarksFolder(top);
  if (other && oldName !== cleaned) {
    const children = await promisifyChrome(chrome.bookmarks, 'getChildren', other.id);
    const oldFolder = children.find((n) => !n.url && n.title === oldName);
    const newFolder = children.find((n) => !n.url && n.title === cleaned);
    if (oldFolder && !newFolder) await promisifyChrome(chrome.bookmarks, 'update', oldFolder.id, { title: cleaned });
  }
  await promisifyChrome(chrome.storage.local, 'set', { [STORAGE_KEYS.safeBackupFolderName]: cleaned });
  return cleaned;
}

async function findSafeFolderUnderOther() {
  const safeName = await getSafeBackupFolderNameSetting();
  const top = await getTopLevelFolders();
  const other = findOtherBookmarksFolder(top);
  if (!other) return null;
  const children = await promisifyChrome(chrome.bookmarks, 'getChildren', other.id);
  const folder = children.find((n) => !n.url && n.title === safeName) || null;
  return folder ? { ...folder, parentTitle: other.title, cleanupKind: 'safe-root' } : null;
}

async function ensureSafeBackupRoot() {
  const safeName = await getSafeBackupFolderNameSetting();
  const root = await getBookmarkRootNode();
  const top = (root?.children || []).filter((n) => !n.url);
  const other = findOtherBookmarksFolder(top);
  if (!other) return { ...(top[0] || root), isSafeDestination: true, fallbackLocation: 'root-fallback' };
  const otherChildren = await promisifyChrome(chrome.bookmarks, 'getChildren', other.id);
  const existingUnderOther = otherChildren.find((n) => !n.url && n.title === safeName);
  if (existingUnderOther) return { ...existingUnderOther, isSafeDestination: true, fallbackLocation: 'other-existing' };
  try {
    const createdUnderOther = await promisifyChrome(chrome.bookmarks, 'create', { parentId: other.id, title: safeName });
    return { ...createdUnderOther, isSafeDestination: true, fallbackLocation: 'other-created' };
  } catch {}
  return { ...other, isSafeDestination: true, fallbackLocation: 'other-direct' };
}

async function findWorkspaceContainers() {
  const top = await getTopLevelFolders();
  return top.filter((n) => !n.url && isWorkspaceContainerTitle(n.title));
}

async function discoverWorkspaces() {
  const top = await getTopLevelFolders();
  const safeName = await getSafeBackupFolderNameSetting();
  const safeDestination = { id: SAFE_DESTINATION_ID, title: safeName, isSafeDestination: true, parentTitle: 'Other favourites' };
  const container = top.find((n) => !n.url && isWorkspaceContainerTitle(n.title)) || null;
  if (container) {
    const children = await promisifyChrome(chrome.bookmarks, 'getChildren', container.id);
    const workspaces = children.filter((n) => !n.url);
    return { mode: workspaces.length ? 'container' : 'safe-only', container, workspaces: [safeDestination, ...workspaces], safeDestinationId: SAFE_DESTINATION_ID, fallback: !workspaces.length };
  }
  const workspaces = top.filter((n) => !n.url && !isSpecialTopLevelTitle(n.title));
  if (workspaces.length) return { mode: 'top-level', container, workspaces: [safeDestination, ...workspaces], safeDestinationId: SAFE_DESTINATION_ID, fallback: false };
  return { mode: 'fallback', container: null, workspaces: [safeDestination], safeDestinationId: SAFE_DESTINATION_ID, fallback: true };
}

async function getMaxBackupsSetting() {
  const store = await promisifyChrome(chrome.storage.local, 'get', [STORAGE_KEYS.maxBackupsPerWorkspace]);
  const n = Number(store[STORAGE_KEYS.maxBackupsPerWorkspace]);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_MAX_BACKUPS;
  return Math.floor(n);
}

async function setMaxBackupsSetting(n) {
  const v = Math.max(1, Math.floor(Number(n) || DEFAULT_MAX_BACKUPS));
  await promisifyChrome(chrome.storage.local, 'set', { [STORAGE_KEYS.maxBackupsPerWorkspace]: v });
  return v;
}

async function getWorkspaceIdForWindow(windowId) {
  const store = await promisifyChrome(chrome.storage.local, 'get', [STORAGE_KEYS.windowOverrides, STORAGE_KEYS.lastUsedWorkspaceId]);
  const overrides = store[STORAGE_KEYS.windowOverrides] || {};
  const override = overrides[String(windowId)];
  if (override) return override;
  if (store[STORAGE_KEYS.lastUsedWorkspaceId]) return store[STORAGE_KEYS.lastUsedWorkspaceId];
  return null;
}

async function setWindowOverride(windowId, workspaceFolderId) {
  const store = await promisifyChrome(chrome.storage.local, 'get', [STORAGE_KEYS.windowOverrides]);
  const overrides = store[STORAGE_KEYS.windowOverrides] || {};
  overrides[String(windowId)] = workspaceFolderId;
  await promisifyChrome(chrome.storage.local, 'set', { [STORAGE_KEYS.windowOverrides]: overrides, [STORAGE_KEYS.lastUsedWorkspaceId]: workspaceFolderId });
}

async function resolveDestinationFolderId(destinationId) {
  if (destinationId === SAFE_DESTINATION_ID) {
    const safe = await ensureSafeBackupRoot();
    return safe.id;
  }
  return destinationId;
}

async function findExistingChildFolder(parentId, title) {
  const children = await promisifyChrome(chrome.bookmarks, 'getChildren', parentId);
  return children.find((n) => !n.url && n.title === title) || null;
}

async function createUniqueFolder(parentId, desiredTitle) {
  let title = desiredTitle;
  let suffix = 2;
  while (await findExistingChildFolder(parentId, title)) title = `${desiredTitle} (${suffix++})`;
  return await promisifyChrome(chrome.bookmarks, 'create', { parentId, title });
}

async function enforceRetention(workspaceFolderId, maxBackups) {
  const children = await promisifyChrome(chrome.bookmarks, 'getChildren', workspaceFolderId);
  const backups = children.filter((n) => !n.url && isBackupFolderTitle(n.title)).map((n) => ({ id: n.id, key: backupTimestampKey(n.title) || '', dateAdded: n.dateAdded || 0 }));
  backups.sort((a, b) => (a.key !== b.key ? (a.key < b.key ? 1 : -1) : (b.dateAdded || 0) - (a.dateAdded || 0)));
  const toDelete = backups.slice(maxBackups);
  for (const b of toDelete) await promisifyChrome(chrome.bookmarks, 'removeTree', b.id);
  return { kept: Math.min(backups.length, maxBackups), deleted: toDelete.length };
}

function computePreviewFromTabs(tabs) {
  let total = 0;
  let ungrouped = 0;
  const groups = new Set();
  for (const t of tabs) {
    if (!t.url || isInternalUrl(t.url)) continue;
    total += 1;
    if (typeof t.groupId === 'number' && t.groupId !== -1) groups.add(t.groupId);
    else ungrouped += 1;
  }
  return { totalTabs: total, ungroupedTabs: ungrouped, groupCount: groups.size };
}

function shortLabel(value, maxLength = 80) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function markerUrlForLabel(label) {
  const qs = new URLSearchParams({ label: shortLabel(label, 80) });
  return chrome.runtime.getURL(`src/window-marker.html?${qs.toString()}`);
}

function isMarkerUrl(url) {
  return String(url || '').startsWith(chrome.runtime.getURL('src/window-marker.html'));
}

function isBackupableTab(tab) {
  return !!tab.url && !isMarkerUrl(tab.url) && !isInternalUrl(tab.url);
}

function isUnsavedTab(tab) {
  return !isMarkerUrl(tab.url) && !isBackupableTab(tab);
}

function computePreviewFromTabsAll(tabs) {
  let total = 0;
  let ungrouped = 0;
  let unsaved = 0;
  const groups = new Set();
  for (const t of tabs) {
    if (isMarkerUrl(t.url)) continue;
    if (!isBackupableTab(t)) { unsaved += 1; continue; }
    total += 1;
    if (typeof t.groupId === 'number' && t.groupId !== -1) groups.add(t.groupId);
    else ungrouped += 1;
  }
  return { totalTabs: total, ungroupedTabs: ungrouped, groupCount: groups.size, unsavedTabs: unsaved };
}

async function inferWindowLabel(windowId, tabs, preferredLabel=null, incognito=false) {
  if (incognito) return { label: 'In-Private', source: 'incognito' };
  for (const tab of tabs) {
    if (!isMarkerUrl(tab.url)) continue;
    try {
      const url = new URL(tab.url);
      const label = url.searchParams.get('label');
      if (label) return { label: shortLabel(label), source: 'marker' };
    } catch {}
  }
  return { label: null, source: 'none' };
}

async function setWindowMarker(windowId, label) {
  if (await isIncognitoWindow(windowId)) throw new Error('Marker tabs are disabled for InPrivate windows. Backups will be labelled In-Private.');
  const clean = shortLabel(label);
  if (!clean) throw new Error('Enter a window label first.');
  const tabs = await promisifyChrome(chrome.tabs, 'query', { windowId });
  const existing = tabs.find((tab) => isMarkerUrl(tab.url));
  const url = markerUrlForLabel(clean);
  if (existing) {
    await promisifyChrome(chrome.tabs, 'update', existing.id, { url, pinned: true, active: false });
    return { label: clean, tabId: existing.id, updated: true };
  }
  const created = await promisifyChrome(chrome.tabs, 'create', { windowId, url, pinned: true, active: false, index: 0 });
  return { label: clean, tabId: created.id, updated: false };
}

async function countDirectChildren(folderId) {
  const children = await promisifyChrome(chrome.bookmarks, 'getChildren', folderId);
  return children.length;
}

async function listWorkspaceContainerFolders() {
  const top = await getTopLevelFolders();
  const containers = await findWorkspaceContainers();
  const folders = [];
  for (const container of containers) {
    const children = await promisifyChrome(chrome.bookmarks, 'getChildren', container.id);
    for (const child of children.filter((n) => !n.url)) {
      folders.push({ id: child.id, title: child.title, parentId: container.id, parentTitle: container.title, childCount: await countDirectChildren(child.id), cleanupKind: 'workspace-folder', unmodifiable: child.unmodifiable || null });
    }
  }
  const topLevelWorkspaceFolders = top.filter((n) => !n.url && !isSpecialTopLevelTitle(n.title));
  for (const folder of topLevelWorkspaceFolders) {
    folders.push({ id: folder.id, title: folder.title, parentId: folder.parentId, parentTitle: 'Top level', childCount: await countDirectChildren(folder.id), cleanupKind: 'workspace-folder', unmodifiable: folder.unmodifiable || null });
  }
  const safe = await findSafeFolderUnderOther();
  if (safe) folders.push({ id: safe.id, title: safe.title, parentId: safe.parentId, parentTitle: safe.parentTitle, childCount: await countDirectChildren(safe.id), cleanupKind: 'safe-root', unmodifiable: safe.unmodifiable || null });
  const seen = new Set();
  const uniqueFolders = folders.filter((folder) => {
    if (seen.has(folder.id)) return false;
    seen.add(folder.id);
    return true;
  });
  uniqueFolders.sort((a, b) => `${a.parentTitle}/${a.title}`.localeCompare(`${b.parentTitle}/${b.title}`));
  return { containers: containers.map((n) => ({ id: n.id, title: n.title, childCount: null })), folders: uniqueFolders };
}

async function deleteWorkspaceContainerFolder(folderId, expectedTitle) {
  const nodes = await promisifyChrome(chrome.bookmarks, 'get', folderId);
  const node = nodes?.[0];
  if (!node || node.url) throw new Error('Selected bookmark node is not a folder.');
  if (node.title !== expectedTitle) throw new Error('Folder title changed before cleanup. Refresh and try again.');
  const parents = node.parentId ? await promisifyChrome(chrome.bookmarks, 'get', node.parentId) : [];
  const parent = parents?.[0] || null;
  const parentTitle = parent?.title || 'Top level';
  const parentIsOther = parent && !parent.url && (OTHER_BOOKMARKS_TITLES.includes((parent.title || '').toLowerCase()) || parent.folderType === 'other');
  const safeName = await getSafeBackupFolderNameSetting();
  if (node.title === safeName && parentIsOther) {
    await promisifyChrome(chrome.bookmarks, 'removeTree', node.id);
    return { deletedId: node.id, deletedTitle: node.title, parentId: parent.id, parentTitle, deletedBackupFolders: 0, deletedFolder: true, cleanupKind: 'safe-root' };
  }
  const children = await promisifyChrome(chrome.bookmarks, 'getChildren', node.id);
  const backupFolders = children.filter((child) => !child.url && isBackupFolderTitle(child.title));
  for (const backup of backupFolders) await promisifyChrome(chrome.bookmarks, 'removeTree', backup.id);
  const remaining = await promisifyChrome(chrome.bookmarks, 'getChildren', node.id);
  if (remaining.length > 0) return { deletedId: null, deletedTitle: node.title, parentId: parent?.id || null, parentTitle, deletedBackupFolders: backupFolders.length, deletedFolder: false, remainingItems: remaining.length, cleanupKind: 'workspace-folder' };
  try {
    await promisifyChrome(chrome.bookmarks, 'removeTree', node.id);
    return { deletedId: node.id, deletedTitle: node.title, parentId: parent?.id || null, parentTitle, deletedBackupFolders: backupFolders.length, deletedFolder: true, remainingItems: 0, cleanupKind: 'workspace-folder' };
  } catch (err) {
    return { deletedId: null, deletedTitle: node.title, parentId: parent?.id || null, parentTitle, deletedBackupFolders: backupFolders.length, deletedFolder: false, remainingItems: 0, folderDeleteError: String(err?.message || err), cleanupKind: 'workspace-folder' };
  }
}

async function backupWindowToWorkspace({ windowId, workspaceFolderId }) {
  const destinationFolderId = await resolveDestinationFolderId(workspaceFolderId);
  const maxBackups = await getMaxBackupsSetting();
  const tabs = await promisifyChrome(chrome.tabs, 'query', { windowId });
  const incognito = await isIncognitoWindow(windowId);
  const labelInfo = await inferWindowLabel(windowId, tabs, null, incognito);
  const windowLabel = labelInfo.label;
  const preview = computePreviewFromTabsAll(tabs);
  const safeLabel = sanitizeFolderName(windowLabel || '');
  const backupFolderTitle = `Backup ${formatTimestampLocal(new Date())}${safeLabel ? ` — ${safeLabel}` : ''}`;
  const backupFolder = await createUniqueFolder(destinationFolderId, backupFolderTitle);
  const grouped = new Map();
  const ungrouped = [];
  for (const t of tabs) {
    if (!isBackupableTab(t)) continue;
    if (typeof t.groupId === 'number' && t.groupId !== -1) {
      if (!grouped.has(t.groupId)) grouped.set(t.groupId, []);
      grouped.get(t.groupId).push(t);
    } else {
      ungrouped.push(t);
    }
  }
  let totalBookmarks = 0;
  ungrouped.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  for (const t of ungrouped) {
    await promisifyChrome(chrome.bookmarks, 'create', { parentId: backupFolder.id, title: (t.title || t.url), url: t.url });
    totalBookmarks += 1;
  }
  for (const [groupId, groupTabs] of grouped.entries()) {
    let group;
    try { group = await promisifyChrome(chrome.tabGroups, 'get', groupId); } catch { group = { title: `Tab Group ${groupId}` }; }
    const groupFolder = await createUniqueFolder(backupFolder.id, sanitizeFolderName(group.title || `Tab Group ${groupId}`));
    const sortedGroupTabs = groupTabs.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    for (const t of sortedGroupTabs) {
      await promisifyChrome(chrome.bookmarks, 'create', { parentId: groupFolder.id, title: (t.title || t.url), url: t.url });
      totalBookmarks += 1;
    }
  }
  const retention = await enforceRetention(destinationFolderId, maxBackups);
  return { backupFolderTitle: backupFolder.title, createdUngrouped: ungrouped.length, createdGroups: grouped.size, totalBookmarks, unsavedTabs: preview.unsavedTabs, windowLabel, labelSource: labelInfo.source, incognito, totalTabs: preview.totalTabs, ungroupedTabs: preview.ungroupedTabs, groupCount: preview.groupCount, retention };
}

function slimNode(n) {
  const out = { id: n.id, title: n.title, url: n.url, parentId: n.parentId };
  for (const k of ['folderType', 'unmodifiable', 'dateAdded', 'dateGroupModified']) if (n && n[k] !== undefined) out[k] = n[k];
  if (n && n.children) out.children = n.children.map(slimNode);
  return out;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg?.type) {
      case 'GET_CONTEXT': {
        const windowId = msg.windowId;
        const selectedWorkspaceId = windowId != null ? await getWorkspaceIdForWindow(windowId) : null;
        const { mode, container, workspaces, safeDestinationId } = await discoverWorkspaces();
        const maxBackups = await getMaxBackupsSetting();
        const safeBackupFolderName = await getSafeBackupFolderNameSetting();
        const incognito = await isIncognitoWindow(windowId);
        sendResponse({ ok: true, windowId, selectedWorkspaceId, mode, container, workspaces, safeDestinationId, maxBackups, safeBackupFolderName, incognito });
        break;
      }
      case 'GET_WORKSPACE_CONTAINER_FOLDERS': {
        const cleanup = await listWorkspaceContainerFolders();
        sendResponse({ ok: true, ...cleanup });
        break;
      }
      case 'DELETE_WORKSPACE_CONTAINER_FOLDER': {
        const result = await deleteWorkspaceContainerFolder(msg.folderId, msg.title);
        sendResponse({ ok: true, result });
        break;
      }
      case 'PREVIEW_WINDOW': {
        const windowId = msg.windowId;
        if (windowId == null) return sendResponse({ ok: false, error: 'Missing windowId for preview.' });
        const tabs = await promisifyChrome(chrome.tabs, 'query', { windowId });
        const incognito = await isIncognitoWindow(windowId);
        const labelInfo = await inferWindowLabel(windowId, tabs, null, incognito);
        sendResponse({ ok: true, preview: { ...computePreviewFromTabsAll(tabs), windowLabel: labelInfo.label, labelSource: labelInfo.source, incognito } });
        break;
      }
      case 'SET_WINDOW_MARKER': {
        const windowId = msg.windowId;
        if (windowId == null) return sendResponse({ ok: false, error: 'Missing windowId for marker.' });
        const result = await setWindowMarker(windowId, msg.label);
        sendResponse({ ok: true, result });
        break;
      }
      case 'GET_SETTINGS': {
        sendResponse({ ok: true, maxBackups: await getMaxBackupsSetting(), safeBackupFolderName: await getSafeBackupFolderNameSetting() });
        break;
      }
      case 'SET_SETTINGS': {
        const maxBackups = await setMaxBackupsSetting(msg.maxBackups);
        const safeBackupFolderName = await setSafeBackupFolderNameSetting(msg.safeBackupFolderName);
        sendResponse({ ok: true, maxBackups, safeBackupFolderName });
        break;
      }
      case 'SET_WINDOW_WORKSPACE': {
        const windowId = msg.windowId;
        if (windowId == null) return sendResponse({ ok: false, error: 'Missing windowId for mapping.' });
        await setWindowOverride(windowId, msg.workspaceFolderId);
        sendResponse({ ok: true });
        break;
      }
      case 'RUN_BACKUP': {
        const windowId = msg.windowId;
        if (windowId == null) return sendResponse({ ok: false, error: 'Missing windowId for backup.' });
        const workspaceFolderId = msg.workspaceFolderId || await getWorkspaceIdForWindow(windowId);
        if (!workspaceFolderId) return sendResponse({ ok: false, error: 'No destination selected.' });
        const result = await backupWindowToWorkspace({ windowId, workspaceFolderId });
        await promisifyChrome(chrome.storage.local, 'set', { [STORAGE_KEYS.lastUsedWorkspaceId]: workspaceFolderId });
        sendResponse({ ok: true, result, workspaceFolderId });
        break;
      }
      case 'DIAG_BOOKMARK_ROOTS': {
        const top = await getTopLevelFolders();
        sendResponse({ ok: true, roots: top.map(slimNode) });
        break;
      }
      case 'DIAG_BOOKMARK_TREE_SLIM': {
        const tree = await getBookmarkTree();
        sendResponse({ ok: true, tree: slimNode(tree?.[0] || {}) });
        break;
      }
      default:
        sendResponse({ ok: false, error: 'Unknown message type' });
    }
  })().catch((err) => sendResponse({ ok: false, error: String(err?.message || err), detail: err }));
  return true;
});
