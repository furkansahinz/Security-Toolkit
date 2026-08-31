/**
 * Message Header Analyzer - Email Header Analysis Module
 * Security Toolkit
 * Google Admin Toolbox Messageheader benzeri offline analyzer
 */

// Örnek email header
const SAMPLE_HEADER = `Return-Path: <sender@sender.com>
Received: from mail-sor-f65.google.com ([2001:4860:4864:5::2])
        by smtp.gmail.com with ESMTPS id abc123
        (version=TLS1_3 cipher=TLS_AES_128_GCM_SHA256);
        Mon, 1 Jan 2024 10:05:30 -0800 (PST)
Received: from mail.sender.com (mail.sender.com [203.0.113.10])
        by mail-sor-f65.google.com with ESMTP id xyz789
        for <recipient@example.com>;
        Mon, 1 Jan 2024 10:05:25 -0800 (PST)
Received: from localhost ([127.0.0.1])
        by mail.sender.com (Postfix) with ESMTP id 12345
        for <recipient@example.com>;
        Mon, 1 Jan 2024 13:00:00 -0500 (EST)
Date: Mon, 1 Jan 2024 18:00:00 +0000
From: sender@sender.com
To: recipient@example.com
Subject: Test Email Message
Message-ID: <unique-id-12345@sender.com>
MIME-Version: 1.0
Content-Type: text/plain; charset=UTF-8
Authentication-Results: gmail.com;
       dkim=pass header.i=@sender.com;
       spf=pass smtp.mailfrom=sender@sender.com;
       dmarc=pass (p=REJECT)
Received-SPF: pass (google.com: domain of sender@sender.com designates 203.0.113.10 as permitted sender)
DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed;
        d=sender.com; s=default;
        h=from:to:subject:date;
        bh=abc123def456...;
        b=xyz789abc123...`;

/**
 * Message Header Analyzer initialization
 */
function initMessageHeaderAnalyzer() {
    const mhInput = document.getElementById('mh-input');
    const mhFileBtn = document.getElementById('mh-file-btn');
    const mhFile = document.getElementById('mh-file');
    const mhFileName = document.getElementById('mh-file-name');
    const mhAnalyzeBtn = document.getElementById('mh-analyze-btn');
    const mhClearBtn = document.getElementById('mh-clear-btn');
    const mhExampleBtn = document.getElementById('mh-example-btn');
    const mhCopyReport = document.getElementById('mh-copy-report');
    const mhCopyJson = document.getElementById('mh-copy-json');
    const mhDropZone = document.getElementById('mh-drop-zone');
    const mhDropOverlay = mhDropZone.querySelector('.mh-drop-overlay');
    const mhHelpLink = document.getElementById('mh-help-link');
    const mhHelpModal = document.getElementById('mh-help-modal');
    const mhModalClose = mhHelpModal.querySelector('.mh-modal-close');
    
    // Dosya seçme
    mhFileBtn.addEventListener('click', () => {
        mhFile.click();
    });
    
    mhFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                mhInput.value = event.target.result;
                mhFileName.textContent = file.name;
            };
            reader.readAsText(file);
        }
    });
    
    // Drag & Drop
    mhDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        mhDropOverlay.style.display = 'flex';
    });
    
    mhDropZone.addEventListener('dragleave', (e) => {
        if (e.target === mhDropZone) {
            mhDropOverlay.style.display = 'none';
        }
    });
    
    mhDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        mhDropOverlay.style.display = 'none';
        
        const file = e.dataTransfer.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                mhInput.value = event.target.result;
                mhFileName.textContent = file.name;
            };
            reader.readAsText(file);
        }
    });
    
    // Analyze butonu
    mhAnalyzeBtn.addEventListener('click', () => {
        const input = mhInput.value;
        if (!input.trim()) {
            showMhError('Lütfen analiz edilecek bir email header girin.');
            return;
        }
        
        try {
            const result = analyzeMessageHeader(input, false);
            renderMessageHeaderResults(result);
        } catch (err) {
            showMhError('Analiz hatası: ' + err.message);
            console.error(err);
        }
    });
    
    // Clear butonu
    mhClearBtn.addEventListener('click', () => {
        mhInput.value = '';
        mhFileName.textContent = '';
        mhFile.value = '';
        hideMhResults();
    });
    
    // Example butonu
    mhExampleBtn.addEventListener('click', () => {
        mhInput.value = SAMPLE_HEADER;
        mhFileName.textContent = 'example-header.txt';
    });
    
    // Copy Report butonu
    mhCopyReport.addEventListener('click', (e) => {
        const lastResult = window._lastMhResult;
        if (lastResult) {
            const report = generateTextReport(lastResult);
            copyToClipboard(report, e.target);
        }
    });
    
    // Copy JSON butonu
    mhCopyJson.addEventListener('click', (e) => {
        const lastResult = window._lastMhResult;
        if (lastResult) {
            copyToClipboard(JSON.stringify(lastResult, null, 2), e.target);
        }
    });
    
    // Timeline order change
    document.getElementById('timeline-header-order').addEventListener('change', () => {
        if (window._lastMhResult) {
            renderMessageHeaderResults(window._lastMhResult);
        }
    });
    
    document.getElementById('timeline-chronological').addEventListener('change', () => {
        if (window._lastMhResult) {
            renderMessageHeaderResults(window._lastMhResult);
        }
    });
    
    // Help modal
    mhHelpLink.addEventListener('click', (e) => {
        e.preventDefault();
        mhHelpModal.style.display = 'flex';
    });
    
    mhModalClose.addEventListener('click', () => {
        mhHelpModal.style.display = 'none';
    });
    
    mhHelpModal.addEventListener('click', (e) => {
        if (e.target === mhHelpModal) {
            mhHelpModal.style.display = 'none';
        }
    });
    
    // Keyboard shortcuts
    mhInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            mhAnalyzeBtn.click();
        }
    });
}

