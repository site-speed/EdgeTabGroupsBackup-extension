const elMax = document.getElementById('maxBackups');
const elSafeName = document.getElementById('safeBackupFolderName');
const elStatus = document.getElementById('status');
const btnSave = document.getElementById('save');
const elCleanupSelect = document.getElementById('cleanupFolderSelect');
const elCleanupInfo = document.getElementById('cleanupFolderInfo');
const elCleanupConfirm = document.getElementById('cleanupConfirm');
const btnCleanupRefresh = document.getElementById('cleanupRefresh');
const btnCleanupDelete = document.getElementById('cleanupDelete');
const elCleanupStatus = document.getElementById('cleanupStatus');
const elCleanupDetails = document.getElementById('cleanupDetails');
let cleanupFolders = [];
function setStatus(msg, kind='') {
  elStatus.textContent = msg;
  elStatus.className = `status ${kind}`;
}
function setCleanupStatus(msg, kind='') {
  elCleanupStatus.textContent = msg;
  elCleanupStatus.className = `status ${kind}`;
}
async function send(type, payload={}) { return await chrome.runtime.sendMessage({ type, ...payload }); }
async function load() {
  setStatus('Loading…');
  const res = await send('GET_SETTINGS');
  if (!res.ok) return setStatus(`Error: ${res.error}`, 'err');
  elMax.value = res.maxBackups;
  elSafeName.value = res.safeBackupFolderName;
  setStatus('');
}
function selectedCleanupFolder() {
  return cleanupFolders.find((item) => String(item.id) === String(elCleanupSelect.value)) || null;
}
function updateCleanupDeleteState() {
  const selected = selectedCleanupFolder();
  const typed = elCleanupConfirm.value;
  btnCleanupDelete.disabled = !selected || typed !== selected.title;
  if (!selected) {
    elCleanupInfo.textContent = 'No folder selected.';
    return;
  }
  const itemWord = selected.childCount === 1 ? 'item' : 'items';
  elCleanupInfo.textContent = `“${selected.title}” in “${selected.parentTitle}” — ${selected.childCount} ${itemWord}${selected.cleanupKind === 'safe-root' ? ' • recursive delete' : ' • deletes matching backup subfolders first'}`;
}
function renderCleanupFolders(folders) {
  cleanupFolders = folders || [];
  elCleanupSelect.innerHTML = '';
  for (const folder of cleanupFolders) {
    const opt = document.createElement('option');
    const itemWord = folder.childCount === 1 ? 'item' : 'items';
    opt.value = folder.id;
    opt.textContent = `${folder.title} — ${folder.childCount} ${itemWord}`;
    elCleanupSelect.appendChild(opt);
  }
  elCleanupConfirm.value = '';
  updateCleanupDeleteState();
}
async function refreshCleanupFolders() {
  setCleanupStatus('Loading cleanup folders…');
  elCleanupDetails.value = '';
  const res = await send('GET_WORKSPACE_CONTAINER_FOLDERS');
  if (!res.ok) {
    setCleanupStatus(`Error: ${res.error}`, 'err');
    elCleanupDetails.value = JSON.stringify(res, null, 2);
    return;
  }
  renderCleanupFolders(res.folders || []);
  const count = res.folders?.length || 0;
  setCleanupStatus(count ? `Found ${count} folder${count === 1 ? '' : 's'} available for cleanup.` : 'No folders found for cleanup.');
}
btnSave.addEventListener('click', async () => {
  const maxBackups = Number(elMax.value);
  const safeBackupFolderName = elSafeName.value.trim();
  setStatus('Saving…');
  const res = await send('SET_SETTINGS', { maxBackups, safeBackupFolderName });
  if (!res.ok) return setStatus(`Error: ${res.error}`, 'err');
  elMax.value = res.maxBackups;
  elSafeName.value = res.safeBackupFolderName;
  setStatus('Saved ✅', 'ok');
  await refreshCleanupFolders();
  setTimeout(() => setStatus(''), 1500);
});
elCleanupSelect.addEventListener('change', updateCleanupDeleteState);
elCleanupConfirm.addEventListener('input', updateCleanupDeleteState);
btnCleanupRefresh.addEventListener('click', () => refreshCleanupFolders().catch((e) => setCleanupStatus(`Error: ${e.message || e}`, 'err')));
btnCleanupDelete.addEventListener('click', async () => {
  const selected = selectedCleanupFolder();
  if (!selected) return;
  if (elCleanupConfirm.value !== selected.title) return;
  btnCleanupDelete.disabled = true;
  setCleanupStatus(`Cleaning “${selected.title}”…`);
  elCleanupDetails.value = '';
  const res = await send('DELETE_WORKSPACE_CONTAINER_FOLDER', { folderId: selected.id, title: selected.title });
  if (!res.ok) {
    setCleanupStatus(`Unable to clean folder: ${res.error}`, 'err');
    elCleanupDetails.value = JSON.stringify(res, null, 2);
    updateCleanupDeleteState();
    return;
  }
  await refreshCleanupFolders();
  const r = res.result;
  const backupText = r.deletedBackupFolders ? ` Removed ${r.deletedBackupFolders} backup folder${r.deletedBackupFolders === 1 ? '' : 's'}.` : '';
  const folderText = r.deletedFolder ? ` Deleted “${r.deletedTitle}” from “${r.parentTitle}”.` : ` Kept “${r.deletedTitle}”${r.remainingItems ? ` (${r.remainingItems} non-backup item${r.remainingItems === 1 ? '' : 's'} remain)` : ''}.`;
  const warningText = r.folderDeleteError ? ` Edge blocked deleting the empty workspace folder: ${r.folderDeleteError}` : '';
  setCleanupStatus(`${folderText}${backupText}${warningText} ✅`, r.folderDeleteError ? 'err' : 'ok');
  elCleanupDetails.value = JSON.stringify(r, null, 2);
});
load().catch((e) => setStatus(`Error: ${e.message || e}`, 'err'));
refreshCleanupFolders().catch((e) => setCleanupStatus(`Error: ${e.message || e}`, 'err'));
