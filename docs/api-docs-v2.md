# Youthside ATS API Dokümantasyonu

> **Base URL:** `https://api.youthside.co/api` (yerel: `http://localhost/youthside_ats/public/api`)  
> **Version:** 2.7.0 (Backend'siz vitrin sitesi için API tamamlama + güvenlik düzeltmeleri)  
> **Last Updated:** 2026-10-12
>
> Bu doküman **admin dışı** tüm uçları kapsar (aday, şirket paneli, herkese açık vitrin).
> Youthside yönetim paneli uçları (`/admin/*`) için bkz. [`admin-api.md`](../admin-api.md).
> `cron/*` (HMAC ile kendi kendini tetikleyen worker'lar) ve `internal/*` (`X-Internal-Key` ile
> servisler arası) dış istemciler için değildir ve burada belgelenmez.

---

## 🔐 Kimlik Doğrulama ve RBAC (Rol Bazlı Erişim)

Sistem **Role-Based Access Control (RBAC)** mimarisine geçmiştir. Yetkilendirme artık "Kişi" bazlı değil, **"İzin (Permission)"** bazlıdır.

### 1. Roller ve İzinler Matrisi

| Rol                 | Yetki Kapsamı             | İzinler                                                                      |
| :------------------ | :------------------------ | :--------------------------------------------------------------------------- |
| **`OWNER`**         | **Tam Yetki**             | Şirket Ayarları, Ekip Yönetimi, İlanlar, Etkinlikler (Her şey)               |
| **`ADMIN`**         | **Operasyonel Tam Yetki** | Ekip Yönetimi, İlanlar, Etkinlikler (Şirket ayarlarını değiştiremez)         |
| **`JOB_MANAGER`**   | **İşe Alım Yöneticisi**   | İlan Oluşturma/Düzenleme, Başvuru Yönetimi, Ekip Listesini Görüntüleme       |
| **`EVENT_MANAGER`** | **Etkinlik Yöneticisi**   | Etkinlik Oluşturma/Düzenleme, Katılımcı Yönetimi, Ekip Listesini Görüntüleme |

> ⚠️ **Not:** Eski `RECRUITER` rolü artık `JOB_MANAGER` olarak, `EVENT_EDITOR` rolü ise `EVENT_MANAGER` olarak çalışmaktadır.

### 2. İzin Anahtarları (Permissions)

Endpoint'lerde aşağıdaki izinler kontrol edilir:

- `company.update`: Şirket profilini ve şirket geneli politikaları düzenleme — yanıt adresleri dâhil. (Sadece OWNER / "Kurucu")
- `team.manage`: Ekip üyesi ekleme/silme. (OWNER, ADMIN)
- `team.read`: Ekip listesini görüntüleme. (Herkes)
- `job.manage`: İlan ve başvuru süreçlerini yönetme. (OWNER, ADMIN, JOB_MANAGER)
- `event.manage`: Etkinlik ve katılımcı süreçlerini yönetme. (OWNER, ADMIN, EVENT_MANAGER)
- `job.pin.manage`: İlan sabitleme (pin) ve sıralama. (OWNER, ADMIN, JOB_MANAGER)
- `event.pin.manage`: Etkinlik sabitleme (pin) ve sıralama. (OWNER, ADMIN, EVENT_MANAGER)
- `integration.manage`: Entegrasyon (ATS/HR sistemi) bağlantısı ekleme, test, silme. (OWNER, ADMIN)
- `integration.transfer`: Başvuruları entegrasyona aktarma. (OWNER, ADMIN, JOB_MANAGER)

Kaynak: `services/RoleManager.php`. Kullanıcının izinleri JWT içinde `context.permissions` dizisinde taşınır.

### 3. Hesap Türü Yeteneği (Capability) — İkinci Yetki Katmanı

Yetkilendirme **iki katmanlıdır**:

1. **İzin (Permission/Role)** → _Kullanıcı_ ne yapabilir? (yukarıdaki RBAC)
2. **Yetenek (Capability)** → _Hesabın türü_ neye izin verir?

Hesaplar iki türdür (`companies.type`):

| Tür         | Açıklama                       | Yetenekler                                                        |
| :---------- | :----------------------------- | :--------------------------------------------------------------- |
| **`company`** | Kurumsal firma (varsayılan)  | Tümü (ilan, başvuru, aday, mail, kampanya, etkinlik, sözleşme…)  |
| **`club`**    | Üniversite kulübü            | Yalnızca **profil, ekip, etkinlik, kayıt, sözleşme**             |

> 🔒 **Güvenlik (default-deny):** Kulüpler şirketlerle aynı paneli/token'ı kullanır ama **ilan, başvuru, pipeline, aday, mail gönderimi, mail şablonu ve kampanya** uç noktalarına erişemez. Bu kısıtlama **backend'de** uygulanır; hesabın türü her istekte **DB'den canlı çözülür** (JWT'ye gömülü `company_type` yalnızca arayüz görünürlüğü içindir, bayat/manipüle token bypass edemez).

**Yetki reddi yanıtı** (kulüp, kapalı bir uç noktayı çağırırsa):

```json
{
  "status": "error",
  "message": "Bu hesap türü bu işlemi gerçekleştiremez.",
  "errorCode": "ENTITY_TYPE_FORBIDDEN",
  "details": { "companyType": "club", "capability": "job" }
}
```

HTTP `403`. Bu kodu döndüren uç nokta grupları: `jobs/*`, `applications/*` (şirket-scope), `pipelines/*`, `candidates/*` (şirket-scope), `mail/*`, `mail-templates/*`, `campaign/*`, `integrations/*`, `evaluations/*`, `evaluation-forms/*`.

Yetenek anahtarları (`CompanyCapabilities`): `job`, `applications`, `candidates`, `pipelines`, `mail.send`, `mail.templates`, `integrations`. Bu dokümanda bir uç için **`cap:job`** gibi yazılır.
Kulüplere **açık** kalanlar: `events/*`, `registrations/*`, `contracts/*`, `companies/*` (profil) ve `company/team/*`.

> **Ekip rol kısıtı:** Kulüp ekibine üye davet edilirken `JOB_MANAGER` rolü atanamaz; yalnızca `ADMIN` ve `EVENT_MANAGER` geçerlidir (bkz. `POST /company/team/create`).

---

## 🧭 Frontend (SPA / Astro) Entegrasyon Rehberi

Vitrin sitesi (youthside.co) ve panel **backend'siz** çalışır; tüm veri bu API'den gelir. Aşağıdakiler
her istemcinin bilmesi gereken ortak kurallardır.

### CORS

- İzinli origin'ler `.env` → `ALLOWED_ORIGINS` (virgüllü, **birebir eşleşme**). Şu an: `https://youthside.co`,
  `https://www.youthside.co`, `https://panel.youthside.co`, `http://localhost:3000/3001/3002`,
  `http://localhost:4321` (Astro dev). Yeni bir origin (ör. önizleme ortamı) eklenmeden tarayıcı tüm çağrıları engeller;
  listede olmayan origin'e `Access-Control-Allow-Origin` hiç dönmez (preflight yine 200 döner, hata sessizdir).
- İzinli başlıklar yalnızca `Content-Type`, `Authorization`, `X-Requested-With`. Başka özel başlık (ör. `X-Request-Id`) preflight'ta reddedilir.
- Kimlik doğrulama **yalnızca `Authorization: Bearer`** ile yapılır; API çerez okumaz/yazmaz. `credentials: 'include'` gerekmez.
- Astro SSR/SSG tarafında sunucudan yapılan çağrılar CORS'a takılmaz.

### Yanıt zarfı

```json
{ "status": "success", "code": 200, "message": "İşlem başarılı.", "data": { }, "timestamp": 1791796781 }
{ "status": "error",   "code": 422, "message": "…", "timestamp": 1791796781, "errors": { } }
```

- Başarı anahtarı `status` alanıdır (`"success"` / `"error"`); eski örneklerdeki `"success": true` biçimi geçersizdir.
- Bazı hatalar ek alan taşır: `applications/create` 422 → `questions` veya `contracts`; 403 → `missing_fields`.
- `AuthMiddleware` kaynaklı 401/403 yanıtlarında `code` alanı yoktur: `{ "status": "error", "message": "…", "errorCode"?: "…", "details"?: {} }`.
- HTML dönen uçlar: `auth/verify-email`, `users/verify-email-change`, `campaign/unsubscribe` (tarayıcıda açılır).
- Tarih alanları saat dilimi içermeyen MySQL biçimidir (`YYYY-MM-DD HH:MM:SS`, Europe/Istanbul).

**Otomatik tip dönüşümü** (`helpers/Response.php::castTypes`) — `data` içindeki her string değere uygulanır:

| Kural | Örnek |
| :--- | :--- |
| `is_` / `has_` / `can_` / `should_` ile başlayan anahtarlar → `boolean` | `"is_verified": "1"` → `true` |
| Anahtar `id, uuid, slug, token, phone, tel, tc, iban, zip, postal, tax, identity, password` kelimelerinden birini **içeriyorsa** string kalır | `"company_id"`, `"phone"` |
| Diğer tam sayıya benzeyen string'ler → `int`, ondalıklılar → `float` | `"graduation_year": "2025"` → `2025` |

### Oturum (token) yaşam döngüsü

| Token | Süre | Not |
| :--- | :--- | :--- |
| Access (JWT, HS256) | **900 sn** (15 dk) | `Authorization: Bearer <token>`; `.env JWT_EXPIRATION` kullanılmaz |
| Refresh (opak) | 7 gün | Yanıt gövdesinde döner; istemci kendisi saklar |

- `POST /auth/refresh` refresh token'ı **döndürür (rotation)**. İptal edilmiş bir refresh token tekrar kullanılırsa
  hırsızlık sayılır ve kullanıcının **tüm oturumları kapatılır**. Bu yüzden refresh **tek uçuş (single-flight)**
  olmalı: aynı anda birden fazla sekme/istek refresh yapmamalı (kilit veya `BroadcastChannel` kullanın).
- Çıkışta mutlaka `POST /auth/logout` çağrılmalı (refresh token sunucuda iptal edilir); yalnızca çerez/yerel depoyu silmek yetmez.
- Aday girişi için `POST /auth/login` gövdesinde **`"type": "candidate"` zorunludur**; gönderilmezse varsayılan `company`'dir ve aday bulunamaz.

### Hız sınırları

| Uç | Sınır | Yanıt |
| :--- | :--- | :--- |
| `POST /auth/login` | IP + e-posta başına 5 dakikada 10 deneme | 429 |
| `POST /registrations/quick-register` | IP başına dakikada 10 | 429 |
| `POST /jobs/view`, `POST /events/view` | IP başına dakikada 60; aynı IP aynı kaydı saatte 1 kez sayar | 429 / `counted:false` |
| `POST /auth/forgot-password` | E-posta başına 120 sn (`PASSWORD_RESET_BLOCK_SECONDS`) | 429 + `errors.remaining_seconds` |
| `POST /applications/ai-cv-analysis` | Şirket başına günlük kota (`AI_DAILY_ANALYSIS_LIMIT`, varsayılan 200) | 429 `DAILY_LIMIT` |

IP, Cloudflare arkasında `CF-Connecting-IP`, değilse `REMOTE_ADDR`'dır. Sınırlayıcı `public/cache/rate_limits/`
dizinine yazar; dizin web sunucusu kullanıcısı tarafından yazılamazsa sınırlar **devre dışı kalır** (log'a uyarı düşer) — deploy'da izin kontrol edilmeli.

### Vitrin (SSR/SSG) notları

- URL anahtarları slug'dır: şirket/kulüp `/{slug}` → `GET /companies/get_by_slug?slug=`; ilan `/{slug}/ilanlar/{job_slug}` → `GET /jobs/get?slug=`;
  etkinlik `/{slug}/etkinlikler/{event_slug}` → `GET /events/get?slug=`.
- İlan ve etkinlik slug'ları **global olarak benzersizdir**; dönen `company_slug` URL'deki şirket slug'ıyla eşleşmiyorsa istemci 404 vermeli (veya doğru URL'ye yönlendirmeli).
- `description` / `about` alanları ham HTML'dir; render etmeden önce istemci tarafında temizlenmelidir (DOMPurify / sanitize-html).
- Kültür bloklarındaki video URL'leri **imzalı ve süreli**dir; statik build'e gömülmemeli, istek anında alınmalıdır.
- Liste uçları 60 sn sunucu önbelleği kullanır (`companies/list`, `events/list`).
- Görüntülenme sayacı için detay sayfası tarayıcıdan `POST /jobs/view` / `POST /events/view` çağırmalıdır (SSR sırasında çağırmayın; bot ve önbellek sayımı şişirir).
- Profil fotoğrafını `html2canvas` ile kullanan sayfalar için CDN'de CORS başlığı gerekir; API görsel proxy'si sunmaz.

### Bilinen uyarılar

- `GET /auth/identities` kimlik doğrulamasız bir e-postanın hangi hesap türlerinde kayıtlı olduğunu döner (accounts.youthside.co hesap seçicisi için kasıtlıdır).
- `POST /auth/resend-verification` için sıklık sınırı şu an kapalıdır (`$blockSeconds = 0`).
- Mail gönderim dosyaları `Mail/` (büyük harf) klasöründedir; büyük/küçük harf duyarlı sunucuda `/mail/send` yolunun çalıştığı doğrulanmalıdır.

---

## 📋 İçindekiler