/**
 * Ana analiz fonksiyonu - Message Header parsing
 */
function analyzeMessageHeader(raw, redact) {
    const result = {
        summary: {
            totalHops: 0,
            transitTime: null,
            largestDelay: null,
            delayHop: null
        },
        auth: {
            spf: 'none',
            dkim: 'none',
            dmarc: 'none'
        },
        fields: {},
        received: [],
        authDetails: [],
        notes: [],
        errors: []
    };
    
    // 1. Parse header (folding'leri birleştir)
    const headers = parseEmailHeaders(raw);
    
    // 2. Ana alanları çıkar
    result.fields['From'] = getHeader(headers, 'From') || '-';
    result.fields['To'] = getHeader(headers, 'To') || '-';
    result.fields['Date'] = getHeader(headers, 'Date') || '-';
    result.fields['Message-ID'] = getHeader(headers, 'Message-ID') || getHeader(headers, 'Message-Id') || '-';
    result.fields['Return-Path'] = getHeader(headers, 'Return-Path') || '-';
    result.fields['Delivered-To'] = getHeader(headers, 'Delivered-To') || '-';
    result.fields['Reply-To'] = getHeader(headers, 'Reply-To') || '';
    result.fields['X-Originating-IP'] = getHeader(headers, 'X-Originating-IP') || '';
    
    // Subject - MIME decode
    const subjectRaw = getHeader(headers, 'Subject') || '-';
    const subjectDecoded = decodeMimeHeader(subjectRaw);
    result.fields['Subject'] = subjectRaw;
    result.fields['Subject-Decoded'] = subjectDecoded.decoded;
    result.fields['Subject-Has-Encoding'] = subjectDecoded.hasEncoding;
    
    // From ve To için de MIME decode (isim kısmı encoded olabilir)
    const fromDecoded = decodeMimeHeader(result.fields['From']);
    if (fromDecoded.hasEncoding) {
        result.fields['From-Decoded'] = fromDecoded.decoded;
    }
    
    const toDecoded = decodeMimeHeader(result.fields['To']);
    if (toDecoded.hasEncoding) {
        result.fields['To-Decoded'] = toDecoded.decoded;
    }
    
    // Redact if needed
    if (redact) {
        result.fields = redactSensitiveData(result.fields);
    }
    
    // 3. Received satırlarını parse et
    const receivedHeaders = getAllHeaders(headers, 'Received');
    if (receivedHeaders.length === 0) {
        result.errors.push('Hiçbir Received header bulunamadı. Bu tam bir email header olmayabilir.');
    } else {
        receivedHeaders.forEach((rec, idx) => {
            const parsed = parseReceivedHeader(rec, idx);
            if (redact) {
                parsed.fromHost = redactHostname(parsed.fromHost);
                parsed.byHost = redactHostname(parsed.byHost);
                parsed.fromIP = redactIP(parsed.fromIP);
            }
            result.received.push(parsed);
        });
        
        result.summary.totalHops = result.received.length;
    }
    
    // 4. Timestamp normalizasyonu ve gecikme hesaplama
    if (result.received.length > 0) {
        // Parse timestamps
        result.received.forEach(hop => {
            if (hop.timestampRaw) {
                hop.timestampMs = parseEmailDate(hop.timestampRaw);
            if (!hop.timestampMs) {
                result.errors.push(`Hop #${hop.index} için zaman damgası ayrıştırılamadı: ${hop.timestampRaw.substring(0, 50)}`);
            }
            }
        });
        
        // Calculate delays (chronological order)
        const chronological = result.received
            .filter(h => h.timestampMs !== null)
            .sort((a, b) => a.timestampMs - b.timestampMs);
        
        if (chronological.length >= 2) {
            // Transit time
            const first = chronological[0];
            const last = chronological[chronological.length - 1];
            result.summary.transitTime = formatDuration(last.timestampMs - first.timestampMs);
            
            // Calculate deltas
            let maxDelay = 0;
            let maxDelayHop = null;
            
            for (let i = 1; i < chronological.length; i++) {
                const prev = chronological[i - 1];
                const curr = chronological[i];
                const deltaMs = curr.timestampMs - prev.timestampMs;
                
                curr.deltaMs = deltaMs;
                curr.deltaFormatted = formatDuration(deltaMs);
                
                if (deltaMs > maxDelay) {
                    maxDelay = deltaMs;
                    maxDelayHop = `Hop ${prev.index} → ${curr.index}`;
                }
            }
            
            result.summary.largestDelay = formatDuration(maxDelay);
            result.summary.delayHop = maxDelayHop;
        }
    }
    
    // 5. Authentication parsing
    const authResults = getHeader(headers, 'Authentication-Results');
    if (authResults) {
        result.auth = parseAuthenticationResults(authResults);
        result.authDetails.push({
            title: 'Authentication-Results',
            content: authResults
        });
    }
    
    const receivedSPF = getHeader(headers, 'Received-SPF');
    if (receivedSPF) {
        if (result.auth.spf === 'none') {
            result.auth.spf = parseSPFResult(receivedSPF);
        }
        result.authDetails.push({
            title: 'Received-SPF',
            content: receivedSPF
        });
    }
    
    const dkimSig = getHeader(headers, 'DKIM-Signature');
    if (dkimSig) {
        result.authDetails.push({
            title: 'DKIM-Signature',
            content: dkimSig
        });
    }
    
    // ARC headers
    const arcAuthResults = getAllHeaders(headers, 'ARC-Authentication-Results');
    arcAuthResults.forEach((arc, idx) => {
        result.authDetails.push({
            title: `ARC-Authentication-Results (${idx + 1})`,
            content: arc
        });
    });
    
    const arcSeal = getAllHeaders(headers, 'ARC-Seal');
    arcSeal.forEach((seal, idx) => {
        result.authDetails.push({
            title: `ARC-Seal (${idx + 1})`,
            content: seal
        });
    });
    
    if (result.authDetails.length === 0) {
        result.authDetails.push({
            title: 'Kimlik Doğrulama Header\'ı Bulunamadı',
            content: 'Bu mesajda kimlik doğrulama header\'ları (SPF, DKIM, DMARC, ARC) bulunamadı.'
        });
    }
    
    // 6. Notes
    result.notes.push('Received header\'ları, mesajı işleyen her mail sunucusu tarafından eklenir.');
    result.notes.push('En üstteki Received header genellikle en son eklenendir (son durak).');
    result.notes.push('Gecikmeler, hop\'lar arasındaki zaman damgası farklarından hesaplanır.');
    result.notes.push('Büyük gecikmeler spam filtreleme, greylisting veya ağ sorunlarına işaret edebilir.');
    result.notes.push('Header analizi, email\'in nereden geldiğini ve hangi sunuculardan geçtiğini gösterir.');
    result.notes.push('SPF, DKIM ve DMARC sonuçları email\'in güvenilirliğini değerlendirmeye yardımcı olur.');
    
    if (result.received.length > 0 && result.received.some(h => !h.timestampMs)) {
        result.notes.push('Bazı zaman damgaları ayrıştırılamadı. Gecikme analizi eksik olabilir.');
    }
    
    return result;
}

