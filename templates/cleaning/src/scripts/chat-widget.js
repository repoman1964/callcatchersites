// Text-the-owner chat widget. Endpoint + place id come from #chat-widget data attributes.
(function(){const widget = document.getElementById('chat-widget');
const websiteNotifyUrl = widget?.dataset.notifyUrl ?? '';
const googlePlaceId = widget?.dataset.placeId ?? '';
const smsTo = widget?.dataset.smsTo ?? '';

  const toggle  = document.getElementById('chat-toggle');
  const panel   = document.getElementById('chat-panel');
  const close   = document.getElementById('chat-close');
  const form    = /** @type {HTMLFormElement | null} */ (document.getElementById('chat-form'));
  const success = document.getElementById('chat-success');

  function openPanel() {
    panel?.setAttribute('aria-hidden', 'false');
    toggle?.setAttribute('aria-expanded', 'true');
    // Move focus into panel for a11y
    const firstInput = /** @type {HTMLElement | null} */ (panel?.querySelector('input, textarea, button:not(#chat-close)'));
    firstInput?.focus();
  }

  function closePanel() {
    panel?.setAttribute('aria-hidden', 'true');
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.focus();
  }

  toggle?.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    isOpen ? closePanel() : openPanel();
  });

  close?.addEventListener('click', closePanel);

  // Close on Escape
  panel?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  });

  // Form submit — POST to notify API, then show success state
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);

    if (String(data.get('bot-trap') ?? '').trim()) return;

    const name    = String(data.get('name') ?? '').trim();
    const phone   = String(data.get('phone') ?? '').trim();
    const message = String(data.get('message') ?? '').trim();

    // Basic validation
    let valid = true;
    const nameInput  = form.querySelector('#chat-name');
    const phoneInput = form.querySelector('#chat-phone');

    if (!name && nameInput)  { nameInput.classList.add('is-invalid');  nameInput.focus(); valid = false; }
    else nameInput?.classList.remove('is-invalid');

    if (!phone && phoneInput) {
      phoneInput.classList.add('is-invalid');
      if (valid) phoneInput.focus();
      valid = false;
    } else phoneInput?.classList.remove('is-invalid');

    if (!valid) return;

    // No notify endpoint (preview sites): open the visitor's SMS app addressed to the business.
    if (!websiteNotifyUrl && smsTo) {
      const body = [`Hi, this is ${name}.`, message].filter(Boolean).join(' ');
      window.location.href = `sms:${smsTo}?&body=${encodeURIComponent(body)}`;
      return;
    }

    // Hide form, show success
    form.hidden = true;
    if (success) success.hidden = false;

    const sms = [
      'New website chat lead',
      '',
      `Name: ${name}`,
      `Phone: ${phone}`,
      ...(message ? ['', message] : []),
    ].join('\n').slice(0, 1600);

    if (!websiteNotifyUrl) return;
    try {
      await fetch(websiteNotifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googlePlaceId,
          message: sms,
          source: 'chat_widget',
          leadPhone: phone,
        }),
      });
    } catch {
      // Success UI already shown; submission is best-effort
    }
  });

  // Clear invalid class on input
  form?.querySelectorAll('.chat-input').forEach((input) => {
    input.addEventListener('input', () => input.classList.remove('is-invalid'));
  });
})();
