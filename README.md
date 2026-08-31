# Security Toolkit

SOC analistlerinin günlük triage, IOC işleme ve vaka notu işlerini tarayıcıda, çevrimdışı hızda yapması için hazırlanmış dahili araç seti.

Uygulama **tamamen client-side** çalışır: sunucuya veri göndermez, kurulum paketi veya derleme adımı yoktur. Analiz tarayıcıda yapılır. Reputation Check yalnızca ürettiği dış bağlantıları (VirusTotal, AbuseIPDB) senin tıklamanla açar.

Masaüstü ekran için tasarlanmıştır (önerilen genişlik **1200px ve üzeri**). Açılışta kısa bir splash görünür; ardından **Home** gelir. Araçlar sol menüden, Home kartlarından veya `H` kısayoluyla (Home’a dönüş) kullanılır. Açık/koyu tema sağ üstten değiştirilir.

---

## Kurulum

### Gereksinimler

- Modern bir tarayıcı (Chrome, Edge, Firefox, Safari)
- Python 3 **veya** başka bir statik dosya sunucusu  
  (dosyaları `file://` ile açmak bazı tarayıcılarda panoya kopyalama / IndexedDB kısıtına takılabilir; yerel HTTP önerilir)

### Adımlar

1. Bu depoyu klonlayın veya ZIP olarak indirip açın.

```bash
git clone <repo-url>
cd Security_Toolkit
```

2. Proje kökünde ( `index.html` ’in bulunduğu klasörde ) bir HTTP sunucusu başlatın.

**Python 3:**

```bash
python3 -m http.server 8080
```

**Node.js (http-server yüklüyse):**

```bash
npx --yes http-server -p 8080
```

3. Tarayıcıda şu adresi açın:

[http://127.0.0.1:8080/](http://127.0.0.1:8080/)

4. Pencere 1200px’den dar ise “Desktop Required” uyarısı çıkar. Pencereyi büyütüp **I resized, continue** deyin.

Sunucuyu durdurmak için terminalde `Ctrl+C` yeterlidir. İnternet bağlantısı, uygulamanın kendisini çalıştırmak için şart değildir.

### Klasör yapısı

```
index.html              Uygulama kabuğu (HTML)
css/styles.css          Tema, layout, bileşen stilleri
js/app.js               Navigasyon, tema, splash, Home
js/utils.js             Ortak yardımcılar (kopyala, toast, IOC tanıma)
js/storage/indexeddb.js Pano görselleri için IndexedDB
js/tools/               Her araç için bir JavaScript dosyası
samples/                Örnek HTTP request’ler (referans)
```

---

## Araçlar

### Core Tools

Günlük incelemenin omurgası: ham veri yapıştırılır, tür/anlam çıkarılır.

#### Request Analyzer

Ham HTTP isteğini (request line, header’lar, body) yapıştırıp bilinen saldırı izlerini arar.

**Ne zaman kullanılır:** WAF / IDS / proxy log’undan düşen şüpheli request, pentest artefaktı, ticket’a eklenmiş raw HTTP.

**Nasıl çalışır:** İstek parse edilir; tespit fonksiyonları öncelik sırasıyla çalışır. İlk eşleşen saldırı türü raporlanır.

**Tespit ettiği başlıca türler:**

- Log4j / JNDI injection
- Spring4Shell (CVE-2022-22965)
- Prototype pollution
- SQL injection
- XSS
- Command injection
- SSRF
- Directory traversal
- LFI / RFI
- Auth bypass
- XML injection / LDAP injection / XXE

**Çıktı:** Temiz / zararlı kararı, saldırı türü, kısa açıklama ve teknik işaret listesi. **Örnek Request Yapıştır** ile gömülü örnek yüklenir. `samples/test-request.txt` içinde ek örnek request’ler vardır (uygulama bunları otomatik okumaz; kopyalayıp yapıştırırsın).

> Bu bir imza tabanlı ilk bakıştır. “Temiz” çıktısı isteğin kesin güvenli olduğu anlamına gelmez.

#### Encoding Inspector

Base64, URL encoding ve karışık katmanları çözer. Phishing link’i, PowerShell `-enc`, WAF bypass encoding, iç içe encode edilmiş payload’lar için.

**Girdi:** Metin yapıştırma veya `.txt` / `.log` / `.json` dosyası.

**Seçenekler:**

- **Auto Detect** — Base64 olasılık skoruyla otomatik tanıma
- **Mixed Decode** — URL decode sonrası Base64 gibi katmanlı çözme
- **Recursive Decode** — En fazla 10 katmana kadar tekrar çözme
- **Explain Mode** — Her adımı yazılı anlatır
- **Safe Preview** — Kontrolsüz binary/HTML önizlemesini sınırlar
- **Delta** — Katmanlar arası farkı gösterir

**Çıktı:** Çözülmüş metin, katman özeti, JSON kopyası. Sonuçları kopyalayıp case notuna veya SIEM aramasına taşıyabilirsin.

#### Message Header

E-posta internet header’ını (Outlook “Internet headers”) hop hop inceler. Phishing / spoofing / relay triage.

**Girdi:** Yapıştırma, dosya (`.txt`, `.log`, `.eml`) veya sürükle-bırak. **Örnek Yükle** ve “Header nasıl alınır?” yardımı vardır (Outlook masaüstü).

**Ne üretir:**

- Received hop zinciri, zaman damgaları, hop’lar arası gecikme
- From / To / Subject (MIME encoded-word çözümü)
- SPF, DKIM, DMARC / Authentication-Results özeti
- X-Originating-IP ve ham parse edilmiş alanlar
- Analist notları (ör. büyük gecikme = greylisting / spam filtresi ipucu)

Raporu düz metin veya JSON olarak kopyalayabilirsin.

#### Windows Event ID Lookup

Security, Sysmon, PowerShell, Defender, Service ve RDP Event ID’leri için **çevrimdışı sözlük**. SIEM’de gördüğün ID’nin ne anlama geldiğini ve SOC’ta nelere bakman gerektiğini gösterir.

**Arama:** Event ID (`4625`), kaynak (`Sysmon`), kategori veya anahtar kelime (`lsass`, `kerberos`, `RDP`). Yazarken filtreler; **Lookup** sonuç sayısını doğrular, **Clear** sıfırlar.

**Kategoriler:** Logon, Account, Privilege, Process, Persistence, Policy, Share, Sysmon, PowerShell, Defender, Service, RDP.

**Kart içeriği:** Resmi ad, kaynak (Security / Sysmon / …), önem (info / warn / critical), analist notu (LogonType, Kerberoasting RC4, lsass GrantedAccess vb.). **ID Kopyala** / **Özet Kopyala** ile ticket’a taşırsın.

Aynı sayı farklı kaynaklarda geçebilir (ör. Sysmon 21 ve RDP 21); ikisi de listelenir.

---

### Analysis Tools

IOC’yi temizlemek, tekilleştirmek ve dış istihbarat linki üretmek.

#### Reputation Check

Satır satır veya karışık yapıştırılan IOC’leri tanır, her biri için istihbarat URL’si üretir. Kendisi sorgu atmaz; tarayıcıda sen açarsın.

| IOC türü | Üretilen link |
| --- | --- |
| IPv4 | VirusTotal IP + AbuseIPDB |
| Domain | VirusTotal domain |
| URL | VirusTotal URL (SHA-256 tabanlı GUI yolu) |
| Hash (MD5 / SHA-1 / SHA-256) | VirusTotal file |

Çoklu giriş desteklenir (boşluk, virgül, satır). `Ctrl+Enter` / `Cmd+Enter` ile üretir. Kart görünümünde tıklanabilir linkler çıkar.

#### Defang / Refang

IOC’yi ticket, chat veya mailde **tıklanmaz** hale getirir veya geri çevirir. Kazara tıklama / otomatik unfurl riskini keser.

- **Defang:** `http://` → `hxxp://`, `https://` → `hxxps://`, noktalar → `[.]` (IP ve domain dahil)
- **Refang:** `hxxp(s)://` ve `[.]` geri alınır

Girdi-çıktı paneli; çıktı tek tıkla kopyalanır.

#### Duplicate Delete

IOC listesi, IP bloğu, hash dump, kullanıcı listesi gibi tekrarlı satırları tekilleştirir.

**Girdi:** Token’lara bölünür (boşluk / virgül / noktalı virgül / pipe).  
**Çıktı:** Benzersiz satırlar + istatistik (toplam, benzersiz, kaldırılan).  
**Sıralama:** Sayısal veya Türkçe locale ile artan / azalan.

Hunting listesini SIEM’e basmadan önce temizlemek için.

#### Email Scope

E-posta adreslerinden allow/block veya hunting **wildcard kapsamı** üretir.

Örnek: `ali.veli@mail.sirket.com.tr` → `*@*.sirket.com.tr` (taban alan adına indirger). Geçerli adresler toplanır, tekrarlar elenir, her satıra bir kapsam yazılır.

---

### Send Mail

#### Mail Otomasyonu

Mail adresi veya IP engelleme bildirimi için **standart taslak** üretir. SMTP sunucusuna mail atmaz; gövdeyi önizler, kopyalar, varsayılan mail istemcisini `mailto:` ile açabilir.

**Mod 1 — Mail adresi engelleme:** Engellenen adresleri satır satır girersin; konu ve gövde şablonu oluşur.  
**Mod 2 — IP engelleme:** Tablo (IP, alert kodu, sebep, Checkpoint FW kontrolü). Satır ekle/sil.

Akış: alanları doldur → **Kontrol Et** (taslak önizleme) → onay kutusu → **Gönder** (istemci açılır). Taslak onaysız gönderilmez.

Alıcı / CC alanları şablon içindir; kendi süreç adreslerine göre değiştir.

---

### Utilities

Vaka sırasında yanında duran defter, liste ve hesap araçları. Veri tarayıcıda kalır (`localStorage` / IndexedDB).

#### Case Notes

Olay notları için tek sayfalık defter. Yazarken (kısa gecikmeyle) **otomatik kaydeder**. Karakter sayısı görünür. Kopyala, TXT dışa aktar, tümünü sil (onaylı).

Tarayıcı profili / origin değişirse not görünmez; kritik metni ayrıca ticket’a al.

#### Todo List

Shift / vaka görev listesi. Alt görev (iç içe), tamamlama, tamamlananları temizle, tümünü sil, TXT dışa aktar. Kayıt `localStorage` üzerindedir.

#### Subnet Calculator

IPv4 + CIDR (ayrı alan veya `192.168.1.0/24` tek satır).

**Çıktı:** Ağ adresi, broadcast, netmask, wildcard, ilk/son kullanılabilir host, kullanılabilir host sayısı. `/31` (RFC 3021 nokta-nokta) ve `/32` (tek host) ayrıca ele alınır.

Alert’teki kaynak IP’nin hangi ağa düştüğünü, kapsam yazmayı hızlandırır.

#### Pano

Sık kullanılan metin ve görselleri kart olarak saklar; tek tıkla kopyalar.

- Metin ekleme, panodan yapıştırma (metin veya görsel)
- Tuttur / kilitle, filtre, yalnızca tutturulanlar
- Çoklu seçim: toplu sil, toplu kilitle, seçimi temizle
- Sıralama: tutturulanlar önde; sürükle-bırak
- En fazla 100 öğe; görseller IndexedDB’de tutulur

---

## Kullanım notları

| Konu | Açıklama |
| --- | --- |
| Kısayol | Odak input’ta değilken `H` → Home |
| Tema | Sağ üst; tercih `localStorage` (`stkV3_theme`) |
| Yerel veri | Case Notes, Todo, Pano bu origin’de saklanır |
| Reputation Check | Link üretir; VT/AbuseIPDB’ye sen gidersin |
| Mail Otomasyonu | Mail sunucusu yoktur; `mailto:` / kopyala |
| Event ID sözlüğü | Gömülü listedir; her Windows ID’si yoktur, SOC’ta sık görülenler vardır |
| Gizlilik | Request / header / IOC tarayıcı dışına analiz için gönderilmez |

---

## Lisans ve kapsam

Dahili güvenlik analizi içindir. Üretim SIEM’i, EDR politikası veya resmi istihbarat kararı yerine geçmez. Araç çıktısını vaka bağlamın ve kurum süreçlerinle doğrula.