/**
 * Email header parsing (folding birleştirme)
 */
function parseEmailHeaders(raw) {
    // Satır sonlarını normalize et (\r\n -> \n)
    let normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Bilinen header'ları bul ve satır başlarına koy (tek satırda birleşmiş header'ları ayır)
    // Örn: "Return-Path: ... Received: ..." -> satır satır
    const headerPattern = /\b(Return-Path|Received|From|To|Subject|Date|Message-ID|Message-Id|DKIM-Signature|Authentication-Results|Received-SPF|MIME-Version|Content-Type|X-[\w-]+|ARC-[\w-]+|Delivered-To|Reply-To|Sender|In-Reply-To|References):/gi;
    
    // Header'ları ayır - her header önüne \n ekle (ilk hariç)
    normalized = normalized.replace(headerPattern, (match, headerName, offset) => {
        // İlk header ise başına \n ekleme
        if (offset === 0) return match;
        // Önceki karakter zaten \n ise tekrar ekleme
        if (normalized[offset - 1] === '\n') return match;
        return '\n' + match;
    });
    
    const lines = normalized.split('\n');
    const headers = [];
    let current = null;
    
    for (let line of lines) {
        // Boş satır, devam et
        if (line.trim() === '') {
            continue;
        }
        
        // Folding: satır boşluk/tab ile başlıyorsa önceki satırın devamı
        if (line.match(/^\s+/) && current) {
            current.value += ' ' + line.trim();
        } else {
            // Yeni header satırı
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                if (current) {
                    headers.push(current);
                }
                const key = line.substring(0, colonIndex).trim();
                const value = line.substring(colonIndex + 1).trim();
                current = { key, value };
            } else if (current) {
                // Colon yok ama current var, folding olarak kabul et
                current.value += ' ' + line.trim();
            }
        }
    }
    
    if (current) {
        headers.push(current);
    }
    
    return headers;
}

