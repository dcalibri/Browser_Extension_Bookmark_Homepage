# 📚 Bookmark Homepage Extended – Chrome Extension

**Deskripsi Singkat:**  
Bookmark Homepage Extended adalah ekstensi Chrome yang membantu **developer & pelajar** dalam menavigasi bookmark melalui **mode tampilan kanban**, lengkap dengan subfolder management, drag-and-drop, dan pembersih tab khusus.

---

## 🎯 Tujuan

Menyediakan sistem bookmark visual berbasis **kanban interaktif**, mempermudah:
- Navigasi antar subfolder
- Pengelompokan konten belajar/dev
- Manajemen tab & folder kompleks

---

## 🗂️ Penjelasan Format Update Tracker

| Kolom                | Penjelasan                                                                 |
|----------------------|---------------------------------------------------------------------------|
| `No`                 | Nomor urut update                                                         |
| `Jenis Update dan Context` | Format: `FixBug: deskripsi` atau `AddFeat: deskripsi` <br>Tanpa emoji. |
| `%`                  | Tingkat urgensi update. Contoh: `Now`, `Next`, `Future`                   |
| `Inisiate Date/Time` | Waktu pertama kali perubahan direncanakan                                 |
| `Status`             | Progres saat ini: `Pending`, `In Progress`, `Done`                        |
| `Commited Date/Time` | Waktu update disimpan/di-commit ke repository                            |

> **Catatan**:
> - `FixBug` = Memperbaiki bug/perilaku yang tidak sesuai  
> - `AddFeat` = Menambahkan fitur baru

---

## 🔄 Update Tracker
| No | Update & Context                                                                                                           | 🔝 Priority | ⏱ Initiate Date/Time | 📌 Status | ✅ Committed Date/Time |
| -- | -------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------- | --------- | --------------------- |
| 01 | 🔧 **FixBug**: Bisa drag-and-drop ke empty subfolder                                                                       | Now         | 2025-09-11 08:45     | ⏳ Pending | –                     |
| 02 | ✨ **AddFeat**: Mendukung subfolder hingga level-3                                                                          | Now         | 2025-09-11 08:46     | ⏳ Pending | –                     |
| 03 | 🔧 **FixBug**: Tab Cleaner YouTube – hapus semua tab kecuali tab yang sedang aktif                                         | Now         | 2025-09-11 08:47     | ⏳ Pending | –                     |
| 04 | 🔧 **FixBug**: Supaya tampilan settings menu lebih rapi dan tidak overflow                                                 | Now         | 2025-09-11 10:15     | ⏳ Pending | –                     |
| 05 | ✨ **AddFeat**: Tambahkan 3 dropdown regional opsional (Asia/EU/Global) dengan library pilihan (misal: Select.js)           | Next        | 2025-09-11 10:18     | ⏳ Pending | –                     |
| 06 | ✨ **AddFeat**: Tombol navigasi untuk membatasi tab homepage — pilih mode *open one tab only* atau eliminasi semua homepage | Next        | 2025-09-11 10:38     | ⏳ Pending | –                     |
| 07 | 🔧 **FixBug**: Right after drag-drop bookmark tidak akan jitter                                                            | Next        | 2025-09-11 10:38     | ⏳ Pending | –                     |


BUAT DEMO VIDEO MENGENAI PENGUNAKAAN APLIKASI INI


---
## Previews
![UI Utama](./Screenshots/Screenshot_2025-09-11_193700.jpg)



---
## 👨‍💻 Kontribusi & Feedback

