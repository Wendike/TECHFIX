document.addEventListener('DOMContentLoaded', () => {
  const alerts = document.querySelectorAll('.alert');

  alerts.forEach((alert) => {
    setTimeout(() => {
      alert.style.opacity = '0';
      alert.style.transform = 'translateY(-6px)';

      setTimeout(() => {
        alert.style.display = 'none';
      }, 300);
    }, 4500);
  });

  const forms = document.querySelectorAll('form');

  forms.forEach((form) => {
    const dangerButton = form.querySelector('.btn-danger, .logout-btn');

    if (!dangerButton) {
      return;
    }

    form.addEventListener('submit', (event) => {
      const text = dangerButton.textContent.trim().toLowerCase();

      if (
        text.includes('remover') ||
        text.includes('devolver') ||
        text.includes('inativar') ||
        text.includes('cancelar')
      ) {
        const confirmed = window.confirm('Confirma essa ação?');

        if (!confirmed) {
          event.preventDefault();
        }
      }
    });
  });

  const activeMenu = document.querySelector('.sidebar-menu a.active');

  if (activeMenu) {
    activeMenu.scrollIntoView({
      block: 'center'
    });
  }
});