/**
 * Tek header değeri al
 */
function getHeader(headers, key) {
    const found = headers.find(h => h.key.toLowerCase() === key.toLowerCase());
    return found ? found.value : null;
}

/**
 * MIME encoded-word decoder (RFC 2047)
 * Örnek: =?UTF-8?Q?Netflix_=C3=96deme?= -> Netflix Ödeme
 */
function decodeMimeHeader(encoded) {
    if (!encoded) return encoded;
    
    // MIME encoded-word pattern: =?charset?encoding?encoded-text?=
    const mimePattern = /=\?([^?]+)\?([BQbq])\?([^?]*)\?=/g;
    
    let decoded = encoded;
    let hasEncoding = false;
    
    decoded = decoded.replace(mimePattern, (match, charset, encoding, encodedText) => {
        hasEncoding = true;
        try {
            let decodedText = '';
            
            if (encoding.toUpperCase() === 'B') {
                // Base64 encoding
                decodedText = atob(encodedText);
            } else if (encoding.toUpperCase() === 'Q') {
                // Quoted-Printable encoding
                // _ = space
                decodedText = encodedText.replace(/_/g, ' ');
                // =XX = hex byte
                decodedText = decodedText.replace(/=([0-9A-F]{2})/gi, (m, hex) => {
                    return String.fromCharCode(parseInt(hex, 16));
                });
            }
            
            // UTF-8 bytes'ı string'e çevir
            if (charset.toUpperCase() === 'UTF-8') {
                try {
                    // UTF-8 decode
                    const bytes = [];
                    for (let i = 0; i < decodedText.length; i++) {
                        bytes.push(decodedText.charCodeAt(i));
                    }
                    decodedText = decodeURIComponent(
                        bytes.map(b => '%' + ('00' + b.toString(16)).slice(-2)).join('')
                    );
                } catch (e) {
                    // Decode başarısız, olduğu gibi bırak
                }
            }
            
            return decodedText;
        } catch (e) {
            console.error('MIME decode error:', e);
            return match; // Hata varsa orijinali döndür
        }
    });
    
    return { decoded, hasEncoding, original: encoded };
}

/**
 * Aynı isimde tüm header'ları al
 */
function getAllHeaders(headers, key) {
    return headers
        .filter(h => h.key.toLowerCase() === key.toLowerCase())
        .map(h => h.value);
}

/**
 * Received header parsing (heuristic)
 */
