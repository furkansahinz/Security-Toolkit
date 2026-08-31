/**
 * Tool: Mail Otomasyonu
 * - Mod 1: Mail Adresi Engelleme
 * - Mod 2: IP Adresi Engelleme
 */

function initMailAutomation() {
    const modeMailBtn = document.getElementById('mailauto-mode-mail');
    const modeIpBtn = document.getElementById('mailauto-mode-ip');
    const toInput = document.getElementById('mailauto-to');
    const ccInput = document.getElementById('mailauto-cc');
    const subjectInput = document.getElementById('mailauto-subject');
    const mailBlockedTextarea = document.getElementById('mailauto-mail-blocked');
    const ipTable = document.getElementById('mailauto-ip-table');
    const addRowBtn = document.getElementById('mailauto-add-row-btn');
    const confirmCheckbox = document.getElementById('mailauto-confirm');
    const checkBtn = document.getElementById('mailauto-check-btn');
    const sendBtn = document.getElementById('mailauto-send-btn');
    const mailModeContainer = document.getElementById('mailauto-mail-mode');
    const ipModeContainer = document.getElementById('mailauto-ip-mode');

    const previewTextarea = document.getElementById('mailauto-preview');

    if (!modeMailBtn || !modeIpBtn || !toInput || !ccInput || !subjectInput || !mailBlockedTextarea || !ipTable || !addRowBtn || !confirmCheckbox || !checkBtn || !sendBtn || !previewTextarea) {
        return;
    }

    let currentMode = 'mail'; // 'mail' | 'ip'
    let lastDraft = null; // { to, cc, subject, body }

    function clearDraft() {
        lastDraft = null;
        if (previewTextarea) {
            previewTextarea.value = '';
        }
        validateForm();
    }

    function updateMode(mode) {
        currentMode = mode;

        if (mode === 'mail') {
            modeMailBtn.classList.remove('btn-secondary');
            modeMailBtn.classList.add('btn-primary');
            modeIpBtn.classList.remove('btn-primary');
            modeIpBtn.classList.add('btn-secondary');

            mailModeContainer.style.display = '';
            ipModeContainer.style.display = 'none';

            // Sabit To / CC ve subject base title
            toInput.value = 'x@x.com.tr';
            ccInput.value = 'z@z.com.tr';
            subjectInput.value = buildSubject('Engellenen Mail Adresleri', new Date());
        } else {
            modeIpBtn.classList.remove('btn-secondary');
            modeIpBtn.classList.add('btn-primary');
            modeMailBtn.classList.remove('btn-primary');
            modeMailBtn.classList.add('btn-secondary');

            mailModeContainer.style.display = 'none';
            ipModeContainer.style.display = '';

            toInput.value = 'y@y.com.tr';
            ccInput.value = 'z@z.com.tr';
            subjectInput.value = buildSubject('SMTP Üzerinden Engellenen IP Adresleri', new Date());

            // Eğer hiç satır yoksa bir tane ekleyelim
            if (getIpRows().length === 0) {
                addIpRow();
            }
        }

        clearDraft();
        validateForm();
    }

    function getIpRows() {
        return Array.from(ipTable.querySelectorAll('.mailauto-ip-row'));
    }

    function addIpRow() {
        const row = document.createElement('div');
        row.className = 'mailauto-ip-row';
        row.style.display = 'contents';

        // IP
        const ipCell = document.createElement('div');
        const ipInput = document.createElement('input');
        ipInput.type = 'text';
        ipInput.className = 'form-input';
        ipInput.placeholder = '192.0.2.1';
        ipInput.addEventListener('input', () => {
            clearDraft();
            validateForm();
        });
        ipCell.appendChild(ipInput);

        // Alert
        const alertCell = document.createElement('div');
        const alertSelect = document.createElement('select');
        alertSelect.className = 'form-input';
        ['a1', 'a2', 'b1', 'b2'].forEach(v => {
            const opt = document.createElement('option');
            opt.value = v;
            opt.textContent = v;
            alertSelect.appendChild(opt);
        });
        alertCell.appendChild(alertSelect);

        // Sebep
        const reasonCell = document.createElement('div');
        const reasonInput = document.createElement('input');
        reasonInput.type = 'text';
        reasonInput.className = 'form-input';
        reasonInput.placeholder = 'Sebep';
        reasonInput.addEventListener('input', () => {
            clearDraft();
            validateForm();
        });
        reasonCell.appendChild(reasonInput);

        // Checkpoint FW Kontrolü
        const fwCell = document.createElement('div');
        const fwSelect = document.createElement('select');
        fwSelect.className = 'form-input';
        ['Evet', 'Hayır'].forEach(v => {
            const opt = document.createElement('option');
            opt.value = v;
            opt.textContent = v;
            fwSelect.appendChild(opt);
        });
        fwCell.appendChild(fwSelect);

        // Sil butonu
        const actionsCell = document.createElement('div');
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn btn-secondary btn-small';
        deleteBtn.textContent = 'Sil';
        deleteBtn.addEventListener('click', () => {
            row.remove();
            clearDraft();
            validateForm();
        });
        actionsCell.appendChild(deleteBtn);

        row.appendChild(ipCell);
        row.appendChild(alertCell);
        row.appendChild(reasonCell);
        row.appendChild(fwCell);
        row.appendChild(actionsCell);

        ipTable.appendChild(row);
    }

    function validateForm() {
        let inputValid = true;

        if (currentMode === 'mail') {
            const lines = (mailBlockedTextarea.value || '')
                .split('\n')
                .map(l => l.trim())
                .filter(l => l.length > 0);
            if (lines.length === 0) {
                inputValid = false;
            }
        } else {
            const rows = getIpRows();
            if (rows.length === 0) {
                inputValid = false;
            } else {
                let hasError = false;
                rows.forEach(row => {
                    const ip = row.querySelector('input[type="text"]');
                    const reason = row.querySelectorAll('input[type="text"]')[1] || row.querySelector('input[type="text"]:nth-of-type(2)');
                    // Daha sağlam seçim:
                    const inputs = row.querySelectorAll('input[type="text"]');
                    const ipInput = inputs[0];
                    const reasonInput = inputs[1];
                    if (!ipInput || !ipInput.value.trim() || !reasonInput || !reasonInput.value.trim()) {
                        hasError = true;
                    }
                });
                if (hasError) {
                    inputValid = false;
                }
            }
        }

        const canSend = !!lastDraft && confirmCheckbox.checked && inputValid;
        sendBtn.disabled = !canSend;
    }

    function buildDraft() {
        const now = new Date();
        let baseTitle;

        if (currentMode === 'mail') {
            baseTitle = 'Engellenen Mail Adresleri';
        } else {
            baseTitle = 'SMTP Üzerinden Engellenen IP Adresleri';
        }

        const subject = buildSubject(baseTitle, now);

        let body = 'Merhaba\r\n\r\n';

        if (currentMode === 'mail') {
            const raw = mailBlockedTextarea.value || '';
            const lines = raw
                .split('\n')
                .map(l => l.trim())
                .filter(l => l.length > 0);

            if (lines.length === 0) {
                showToast('Lütfen en az bir mail adresi girin.', 'error');
                return null;
            }

            body += 'Aşağıdaki mail adresleri BM dc1 ve dc2 üzerinden bloklanmıştır.\r\n\r\n';
            lines.forEach(line => {
                body += `- ${line}\r\n`;
            });
            body += '\r\nİyi çalışmalar';
        } else {
            const rows = getIpRows();
            if (rows.length === 0) {
                showToast('Lütfen en az bir IP satırı ekleyin.', 'error');
                return null;
            }

            body += 'Aşağıdaki ip adresleri A10 üzerinden bloklanmıştır.\r\n\r\n';

            // Tabloyu plain text olarak üret
            const headers = ['IP', 'Alert', 'Sebep', 'Checkpoint FW Kontrolü'];
            const dataRows = [];

            rows.forEach(row => {
                const inputs = row.querySelectorAll('input[type="text"]');
                const selects = row.querySelectorAll('select');

                const ipVal = (inputs[0]?.value || '').trim();
                const reasonVal = (inputs[1]?.value || '').trim();
                const alertVal = selects[0]?.value || '';
                const fwVal = selects[1]?.value || '';

                if (!ipVal || !reasonVal) {
                    // Validation
                    return;
                }

                dataRows.push([ipVal, alertVal, reasonVal, fwVal]);
            });

            if (dataRows.length === 0) {
                showToast('Tüm IP satırları eksik veya hatalı. Lütfen kontrol edin.', 'error');
                return null;
            }

            const tableLines = buildPlainTextTable(headers, dataRows);
            tableLines.forEach(line => {
                body += line + '\r\n';
            });

            body += '\r\nİyi çalışmalar';
        }

        const to = toInput.value.trim();
        if (!to) {
            showToast('To alanı boş olamaz.', 'error');
            return null;
        }
        const cc = ccInput.value.trim();

        return { to, cc, subject, body };
    }

    function updatePreview(draft) {
        if (!previewTextarea || !draft) return;

        const lines = [];
        lines.push(`To: ${draft.to}`);
        if (draft.cc) {
            lines.push(`Cc: ${draft.cc}`);
        }
        lines.push(`Subject: ${draft.subject}`);
        lines.push('');
        lines.push(draft.body.replace(/\r\n/g, '\n'));

        const preview = lines.join('\n');

        previewTextarea.value = preview;
    }

    function handleCheck() {
        const draft = buildDraft();
        if (!draft) {
            lastDraft = null;
            updatePreview(null);
            validateForm();
            return;
        }

        lastDraft = draft;
        subjectInput.value = draft.subject;
        updatePreview(draft);
        showToast('Taslak oluşturuldu. Göndermeden önce son kez kontrol edin.', 'info');
        validateForm();
    }

    function handleSend() {
        if (sendBtn.disabled) {
            return;
        }

        if (!lastDraft) {
            showToast('Önce taslak oluşturun.', 'error');
            return;
        }

        const params = [];
        if (lastDraft.cc) {
            params.push('cc=' + encodeURIComponent(lastDraft.cc));
        }
        params.push('subject=' + encodeURIComponent(lastDraft.subject));
        params.push('body=' + encodeURIComponent(lastDraft.body));

        const query = params.join('&');
        const mailto = `mailto:${encodeURIComponent(lastDraft.to)}?${query}`;
        window.location.href = mailto;
    }

    // Event bindings
    modeMailBtn.addEventListener('click', () => updateMode('mail'));
    modeIpBtn.addEventListener('click', () => updateMode('ip'));
    addRowBtn.addEventListener('click', () => {
        addIpRow();
        validateForm();
    });
    confirmCheckbox.addEventListener('change', validateForm);
    mailBlockedTextarea.addEventListener('input', () => {
        clearDraft();
        validateForm();
    });
    checkBtn.addEventListener('click', handleCheck);
    sendBtn.addEventListener('click', handleSend);

    // Başlangıç modu
    updateMode('mail');
}

