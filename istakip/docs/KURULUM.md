# İş Takip Sistemi — Kurulum Rehberi

## Gereksinimler
- Node.js 20+ (https://nodejs.org)
- Git (https://git-scm.com)
- GitHub hesabı (ücretsiz)
- Microsoft hesabı (Azure için)

---

## ADIM 1 — Supabase Projesi Oluşturma

1. **https://supabase.com** adresine gidin
2. "Start your project" → GitHub veya e-posta ile kayıt olun (ücretsiz)
3. "New project" tıklayın:
   - Organization: kişisel veya şirket
   - Project name: `istakip`
   - Database password: güçlü bir şifre yazın ve **kaydedin**
   - Region: `West Europe (Frankfurt)` seçin
4. Proje oluşana kadar bekleyin (~2 dakika)

### Veritabanı Şemasını Yükleme
5. Sol menüden **SQL Editor** açın
6. `supabase/schema.sql` dosyasının tüm içeriğini kopyalayın
7. SQL Editor'a yapıştırın → **Run** butonuna tıklayın
8. "Success" mesajı görünce tamamdır

### API Anahtarlarını Alma
9. Sol menüden **Settings → API** açın
10. Şunları not alın:
    - **Project URL**: `https://xxxx.supabase.co`
    - **anon public key**: `eyJ...` ile başlayan uzun metin

---

## ADIM 2 — Kullanıcı Hesapları Oluşturma

Çalışanların hesaplarını yönetici olarak siz oluşturacaksınız:

1. Supabase panelinde **Authentication → Users** açın
2. "Invite user" veya "Add user" tıklayın
3. Her çalışan için e-posta ve geçici şifre girin
4. Kullanıcı oluşturulduktan sonra **Table Editor → users** tablosuna gidin
5. İlgili kullanıcının `role` alanını:
   - Yöneticiler için: `manager`
   - Çalışanlar için: `staff` (varsayılan)
   olarak güncelleyin
6. `avatar_color` alanına renk kodu girin (opsiyonel):
   - `#E1F5EE`, `#EEEDFE`, `#E6F1FB`, `#FAECE7`, `#FAEEDA`, `#EAF3DE`, `#FBEAF0`

---

## ADIM 3 — Projeyi GitHub'a Yükleme

```bash
# Proje klasörüne gidin
cd istakip

# Git başlat
git init
git add .
git commit -m "ilk yükleme"

# GitHub'da yeni bir repo oluşturun (https://github.com/new)
# Repo adı: istakip
# Public veya Private seçebilirsiniz

# GitHub reposuna bağlayın (kendi kullanıcı adınızı yazın)
git remote add origin https://github.com/KULLANICI_ADINIZ/istakip.git
git branch -M main
git push -u origin main
```

---

## ADIM 4 — Azure Static Web Apps Kurulumu

1. **https://portal.azure.com** adresine gidin
2. Microsoft hesabınızla giriş yapın
3. Arama çubuğuna "Static Web Apps" yazın → "Create" tıklayın
4. Ayarlar:
   - **Subscription**: Pay-As-You-Go veya Free tier
   - **Resource group**: Yeni oluşturun → `istakip-rg`
   - **Name**: `istakip-app`
   - **Plan type**: Free
   - **Region**: West Europe
   - **Source**: GitHub
5. GitHub hesabınızı bağlayın:
   - Organization: kendi hesabınız
   - Repository: `istakip`
   - Branch: `main`
6. Build ayarları:
   - **Build preset**: Next.js
   - **App location**: `/`
   - **Output location**: `.next`
7. "Review + Create" → "Create" tıklayın

### Ortam Değişkenlerini Azure'a Ekleme
8. Oluşturulan kaynağa gidin
9. Sol menüden **Configuration** açın
10. "Add" ile şunları ekleyin:
    - `NEXT_PUBLIC_SUPABASE_URL` → Supabase Project URL
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Supabase anon key
11. "Save" tıklayın

### GitHub Secrets Ekleme
12. Azure'da kaynağınızın **Overview** sayfasında **Manage deployment token** tıklayın
13. Token'ı kopyalayın
14. GitHub'da reponuza gidin → **Settings → Secrets → Actions**
15. "New secret" ekleyin:
    - Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
    - Value: kopyaladığınız token
16. Ayrıca ekleyin:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## ADIM 5 — Deploy Etme

```bash
# Herhangi bir değişiklik yapıp push ettiğinizde otomatik deploy başlar
git add .
git commit -m "güncelleme"
git push
```

GitHub Actions sekmesinden deploy sürecini takip edebilirsiniz.
Deploy tamamlandığında Azure size bir URL verir:
`https://xxx.azurestaticapps.net`

---

## ADIM 6 — Yerel Geliştirme (Opsiyonel)

```bash
# Bağımlılıkları yükleyin
npm install

# .env.local dosyası oluşturun
cp .env.local.example .env.local
# Dosyayı açıp Supabase bilgilerini girin

# Geliştirme sunucusunu başlatın
npm run dev
# http://localhost:3000 adresinde açılır
```

---

## Özellik Özeti

| Özellik | Yönetici | Çalışan |
|---------|----------|---------|
| Kanban board | Tüm görevler | Sadece kendi görevleri |
| Gantt takvim | Tüm görevler | Sadece kendi görevleri |
| Görev ekleme | ✅ | ❌ |
| Görev silme | ✅ | ❌ |
| Durum güncelleme | ✅ | ✅ |
| Yorum ekleme | ✅ | ✅ |
| Bildirimler | ✅ | ✅ |
| Ekip durumu | ✅ | ❌ |

---

## Sorun Giderme

**"Giriş yapılamıyor"**
→ Supabase'de Authentication → Users'dan kullanıcının confirmed olduğunu kontrol edin.

**"Görevler görünmüyor"**
→ Supabase'de RLS (Row Level Security) kurallarının schema.sql ile doğru kurulduğunu kontrol edin.

**"Deploy başarısız"**
→ GitHub Actions sekmesinde hata mesajını inceleyin. Genellikle eksik environment variable'dan kaynaklanır.

**Kullanıcı şifresini değiştirmek**
→ Supabase Authentication → Users → kullanıcı → "Send password reset"

---

## Maliyet

| Servis | Plan | Maliyet |
|--------|------|---------|
| Supabase | Free | 0 ₺/ay |
| Azure Static Web Apps | Free | 0 ₺/ay |
| GitHub | Free | 0 ₺/ay |
| **Toplam** | | **0 ₺/ay** |

> 6-7 kişilik ekip için Supabase free tier (500 MB DB, 50k MAU) fazlasıyla yeterlidir.
