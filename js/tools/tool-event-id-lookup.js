/**
 * Tool: Windows Event ID Lookup
 * SOC analistleri için offline Event ID sözlüğü
 */

const EVENT_ID_CATALOG = [
    { id: 4624, source: 'Security', category: 'Logon', severity: 'info', name: 'Successful logon', note: 'LogonType kontrol et: 2 interactive, 3 network, 10 RDP, 5 service. Source IP ve Account Name ile korelasyon yap.' },
    { id: 4625, source: 'Security', category: 'Logon', severity: 'warn', name: 'Failed logon', note: 'Brute force / password spray göstergesi. Failure Reason, Status ve Sub Status kodlarını oku. Aynı hesap veya kaynak IP tekrarını ara.' },
    { id: 4634, source: 'Security', category: 'Logon', severity: 'info', name: 'Account logoff', note: 'Oturum kapanışı. 4624 ile eşleyerek oturum süresini hesapla. Tek başına zayıf sinyal.' },
    { id: 4647, source: 'Security', category: 'Logon', severity: 'info', name: 'User initiated logoff', note: 'Kullanıcı bilinçli çıkış yaptı. Beklenmeyen host’ta görülürse session hijack sonrası temizlik olabilir.' },
    { id: 4648, source: 'Security', category: 'Logon', severity: 'warn', name: 'Logon with explicit credentials', note: 'RunAs, mapped drive, lateral movement. Subject vs Target hesabı farklıysa şüpheli. Process Name’e bak (cmd, powershell, wmiprvse).' },
    { id: 4672, source: 'Security', category: 'Privilege', severity: 'warn', name: 'Special privileges assigned to new logon', note: 'SeDebug, SeTcb, SeBackup gibi yüksek yetkiler. Admin logon’da normal; workstation’da sıradan kullanıcıdaysa incele.' },
    { id: 4768, source: 'Security', category: 'Logon', severity: 'info', name: 'Kerberos TGT requested', note: 'DC’de görünür. Ticket Encryption Type 0x17 (RC4) AS-REP roast / zayıf şifreleme işareti olabilir.' },
    { id: 4769, source: 'Security', category: 'Logon', severity: 'info', name: 'Kerberos service ticket requested', note: 'Service Name ve Ticket Options. Kerberoasting için RC4 (0x17) ve anormal SPN isteklerini izle.' },
    { id: 4771, source: 'Security', category: 'Logon', severity: 'warn', name: 'Kerberos pre-authentication failed', note: 'Başarısız Kerberos pre-auth. Password spray / brute force. 4625’ten daha temiz Kerberos sinyali.' },
    { id: 4776, source: 'Security', category: 'Logon', severity: 'warn', name: 'NTLM credential validation', note: 'NTLM doğrulama. Legacy auth ve pass-the-hash bağlamında önemli. Error Code 0xC000006A yanlış parola.' },
    { id: 4800, source: 'Security', category: 'Logon', severity: 'info', name: 'Workstation locked', note: 'Ekran kilitlendi. Fiziksel erişim / unattended session senaryolarında zaman çizelgesi için kullan.' },
    { id: 4801, source: 'Security', category: 'Logon', severity: 'info', name: 'Workstation unlocked', note: 'Kilit açıldı. Mesai dışı unlock + yeni 4624 kombinasyonu şüpheli olabilir.' },

    { id: 4720, source: 'Security', category: 'Account', severity: 'warn', name: 'User account created', note: 'Yeni hesap. Creator SID, SAM Account Name, UAC flag. Hidden admin / persistence için klasik adım.' },
    { id: 4722, source: 'Security', category: 'Account', severity: 'warn', name: 'User account enabled', note: 'Devre dışı hesap yeniden açıldı. Eski servis hesabı veya dormant account abuse.' },
    { id: 4723, source: 'Security', category: 'Account', severity: 'info', name: 'Attempt to change password', note: 'Kullanıcı kendi parolasını değiştirmeye çalıştı. Başarı/başarısızlık ve Subject’e bak.' },
    { id: 4724, source: 'Security', category: 'Account', severity: 'warn', name: 'Attempt to reset password', note: 'Başka bir hesabın parolası sıfırlandı. Helpdesk dışı actor + privileged target = öncelikli.' },
    { id: 4725, source: 'Security', category: 'Account', severity: 'info', name: 'User account disabled', note: 'Hesap kapatıldı. IR containment beklentisiyle uyumlu mu, yoksa saldırgan iz mi siliyor?' },
    { id: 4726, source: 'Security', category: 'Account', severity: 'warn', name: 'User account deleted', note: 'Hesap silindi. Coverage gap ve anti-forensics. Silinen SAM adı ve kim sildi.' },
    { id: 4728, source: 'Security', category: 'Account', severity: 'warn', name: 'Member added to security-enabled global group', note: 'Global grup üyeliği. Domain Admins / sensitive group ise P1 adayı.' },
    { id: 4732, source: 'Security', category: 'Account', severity: 'warn', name: 'Member added to security-enabled local group', note: 'Local Administrators / RDP Users ekleme. Persistence ve privilege escalation.' },
    { id: 4738, source: 'Security', category: 'Account', severity: 'info', name: 'User account changed', note: 'UAC, SPN, password never expires gibi değişiklikler. Changed attributes’a bak.' },
    { id: 4740, source: 'Security', category: 'Account', severity: 'warn', name: 'Account locked out', note: 'Lockout. Spray / stale credential / misconfigured service. Caller Computer Name önemli.' },
    { id: 4756, source: 'Security', category: 'Account', severity: 'warn', name: 'Member added to security-enabled universal group', note: 'Universal group (ör. nested privileged). Cross-domain privilege yolu olabilir.' },
    { id: 4767, source: 'Security', category: 'Account', severity: 'info', name: 'User account unlocked', note: 'Lockout sonrası açıldı. Kimin unlock ettiğini 4740 ile eşle.' },
    { id: 4781, source: 'Security', category: 'Account', severity: 'warn', name: 'Account name changed', note: 'SAM rename. Defense evasion; eski isimle hunting kurallarını atlatmak için kullanılır.' },
    { id: 4798, source: 'Security', category: 'Account', severity: 'info', name: 'User local group membership enumerated', note: 'Hesabın local grupları listelendi. Recon. Process ve Subject şüpheliyse incele.' },
    { id: 4799, source: 'Security', category: 'Account', severity: 'info', name: 'Security-enabled local group membership enumerated', note: 'Local privileged grup üyeliği enumeration. Sık recon sinyali.' },

    { id: 4688, source: 'Security', category: 'Process', severity: 'info', name: 'A new process has been created', note: 'CommandLine audit açıksa altın değerinde. Parent-child (winword→cmd, wmiprvse→powershell) avla.' },
    { id: 4689, source: 'Security', category: 'Process', severity: 'info', name: 'A process has exited', note: 'Süre ve Exit Status. Kısa ömürlü şüpheli process’lerle 4688’i birleştir.' },
    { id: 4697, source: 'Security', category: 'Persistence', severity: 'warn', name: 'A service was installed', note: 'Yeni servis. Service File Name, Account. 7045 ile birlikte persistence.' },
    { id: 4698, source: 'Security', category: 'Persistence', severity: 'warn', name: 'Scheduled task created', note: 'Task Name, Command, Run As. Persistence / lateral. At / schtasks / XML içeriği.' },
    { id: 4699, source: 'Security', category: 'Persistence', severity: 'warn', name: 'Scheduled task deleted', note: 'Görev silindi. İz temizliği veya cleanup script. 4698 ile eşle.' },
    { id: 4700, source: 'Security', category: 'Persistence', severity: 'info', name: 'Scheduled task enabled', note: 'Önceden duran görev açıldı. Dormant persistence aktivasyonu.' },
    { id: 4701, source: 'Security', category: 'Persistence', severity: 'info', name: 'Scheduled task disabled', note: 'Görev kapatıldı. Containment veya saldırganın gürültüyü kısması.' },
    { id: 4702, source: 'Security', category: 'Persistence', severity: 'warn', name: 'Scheduled task updated', note: 'Action/trigger değişti. Meşru görev hijack (Living-off-the-land persistence).' },

    { id: 1102, source: 'Security', category: 'Policy', severity: 'critical', name: 'The audit log was cleared', note: 'Security log silindi. Yüksek öncelik. Kim sildi, hemen sonra hangi host’ta aktivite var.' },
    { id: 4616, source: 'Security', category: 'Policy', severity: 'warn', name: 'The system time was changed', note: 'Saat kaydırma ile log korelasyonunu bozar. Process Name (w32tm vs elle) ve Previous/New time.' },
    { id: 4719, source: 'Security', category: 'Policy', severity: 'critical', name: 'System audit policy was changed', note: 'Audit kapatıldıysa kör nokta. Category/Subcategory ve New/Old policy.' },
    { id: 4904, source: 'Security', category: 'Policy', severity: 'warn', name: 'An attempt was made to register a security event source', note: 'Yeni event source kaydı. Log poisoning / fake source nadir ama gürültülü olabilir.' },
    { id: 4905, source: 'Security', category: 'Policy', severity: 'warn', name: 'An attempt was made to unregister a security event source', note: 'Source kaldırıldı. Logging bypass denemesi olabilir.' },

    { id: 5140, source: 'Security', category: 'Share', severity: 'info', name: 'A network share object was accessed', note: 'Share erişimi. ADMIN$, C$, IPC$ + unusual account = lateral movement.' },
    { id: 5145, source: 'Security', category: 'Share', severity: 'warn', name: 'A network share object was checked to see whether client can be granted desired access', note: 'Dosya düzeyinde share erişim denemesi. Sensitive path + Access Mask Write/Create.' },
    { id: 5142, source: 'Security', category: 'Share', severity: 'warn', name: 'A network share object was added', note: 'Yeni share. Data staging / exfil hazırlığı olabilir.' },
    { id: 5143, source: 'Security', category: 'Share', severity: 'info', name: 'A network share object was modified', note: 'Share izin veya path değişti.' },
    { id: 5144, source: 'Security', category: 'Share', severity: 'warn', name: 'A network share object was deleted', note: 'Share silindi. Staging sonrası temizlik.' },

    { id: 4662, source: 'Security', category: 'Account', severity: 'info', name: 'An operation was performed on an object', note: 'AD object işlemi. DCSync (Replicating Directory Changes) bu event ile avlanır; GUID/permission bak.' },
    { id: 4663, source: 'Security', category: 'Process', severity: 'info', name: 'An attempt was made to access an object', note: 'Object access. Gürültülü olabilir; sacl ile daraltılmışsa file/registry theft için kullan.' },
    { id: 5136, source: 'Security', category: 'Account', severity: 'warn', name: 'A directory service object was modified', note: 'AD attribute değişimi. AdminCount, SPN, sidHistory, ACL. DCSync hazırlığı veya persistence.' },
    { id: 5137, source: 'Security', category: 'Account', severity: 'warn', name: 'A directory service object was created', note: 'Yeni AD nesnesi (user, computer, group, GPO).' },
    { id: 5141, source: 'Security', category: 'Account', severity: 'warn', name: 'A directory service object was deleted', note: 'AD nesnesi silindi. Backdoor hesabın kapatılması veya iz silme.' },

    { id: 1, source: 'Sysmon', category: 'Sysmon', severity: 'info', name: 'Process Create', note: 'Image, CommandLine, ParentImage, Hashes, User. 4688’den daha zengin. LOLBin parent-child burada net.' },
    { id: 2, source: 'Sysmon', category: 'Sysmon', severity: 'warn', name: 'File creation time changed', note: 'timestomp. Antiforensics. TargetFilename + Image.' },
    { id: 3, source: 'Sysmon', category: 'Sysmon', severity: 'info', name: 'Network connection', note: 'DestinationIp/Port, Initiated, Image. C2 ve lateral için. Gürültülü; filter’lı config şart.' },
    { id: 5, source: 'Sysmon', category: 'Sysmon', severity: 'info', name: 'Process terminated', note: 'Process kapanışı. Kısa ömürlü injector/loader ile Event 1 eşle.' },
    { id: 6, source: 'Sysmon', category: 'Sysmon', severity: 'warn', name: 'Driver loaded', note: 'Signed/unsigned driver. BYOVD. Signature ve ImageLoaded.' },
    { id: 7, source: 'Sysmon', category: 'Sysmon', severity: 'info', name: 'Image loaded', note: 'DLL load. Unsigned DLL in signed process, AppInit, sideload. Gürültülü.' },
    { id: 8, source: 'Sysmon', category: 'Sysmon', severity: 'warn', name: 'CreateRemoteThread', note: 'Process injection. SourceImage → TargetImage. rundll32/powershell → lsass şüpheli.' },
    { id: 10, source: 'Sysmon', category: 'Sysmon', severity: 'warn', name: 'ProcessAccess', note: 'lsass erişimi (credential dump). GrantedAccess 0x1010/0x1410 klasik Mimikatz paterni; false positive’e dikkat.' },
    { id: 11, source: 'Sysmon', category: 'Sysmon', severity: 'info', name: 'FileCreate', note: 'Dropper / staging. Startup, Temp, ProgramData, Tasks klasörleri.' },
    { id: 12, source: 'Sysmon', category: 'Sysmon', severity: 'info', name: 'Registry object added or deleted', note: 'Run key, Winlogon, Services, IFEO. Persistence.' },
    { id: 13, source: 'Sysmon', category: 'Sysmon', severity: 'info', name: 'Registry value set', note: 'RunOnce, Userinit, AppInit_DLLs, Service ImagePath değişimi.' },
    { id: 15, source: 'Sysmon', category: 'Sysmon', severity: 'warn', name: 'FileCreateStreamHash', note: 'ADS (Zone.Identifier dışı stream). Gizli payload saklama.' },
    { id: 17, source: 'Sysmon', category: 'Sysmon', severity: 'info', name: 'Pipe created', note: 'Named pipe. Lateral / C2 (PSEXESVC, Cobalt).' },
    { id: 18, source: 'Sysmon', category: 'Sysmon', severity: 'info', name: 'Pipe connected', note: 'Pipe bağlantısı. Event 17 ile eşle.' },
    { id: 19, source: 'Sysmon', category: 'Sysmon', severity: 'warn', name: 'WMI Event Filter', note: 'WMI persistence filtresi. Event 20/21 ile üçlü bak.' },
    { id: 20, source: 'Sysmon', category: 'Sysmon', severity: 'warn', name: 'WMI Event Consumer', note: 'WMI consumer (CommandLineEventConsumer). Persistence.' },
    { id: 21, source: 'Sysmon', category: 'Sysmon', severity: 'warn', name: 'WMI Event Consumer To Filter binding', note: 'Filter-consumer bağlandı. WMI backdoor tamamlanmış demektir.' },
    { id: 22, source: 'Sysmon', category: 'Sysmon', severity: 'info', name: 'DNS query', note: 'QueryName. DGA, DoH öncesi, C2 domain. Beklenmeyen process’lerden DNS.' },
    { id: 23, source: 'Sysmon', category: 'Sysmon', severity: 'info', name: 'FileDelete (archived)', note: 'Silinen dosya arşivlendi (config’e bağlı). Temizlik / ransomware precursor.' },
    { id: 25, source: 'Sysmon', category: 'Sysmon', severity: 'warn', name: 'Process Tampering', note: 'Herpaderping / hollowing / image tamper. SourceImage ve Type.' },
    { id: 26, source: 'Sysmon', category: 'Sysmon', severity: 'info', name: 'FileDelete logged', note: 'Silme logu (arşiv yok). Event 23’ten daha hafif.' },

    { id: 400, source: 'PowerShell', category: 'PowerShell', severity: 'info', name: 'Engine state is started', note: 'PowerShell oturumu açıldı. HostVersion, HostName. 4104 yoksa bile session başlangıcı.' },
    { id: 403, source: 'PowerShell', category: 'PowerShell', severity: 'info', name: 'Engine state is stopped', note: 'Oturum kapandı. 400 ile süre hesapla.' },
    { id: 600, source: 'PowerShell', category: 'PowerShell', severity: 'info', name: 'Provider started', note: 'Provider yükleme. Nadiren tek başına actionable.' },
    { id: 4103, source: 'PowerShell', category: 'PowerShell', severity: 'info', name: 'Module logging', note: 'Pipeline execution. Parametreler 4104’ten daha az detaylı ama komut izi verir.' },
    { id: 4104, source: 'PowerShell', category: 'PowerShell', severity: 'warn', name: 'Script block logging', note: 'Script bloğu. EncodedCommand, IEX, DownloadString, AMSI bypass. Parçalı blokları birleştir.' },
    { id: 4105, source: 'PowerShell', category: 'PowerShell', severity: 'info', name: 'Script block invocation started', note: 'Blok çalışmaya başladı. 4104 ile eşle.' },
    { id: 4106, source: 'PowerShell', category: 'PowerShell', severity: 'info', name: 'Script block invocation finished', note: 'Blok bitti. Hata kodu varsa failed payload.' },

    { id: 7030, source: 'System', category: 'Service', severity: 'warn', name: 'Service error / last error reported', note: 'Servis hata verdi. Crash sonrası persistence retry olabilir.' },
    { id: 7034, source: 'System', category: 'Service', severity: 'warn', name: 'Service terminated unexpectedly', note: 'Beklenmedik sonlanma. Tamper veya unstable malware servisi.' },
    { id: 7036, source: 'System', category: 'Service', severity: 'info', name: 'Service entered running/stopped state', note: 'Start/stop. Gürültülü; unusual service name ile filtrele.' },
    { id: 7040, source: 'System', category: 'Service', severity: 'warn', name: 'Service start type changed', note: 'Disabled → Auto. Persistence veya savunma kapatma (WinDefend).' },
    { id: 7045, source: 'System', category: 'Service', severity: 'warn', name: 'A service was installed in the system', note: 'Yeni servis. Image path, Service Type, Account. 4697 ile birlikte bak.' },
    { id: 104, source: 'System', category: 'Policy', severity: 'critical', name: 'The log file was cleared', note: 'System/Application log temizliği. 1102’nin kardeşi. Anti-forensics.' },

    { id: 1116, source: 'Defender', category: 'Defender', severity: 'critical', name: 'Malware or potentially unwanted software detected', note: 'Tespit. Threat Name, Path, User, Process. Alert triage başlangıcı.' },
    { id: 1117, source: 'Defender', category: 'Defender', severity: 'warn', name: 'Action taken on malware', note: 'Quarantine/Remove/Allow. Allow veya failed action = follow-up.' },
    { id: 1118, source: 'Defender', category: 'Defender', severity: 'info', name: 'Action on malware failed', note: 'Aksiyon başarısız. Aktif tehdit duruyor olabilir.' },
    { id: 1119, source: 'Defender', category: 'Defender', severity: 'critical', name: 'Critical failure taking action on malware', note: 'Kritik başarısızlık. Immediate IR.' },
    { id: 5001, source: 'Defender', category: 'Defender', severity: 'critical', name: 'Real-time protection disabled', note: 'RTP kapatıldı. Defense evasion. Kim, hangi process, ne kadar süre.' },
    { id: 5007, source: 'Defender', category: 'Defender', severity: 'warn', name: 'Antivirus configuration changed', note: 'Exclusion, cloud protection, sample submission. Exclusion ekleme klasik bypass.' },
    { id: 5010, source: 'Defender', category: 'Defender', severity: 'critical', name: 'Scanning for malware is disabled', note: 'Scan kapatıldı. 5001 ile birlikte bak.' },
    { id: 5012, source: 'Defender', category: 'Defender', severity: 'warn', name: 'Scanning for viruses is disabled', note: 'Virus scanning disable. Policy vs local tamper ayır.' },

    { id: 21, source: 'RDP', category: 'RDP', severity: 'info', name: 'Remote Desktop session logon', note: 'TerminalServices-LocalSessionManager. Source IP + user. 4624 LogonType 10 ile eşle.' },
    { id: 24, source: 'RDP', category: 'RDP', severity: 'info', name: 'Remote Desktop session disconnected', note: 'Disconnect. Session steal / idle disconnect ayır.' },
    { id: 25, source: 'RDP', category: 'RDP', severity: 'info', name: 'Remote Desktop session reconnected', note: 'Reconnect. Başkasının session’ına yapışma senaryosu.' },
    { id: 1149, source: 'RDP', category: 'RDP', severity: 'info', name: 'User authentication succeeded (RDP)', note: 'RemoteDesktopServices-RDPCoreTS. Auth başarılı; 4624/21 ile doğrula.' },
    { id: 4825, source: 'Security', category: 'RDP', severity: 'warn', name: 'A user was denied access to Remote Desktop', note: 'RDP erişim reddi. Yetkisiz deneme veya lockout öncesi.' },

    { id: 8003, source: 'AppLocker', category: 'Process', severity: 'info', name: 'AppLocker EXE/DLL would have been blocked (Audit)', note: 'Audit mode. Politika production’da block olsaydı yakalanırdı. Tuning için.' },
    { id: 8004, source: 'AppLocker', category: 'Process', severity: 'warn', name: 'AppLocker EXE/DLL was blocked', note: 'Çalıştırma engellendi. Shadow IT veya malware drop.' },
    { id: 8006, source: 'AppLocker', category: 'Process', severity: 'info', name: 'AppLocker script would have been blocked (Audit)', note: 'Script audit. PowerShell/js/vbs.' },
    { id: 8007, source: 'AppLocker', category: 'Process', severity: 'warn', name: 'AppLocker script was blocked', note: 'Script block. Bypass denemesi (mshta, wscript) ile birlikte bak.' }
];

