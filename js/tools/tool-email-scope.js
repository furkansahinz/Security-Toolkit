/**
 * Tool 7: Email Scope Expander
 * Email adreslerinden wildcard kapsam üretir
 */

function initEmailScope() {
    const input = document.getElementById('email-input');
    const expandBtn = document.getElementById('email-expand-btn');
    const clearBtn = document.getElementById('email-clear-btn');
    const output = document.getElementById('email-output');
    const copyBtn = document.getElementById('email-copy-btn');
    
    // Expand
    expandBtn.addEventListener('click', () => {
        const inputText = input.value;
        if (!inputText.trim()) {
            showToast('Lütfen email adresleri girin', 'error');
            return;
        }
        
        const tokens = tokenize(inputText);
        const scopes = new Set();
        
        tokens.forEach(token => {
            if (isEmail(token)) {
                const domain = extractDomainFromEmail(token);
                const baseDomain = getBaseDomain(domain);
                const scope = `*@*.${baseDomain}`;
                scopes.add(scope);
            }
        });
        
        if (scopes.size === 0) {
            showToast('Geçerli email adresi bulunamadı', 'error');
            return;
        }
        
        output.value = [...scopes].join('\n');
        showToast(`${scopes.size} wildcard kapsam oluşturuldu`, 'success');
    });
    
    // Clear
    clearBtn.addEventListener('click', () => {
        input.value = '';
        output.value = '';
        showToast('Temizlendi', 'info');
    });
    
    // Copy
    copyBtn.addEventListener('click', (e) => {
        if (output.value) {
            copyText(output.value, e.target);
        } else {
            showToast('Kopyalanacak içerik yok', 'error');
        }
    });
}




