(function() {
  document.documentElement.style.background = '#000000';
  if (document.body) {
    document.body.style.background = '#000000';
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.style.background = '#000000';
    }, { once: true });
  }
  if (localStorage.getItem('PataKeja_darkMode') === 'true') {
    document.documentElement.classList.add('dark');
  }
})();
