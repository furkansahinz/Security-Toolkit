/**
 * Encoding Inspector - Base64/URL Decoder Module
 * Security Toolkit
 * Offline smart encoding analysis and decoding tool
 */

/**
 * Navigation sistem - top navigation kaldırıldı, sadece sidebar kullanılıyor
 */
function initNavigation() {
    // Top navigation removed - using sidebar only
    // This function kept for compatibility
}

/**
 * Encoding Inspector initialization
 */
function initEncodingInspector() {
    const encInput = document.getElementById('enc-input');
    const encFileBtn = document.getElementById('enc-file-btn');
    const encFile = document.getElementById('enc-file');
    const encFileName = document.getElementById('enc-file-name');
    const encAnalyzeBtn = document.getElementById('enc-analyze-btn');
    const encClearBtn = document.getElementById('enc-clear-btn');
    const encCopyOutput = document.getElementById('enc-copy-output');
    const encCopyJson = document.getElementById('enc-copy-json');
    
    // Dosya seçme
    encFileBtn.addEventListener('click', () => {
        encFile.click();
    });
    
    encFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                encInput.value = event.target.result;
                encFileName.textContent = file.name;
            };
            reader.readAsText(file);
        }
    });
    
    // Analyze butonu
    encAnalyzeBtn.addEventListener('click', () => {
        const input = encInput.value;
        if (!input.trim()) {
            showEncError('Lütfen analiz edilecek bir metin girin.');
            return;
        }
        
        const options = {
            autoDetect: document.getElementById('opt-auto-detect').checked,
            mixedDecode: document.getElementById('opt-mixed-decode').checked,
            recursive: document.getElementById('opt-recursive').checked,
            explain: document.getElementById('opt-explain').checked,
            safePreview: document.getElementById('opt-safe-preview').checked,
            delta: document.getElementById('opt-delta').checked
        };
        
        try {
            const result = analyzeEncoding(input, options);
            renderEncodingResults(result);
        } catch (err) {
            showEncError('Analiz hatası: ' + err.message);
        }
    });
    
    // Clear butonu
    encClearBtn.addEventListener('click', () => {
        encInput.value = '';
        encFileName.textContent = '';
        encFile.value = '';
        hideEncodingResults();
    });
    
    // Copy Output butonu
    encCopyOutput.addEventListener('click', (e) => {
        const lastResult = window._lastEncodingResult;
        if (lastResult && lastResult.layers.length > 0) {
            const finalLayer = lastResult.layers[lastResult.layers.length - 1];
            copyToClipboard(finalLayer.text, e.target);
        }
    });
    
    // Copy JSON butonu
    encCopyJson.addEventListener('click', (e) => {
        const lastResult = window._lastEncodingResult;
        if (lastResult) {
            copyToClipboard(JSON.stringify(lastResult, null, 2), e.target);
        }
    });
    
    // Keyboard shortcuts
    encInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            encAnalyzeBtn.click();
        }
    });
}

/**
 * Ana analiz fonksiyonu - Encoding Inspector core logic
 */
