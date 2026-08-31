/**
 * Tool 5: IOC Defanger / Refanger
 * IP ve URL'leri tıklanamaz hale getirir veya geri çevirir
 */

function initDefangRefang() {
    const input = document.getElementById('defang-input');
    const defangBtn = document.getElementById('defang-btn');
    const refangBtn = document.getElementById('refang-btn');
    const clearBtn = document.getElementById('defang-clear-btn');
    const output = document.getElementById('defang-output');
    const copyBtn = document.getElementById('defang-copy-btn');
    
    // Defang
    defangBtn.addEventListener('click', () => {
        const inputText = input.value;
        if (!inputText.trim()) {
            showToast('Lütfen metin girin', 'error');
            return;
        }
        
        const defanged = defangText(inputText);
        output.value = defanged;
        showToast('Defang işlemi tamamlandı', 'success');
    });
    
    // Refang
    refangBtn.addEventListener('click', () => {
        const inputText = input.value;
        if (!inputText.trim()) {
            showToast('Lütfen metin girin', 'error');
            return;
        }
        
        const refanged = refangText(inputText);
        output.value = refanged;
        showToast('Refang işlemi tamamlandı', 'success');
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

/**
 * Defang text (make IOCs non-clickable)
 */
function defangText(text) {
    let result = text;
    
    // Replace http:// with hxxp://
    result = result.replace(/http:\/\//gi, 'hxxp://');
    
    // Replace https:// with hxxps://
    result = result.replace(/https:\/\//gi, 'hxxps://');
    
    // Replace ALL dots with [.]
    // This will defang IPs, domains, and everything
    result = result.replace(/\./g, '[.]');
    
    return result;
}

/**
 * Refang text (restore IOCs)
 */
function refangText(text) {
    let result = text;
    
    // Replace hxxp:// with http://
    result = result.replace(/hxxp:\/\//gi, 'http://');
    
    // Replace hxxps:// with https://
    result = result.replace(/hxxps:\/\//gi, 'https://');
    
    // Replace [.] with .
    result = result.replace(/\[\.\]/g, '.');
    
    return result;
}

