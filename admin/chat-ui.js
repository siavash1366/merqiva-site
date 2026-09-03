(() => {
  const inbox = document.getElementById('chatInbox');
  const messages = document.getElementById('chatConversationMessages');
  const count = document.getElementById('chatCount');
  const detail = document.querySelector('.chat-detail-pane');

  if (!inbox) return;

  function decorateThreads() {
    const threads = [...inbox.querySelectorAll('.chat-thread')];
    if (count) count.textContent = `${threads.length} conversation${threads.length === 1 ? '' : 's'}`;
    threads.forEach((thread) => {
      thread.setAttribute('aria-pressed', thread.classList.contains('is-active') ? 'true' : 'false');
      thread.querySelector('p')?.setAttribute('dir', 'auto');
    });
  }

  function decorateMessages() {
    if (!messages) return;
    messages.querySelectorAll('.admin-chat-message > div:not(.admin-chat-role)').forEach((node) => {
      node.setAttribute('dir', 'auto');
    });
  }

  inbox.addEventListener('click', (event) => {
    const thread = event.target.closest('.chat-thread');
    if (!thread) return;
    inbox.querySelectorAll('.chat-thread').forEach((item) => {
      item.classList.remove('is-active');
      item.setAttribute('aria-pressed', 'false');
    });
    thread.classList.add('is-active');
    thread.setAttribute('aria-pressed', 'true');

    if (window.matchMedia('(max-width: 850px)').matches && detail) {
      window.setTimeout(() => detail.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 80);
    }
  });

  new MutationObserver(decorateThreads).observe(inbox, { childList: true, subtree: true });
  if (messages) new MutationObserver(decorateMessages).observe(messages, { childList: true, subtree: true });

  decorateThreads();
  decorateMessages();
})();