const EVENT_ID_CATEGORIES = ['Tümü', 'Logon', 'Account', 'Privilege', 'Process', 'Persistence', 'Policy', 'Share', 'Sysmon', 'PowerShell', 'Defender', 'Service', 'RDP'];

function initEventIdLookup() {
    const root = document.getElementById('tool-event-id-lookup');
    const searchInput = document.getElementById('evid-search');
    const lookupBtn = document.getElementById('evid-lookup-btn');
    const clearBtn = document.getElementById('evid-clear-btn');
    const filters = document.getElementById('evid-filters');
    const results = document.getElementById('evid-results');
    const countEl = document.getElementById('evid-count');

    if (!root || !searchInput || !lookupBtn || !clearBtn || !filters || !results || !countEl) {
        return;
    }

    let activeCategory = 'Tümü';

    EVENT_ID_CATEGORIES.forEach((cat) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'evid-filter-btn' + (cat === 'Tümü' ? ' active' : '');
        btn.textContent = cat;
        btn.addEventListener('click', () => {
            activeCategory = cat;
            filters.querySelectorAll('.evid-filter-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            renderEventIdResults(searchInput.value, activeCategory, results, countEl);
        });
        filters.appendChild(btn);
    });

    lookupBtn.addEventListener('click', () => {
        renderEventIdResults(searchInput.value, activeCategory, results, countEl);
        const n = results.querySelectorAll('.evid-card').length;
        if (n === 0) {
            showToast('Eşleşen Event ID bulunamadı', 'error');
        } else {
            showToast(`${n} Event ID bulundu`, 'success');
        }
    });

    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        activeCategory = 'Tümü';
        filters.querySelectorAll('.evid-filter-btn').forEach((b) => {
            b.classList.toggle('active', b.textContent === 'Tümü');
        });
        renderEventIdResults('', 'Tümü', results, countEl);
        showToast('Temizlendi', 'info');
    });

    searchInput.addEventListener('input', () => {
        renderEventIdResults(searchInput.value, activeCategory, results, countEl);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            lookupBtn.click();
        }
    });

    results.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-evid-copy]');
        if (!btn) return;
        copyText(btn.getAttribute('data-evid-copy'), btn);
    });

    renderEventIdResults('', 'Tümü', results, countEl);
}

