const params = new URLSearchParams(location.search);
const label = (params.get('label') || 'Window').replace(/\s+/g, ' ').trim();
document.title = `[ETGB: ${label}]`;
document.getElementById('label').textContent = `[ETGB: ${label}]`;
