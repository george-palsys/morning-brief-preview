/* Runs before CSS; no network, HTML injection, or inline code. */
(() => {
  try {
    const theme = localStorage.getItem('mb-theme');
    if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  } catch { /* Storage may be blocked: CSS continues to follow the OS. */ }
})();