### Silakan buka issue atau kirim pull request ke:  
🔗 [github.com/dcalibri/Browser_Extension_Bookmark_Homepage

### 👥 Kontributor
- `dcalibri`


moreee

📊 Data yang Perlu Dikumpulkan

Market Data

Jumlah pengguna aktif Chrome (3+ miliar).

Jumlah pengguna aktif Chrome Web Store extension (ratusan juta).

Tren penggunaan productivity tools (bookmark manager, kanban, task board).

Benchmark extension bookmark serupa (misalnya: Raindrop.io, Toby, Workona).

User Pain Points

Bookmark Chrome default susah diatur → hanya folder linear, tidak visual.

Banyak user pakai Notion, Trello, Asana cuma untuk “bookmark management” → overkill.

Bookmark sync across device tidak fleksibel.

Bookmark tidak bisa dikasih status/tag (In Progress, Done, etc.).

Competitor Data

Rating & review di Chrome Web Store (apa yang orang suka / benci).

Pricing model (free vs pro subscription).

Growth user (misal Toby pernah dapat ribuan review).

User Engagement Metrics

Berapa kali orang buka new tab per hari → potensial exposure.

Rata-rata user butuh 10–20 site tetap per workflow (kerjaan, belajar, hobi).

Chrome extension retention rate (berapa lama orang keep extension terinstall).

🚀 Selling Points yang Bisa Dibawa

Productivity Boost

Hemat waktu: 1 klik ke workspace, bukan buka tab satu-satu.

Bookmark berubah jadi “kanban board” → lebih visual, lebih terstruktur.

Customization

Bisa bikin kategori sesuai kebutuhan (Social, Jobs, Vendors, Tools, dll).

Bisa multi-region (Jakarta, Surabaya, Kalimantan) → cocok buat user remote.

Business Appeal

Perusahaan bisa share board antar tim (HR, Sales, Dev).

Training center / bootcamp bisa kasih resource board siap pakai ke murid.

Agency bisa kasih client-ready dashboard (tools, repo, laporan).

Data-Driven UX

Bookmark usage analytics: paling sering diklik → jadi insight personal.

Bisa export/import → jadi nilai tambah untuk enterprise.

Monetization Angle

Free version: personal user.

Pro version: team sharing, cloud sync, analytics.

Selling point ke investor: recurring SaaS revenue.

💡 Ideas untuk Proof & Pitch

Survey: “berapa lama lo habisin tiap hari nyari link yang sama di bookmark/drive?”

A/B Test: kasih 2 kelompok — yang pakai Chrome default vs pakai extension Kanban → ukur kecepatan task.

Case Study: mahasiswa, network engineer, freelancer, HR recruiter → semua butuh workspace cepat.

Visual Demo: tunjukin sebelum/after → tab acak vs dashboard rapi kayak screenshot lo → itu powerful.

👉 Jadi BA angle:
Yang perlu lo kumpulin = user pain, market size, competitor gaps, dan metric benefit (hemat waktu, retensi, engagement).
Yang jadi selling point = productivity + struktur + bisnis use case.


# IDE 01

| **No** | **Nama Fitur**                                                      | **UI Detail (Tampilan)**                                                                                                                                      | **Kenapa / Tujuan**                                                                                               |
| ------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1      | **Sort (Global Sorting per Kolom/Kartu)**                           | Tombol `Sort` di navbar atas. Dropdown → `Sort by A–Z`, `Recently Added`, `Most Used`. Berlaku untuk semua card di kolom terpilih                             | Supaya user bisa rapikan isi bookmark/kanban secara cepat & konsisten tanpa drag manual                           |
| 2      | **Collapse & Expand All Subfolder / Subgroup**                      | Tambah tombol `Collapse All` dan `Expand All` di atas setiap kolom. Icon kecil (▾ / ▸) muncul di folder untuk buka/tutup subfolder                            | User bisa sembunyikan semua isi folder sekaligus → UI lebih ringkas, load lebih cepat                             |
| 3      | **Calendar API – Kanban Card = Task + Deadline (T-15 / T+15 days)** | Setiap card bisa tarik event dari Calendar API → tampilkan event 15 hari sebelum & 15 hari sesudah (T-15/T+15). Format mini-card: `📅 Title – dd/mm – Status` | Sync antara to-do (kanban) dan real schedule/calendar → tidak ada task kelewat deadline                           |
| 4      | **Task Range View (Card Auto-filter per Range 15 Hari)**            | Tambah toggle di atas kolom: `Show Calendar Tasks (±15 days)`. Ketika aktif, card dalam kolom hanya tampilkan task/event yg deadline dalam range 15 hari      | Biar setiap kolom bisa jadi timeline aktif – fokus pada tugas yg relevan waktunya, bukan cuma list bookmark biasa |


## Previews
![UI Utama](./Sketch Images/ide01.jpg)