/**
 * TR formatında tarih: DD.MM.YYYY
 */
function formatDateTR(date) {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}.${m}.${y}`;
}

/**
 * Zaman etiketini döndür: Gece / Sabah / Akşam
 */
function getTimeLabel(date) {
    const hour = date.getHours();
    const minute = date.getMinutes();

    if (hour < 1) {
        return 'Akşam';
    }

    if (hour < 8 || (hour === 8 && minute < 50)) {
        return 'Gece';
    }

    if (hour < 17 || (hour === 17 && minute === 0)) {
        return 'Sabah';
    }

    return 'Akşam';
}

/**
 * Subject üret: "${baseTitle} | DD.MM.YYYY <etiket>"
 */
function buildSubject(baseTitle, date) {
    const dateStr = formatDateTR(date);
    const label = getTimeLabel(date);
    return `${baseTitle} | ${dateStr} ${label}`;
}

/**
 * Plain text tablo üret (| ayırıcı, hizalı)
 */
function buildPlainTextTable(headers, rows) {
    const colCount = headers.length;
    const widths = new Array(colCount).fill(0);

    // Header genişlikleri
    headers.forEach((h, idx) => {
        widths[idx] = Math.max(widths[idx], h.length);
    });

    // Data genişlikleri
    rows.forEach(row => {
        row.forEach((cell, idx) => {
            widths[idx] = Math.max(widths[idx], (cell || '').length);
        });
    });

    function padCell(text, width) {
        const t = (text || '').toString();
        if (t.length >= width) return t;
        return t + ' '.repeat(width - t.length);
    }

    const lines = [];

    // Header satırı
    const headerLine = headers.map((h, idx) => padCell(h, widths[idx])).join(' | ');
    lines.push(headerLine);

    // Ayırıcı
    const separator = widths.map(w => '-'.repeat(w)).join('-+-');
    lines.push(separator);

    // Veri satırları
    rows.forEach(row => {
        const line = row.map((cell, idx) => padCell(cell || '', widths[idx])).join(' | ');
        lines.push(line);
    });

    return lines;
}