function parseReceivedHeader(raw, index) {
    const result = {
        index: index,
        raw: raw,
        fromHost: '',
        fromIP: '',
        byHost: '',
        timestampRaw: '',
        timestampMs: null,
        tzRaw: '',
        deltaMs: null,
        deltaFormatted: null
    };
    
    // Timestamp (en güvenilir kısım): "; " sonrası
    const semiMatch = raw.match(/;\s*(.+)$/);
    if (semiMatch) {
        result.timestampRaw = semiMatch[1].trim();
    }
    
    // From host ve IP
    const fromMatch = raw.match(/from\s+([^\s(]+)/i);
    if (fromMatch) {
        result.fromHost = fromMatch[1];
    }
    
    // IP adresi: [x.x.x.x], (x.x.x.x) veya (... [x.x.x.x])
    let ipMatch = raw.match(/\[([0-9a-f:.]+)\]/i);
    if (ipMatch) {
        result.fromIP = ipMatch[1];
    } else {
        // Parantez içinde IP (bracket olmadan)
        ipMatch = raw.match(/\(([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})\)/);
        if (ipMatch) {
            result.fromIP = ipMatch[1];
        }
    }
    
    // By host
    const byMatch = raw.match(/by\s+([^\s(]+)/i);
    if (byMatch) {
        result.byHost = byMatch[1];
    }
    
    return result;
}

/**
 * Email date parsing (RFC 2822/5322)
 */
function parseEmailDate(dateStr) {
    try {
        // Önce native Date.parse() dene
        let timestamp = Date.parse(dateStr);
        if (!isNaN(timestamp)) {
            return timestamp;
        }
        
        // Timezone'u temizle ve tekrar dene
        // Örn: "+0300" -> "GMT+0300"
        let cleaned = dateStr.replace(/([+-]\d{4})$/, 'GMT$1');
        timestamp = Date.parse(cleaned);
        if (!isNaN(timestamp)) {
            return timestamp;
        }
        
        // Fallback: manuel regex parsing
        // Format: Day, DD Mon YYYY HH:MM:SS +/-TZTZ
        // veya: DD Mon YYYY HH:MM:SS +/-TZTZ
        const match = dateStr.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*([+-]\d{4})?/);
        if (match) {
            const [, day, month, year, hour, min, sec, tz] = match;
            const monthMap = {
                'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
                'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
            };
            const monthNum = monthMap[month.toLowerCase()];
            if (monthNum !== undefined) {
                // UTC olarak oluştur
                const date = new Date(Date.UTC(
                    parseInt(year),
                    monthNum,
                    parseInt(day),
                    parseInt(hour),
                    parseInt(min),
                    parseInt(sec)
                ));
                
                // Timezone offset varsa uygula
                if (tz) {
                    const tzSign = tz[0] === '+' ? -1 : 1; // Ters çünkü UTC'ye dönüştürüyoruz
                    const tzHours = parseInt(tz.substring(1, 3));
                    const tzMins = parseInt(tz.substring(3, 5));
                    const tzOffsetMs = tzSign * (tzHours * 60 + tzMins) * 60 * 1000;
                    return date.getTime() + tzOffsetMs;
                }
                
                return date.getTime();
            }
        }
        
        return null;
    } catch (e) {
        console.error('Date parse error:', e, dateStr);
        return null;
    }
}

/**
 * Duration formatting
 */
function formatDuration(ms) {
    if (ms < 1000) {
        return ms + ' ms';
    } else if (ms < 60000) {
        return (ms / 1000).toFixed(2) + ' sec';
    } else if (ms < 3600000) {
        return (ms / 60000).toFixed(2) + ' min';
    } else {
        return (ms / 3600000).toFixed(2) + ' hr';
    }
}

/**
 * Authentication-Results parsing
 */
function parseAuthenticationResults(authResults) {
    const result = {
        spf: 'none',
        dkim: 'none',
        dmarc: 'none'
    };
    
    // SPF
    const spfMatch = authResults.match(/spf\s*=\s*(pass|fail|softfail|neutral|none)/i);
    if (spfMatch) {
        result.spf = spfMatch[1].toLowerCase();
    }
    
    // DKIM
    const dkimMatch = authResults.match(/dkim\s*=\s*(pass|fail|none)/i);
    if (dkimMatch) {
        result.dkim = dkimMatch[1].toLowerCase();
    }
    
    // DMARC
    const dmarcMatch = authResults.match(/dmarc\s*=\s*(pass|fail|bestguesspass|none)/i);
    if (dmarcMatch) {
        result.dmarc = dmarcMatch[1].toLowerCase();
    }
    
    return result;
}

/**
 * SPF result parsing
 */
function parseSPFResult(spfHeader) {
    const match = spfHeader.match(/^(pass|fail|softfail|neutral|none)/i);
    return match ? match[1].toLowerCase() : 'none';
}

/**
 * Redact sensitive data
 */
function redactSensitiveData(fields) {
    const redacted = {};
    for (const [key, value] of Object.entries(fields)) {
        if (typeof value === 'string') {
            // Email addresses
            redacted[key] = value.replace(/([a-z0-9._%+-]+)@([a-z0-9.-]+)/gi, (match, user, domain) => {
                const maskedUser = user.substring(0, 1) + '***' + user.substring(user.length - 1);
                return maskedUser + '@' + domain;
            });
        } else {
            redacted[key] = value;
        }
    }
    return redacted;
}

/**
 * Redact hostname
 */
function redactHostname(hostname) {
    if (!hostname) return hostname;
    const parts = hostname.split('.');
    if (parts.length > 2) {
        parts[0] = '***';
    }
    return parts.join('.');
}

/**
 * Redact IP address
 */
function redactIP(ip) {
    if (!ip) return ip;
    // IPv4
    if (ip.includes('.')) {
        const parts = ip.split('.');
        if (parts.length === 4) {
            parts[3] = 'xxx';
            return parts.join('.');
        }
    }
    // IPv6
    if (ip.includes(':')) {
        const parts = ip.split(':');
        if (parts.length > 2) {
            parts[parts.length - 1] = 'xxxx';
            parts[parts.length - 2] = 'xxxx';
            return parts.join(':');
        }
    }
    return ip;
}

/**
 * Render message header results
 */
function renderMessageHeaderResults(result) {
    // Sonucu global değişkende sakla
    window._lastMhResult = result;
    
    // Empty state gizle, results göster
    document.getElementById('mh-result-container').style.display = 'none';
    document.getElementById('mh-results').style.display = 'block';
    document.getElementById('mh-copy-report').style.display = 'inline-block';
    document.getElementById('mh-copy-json').style.display = 'inline-block';
    
    // Summary
    document.getElementById('mh-total-hops').textContent = result.summary.totalHops || '-';
    document.getElementById('mh-transit-time').textContent = result.summary.transitTime || '-';
    document.getElementById('mh-largest-delay').textContent = result.summary.largestDelay || '-';
    document.getElementById('mh-delay-hop').textContent = result.summary.delayHop || '-';
    
    // Auth
    renderAuthBadge('mh-spf', result.auth.spf);
    renderAuthBadge('mh-dkim', result.auth.dkim);
    renderAuthBadge('mh-dmarc', result.auth.dmarc);
    
    // Fields
    const fromDisplay = result.fields['From-Decoded'] || result.fields['From'] || '-';
    const toDisplay = result.fields['To-Decoded'] || result.fields['To'] || '-';
    
    document.getElementById('mh-from').textContent = fromDisplay;
    document.getElementById('mh-to').textContent = toDisplay;
    document.getElementById('mh-message-id').textContent = result.fields['Message-ID'] || '-';
    document.getElementById('mh-return-path').textContent = result.fields['Return-Path'] || '-';
    
    // Subject - hem encoded hem decoded göster
    const subjectElem = document.getElementById('mh-subject');
    if (result.fields['Subject-Has-Encoding']) {
        subjectElem.innerHTML = '';
        
        // Decoded (büyük, ana)
        const decodedSpan = document.createElement('div');
        decodedSpan.style.fontSize = '14px';
        decodedSpan.style.fontWeight = '600';
        decodedSpan.style.color = '#1d1d1f';
        decodedSpan.style.marginBottom = '4px';
        decodedSpan.textContent = result.fields['Subject-Decoded'];
        
        // Encoded (küçük, gri)
        const encodedSpan = document.createElement('div');
        encodedSpan.style.fontSize = '11px';
        encodedSpan.style.color = '#86868b';
        encodedSpan.style.fontFamily = "'SF Mono', Monaco, monospace";
        encodedSpan.style.wordBreak = 'break-all';
        encodedSpan.textContent = 'Encoded: ' + result.fields['Subject'];
        
        subjectElem.appendChild(decodedSpan);
        subjectElem.appendChild(encodedSpan);
    } else {
        subjectElem.textContent = result.fields['Subject'] || '-';
    }
    
    // Timeline
    renderTimeline(result.received);
    
    // Auth Details
    renderAuthDetails(result.authDetails);
    
    // Raw Fields
    renderRawFields(result.fields);
    
    // Notes
    renderNotes(result.notes, result.errors);
}

/**
 * Render auth badge
 */
function renderAuthBadge(id, value) {
    const elem = document.getElementById(id);
    elem.textContent = value.toUpperCase();
    elem.className = 'mh-auth-badge ' + value;
}

/**
 * Render timeline
 */
function renderTimeline(received) {
    const timeline = document.getElementById('mh-timeline');
    timeline.innerHTML = '';
    
    if (received.length === 0) {
        timeline.innerHTML = '<p style="color: #86868b;">Received header bulunamadı.</p>';
        return;
    }
    
    // Order seçimi
    const chronological = document.getElementById('timeline-chronological').checked;
    let hops = [...received];
    
    if (chronological) {
        hops = hops
            .filter(h => h.timestampMs !== null)
            .sort((a, b) => a.timestampMs - b.timestampMs);
    }
    
    hops.forEach((hop, idx) => {
        const hopDiv = document.createElement('div');
        hopDiv.className = 'mh-hop';
        
        // Delay classification
        if (hop.deltaMs) {
            if (hop.deltaMs > 300000) { // 5 min
                hopDiv.classList.add('delay-danger');
            } else if (hop.deltaMs > 60000) { // 1 min
                hopDiv.classList.add('delay-warning');
            }
        }
        
        const hopNumber = document.createElement('div');
        hopNumber.className = 'mh-hop-number';
        hopNumber.textContent = '#' + hop.index;
        
        const route = document.createElement('div');
        route.className = 'mh-hop-route';
        const fromDisplay = escapeHtml(hop.fromHost || hop.fromIP || 'unknown');
        const byDisplay = escapeHtml(hop.byHost || 'unknown');
        const fromIP = hop.fromIP ? escapeHtml(hop.fromIP) : '';
        route.innerHTML = `<strong>From:</strong> ${fromDisplay}${fromIP ? ' [' + fromIP + ']' : ''} <strong>→ By:</strong> ${byDisplay}`;
        
        const time = document.createElement('div');
        time.className = 'mh-hop-time';
        if (hop.timestampMs) {
            const date = new Date(hop.timestampMs);
            time.textContent = date.toUTCString() + ' (UTC)';
        } else {
            time.textContent = hop.timestampRaw || 'Zaman damgası bulunamadı';
        }
        
        hopDiv.appendChild(hopNumber);
        hopDiv.appendChild(route);
        hopDiv.appendChild(time);
        
        if (hop.deltaFormatted) {
            const delta = document.createElement('div');
            delta.className = 'mh-hop-delta';
            if (hop.deltaMs > 300000) {
                delta.classList.add('danger');
            } else if (hop.deltaMs > 60000) {
                delta.classList.add('warning');
            }
            delta.textContent = '⏱ Delay from previous: ' + hop.deltaFormatted;
            hopDiv.appendChild(delta);
        }
        
        timeline.appendChild(hopDiv);
    });
}

/**
 * Render auth details
 */
function renderAuthDetails(authDetails) {
    const container = document.getElementById('mh-auth-details');
    container.innerHTML = '';
    
    authDetails.forEach(detail => {
        const block = document.createElement('div');
        block.className = 'mh-auth-block';
        
        const title = document.createElement('div');
        title.className = 'mh-auth-block-title';
        title.textContent = detail.title;
        
        const content = document.createElement('div');
        content.className = 'mh-auth-block-content';
        content.textContent = detail.content;
        
        block.appendChild(title);
        block.appendChild(content);
        container.appendChild(block);
    });
}

/**
 * Render raw fields
 */
function renderRawFields(fields) {
    const container = document.getElementById('mh-raw-fields');
    container.innerHTML = '';
    
    for (const [key, value] of Object.entries(fields)) {
        if (!value) continue;
        
        // Internal field'ları gösterme
        if (key.endsWith('-Decoded') || key.endsWith('-Has-Encoding')) continue;
        
        const field = document.createElement('div');
        field.className = 'mh-raw-field';
        
        const keySpan = document.createElement('span');
        keySpan.className = 'mh-raw-field-key';
        keySpan.textContent = key + ': ';
        
        const valueSpan = document.createElement('span');
        valueSpan.className = 'mh-raw-field-value';
        valueSpan.textContent = value;
        
        field.appendChild(keySpan);
        field.appendChild(valueSpan);
        container.appendChild(field);
    }
}

/**
 * Render notes
 */
function renderNotes(notes, errors) {
    const container = document.getElementById('mh-notes');
    container.innerHTML = '';
    
    if (errors.length > 0) {
        const errorSection = document.createElement('div');
        errorSection.className = 'mh-note-section';
        
        const errorTitle = document.createElement('div');
        errorTitle.className = 'mh-note-title';
        errorTitle.textContent = '⚠ Ayrıştırma Sorunları';
        
        const errorList = document.createElement('ul');
        errorList.className = 'mh-note-list error';
        
        errors.forEach(error => {
            const li = document.createElement('li');
            li.textContent = error;
            errorList.appendChild(li);
        });
        
        errorSection.appendChild(errorTitle);
        errorSection.appendChild(errorList);
        container.appendChild(errorSection);
    }
    
    const noteSection = document.createElement('div');
    noteSection.className = 'mh-note-section';
    
    const noteTitle = document.createElement('div');
    noteTitle.className = 'mh-note-title';
    noteTitle.textContent = '💡 Yorumlama Notları';
    
    const noteList = document.createElement('ul');
    noteList.className = 'mh-note-list';
    
    notes.forEach(note => {
        const li = document.createElement('li');
        li.textContent = note;
        noteList.appendChild(li);
    });
    
    noteSection.appendChild(noteTitle);
    noteSection.appendChild(noteList);
    container.appendChild(noteSection);
}

/**
 * Generate text report
 */
function generateTextReport(result) {
    let report = '=== EMAIL HEADER ANALYSIS REPORT ===\n\n';
    
    report += '--- QUICK SUMMARY ---\n';
    report += `Total Hops: ${result.summary.totalHops}\n`;
    report += `Total Transit Time: ${result.summary.transitTime || 'N/A'}\n`;
    report += `Largest Delay: ${result.summary.largestDelay || 'N/A'}\n`;
    report += `Suspected Delay Hop: ${result.summary.delayHop || 'N/A'}\n\n`;
    
    report += '--- AUTHENTICATION ---\n';
    report += `SPF: ${result.auth.spf.toUpperCase()}\n`;
    report += `DKIM: ${result.auth.dkim.toUpperCase()}\n`;
    report += `DMARC: ${result.auth.dmarc.toUpperCase()}\n\n`;
    
    report += '--- MESSAGE INFO ---\n';
    report += `From: ${result.fields['From']}\n`;
    report += `To: ${result.fields['To']}\n`;
    report += `Subject: ${result.fields['Subject']}\n`;
    report += `Message-ID: ${result.fields['Message-ID']}\n\n`;
    
    report += '--- HOP TIMELINE ---\n';
    result.received.forEach(hop => {
        report += `Hop #${hop.index}:\n`;
        report += `  From: ${hop.fromHost || 'unknown'}${hop.fromIP ? ' [' + hop.fromIP + ']' : ''}\n`;
        report += `  By: ${hop.byHost || 'unknown'}\n`;
        report += `  Time: ${hop.timestampRaw || 'N/A'}\n`;
        if (hop.deltaFormatted) {
            report += `  Delay: ${hop.deltaFormatted}\n`;
        }
        report += '\n';
    });
    
    if (result.errors.length > 0) {
        report += '--- ERRORS ---\n';
        result.errors.forEach(err => {
            report += `- ${err}\n`;
        });
        report += '\n';
    }
    
    report += '--- END OF REPORT ---\n';
    
    return report;
}

/**
 * Hide results
 */
function hideMhResults() {
    document.getElementById('mh-result-container').style.display = 'flex';
    document.getElementById('mh-results').style.display = 'none';
    document.getElementById('mh-copy-report').style.display = 'none';
    document.getElementById('mh-copy-json').style.display = 'none';
}

/**
 * Show error
 */
function showMhError(message) {
    alert('⚠️ ' + message);
}