function analyzeEncoding(input, options) {
    const result = {
        summary: {
            base64Confidence: 0,
            layersDecoded: 0,
            outputType: 'Unknown',
            obfuscationScore: 0,
            guessedContext: 'Unknown'
        },
        layers: [],
        explainSteps: [],
        hexPreview: null
    };
    
    // Layer 0: Input
    let currentText = input.trim();
    result.layers.push({
        index: 0,
        text: currentText,
        type: 'input',
        length: currentText.length,
        printableRatio: calculatePrintableRatio(currentText)
    });
    
    if (options.explain) {
        result.explainSteps.push('Analysis başlatıldı. Input length: ' + currentText.length);
    }
    
    // JWT özel durumu - üç parça varsa ayrı ayrı decode et
    const jwtMatch = currentText.match(/^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/);
    if (jwtMatch) {
        if (options.explain) {
            result.explainSteps.push('JWT formatı tespit edildi - üç parça ayrı ayrı decode ediliyor');
        }
        
        // Header (1. parça)
        const header = tryBase64Decode(jwtMatch[1]);
        // Payload (2. parça)
        const payload = tryBase64Decode(jwtMatch[2]);
        // Signature (3. parça - genelde binary)
        const signature = tryBase64Decode(jwtMatch[3]);
        
        if (header && payload) {
            let decodedJWT = '=== JWT Header ===\n' + header + '\n\n';
            decodedJWT += '=== JWT Payload ===\n' + payload + '\n\n';
            decodedJWT += '=== JWT Signature ===\n[Binary signature - ' + (signature ? signature.length : 0) + ' bytes]';
            
            result.layers.push({
                index: 1,
                text: decodedJWT,
                type: 'text',
                decodeType: 'JWT (base64url)',
                length: decodedJWT.length,
                printableRatio: calculatePrintableRatio(decodedJWT)
            });
            
            if (options.explain) {
                result.explainSteps.push('JWT başarıyla decode edildi: Header ve Payload JSON formatında');
            }
            
            // Summary hesapla
            result.summary.layersDecoded = 1;
            result.summary.base64Confidence = 95; // JWT için yüksek confidence
            result.summary.outputType = 'Text';
            result.summary.obfuscationScore = 20;
            result.summary.guessedContext = 'JWT (JSON Web Token)';
            
            return result;
        }
    }
    
    // Auto detect & decode loop
    const maxLayers = options.recursive ? 10 : 1;
    const seenTexts = new Set([currentText]);
    
    for (let i = 0; i < maxLayers; i++) {
        let decoded = null;
        let decodeType = null;
        
        // Mixed decode: URL → Base64
        if (options.mixedDecode) {
            const urlDecoded = tryUrlDecode(currentText);
            if (urlDecoded && urlDecoded !== currentText) {
                if (options.explain) {
                    result.explainSteps.push('Layer ' + (i + 1) + ': URL decode uygulandı');
                }
                currentText = urlDecoded;
            }
        }
        
        // Base64 detection & decode
        const b64Confidence = calculateBase64Confidence(currentText);
        
        if (options.autoDetect && b64Confidence > 50) {
            decoded = tryBase64Decode(currentText);
            if (decoded) {
                decodeType = 'base64';
                if (options.explain) {
                    result.explainSteps.push('Layer ' + (i + 1) + ': Base64 decode başarılı (confidence: ' + b64Confidence + '%)');
                }
            }
        } else if (!options.autoDetect) {
            // Auto detect kapalıysa zorla dene
            decoded = tryBase64Decode(currentText);
            if (decoded) {
                decodeType = 'base64';
            }
        }
        
        // Decode başarısız veya aynı text
        if (!decoded || decoded === currentText || seenTexts.has(decoded)) {
            if (options.explain && i > 0) {
                result.explainSteps.push('Layer ' + (i + 1) + ': Daha fazla decode edilecek katman bulunamadı');
            }
            break;
        }
        
        // Cycle detection
        seenTexts.add(decoded);
        currentText = decoded;
        
        // Yeni layer ekle
        const layerType = isBinary(decoded) ? 'binary' : 'text';
        result.layers.push({
            index: i + 1,
            text: decoded,
            type: layerType,
            decodeType: decodeType,
            length: decoded.length,
            printableRatio: calculatePrintableRatio(decoded)
        });
        
        // Binary ise dur
        if (layerType === 'binary' && options.safePreview) {
            if (options.explain) {
                result.explainSteps.push('Layer ' + (i + 1) + ': Binary output tespit edildi, decode durduruldu');
            }
            break;
        }
    }
    
    // Summary hesapla
    result.summary.layersDecoded = result.layers.length - 1; // Input hariç
    
    const finalLayer = result.layers[result.layers.length - 1];
    result.summary.base64Confidence = calculateBase64Confidence(input);
    result.summary.outputType = finalLayer.type === 'binary' ? 'Binary' : 'Text';
    result.summary.obfuscationScore = calculateObfuscationScore(result);
    result.summary.guessedContext = guessContext(result);
    
    // Delta hesapla
    if (options.delta && result.layers.length > 1) {
        for (let i = 1; i < result.layers.length; i++) {
            const prev = result.layers[i - 1];
            const curr = result.layers[i];
            curr.delta = calculateDelta(prev, curr);
        }
    }
    
    // Hex preview (binary ise)
    if (finalLayer.type === 'binary' && options.safePreview) {
        result.hexPreview = generateHexPreview(finalLayer.text);
    }
    
    return result;
}

