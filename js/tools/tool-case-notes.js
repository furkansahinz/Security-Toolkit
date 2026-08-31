/**
 * Tool 8: Case Note Scratchpad
 * LocalStorage ile kalıcı not alma
 */

const CASE_NOTES_KEY = 'securityToolkit_caseNotes';

function initCaseNotes() {
    const textarea = document.getElementById('case-notes-textarea');
    const clearBtn = document.getElementById('case-notes-clear-btn');
    const exportBtn = document.getElementById('case-notes-export-btn');
    const copyBtn = document.getElementById('case-notes-copy-btn');
    const charCount = document.getElementById('case-notes-char-count');
    
    let saveTimeout = null;
    
    // Load saved notes
    const saved = localStorage.getItem(CASE_NOTES_KEY);
    if (saved) {
        textarea.value = saved;
        updateCharCount();
    }
    
    // Auto-save (debounced)
    textarea.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            localStorage.setItem(CASE_NOTES_KEY, textarea.value);
            showToast('Kaydedildi', 'success');
        }, 300);
        updateCharCount();
    });
    
    // Clear
    clearBtn.addEventListener('click', () => {
        if (confirm('Tüm notları silmek istediğinize emin misiniz?')) {
            textarea.value = '';
            localStorage.removeItem(CASE_NOTES_KEY);
            updateCharCount();
            showToast('Notlar temizlendi', 'info');
        }
    });
    
    // Export
    exportBtn.addEventListener('click', () => {
        const content = textarea.value;
        if (!content.trim()) {
            showToast('Dışa aktarılacak not yok', 'error');
            return;
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `case-notes-${timestamp}.txt`;
        downloadTextFile(content, filename);
    });
    
    // Copy
    copyBtn.addEventListener('click', (e) => {
        if (textarea.value) {
            copyText(textarea.value, e.target);
        } else {
            showToast('Kopyalanacak içerik yok', 'error');
        }
    });
    
    function updateCharCount() {
        const count = textarea.value.length;
        charCount.textContent = `${count} karakter`;
    }
}

