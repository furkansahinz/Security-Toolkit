/**
 * Tool 6: Duplicate Delete
 * Tekrarlanan verileri kaldırır
 */

function initDuplicateDelete() {
    const input = document.getElementById('duplicate-input');
    const processBtn = document.getElementById('duplicate-process-btn');
    const clearBtn = document.getElementById('duplicate-clear-btn');
    const output = document.getElementById('duplicate-output');
    const copyBtn = document.getElementById('duplicate-copy-btn');
    const sortAscBtn = document.getElementById('duplicate-sort-asc-btn');
    const sortDescBtn = document.getElementById('duplicate-sort-desc-btn');
    const statsDiv = document.getElementById('duplicate-stats');
    
    // Process
    processBtn.addEventListener('click', () => {
        const inputText = input.value;
        if (!inputText.trim()) {
            showToast('Lütfen veri girin', 'error');
            return;
        }
        
        const tokens = tokenize(inputText);
        const originalCount = tokens.length;
        const unique = dedupe(tokens);
        const duplicateCount = originalCount - unique.length;
        
        // Output: her token yeni satırda
        output.value = unique.join('\n');
        
        // Stats
        statsDiv.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Toplam:</span>
                <span class="stat-value">${originalCount}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Benzersiz:</span>
                <span class="stat-value">${unique.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Kaldırılan:</span>
                <span class="stat-value stat-danger">${duplicateCount}</span>
            </div>
        `;
        statsDiv.style.display = 'flex';
        
        // Sıralama butonlarını göster
        if (unique.length > 0) {
            sortAscBtn.style.display = 'inline-block';
            sortDescBtn.style.display = 'inline-block';
        }
        
        showToast(`${duplicateCount} tekrar kaldırıldı`, 'success');
    });
    
    // Sort Ascending (Küçükten Büyüğe)
    sortAscBtn.addEventListener('click', () => {
        if (!output.value.trim()) {
            showToast('Sıralanacak içerik yok', 'error');
            return;
        }
        
        const lines = output.value.split('\n').filter(line => line.trim());
        const sorted = lines.sort((a, b) => {
            // Önce sayısal karşılaştırma dene
            const numA = parseFloat(a.trim());
            const numB = parseFloat(b.trim());
            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }
            // Sayısal değilse string karşılaştırma
            return a.trim().localeCompare(b.trim(), 'tr', { numeric: true, sensitivity: 'base' });
        });
        
        output.value = sorted.join('\n');
        showToast('Küçükten büyüğe sıralandı', 'success');
    });
    
    // Sort Descending (Büyükten Küçüğe)
    sortDescBtn.addEventListener('click', () => {
        if (!output.value.trim()) {
            showToast('Sıralanacak içerik yok', 'error');
            return;
        }
        
        const lines = output.value.split('\n').filter(line => line.trim());
        const sorted = lines.sort((a, b) => {
            // Önce sayısal karşılaştırma dene
            const numA = parseFloat(a.trim());
            const numB = parseFloat(b.trim());
            if (!isNaN(numA) && !isNaN(numB)) {
                return numB - numA;
            }
            // Sayısal değilse string karşılaştırma (ters)
            return b.trim().localeCompare(a.trim(), 'tr', { numeric: true, sensitivity: 'base' });
        });
        
        output.value = sorted.join('\n');
        showToast('Büyükten küçüğe sıralandı', 'success');
    });
    
    // Clear
    clearBtn.addEventListener('click', () => {
        input.value = '';
        output.value = '';
        statsDiv.style.display = 'none';
        sortAscBtn.style.display = 'none';
        sortDescBtn.style.display = 'none';
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

