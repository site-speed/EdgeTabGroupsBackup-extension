const elSelect = document.getElementById('workspaceSelect');
const elStatus = document.getElementById('status');
const elDetails = document.getElementById('details');
const elContext = document.getElementById('context');
const elDiagMode = document.getElementById('diagMode');
const elContainerHint = document.getElementById('containerHint');
const elPreviewHint = document.getElementById('previewHint');
const elVersionLabel = document.getElementById('versionLabel');
const elWindowLabelInput = document.getElementById('windowLabelInput');
const btnSetMarker = document.getElementById('setMarker');
const btnOpenOptions = document.getElementById('openOptions');
const btnRun = document.getElementById('runBackup');
const btnDiagRoots = document.getElementById('diagRoots');
const btnDiagTree = document.getElementById('diagTree');
const elDiagOut = document.getElementById('diagOut');
let ctx = null;
let applying = false;
function setStatus(msg, kind='info') {
  elStatus.textContent = msg;
  elStatus.className = `status ${kind === 'ok' ? 'ok' : kind === 'err' ? 'err' : ''}`;
}
async function send(type, payload={}) { return await chrome.runtime.sendMessage({ type, ...payload }); }
async function getCurrentWindowIdFromPopup() {
  const currentTabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (currentTabs?.[0]?.windowId != null) return currentTabs[0].windowId;
  const focusedTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return focusedTabs?.[0]?.windowId;
}
function renderWorkspaces() {
  const workspaces = ctx?.workspaces || [];
  elSelect.innerHTML = '';
  [...workspaces].sort((a, b) => {
    if (a.isSafeDestination && !b.isSafeDestination) return -1;
    if (!a.isSafeDestination && b.isSafeDestination) return 1;
    return (a.title || '').localeCompare(b.title || '');
  }).forEach((ws) => {
    const opt = document.createElement('option');
    opt.value = ws.id;
    opt.textContent = ws.isSafeDestination ? `${ws.title} ⭐` : ws.title;
    elSelect.appendChild(opt);
  });
  if (ctx?.selectedWorkspaceId) elSelect.value = String(ctx.selectedWorkspaceId);
  if (!elSelect.value && elSelect.options.length) elSelect.selectedIndex = 0;
}
function formatPreview(preview) {
  if (!preview) return '';
  const windowLine = preview.windowLabel ? `Window: ${preview.windowLabel}
` : '';
  const unsaved = preview.unsavedTabs ? ` • Unsaved: ${preview.unsavedTabs}` : '';
  return `${windowLine}Total: ${preview.totalTabs} • Ungrouped: ${preview.ungroupedTabs} • Groups: ${preview.groupCount}${unsaved}`;
}
function applyIncognitoUiState(isIncognito) {
  if (!elWindowLabelInput || !btnSetMarker) return;
  if (isIncognito) {
    elWindowLabelInput.value = 'In-Private';
    elWindowLabelInput.disabled = true;
    btnSetMarker.disabled = true;
    btnSetMarker.style.display = 'none';
    btnSetMarker.title = 'Marker tabs are disabled for InPrivate windows.';
  } else {
    elWindowLabelInput.disabled = false;
    btnSetMarker.disabled = false;
    btnSetMarker.style.display = '';
    btnSetMarker.title = '';
  }
}
function syncWindowLabelInputFromPreview(preview) {
  if (!elWindowLabelInput) return;
  if (preview?.incognito) { elWindowLabelInput.value = 'In-Private'; return; }
  if (preview?.labelSource === 'marker') { elWindowLabelInput.value = preview.windowLabel || ''; return; }
  elWindowLabelInput.value = '';
}