function filterEventIds(query, category) {
    const q = (query || '').trim().toLowerCase();
    const numericHits = (q.match(/\d+/g) || []).map((n) => parseInt(n, 10));

    return EVENT_ID_CATALOG.filter((item) => {
        if (category && category !== 'Tümü' && item.category !== category) {
            return false;
        }
        if (!q) {
            return true;
        }
        if (numericHits.includes(item.id)) {
            return true;
        }
        const hay = [
            String(item.id),
            item.source,
            item.category,
            item.name,
            item.note,
            item.severity
        ].join(' ').toLowerCase();
        return hay.includes(q);
    }).sort((a, b) => {
        const aExact = numericHits.includes(a.id) ? 0 : 1;
        const bExact = numericHits.includes(b.id) ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        if (a.source !== b.source) return a.source.localeCompare(b.source);
        return a.id - b.id;
    });
}

function renderEventIdResults(query, category, results, countEl) {
    const items = filterEventIds(query, category);
    countEl.textContent = `${items.length} kayıt`;

    if (items.length === 0) {
        results.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🪟</div>
                <p class="empty-state-text">Eşleşen Event ID yok. ID, kaynak veya anahtar kelime deneyin.</p>
            </div>`;
        return;
    }

    results.innerHTML = items.map((item) => {
        const summary = `Event ID ${item.id} (${item.source}) — ${item.name}`;
        return `
            <article class="evid-card evid-card--${item.severity}">
                <div class="evid-card-header">
                    <div class="evid-card-id">
                        <span class="evid-id-num">${item.id}</span>
                        <span class="evid-id-source">${escapeEventIdHtml(item.source)}</span>
                    </div>
                    <div class="evid-card-tags">
                        <span class="evid-tag">${escapeEventIdHtml(item.category)}</span>
                        <span class="evid-tag evid-tag--${item.severity}">${escapeEventIdHtml(item.severity)}</span>
                    </div>
                </div>
                <h3 class="evid-card-name">${escapeEventIdHtml(item.name)}</h3>
                <p class="evid-card-note">${escapeEventIdHtml(item.note)}</p>
                <div class="evid-card-actions">
                    <button type="button" class="btn btn-secondary btn-small" data-evid-copy="${item.id}">ID Kopyala</button>
                    <button type="button" class="btn btn-secondary btn-small" data-evid-copy="${escapeEventIdAttr(summary)}">Özet Kopyala</button>
                </div>
            </article>`;
    }).join('');
}

function escapeEventIdHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeEventIdAttr(value) {
    return escapeEventIdHtml(value).replace(/'/g, '&#39;');
}