/**
 * Base64 confidence skoru hesapla (0-100)
 */
function calculateBase64Confidence(text) {
    if (!text || text.length < 4) return 0;
    
    let score = 0;
    const normalized = text.replace(/\s/g, '');
    
    // 1. Charset kontrolü
    const base64Chars = /^[A-Za-z0-9+/\-_=]*$/;
    if (base64Chars.test(normalized)) {
        score += 40;
    } else {
        return 0; // Geçersiz karakter varsa 0
    }
    
    // 2. Uzunluk kontrolü
    if (normalized.length >= 8) {
        score += 15;
    }
    
    // 3. Length mod 4
    if (normalized.length % 4 === 0) {
        score += 20;
    }
    
    // 4. Padding kontrolü
    const paddingMatch = normalized.match(/=+$/);
    if (paddingMatch) {
        const paddingLen = paddingMatch[0].length;
        if (paddingLen <= 2) {
            score += 15;
        }
    } else if (normalized.length % 4 === 0) {
        score += 10; // Padding yok ama length uygun
    }
    
    // 5. Decode denemesi
    const decoded = tryBase64Decode(normalized);
    if (decoded !== null) {
        score += 10;
    }
    
    return Math.min(100, score);
}

/**
 * Base64 decode denemesi
 */
function tryBase64Decode(text) {
    try {
        // Base64url karakterlerini standart base64'e çevir
        let normalized = text.replace(/-/g, '+').replace(/_/g, '/');
        
        // Whitespace temizle
        normalized = normalized.replace(/\s/g, '');
        
        // Padding ekle (gerekirse)
        while (normalized.length % 4 !== 0) {
            normalized += '=';
        }
        
        const decoded = atob(normalized);
        return decoded;
    } catch (e) {
        return null;
    }
}

/**
 * URL decode denemesi
 */
function tryUrlDecode(text) {
    try {
        // % işareti varsa URL encoded olabilir
        if (text.includes('%')) {
            return decodeURIComponent(text);
        }
        return text;
    } catch (e) {
        // Hatalı encoding varsa parçalı dene
        try {
            return text.replace(/%([0-9A-F]{2})/gi, (match, hex) => {
                return String.fromCharCode(parseInt(hex, 16));
            });
        } catch (e2) {
            return text;
        }
    }
}

/**
 * Binary mi text mi kontrol et
 */
function isBinary(text) {
    const printableRatio = calculatePrintableRatio(text);
    return printableRatio < 0.85;
}

/**
 * Printable karakter oranı hesapla
 */
function calculatePrintableRatio(text) {
    if (!text || text.length === 0) return 0;
    
    let printableCount = 0;
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        // Printable ASCII + tab, newline, carriage return
        if ((code >= 32 && code <= 126) || code === 9 || code === 10 || code === 13) {
            printableCount++;
        }
    }
    
    return printableCount / text.length;
}

/**
 * Obfuscation score hesapla (0-100)
 */
function calculateObfuscationScore(result) {
    let score = 0;
    
    // Layer sayısı
    const layers = result.layers.length - 1; // Input hariç
    if (layers === 0) {
        score = 0;
    } else if (layers === 1) {
        score = 20;
    } else if (layers === 2) {
        score = 40;
    } else if (layers >= 3) {
        score = 60 + Math.min(40, (layers - 3) * 10);
    }
    
    // Mixed encoding kullanıldı mı
    const hasMixed = result.explainSteps.some(step => step.includes('URL decode'));
    if (hasMixed) {
        score += 10;
    }
    
    // Binary output
    const finalLayer = result.layers[result.layers.length - 1];
    if (finalLayer.type === 'binary') {
        score += 5;
    }
    
    return Math.min(100, score);
}

/**
 * Context tahmin et (JWT, Basic Auth, PowerShell, etc.)
 */
