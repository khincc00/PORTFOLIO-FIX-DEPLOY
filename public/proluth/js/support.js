/* Popup dukungan: muncul saat halaman dibuka. Dukungan sepenuhnya opsional, jadi bisa ditutup kapan saja. */
(function () {
  const dlg = document.getElementById('supportDialog');
  if (!dlg || typeof dlg.showModal !== 'function') return;

  dlg.showModal();
  dlg.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', () => dlg.close()));
  // Klik di luar kartu (area gelap) ikut menutup popup. Esc sudah ditangani browser
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
})();