0. [Frontend Entegrasyon Rehberi](#-frontend-spa--astro-entegrasyon-rehberi)
1. [Auth & Session Management](#1-auth--session-management)
   - [1.1 2FA (OTP)](#11-2fa-otp)
2. [Company Team](#2-company-team)
3. [Companies](#3-companies)
4. [Dashboard](#4-dashboard)
5. [Jobs](#5-jobs)
6. [Pipelines](#6-pipelines)
7. [Questions](#7-questions)
8. [Applications](#8-applications)
9. [Candidates](#9-candidates)
10. [Candidate Notes](#10-candidate-notes)
11. [Events](#11-events)
12. [Registrations](#12-registrations)
   - [🔑 JWT Token Yapısı](#-jwt-token-yapısı)
13. [Storage (CDN)](#13-storage-cdn)
14. [Smart Scoring (İlan Puanlama)](#14-smart-scoring-ilan-puanlama)
   - [İller](#iller)
15. [Contracts (Sözleşme Yönetimi)](#15-contracts-sözleşme-yönetimi)
16. [Static Data (Sabit Veriler)](#16-static-data-sabit-veriler)
17. [Pipeline Templates (Süreç Şablonları)](#17-pipeline-templates-süreç-şablonları)
18. [İletişim & Log (Communications)](#18-iletişim--log-communications)
19. [Mail Templates (Şirket Bazlı)](#19-mail-templates-şirket-bazlı)
20. [Yanıt Adresleri (Reply-To)](#20-yanıt-adresleri-reply-to)
21. [Kampanya Yönetimi (Admin)](#21-kampanya-yönetimi-admin)
   - [Kampanya Çalışma Zamanı Kontrolleri](#kampanya-çalışma-zamanı-kontrolleri)
22. [Değerlendirme Formları & Değerlendirmeler](#22-değerlendirme-formları--değerlendirmeler)
23. [Entegrasyonlar (Aday Aktarımı)](#23-entegrasyonlar-aday-aktarımı)
24. [Operasyonlar, Global Arama, Kullanıcı](#24-operasyonlar-global-arama-kullanıcı)

---

## 🌍 Genel Parametreler (Listeleme & Sayfalama)

Tüm `list` endpoint'lerinde aşağıdaki query parametrelerini kullanabilirsiniz:

| Parametre | Tipi     | Varsayılan | Açıklama                                             |
| --------- | -------- | ---------- | ---------------------------------------------------- |
| `limit`   | `int`    | `20`       | Sayfada gösterilecek kayıt sayısı. Herkese açık listelerde en fazla 100 |
| `offset`  | `int`    | `0`        | Atlanacak kayıt sayısı. (Pagination için)            |
| `q`       | `string` | `null`     | Genel arama metni (Başlık, açıklama vb. içinde arar) |
| `sort`    | `string` | uca göre   | Sıralama sütunu; her uç kendi beyaz listesini uygular (listede olmayan değer varsayılana düşer) |
| `dir`     | `string` | `DESC`     | Sıralama yönü: `ASC` (Artan) veya `DESC` (Azalan)    |

**Örnek:**

```bash
GET /api/jobs/list?limit=10&offset=20&q=developer&sort=publish_date&dir=DESC
```

---

## 1. Auth & Session Management

> **Mimari Notu:** Sistem **Dual-Token** yapısı kullanır.
>
> 1. **Access Token (JWT):** 15 dakika geçerlidir. API isteklerinde `Authorization: Bearer <token>` olarak kullanılır.
> 2. **Refresh Token:** 7 gün geçerlidir. Access Token süresi dolduğunda (`401 Unauthorized`) yeni bir Access Token almak için kullanılır.
>
> **Güvenlik (Rotation):** Refresh Token her kullanıldığında **iptal edilir** ve yerine yenisi verilir (Refresh Token Rotation). Eski bir Refresh Token kullanılmaya çalışılırsa sistem bunu bir saldırı olarak algılar ve o kullanıcıya ait tüm oturumları kapatır.

### `GET /auth/check-email?email=USER_EMAIL`

```txt
Bir e-posta adresinin sisteme kayıtlı olup olmadığını ve doğrulanmış (verified) durumunu kontrol eder.
Bu endpoint PUBLIC'tir (Auth gerektirmez). Login ekranı yönlendirmeleri için kullanılır.
```

#### Yanıt (200)

```json
{
  "status": "success",
  "code": 200,
  "message": "Sorgulama başarılı.",
  "data": {
    "is_registered": true,
    "is_verified": true
  },
  "timestamp": 1773648673
}
```

> `check-email` yalnızca **aday** (`candidates`) tablosuna bakar. Bulunamazsa yine 200 döner: `is_registered: false`, mesaj `"Aday bulunamadı."`.

### `POST /auth/login` 🔑

```txt
E-posta + şifre ile giriş. Hesap türü "type" ile seçilir; gönderilmezse "company" varsayılır.
Aday girişi için "type": "candidate" ZORUNLUDUR.
Hız sınırı: IP + e-posta başına 5 dakikada 10 deneme (aşılırsa 429).
```

#### İstek

| Alan | Zorunlu | Açıklama |
| :--- | :--- | :--- |
| `email` | ✅ | E-posta |
| `password` | ✅ | Şifre |
| `type` | ➖ | `company` (varsayılan), `candidate`, `admin` |
| `otp_code` | ➖ | Hesapta 2FA açıksa 6 haneli kod |

```json
{ "email": "aday@example.com", "password": "******", "type": "candidate" }
```

#### Başarılı Yanıt (200)

```json
{
  "status": "success",
  "code": 200,
  "message": "Giriş başarılı.",
  "data": {
    "access_token": "eyJ0eXAiOi...",
    "refresh_token": "a1b2c3d4...",
    "expires_in": 900,
    "token_type": "Bearer",
    "user": {
      "id": "UUID",
      "email": "aday@example.com",
      "name": "Ad Soyad",
      "scope": "candidate",
      "role": ["CANDIDATE"],
      "otp_enabled": false,
      "avatar_url": "https://...",
      "context": { "university": "…", "department": "…", "grade": "3. Sınıf" }
    },
    "profile": {
      "phone": "+905…", "gender": "Kadın", "avatar_url": "…", "resume_url": "…",
      "university": "…", "department": "…", "grade": "3. Sınıf", "graduation_year": 2027,
      "socials": { "linkedin": "…" }
    }
  },
  "timestamp": 1791796781
}
```

Türe göre ek alanlar (`data` köküne eklenir):

| `type` | `user.context` | Ek alan |
| :--- | :--- | :--- |
| `candidate` | `university, department, grade` | `profile{…}` (yukarıdaki gibi) |
| `company` | `company_id, company_slug, company_name, company_logo, company_type, permissions[]` | `company{id, slug, name, logo_url, is_verified, type, university}`, `user_details{title, avatar_url}` |
| `admin` | `permissions[]` | `admin{permissions[]}` |

#### Hata Yanıtları

| Kod | Durum |
| :--- | :--- |
| 400 | E-posta doğrulanmamış (`"E-posta adresinizi doğrulamadınız…"`, `errorCode` yok) veya geçersiz `type` |
| 401 | E-posta/şifre hatalı veya OTP kodu yanlış |
| 403 | 2FA gerekli: `errors.require_otp = true` → aynı isteği `otp_code` ile tekrarlayın |
| 429 | Çok fazla deneme |

### `POST /auth/oauth-login` 🌐

```txt
Adayların (candidates) OAuth sağlayıcıları ile giriş yapmasını veya kayıt olmasını sağlar.
Aynı e-postayla kayıtlı bir aday varsa OAuth kimliği sessizce bu hesaba bağlanır (linked_existing: true).
OAuth girişinde 2FA sorulmaz.
```

#### İstek (Google)

```json
{
  "provider": "google",
  "id_token": "eyJhbGciOiJSUzI1NiI..." // Google Identity Services id_token
}
```

#### İstek (LinkedIn)

```json
{
  "provider": "linkedin",
  "code": "AQA...", // LinkedIn üzerinden geri dönen authorization_code
  "redirect_uri": "https://youthside.co/linkedin-callback/" // LinkedIn'de kayıtlı redirect_uri ile BİREBİR aynı olmalı
}
```

#### İstek (Facebook)

```json
{
  "provider": "facebook",
  "access_token": "EAA..." // Facebook Login'den gelen access_token
}
```

#### Başarılı Yanıt (200)

```json
{
  "status": "success",
  "code": 200,
  "message": "Giriş başarılı.",
  "data": {
    "access_token": "eyJ0eXAiOi...",
    "refresh_token": "a1b2c3d4...",
    "expires_in": 900,
    "token_type": "Bearer",
    "is_new_user": false,
    "linked_existing": false,
    "user": {
      "id": "candidate-guid",
      "email": "user@gmail.com",
      "name": "User Name",
      "scope": "candidate",
      "role": ["CANDIDATE"],
      "context": { "university": null, "department": null, "grade": null },
      "avatar_url": "https://..."
    }
  }
}
```

> `oauth-login` yanıtında `login`'deki `profile` nesnesi **yoktur**; profil için ardından `GET /auth/me` çağırın.

Hatalar: `400` bilinmeyen `provider`; `401` sağlayıcı doğrulaması başarısız (geçersiz/süresi dolmuş token, yanlış `redirect_uri`).

### `POST /auth/refresh` 🔄

```txt
Süresi dolmuş Access Token'ı yeniler. Yanıt olarak YENİ bir Access Token ve YENİ bir Refresh Token döner (rotation).
İptal edilmiş bir refresh token tekrar kullanılırsa kullanıcının TÜM oturumları kapatılır — istemci refresh'i tek uçuş yapmalı.
```

#### İstek

```json
{
  "refresh_token": "mevcut_refresh_token"
}
```

#### Yanıt (200)

```json
{
  "status": "success",
  "code": 200,
  "message": "İşlem başarılı.",
  "data": {
    "access_token": "yeni_access_token...",
    "refresh_token": "yeni_refresh_token...",
    "expires_in": 900,
    "token_type": "Bearer"
  }
}
```

Hatalar: `400` token gönderilmedi; `401` `"Geçersiz oturum."` (geçersiz, süresi dolmuş veya tekrar kullanılmış token → yeniden giriş gerekir).

### `POST /auth/logout` 🚪

```txt
Gönderilen Refresh Token'ı sunucuda iptal eder (revoke). Token olmasa da her zaman 200 döner.
Çıkıştan sonra aynı refresh token'ı kullanmak "tekrar kullanım" sayılır ve tüm oturumları kapatır.
```

#### İstek

```json
{
  "refresh_token": "iptal_edilecek_refresh_token"
}
```

### `GET /auth/me` 🔒

```txt
Access Token'ı doğrular; JWT içeriğini DB'deki güncel bilgilerle zenginleştirip döner.
Header: Authorization: Bearer <access_token>
```

#### Yanıt (200 — aday)

```json
{
  "status": "success",
  "data": {
    "user": {
      "iss": "…", "aud": "…", "iat": 1791796781, "nbf": 1791796781, "exp": 1791797681,
      "id": "UUID", "email": "aday@example.com", "name": "Ad Soyad",
      "scope": "candidate", "role": ["CANDIDATE"],
      "otp_enabled": false,
      "context": { "university": "…", "department": "…", "grade": "…" },
      "profile": {
        "phone": "…", "gender": "…", "avatar_url": "…", "resume_url": "…",
        "university": "…", "department": "…", "grade": "…", "graduation_year": 2027, "socials": {}
      }
    }
  }
}
```

- **Şirket kullanıcısı** için `profile` yerine `details{title, avatar_url}` ve `company{…}` (`get_by_slug` ile aynı alanlar, `addresses[]` dahil) eklenir; `context` JWT'deki gibi kalır (`company_id`, `permissions[]` …).
- Aday için `context` her çağrıda DB'den yenilenir (JWT eskimiş olabilir).

### `POST /auth/forgot-password` ❓

````txt
Şifresini unutan kullanıcı için sıfırlama süreci başlatır.
E-posta adresine 1 saat geçerli, tek kullanımlık bir token içeren link gönderir.

Davranış:
- Kullanıcı yoksa: 404 ("Bu e-posta adresi ile kayıtlı bir hesap bulunamadı.")
- Sık istek yapılırsa: 429 (varsayılan 120 sn, .env: PASSWORD_RESET_BLOCK_SECONDS)
- Link: aday → CANDIDATE_FRONTEND_URL/sifre-sifirla?token=…  |  şirket/admin → FRONTEND_URL/#/sifre-sifirla?token=…
````

#### İstek

```json
{
  "email": "user@example.com",
  "type": "candidate" // opsiyonel: company (varsayılan), candidate, admin
}
```

#### Yanıt (200)

```json
{
  "status": "success",
  "code": 200,
  "message": "İşlem başarılı.",
  "data": {
    "message": "Eğer bu e-posta adresi kayıtlıysa, şifre sıfırlama bağlantısı gönderildi."
  }
}
```

#### Hata Yanıtı (429)

```json
{
  "status": "error",
  "code": 429,
  "message": "Çok fazla deneme yaptınız. Lütfen bekleyin.",
  "errors": { "next_try_time_utc": "2026-02-09 12:45:00", "remaining_seconds": 45 }
}
```

### `GET /auth/validate-reset-token` ✅

```txt
Şifre sıfırlama sayfasında token'ın geçerliliğini kontrol eder.
```

```bash
curl -X GET "https://api.youthside.co/api/auth/validate-reset-token?token=db4e1f..."
```

#### Yanıt (200)

```json
{
  "status": "success",
  "data": { "message": "Token geçerli.", "email": "user@example.com" }
}
```

#### Hata Yanıtları (400)

`"Token parametresi zorunludur."`, `"Geçersiz sıfırlama bağlantısı."`, `"Bu bağlantı daha önce kullanılmış."`, `"Bağlantının süresi dolmuş. Lütfen yeni bir talep oluşturun."`

### `POST /auth/resend-verification` ✉️

```txt
Doğrulama e-postası eline ulaşmayan kullanıcıya yenisini gönderir.
Sırasıyla candidates → company_users → admins tablolarında arar.
Not: Sıklık sınırı kodda tanımlı ama şu an KAPALI ($blockSeconds = 0).
```

#### İstek (JSON)

| Parametre      | Tip    | Zorunlu  | Açıklama |
| :------------- | :----- | :------- | :------- |
| `email`        | String | ✅ Evet  | Doğrulama maili yeniden istenecek hesap adresi |
| `redirect_url` | String | ❌ Hayır | Doğrulama sayfasının yönlendireceği adres. **Yalnızca `ALLOWED_ORIGINS` / `CANDIDATE_FRONTEND_URL` origin'leri kabul edilir**; diğerleri yok sayılır. Verilmezse `CANDIDATE_FRONTEND_URL`. |

#### Yanıt (200)

```json
{
  "status": "success",
  "code": 200,
  "message": "Doğrulama bağlantısı e-posta adresinize tekrar gönderildi. Lütfen spam kutunuzu da kontrol edin.",
  "data": []
}
```

Hatalar: `400` e-posta yok veya hesap zaten doğrulanmış; `404` kayıtlı değil; `429` (sınır açıldığında) `errors.remaining_seconds`.

### `GET /auth/verify-email` 🌐 _(HTML)_

```txt
E-postadaki doğrulama bağlantısının hedefi. Tarayıcıda açılır, JSON değil HTML sonuç sayfası döner.
Parametreler: token, email, redirect_url (opsiyonel).
company_users → candidates → admins tablolarında token+email eşleşmesi arar; bulursa email_verified_at'i doldurur.
redirect_url yalnızca izinli origin'lerden (ALLOWED_ORIGINS + CANDIDATE_FRONTEND_URL) biriyse kullanılır ve
5 sn sonra otomatik yönlendirir; aksi halde "Devam Et" butonu CANDIDATE_FRONTEND_URL/login'e gider.
```

### `POST /auth/reset-password` 🔐

```txt
Token ile gelen kullanıcının şifresini günceller. Token tek kullanımlıktır.
```

#### İstek

```json
{
  "token": "db4e1f...", // E-postadaki linkten gelen token
  "password": "yeniguclusifre123" // En az 8 karakter
}
```

#### Yanıt (200)

```json
{
  "status": "success",
  "data": { "message": "Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz." }
}
```

Hatalar: `400` geçersiz / kullanılmış / süresi dolmuş token, şifre 8 karakterden kısa; `404` kullanıcı bulunamadı.

### `POST /auth/update-password` 🔒

```txt
Giriş yapmış kullanıcının (aday, şirket, admin — scope'a göre) şifresini değiştirir.
```

```json
{ "current_password": "eski", "new_password": "yeni-en-az-6", "new_password_confirmation": "yeni-en-az-6" }
```

Yanıt: `200` `data: null`, `"Şifreniz başarıyla güncellendi."` · Hatalar: `400` mevcut şifre hatalı / yeni şifreler eşleşmiyor / geçersiz scope; `404` kullanıcı yok.

### `GET /auth/identities?email=` 🌐

```txt
Bir e-postanın hangi hesap türlerinde kayıtlı olduğunu döner (accounts.youthside.co hesap seçicisi).
Kimlik doğrulama gerektirmez — hesap varlığını açığa çıkarır; yalnızca hesap seçici akışında kullanın.
```

```json
{
  "status": "success",
  "data": {
    "identities": [
      { "type": "admin", "label": "Admin" },
      { "type": "company", "label": "Anadolu Isuzu (İK)" },
      { "type": "candidate", "label": "Ad Soyad (Öğrenci)" }
    ]
  }
}
```

Hata: `400` geçersiz e-posta.

### `GET /auth/validate-invite` / `POST /auth/accept-invite` 🌐

```txt
Ekip (company_users) ve admin davetleri için ortak akış (InvitationService).
validate-invite: ?token=&email=  → davet bağlamını döner.
accept-invite:   { token, email, password (en az 8) } → parolayı oluşturup hesabı aktive eder.
```

`validate-invite` yanıtı: `{ email, user_name, company_name, company_logo, account_type? }` (admin davetinde `company_name: "Youthside Admin Paneli"`, `account_type: "admin"`).
Hatalar: `404` `"Davet bağlantısı geçersiz veya süresi dolmuş."`.

### `GET /company/auth/validate-invite` / `POST /company/auth/accept-invite` 🌐 _(Eski)_

```txt
Yalnızca şirket ekibi için eski davet akışı (e-posta parametresi yok).
validate-invite: ?token= → { email, user_name, company_name, company_logo }
accept-invite:   { token, password (en az 6) }
Yeni istemciler /auth/validate-invite + /auth/accept-invite kullanmalı.
```

Hatalar: `400` token yok; `404` geçersiz/süresi dolmuş davet.

### `POST /users/request-email-change` ✉️🔒

```txt
Kullanıcının e-posta adresini değiştirmek için talep oluşturur.
Yeni e-posta adresine 24 saat geçerli bir doğrulama bağlantısı (Magic Link) gönderilir.
Mevcut e-posta adresi, yeni adres doğrulanana kadar geçerliliğini korur.
Sadece `company` rolüne sahip kullanıcılar içindir.
```

**Örnek:**

```bash
curl -X POST "http://api.youthside.co/api/users/request-email-change.php" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "yeni.email@example.com"
  }'
```

#### İstek

```json
{
  "email": "yeni.email@example.com"
}
```

#### Yanıt (200)

```json
{
  "status": "success",
  "data": {
    "pending_email": "yeni.email@example.com"
  },
  "message": "Doğrulama e-postası yeni.email@example.com adresine gönderildi. 24 saat içinde onaylayın."
}
```

#### Hata Yanıtları

- **409 Conflict:** Yeni e-posta mevcut e-posta ile aynıysa veya başka bir kullanıcı tarafından kullanılıyorsa.

### `GET /users/verify-email-change` ✅

```txt
E-posta değişikliğini onaylar.
Kullanıcının e-postasına gönderilen bağlantıya tıklandığında çalışır.
Başarılı olursa Frontend uygulamanıza yönlendirir (?email_updated=1 query'si ile).
Hata durumunda browser'a görsel bir HTML hata sayfası döner.
```

**Örnek (Tarayıcıda Çalıştırılır):**

```bash
GET http://api.youthside.co/api/users/verify-email-change.php?token=0123456789abcde...
```

#### Yanıt

- **Başarılı (302 Redirect):** `FRONTEND_URL/#/profilim?email_updated=1` adresine yönlendirir.
- **Hatalı (400 Bad Request):** Token geçersiz veya süresi dolmuşsa görsel HTML hata sayfası döner.

---

## 1.1 2FA (OTP)

Kullanıcı hesapları için İki Adımlı Doğrulama (TOTP/Authenticator App) işlemleri.

### `POST /auth/2fa/setup` 🔒

```txt
2FA kurulumunu başlatır.
Dönen "secret" ve "qr_uri" kullanılarak Authenticator uygulamasına kurulum yapılır.
Henüz aktif değildir, /enable çağrılmalıdır.
```

```bash
curl -X POST "http://api.youthside.co/api/auth/2fa/setup" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}"
```

**Yanıt:**

```json
{
  "status": "success",
  "data": {
    "secret": "JBSWY3DPEHPK3PXP...",
    "qr_uri": "otpauth://totp/Youthside..."
  }
}
```

### `POST /auth/2fa/enable` 🔒

```txt
Kurulumu doğrular ve 2FA'yı hesapta aktif eder.
Setup aşamasında alınan secret ve uygulamada üretilen kod gönderilmelidir.
```

```bash
curl -X POST "http://api.youthside.co/api/auth/2fa/enable" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "JBSWY3DPEHPK3PXP...",
    "code": "123456"
  }'
```

### `POST /auth/2fa/disable` 🔒

```txt
Hesaptaki 2FA korumasını kaldırır.
Güvenlik için şifre doğrulaması gerektirir.
```

```bash
curl -X POST "http://api.youthside.co/api/auth/2fa/disable" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "user_password"
  }'
```

---

## 2. Company Team

### `GET /company/team/list` 🔒

```txt
Şirketin tüm personelini listeler.
Token'daki company_id otomatik kullanılır.
```

```bash
curl -X GET "http://api.youthside.co/api/company/team/list" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}"
```

### `POST /company/team/create` 🔒

```txt
Şirkete yeni personel ekler.
role: Atanacak roller dizisi (örn: ["JOB_MANAGER"])
```

> ⚠️ **Kulüp kısıtı:** Hesap türü `club` ise atanabilir roller yalnızca `ADMIN` ve `EVENT_MANAGER`'dır. `JOB_MANAGER` atanması `400` ile reddedilir (tür DB'den canlı çözülür).

```bash
curl -X POST "http://api.youthside.co/api/company/team/create" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ahmet Yılmaz",
    "email": "ahmet@sirket.com",
    "password": "sifre123",
    "role": ["RECRUITER", "EVENT_MANAGER"],
    "title": "İK Uzmanı"
  }'
```

### `POST /company/team/delete` 🔒

```txt
Şirketten personel siler.
Sadece OWNER yetkisi gerektirir.
```

```bash
curl -X POST "http://api.youthside.co/api/company/team/delete" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{"id": "USER_UUID"}'
```

---

## 3. Companies

### `GET /companies/list` 🌐 _(Güncellendi)_

```txt
Vitrin şirket / kulüp listesi (/sirketler, /kulupler). Herkese açık, token gerektirmez. 60 sn önbellekli.
Şirketlerde yalnızca onaylı (is_verified = 1) kayıtlar listelenir; kulüplerde onay filtresi uygulanmaz.
```

| Parametre | Varsayılan | Açıklama |
| :--- | :--- | :--- |
| `type` | `company` | `company` (kurumsal firma) veya `club` (üniversite kulübü) |
| `q` | – | Ad, sektör, hakkında metni ve (kulüpte) üniversite adında arar |
| `sector` | – | Sektöre göre birebir filtre |
| `sort` | `created_at` | `created_at`, `name`, `jobs_count`, `events_count` |
| `dir` | `DESC` | `ASC` / `DESC` |
| `limit` / `offset` | `20` / `0` | `limit` en fazla 100 (`0` → varsayılan) |

```bash
curl "https://api.youthside.co/api/companies/list?type=club&sort=events_count&limit=12"
```

#### Yanıt (200)

```json
{
  "status": "success",
  "data": {
    "data": [
      {
        "id": "UUID",
        "name": "Marmara Üniversitesi Bilişim Kulübü",
        "slug": "marmara-bilisim",
        "type": "club",
        "logo_url": "https://…",
        "cover_image_url": "https://…",
        "sector": null,
        "employee_count_range": null,
        "socials": [{ "platform": "instagram", "url": "https://…" }],
        "is_verified": false,
        "created_at": "2026-05-02 10:11:12",
        "university_name": "MARMARA ÜNİVERSİTESİ",
        "about": "HTML'siz, ilk 800 karakter…",
        "jobs_count": 0,
        "events_count": 1
      }
    ],
    "meta": { "total": 4, "limit": 12, "offset": 0, "page": 1, "pageSize": 12, "totalCount": 4, "totalPages": 1 }
  }
}
```

- `jobs_count`: YAYINDA ve süresi dolmamış ilan sayısı; `events_count`: YAYINDA ve bitmemiş (bitişi olmayan dahil) etkinlik sayısı — vitrin listeleriyle aynı kural.
- `socials` bu uçta **dizi** olarak döner (`get_by_slug`'da JSON string'dir).
- `university_name` yalnızca kulüplerde doludur.

### `GET /companies/get?id=UUID` 🌐

```txt
Şirket satırını ID ile döner (profil kolonları: id, name, slug, logo_url, cover_image_url, website, sector,
employee_count_range, about, address, address_iframe, addresses, socials, type, is_verified, created_at, updated_at).
addresses ve socials ham JSON string'dir; ayrıştırılmış adres listesi için get_by_slug kullanın. 1 saat önbellekli.
```

Hatalar: `400` id yok, `404` bulunamadı.

### `GET /companies/search?q=` 🌐

```txt
Ada göre hızlı şirket arama (otomatik tamamlama). En fazla 20 kayıt, ada göre sıralı.
Not: common.php kullanmaz — yanıtta code/timestamp yoktur ve CORS "*" döner.
```

```json
{ "status": "success", "data": [{ "id": "UUID", "name": "Anadolu Isuzu", "logo": "https://…", "slug": "anadolu-isuzu" }] }
```

### `POST|DELETE /companies/delete?id=UUID` 🔒

Yalnızca `role` dizisinde `SUPER_ADMIN` bulunan token (yönetim paneli). Yanıt: `200` `"Şirket silindi."`; `400` id yok, `403` yetki yok.

### `POST /companies/create`

```txt
Yeni şirket veya kulüp kaydı oluşturur.
İlk kullanıcı otomatik OWNER rolü alır.
```

| Alan            | Zorunlu | Açıklama                                                               |
| :-------------- | :------ | :-------------------------------------------------------------------- |
| `name`          | ✅      | Şirket/kulüp adı                                                      |
| `type`          | ➖      | `company` (varsayılan) veya `club`. Kulüp = sadece etkinlik yetkili.  |
| `university_id` | ⚠️      | **`type=club` ise zorunlu.** `ref_universities.id` (FK). Liste: `GET /data/universities`. |

> Üniversite artık **serbest metin değil**, `ref_universities` statik referans (lookup) tablosuna
> FK ile bağlanır (tekrar eden metin/şişme önlenir). Kulübe özel `university_id`, `companies`
> tablosunda değil 1:1 `club_profiles` uydu tablosunda saklanır.
> `GET /data/universities` → `[{ "id": <int>, "value": "<ad>" }]` döner.

```bash
curl -X POST "http://api.youthside.co/api/companies/create" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Siber Güvenlik Kulübü",
    "email": "kulup@uni.edu.tr",
    "password": "sifre123",
    "slug": "siber-guvenlik-kulubu",
    "type": "club",
    "university_id": 52
  }'
```

### `POST /companies/update` 🔒 _(Güncellendi)_

```txt
Şirket profilini günceller.
Sadece kendi şirketinizi güncelleyebilirsiniz.
Yalnızca gönderilen alanlar güncellenir (kısmi güncelleme).
```

| Alan                   | Tip                        | Açıklama                                                                                   |
| :--------------------- | :------------------------- | :----------------------------------------------------------------------------------------- |
| `name`                 | string                     | Şirket/kulüp adı                                                                           |
| `slug`                 | string                     | URL kısa adı                                                                               |
| `logo_url`             | string                     | Logo CDN adresi                                                                            |
| `cover_image_url`      | string                     | Kapak görseli CDN adresi                                                                   |
| `website`              | string                     | Web sitesi                                                                                 |
| `sector`               | string                     | Sektör                                                                                     |
| `employee_count_range` | string                     | Çalışan sayısı aralığı                                                                     |
| `about`                | string (HTML)              | Hakkımızda                                                                                 |
| `addresses`            | array \| JSON string       | **Yeni.** Adres listesi — bkz. [Adres listesi](#adres-listesi-addresses). Tüm listeyi değiştirir. |
| `address`              | string                     | _Eski alan._ `addresses[0].address` aynası — bkz. aşağıdaki geriye uyumluluk notu.          |
| `address_iframe`       | string                     | _Eski alan._ `addresses[0].address_iframe` aynası.                                          |
| `socials`              | array \| JSON string       | Sosyal medya listesi — bkz. [Sosyal medya](#sosyal-medya-socials). Tüm listeyi değiştirir.  |

```bash
curl -X POST "http://api.youthside.co/api/companies/update" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Güncellenmiş Şirket Adı",
    "website": "https://sirket.com",
    "sector": "Teknoloji",
    "addresses": [
      {
        "title": "Genel Merkez",
        "address": "Büyükdere Cad. No:1 Şişli/İstanbul",
        "address_iframe": "<iframe src=\"https://www.google.com/maps/embed?pb=...\"></iframe>"
      },
      {
        "title": "Gebze Fabrika",
        "address": "GOSB 1000. Sok. No:5 Gebze/Kocaeli",
        "address_iframe": null
      }
    ],
    "socials": [
      { "platform": "linkedin", "url": "https://www.linkedin.com/company/sirket" },
      { "platform": "youtube", "url": "https://www.youtube.com/@sirket" }
    ]
  }'
```

#### Adres listesi (`addresses`)

Bir işveren markası birden fazla adres (genel merkez, şube, fabrika...) tutabilir.

| Alan             | Tip            | Açıklama                                                                 |
| :--------------- | :------------- | :----------------------------------------------------------------------- |
| `title`          | string \| null | Adresi ayırt eden kısa başlık (ör. "Genel Merkez"). En fazla 100 karakter. |
| `address`        | string \| null | Açık adres. HTML etiketleri temizlenir.                                  |
| `address_iframe` | string \| null | Google Maps embed kodu. `<iframe` ile başlamalı ve `google.com/maps` içermeli. |

Kurallar:

- Listedeki sıra korunur; **ilk öğe ana adres** kabul edilir.
- `address` ve `address_iframe` alanlarının ikisi de boş olan öğeler yok sayılır.
- En fazla **20** adres gönderilebilir.
- Boş liste (`[]`) tüm adresleri siler.

**Geriye uyumluluk:** `address` / `address_iframe` alanları kaldırılmadı. Sunucu her kayıtta
bunları listenin ilk öğesiyle doldurur; tek adres okuyan istemciler (ör. kariyer sitesi)
çalışmaya devam eder. İstekte `addresses` **gönderilmeyip** yalnızca `address` / `address_iframe`
gönderilirse listenin yalnızca ilk öğesi güncellenir, diğer adresler korunur.

#### Sosyal medya (`socials`)

`[{ "platform": "...", "url": "..." }]` biçiminde liste. Desteklenen platformlar:

| `platform`  | Hesap                      |
| :---------- | :------------------------- |
| `linkedin`  | LinkedIn                   |
| `twitter`   | X (Twitter)                |
| `facebook`  | Facebook                   |
| `instagram` | Instagram                  |
| `youtube`   | YouTube **_(Yeni)_**       |

`url` alanı boş olan öğeler yok sayılır.

#### Hata Yanıtları (400)

| Mesaj                                                                 | Sebep                                   |
| :-------------------------------------------------------------------- | :-------------------------------------- |
| `Geçersiz iframe kodu sağlandı. Sadece Google Maps Embed kodu kabul edilir.` | Adreslerden birinin `address_iframe` değeri geçersiz |
| `Adres başlığı en fazla 100 karakter olabilir.`                        | `title` çok uzun                        |
| `En fazla 20 adres eklenebilir.`                                       | Liste sınırı aşıldı                     |
| `Geçersiz sosyal medya platformu.`                                     | Desteklenmeyen `platform` değeri        |
| `Adres listesi geçersiz JSON formatında.` / `Sosyal medya bağlantıları geçersiz JSON formatında.` | String olarak gönderilen alan JSON değil |

### `GET /companies/get_by_slug` _(Güncellendi)_

```txt
Slug ile şirket detaylarını (Logo, İsim, Kapak Görseli, Adresler) getirir.
Giriş sayfasında şirkete özel branding için kullanılır.
addresses her zaman dizi olarak döner. Adres listesi henüz oluşturulmamış eski
kayıtlarda address/address_iframe'den tek öğeli liste üretilir; adres yoksa [].
socials JSON string olarak döner (istemci parse eder).
Kulüplerde üniversite adı "university" anahtarındadır (companies/list'teki "university_name" değil).
Vitrin şirket profili sayfasının ana kaynağıdır; about tam HTML'dir.
```

```bash
curl -X GET "http://api.youthside.co/api/companies/get_by_slug.php?slug=anadolu-isuzu"
```

```json
"data": {
        "id": "f69a4242-f39a-4617-8fb6-0f57934778c8",
        "name": "Anadolu Isuzu",
        "slug": "anadolu-isuzu",
        "logo_url": "https://youthsidecdn.doracdn.com/youthside/logo-a.png",
        "cover_image_url": "https://media.licdn.com/dms/image/v2/D4D3DAQEk1uyQvy4Sxw/image-scale_191_1128/B4DZeH9QlKGkAc-/0/1750332674394/anadolu_isuzu_cover?e=1770739200&v=beta&t=lu6d8htM86G-_JpFLj7dDRfwIpPYHfzwTvTibGCWd9s",
        "website": "https://anadoluisuzu.com.tr",
        "sector": "Eğitim",
        "employee_count_range": "500+",
        "about": "Şirketimiz sektörünün önde gelen firmalarından biridir.",
        "address": "Büyükdere Cad. No:1 Şişli/İstanbul",
        "address_iframe": "<iframe src=\"https://www.google.com/maps/embed?pb=...\"></iframe>",
        "addresses": [
            {
                "title": "Genel Merkez",
                "address": "Büyükdere Cad. No:1 Şişli/İstanbul",
                "address_iframe": "<iframe src=\"https://www.google.com/maps/embed?pb=...\"></iframe>"
            },
            {
                "title": "Gebze Fabrika",
                "address": "GOSB 1000. Sok. No:5 Gebze/Kocaeli",
                "address_iframe": null
            }
        ],
        "socials": "[{\"platform\":\"linkedin\",\"url\":\"https://www.linkedin.com/company/anadolu-isuzu\"},{\"platform\":\"youtube\",\"url\":\"https://www.youtube.com/@anadoluisuzu\"}]",
        "type": "company",
        "university_id": null,
        "university": null,
        "is_verified": 0
    },
}
```

### `GET /companies/get_culture_blocks` 🌐

```txt
Şirket kültürü bloklarını (video, resim, metin) order_index sırasıyla getirir. Herkese açık.
Şirket company_id VEYA slug ile seçilir.
Video URL'leri imzalı ve süreli döner (CdnUrlHelper::signVideoUrlIfNeeded) — statik build'e gömmeyin.
```

```bash
curl "https://api.youthside.co/api/companies/get_culture_blocks?slug=anadolu-isuzu"
```

```json
{
  "status": "success",
  "data": [
    { "id": "UUID", "title": "İnovatif Çalışma", "content": "<p>…</p>", "mediaType": "video", "mediaUrl": "https://… (imzalı, süreli)", "order": 0 }
  ]
}
```

Hatalar: `400` ne `company_id` ne `slug` verildi; `404` slug'a ait şirket yok.

> Okuma uçları **camelCase** (`mediaType`, `mediaUrl`, `order`), kaydetme uçları snake_case (`media_type`, `order_index`) kullanır.

### `POST /companies/save_culture_blocks` 🔒

```txt
Şirket kültürü bloklarını toplu olarak günceller / yeniden oluşturur.
Mevcut blokları siler, yerine gönderilen yeni listeyi kaydeder. (Sadece COMPANY_UPDATE yetkisi olanlar)
```

**İstek:**

```json
{
  "blocks": [
    {
      "media_url": "https://cdn.../video.mp4",
      "media_type": "video",
      "title": "İnovatif Çalışma",
      "description": "Açıklama...",
      "order_index": 0
    }
  ]
}
```

### `GET /companies/get_award_blocks` 🌐

```txt
Şirket ödüllerini getirir. Herkese açık; company_id VEYA slug ile.
```

```json
{
  "status": "success",
  "data": [
    { "id": "UUID", "title": "En İyi İşveren", "content": "…", "mediaType": "image", "mediaUrl": "https://…", "year": 2025, "givenBy": "Great Place to Work", "order": 0 }
  ]
}
```

### `POST /companies/save_award_blocks` 🔒

```txt
Şirket ödüllerini toplu olarak kaydeder.
(Sadece COMPANY_UPDATE yetkisi olanlar)
```

**İstek:**

```json
{
  "blocks": [
    {
      "title": "En İyi İşveren 2023",
      "description": "Great Place to Work...",
      "year": 2023,
      "image_url": "https://cdn.../award.png",
      "order_index": 0
    }
  ]
}
```

### `GET /companies/get_gallery_items` 🌐

```txt
"İçinden Kareler" galeri öğelerini getirir. Herkese açık; company_id VEYA slug ile.
```

```json
{
  "status": "success",
  "data": [{ "id": "UUID", "title": null, "description": null, "imageUrl": "https://…", "order": 0 }]
}
```

### `POST /companies/save_gallery_items` 🔒

```txt
Şirket galeri görsellerini toplu olarak günceller.
Kayıt esnasında sadece image_url ve order_index kullanılır.
(Sadece COMPANY_UPDATE yetkisi olanlar)
```

**İstek:**

```json
{
  "items": [
    {
      "image_url": "https://cdn.../gallery1.png",
      "order_index": 0
    }
  ]
}
```

---

## 4. Dashboard

### `GET /dashboard/summary` 🔒

```txt
Şirketin özet istatistiklerini döner.
Toplam ilan, başvuru, etkinlik sayısı ve son 7 gün trendi.
```

```bash
curl -X GET "http://api.youthside.co/api/dashboard/summary" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}"
```

### `GET /dashboard/summary-v2` 🔒

```txt
İzin bazlı bölümlerden oluşan yeni panel özeti. Kullanıcının izni olmayan bölümler yanıtta yer almaz.
?scope=all (varsayılan) | active (yalnızca YAYINDA ilanlar)
```

| Bölüm | Gerekli izin | İçerik |
| :--- | :--- | :--- |
| `overview` | `company.update` veya `team.manage` | `active_jobs, total_applications, total_events, total_views, conversion_rate, week_applications, week_change_percent` |
| `jobs` | `job.manage` | `new_today, active_jobs, top_jobs[]` |
| `pipeline` | `job.manage` | `stages[], total` |
| `trend` | `job.manage` | Son 30 gün `[{date, applications}]` |
| `events` | `event.manage` | `active_count, total_registrations, week_registrations, upcoming[], top_events[], registration_trend[{date, registrations}]` |
| `recent_activity` | – (izne göre filtrelenir) | Son başvuru/kayıt hareketleri |
| `scope` | – | `"all"` / `"active"` |

### `GET /dashboard/demographics` 🔒

```txt
Başvuran adayların cinsiyet / üniversite / sınıf dağılımı.
Yetki: job.manage + cap:job. ?job_id= verilirse tek ilan; yoksa ?scope=active (varsayılan, YAYINDA ilanlar) | all.
```

```json
{
  "status": "success",
  "data": {
    "scope": "active",
    "job_id": null,
    "total_applications": 120,
    "gender_distribution": [{ "gender": "Kadın", "count": 64 }],
    "gender_unknown_count": 3,
    "university_distribution": [{ "university": "…", "count": 20 }, { "university": "Diğer", "count": 41 }],
    "university_unknown_count": 5,
    "grade_distribution": [{ "grade": "3. Sınıf", "count": 30 }],
    "grade_unknown_count": 7
  }
}
```

---

## 5. Jobs

### `GET /jobs/recommended` 🔒 ✨ _(Yeni)_

```txt
Adayın profiline (bölüm vb.) en uygun aktif ilanları Akıllı Eşleştirme Motoru ile getirir.
Şirketlerin "Yıldızlı/Öne Çıkan" (is_featured) kıldığı ilanlar skora +100 etki ederek en üst sıralarda çıkar.
Auth: Yalnızca aday (candidate) yetkisine sahip JWT ile erişilebilir.
```

| Parametre | Tip  | Zorunlu | Açıklama                                       |
| :-------- | :--- | :------ | :--------------------------------------------- |
| `limit`   | Int  | Hayır   | Getirilecek öneri sayısı. Varsayılan: 5        |
| `offset`  | Int  | Hayır   | Sayfalama atlama miktarı. Varsayılan: 0        |

**Örnek İstek:**

```bash
curl -X GET "http://localhost/youthside_ats/public/api/jobs/recommended?limit=3" \
  -H "Authorization: Bearer {{Token}}"
```

#### Yanıt (200 - Başarılı)

```json
{
  "status": "success",
  "code": 200,
  "message": "Sizin için önerilen fırsatlar başarıyla listelendi.",
  "data": {
    "jobs": [
      {
        "job_id": "UUID",
        "job_title": "Android Developer",
        "job_slug": "android-developer",
        "job_image_url": "https://...",
        "job_type": "Tam Zamanlı",
        "work_model": "Uzaktan",
        "is_featured": 1,
        "company_id": "UUID",
        "company_name": "Tech Corp",
        "company_logo": "https://..."
      }
    ],
    "pagination": {
      "total": 1,
      "limit": 3,
      "offset": 0
    }
  }
}
```

### `GET /jobs/list` 🌐 _(Güncellendi)_

```txt
Vitrin ilan kartları (ana sayfa, /ilanlar, şirket profili ilan sekmesi). Herkese açık.
Yalnızca YAYINDA ve süresi dolmamış (expiration_date boş veya gelecekte) ilanlar döner.
"status" parametresi YOK SAYILIR — şirket paneli kendi ilanları için /jobs/my-list kullanır.
Sıralama: sabitlenmiş (pin) ilanlar önce, sonra seçilen sıralama.
```

| Parametre | Varsayılan | Açıklama |
| :--- | :--- | :--- |
| `q` | – | Kelime bazlı arama: her kelime başlık, açıklama, şirket adı, kategori veya lokasyonda geçmeli (AND). Tire yok sayılır (`Ar-Ge` ↔ `arge`). En fazla 5 kelime, 2+ karakter. |
| `ids` | – | Virgüllü ID listesi (en fazla 50). `sort` verilmezse **verilen sıra korunur** (ör. öne çıkan ilanlar). |
| `company_id` | – | Şirket ID'si |
| `company_slug` | – | Şirket slug'ı (profil sayfasında ID çözmeden kullanılabilir) |
| `type` | – | Çalışma tipi; çoklu: `type=Staj,Tam Zamanlı` veya `type[]=…` |
| `work_model` | – | `Ofis`, `Hibrit`, `Uzaktan`; çoklu değer kabul eder |
| `category` | – | `jobs.category` değeriyle birebir eşleşme; çoklu. ⚠️ Kayıtlı kategoriler serbest metindir ve tutarsızdır (`engineering`, `hr`, `Ar-Ge`, `Yazılım Geliştirme`…); `GET /data/departments` listesiyle her zaman örtüşmez |
| `locations` | – | Şehir; çoklu, herhangi biri eşleşirse (OR) |
| `employee_ranges` | – | Şirket çalışan aralığı (`GET /data/employee-count-ranges`); çoklu |
| `sort` | `publish_date` | `publish_date`, `created_at`, `view_count`, `title` |
| `dir` | `DESC` | `ASC` / `DESC` |
| `pin_context` | `VITRIN` | `VITRIN` (vitrin sabitlemeleri) / `PANEL` |
| `limit` / `offset` | `20` / `0` | `limit` en fazla 100 |

```bash
curl -G "https://api.youthside.co/api/jobs/list" \
  --data-urlencode "q=yazılım staj" \
  --data-urlencode "locations=İstanbul,Kocaeli" \
  --data-urlencode "type=Staj" \
  --data-urlencode "limit=12"
```

#### Yanıt (200)

```json
{
  "status": "success",
  "data": {
    "data": [
      {
        "id": "UUID",
        "title": "Dış Ticaret Proje Stajyeri",
        "slug": "dis-ticaret-proje-stajyeri",
        "type": "Staj",
        "work_model": "Ofis",
        "category": "engineering",
        "status": "YAYINDA",
        "is_featured": false,
        "is_pinned": true,
        "pin_order": 1,
        "view_count": 412,
        "publish_date": "2026-09-30 10:00:00",
        "expiration_date": "2026-10-31 23:59:59",
        "locations": ["Kocaeli"],
        "cover_image_url": "https://…",
        "excerpt": "HTML'siz açıklamanın ilk 300 karakteri…",
        "company": {
          "id": "UUID",
          "name": "Anadolu Isuzu",
          "slug": "anadolu-isuzu",
          "logo_url": "https://…",
          "employee_count_range": "1.001-5.000"
        }
      }
    ],
    "pagination": { "total": 2, "limit": 12, "offset": 0, "has_more": false }
  }
}
```

> Not: Bu uç sayfalamayı `data.pagination` altında döner; `events/list` ve `companies/list` ise `data.meta` kullanır.
> Başvuru sayısı ve dönüşüm oranı herkese açık listede yer almaz (ilan sahibi `jobs/get` → `stats` ile görür).

### `POST /jobs/view` 🌐 ✨ _(Yeni)_

```txt
İlan detay sayfası görüntülenme sayacını artırır. Tarayıcıdan, sayfa yüklendikten sonra çağrılmalıdır.
Yalnızca YAYINDA ilanlar sayılır. Aynı IP aynı ilanı saatte bir kez artırabilir; IP başına dakikada 60 istek.
```

```json
{ "id": "JOB_UUID" }
```

Yanıt: `200` `{ "counted": true }` (zaten sayıldıysa `false`). Hatalar: `422` geçersiz UUID, `404` ilan yok/yayında değil, `429` sınır aşıldı, `405` POST dışı.

### `GET /jobs/my-list` 🔒

Şirketin sadece kendine ait ilanlarını listeler (Taslak, Yayında, Pasif vb. hepsi).

| Parametre | Varsayılan | Açıklama                                   |
| :-------- | :--------- | :----------------------------------------- |
| `status`  | `null`     | Duruma göre filtrele (Boş ise hepsi gelir) |
| `limit`   | `20`       | Sayfa başı kayıt                           |

```bash
curl -X GET "http://api.youthside.co/api/jobs/my-list?status=YAYINDA" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}"
```

### `GET /jobs/stats` 🔒

İlanın genel performans metriklerini (Görüntülenme, Başvuru, Trendler) getirir.

| Parametre | Zorunlu | Açıklama   |
| :-------- | :------ | :--------- |
| `job_id`  | ✅ Evet | İlan ID'si |

```bash
curl -X GET "http://api.youthside.co/api/jobs/stats?job_id=JOB_UUID" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}"
```

### `GET /jobs/stats-education` 🔒

Başvuran adayların demografik analizini (Üniversite, Bölüm, Sınıf) getirir.

| Parametre | Zorunlu | Açıklama   |
| :-------- | :------ | :--------- |
| `job_id`  | ✅ Evet | İlan ID'si |

```bash
curl -X GET "http://api.youthside.co/api/jobs/stats-education?job_id=JOB_UUID" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}"
```

### `GET /jobs/pipeline` 🔒

Aday Takip Sistemi (ATS) Kanban tahtası için verileri (Süreç aşamaları + Adaylar) getirir.

| Parametre | Zorunlu | Açıklama   |
| :-------- | :------ | :--------- |
| `job_id`  | ✅ Evet | İlan ID'si |

```bash
curl -X GET "http://api.youthside.co/api/jobs/pipeline?job_id=JOB_UUID" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}"
```

### `GET /jobs/get` 🌐 _(Güncellendi)_

```txt
Tek ilanın detayı (vitrin ilan sayfası + panel). ?id=UUID veya ?slug=… ile.
Herkese açık: YAYINDA olmayan ilanlar yalnızca sahibi şirketin token'ıyla görülür (diğerlerine 404).
Süresi dolmuş YAYINDA ilan döner; istemci expiration_date'e bakarak "başvuru süresi doldu" göstermeli.
İlan slug'ı global benzersizdir — vitrin URL'sindeki şirket slug'ı ile company_slug karşılaştırılmalıdır.
```

Yanıt alanları (`data`):

- `jobs` tablosunun tüm kolonları (`id, title, slug, description (HTML), type, work_model, category, status, publish_date, expiration_date, cover_image_url, is_featured, external_application_url, …`)
- `is_external_application` (bool), `locations` (dizi)
- Şirket bilgisi **düz** alanlar olarak: `company_id, company_name, company_slug, company_logo, company_sector, company_size` (`jobs/list`'teki iç içe `company{}` değil)
- `questions[]` — `{id, text, type, options, is_required, order_index}`
- `contracts[]` — ilan için aktif sözleşmeler (`{id, title, type, file_url, is_required}`)
- Yalnızca ilan sahibine: `pipelines[]`, `criteria[]`, `stats{view_count, application_count, conversion_rate}`; diğerlerine boş dizi. `view_count` / `application_count` kök alanları yanıttan çıkarılır.

Hatalar: `400` id/slug yok, `404` bulunamadı veya yayında değil.

### `POST /jobs/create` 🔒

```txt
Yeni iş ilanı oluşturur.
Varsayılan pipeline'lar otomatik oluşturulur.
```

```bash
curl -X POST "http://api.youthside.co/api/jobs/create" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "COMPANY_UUID",
    "title": "Senior Backend Developer",
    "slug": "senior-backend-developer",
    "description": "Deneyimli PHP/Node.js geliştiricisi arıyoruz...",
    "type": "Tam Zamanlı",
    "work_model": "Hibrit",
    "locations": ["İstanbul", "Ankara"],
    "cover_image_url": "https://cdn.youthside.com/jobs/cover-123.jpg"
  }'
```

### `POST /jobs/update?id=UUID` 🔒

```txt
Mevcut ilanı günceller.
status: YAYINDA, TASLAK, ARSIV, KAPANDI
```

```bash
curl -X POST "http://api.youthside.co/api/jobs/update?id=JOB_UUID" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Güncellenmiş İlan Başlığı",
    "status": "YAYINDA",
    "locations": ["İzmir"],
    "cover_image_url": "https://cdn.youthside.com/jobs/new-cover.jpg"
  }'
```

### `POST /jobs/archive` 🔒

```txt
Yetki: job.manage + cap:job. Yayındaki ilanı arşive alır (status → ARSIV) veya arşivden çıkarır.
```

```json
{ "job_id": "UUID", "archived": true }
```

Yanıt: `{ "id": "UUID", "status": "ARSIV" }`. Hatalar: `400` eksik/geçersiz alan, `422` yalnızca YAYINDA ilan arşivlenebilir, `404` ilan yok/yetki yok.

### `POST|DELETE /jobs/delete?id=UUID` 🔒

Yetki: `job.manage` + `cap:job`, ilan aynı şirkete ait olmalı. Yanıt `200` `"İlan silindi"`; `400` id yok, `403` başka şirketin ilanı, `404` bulunamadı.

### `POST /jobs/pin` 🔒

```txt
Yetki: job.pin.manage + cap:job. İlanı sabitler / sabitlemeyi kaldırır.
pin_context: PANEL (varsayılan, panel listesi) | VITRIN (herkese açık site sıralaması — jobs/list'i etkiler)
```

```json
{ "job_id": "UUID", "pinned": true, "pin_context": "VITRIN" }
```

Yanıt: `{ "is_pinned": true, "pin_order": 3 }`. Hatalar: `400` geçersiz alan, `404` ilan yok/yetki yok.

### `POST /jobs/pin-reorder` 🔒

```json
{ "job_ids": ["UUID-1", "UUID-2"], "pin_context": "VITRIN" }
```

Sabitlenmiş ilanların sırasını dizideki sıraya göre günceller. Yetki: `job.pin.manage` + `cap:job`. Hata: `400` boş/geçersiz dizi veya liste güncel değil.

---

## 6. Pipelines

### `GET /pipelines/list?job_id=UUID` 🔒

```txt
Bir ilanın tüm pipeline aşamalarını listeler.
Kanban sütunlarını oluşturmak için kullanılır.
```

```bash
curl -X GET "http://api.youthside.co/api/pipelines/list?job_id=JOB_UUID" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}"
```

### `GET /pipelines/list` 🔒

| Parametre | Zorunlu | Açıklama                              |
| :-------- | :------ | :------------------------------------ |
| `job_id`  | ✅ Evet | Süreçlerin listeleneceği ilanın ID'si |

### `POST /pipelines/create` 🔒

```txt
İlana yeni pipeline aşaması ekler.
type: DEFAULT (silinmez) veya CUSTOM (silinebilir)
```

```bash
curl -X POST "http://api.youthside.co/api/pipelines/create" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "JOB_UUID",
    "name": "Teknik Mülakat",
    "color": "#8b5cf6",
    "order_index": 2,
    "type": "CUSTOM"
  }'
```

### `POST /pipelines/update?id=UUID` 🔒

```txt
Pipeline aşamasını günceller.
İsim, renk, sıralama değiştirilebilir.
```

```bash
curl -X POST "http://api.youthside.co/api/pipelines/update?id=PIPELINE_UUID" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "HR Mülakat",
    "color": "#10b981"
  }'
```

### `POST /pipelines/delete?id=UUID` 🔒

```txt
Pipeline aşamasını siler.
Sadece CUSTOM tipi silinebilir.
```

```bash
curl -X POST "http://api.youthside.co/api/pipelines/delete?id=PIPELINE_UUID" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}"
```

---

## 7. Questions

### `GET /questions/list?job_id=UUID` 🔒

```txt
İlanın başvuru formundaki soruları listeler.
Başvuru formu oluştururken kullanılır.
```

```bash
curl -X GET "http://api.youthside.co/api/questions/list?job_id=JOB_UUID" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}"
```

### `POST /questions/create` 🔒

```txt
İlana özel başvuru sorusu ekler.
type: text, long_text, select, multiselect, radio, checkbox, video, file
```

```bash
curl -X POST "http://api.youthside.co/api/questions/create" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "JOB_UUID",
    "text": "Neden bu pozisyona başvurdunuz?",
    "type": "long_text",
    "is_required": true,
    "order_index": 0
  }'
```

### `POST /questions/update?id=UUID` 🔒

**Gerekli Rol:** Şirket Personeli (Hepsi)

```bash
# Rol: Herhangi bir şirket personeli
curl -X POST "http://api.youthside.co/api/questions/update?id=QUESTION_UUID" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Neden Youthside?",
    "is_required": false
  }'
```

### `DELETE /questions/delete?id=UUID` 🔒

**Gerekli Rol:** Şirket Personeli (Hepsi)

```bash
# Rol: Herhangi bir şirket personeli
curl -X DELETE "http://api.youthside.co/api/questions/delete?id=QUESTION_UUID" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}"
```

---

## 8. Applications

### `GET /applications/my-list` 🔒

```txt
Adayın kendisine ait (kendi yaptığı) iş başvurularını sayfalamalı (pagination) olarak listeler.
Bu endpoint yalnızca adayın kendi JWT token'ıyla (candidate rolüyle) erişilebilir, dışarıdan candidate_id taşımaz.
```

| Parametre       | Tip    | Zorunlu | Açıklama                                                                       |
| :-------------- | :----- | :------ | :----------------------------------------------------------------------------- |
| `status_filter` | Enum   | Hayır   | `active` (Kapanmamış ilanlar) veya `past` (Kapanmış ilanlar & Final aşamaları) |
| `q`             | String | Hayır   | İlan başlığı / şirket adında arama                                              |
| `limit`         | Int    | Hayır   | Listelenecek kayıt sayısı. Varsayılan: 20                                      |
| `offset`        | Int    | Hayır   | Atlanacak kayıt sayısı. Varsayılan: 0                                          |
| `sort`          | String | Hayır   | Sıralama yapılacak alan. Varsayılan: a.created_at                              |
| `dir`           | String | Hayır   | Sıralama yönü (ASC / DESC). Varsayılan: ASC (Eskiden yeniye)                   |

**Örnek:**

```bash
curl -X GET "http://localhost/youthside_ats/public/api/applications/my-list?status_filter=active&limit=10&dir=ASC" \
  -H "Authorization: Bearer {{Token}}"
```

#### Yanıt (200)

```json
{
  "status": "success",
  "data": {
    "applications": [
      {
        "application_id": "UUID",
        "created_at": "2024-03-10 14:00:00",
        "updated_at": "2024-03-11 09:12:00",
        "job_id": "UUID",
        "job_title": "Frontend Developer",
        "job_slug": "frontend-developer-abc",
        "job_status": "YAYINDA",
        "job_image_url": "https://...",
        "job_type": "Tam Zamanlı",
        "work_model": "Hibrit",
        "company_id": "UUID",
        "company_name": "Youthside",
        "company_logo": "https://..."
      }
    ],
    "pagination": {
      "total": 5,
      "limit": 10,
      "offset": 0
    }
  }
}
```

### `GET /applications/list` 🔒

```txt
Bir ilana yapılan başvuruları listeler.
job_id zorunlu: Hangi ilanın başvuruları?
```

| Parametre     | Zorunlu | Açıklama                                |
| :------------ | :------ | :-------------------------------------- |
| `job_id`      | ✅ Evet | Başvuruların listeleneceği ilanın ID'si |
| `pipeline_id` | Hayır   | Belirli bir aşamadaki adayları filtrele |
| `rating`      | Hayır   | Puana göre filtrele (1-5)               |

```bash
curl -X GET "http://api.youthside.co/api/applications/list?job_id=JOB_UUID&limit=20" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}"
```

#### Yanıt (Aday Nesnesi)

```json
{
  "application_id": "UUID",
  "first_name": "Ferhat",
  "last_name": "Cengiz",
  "rating": 4,
  "notes_count": 3, // Adaya bırakılan toplam not sayısı
  "pipeline": { "id": "UUID", "name": "Mülakat", "color": "#ff0000" },
  "applied_at": "2026-02-20 01:00:00"
}
```

### `GET /applications/get?id=UUID` 🔒

```txt
Tek başvurunun tüm detaylarını getirir.
Aday profili + CV + Pipeline bilgisi.
```

```bash
curl -X GET "http://api.youthside.co/api/applications/get?id=APPLICATION_UUID" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}"
```

### `GET /applications/check` 🔒

```txt
Adayın belirli bir iş ilanına başvurusu olup olmadığını kontrol eder.
Aday "Başvur" butonunun durumunu "Zaten Başvurdunuz" olarak değiştirmek için kullanılır.
Auth: JWT zorunlu (Aday girişi). candidate_id token üzerinden alınır.
```

| Parametre | Zorunlu | Açıklama                       |
| :-------- | :------ | :----------------------------- |
| `job_id`  | ✅ Evet | Başvurusu sorgulanacak ilan ID |

```bash
curl -X GET "http://api.youthside.co/api/applications/check?job_id=JOB_UUID" \
  -H "Authorization: Bearer {{YOUTHSIDE_CANDIDATE_JWT_TOKEN}}"
```

#### Yanıt (200)

```json
{
  "status": "success",
  "data": {
    "has_applied": true
  }
}
```

Aday olmayan token → `403`.

### `GET /jobs/questions` 🌐

```txt
İlana özel belirlenmiş ön eleme sorularını (Pre-Screening Questions) sıralı getirir.
Bu endpoint herkese açıktır. Aday "Başvur" dediğinde formu çizmek için kullanılır.
İlan YAYINDA değilse 404 döner.
```

| Parametre | Zorunlu | Açıklama                                   |
| :-------- | :------ | :----------------------------------------- |
| `job_id`  | ✅ Evet | Ön eleme soruları getirilecek olan ilan ID |

```bash
curl -X GET "http://api.youthside.co/api/jobs/questions?job_id=JOB_UUID"
```

#### Yanıt (200)

```json
{
  "status": "success",
  "data": {
    "job_id": "UUID",
    "total_questions": 2,
    "questions": [
      {
        "id": "Q_UUID",
        "text": "Kaç yıl deneyiminiz var?",
        "type": "short_text",
        "options": null,
        "is_required": true,
        "order_index": 0
      }
    ]
  }
}
```

### `POST /applications/create` 🔒 _(Güncellendi)_

```txt
Aday ilana başvurur. Yalnızca aday (scope: candidate) token'ı. candidate_id token'dan alınır.
Kontrol sırası:
  1. İlan var mı (404)
  2. İlan YAYINDA mı ve süresi dolmamış mı (422)
  3. Profil doluluğu en az %75 mi (403 + missing_fields) — bkz. /candidates/profile-completeness
  4. Daha önce başvurmuş mu (409)
  5. Zorunlu ön eleme soruları yanıtlanmış mı (422 + questions)
  6. Zorunlu sözleşmeler kabul edilmiş mi (422 + contracts) / gönderilen sözleşme ID'leri şirkete ait mi (400)
Başvuru HER ZAMAN ilanın varsayılan pipeline aşamasına düşer; istemciden pipeline_id kabul edilmez.
```

```bash
curl -X POST "https://api.youthside.co/api/applications/create" \
  -H "Authorization: Bearer {{CANDIDATE_JWT}}" \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "JOB_UUID",
    "cover_letter": "Başvuru mektubu...",
    "accepted_contracts": ["CONTRACT_UUID_1", "CONTRACT_UUID_2"],
    "answers": [
      { "question_id": "Q_UUID_1", "answer": "3 Yıl" },
      { "question_id": "Q_UUID_2", "answer": ["Backend", "Frontend"] }
    ]
  }'
```

> CV, adayın profilindeki `resume_url`'den alınır (`/candidates/upload-resume`); istekteki `resume_url` yok sayılır.

#### Başarılı Yanıt (201)

```json
{ "status": "success", "code": 201, "message": "Başvurunuz alındı.", "data": { "id": "APPLICATION_UUID", "pipeline_id": "PIPELINE_UUID" } }
```

#### Hata Yanıtları

| Kod | Durum | Gövde |
| :--- | :--- | :--- |
| 403 | Aday token'ı değil | `"İş başvurusunda bulunmak için Aday olarak giriş yapmalısınız."` |
| 403 | Profil %75'in altında | `missing_fields: [...]` |
| 404 | İlan yok | |
| 409 | Zaten başvurmuş | |
| 422 | İlan yayında değil / süresi dolmuş | `"Bu ilan başvurulara kapalı."` / `"Bu ilanın başvuru süresi dolmuştur."` |
| 422 | Zorunlu soru eksik | `questions: [{id, text, type, options, is_required}]` (**tüm** sorular, form çizmek için) |
| 422 | Zorunlu sözleşme eksik | `contracts: [{id, title, type, file_url, is_required}]` (eksik olanlar) |
| 400 | Geçersiz sözleşme ID'si | |

```json
{
  "status": "error",
  "code": 422,
  "message": "Lütfen ilandaki tüm zorunlu ön eleme sorularını yanıtlayın.",
  "questions": [
    { "id": "Q_UUID", "text": "Kaç yıl deneyiminiz var?", "type": "short_text", "options": null, "is_required": true }
  ]
}
```

### `POST /applications/update-pipeline` 🔒

```txt
Adayı farklı pipeline aşamasına taşır.
Kanban sürükle-bırak için kullanılır.
```

```bash
curl -X POST "http://api.youthside.co/api/applications/update-pipeline" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "application_id": "APPLICATION_UUID",
    "pipeline_id": "TARGET_PIPELINE_UUID"
  }'
```

### `POST /applications/update-rating` 🔒

```txt
Adaya puan verir (1-5 yıldız).
Aday değerlendirmesi için kullanılır.
```

```bash
curl -X POST "http://api.youthside.co/api/applications/update-rating" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "application_id": "APPLICATION_UUID",
    "rating": 4
  }'
```

### `POST /applications/toggle-favorite` 🔒

```txt
Adayı favorilere ekler veya çıkarır.
Toggle mantığı: Favorideyse çıkarır, değilse ekler.
```

```bash
curl -X POST "http://api.youthside.co/api/applications/toggle-favorite" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{"application_id": "APPLICATION_UUID"}'
```

### `POST /applications/bulk-update-pipeline` 🔒

```txt
Birden fazla adayı aynı pipeline aşamasına taşır.
Toplu işlem barı üzerinden tetiklenir.
```

```bash
curl -X POST "http://api.youthside.co/api/applications/bulk-update-pipeline" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "application_ids": ["ID1", "ID2", "ID3"],
    "pipeline_id": "TARGET_PIPELINE_UUID"
  }'
```

### `POST /applications/bulk-delete` 🔒

```txt
Birden fazla başvuruyu siler.
```

```bash
curl -X POST "http://api.youthside.co/api/applications/bulk-delete" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "application_ids": ["ID1", "ID2"]
  }'
```

### `POST /applications/bulk-toggle-favorite` 🔒

```txt
Birden fazla adayın favori durumunu tersine çevirir.
```

```bash
curl -X POST "http://api.youthside.co/api/applications/bulk-toggle-favorite" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "application_ids": ["ID1", "ID2"]
  }'
```

---

### `POST /applications/mark-viewed` 🔒

Şirket token'ı + `cap:applications`. Başvuruyu "görüntülendi" işaretler. Gövde `{ "application_id": "UUID" }` → `{ "is_viewed": true }`. Başka şirketin başvurusu → `403`.

### `GET /applications/fetch_ids` 🔒

```txt
Şirket token'ı + cap:applications. ?job_id= (zorunlu) + applications/list ile aynı filtreler.
Filtreye uyan TÜM başvuru ID'lerini döner ("tümünü seç" toplu işlemleri için).
```

Yanıt: `{ "ids": ["UUID", …], "total": 128 }`.

### `POST /applications/bulk-note` 🔒

```txt
Şirket token'ı + cap:applications. Birden fazla başvuruya aynı notu ekler.
scope: "SELECTED" (application_ids kullanılır) | diğer değer → filters'a uyan tüm başvurular (exclude_ids hariç).
```

```json
{ "content": "Telefon görüşmesi yapıldı", "scope": "SELECTED", "application_ids": ["UUID-1", "UUID-2"], "filters": {}, "exclude_ids": [] }
```

Yanıt: `{ "added_count": 2 }`. Hata: `400` boş not.

### `GET /applications/mail-recipients` 🔒

```txt
Şirket token'ı + cap:applications. Bir ilanın başvuranlarından toplu mail alıcı listesi üretir.
Parametreler: job_id (zorunlu), limit (en fazla 50000), applications/list filtreleri, pipeline_id (virgüllü veya dizi),
answer_filter (JSON), comm_channel, comm_channel_mode.
```

Yanıt: `{ "recipients": [{ "id", "email", "fullName", "type": "REGISTERED|EXTERNAL", "variables": {} }], "total", "skipped_no_email_count", "limit" }`.

### `POST /applications/ai-cv-analysis` 🔒

```txt
Şirket token'ı + cap:applications. Başvurunun CV'sini ilana göre yapay zekâ ile analiz eder (0-100 skor). SENKRON.
Sonuç kalıcı önbelleklidir (aynı CV + ilan + prompt sürümü için sağlayıcıya bir kez gidilir); force: true yeniden analiz eder.
Günlük şirket kotası: AI_DAILY_ANALYSIS_LIMIT (varsayılan 200).
```

```json
{ "application_id": "UUID", "force": false }
```

#### Yanıt (200)

```json
{
  "status": "success",
  "message": "Analiz tamamlandı.",
  "data": {
    "score": 78,
    "verdict": "…",
    "breakdown": { "education": 80, "experience": 70, "skills": 85, "criteria": null },
    "strengths": ["…"],
    "gaps": ["…"],
    "summary": "…",
    "recommend_training": false,
    "meta": { "provider": "gemini", "model": "…", "cached": false, "cv_chars": 4210, "cv_extractor": "…", "input_tokens": 0, "output_tokens": 0, "prompt_version": "…", "analyzed_at": "2026-10-12T09:00:00+00:00" }
  }
}
```

`breakdown.criteria` ilanda kriter yoksa `null`'dır. Hatalar `errorCode` taşır: `NOT_FOUND` 404, `NO_RESUME` / `CV_UNREADABLE` / `GENERATED_CV` 422, `DAILY_LIMIT` 429, `PROVIDER_ERROR` 502.

---

## 9. Candidates

### `GET /candidates/list` 🔒

```txt
Kayıtlı (Sistem Üyesi) adayları listeler. Şirket token'ı + cap:candidates.
```

| Parametre    | Açıklama |
| :----------- | :------- |
| `q`          | Ad, soyad veya e-postada arama |
| `university` | Üniversite adında arama (LIKE) |
| `department` | Bölüm adında arama (LIKE) |
| `gender`     | Cinsiyet (`Kadın`, `Erkek`, `Belirtmek İstemiyorum`) |
| `limit` / `offset` | En fazla 100 |

### `GET /candidates/get?id=UUID` 🔒

```txt
Aday detayını getirir.
```

### `GET /candidates/profile?id=UUID` 🔒

```txt
Şirket token'ı + cap:candidates. Aday (kayıtlı veya dış kaynak) için şirkete özel 360° profil.
Kayıtlı aday yalnızca bu şirketin bir ilanına başvurmuşsa görüntülenebilir (aksi halde 403).
```

Yanıt: `{ profile{…, is_external, avatar_url, resume_url, socials | source_label}, stats{total_applications, avg_score, avg_rating, favorite_count, first_applied_at, last_applied_at}, applications[], events[] }`. Hatalar: `400` id yok, `403` erişim yok, `404` bulunamadı.

> ⚠️ `external-list`, `bulk-import`, `bulk-update`, `bulk-delete` uçları `AuthMiddleware::authorize` ile eski küçük harfli rolleri (`admin`, `company_admin`, `recruiter`, `user`) bekler. Güncel RBAC rolleri (`OWNER`, `ADMIN`, …) bu listede olmadığından bu uçlar şu an `403 "Bu işlem için yetkiniz yetersiz (Role)."` döner.

### `GET /candidates/external-list` 🔒 _(Yeni)_

```txt
Şirkete özel "Dış Kaynak" (External) adayları listeler.
Bu adaylar sisteme kayıtlı değildir, şirket tarafından eklenmiştir.
```

| Parametre      | Varsayılan   | Açıklama                             |
| :------------- | :----------- | :----------------------------------- |
| `q`            | `null`       | Ad, Soyad, Email, Telefon araması    |
| `sort`         | `created_at` | Sıralama sütunu                      |
| `dir`          | `DESC`       | Sıralama yönü                        |
| `university`   | `null`       | Üniversite filtresi                  |
| `department`   | `null`       | Bölüm filtresi                       |
| `source_label` | `null`       | Kaynak etiketi (LinkedIn, Excel vb.) |

```bash
curl -X GET "http://api.youthside.co/api/candidates/external-list?limit=20&q=ahmet" \
  -H "Authorization: Bearer {{TOKEN}}"
```

### `POST /candidates/bulk-import` 🔒 _(Güncellendi)_

```txt
Toplu aday içe aktarır.
Hem kayıtlı kullanıcıları hem de yeni external adayları işler.
```

**Validasyon:**

- `job_id` ve `pipeline_id` GUID olmalı ve şirkete ait olmalı.
- Max 1000 aday satırı.
- Her satır için email/telefon validasyonu.

#### İstek Body

```json
{
  "job_id": "JOB_UUID",
  "pipeline_id": "PIPELINE_UUID",
  "source_label": "Kariyer Fuarı 2024",
  "candidates": [
    {
      "first_name": "Ayşe",
      "last_name": "Yılmaz",
      "email": "ayse@mail.com",
      "phone": "05551234567",
      "university": "ODTÜ",
      "department": "Bilgisayar Müh.",
      "gender": "Kadın"
    }
    // ...
  ]
}
```

#### Yanıt

```json
{
  "status": "success",
  "data": {
    "total": 50,
    "success": 48,
    "skipped": 2,
    "failed": 0,
    "elapsed_ms": 320,
    "validation_errors": []
  }
}
```

### `PUT /candidates/bulk-update` 🔒 _(Yeni - Bulk)_

```txt
External aday bilgilerini günceller.
Tekli veya toplu gönderim destekler.
Partial Update: Sadece gönderilen alanlar değişir.
```

**Tekli Güncelleme:**

```json
{
  "id": "CANDIDATE_UUID",
  "first_name": "Mehmet",
  "university": "İTÜ"
}
```

**Toplu Güncelleme:**

```json
{
  "candidates": [
    { "id": "UUID_1", "source_label": "Güncellendi" },
    { "id": "UUID_2", "gender": "Erkek" }
  ]
}
```

### `POST /candidates/bulk-delete` 🔒 _(Yeni - Bulk)_

```txt
External adayları siler.
Bağlı başvurular (Applications) otomatik silinir (Cascade).
```

**İstek:**

```json
{
  "ids": ["UUID_1", "UUID_2"]
}
```

---

### `POST /candidates/create`

```txt
Yeni aday kaydı oluşturur.
Aday kayıt formu için kullanılır.
```

```bash
curl -X POST "http://api.youthside.co/api/candidates/create" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Mehmet",
    "last_name": "Kaya",
    "email": "aday@email.com",
    "phone": "05551234567",
    "university": "Boğaziçi Üniversitesi",
    "department": "Bilgisayar Mühendisliği",
    "grade": "4. Sınıf",
    "password": "sifre123"
  }'
```

---

### `POST /candidates/platform-register` ✨ _(Yeni)_

```txt
Platform üzerinden hızlı aday kaydı oluşturur (vitrin /kayit-ol). Herkese açık.
Sadece temel bilgiler (ad, soyad, e-posta) zorunludur.
Şifre opsiyoneldir — girilmezse 8 karakterlik şifre otomatik üretilir ve yanıtta döner.
Şifre gönderilirse en az 6 karakter ve confirm_password ile aynı olmalıdır.
Token DÖNMEZ: hesaba doğrulama e-postası gider (verify-email → CANDIDATE_FRONTEND_URL/giris-yap);
e-posta doğrulanana kadar /auth/login 400 döner.
```

#### İstek (Şifreli)

```json
{
  "first_name": "Mehmet",
  "last_name": "Kaya",
  "email": "mehmet.kaya@example.com",
  "password": "sifre123",
  "confirm_password": "sifre123"
}
```

#### İstek (Hızlı Kayıt - Şifresiz)

```json
{
  "first_name": "Ayşe",
  "last_name": "Yılmaz",
  "email": "ayse.yilmaz@example.com"
}
```

#### Başarılı Yanıt (201)

```json
{
  "status": "success",
  "code": 201,
  "message": "Kayıt başarıyla oluşturuldu.",
  "data": {
    "id": "CANDIDATE_UUID",
    "generated_password": "..." // Sadece şifre gönderilmediyse döner
  }
}
```

Hatalar: `409` e-posta zaten kayıtlı, `422` doğrulama hatası.

---

### `GET /candidates/profile-completeness` 🔒 ✨ _(Yeni)_

```txt
Adayın profil doluluk oranını hesaplar.
%75 ve üzerindeyse başvuru yapabilir, altındaysa eksik alanları listeler.
Auth: JWT zorunlu.
- Aday token'ı: her zaman kendi profili hesaplanır (`id` yok sayılır).
- Şirket token'ı: `?id=` zorunlu ve aday bu şirketin bir ilanına başvurmuş olmalı (aksi halde 403).
```

| Parametre | Tip    | Zorunlu  | Açıklama |
| :-------- | :----- | :------- | :------- |
| `id`      | String | Şirket için ✅ | Aday UUID (aday token'ında yok sayılır) |

> CV (`resume_url`) tek başına 35 puandır; CV'siz azami puan 65 olduğundan **CV yüklemeden başvuru yapılamaz**.
> Yanıt ayrıca `filled_fields_details` (doldurulan alanların puan katkısı) içerir.

**Örnek:**

```bash
curl -X GET "http://api.youthside.co/api/candidates/profile-completeness" \
  -H "Authorization: Bearer {{Token}}"
```

#### Yanıt (200 - Profil Yeterli)

```json
{
  "status": "success",
  "code": 200,
  "message": "Profiliniz başvuru için yeterli düzeyde tamamlanmış.",
  "data": {
    "percentage": 90,
    "is_eligible": true,
    "threshold": 75,
    "filled_fields": [
      "resume_url",
      "first_name",
      "last_name",
      "email",
      "phone",
      "university",
      "department",
      "grade",
      "gender"
    ],
    "missing_fields": [
      { "field": "graduation_year", "label": "Mezuniyet Yılı", "weight": 5 },
      { "field": "avatar_url", "label": "Profil Fotoğrafı", "weight": 5 }
    ]
  }
}
```

#### Yanıt (200 - Profil Yetersiz)

```json
{
  "status": "success",
  "code": 200,
  "message": "Başvuru yapabilmek için profilinizi en az %75 oranında tamamlamanız gerekmektedir.",
  "data": {
    "percentage": 15,
    "is_eligible": false,
    "threshold": 75,
    "filled_fields": ["first_name", "last_name", "email"],
    "missing_fields": [
      { "field": "phone", "label": "Telefon Numarası", "weight": 5 },
      { "field": "university", "label": "Üniversite", "weight": 10 },
      { "field": "department", "label": "Bölüm", "weight": 10 },
      { "field": "grade", "label": "Sınıf / Mezuniyet Durumu", "weight": 10 },
      { "field": "graduation_year", "label": "Mezuniyet Yılı", "weight": 5 },
      { "field": "avatar_url", "label": "Profil Fotoğrafı", "weight": 5 },
      { "field": "resume_url", "label": "CV / Özgeçmiş", "weight": 35 }
    ]
  }
}
```

#### Alan Ağırlık Tablosu

Kaynak: `services/ProfileCompletenessService.php` (toplam 100, eşik 75).

| Alan              | Ağırlık | Açıklama                 |
| :---------------- | :------ | :----------------------- |
| `resume_url`      | **35**  | CV / Özgeçmiş            |
| `first_name`      | 5       | Ad                       |
| `last_name`       | 5       | Soyad                    |
| `email`           | 5       | E-posta Adresi           |
| `phone`           | 5       | Telefon Numarası         |
| `university`      | 10      | Üniversite               |
| `department`      | 10      | Bölüm                    |
| `grade`           | 10      | Sınıf / Mezuniyet Durumu |
| `graduation_year` | 5       | Mezuniyet Yılı           |
| `gender`          | 5       | Cinsiyet                 |
| `avatar_url`      | 5       | Profil Fotoğrafı         |


---

### `POST /candidates/update` 🔒 ✨ _(Yeni)_

```txt
Adayın kendi profilindeki esnek bilgileri (Eğitim, Kişisel, Dosyalar) güvenle günceller.
Bu endpoint, güvenlik sebebiyle email ve şifre gibi kritik değişiklikleri ENGELLER (Whitelist tabanlıdır).

Auth: JWT zorunlu (Sadece "candidate" yetkisi erişebilir).
URL Parametresi: Yok. (Kullanıcı JWT üzerinden tanınır).
```

Değer kuralları:

- `grade`: `Hazırlık`, `1.`–`6. Sınıf`, `Yeni Mezun`, `Mezun`, `Yüksek Lisans`, `Doktora`, `Diğer` (`GET /data/class` listesini kapsar). Listede olmayan değer **sessizce `null`** kaydedilir.
- `gender`: `Kadın`, `Erkek`, `Belirtmek İstemiyorum`; geçersiz değer `Belirtmek İstemiyorum` olur.
- Boş string alanı `null` yapar. Hiç alan gönderilmezse `200` ve `data: []` döner.

#### İzin Verilen JSON Parametreleri (Tamamı opsiyoneldir)

```json
{
  "first_name": "Mehmet",
  "last_name": "Kaya",
  "phone": "+905551234567",
  "gender": "Erkek",
  "university": "Boğaziçi Üniversitesi",
  "department": "Bilgisayar Mühendisliği",
  "grade": "3. Sınıf",
  "graduation_year": 2025,
  "avatar_url": "https://example.com/logo.png",
  "resume_url": "https://example.com/cv.pdf",
  "socials": {
    "linkedin": "https://linkedin.com/in/mehmetkaya",
    "github": "https://github.com/mehmetkaya"
  }
}
```

#### Başarılı Yanıt (200)

Güncellenen profil eşzamanlı olarak `%75` Doluluk Oranı kontrolünden geçirilir ve sonuç yanıta dahil edilir.

```json
{
  "status": "success",
  "code": 200,
  "message": "Profil bilgileriniz başarıyla güncellendi.",
  "data": {
    "profile": {
      "id": "UUID",
      "first_name": "Mehmet",
      "last_name": "Kaya",
      "email": "m@example.com",
      "university": "Boğaziçi Üniversitesi",
      "grade": "3. Sınıf",
      "...": "..."
    },
    "completeness": {
      "percentage": 85,
      "is_eligible": true,
      "threshold": 75,
      "filled_fields": ["university", "grade", "..."],
      "missing_fields": []
    }
  }
}
```

---

### `POST /candidates/upload-avatar` 🔒 ✨ _(Yeni)_

```txt
Adayın profil fotoğrafını (avatar) Rclone CDN üzerine yükler ve veritabanına kaydeder.
Zorunlu İçerik Türü: multipart/form-data

Auth: JWT zorunlu (Sadece "candidate" yetkisi erişebilir).
URL Parametresi: Yok.
```

#### İzin Verilen Form Datası

- `avatar`: (File) Fotoğraf dosyası (İzin: `jpeg`, `png`, `webp`; MIME içerikten kontrol edilir). Kodda ayrı boyut sınırı yoktur; pratik üst sınır PHP `upload_max_filesize` = **200 MB**. İstemci tarafında makul bir sınır (ör. 5 MB) uygulayın.

#### Başarılı Yanıt (200)

CDN bağlantısı ve o anki yeni Profil Doluluk yüzdesi döner.

```json
{
  "status": "success",
  "code": 200,
  "message": "Profil fotoğrafınız başarıyla güncellendi.",
  "data": {
    "avatar_url": "https://cdn.youthside.com/youthside/candidates/UUID/avatars/1234_abc.png",
    "completeness": {
      "percentage": 50,
      "is_eligible": false,
      "threshold": 75,
      "filled_fields": ["avatar_url"],
      "missing_fields": []
    }
  }
}
```

---

### `POST /candidates/upload-resume` 🔒 ✨ _(Yeni)_

```txt
Adayın özgeçmiş (CV) dosyasını Rclone CDN üzerine yükler ve veritabanına kaydeder.
Zorunlu İçerik Türü: multipart/form-data

Auth: JWT zorunlu (Sadece "candidate" yetkisi erişebilir).
URL Parametresi: Yok.
```

#### İzin Verilen Form Datası

- `resume`: (File) Belge (İzin: `pdf`, `doc`, `docx`; MIME içerikten kontrol edilir). Üst sınır PHP `upload_max_filesize` = **200 MB**.

Dönen URL'ler önbellek kırıcı `?v=<timestamp>` içerir. Yükleme hatası → `400` (depolama mesajıyla).

#### Başarılı Yanıt (200)

```json
{
  "status": "success",
  "code": 200,
  "message": "Özgeçmişiniz başarıyla yüklendi.",
  "data": {
    "resume_url": "https://cdn.youthside.com/youthside/candidates/UUID/resumes/5678_xyz.pdf",
    "completeness": {
      "percentage": 85,
      "is_eligible": true,
      "threshold": 75,
      "filled_fields": ["resume_url"],
      "missing_fields": []
    }
  }
}
```

---

## 10. Candidate Notes

Adaylar üzerine ekip içi not ekleme ve görüntüleme işlemleri.

### `GET /candidates/notes.php?candidate_id=UUID` 🔒

```txt
Adaya ait tüm notları kronolojik (yeni en üstte) olarak listeler.
```

#### Yanıt

```json
{
  "status": "success",
  "data": [
    {
      "id": "NOTE_UUID",
      "content": "Teknik mülakat olumlu geçti.",
      "is_system_log": false,
      "created_at": "2026-02-20 06:00:00",
      "author": {
        "id": "USER_UUID",
        "first_name": "Ahmet",
        "last_name": "Yılmaz",
        "avatar_url": "..."
      }
    }
  ]
}
```

### `POST /candidates/notes.php` 🔒

```txt
Aday için yeni bir not oluşturur.
```

#### İstek Body

```json
{
  "candidate_id": "CANDIDATE_UUID",
  "content": "Not içeriği buraya gelecek.",
  "application_id": "APP_UUID" // Opsiyonel: Notun hangi başvuru sırasında alındığı
}
```

### `PUT /candidates/notes.php` 🔒

```txt
Bir notu günceller. Sadece notun yazarı düzenleyebilir.
Sistem notları (`is_system_log = true`) düzenlenemez.
```

#### İstek Body

```json
{
  "id": "NOTE_UUID",
  "content": "Güncellenmiş not içeriği"
}
```

### `DELETE /candidates/notes.php` 🔒

```txt
Bir notu siler. Sadece notun yazarı silebilir.
Sistem notları (`is_system_log = true`) silinemez.
```

#### İstek Body

```json
{
  "id": "NOTE_UUID"
}
```

---

## 11. Events

### `GET /events/list` 🌐 _(Güncellendi)_

```txt
Vitrin etkinlik kartları (ana sayfa, /etkinlikler, şirket/kulüp profili). Herkese açık, 60 sn önbellekli.
Yalnızca YAYINDA etkinlikler döner; "status" parametresi YOK SAYILIR (panel: /events/my-list).
Sıralama: sabitlenmiş (pin) etkinlikler önce, sonra seçilen sıralama.
```

| Parametre | Varsayılan | Açıklama |
| :--- | :--- | :--- |
| `q` | – | Başlık, açıklama, konum veya şirket/kulüp adında arama |
| `company_id` | – | Şirket/kulüp ID'si |
| `type` | – | Etkinlik tipi; tek değer veya dizi (`type[]=Webinar&type[]=Zirve`) |
| `location_type` | – | `Online`, `Fiziksel`, `Hibrit`; tek değer veya dizi |
| `cities` | – | Şehir listesi (virgüllü veya dizi). `Online` değeri online etkinlikleri seçer. Herhangi biri eşleşirse (OR) |
| `active` | – | `1` → bitmemiş etkinlikler (`end_date` boş veya gelecekte). Profil "etkinlikler" sekmesi için |
| `upcoming` | – | `true` → başlangıcı gelecekte olanlar |
| `start_date_min` / `start_date_max` | – | Başlangıç tarihi aralığı (`YYYY-MM-DD[ HH:MM:SS]`) |
| `end_date_min` / `end_date_max` | – | Bitiş tarihi aralığı (`end_date_min` bitişi boş etkinlikleri hariç tutar; bunlar için `active=1`) |
| `quota_min` / `quota_max` | – | Kontenjan aralığı (`quota_max=1000` → üst sınırsız) |
| `sort` | `start_date` | `start_date`, `created_at`, `updated_at`, `title`, `view_count`, `quota` |
| `dir` | **`ASC`** | `ASC` / `DESC` |
| `pin_context` | `VITRIN` | `VITRIN` / `PANEL` |
| `limit` / `offset` | **`10`** / `0` | `limit` en fazla 100 |

```bash
curl -G "https://api.youthside.co/api/events/list" \
  --data-urlencode "cities=İstanbul,Online" \
  --data-urlencode "active=1" \
  --data-urlencode "limit=12"
```

#### Yanıt (200)

```json
{
  "status": "success",
  "data": {
    "data": [
      {
        "id": "UUID",
        "company_id": "UUID",
        "title": "Kariyer Zirvesi",
        "slug": "kariyer-zirvesi",
        "description": "<p>…</p>",
        "type": "Zirve",
        "status": "YAYINDA",
        "start_date": "2026-11-05 10:00:00",
        "end_date": "2026-11-05 17:00:00",
        "location_type": "Fiziksel",
        "location": "…",
        "city": "İstanbul",
        "quota": 300,
        "image_url": "https://…",
        "view_count": 120,
        "is_pinned": false,
        "pin_order": null,
        "company": { "id": "UUID", "name": "Öğrenci Kariyeri", "slug": "ogrenci-kariyeri", "logo_url": "https://…" }
      }
    ],
    "meta": { "total": 2, "limit": 12, "offset": 0, "page": 1, "pageSize": 12, "totalCount": 2, "totalPages": 1 }
  }
}
```

> Kayıtlar `events` tablosunun tüm kolonlarını (`e.*`) içerir; kart için `company{}` eklenmiştir.

### `GET /events/get` 🌐

```txt
Tek etkinliğin detayı (vitrin etkinlik sayfası + panel). ?id=UUID veya ?slug=… ile.
YAYINDA olmayan etkinlikler yalnızca sahibi şirketin token'ıyla görülür (diğerlerine 404).
Etkinlik slug'ı global benzersizdir — vitrin URL'sindeki şirket slug'ı ile company.slug karşılaştırılmalıdır.
```

Yanıt alanları (`data`):

- `events` tablosunun tüm kolonları (`title, slug, description (HTML), type, status, start_date, end_date, location_type, location, city, location_link, quota, image_url, external_application_url, view_count, …`)
- `company{id, name, slug, logo_url}`
- `registration_count`, `remaining_quota` (`null` = sınırsız), `is_external_application` (bool)
- `program[]` — `{id, event_id, start_time, end_time, title, description, type, order_index, speakers[{id, name, role, image, linkedin, company_id, company{id, name, logo}}]}`
- `speakers[]` — `{…, image, linkedin, company{id, name, slug, logo, logo_url}}`
- `contracts[]` — kayıtta kabul edilmesi gereken aktif sözleşmeler

Hatalar: `400` id/slug yok, `404` bulunamadı veya yayında değil.

### `POST /events/view` 🌐 ✨ _(Yeni)_

```txt
Etkinlik detay sayfası görüntülenme sayacını artırır (jobs/view ile aynı kurallar).
Yalnızca YAYINDA etkinlikler; aynı IP aynı etkinliği saatte bir kez; IP başına dakikada 60 istek.
```

Gövde `{ "id": "EVENT_UUID" }` → `200 { "counted": true|false }`. Hatalar: `422` geçersiz UUID, `404`, `429`, `405`.

### `GET /events/my-list` 🔒

```txt
Şirketin kendi etkinliklerini listeler.
Gelişmiş filtreleme seçenekleri sunar.
```

| Parametre        | Örnek        | Açıklama                             |
| :--------------- | :----------- | :----------------------------------- |
| `status`         | `YAYINDA`    | Etkinlik durumu                      |
| `type`           | `Webinar`    | Etkinlik tipi                        |
| `location_type`  | `Online`     | Lokasyon tipi (`Online`, `Fiziksel`) |
| `start_date_min` | `2026-01-01` | Başlangıç tarihi (Bu tarihten sonra) |
| `start_date_max` | `2026-12-31` | Başlangıç tarihi (Bu tarihten önce)  |
| `quota_min`      | `100`        | Kota alt sınırı                      |
| `quota_max`      | `500`        | Kota üst sınırı                      |
| `q`              | `python`     | Arama (başlık, açıklama, konum, şirket adı) |
| `end_date_min` / `end_date_max` | | Bitiş tarihi aralığı |
| `active`         | `1`          | Bitmemiş etkinlikler                 |
| `cities`         | `İstanbul,Online` | Şehir listesi                   |
| `limit`          | `20`         | Sayfa başı kayıt                     |
| `sort`           | `start_date` | Sıralama sütunu                      |
| `dir`            | `ASC`        | Sıralama yönü                        |

```bash
curl -X GET "http://api.youthside.co/api/events/my-list?limit=20&status=YAYINDA&type=Webinar" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}"
```

### `POST /events/create` 🔒

```txt
Yeni etkinlik oluşturur.
Kariyer fuarı, webinar, zirve gibi etkinlikler.
```

```bash
curl -X POST "http://api.youthside.co/api/events/create" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Kariyer Zirvesi 2026",
    "slug": "kariyer-zirvesi-2026",
    "description": "Gençler için kariyer fırsatları...",
    "type": "Zirve",
    "start_date": "2026-03-15 10:00:00",
    "end_date": "2026-03-15 18:00:00",
    "location_type": "Fiziksel",
    "location": "İstanbul Kongre Merkezi",
    "quota": 500
  }'
```

### `POST /events/update?id=UUID` 🔒

```txt
Mevcut etkinliği günceller.
status: YAYINDA, TASLAK değiştirilebilir.
```

```bash
curl -X POST "http://api.youthside.co/api/events/update?id=EVENT_UUID" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Güncellenmiş Etkinlik Adı",
  }'
```

### `GET /events/stats/summary` 🔒

```txt
Etkinlik için özet istatistikleri (Bugün, Dün, Hafta, Ay) getirir.
```

| Parametre  | Zorunlu | Açıklama    |
| :--------- | :------ | :---------- |
| `event_id` | ✅ Evet | Etkinlik ID |

```bash
curl -X GET "http://api.youthside.co/api/events/stats/summary?event_id=EVENT_UUID" \
  -H "Authorization: Bearer {{Token}}"
```

```json
{
  "total": 150,
  "today": 12,
  "yesterday": 5,
  "week": 45,
  "month": 120
}
```

### `GET /events/stats/chart` 🔒

```txt
Son X günün günlük başvuru sayılarını getirir.
Grafik çizimi için optimize edilmiştir.
```

| Parametre  | Varsayılan | Açıklama    |
| :--------- | :--------- | :---------- |
| `event_id` | ✅         | Etkinlik ID |
| `days`     | `7`        | Gün sayısı  |

```bash
curl -X GET "http://api.youthside.co/api/events/stats/chart?event_id=EVENT_UUID&days=7" \
  -H "Authorization: Bearer {{Token}}"
```

```json
[
  { "date": "2024-02-01", "name": "Per", "value": 15 },
  { "date": "2024-02-02", "name": "Cum", "value": 24 }
]
```

### `GET /events/stats/demographics` 🔒

```txt
Katılımcıların demografik dağılımını (Üniversite, Bölüm, Sınıf, Cinsiyet) getirir.
En çok katılım sağlayan ilk 5 veriyi döner.
```

| Parametre  | Zorunlu | Açıklama    |
| :--------- | :------ | :---------- |
| `event_id` | ✅ Evet | Etkinlik ID |

```bash
curl -X GET "http://api.youthside.co/api/events/stats/demographics?event_id=EVENT_UUID" \
  -H "Authorization: Bearer {{Token}}"
```

```json
{
  "universities": [
    { "name": "ODTÜ", "count": 45, "percent": 30.5 },
    { "name": "İTÜ", "count": 30, "percent": 20.0 }
  ],
  "departments": [...],
  "grades": [...],
  "gender": [...]
}
```

### `POST|DELETE /events/delete?id=UUID` 🔒

Yetki: `event.manage`; etkinlik aynı şirkete ait olmalı. Yanıt `200` `"Etkinlik silindi."`; `400` id yok, `404` bulunamadı/yetki yok.

### `POST /events/pin` / `POST /events/pin-reorder` 🔒

```txt
Yetki: event.pin.manage. jobs/pin ve jobs/pin-reorder ile aynı sözleşme; alan adları event_id / event_ids.
pin_context: PANEL (varsayılan) | VITRIN (herkese açık site sıralaması — events/list'i etkiler).
```

```json
{ "event_id": "UUID", "pinned": true, "pin_context": "VITRIN" }
{ "event_ids": ["UUID-1", "UUID-2"], "pin_context": "VITRIN" }
```

---

## 12. Registrations

### `GET /registrations/my-events` 🔒 ✨ _(Yeni)_

```txt
Adayın kayıt olduğu (IPTAL edilmemiş) etkinlikleri detaylarıyla birlikte sayfalı olarak listeler.
Bu endpoint yalnızca adayın kendi JWT token'ıyla (candidate rolüyle) erişilebilir.
```

| Parametre | Tip    | Zorunlu | Açıklama                                                       |
| :-------- | :----- | :------ | :------------------------------------------------------------- |
| `limit`   | Int    | Hayır   | Listelenecek kayıt sayısı. Varsayılan: 20                      |
| `offset`  | Int    | Hayır   | Atlanacak kayıt sayısı. Varsayılan: 0                          |
| `sort`    | String | Hayır   | Sıralama yapılacak alan. Varsayılan: `e.start_date`            |
| `dir`     | String | Hayır   | Sıralama yönü (ASC / DESC). Varsayılan: ASC (yaklaşanlar önce) |
| `q`       | String | Hayır   | Etkinlik başlığı / şirket adında arama                          |

Kayıtlarda ayrıca `event_status` ve `company_id` alanları döner.

**Örnek:**

```bash
curl -X GET "http://localhost/youthside_ats/public/api/registrations/my-events?limit=10&dir=ASC" \
  -H "Authorization: Bearer {{Token}}"
```

#### Yanıt (200 - Başarılı)

```json
{
  "status": "success",
  "code": 200,
  "message": "Kayıtlı olduğunuz etkinlikler başarıyla listelendi.",
  "data": {
    "events": [
      {
        "registration_id": "UUID",
        "registration_status": "KAYITLI",
        "registered_at": "2024-03-10 14:00:00",
        "event_id": "UUID",
        "event_title": "Java Eğitimi",
        "event_slug": "java-egitimi",
        "cover_image_url": "https://...",
        "event_type": "Eğitim",
        "start_date": "2024-04-10 10:00",
        "company_name": "Tech Corp",
        "company_logo": "https://..."
      }
    ],
    "pagination": {
      "total": 3,
      "limit": 10,
      "offset": 0
    }
  }
}
```

### `GET /registrations/list?event_id=UUID` 🔒

```txt
Etkinliğe kayıtlı katılımcıları listeler.
status ile filtreleme yapılabilir.
```

| Parametre  | Zorunlu | Açıklama                                                   |
| :--------- | :------ | :--------------------------------------------------------- |
| `event_id` | ✅ Evet | Katılımcıların listeleneceği etkinliğin ID'si              |
| `status`   | Hayır   | Katılım durumu: `KAYITLI`, `KATILDI`, `KATILMADI`, `IPTAL` |
| `q`        | Hayır   | Ad, soyad, e-posta veya telefonda arama                    |

```bash
curl -X GET "http://api.youthside.co/api/registrations/list?event_id=EVENT_UUID" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}"
```

### `GET /registrations/check?event_id=UUID` 🔒

```txt
Adayın belirtilen etkinliğe kayıtlı olup olmadığını kontrol eder.
Kimlik tespiti JWT üzerinden yapılır.
```

```bash
curl -X GET "http://api.youthside.co/api/registrations/check?event_id=EVENT_UUID" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}"
```

#### Başarılı Durum (200 OK)

```json
{
  "status": "success",
  "code": 200,
  "message": "Sorgulama başarılı.",
  "data": {
    "is_registered": true
  },
  "timestamp": 1709428512
}
```

### `POST /registrations/create` 🔒

```txt
Etkinliğe yeni katılımcı kaydı oluşturur.
Aday "Katıl" butonuyla kaydolur.
Önemli: Adayın kimliği (candidate_id) Authorization Bearer (JWT) token üzerinden güvenli okunur.
```

```bash
curl -X POST "https://api.youthside.co/api/registrations/create" \
  -H "Authorization: Bearer {{CANDIDATE_JWT}}" \
  -H "Content-Type: application/json" \
  -d '{"event_id": "EVENT_UUID", "accepted_contracts": ["CONTRACT_UUID"]}'
```

| Alan | Zorunlu | Açıklama |
| :--- | :--- | :--- |
| `event_id` | ✅ | Etkinlik UUID |
| `accepted_contracts` | Zorunlu sözleşme varsa ✅ | Kabul edilen sözleşme ID'leri (`GET /contracts/public-list?type=event` veya `events/get` → `contracts`) |

Yanıt: `201` `{ "id": "REGISTRATION_UUID" }`.

| Kod | Durum |
| :--- | :--- |
| 400 | Etkinlik YAYINDA değil / **etkinlik sona ermiş** (`end_date` geçmiş) / kontenjan dolu / geçersiz sözleşme ID'si |
| 404 | Etkinlik yok |
| 409 | Zaten kayıtlı |
| 422 | Zorunlu sözleşme eksik → `contracts: [...]` |

### `POST /registrations/quick-register` 🌐 ✨ _(Yeni)_

```txt
Açık form etkinlik kaydı — JWT gerektirmez (Public endpoint).
Client tarafından gönderilen form verileriyle (Ad, Soyad, E-posta, Telefon, Üniversite, Bölüm, Sınıf)
tek istek ile otomatik hesap oluşturma + etkinlik kaydı gerçekleştirir.

İş Akışı:
  1. E-posta ile mevcut aday aranır
  2. Yoksa → candidates tablosuna yeni kayıt (password_hash=NULL, auth_provider='public_form')
  3. Varsa → Sadece NULL olan alanlar güncellenir (mevcut veri ezilmez)
  4. Etkinliğin zorunlu sözleşmeleri varsa accepted_contracts kontrol edilir, kabuller kaydedilir
  5. event_registrations tablosuna kayıt oluşturulur
  6. Tümü tek transaction içinde atomik olarak çalışır

Not: Yeni oluşturulan hesabın şifresi yoktur ve e-postası doğrulanmamıştır. Aday giriş yapmak için
e-postasını doğrulamalı (resend-verification) ve forgot-password (type: candidate) ile şifre belirlemelidir.

Güvenlik:
  - Rate Limit: IP başına 60 saniyede max 10 istek (429 döner; IP = CF-Connecting-IP / REMOTE_ADDR)
  - Honeypot: _hp_field dolu gelirse bot olarak işaretlenir
  - Kontenjan: SELECT ... FOR UPDATE ile race condition önlenir
  - SQL Injection: Tüm sorgular prepared statement
```

| Parametre    | Tip    | Zorunlu | Açıklama                                                   |
| :----------- | :----- | :------ | :--------------------------------------------------------- |
| `event_id`   | String | ✅ Evet | Kayıt olunacak etkinliğin UUID'si                          |
| `first_name` | String | ✅ Evet | Adayın adı (2-100 karakter)                                |
| `last_name`  | String | ✅ Evet | Adayın soyadı (2-100 karakter)                             |
| `email`      | String | ✅ Evet | Adayın e-posta adresi (RFC formatı, max 255)               |
| `phone`      | String | Hayır   | Telefon numarası (E.164 formatına normalize edilir, max 50) |
| `university` | String | Hayır   | Üniversite adı (max 255)                                   |
| `department` | String | Hayır   | Bölüm adı (max 255)                                       |
| `grade`      | String | Hayır   | Sınıf bilgisi (max 50)                                     |
| `accepted_contracts` | Array | Zorunlu sözleşme varsa ✅ | Kabul edilen sözleşme ID'leri |
| `_hp_field`  | String | Hayır   | Honeypot alanı — Bot koruması, daima boş gönderilmeli. Doluysa sahte 201 döner (`event_title` olmadan) |

**Örnek:**

```bash
curl -X POST "http://api.youthside.co/api/registrations/quick-register" \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "EVENT_UUID",
    "first_name": "Ferhat",
    "last_name": "Cengiz",
    "email": "ferhat@example.com",
    "phone": "05321234567",
    "university": "İstanbul Teknik Üniversitesi",
    "department": "Bilgisayar Mühendisliği",
    "grade": "3. Sınıf"
  }'
```

#### Yanıt (201 - Başarılı)

```json
{
  "status": "success",
  "code": 201,
  "message": "Etkinlik kaydınız başarıyla oluşturuldu.",
  "data": {
    "registration_id": "abc123-def456-...",
    "candidate_id": "ghi789-jkl012-...",
    "is_new_account": true,
    "event_title": "YouthSide Tech Summit 2026"
  },
  "timestamp": 1722866400
}
```

#### Hata Durumları

| HTTP Kodu | Durum              | Mesaj                                                                |
| :-------- | :----------------- | :------------------------------------------------------------------- |
| `400`     | Etkinlik kapalı    | `Bu etkinlik şu anda kayıtlara kapalı.`                             |
| `400`     | Etkinlik bitmiş    | `Bu etkinlik sona erdi, kayıt alınmıyor.`                            |
| `400`     | Geçersiz sözleşme  | `Geçersiz sözleşme ID tespit edildi.`                                |
| `422`     | Sözleşme eksik     | `contracts: [...]` — kabul edilmesi gereken zorunlu sözleşmeler      |
| `400`     | Kontenjan dolu     | `Etkinlik kontenjanı dolmuştur.`                                     |
| `404`     | Etkinlik yok       | `Etkinlik bulunamadı.`                                               |
| `409`     | Mükerrer kayıt     | `Bu etkinliğe zaten kayıtlısınız.`                                   |
| `422`     | Validasyon hatası  | `Lütfen girilen bilgileri kontrol ediniz.` + alan bazlı hata detayı  |
| `429`     | Rate limit aşıldı  | `Çok fazla istek gönderildi. Lütfen bir süre bekleyip tekrar deneyin.` |

### `POST /registrations/update-status` 🔒

```txt
Katılımcının durumunu günceller.
Etkinlik sonrası yoklama için kullanılır.
```

```bash
curl -X POST "http://api.youthside.co/api/registrations/update-status" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "registration_id": "REGISTRATION_UUID",
    "status": "KATILDI"
  }'
```

---

## 🔑 JWT Token Yapısı

Access token HS256 imzalıdır, 900 sn geçerlidir. Payload:

```json
{
  "iss": "…", "aud": "…", "iat": 1791796781, "nbf": 1791796781, "exp": 1791797681,
  "id": "user-uuid",
  "email": "user@company.com",
  "name": "Ad Soyad",
  "scope": "company",
  "role": ["OWNER"],
  "context": {
    "company_id": "company-uuid",
    "company_slug": "sirket",
    "company_name": "Şirket",
    "company_logo": "https://…",
    "company_type": "company",
    "permissions": ["company.update", "team.manage", "job.manage", "…"]
  }
}
```

| `scope` | `role` | `context` |
| :--- | :--- | :--- |
| `company` | `OWNER`, `ADMIN`, `JOB_MANAGER`, `EVENT_MANAGER` | yukarıdaki gibi (`company_type` yalnızca arayüz görünürlüğü içindir) |
| `candidate` | `["CANDIDATE"]` | `{ university, department, grade }` |
| `admin` | admin rolleri | `{ permissions[] }` |

> `company_id` payload kökünde değil **`context.company_id`** altındadır.

---

## 13. Storage (CDN)

Dosya yükleme, listeleme ve silme işlemleri için rclone tabanlı CDN API'si.

> **CDN Base URL:** `https://youthsidecdn.doracdn.com`  
> **Klasör Yapısı:** `youthside/companies/{company-slug}/{category}/`

### `POST /storage/upload` 🔒

Şirket dosyasını CDN'e yükler.

**Headers:**

```
Authorization: Bearer {TOKEN}
Content-Type: multipart/form-data
```

**Form Data:**
| Alan | Tip | Zorunlu | Açıklama |
|------------|--------|---------|---------------------------------------------|
| `file` | file | ✅ | Yüklenecek dosya |

### 1. Upload File

**Endpoint:** `POST /api/storage/upload.php`
**Content-Type:** `multipart/form-data`

**Parameters:**

- `file` (File, Required): Yüklenecek dosya
- `category` (String, Optional): Dosya kategorisi (Default: `documents`)
  - Şirket için: `logos`, `covers`, `culture`, `jobs`, `events`, `documents`
  - Aday için (future): `resumes`, `certificates`, `portfolios`
- `async` (Boolean, Optional): `true` gönderilirse asenkron yükleme başlar. (Default: `false`)

**Response (Sync - Default):**

```json
{
  "status": "success",
  "data": {
    "cdn_url": "https://cdn.youthside.com/youthside/companies/slug/logos/file.jpg",
    "file_name": "1738745_random.jpg",
    "category": "logos"
  },
  "message": "Dosya başarıyla yüklendi."
}
```

**Response (Async - Büyük Dosyalar İçin):**

```json
{
  "status": "success",
  "data": {
    "job_id": 123,
    "group_id": "upload_67a4...",
    "file_name": "1738745_random.mp4",
    "status": "pending",
    "message": "Dosya yükleme arka planda başlatıldı. İlerlemeyi /api/storage/progress?group_id=...&job_id=... adresinden takip edebilirsiniz."
  },
  "message": "Yükleme başlatıldı."
}
```

### 2. Check Upload Progress

**Endpoint:** `GET /api/storage/progress.php`

**Parameters:**

- `group_id` (String, Required): Upload yanıtından dönen grup ID.
- `job_id` (Integer, Optional): Upload yanıtından dönen job ID.  
  - Not: Bazı rclone senaryolarında `group_id` metrikleri boş kalabilir; bu durumda `job_id` fallback olarak kullanılır.

**Response:**

```json
{
  "status": "success",
  "data": {
    "status": "transferring",
    "percentage": 45,
    "speed": 1048576, // bytes per second
    "eta": 120, // seconds
    "bytes": 52428800,
    "size": 116500000,
    "name": "video.mp4"
  }
}
```

### 3. List Files

**Endpoint:** `GET /api/storage/list.php`
... 🔒

Şirketin CDN dosyalarını listeler.

**Query Params:**
| Parametre | Tip | Açıklama |
|------------|--------|---------------------------------|
| `category` | string | Opsiyonel kategori filtresi |

**Örnek:**

```bash
curl "http://api.youthside.co/api/storage/list?category=logos" \
  -H "Authorization: Bearer {TOKEN}"
```

---

### `DELETE /storage/delete` 🔒

CDN dosyasını siler. **Yetki:** Sadece `OWNER` ve `ADMIN`.

**Body:**

```json
{
  "cdn_url": "https://youthsidecdn.doracdn.com/youthside/companies/acme-corp/logos/file.png"
}
```

veya

```json
{
  "file_path": "youthside/companies/acme-corp/logos/file.png"
}
```

---

_🔒 işaretli endpointler `Authorization: Bearer TOKEN` header'ı gerektirir._

---

## 14. Smart Scoring (İlan Puanlama)

İş ilanlarına başvuru yapan adaylar, ilanda belirtilen kriterlere göre otomatik olarak puanlanır (0-100).

### Kriter Mantığı

İlan oluştururken veya güncellerken `criteria` parametresi gönderilir.

- **UNIVERSITY:** Adayın üniversitesi belirtilen listede varsa puan alır.
- **DEPARTMENT:** Adayın bölümü belirtilen listede varsa puan alır.
- **GRADE:** Adayın sınıfı belirtilen listede varsa puan alır.
- **weight:** Kriterin puanlamadaki ağırlığı (Varsayılan 1).

### `POST /jobs/create` (Kriterli Örnek)

```json
{
  "title": "Backend Developer",
  "criteria": [
    {
      "type": "UNIVERSITY",
      "values": ["ODTÜ", "İTÜ", "Boğaziçi"],
      "weight": 2
    },
    {
      "type": "DEPARTMENT",
      "values": ["Bilgisayar Mühendisliği", "Yazılım Mühendisliği"],
      "weight": 3
    },
    {
      "type": "GRADE",
      "values": ["4. Sınıf", "Mezun"],
      "weight": 1
    }
  ]
}
```

### Başvuru Sonucu (`auto_score`)

Bir aday başvurduğunda (`POST /applications/create`), sistem bu kriterleri kontrol eder ve `auto_score` hesaplar.

- Başvuru yanıtında `auto_score` bilgisi döner.
- İşveren panelindeki başvuru listesinde bu puan görüntülenir.

```bash
curl -X POST "http://api.youthside.co/api/jobs/create" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{

    "title": "Backend Developer",
    "slug": "backend-developer-adv",
    "description": "...",
    "type": "Tam Zamanlı",
    "work_model": "Uzaktan",
    "criteria": [
      {
        "type": "UNIVERSITY",
        "values": ["ODTÜ", "İTÜ"],
        "weight": 2
      },
      {
        "type": "DEPARTMENT",
        "values": ["Bilgisayar Mühendisliği"],
        "weight": 3
      }
    ]
  }'
```

## İller

```curl
http://api.youthside.co/api/locations/tr_cities.php
```

```json
{
  "status": "success",
  "code": 200,
  "message": "İşlem başarılı.",
  "data": [
    "Adana",
    "Adıyaman",
    "Afyon",
    "Ağrı",
    "Amasya",
    "Ankara",
    "Antalya",
    "Artvin",
    "Aydın",
    "Balıkesir",
    "Bilecik",
    "Bingöl",
    "Bitlis",
    "Bolu",
    "Burdur",
    "Bursa",
    "Çanakkale",
    "Çankırı",
    "Çorum",
    "Denizli",
    "Diyarbakır",
    "Edirne",
    "Elazığ",
    "Erzincan",
    "Erzurum",
    "Eskişehir",
    "Gaziantep",
    "Giresun",
    "Gümüşhane",
    "Hakkari",
    "Hatay",
    "Isparta",
    "Mersin",
    "İstanbul",
    "İzmir",
    "Kars",
    "Kastamonu",
    "Kayseri",
    "Kırklareli",
    "Kırşehir",
    "Kocaeli",
    "Konya",
    "Kütahya",
    "Malatya",
    "Manisa",
    "Kahramanmaraş",
    "Mardin",
    "Muğla",
    "Muş",
    "Nevşehir",
    "Niğde",
    "Ordu",
    "Rize",
    "Sakarya",
    "Samsun",
    "Siirt",
    "Sinop",
    "Sivas",
    "Tekirdağ",
    "Tokat",
    "Trabzon",
    "Tunceli",
    "Şanlıurfa",
    "Uşak",
    "Van",
    "Yozgat",
    "Zonguldak",
    "Aksaray",
    "Bayburt",
    "Karaman",
    "Kırıkkale",
    "Batman",
    "Şırnak",
    "Bartın",
    "Ardahan",
    "Iğdır",
    "Yalova",
    "Karabük",
    "Kilis",
    "Osmaniye",
    "Düzce"
  ],
  "timestamp": 1770730169
}
```

---

## 15. Contracts (Sözleşme Yönetimi)

> **Mimari Notu:** Şirketler hukuki süreçleri (KVKK, Mesafeli Satış, Açık Rıza Metni vb.) için birden fazla sözleşme tanımlayabilir. Her sözleşme ilan (`job`), etkinlik (`event`) veya her ikisi (`both`) için geçerli olabilir. Adaylar başvuru/kayıt sırasında zorunlu sözleşmeleri kabul etmeden işlem yapamaz. Kabul kayıtları IP adresi ve tarayıcı bilgisi ile birlikte hukuki kanıt olarak saklanır.

### `GET /contracts/list` 🔒

```txt
Şirketin tüm sözleşmelerini listeler (aktif + pasif).
Yönetim paneli için. Token'daki company_id otomatik kullanılır.
```

| Parametre | Tip    | Zorunlu | Açıklama                                          |
| :-------- | :----- | :------ | :------------------------------------------------ |
| `type`    | Enum   | Hayır   | Filtre: `job`, `event`, `both` (Boş ise hepsi)   |

```bash
curl -X GET "http://api.youthside.co/api/contracts/list?type=job" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}"
```

#### Yanıt (200)

```json
{
  "status": "success",
  "data": [
    {
      "id": "CONTRACT_UUID",
      "title": "KVKK Aydınlatma Metni",
      "type": "both",
      "file_url": "https://cdn.youthside.com/documents/kvkk.pdf",
      "is_required": true,
      "is_active": true,
      "created_at": "2026-03-18 12:00:00",
      "updated_at": "2026-03-18 12:00:00"
    }
  ]
}
```

### `POST /contracts/create` 🔒

```txt
Yeni sözleşme tanımlar.
PDF dosyası önceden /storage/upload (category: documents) ile yüklenmiş olmalıdır.
```

```bash
curl -X POST "http://api.youthside.co/api/contracts/create" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "KVKK Aydınlatma Metni",
    "type": "both",
    "file_url": "https://cdn.youthside.com/documents/kvkk.pdf",
    "is_required": true
  }'
```

| Parametre     | Tip     | Zorunlu | Açıklama                              |
| :------------ | :------ | :------ | :------------------------------------ |
| `title`       | String  | ✅ Evet | Sözleşme başlığı                      |
| `type`        | Enum    | ✅ Evet | `job`, `event` veya `both`            |
| `file_url`    | String  | ✅ Evet | CDN'deki PDF dosya URL'i              |
| `is_required` | Boolean | Hayır   | Kabul zorunlu mu? Varsayılan: `true`  |

#### Yanıt (201)

```json
{
  "status": "success",
  "code": 201,
  "message": "Sözleşme başarıyla oluşturuldu.",
  "data": { "id": "CONTRACT_UUID" }
}
```

### `POST /contracts/update?id=UUID` 🔒

```txt
Mevcut sözleşmeyi günceller.
Sadece şirkete ait sözleşmeler güncellenebilir (Whitelist yaklaşımı).
```

```bash
curl -X POST "http://api.youthside.co/api/contracts/update?id=CONTRACT_UUID" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Güncellenmiş KVKK Metni",
    "is_active": true
  }'
```

| Parametre     | Tip     | Zorunlu | Açıklama                       |
| :------------ | :------ | :------ | :----------------------------- |
| `title`       | String  | Hayır   | Yeni başlık                    |
| `type`        | Enum    | Hayır   | `job`, `event`, `both`         |
| `file_url`    | String  | Hayır   | Yeni PDF URL                   |
| `is_required` | Boolean | Hayır   | Zorunluluk                     |
| `is_active`   | Boolean | Hayır   | Aktif/Pasif                    |

### `POST /contracts/delete?id=UUID` 🔒

```txt
Sözleşmeyi siler (Soft-delete: is_active = 0).
Hukuki kayıtlar silinmez, sadece pasif yapılır.
```

```bash
curl -X POST "http://api.youthside.co/api/contracts/delete?id=CONTRACT_UUID" \
  -H "Authorization: Bearer {{YOUTHSIDE_KARIYER_JWT_TOKEN}}"
```

### `GET /contracts/public-list` 🌐

```txt
Adayların başvuru öncesi şirketin zorunlu sözleşmelerini görüntülemesi için.
Herkese açık endpoint. Başvuru formunda sözleşme checkbox'larını çizmek için kullanılır.
```

| Parametre    | Tip    | Zorunlu | Açıklama               |
| :----------- | :----- | :------ | :--------------------- |
| `company_id` | UUID   | ✅ Evet | Şirket ID              |
| `type`       | Enum   | ✅ Evet | `job` veya `event`     |

```bash
curl -X GET "http://api.youthside.co/api/contracts/public-list?company_id=COMPANY_UUID&type=job"
```

#### Yanıt (200)

```json
{
  "status": "success",
  "data": [
    {
      "id": "CONTRACT_UUID",
      "title": "KVKK Aydınlatma Metni",
      "type": "both",
      "file_url": "https://cdn.youthside.com/documents/kvkk.pdf",
      "is_required": true
    }
  ]
}
```

### Sözleşme Entegrasyonu — Başvuru ve Etkinlik Kaydı

> ⚠️ **Önemli:** `POST /applications/create` ve `POST /registrations/create` endpoint'leri artık `accepted_contracts` parametresini destekler. Şirketin zorunlu sözleşmeleri varsa, bu alan olmadan başvuru/kayıt **422** ile reddedilir.

#### Hata Yanıtı — Eksik Sözleşme (422)

```json
{
  "status": "error",
  "code": 422,
  "message": "Başvuru yapabilmek için tüm zorunlu sözleşmeleri kabul etmeniz gerekmektedir.",
  "contracts": [
    {
      "id": "CONTRACT_UUID",
      "title": "KVKK Aydınlatma Metni",
      "file_url": "https://cdn.youthside.com/documents/kvkk.pdf",
      "is_required": true
    }
  ]
}
```

#### İlan ve Etkinlik Detayında Sözleşmeler

`GET /jobs/get` ve `GET /events/get` endpoint'lerinin response'ları artık `contracts[]` dizisi içerir. Başvuru formunda bu sözleşmeleri göstermek için kullanılır.

```json
{
  "contracts": [
    {
      "id": "CONTRACT_UUID",
      "title": "KVKK Aydınlatma Metni",
      "type": "both",
      "file_url": "https://cdn.youthside.com/documents/kvkk.pdf",
      "is_required": true
    }
  ]
}
```

---

## 16. Static Data (Sabit Veriler)

> **Mimari Notu:** Sistemde kullanılan `ENUM` ve standart kategori bazlı seçenekleri Frontend tarafında tutarlı bir şekilde göstermek için `/api/data/` altındaki endpoint'ler kullanılır. Bu endpoint'lerin hepsi public'tir (yöntem kontrolü yapılmaz; `GET` kullanın). Yanıt formatı obje dizisi `[{"value": "Değer"}]` şeklindedir; istisna `universities`: `[{"id": 1, "value": "…"}]`.
>
> Vitrin filtre seçenekleri için şehir listesi: `GET /locations/tr_cities` (bkz. [İller](#iller)).

### `GET /data/job-types` 🌐

İlan çalışma tiplerini (Tam Zamanlı, Yarı Zamanlı vb.) getirir.

```bash
curl -X GET "http://api.youthside.co/api/data/job-types.php"
```

### `GET /data/departments` 🌐

İlan kategorilerini ve şirket departmanlarını (Bilgi Teknolojileri, İnsan Kaynakları vb.) getirir.

```bash
curl -X GET "http://api.youthside.co/api/data/departments.php"
```

### `GET /data/employee-count-ranges` 🌐

Şirketlerin çalışan sayısı seçeneklerini (1-10, 11-50 vb.) getirir.

```bash
curl -X GET "http://api.youthside.co/api/data/employee-count-ranges.php"
```

### `GET /data/work-models` 🌐

Çalışma modellerini (Ofis, Hibrit, Uzaktan) getirir.

```bash
curl -X GET "http://api.youthside.co/api/data/work-models.php"
```

### `GET /data/universities` 🌐

Türkiye'deki devlet ve vakıf üniversite isimlerini listeler. Yanıt `[{ "id": <int>, "value": "<AD>" }]` — `id`, kulüp kaydında `university_id` olarak kullanılır.

```bash
curl -X GET "http://api.youthside.co/api/data/universities.php"
```

### `GET /data/departmens` 🌐 (Üniversite Bölümleri)

*(Not: Bu dosya ismindeki harf eksiği geriye dönük uyumluluk nedeniyle korunmaktadır)*
Türkiye'deki önlisans ve lisans üniversite bölümlerini listeler.

```bash
curl -X GET "http://api.youthside.co/api/data/departmens.php"
```

### `GET /data/class` 🌐 (Sınıf)

Aday sınıf seçenekleri: `Hazırlık`, `1. Sınıf` … `4. Sınıf`, `Mezun`, `Yüksek Lisans`, `Doktora`, `Diğer`. `candidates/update` bu değerlerin hepsini kabul eder.

> `employee-count-ranges` listesinde örtüşen/tekrarlı değerler vardır (ör. `1-10` ve `2-10`, `501-1.000` ve `501-1000`); şirket kayıtlarında hangisi seçildiyse filtrede o değer kullanılmalıdır.

---

## 17. Pipeline Templates (Süreç Şablonları)

> **Mimari Notu:** Pipeline Template, şirketlerin tekrar kullanılabilir pipeline süreç şablonları oluşturmasını sağlar.
> Şablon oluşturulduktan sonra yeni ilanlara tek tıkla uygulanabilir. Aşamalar `stages` JSON kolonu olarak
> tutulur ve `apply` sırasında `pipelines` tablosuna INSERT edilir (append — mevcut pipeline'lar korunur).
> Audit trail olarak `created_by` ve `updated_by` alanları JWT'den otomatik doldurulur.

### `GET /pipeline-templates/list` 🔒

```txt
Şirketin tüm pipeline şablonlarını listeler.
Oluşturan ve en son güncelleyen kullanıcının adını içerir.
```

```bash
curl -X GET "http://api.youthside.co/api/pipeline-templates/list" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### Yanıt (200)

```json
{
  "status": "success",
  "data": [
    {
      "id": "UUID",
      "name": "Staj Alım Süreci",
      "description": "2026 stajyer alım süreci için standart akış",
      "stages": [
        { "name": "Başvuru", "color": "#2563eb", "type": "DEFAULT", "order_index": 0 },
        { "name": "Ön Görüşme", "color": "#475569", "type": "CUSTOM", "order_index": 1 }
      ],
      "stage_count": 2,
      "created_by": "USER_UUID",
      "created_by_name": "Ferhat Cengiz",
      "updated_by": null,
      "updated_by_name": null,
      "created_at": "2026-04-08 12:00:00",
      "updated_at": "2026-04-08 12:00:00"
    }
  ]
}
```

---

### `GET /pipeline-templates/get?id=UUID` 🔒

```txt
Tek bir pipeline şablonunun detayını döner.
Şirket izolasyonu uygulanır — başka şirketin şablonuna erişilemez.
```

```bash
curl -X GET "http://api.youthside.co/api/pipeline-templates/get?id=TEMPLATE_UUID" \
  -H "Authorization: Bearer {{TOKEN}}"
```

---

### `POST /pipeline-templates/create` 🔒

**Gerekli İzin:** `job.manage`

```txt
Yeni pipeline şablonu oluşturur.
created_by JWT'den otomatik alınır.
stages dizisi JSON olarak kaydedilir.
```

| Alan          | Tip      | Zorunlu | Açıklama                                                 |
| :------------ | :------- | :------ | :------------------------------------------------------- |
| `name`        | `string` | ✅ Evet | Şablon adı (Maks: 150 karakter)                          |
| `description` | `string` | ❌ Hayır | Kısa açıklama                                            |
| `stages`      | `array`  | ✅ Evet | Aşama dizisi. Her öğe: `{name, color?, type?}` formatında |

```bash
curl -X POST "http://api.youthside.co/api/pipeline-templates/create" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Staj Alım Süreci",
    "description": "Standart stajyer alım akışı",
    "stages": [
      { "name": "Başvuru", "color": "#2563eb", "type": "DEFAULT" },
      { "name": "Ön Görüşme", "color": "#475569" },
      { "name": "Teknik Mülakat", "color": "#4f46e5" },
      { "name": "Teklif", "color": "#059669" }
    ]
  }'
```

#### Yanıt (201)

```json
{
  "status": "success",
  "message": "Pipeline şablonu başarıyla oluşturuldu.",
  "data": {
    "id": "TEMPLATE_UUID"
  }
}
```

---

### `POST /pipeline-templates/update?id=UUID` 🔒

**Gerekli İzin:** `job.manage`

```txt
Var olan pipeline şablonunu günceller.
updated_by JWT'den otomatik set edilir.
Sadece gönderilen alanlar güncellenir (partial update).
```

```bash
curl -X POST "http://api.youthside.co/api/pipeline-templates/update?id=TEMPLATE_UUID" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Güncel Staj Süreci",
    "stages": [
      { "name": "Başvuru", "color": "#2563eb", "type": "DEFAULT" },
      { "name": "Envanter Testi", "color": "#0891b2" },
      { "name": "Teklif", "color": "#059669" }
    ]
  }'
```

---

### `POST /pipeline-templates/delete?id=UUID` 🔒

**Gerekli İzin:** `job.manage`

```txt
Pipeline şablonunu kalıcı olarak siler.
Daha önce uygulanmış ilanlardaki pipeline'lar ETKİLENMEZ.
(Şablondan pipelines'a kopyalama ile çalıştığı için FK bağımlılığı yoktur.)
```

```bash
curl -X POST "http://api.youthside.co/api/pipeline-templates/delete?id=TEMPLATE_UUID" \
  -H "Authorization: Bearer {{TOKEN}}"
```

---

### `POST /pipeline-templates/apply` 🔒

**Gerekli İzin:** `job.manage`

```txt
Seçilen şablondaki tüm aşamaları belirtilen ilana uygular.
Mevcut pipeline'lar korunur — şablon aşamaları SONUNA eklenir (append).
Bu sayede adayı olan pipeline'lar zarar görmez.
```

| Alan          | Tip      | Zorunlu | Açıklama       |
| :------------ | :------- | :------ | :------------- |
| `template_id` | `string` | ✅ Evet | Şablon UUID    |
| `job_id`      | `string` | ✅ Evet | Hedef İlan UUID |

```bash
curl -X POST "http://api.youthside.co/api/pipeline-templates/apply" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "TEMPLATE_UUID",
    "job_id": "JOB_UUID"
  }'
```

#### Yanıt (200)

```json
{
  "status": "success",
  "message": "Şablon ilana başarıyla uygulandı.",
  "data": {
    "applied_count": 4,
    "stages": [
      { "id": "NEW_PIPELINE_UUID_1", "name": "Başvuru", "color": "#2563eb", "order_index": 1 },
      { "id": "NEW_PIPELINE_UUID_2", "name": "Ön Görüşme", "color": "#475569", "order_index": 2 }
    ]
  }
}
```

---

### `POST /pipeline-templates/create-from-job` 🔒

**Gerekli İzin:** `job.manage`

```txt
Mevcut bir ilanın pipeline aşamalarını yeni şablon olarak kaydeder.
İlandaki pipeline'lar kopyalanır — referans tutulmaz.
İlandaki pipeline'lar değişse bile şablon etkilenmez.
```

| Alan          | Tip      | Zorunlu | Açıklama                              |
| :------------ | :------- | :------ | :------------------------------------ |
| `job_id`      | `string` | ✅ Evet | Kaynak İlan UUID                      |
| `name`        | `string` | ✅ Evet | Şablon adı (Maks: 150)               |
| `description` | `string` | ❌ Hayır | Kısa açıklama                         |

```bash
curl -X POST "http://api.youthside.co/api/pipeline-templates/create-from-job" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "JOB_UUID",
    "name": "2026 Yaz Stajımın Süreci",
    "description": "Anadolu Isuzu staj ilanından oluşturuldu"
  }'
```

#### Yanıt (201)

```json
{
  "status": "success",
  "message": "İlandan pipeline şablonu başarıyla oluşturuldu.",
  "data": {
    "id": "TEMPLATE_UUID",
    "stage_count": 5
  }
}
```

### `GET /pipeline-templates/system-defaults` 🔒

Herhangi bir geçerli token. Sistemin hazır süreç şablonlarını (salt okunur, şirkete ait değil) döner; şablon sihirbazında başlangıç önerisi olarak kullanılır. Hata: `500` şablon servisi hatası.

---

## 18. İletişim & Log (Communications)

Bu dizin, İK görevlilerinin adaylara gönderdiği mailleri ve SMS'leri (eğer varsa) tag tabanlı şekilde (rejection, invite vb.) performans odaklı olarak denetler. Tekrar eden/çift mailleri önlemek için kullanılır.

### `POST /mail/send` 🔒
**Yetki:** Auth + `mail.send` yeteneği (kulüpler `ENTITY_TYPE_FORBIDDEN` alır). Ayrıca rol izni aranmaz.

> ⚠️ Dosya `api/Mail/Send.php`'dir (büyük harf). Büyük/küçük harf duyarlı sunucuda `/mail/send` yolunun çalıştığı doğrulanmalı.
> Bu uç **standart zarfı kullanmaz**: yanıt `{ "success": bool, … }` biçimindedir; bazı doğrulama hataları (geçersiz JSON, eksik alan) HTTP 200 + `success: false` döner.

Tüm toplu maillerin (Pipeline değişikliği vs.) gönderildiği yer.

| Parametre  | Tipi    | Zorunlu | Açıklama |
| :-------   | :------ | :------ | :------- |
| `to`       | `array`   | ✅ Evet | Alıcı ID veya nesne listesi `[{email:"...", variables:{}}]` |
| `subject`  | `string`  | ✅ Evet | E-posta Başlığı |
| `content`  | `string`  | ✅ Evet | HTML İçerik |
| `job_id`   | `string`  | ✅ Evet | Hangi ilan kapsamında gönderiliyor |
| `tag`      | `string`  | ❌ Hayır | Loglama için Etiket (Örn: `PIPELINE_REJECTION`). Gelirse loglanır. |
| `attachments` | `array` | ❌ Hayır | Base64 doc/pdf ekleri |
| `reply_to` | `object` | ❌ Hayır | Bu gönderime özel yanıt adresi seçimi. Bkz. [Bölüm 20](#20-yanıt-adresleri-reply-to). |

#### `reply_to` — yanıt adresi (opsiyonel)

```jsonc
{ "mode": "none" | "self" | "custom", "address_id": "ADDRESS_UUID | null" }
```

- `none` → `Reply-To` başlığı **hiç eklenmez** ("Yanıtsız")
- `self` → gönderen kullanıcının kendi e-postası
- `custom` → `address_id` zorunlu; şirketin kayıtlı adres defterinden bir adres

**Alan hiç gönderilmezse** sunucu şu sırayla kendisi çözer:
kişisel tercih → şirket varsayılanı → gönderenin kendi adresi (eski davranış).
Şirket `allow_user_override = false` demişse gönderim-anı seçimi **yok sayılır**.

> 🔒 **Güvenlik:** İstemci **asla ham e-posta göndermez** — yalnızca mod + kayıtlı `address_id`.
> Adres, şirket sahipliği doğrulanarak DB'den çözülür. Sahipsiz, başka şirkete ait, silinmiş
> veya pasif bir `address_id` **400** ile reddedilir (sessizce varsayılana düşülmez).

| Hata (400) | Sebep |
| :--------- | :---- |
| `Geçersiz yanıt adresi modu.` | `mode` üç değerden biri değil |
| `Özel yanıt adresi için bir adres seçilmelidir.` | `mode=custom` ama `address_id` yok |
| `Seçtiğiniz yanıt adresi artık kayıtlı değil.` | Adres silinmiş ya da başka şirkete ait |
| `Seçtiğiniz yanıt adresi pasif durumda.` | Adres `is_active = false` |

```bash
curl -X POST "http://api.youthside.co/api/mail/send" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "to": [{"email": "aday@example.com", "variables": { "candidate.firstName": "Ayşe" }}],
    "subject": "Başvurunuz...",
    "content": "...",
    "job_id": "JOB_UUID",
    "tag": "PIPELINE_REJECTION",
    "reply_to": { "mode": "custom", "address_id": "ADDRESS_UUID" }
  }'
```

#### Yanıtlar

- **≤ 50 alıcı (senkron, 200):** `{ "success": true, "total": 3, "sent": 3, "results": [ … ] }`
- **> 50 alıcı (kuyruk, 202):** `{ "success": true, "queued": true, "mail_job_id": 42, "total": 350, "message": "350 alıcı kuyruğa alındı…" }` → ilerleme için `GET /mail/job-status?id=42`
- Hatalar: `401` token; `403` ilan şirkete ait değil veya alıcılar bu ilana başvurmamış; `422` çözümlenemeyen şablon değişkeni; `405` yöntem.

> ℹ️ **Toplu gönderim (>50 alıcı):** Çözümlenen adres **enqueue anında** `company_mail_jobs.reply_to`
> sütununa literal olarak yazılır. Adres sonradan silinse bile uçuştaki iş etkilenmez — mail o adresle
> yetkilendirilmiştir.

---

### `POST /mail/check-duplicates` 🔒

`cap:mail.send`. Göndermeden önce aynı `tag` ile daha önce mail almış alıcıları bulur.

```json
{ "job_id": "UUID", "tag": "PIPELINE_REJECTION", "recipients": [{ "id": "…" }, { "candidate_id": "…" }, { "external_candidate_id": "…" }] }
```

Yanıt: `{ "total_checked", "duplicate_count", "duplicate_candidate_ids": [] }`. Hatalar: `422` job_id/tag yok veya alıcı listesi geçersiz, `403`.

### `GET /mail/job-status?id=<int>` 🔒

`cap:mail.send`. Kuyruktaki toplu gönderimin durumu: `{ id, status, total_count, sent_count, failed_count, progress, queued_at, started_at, finished_at }`. Hatalar: `422` id yok, `404` bulunamadı/başka şirketin.

### `GET /mail/jobs` 🔒

`cap:mail.send`. Şirketin son 12 toplu mail işi: `{ jobs: [{ id, job_id, job_title, status, …, progress, tag }], active_count }`.

### `GET /mail/search-recipients` 🔒

`cap:mail.send`. Mail alıcısı arama. `q` (en az 2 karakter, aksi halde `[]`), `job_id` (zorunlu), `limit` (varsayılan 15, en fazla 30).
Yanıt: `[{ id, email, fullName, type: "REGISTERED" | "EXTERNAL", variables: {} }]`. Hatalar: `400` job_id yok, `403` ilan şirkete ait değil.

---

### `POST /communications/bulk-tag-check` 🔒
Milyonlarca kayıt içinden seçili adayların daha önce `tag` bilgisini alıp almadığını kontrol ederek frontend'in çifte gönderimi uyarmasını/engellemesini sağlar.

| Parametre       | Tipi     | Zorunlu | Açıklama                     |
| :-------------- | :------- | :------ | :--------------------------- |
| `candidate_ids` | `array`  | ✅ Evet | Seçili Aday UUID Listesi      |
| `job_id`        | `string` | ✅ Evet | Sorgulanan İlan UUID          |
| `tag`           | `string` | ✅ Evet | Aranan Etiket (Örn: `REJECTION`) |

```bash
curl -X POST "http://api.youthside.co/api/communications/bulk-tag-check" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -d '{
    "candidate_ids": ["uuid_1", "uuid_2"],
    "job_id": "job_uuid",
    "tag": "PIPELINE_REJECTION"
  }'
```

#### Yanıt (200)
```json
{
  "status": "success",
  "data": {
    "already_tagged_count": 1,
    "already_tagged_candidates": ["uuid_1"]
  }
}
```

---

### `GET /communications/candidate-logs` 🔒
İlgili adayın ilan kapsamında İK tarafından gönderilmiş işlem geçmişi (Timeline).

| Query           | Tipi     | Zorunlu | Açıklama     |
| :-------------- | :------- | :------ | :----------- |
| `candidate_id`  | `string` | ✅ Evet | Aday UUID    |
| `job_id`        | `string` | ❌ Hayır | Opsiyonel filtre |

```bash
curl -X GET "http://api.youthside.co/api/communications/candidate-logs?candidate_id=UUID&job_id=UUID" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### Yanıt (200)
```json
{
  "status": "success",
  "data": {
    "total": 1,
    "logs": [
      {
        "channel": "EMAIL",
        "tag": "PIPELINE_REJECTION",
        "sent_by": "admin_uuid",
        "created_at": "2026-04-13 13:40:00"
      }
    ]
  }
}
```

---

## 19. Mail Templates (Şirket Bazlı)

Şirketlerin kendi e-posta şablonlarını oluşturup düzenlemesi ve silmesi için servisler.

**İzin Notu:**
- `GET /mail-templates/list.php` ve `GET /mail-templates/get.php`: Auth yeterlidir (şirket izolasyonu uygulanır).
- `POST /mail-templates/create.php`, `update.php`, `delete.php`: `team.manage` gerektirir.

### `GET /mail-templates/list.php` 🔒

```txt
Şirkete ait tüm mail şablonlarını listeler.
```

#### Yanıt (200)

```json
{
  "status": "success",
  "data": [
    {
      "id": "TEMPLATE_UUID",
      "company_id": "COMPANY_UUID",
      "name": "Olumsuz - Genel",
      "category": "Değerlendirme",
      "subject": "Başvurunuz hakkında",
      "body": "<p>Merhaba {{candidate.fullName}}</p>",
      "custom_tokens": ["custom.managerName", "custom.programName"],
      "is_active": 1,
      "created_at": "2026-04-21 10:00:00",
      "updated_at": "2026-04-21 10:00:00"
    }
  ]
}
```

### `GET /mail-templates/get.php?id=UUID` 🔒

```txt
Tek bir mail şablonunun detayını döner.
```

### `POST /mail-templates/create.php` 🔒

```txt
Şirkete yeni mail şablonu oluşturur.
```

#### İstek Body

```json
{
  "name": "Mülakat Daveti",
  "category": "Mülakat",
  "subject": "Mülakat Daveti: {{job.title}}",
  "body": "<p>Merhaba {{candidate.firstName}}</p>",
  "custom_tokens": ["custom.meetingUrl"],
  "is_active": true
}
```

### `POST /mail-templates/update.php?id=UUID` 🔒

```txt
Var olan mail şablonunu günceller.
```

#### İstek Body (örnek)

```json
{
  "name": "Mülakat Daveti (v2)",
  "subject": "Mülakat Daveti - Güncel",
  "custom_tokens": ["custom.meetingUrl", "custom.meetingDate"],
  "is_active": true
}
```

### `POST /mail-templates/delete.php?id=UUID` 🔒

```txt
Mail şablonunu kalıcı olarak siler (hard delete).
Sadece aynı şirkete ait kayıt silinebilir.
```

---

## 20. Yanıt Adresleri (Reply-To)

Aday bir maili yanıtladığında cevabın gideceği adresi (`Reply-To` başlığı) yönetir.

**Neden var:** Önceden bu başlık sunucuda **sessizce oturum açan kullanıcının e-postası** yapılıyordu ve kapatılamıyordu. Firmalar adayların kişisel gelen kutularına yanıt yazmasını istemiyor.

> ℹ️ **`From` başlığı bu uçlarla değişmez.** Gönderen adres doğrulanmış domaine bağlıdır (`noreply@<doğrulanmış-domain>`). Burada yalnızca **yanıtların nereye düşeceği** belirlenir. `Reply-To` SPF/DKIM ile doğrulanmadığı için adrese **onay maili gönderilmez**; yazma anında yalnızca biçim + CRLF (başlık enjeksiyonu) kontrolü yapılır.

### Modlar

| Mod | Davranış |
| :--- | :------- |
| `none` | `Reply-To` başlığı **hiç eklenmez** ("Yanıtsız") |
| `self` | Gönderen kullanıcının kendi e-postası (eski davranış) |
| `custom` | Şirketin adres defterinden seçilen adres |
| `inherit` | *(yalnız `scope=user`)* Kişisel tercihi **siler** = "şirket varsayılanını kullan" |

### Çözümleme önceliği

```
gönderim-anı seçimi (/mail/send reply_to)
  → kullanıcı tercihi
    → şirket varsayılanı
      → gönderenin kendi adresi   (hiç tercih yoksa; eski davranış)
```

Şirket `allow_user_override = false` demişse ilk iki adım **atlanır** ve arayüzdeki seçim kilitlenir (`locked: true`).

**Bayat referans davranışı:** Bir adres silinir ya da pasifleştirilirse ona işaret eden **kayıtlı tercihler** sessizce bir üst seviyeye düşer. Buna karşılık **canlı bir istekte** gelen geçersiz `address_id` sert **400** ile reddedilir — kullanıcı sürpriz bir adresle gönderim yapmasın.

**İzin Notu:**
- Tüm uçlar `mail.send` yeteneği ister (kulüpler erişemez).
- `GET /mail-reply-to/list`: Auth yeterlidir — her kullanıcı en azından kendi tercihini görmelidir.
- `create` / `update` / `delete` ve `set-preference` (`scope=company`): **`company.update`** gerekir — yani yalnızca **Kurucu** (`OWNER`). Yönetici (`ADMIN`) yeterli DEĞİLDİR.
- `set-preference` (`scope=user`): Auth yeterlidir; ancak şirket kilidi varsa **403** döner.

---

### `GET /mail-reply-to/list` 🔒

Adres defteri + şirket varsayılanı + kişisel tercih + etkin sonuç, tek çağrıda. Composer'ın "Yanıt:" satırı ve Ayarlar sekmesi bu uçtan beslenir.

```bash
curl -X GET "http://api.youthside.co/api/mail-reply-to/list" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### Yanıt (200)
```json
{
  "status": "success",
  "data": {
    "addresses": [
      { "id": "ADDRESS_UUID", "email": "ik@firma.com", "label": "İK Ekibi", "is_active": true }
    ],
    "self_email": "uzman@firma.com",
    "company": { "mode": "custom", "address_id": "ADDRESS_UUID", "allow_user_override": true },
    "user": { "mode": "none", "address_id": null },
    "effective": {
      "mode": "none",
      "email": null,
      "address_id": null,
      "source": "user",
      "locked": false
    },
    "locked": false,
    "can_manage_company": true
  }
}
```

| Alan | Açıklama |
| :--- | :------- |
| `company` / `user` | Kayıtlı tercih satırları. `null` = o kapsamda tercih yok. |
| `effective.email` | `null` ise `Reply-To` başlığı **hiç eklenmeyecek** demektir. |
| `effective.source` | Hangi seviyenin kazandığı: `request` \| `user` \| `company` \| `fallback` |
| `locked` | Şirket, kişisel seçimi kapatmış mı? |
| `can_manage_company` | Kullanıcının `company.update` izni var mı (Kurucu mu)? Şirket varsayılanı ve adres defteri bölümleri buna göre düzenlenebilir olur. |

---

### `POST /mail-reply-to/create` 🔒
**Gerekli İzin:** `company.update` — yalnızca **Kurucu** (`OWNER`)

| Parametre | Tipi | Zorunlu | Açıklama |
| :-------- | :--- | :------ | :------- |
| `email`   | `string` | ✅ Evet | Yanıt adresi. Küçük harfe normalize edilir, en fazla 150 karakter. |
| `label`   | `string` | ❌ Hayır | UI etiketi (ör. `İK Ekibi`), en fazla 120 karakter. |

```bash
curl -X POST "http://api.youthside.co/api/mail-reply-to/create" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{ "email": "ik@firma.com", "label": "İK Ekibi" }'
```

#### Yanıt (201)
```json
{
  "status": "success",
  "message": "Yanıt adresi eklendi.",
  "data": { "id": "ADDRESS_UUID", "email": "ik@firma.com", "label": "İK Ekibi", "is_active": true }
}
```

| Hata | Sebep |
| :--- | :---- |
| **400** `E-posta adresi geçersiz karakter içeriyor.` | CR/LF içeriyor (başlık enjeksiyonu denemesi) |
| **400** `Geçerli bir e-posta adresi giriniz.` | Biçim hatalı |
| **409** `Bu adres zaten kayıtlı.` | Şirkette aynı adres mevcut (`uq_company_email`) |

---

### `POST /mail-reply-to/update?id=UUID` 🔒
**Gerekli İzin:** `company.update` — yalnızca **Kurucu** (`OWNER`)

Kısmi güncelleme — yalnızca gönderilen alanlar değişir.

| Parametre   | Tipi      | Açıklama |
| :---------- | :-------- | :------- |
| `email`     | `string`  | Yeni adres |
| `label`     | `string`  | `null` gönderilerek temizlenebilir |
| `is_active` | `boolean` | `false` = geri alınabilir kapatma; adres silinmez, tercihlerde referansı korunur ama çözümlemede geçersiz sayılır |

```bash
curl -X POST "http://api.youthside.co/api/mail-reply-to/update?id=ADDRESS_UUID" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{ "is_active": false }'
```

---

### `POST /mail-reply-to/delete?id=UUID` 🔒
**Gerekli İzin:** `company.update` — yalnızca **Kurucu** (`OWNER`)

```bash
curl -X POST "http://api.youthside.co/api/mail-reply-to/delete?id=ADDRESS_UUID" \
  -H "Authorization: Bearer {{TOKEN}}"
```

#### Yanıt (200)
```json
{
  "status": "success",
  "message": "Yanıt adresi silindi.",
  "data": { "affected_preferences": 2 }
}
```

`affected_preferences` = bu adrese işaret eden ve artık şirket varsayılanına düşecek tercih sayısı (onay penceresinde uyarı göstermek için). **Devam eden toplu gönderimler etkilenmez** — kuyruk, adresi literal olarak snapshot'lamıştır.

---

### `POST /mail-reply-to/set-preference` 🔒

| Parametre | Tipi | Zorunlu | Açıklama |
| :-------- | :--- | :------ | :------- |
| `scope` | `string` | ✅ Evet | `company` (şirket politikası, `company.update` — yalnız Kurucu) veya `user` (kişisel) |
| `mode`  | `string` | ✅ Evet | `none` \| `self` \| `custom` \| `inherit` (`inherit` yalnız `scope=user`) |
| `address_id` | `string` | `mode=custom` ise ✅ | Şirkete ait ve **aktif** bir adres |
| `allow_user_override` | `boolean` | ❌ Hayır | Yalnız `scope=company`'de işlenir. `false` = ekip üyeleri kendi adresini seçemez. Gönderilmezse mevcut değer korunur. |

```bash
# Şirket varsayılanı: ortak İK adresi + kişisel seçimi kapat
curl -X POST "http://api.youthside.co/api/mail-reply-to/set-preference" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "company",
    "mode": "custom",
    "address_id": "ADDRESS_UUID",
    "allow_user_override": false
  }'

# Kişisel tercihi kaldır (şirket varsayılanına dön)
curl -X POST "http://api.youthside.co/api/mail-reply-to/set-preference" \
  -H "Authorization: Bearer {{TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{ "scope": "user", "mode": "inherit" }'
```

#### Yanıt (200)
```json
{
  "status": "success",
  "message": "Yanıt adresi tercihi kaydedildi.",
  "data": {
    "effective": {
      "mode": "custom",
      "email": "ik@firma.com",
      "address_id": "ADDRESS_UUID",
      "source": "company",
      "locked": true
    }
  }
}
```

| Hata | Sebep |
| :--- | :---- |
| **400** `scope alanı 'company' veya 'user' olmalıdır.` | Geçersiz kapsam |
| **400** `'inherit' yalnızca kişisel tercih için kullanılabilir.` | `scope=company` + `mode=inherit` |
| **400** `Pasif bir adres varsayılan olarak seçilemez.` | `is_active = false` adres |
| **403** `Şirket politikası yanıt adresini değiştirmenize izin vermiyor.` | `scope=user` ama şirket kilitli |
| **403** `Bu işlem için yetkiniz yok. (Gerekli izin: company.update)` | `scope=company`, kullanıcı Kurucu değil |

---

## 21. Kampanya Yönetimi (Admin)

> **Yetki:** Tüm endpoint'ler `Authorization: Bearer {{ADMIN_TOKEN}}` header'ı gerektirir.
> Admin panelinden e-posta, SMS ve WhatsApp kampanyaları oluşturmak, izlemek ve yönetmek için kullanılır.
>
> Kanal başına ayrıca dar bir izin aranır: `notifications.mailSend`, `notifications.smsSend`,
> `notifications.whatsappSend`.

### Çalışma Mantığı (Thin Orchestrator)

Sistem **ince orkestratör (thin orchestrator)** mimarisiyle çalışır:

- **`campaigns`** tablosu yalnızca meta veri ve özet sayaçları saklar. Alıcılar **satır bazında kaydedilmez**.
- Alıcı listesi `segment_ref` sütununa **tarif** olarak yazılır; worker bu tarifi çalıştırır.
- Worker, alıcı listesini `campaign_batches` tablosuna LIMIT/OFFSET parçalarına bölerek kuyruğa alır.
- Sağlayıcıdan gelen webhook olayları `webhook_logs` tablosuna düşer; `campaigns` sayaçları güncellenir.

| `segment_type` | `segment_ref` içeriği |
| :------------- | :-------------------- |
| `query` | SQL: `SELECT phone FROM candidates WHERE ...` |
| `file` | CSV yolu: `storage/segments/2026.csv` |
| `manual` | JSON dizi: `["uuid-1","uuid-2"]` (Sihirbazdan checkbox seçimi) |

### Kampanya Yaşam Döngüsü

```
Sihirbaz → POST /admin/campaigns/create
                │
                ▼
         campaigns.status = draft
                │   (scheduled_at varsa)
                ▼
         campaigns.status = scheduled
                │   (hemen gönderim veya planlanan saat gelince)
                ▼
         campaigns.status = sending
                │
                │  Worker: segment_ref → LIMIT 500'lük batch'ler
                │  SmsManager / MailManager → sağlayıcı API
                ▼
         campaign_batches (status: pending → processing → done/failed)
                │
                │  Sağlayıcı: webhook events → POST /admin/webhooks/ingest
                ▼
         webhook_logs (ham payload, 30 gün TTL)
                │  Cron: sayaçları güncelle, eski kayıtları temizle
                ▼
         campaigns.status = done / failed
```

---

### `POST /admin/campaigns/create` 🔒

```txt
Yeni kampanya oluşturur.
Sihirbazdan gelen veriyi alır; segment_type ve segment_ref'i belirler.
Zamanlanmış gönderim için scheduled_at doldurulur; boş bırakılırsa hemen gönderilir.
```

```bash
curl -X POST "http://localhost/youthside_ats/public/api/admin/campaigns/create" \
  -H "Authorization: Bearer {{ADMIN_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "2026 Yaz Staj Daveti",
    "channel": "email",
    "provider": "amazon_ses",
    "subject": "Yaz Stajı Başvuruları Başladı!",
    "body": "<p>Merhaba {{AD}},</p>...",
    "segment_type": "manual",
    "segment_ref": "[\"uuid-1\",\"uuid-2\",\"uuid-3\"]",
    "scheduled_at": null
  }'
```

#### İstek Body

| Parametre | Tip | Zorunlu | Açıklama |
| :-------- | :-- | :------ | :------- |
| `name` | `string` | ✅ | Kampanya adı |
| `channel` | `enum` | ✅ | `email`, `sms` veya `whatsapp` |
| `provider` | `string` | ✅ | `amazon_ses`, `elastic_email`, `interaktif_sms`, `Desk360` |
| `subject` | `string` | E-posta için ✅ | E-posta konusu |
| `body` | `string` | ✅ | HTML (e-posta) veya düz metin (SMS). **WhatsApp'ta da zorunludur** ama gönderimde KULLANILMAZ: şablonun okunabilir metni yazılır (önizleme + değişken denetimi için). Gönderilen şey `content.whatsapp_template`'tir. |
| `content.whatsapp_template` | `object` | WhatsApp için ✅ | `{"template_id":75,"language_id":2,"parameters":{"body-1":"{{ad}}"}}` — bkz. aşağıdaki WhatsApp notu |
| `segment_type` | `enum` | ✅ | `manual`, `query`, `file`, `masterdata_filtered`, `all_filtered` |
| `segment_ref` | `string` | ✅ | Aday tarifi (JSON string, SQL veya dosya yolu) |
| `scheduled_at` | `datetime\|null` | ❌ | İleri tarih: `"2026-06-01 09:00:00"`. Null ise hemen gönderilir. |
| `attachments` | `array` | ❌ | Base64 PDF/DOC ekler `[{"filename":"dosya.pdf","content":"...","encoding":"base64"}]` |
| `send_window` | `object\|null` | ❌ | Günlük izinli gönderim aralığı: `{"start":"09:00","end":"21:00"}`. Aralık dışında worker kendini otomatik duraklatır, aralık açılınca scheduler kaldığı yerden devam ettirir. `start > end` gece aşan pencere demektir (`22:00`–`06:00`). İkisi birlikte verilmelidir. |

#### Başarılı Yanıt (201)

```json
{
  "status": "success",
  "code": 201,
  "message": "Kampanya başarıyla oluşturuldu.",
  "data": {
    "id": 42,
    "status": "sending"
  }
}
```

#### Hata Yanıtları

- **422**: `segment_ref` geçersiz JSON veya boş dizi
- **400**: `channel` + `provider` uyumsuzluğu (örn: `channel=sms` + `provider=amazon_ses`)
- **422** (WhatsApp): şablon/dil seçilmedi · şablon bu hesabın integration'ında yok ·
  dil aktif değil · parametre anahtarları şablonun `variables[]` listesiyle örtüşmüyor ·
  bir parametre boş · WhatsApp'ta `attachments` gönderildi (desteklenmiyor)

#### WhatsApp kampanyaları

WhatsApp'ta **serbest metin gönderilemez**; yalnızca Meta onaylı şablon gönderilir.
Bu yüzden `content.whatsapp_template` zorunludur ve şablon, seçilen gönderici hesabın
Desk360 integration'ında **gerçekten var ve gönderilebilir** olmalıdır (aksi hâlde 422).

`parameters` anahtarları şablonun `variables[]` dizisinden gelir (`header-1`, `body-1`, …)
ve **birebir örtüşmelidir** — eksik veya fazla anahtar reddedilir. Değerler düz string'dir:
içinde `{{ }}` varsa kampanya değişkeni (alıcı başına çözülür), yoksa sabit metin.

Şablon listesi için bkz. [`GET /admin/whatsapp/templates`](#get-adminwhatsapptemplates-).

```json
{
  "name": "GEN Academy Bilgilendirme",
  "channel": "whatsapp",
  "provider": "Desk360",
  "segment_type": "manual",
  "segment_ref": "[\"uuid-1\"]",
  "sender_account_id": 27,
  "content": {
    "body": "Merhaba {{ad}}, başvurunuz tamamlandı.",
    "whatsapp_template": {
      "template_id": 4776,
      "language_id": 2,
      "parameters": { "body-1": "{{ad}}", "body-2": "TEST" }
    }
  }
}
```

---

### `GET /admin/whatsapp/templates` 🔒

```txt
Seçilen Desk360 hesabının GÖNDERİLEBİLİR WhatsApp şablonlarını döndürür.
Kampanya sihirbazının içerik adımı ve create/test-send doğrulaması bunu kullanır.
```

Desk360 API token'ı `sender_accounts.config_json` içinde şifreli durur ve tarayıcıya
verilmez; bu endpoint proxy görevi görür.

```bash
curl -X GET "http://localhost/youthside_ats/public/api/admin/whatsapp/templates?sender_account_id=27" \
  -H "Authorization: Bearer {{ADMIN_TOKEN}}"
```

| Parametre | Tip | Zorunlu | Açıklama |
| :-------- | :-- | :------ | :------- |
| `sender_account_id` | `int` | ✅ | `channel='whatsapp'` olan aktif bir gönderici hesap |
| `refresh` | `0\|1` | ❌ | `1` sunucu önbelleğini atlar (yeni onaylanan şablonu görmek için) |

- **Yetki:** `notifications.whatsappSend`
- **Önbellek:** sunucu 1 saat + tarayıcı 60 sn. Optimizasyon değil **rate-limit
  korumasıdır**: Desk360'ın 60 istek/dk IP bazlı bütçesi kampanya worker'larıyla paylaşılır.
- Desk360'a ulaşılamaz ve bayat önbellek varsa `"stale": true` ile son bilinen liste döner.

```json
{
  "status": "success",
  "data": {
    "account": { "id": 27, "label": "GEN Academy (WhatsApp)", "integration_id": 775, "phone_number": "908503044832" },
    "templates": [
      {
        "id": 4776,
        "name": "gen_apply_bilgilendirme",
        "category": "custom",
        "languages": [
          {
            "language_id": 2, "language": "Türkçe", "status_value": 2,
            "header_type": "TEXT", "header": null,
            "body": "Merhaba {{1}}, ...", "footer": null,
            "variables": ["body-1", "body-2"],
            "requires_attachment": false,
            "header_file": null
          }
        ]
      }
    ],
    "fetched_at": "2026-08-31T10:00:00+03:00",
    "stale": false
  }
}
```

- `variables[]` → `create`/`test-send`'de `parameters` anahtarları olarak kullanılır.
- `requires_attachment: true` → medya başlıklı şablon. `header_file` şablonun onaylı
  görselinin CDN adresidir; **kullanıcıdan görsel istenmez**, backend indirip gönderir.
- **404**: hesap bulunamadı · **422**: hesap `whatsapp` kanalına ait değil / pasif ·
  **502**: Desk360'a ulaşılamadı ve önbellek de yok

---

### `GET /admin/campaigns/list` 🔒

```txt
Kampanyaları listeler.
```

| Parametre | Tip | Varsayılan | Açıklama |
| :-------- | :-- | :--------- | :------- |
| `status` | `string` | `null` | `draft`, `queued`, `scheduled`, `sending`, `paused`, `done`, `failed`, `cancelled` |
| `channel` | `string` | `null` | `email`, `sms` veya `whatsapp` |
| `limit` | `int` | `20` | Sayfa başı kayıt |
| `offset` | `int` | `0` | Sayfalama atlama |
| `sort` | `string` | `created_at` | Sıralama alanı |
| `dir` | `string` | `DESC` | `ASC` veya `DESC` |

```bash
curl -X GET "http://localhost/youthside_ats/public/api/admin/campaigns/list?status=done&channel=email&limit=10" \
  -H "Authorization: Bearer {{ADMIN_TOKEN}}"
```

#### Başarılı Yanıt (200)

```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": 42,
        "name": "2026 Yaz Staj Daveti",
        "channel": "email",
        "provider": "amazon_ses",
        "status": "done",
        "total_recipients": 850,
        "total_sent": 850,
        "total_delivered": 821,
        "total_opened": 412,
        "total_clicked": 87,
        "total_bounced": 12,
        "total_complained": 2,
        "scheduled_at": null,
        "started_at": "2026-05-07 09:00:00",
        "finished_at": "2026-05-07 09:04:32",
        "created_at": "2026-05-06 18:30:00"
      }
    ],
    "pagination": {
      "totalItems": 15,
      "totalPages": 2,
      "currentPage": 1,
      "perPage": 10
    }
  }
}
```

---

### `GET /admin/campaigns/get?id={id}` 🔒

```txt
Tek bir kampanyanın tüm detaylarını getirir.
id: campaigns.id (BIGINT, otomatik artan)
```

```bash
curl -X GET "http://localhost/youthside_ats/public/api/admin/campaigns/get?id=42" \
  -H "Authorization: Bearer {{ADMIN_TOKEN}}"
```

#### Başarılı Yanıt (200)

```json
{
  "status": "success",
  "data": {
    "id": 42,
    "name": "2026 Yaz Staj Daveti",
    "channel": "email",
    "provider": "amazon_ses",
    "status": "done",
    "subject": "Yaz Stajı Başvuruları Başladı!",
    "body": null,
    "body_path": "storage/campaigns/42.html",
    "segment_type": "manual",
    "segment_ref": "[\"uuid-1\",\"uuid-2\"]",
    "provider_tags": null,
    "total_recipients": 850,
    "total_sent": 850,
    "total_delivered": 821,
    "total_opened": 412,
    "total_clicked": 87,
    "total_bounced": 12,
    "total_complained": 2,
    "total_unsubscribed": 3,
    "scheduled_at": null,
    "started_at": "2026-05-07 09:00:00",
    "finished_at": "2026-05-07 09:04:32",
    "created_by": "admin-uuid",
    "created_at": "2026-05-06 18:30:00",
    "updated_at": "2026-05-07 09:04:32",
    "batches": [
      {
        "id": 1,
        "offset_val": 0,
        "batch_size": 500,
        "status": "done",
        "sent_count": 500,
        "fail_count": 0,
        "started_at": "2026-05-07 09:00:01",
        "finished_at": "2026-05-07 09:02:15"
      }
    ]
  }
}
```

> **Not:** `body` sütunu 6 aydan eski kampanyalarda `null` olabilir; içerik `body_path` yolundaki dosyada saklanır (CampaignBatchCleanup cron görevi).

---

## Kampanya Çalışma Zamanı Kontrolleri

Gönderim **başladıktan sonra** müdahale etmeyi sağlayan uçlar. Büyük hacimli gönderimlerde
sağlayıcı (AWS SES vb.) yavaşlayınca kampanya planlanan saatin dışına taşabilir; bu uçlar
terminalden manuel SQL/`kill` gerektirmeden panelden durdurma imkânı verir.

**Yetki:** Üçü de `campaigns.toggleStatus` izni ister (`SUPER_ADMIN` otomatik geçer).

> ⚠️ **Değişiklik:** `cancel` eskiden `notifications.smsSend` / `notifications.mailSend`
> izinleriyle çağrılabiliyordu. Canlı gönderimi kesmek yıkıcı bir aksiyon olduğu için artık
> `campaigns.toggleStatus` aranır — pause/resume ile aynı kapı. Bugün iptal edebilen rollere
> bu iznin verilmesi gerekir.

**Durdurma nasıl çalışır?** Worker kampanya durumunu yalnızca başlangıçta değil, döngünün her
turunda ve e-posta gönderiminde **her 25 alıcıda bir** kontrol eder. Sinyal gelince yarım kalan
batch kuyruğa geri konur ve worker temiz kapanır (process öldürmeye gerek yoktur). Duraklatma
sonrası devam edildiğinde aynı batch yeniden işlenir; `campaign_sends` idempotency ledger'ı
zaten gönderilmiş alıcıları eler — **mükerrer gönderim olmaz.**

---

### `POST /admin/campaigns/pause` 🔒

```txt
Gönderimi süren kampanyayı duraklatır. Gönderim ~2-4 saniye içinde durur.
Kabul edilen durumlar: sending, queued, scheduled
```

```bash
curl -X POST "http://localhost/youthside_ats/public/api/admin/campaigns/pause" \
  -H "Authorization: Bearer {{ADMIN_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{ "campaign_id": 42 }'
```

#### Başarılı Yanıt (200)

```json
{
  "status": "success",
  "message": "Kampanya duraklatıldı. Devam edene kadar yeni mesaj gönderilmeyecek.",
  "data": { "campaign_id": 42 }
}
```

#### Hata Yanıtı (422)

```json
{
  "status": "error",
  "code": 422,
  "message": "Kampanya duraklatılamadı. Yalnızca gönderimi süren, kuyruktaki veya zamanlanmış kampanyalar duraklatılabilir."
}
```

> Duraklatan yönetici `campaigns.paused_by`, zamanı `campaigns.paused_at`, nedeni
> `campaigns.pause_reason = 'manual'` olarak kaydedilir. Aksiyon ayrıca kampanyanın JSONL log
> dosyasına `campaign_paused` satırı olarak yazılır — "gece kim durdurdu?" sorusunun cevabı orada.

---

### `POST /admin/campaigns/resume` 🔒

```txt
Duraklatılmış kampanyayı kaldığı yerden devam ettirir.
Worker istek içinde başlatılır; gönderim saniyeler içinde sürer (5 dakikalık cron beklenmez).
```

```bash
curl -X POST "http://localhost/youthside_ats/public/api/admin/campaigns/resume" \
  -H "Authorization: Bearer {{ADMIN_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{ "campaign_id": 42 }'
```

#### Başarılı Yanıt (200)

```json
{
  "status": "success",
  "message": "Kampanya kaldığı yerden devam ediyor.",
  "data": { "campaign_id": 42, "worker_spawned": true }
}
```

#### Hata Yanıtları (422)

- `"Kampanya duraklatılmış durumda değil (mevcut: done)."`
- `"Kampanya gönderim saat aralığı (09:00–21:00) dışında. Aralık açıldığında otomatik devam edecek."`

> Batch'leri oluşturulmuş kampanya doğrudan `sending`'e döner. Henüz batch oluşturulmamışsa
> `queued`'a döner ve scheduler bir sonraki döngüde batch'leri kurup başlatır.
>
> `pause_reason = 'window'` olan kampanyalar için bu ucu çağırmanıza gerek yoktur — scheduler
> gönderim saat aralığı açıldığında onları **otomatik** devam ettirir. Elle duraklatılmış
> (`'manual'`) kampanyalar ise asla kendiliğinden başlamaz.

---

### `POST /admin/campaigns/cancel` 🔒

```txt
Kampanyayı iptal eder. Gönderim SÜRERKEN de çalışır.
Kabul edilen durumlar: queued, scheduled, sending, paused

Sıra: kampanya 'cancelled' yapılır → bekleyen/işlenen batch'ler kapatılır →
idempotency ledger'ı temizlenir. Worker bir sonraki kontrol noktasında durur.
```

> ⚠️ Zaten gönderilmiş mesajlar **geri alınamaz**; iptal yalnızca bundan sonrasını durdurur.
> İptal edilen kampanya tekrar başlatılamaz.

```bash
curl -X POST "http://localhost/youthside_ats/public/api/admin/campaigns/cancel" \
  -H "Authorization: Bearer {{ADMIN_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{ "campaign_id": 42 }'
```

#### Başarılı Yanıt (200)

```json
{
  "status": "success",
  "message": "Kampanya iptal edildi. Gönderilmemiş mesajlar gönderilmeyecek.",
  "data": {
    "campaign_id": 42,
    "closed_batches": 12
  }
}
```

#### Hata Yanıtı (422)

```json
{
  "status": "error",
  "code": 422,
  "message": "Kampanya iptal edilemedi. Tamamlanmış veya zaten iptal edilmiş kampanyalar iptal edilemez."
}
```

---

### `POST /admin/campaigns/rename` 🔒

```txt
Kampanyanın panelde görünen adını (campaigns.name) değiştirir.
Gönderim içeriğine ve duruma dokunmaz; her durumdaki kampanya için çağrılabilir.
Yetki: campaigns.update
```

```bash
curl -X POST "http://localhost/youthside_ats/public/api/admin/campaigns/rename" \
  -H "Authorization: Bearer {{ADMIN_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{ "campaign_id": 42, "name": "GEN26_part06_sinav" }'
```

#### Başarılı Yanıt (200)

```json
{
  "status": "success",
  "message": "Kampanya adı güncellendi.",
  "data": { "campaign_id": 42, "name": "GEN26_part06_sinav" }
}
```

#### Hata Yanıtları

- `422` — `"\"name\" alanı zorunludur."` / `"Kampanya adı en fazla 255 karakter olabilir."`
- `404` — `"Kampanya bulunamadı."`

---

### `POST /admin/campaigns/test-send` 🔒

```txt
Kampanya içeriğini kayıt oluşturmadan tek bir alıcıya test olarak gönderir.
Sihirbazın son adımındaki "Kendime Test Gönder" paneli bu endpoint'i kullanır.
```

```bash
curl -X POST "http://localhost/youthside_ats/public/api/admin/campaigns/test-send" \
  -H "Authorization: Bearer {{ADMIN_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "email",
    "provider": "amazon_ses",
    "target": "ferhat@youthside.co",
    "subject": "TEST: Yaz Stajı",
    "body": "<p>Merhaba {{ad}}, test içeriği</p>",
    "variable_mode": "candidate",
    "fallbackVariables": {
      "ad": "Adayımız",
      "soyad": "",
      "universite": "",
      "bolum": "",
      "sinif": ""
    },
    "candidate_data": {
      "firstName": "Ayşe",
      "lastName": "Kaya",
      "university": "Boğaziçi Üniversitesi",
      "department": "İşletme",
      "grade": "3"
    }
  }'
```

#### İstek Body

| Parametre | Tip | Zorunlu | Açıklama |
| :-------- | :-- | :------ | :------- |
| `channel` | `enum` | ✅ | `email`, `sms` veya `whatsapp` |
| `provider` | `string` | ✅ | Kullanılacak sağlayıcı |
| `target` | `string` | ✅ | E-posta adresi veya telefon numarası |
| `subject` | `string` | E-posta için ✅ | E-posta konusu |
| `body` | `string` | email/sms için ✅ | Gönderilecek içerik. **WhatsApp'ta istenmez** — gönderilen şey şablondur. |
| `whatsapp_template` | `object` | WhatsApp için ✅ | `{"template_id":75,"language_id":2,"parameters":{"body-1":"{{ad}}"}}`. `create` ile AYNI doğrulamadan geçer. |
| `sender_account_id` | `int` | WhatsApp için ✅ | `channel='whatsapp'` olan aktif hesap |
| `variable_mode` | `enum` | ❌ | `fallback` veya `candidate`. Varsayılan: `fallback` |
| `fallbackVariables` | `object` | ❌ | Aday alanı boşsa kullanılacak `ad`, `soyad`, `universite`, `bolum`, `sinif` değerleri |
| `candidate_data` | `object` | `variable_mode=candidate` için ✅ | Önizlenen adayın değişken alanları: `firstName`, `lastName`, `university`, `department`, `grade` |
| `smsSettings` | `object` | SMS için ❌ | `optOutChecked`, `optOutText`, `b000Checked` SMS ayarları. **WhatsApp'ta yok sayılır**: opt-out metni Meta onaylı şablonun parçası değildir, sonradan eklenen satır şablonu geçersiz kılar. |

> WhatsApp test gönderiminde başarılı yanıt `data.message_id` (Desk360/WhatsApp mesaj
> kimliği) döner. **Dikkat:** `message_id` dönmesi TESLİMAT anlamına gelmez — WABA hesabı
> kilitliyse Desk360 yine HTTP 200 döner. Bkz. `admin-api.md` → "Başarılı gönderim yanılgısı".

#### Başarılı Yanıt (200)

```json
{
  "status": "success",
  "message": "Test e-postası başarıyla gönderildi.",
  "data": []
}
```

#### Hata Yanıtları

- **422**: `variable_mode=candidate` seçildiği halde `candidate_data` gönderilmemiştir.

---

### `GET /admin/campaigns/stats?id={id}` 🔒

```txt
Kampanyanın anlık teslim istatistiklerini döner.
Grafik çizmek veya ilerleme takibi için kullanılır.
```

```bash
curl -X GET "http://localhost/youthside_ats/public/api/admin/campaigns/stats?id=42" \
  -H "Authorization: Bearer {{ADMIN_TOKEN}}"
```

#### Başarılı Yanıt (200)

```json
{
  "status": "success",
  "data": {
    "id": 42,
    "status": "sending",
    "progress_pct": 62,
    "total_recipients": 850,
    "total_sent": 527,
    "total_delivered": 512,
    "total_opened": 210,
    "total_clicked": 45,
    "total_bounced": 8,
    "total_complained": 1,
    "total_failed": 7,
    "total_unsubscribed": 2,
    "batches": {
      "total": 2,
      "done": 1,
      "processing": 1,
      "pending": 0,
      "failed": 0
    }
  }
}
```

---

### Webhook Entegrasyon Notu

Sağlayıcılar teslimat olaylarını aşağıdaki endpoint'e POST eder:

```
POST /admin/webhooks/ingest?provider={provider_slug}
```

| Olay | Güncellenen Sayaç |
| :--- | :---------------- |
| Delivery (SES) | `total_delivered++` |
| Bounce (permanent, SES) | `total_bounced++` → `unsubscribes` kaydı |
| Complaint (SES) | `total_complained++` → `unsubscribes` kaydı |
| Open (SES/Elastic) | `total_opened++` |
| Click (SES/Elastic) | `total_clicked++` |
| DLR SUCCESS (İnteraktif) | `total_delivered++` |
| DLR FAIL (İnteraktif) | `total_failed++` |

### `GET|POST /campaign/unsubscribe?t=<token>` 🌐 _(HTML)_

Kampanya maillerindeki "abonelikten çık" bağlantısının hedefi. Tarayıcıda açılır, HTML döner.
`GET ?t=` onay sayfasını gösterir; aynı adrese form `POST` (`confirm=yes|no`) tercihi kaydeder. JSON istemcileri için değildir.

---

## 22. Değerlendirme Formları & Değerlendirmeler

Mülakat değerlendirme formu şablonları (şirket bazlı) ve aday için doldurulmuş değerlendirmeler (PDF/dosya olarak saklanır).

### Değerlendirme formu şablonları — `evaluation-forms/*` 🔒

Yetki: `job.manage` + `cap:pipelines`.

| Uç | Yöntem | Parametreler | Yanıt |
| :--- | :--- | :--- | :--- |
| `/evaluation-forms/list` | GET | `only_active=1` (opsiyonel) | `{ templates: [] }` |
| `/evaluation-forms/get` | GET | `id` | Şablon; yoksa `404` |
| `/evaluation-forms/create` | POST | `{ name* (≤150), description (≤1000), definition }` | `201` şablon; doğrulama hatası `422` |
| `/evaluation-forms/update` | POST | `{ id*, name?, description?, definition?, is_active? }` (kısmi) | `200`; alan yoksa `400`, şablon yoksa `404`, doğrulama `422` |
| `/evaluation-forms/delete` | POST | `{ id* }` | `200`; yoksa `404` |
| `/evaluation-forms/defaults` | GET | – | Şirket adı/logosuyla önceden doldurulmuş form yapısı (yeni şablon için başlangıç) |

### `GET /evaluations/list?application_id=` 🔒

Şirket token'ı + `cap:applications`. Başvuruya ait değerlendirmeler: `{ evaluations: [] }`. Hatalar: `400` parametre yok, `404` başvuru yok/başka şirketin.

### `GET /evaluations/by-job?job_id=` 🔒

Şirket token'ı + `cap:applications`. Bir ilandaki tüm değerlendirmeler.
Parametreler: `job_id*`, `count_only=1` (yalnızca `{ total }`), `limit` (50), `offset`, `sort`, `dir`, `date_min`, `date_max`, `pipeline_id`.
Yanıt: `{ total, evaluations: [] }`.

### `POST /evaluations/submit` 🔒 _(multipart/form-data)_

```txt
Şirket token'ı + cap:applications. Doldurulmuş değerlendirmeyi dosya olarak kaydeder.
Alanlar: application_id*, pipeline_id*, client_token* (UUID — idempotency anahtarı), file*, form_template_id (opsiyonel).
Aynı client_token ile tekrar gönderim yeni kayıt açmaz, mevcut kaydı döner ("Değerlendirme zaten kaydedilmişti.").
```

Yanıt `201`: `{ id, cdn_url (imzalı), form_name, created_at }`. Hatalar: `400` eksik alan / geçersiz `client_token` / dosya yok, `422` aşama başvurunun ilanına ait değil.

---

## 23. Entegrasyonlar (Aday Aktarımı)

Başvuruları dış ATS/HR sistemlerine (ör. HRPeak) aktarma. Tümü şirket token'ı + `cap:integrations` ister.

| Uç | Yöntem | İzin | Açıklama |
| :--- | :--- | :--- | :--- |
| `/integrations/catalog` | GET | `integration.manage` veya `integration.transfer` | Desteklenen sağlayıcılar ve yapılandırma şemaları |
| `/integrations/list` | GET | `integration.manage` veya `integration.transfer` | Şirketin bağlantıları: `[{ id, provider_key, label, settings, is_active, has_credentials, last_test_*, public_config }]` (gizli bilgiler dönmez) |
| `/integrations/targets` | GET | `integration.manage` veya `integration.transfer` | `?integration_id*` — hedef sistemdeki aktarım hedefleri (ilan/pozisyon listesi vb.) |
| `/integrations/save` | POST | `integration.manage` | `{ provider_key*, label, config{}, settings{}, is_active }` → `{ id }` (oluşturur/günceller) |
| `/integrations/test` | POST | `integration.manage` | `{ integration_id* }` — bağlantı testi |
| `/integrations/delete` | POST | `integration.manage` | `{ integration_id* }` |
| `/integrations/transfer` | POST | `integration.transfer` + `cap:applications` | Aşağıya bakın |
| `/integrations/transfer-status` | GET | `integration.transfer` | `?batch_id*` → aktarım ilerlemesi; yoksa `404` |
| `/integrations/transfer-cancel` | POST | `integration.transfer` | `{ batch_id* }` → `{ cancelled_count }` |
| `/integrations/linked` | POST | `integration.transfer` | `{ application_ids: [] }` (≤500) → `{ linked }` — hangi başvuruların daha önce aktarıldığı |

### `POST /integrations/transfer` 🔒

```json
{
  "job_id": "UUID",
  "integration_id": "UUID",
  "preview": false,
  "scope": "SELECTED",
  "application_ids": ["UUID-1"],
  "filters": {},
  "exclude_ids": [],
  "target_values": {},
  "target_labels": {},
  "send_message": false
}
```

`preview: true` yalnızca sayımları döner. Gerçek aktarım kuyruğa alınır → `202`:
`{ eligible_count, invalid_count, duplicate_count, queued_count, batch_id, worker_started }`. İlerleme: `transfer-status` veya `GET /operations/list`.

---

## 24. Operasyonlar, Global Arama, Kullanıcı

### `GET /operations/list` 🔒

Herhangi bir geçerli token. Kullanıcının arka plan işlerini (toplu mail, entegrasyon aktarımı vb.) tek listede toplar:
`{ operations: [{ ref, source_key, title, status, total, succeeded, failed, progress, … }], active_count, available_sources: [] }`.

### `POST /operations/cancel` 🔒

`{ "ref": "source:id" }` (ör. `"mail:42"`). Hatalar: `400` ref yok veya bu tür işlem iptal edilemez, `404` işlem bulunamadı.

### `GET /search/global?q=` 🔒

Şirket token'ı. Panel genel araması (en az 2 karakter; daha kısa → `[]`). Arama sağlayıcıları hesap türüne göre seçilir (kulüpte ilan/aday aranmaz).
Yanıt (en fazla 20): `[{ type, id, title, subtitle, meta, url, avatar_url }]`.

### `POST|PUT /users/update` 🔒

Yalnızca şirket kullanıcısı (aday için `candidates/update`). Kendi profilini günceller.

```json
{ "name": "Ad Soyad", "title": "İK Uzmanı", "avatar_url": "https://…" }
```

Yanıt: `{ name, title, avatar_url }`. Hatalar: `400` alan yok veya `email` gönderildi (e-posta için `users/request-email-change`), `403` şirket kullanıcısı değil, `422` ad boş.
