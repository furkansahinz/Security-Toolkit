/**
 * Utility Functions - Common helpers for all tools
 * Security Toolkit
 */

/**
 * Tokenize input (whitespace + common delimiters)
 * @param {string} input - Raw input text
 * @returns {Array} Array of tokens
 */
function tokenize(input) {
    if (!input || typeof input !== 'string') return [];
    
    // Split by whitespace, comma, semicolon, pipe
    const tokens = input.split(/[\s,;|]+/)
        .map(t => t.trim())
        .filter(t => t.length > 0);
    
    return tokens;
}

/**
 * Check if token is IPv4 address
 * @param {string} token
 * @returns {boolean}
 */
function isIPv4(token) {
    const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = token.match(ipv4Pattern);
    
    if (!match) return false;
    
    // Validate octets (0-255)
    for (let i = 1; i <= 4; i++) {
        const octet = parseInt(match[i]);
        if (octet < 0 || octet > 255) return false;
    }
    
    return true;
}

/**
 * Check if token is URL
 * @param {string} token
 * @returns {boolean}
 */
function isURL(token) {
    // HTTP/HTTPS URLs
    const urlPattern = /^(https?|hxxps?):\/\/[^\s]+$/i;
    return urlPattern.test(token);
}

/**
 * Check if token is domain
 * @param {string} token
 * @returns {boolean}
 */
function isDomain(token) {
    // Basic domain pattern (without protocol)
    const domainPattern = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    return domainPattern.test(token) && !isIPv4(token);
}

/**
 * Check if token is hash (MD5/SHA1/SHA256)
 * @param {string} token
 * @returns {boolean|string} false or hash type
 */
function isHash(token) {
    // Only hex characters
    if (!/^[a-f0-9]+$/i.test(token)) return false;
    
    const len = token.length;
    if (len === 32) return 'md5';
    if (len === 40) return 'sha1';
    if (len === 64) return 'sha256';
    
    return false;
}

/**
 * Check if token is email
 * @param {string} token
 * @returns {boolean}
 */
function isEmail(token) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(token);
}

/**
 * Deduplicate array
 * @param {Array} tokens
 * @returns {Array}
 */
function dedupe(tokens) {
    return [...new Set(tokens)];
}

/**
 * Copy text to clipboard
 * @param {string} text
 * @param {HTMLElement} button - Optional button for feedback
 */
function copyText(text, button) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Kopyalandı!', 'success');
            if (button) updateButtonFeedback(button);
        }).catch(() => {
            fallbackCopy(text, button);
        });
    } else {
        fallbackCopy(text, button);
    }
}

/**
 * Fallback copy method
 */
function fallbackCopy(text, button) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
        showToast('Kopyalandı!', 'success');
        if (button) updateButtonFeedback(button);
    } catch (err) {
        showToast('Kopyalama başarısız!', 'error');
    }
    
    document.body.removeChild(textarea);
}

/**
 * Update button feedback
 */
function updateButtonFeedback(button) {
    const originalText = button.textContent;
    button.textContent = '✓ Kopyalandı!';
    setTimeout(() => {
        button.textContent = originalText;
    }, 2000);
}

/**
 * Toast notification system
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    
    const container = document.getElementById('toast-container');
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.add('toast-show');
    }, 10);
    
    // Auto remove
    setTimeout(() => {
        toast.classList.remove('toast-show');
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 3000);
}

/**
 * Download text as file
 * @param {string} content - File content
 * @param {string} filename - File name
 */
function downloadTextFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Dosya indirildi!', 'success');
}

/**
 * Extract domain from email
 * @param {string} email
 * @returns {string}
 */
function extractDomainFromEmail(email) {
    const match = email.match(/@(.+)$/);
    return match ? match[1] : '';
}

/**
 * Get base domain (last 2 labels)
 * @param {string} domain
 * @returns {string}
 */
function getBaseDomain(domain) {
    const parts = domain.split('.');
    if (parts.length >= 2) {
        return parts.slice(-2).join('.');
    }
    return domain;
}

/**
 * IPv4 to integer
 * @param {string} ip
 * @returns {number}
 */
function ipToInt(ip) {
    const parts = ip.split('.');
    return (parseInt(parts[0]) << 24) + 
           (parseInt(parts[1]) << 16) + 
           (parseInt(parts[2]) << 8) + 
           parseInt(parts[3]);
}

/**
 * Integer to IPv4
 * @param {number} num
 * @returns {string}
 */
function intToIp(num) {
    return [
        (num >>> 24) & 0xFF,
        (num >>> 16) & 0xFF,
        (num >>> 8) & 0xFF,
        num & 0xFF
    ].join('.');
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Escape HTML attribute value
 * @param {string} text - Text to escape
 * @returns {string} Escaped attribute value
 */
function escapeHtmlAttr(text) {
    if (text == null) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

