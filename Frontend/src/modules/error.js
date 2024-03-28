export function showOfflinePage() {
    document.getElementById('content-main').style.display = 'none';
    document.getElementById('content-loading').style.display = 'none';
    document.getElementById('content-offline').style.display = 'flex';
}