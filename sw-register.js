// versi harus sama dengan window.APP_VERSION di index.html
const APP_VERSION = window.APP_VERSION || 'v1';

const SW_URL   = 'sw.js';
const SW_SCOPE = '/absen-produksi/'; // repo GitHub Pages kamu

const toast = document.getElementById('updateToast');
const btnReload = document.getElementById('btnReload');

function showUpdateToast() {
  if (!toast) return;
  toast.style.display = 'flex';
}

if ('serviceWorker' in navigator) {
  const regPromise = navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });

  regPromise.then(async (reg) => {
    // paksa cek update secara periodik
    setInterval(() => reg.update(), 5 * 60 * 1000); // tiap 5 menit

    // ada SW baru -> minta siap ambil alih
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      if (!sw) return;
      sw.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateToast();
        }
      });
    });
  });

  // saat SW baru aktif -> reload otomatis
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    location.reload();
  });

  // tombol "Perbarui" -> kirim pesan skipWaiting
  btnReload?.addEventListener('click', async () => {
    const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
    reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  });

  // selipkan versi ke storage untuk invalidasi manual jika perlu
  localStorage.setItem('app_version', APP_VERSION);
}
