(() => {
  const id = document.documentElement.dataset.archive;
  const form = document.getElementById('archive-form');
  const password = document.getElementById('archive-password');
  const keyFile = document.getElementById('archive-keyfile');
  const passwordStage = document.getElementById('password-stage');
  const keyStage = document.getElementById('key-stage');
  const submit = document.getElementById('archive-submit');
  const status = document.getElementById('archive-status');
  const encoder = new TextEncoder();
  let acceptedPassword = null;
  let busy = false;
  const bytes = text => Uint8Array.from(atob(text), character => character.charCodeAt(0));
  const manifest = fetch('vault-' + id + '.json', { cache: 'no-store' }).then(async response => {
    if (!response.ok) throw new Error('Archive unavailable');
    const record = await response.json();
    if (record.id !== id || record.version !== 1 || record.rounds !== 210000) throw new Error('Invalid archive');
    return record;
  });
  manifest.catch(() => { status.textContent = '档案暂时未响应，请稍后重试。'; });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    if (!crypto?.subtle) { status.textContent = '请通过 HTTPS 或本地预览打开这个入口。'; return; }
    busy = true;
    submit.disabled = true;
    try {
      const record = await manifest;
      if (!acceptedPassword) {
        const candidate = password.value.trim();
        if (!candidate) return;
        acceptedPassword = candidate;
        password.value = '';
        password.disabled = true;
        passwordStage.hidden = true;
        keyStage.hidden = false;
        keyFile.required = true;
        submit.textContent = '解封档案';
        status.textContent = '已记录口令。请选择对应的本机密钥文件。';
        return;
      }
      const file = keyFile.files?.[0];
      if (!file || file.size > 256) { status.textContent = '需要对应的密钥文件。'; return; }
      const proof = (await file.text()).trim().toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(proof)) throw new Error('Invalid key file');
      status.textContent = '正在展开旧记录。';
      const material = await crypto.subtle.importKey('raw', encoder.encode(id + '\0' + acceptedPassword + '\0' + proof), 'PBKDF2', false, ['deriveKey']);
      const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: bytes(record.salt), iterations: record.rounds, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(record.iv), additionalData: encoder.encode('GN/history/' + id + '/v1'), tagLength: 128 }, key, bytes(record.ciphertext));
      const html = new TextDecoder('utf-8', { fatal: true }).decode(clear);
      acceptedPassword = null;
      document.open();
      document.write(html);
      document.close();
    } catch (_) {
      status.textContent = '解封失败，请检查口令与密钥文件。';
      acceptedPassword = null;
      password.disabled = false;
      passwordStage.hidden = false;
      keyStage.hidden = true;
      keyFile.required = false;
      keyFile.value = '';
      password.value = '';
      submit.textContent = '开始握手';
      password.focus();
    } finally {
      busy = false;
      submit.disabled = false;
    }
  });
})();
