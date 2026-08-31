/**
 * Tool 4: Link Builder
 * IOC'ler için VirusTotal ve AbuseIPDB linkleri oluşturur
 */

function initLinkBuilder() {
    const input = document.getElementById('link-input');
    const generateBtn = document.getElementById('link-generate-btn');
    const clearBtn = document.getElementById('link-clear-btn');
    const cardView = document.getElementById('link-card-view');
    
    // Generate links
    generateBtn.addEventListener('click', async () => {
        const inputText = input.value;
        if (!inputText.trim()) {
            showToast('Lütfen IOC girin', 'error');
            return;
        }
        
        const tokens = tokenize(inputText);
        if (tokens.length === 0) {
            showToast('Geçerli IOC bulunamadı', 'error');
            return;
        }
        
        const links = await generateLinks(tokens);
        renderCardView(links);
        
        showToast(`${links.length} IOC için linkler oluşturuldu`, 'success');
    });
    
    // Clear
    clearBtn.addEventListener('click', () => {
        input.value = '';
        cardView.innerHTML = '';
        showToast('Temizlendi', 'info');
    });
    
    // Keyboard shortcut
    input.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            generateBtn.click();
        }
    });
}

/**
 * Generate links for IOCs
 */
async function generateLinks(tokens) {
    const links = [];
    
    for (const token of tokens) {
        const ioc = { value: token, type: '', links: [] };
        
        if (isIPv4(token)) {
            ioc.type = 'IPv4';
            ioc.links.push({
                label: 'VirusTotal',
                url: `https://www.virustotal.com/gui/ip-address/${token}`
            });
            ioc.links.push({
                label: 'AbuseIPDB',
                url: `https://www.abuseipdb.com/check/${token}`
            });
        } else if (isURL(token)) {
            ioc.type = 'URL';
            // Virustotal URL ID: URL'in SHA-256 hash'i ile kullanılır
            const hash = await sha256Hex(token);
            ioc.links.push({
                label: 'VirusTotal',
                // Kullanıcı isteği: https://www.virustotal.com/gui/url/[hash]
                url: `https://www.virustotal.com/gui/url/${hash}`
            });
        } else if (isDomain(token)) {
            ioc.type = 'Domain';
            ioc.links.push({
                label: 'VirusTotal',
                url: `https://www.virustotal.com/gui/domain/${token}`
            });
        } else {
            const hashType = isHash(token);
            if (hashType) {
                ioc.type = hashType.toUpperCase();
                ioc.links.push({
                    label: 'VirusTotal',
                    url: `https://www.virustotal.com/gui/file/${token}`
                });
            } else {
                ioc.type = 'Unknown';
            }
        }
        
        if (ioc.links.length > 0) {
            links.push(ioc);
        }
    }
    
    return links;
}

/**
 * SHA-256 hash (hex) helper
 */
async function sha256Hex(input) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Render card view
 */
function renderCardView(links) {
    const cardView = document.getElementById('link-card-view');
    
    cardView.style.display = 'grid';
    cardView.innerHTML = '';
    
    if (links.length === 0) {
        cardView.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔗</div><p class="empty-state-text">Link oluşturulacak IOC bulunamadı</p></div>';
        return;
    }
    
    links.forEach(ioc => {
        const card = document.createElement('div');
        card.className = 'link-card';
        
        const header = document.createElement('div');
        header.className = 'link-card-header';
        header.innerHTML = `
            <span class="link-card-value">${escapeHtml(ioc.value)}</span>
            <span class="link-card-type">${ioc.type}</span>
        `;
        
        const actions = document.createElement('div');
        actions.className = 'link-card-actions';
        
        ioc.links.forEach(link => {
            const btn = document.createElement('a');
            btn.href = link.url;
            btn.target = '_blank';
            btn.rel = 'noopener noreferrer';
            btn.className = 'link-card-btn';
            btn.textContent = link.label;
            actions.appendChild(btn);
        });
        
        card.appendChild(header);
        card.appendChild(actions);
        cardView.appendChild(card);
    });
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