function guessContext(result) {
    const input = result.layers[0].text;
    const finalOutput = result.layers[result.layers.length - 1].text;
    
    // JWT: xxx.yyy.zzz formatı ve base64url
    if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(input)) {
        return 'JWT (JSON Web Token)';
    }
    
    // Basic Auth: "username:password" formatı
    if (result.layers.length > 1 && /^[^:]+:[^:]+$/.test(finalOutput) && finalOutput.split(':').length === 2) {
        return 'Basic Authentication';
    }
    
    // PowerShell EncodedCommand: çok fazla null byte pattern (UTF-16LE)
    if (finalOutput.includes('\0') && (finalOutput.match(/\0/g) || []).length > finalOutput.length * 0.3) {
        return 'PowerShell EncodedCommand (UTF-16LE)';
    }
    
    // Binary headers
    if (finalOutput.startsWith('MZ')) {
        return 'PE Executable (Windows Binary)';
    }
    if (finalOutput.startsWith('PK')) {
        return 'ZIP Archive';
    }
    if (finalOutput.charCodeAt(0) === 0x1F && finalOutput.charCodeAt(1) === 0x8B) {
        return 'GZIP Compressed Data';
    }
    
    // JSON
    try {
        if (finalOutput.trim().startsWith('{') || finalOutput.trim().startsWith('[')) {
            JSON.parse(finalOutput);
            return 'JSON Data';
        }
    } catch (e) {
        // Not JSON
    }
    
    // XML
    if (finalOutput.trim().startsWith('<')) {
        return 'XML / HTML Data';
    }
    
    return 'Unknown / Generic Text';
}

/**
 * Layer'lar arası delta hesapla
 */
function calculateDelta(prevLayer, currLayer) {
    const lengthChange = currLayer.length - prevLayer.length;
    const ratioChange = (currLayer.printableRatio - prevLayer.printableRatio).toFixed(2);
    
    let description = '';
    
    if (lengthChange > 0) {
        description += 'Size expanded (+' + lengthChange + ' bytes). ';
    } else if (lengthChange < 0) {
        description += 'Size reduced (' + lengthChange + ' bytes). ';
    }
    
    if (ratioChange > 0.1) {
        description += 'Became more readable.';
    } else if (ratioChange < -0.1) {
        description += 'Became less readable (binary).';
    } else {
        description += 'Readability unchanged.';
    }
    
    return description;
}

/**
 * Hex preview generate et (binary için)
 */
function generateHexPreview(text) {
    const maxBytes = 1024;
    const lines = [];
    
    for (let i = 0; i < Math.min(text.length, maxBytes); i += 16) {
        const chunk = text.substring(i, i + 16);
        const offset = i.toString(16).padStart(8, '0').toUpperCase();
        
        let hex = '';
        let ascii = '';
        
        for (let j = 0; j < chunk.length; j++) {
            const code = chunk.charCodeAt(j);
            hex += code.toString(16).padStart(2, '0').toUpperCase() + ' ';
            
            // ASCII preview (printable only)
            if (code >= 32 && code <= 126) {
                ascii += chunk[j];
            } else {
                ascii += '.';
            }
        }
        
        // Padding için boşluk ekle
        hex = hex.padEnd(48, ' ');
        
        lines.push({ offset, hex, ascii });
    }
    
    return lines;
}

/**
 * Encoding results render et
 */