async function refreshPreview(windowId) {
  elPreviewHint.textContent = 'Checking current window…';
  const res = await send('PREVIEW_WINDOW', { windowId, workspaceFolderId: elSelect.value });
  if (!res.ok) { elPreviewHint.textContent = ''; return; }
  elPreviewHint.textContent = formatPreview(res.preview);
  applyIncognitoUiState(!!res.preview?.incognito);
  syncWindowLabelInputFromPreview(res.preview);
}
async function refreshMainContext() {
  const windowId = await getCurrentWindowIdFromPopup();
  const res = await send('GET_CONTEXT', { windowId });
  if (!res.ok) return setStatus(`Error: ${res.error}`, 'err');
  ctx = res;
  applyIncognitoUiState(!!ctx.incognito);
  renderWorkspaces();
  const modeLabel = ctx.mode === 'container' ? 'container (Workspaces folder)' : ctx.mode === 'fallback' ? 'fallback/default' : ctx.mode === 'safe-only' ? 'default only' : 'top-level (folders at root)';
  elDiagMode.textContent = `Discovery: ${modeLabel}`;
  elContext.textContent = `Window #${windowId ?? 'n/a'} • Mode: ${ctx.mode} • Container: ${ctx.container?.title || 'n/a'} • Folders: ${ctx.workspaces?.length ?? 0} • Max: ${ctx.maxBackups}`;
  elContainerHint.textContent = ctx.mode === 'container' ? (ctx.container ? `From “${ctx.container.title}” plus default` : 'From “Workspaces” plus default') : ctx.mode === 'fallback' || ctx.mode === 'safe-only' ? `⭐ Using default “${ctx.safeBackupFolderName}” under “Other favourites”.` : 'From top-level folders plus default';
  if (!ctx.workspaces || ctx.workspaces.length === 0) setStatus('No destination folders found. Open Diagnostics to investigate.', 'err');
  else setStatus('Ready.');
  if (windowId != null) await refreshPreview(windowId);
  else elPreviewHint.textContent = '';
}
async function applySelectionToWindow() {
  if (!ctx || !elSelect.value) return;
  if (applying) return;
  applying = true;
  try {
    const windowId = await getCurrentWindowIdFromPopup();
    if (windowId == null) { setStatus('Error: could not determine current window.', 'err'); return; }
    const res = await send('SET_WINDOW_WORKSPACE', { windowId, workspaceFolderId: elSelect.value });
    if (!res.ok) { setStatus(`Error: ${res.error}`, 'err'); return; }
    await refreshPreview(windowId);
    setStatus('Destination set for this window ✅', 'ok');
    setTimeout(() => { if (ctx) setStatus('Ready.'); }, 900);
  } finally {
    applying = false;
  }
}
async function init() {
  const manifest = chrome.runtime.getManifest();
  if (elVersionLabel) elVersionLabel.textContent = `v${manifest.version}`;
  setStatus('Loading…');
  await refreshMainContext();
}
elSelect.addEventListener('change', () => applySelectionToWindow().catch((e) => setStatus(`Error: ${e.message || e}`, 'err')));
btnOpenOptions.addEventListener('click', () => chrome.runtime.openOptionsPage());
btnSetMarker.addEventListener('click', async () => {
  if (btnSetMarker.disabled) return;
  const windowId = await getCurrentWindowIdFromPopup();
  if (windowId == null) return setStatus('Error: could not determine current window.', 'err');
  const label = elWindowLabelInput.value.trim();
  setStatus('Setting marker tab…');
  const res = await send('SET_WINDOW_MARKER', { windowId, label });
  if (!res.ok) return setStatus(`Error: ${res.error}`, 'err');
  elWindowLabelInput.value = res.result.label;
  await refreshPreview(windowId);
  setStatus(`Window marker set: ${res.result.label} ✅`, 'ok');
});
btnRun.addEventListener('click', async () => {
  const windowId = await getCurrentWindowIdFromPopup();
  if (windowId == null) return setStatus('Error: could not determine current window.', 'err');
  setStatus('Running backup…');
  elDetails.textContent = '';
  const res = await send('RUN_BACKUP', { windowId, workspaceFolderId: elSelect.value });
  if (!res.ok) return setStatus(`Error: ${res.error}`, 'err');
  const r = res.result;
  setStatus(`Done: ${r.backupFolderTitle} ✅`, 'ok');
  const pruned = r.retention && r.retention.deleted ? ` • Pruned: ${r.retention.deleted}` : '';
  const unsaved = r.unsavedTabs ? ` • Unsaved: ${r.unsavedTabs}` : '';
  elDetails.textContent = `Total: ${r.totalTabs ?? r.totalBookmarks} • Ungrouped: ${r.ungroupedTabs ?? r.createdUngrouped} • Groups: ${r.groupCount ?? r.createdGroups}${unsaved}${pruned}`;
  await refreshPreview(windowId);
});
btnDiagRoots.addEventListener('click', async () => { const res = await send('DIAG_BOOKMARK_ROOTS'); elDiagOut.value = res.ok ? JSON.stringify(res.roots, null, 2) : `Error: ${res.error}`; });
btnDiagTree.addEventListener('click', async () => { const res = await send('DIAG_BOOKMARK_TREE_SLIM'); elDiagOut.value = res.ok ? JSON.stringify(res.tree, null, 2) : `Error: ${res.error}`; });
init().catch((e) => setStatus(`Error: ${e.message || e}`, 'err'));
