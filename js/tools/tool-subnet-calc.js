/**
 * Tool 9: Subnet Calculator
 * IPv4 subnet hesaplamaları
 */

function initSubnetCalculator() {
    const ipInput = document.getElementById('subnet-ip');
    const cidrInput = document.getElementById('subnet-cidr');
    const calculateBtn = document.getElementById('subnet-calculate-btn');
    const clearBtn = document.getElementById('subnet-clear-btn');
    const resultsDiv = document.getElementById('subnet-results');
    
    // Calculate
    calculateBtn.addEventListener('click', () => {
        const ip = ipInput.value.trim();
        let cidr = cidrInput.value.trim();
        
        // Check if IP contains CIDR (192.168.1.0/24)
        const combined = ip.match(/^([0-9.]+)\/(\d+)$/);
        if (combined) {
            ipInput.value = combined[1];
            cidrInput.value = combined[2];
            cidr = combined[2];
        }
        
        const finalIp = combined ? combined[1] : ip;
        
        if (!isIPv4(finalIp)) {
            showToast('Geçersiz IPv4 adresi', 'error');
            return;
        }
        
        const cidrNum = parseInt(cidr);
        if (isNaN(cidrNum) || cidrNum < 0 || cidrNum > 32) {
            showToast('CIDR 0-32 arası olmalı', 'error');
            return;
        }
        
        const result = calculateSubnet(finalIp, cidrNum);
        renderSubnetResults(result);
        showToast('Hesaplama tamamlandı', 'success');
    });
    
    // Clear
    clearBtn.addEventListener('click', () => {
        ipInput.value = '';
        cidrInput.value = '';
        resultsDiv.innerHTML = '';
        resultsDiv.style.display = 'none';
        showToast('Temizlendi', 'info');
    });
}

/**
 * Calculate subnet
 */
function calculateSubnet(ip, cidr) {
    const ipInt = ipToInt(ip);
    const mask = (0xFFFFFFFF << (32 - cidr)) >>> 0;
    const network = (ipInt & mask) >>> 0;
    const broadcast = (network | (~mask >>> 0)) >>> 0;
    
    let firstHost, lastHost, usableHosts;
    
    if (cidr === 32) {
        // Single host
        firstHost = network;
        lastHost = network;
        usableHosts = 1;
    } else if (cidr === 31) {
        // Point-to-point (RFC 3021)
        firstHost = network;
        lastHost = broadcast;
        usableHosts = 2;
    } else {
        firstHost = network + 1;
        lastHost = broadcast - 1;
        usableHosts = Math.pow(2, 32 - cidr) - 2;
    }
    
    return {
        ip: ip,
        cidr: cidr,
        networkAddress: intToIp(network),
        broadcastAddress: intToIp(broadcast),
        subnetMask: intToIp(mask),
        firstHost: intToIp(firstHost),
        lastHost: intToIp(lastHost),
        usableHosts: usableHosts,
        totalHosts: Math.pow(2, 32 - cidr)
    };
}

/**
 * Render subnet results
 */
function renderSubnetResults(result) {
    const resultsDiv = document.getElementById('subnet-results');
    
    resultsDiv.innerHTML = `
        <div class="subnet-result-grid">
            <div class="subnet-result-item">
                <span class="subnet-label">Network Address:</span>
                <span class="subnet-value">${result.networkAddress}</span>
            </div>
            <div class="subnet-result-item">
                <span class="subnet-label">Broadcast Address:</span>
                <span class="subnet-value">${result.broadcastAddress}</span>
            </div>
            <div class="subnet-result-item">
                <span class="subnet-label">Subnet Mask:</span>
                <span class="subnet-value">${result.subnetMask}</span>
            </div>
            <div class="subnet-result-item">
                <span class="subnet-label">CIDR Notation:</span>
                <span class="subnet-value">${result.networkAddress}/${result.cidr}</span>
            </div>
            <div class="subnet-result-item">
                <span class="subnet-label">First Usable Host:</span>
                <span class="subnet-value">${result.firstHost}</span>
            </div>
            <div class="subnet-result-item">
                <span class="subnet-label">Last Usable Host:</span>
                <span class="subnet-value">${result.lastHost}</span>
            </div>
            <div class="subnet-result-item">
                <span class="subnet-label">Usable Hosts:</span>
                <span class="subnet-value">${result.usableHosts.toLocaleString()}</span>
            </div>
            <div class="subnet-result-item">
                <span class="subnet-label">Total Hosts:</span>
                <span class="subnet-value">${result.totalHosts.toLocaleString()}</span>
            </div>
        </div>
    `;
    
    resultsDiv.style.display = 'block';
}