function renderEncodingResults(result) {
    // Sonucu global değişkende sakla (copy için)
    window._lastEncodingResult = result;
    
    // Empty state gizle, results göster
    document.getElementById('enc-result-container').style.display = 'none';
    document.getElementById('enc-results').style.display = 'block';
    document.getElementById('enc-copy-output').style.display = 'inline-block';
    document.getElementById('enc-copy-json').style.display = 'inline-block';
    
    // Summary
    document.getElementById('enc-confidence').textContent = result.summary.base64Confidence + '%';
    document.getElementById('enc-layers').textContent = result.summary.layersDecoded;
    document.getElementById('enc-output-type').textContent = result.summary.outputType;
    document.getElementById('enc-obfuscation').textContent = result.summary.obfuscationScore + '/100';
    document.getElementById('enc-context').textContent = result.summary.guessedContext;
    
    // Layers
    const layersContainer = document.getElementById('enc-layers-container');
    layersContainer.innerHTML = '';
    
    result.layers.forEach((layer, idx) => {
        const layerDiv = document.createElement('div');
        layerDiv.className = 'enc-layer';
        
        const header = document.createElement('div');
        header.className = 'enc-layer-header';
        
        const title = document.createElement('div');
        title.className = 'enc-layer-title';
        const decodeTypeDisplay = layer.decodeType ? escapeHtml(layer.decodeType) : '';
        title.innerHTML = `
            <span>${idx === 0 ? '📥' : '📤'}</span>
            <span>Layer ${idx}${idx === 0 ? ' (Input)' : decodeTypeDisplay ? ' (' + decodeTypeDisplay + ')' : ''}</span>
        `;
        
        const meta = document.createElement('div');
        meta.className = 'enc-layer-meta';
        meta.textContent = `${layer.type} • ${layer.length} bytes • ${(layer.printableRatio * 100).toFixed(0)}% printable`;
        
        header.appendChild(title);
        header.appendChild(meta);
        
        const body = document.createElement('div');
        body.className = 'enc-layer-body';
        
        // Preview
        const preview = document.createElement('div');
        preview.className = 'enc-layer-preview';
        const previewText = layer.type === 'binary' ? '[Binary data - see hex preview below]' : layer.text.substring(0, 2000);
        preview.textContent = previewText + (layer.text.length > 2000 ? '\n\n... (truncated)' : '');
        body.appendChild(preview);
        
        // Delta
        if (layer.delta) {
            const delta = document.createElement('div');
            delta.className = 'enc-layer-delta';
            delta.textContent = '📊 ' + layer.delta;
            body.appendChild(delta);
        }
        
        // Actions
        const actions = document.createElement('div');
        actions.className = 'enc-layer-actions';
        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn-secondary btn-small';
        copyBtn.textContent = '📋 Copy Layer';
        copyBtn.onclick = (e) => copyToClipboard(layer.text, e.target);
        actions.appendChild(copyBtn);
        body.appendChild(actions);
        
        // Toggle
        header.onclick = () => {
            body.classList.toggle('expanded');
        };
        
        // İlk ve son layer'ı expanded aç
        if (idx === 0 || idx === result.layers.length - 1) {
            body.classList.add('expanded');
        }
        
        layerDiv.appendChild(header);
        layerDiv.appendChild(body);
        layersContainer.appendChild(layerDiv);
    });
    
    // Explain Log
    if (result.explainSteps.length > 0) {
        document.getElementById('enc-explain-card').style.display = 'block';
        const explainLog = document.getElementById('enc-explain-log');
        explainLog.innerHTML = '';
        
        result.explainSteps.forEach(step => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'enc-explain-step';
            stepDiv.textContent = step;
            explainLog.appendChild(stepDiv);
        });
    } else {
        document.getElementById('enc-explain-card').style.display = 'none';
    }
    
    // Hex Preview
    if (result.hexPreview) {
        document.getElementById('enc-hex-card').style.display = 'block';
        const hexPreview = document.getElementById('enc-hex-preview');
        hexPreview.innerHTML = '';
        
        result.hexPreview.forEach(line => {
            const lineDiv = document.createElement('div');
            lineDiv.className = 'enc-hex-line';
            lineDiv.innerHTML = `
                <span class="enc-hex-offset">${escapeHtml(String(line.offset))}:</span>
                <span class="enc-hex-bytes">${escapeHtml(line.hex)}</span>
                <span class="enc-hex-ascii">|${escapeHtml(line.ascii)}|</span>
            `;
            hexPreview.appendChild(lineDiv);
        });
    } else {
        document.getElementById('enc-hex-card').style.display = 'none';
    }
}

/**
 * Encoding results gizle
 */
function hideEncodingResults() {
    document.getElementById('enc-result-container').style.display = 'flex';
    document.getElementById('enc-results').style.display = 'none';
    document.getElementById('enc-copy-output').style.display = 'none';
    document.getElementById('enc-copy-json').style.display = 'none';
}

/**
 * Error göster
 */
function showEncError(message) {
    alert('⚠️ ' + message);
}

/**
 * Panoya kopyala
 */
function copyToClipboard(text, button) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showCopySuccess(button);
        }).catch(err => {
            fallbackCopy(text, button);
        });
    } else {
        fallbackCopy(text, button);
    }
}

/**
 * Fallback copy (HTTP için)
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
        showCopySuccess(button);
    } catch (err) {
        alert('Kopyalama başarısız. Lütfen manuel olarak kopyalayın.');
    }
    
    document.body.removeChild(textarea);
}

/**
 * Copy success feedback
 */
function showCopySuccess(button) {
    if (button) {
        const originalText = button.textContent;
        button.textContent = '✓ Kopyalandı!';
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    }
}

