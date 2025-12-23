# GemaWeb Cast 🎙️

**GemaWeb Cast** adalah aplikasi web broadcasting profesional yang berjalan sepenuhnya di browser. Terinspirasi oleh aplikasi desktop legendaris **BUTT (Broadcast Using This Tool)**, GemaWeb Cast membawa fungsionalitas broadcasting ke era web modern tanpa perlu instalasi perangkat lunak tambahan.

Aplikasi ini dirancang untuk penyiar radio online, podcaster, dan jurnalis warga yang membutuhkan solusi streaming audio berkualitas tinggi, portabel, dan didukung oleh kecerdasan buatan (AI).

![License](https://img.shields.io/badge/license-GPLv3-blue.svg)
![Tech](https://img.shields.io/badge/tech-React%20%7C%20WebAudio%20%7C%20Cloudflare-orange)

## ✨ Fitur Utama

*   **Tanpa Instalasi**: Berjalan langsung di browser modern (Chrome, Edge, Firefox).
*   **Protokol Streaming**: Mendukung **Icecast** dan **Shoutcast** (v1 & v2).
*   **Kualitas Audio**:
    *   Codec: MP3, AAC, OGG, OPUS.
    *   Bitrate: 8kbps hingga 320kbps.
*   **Audio Processing (DSP)**:
    *   **5-Band Equalizer**: Sesuaikan frekuensi suara Anda.
    *   **Compressor/Limiter**: Menjaga level audio tetap konsisten dan keras.
    *   **VU Meter**: Visualisasi level input real-time.
*   **Perekaman Lokal**: Rekam siaran Anda ke perangkat lokal (format WebM/OPUS/MP3) secara bersamaan saat streaming.
*   **AI Copilot (Powered by Google Gemini)**: Asisten cerdas untuk membuat naskah siaran, intro lagu, dan saran topik secara instan.
*   **Cloud Relay**: Dukungan native untuk **Cloudflare Workers** untuk mem-proxy koneksi WebSocket ke server radio non-SSL (HTTP).
*   **Direct HTTP**: Mode eksperimental untuk koneksi langsung ke server yang mendukung CORS/SSL.
*   **Bilingual**: Mendukung Bahasa Inggris dan Bahasa Indonesia.

## 🚀 Memulai (Local Development)

### Prasyarat
*   Node.js (v18 atau terbaru)
*   NPM

### Instalasi

1.  Clone repository ini:
    ```bash
    git clone https://github.com/username/gemaweb-cast.git
    cd gemaweb-cast
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  **Konfigurasi API Key (Untuk Fitur AI)**:
    Buat file `.env` di root folder dan tambahkan API Key dari Google AI Studio:
    ```env
    API_KEY=your_google_gemini_api_key_here
    ```

4.  Jalankan aplikasi:
    ```bash
    npm start
    ```
    Aplikasi akan berjalan di `http://localhost:3000`.

## ☁️ Deployment (Cloudflare Pages)

Aplikasi ini memiliki fitur backend `functions/stream.ts` yang dirancang khusus untuk **Cloudflare Pages**. Fitur ini berfungsi sebagai TCP-to-WebSocket bridge, memungkinkan browser (yang hanya support WebSocket/HTTP) untuk berkomunikasi dengan server Icecast (yang menggunakan raw TCP streaming).

1.  Pastikan Anda memiliki akun Cloudflare.
2.  Install Wrangler (Cloudflare CLI): `npm install -g wrangler`
3.  Login ke Cloudflare: `wrangler login`
4.  Deploy:
    ```bash
    npm run build
    npx wrangler pages deploy build
    ```
5.  **Penting**: Pastikan direktori `functions/` ikut terupload atau dikonfigurasi di dashboard Cloudflare Pages agar fitur streaming berfungsi maksimal.

## 📖 Panduan Penggunaan Singkat

1.  **Audio Setup**:
    *   Buka menu **Audio Devices**.
    *   Pilih Input (Microphone/Mixer).
    *   Atur **Input Gain** hingga VU Meter menyentuh warna hijau/kuning.

2.  **Server Setup**:
    *   Buka menu **Server Profiles**.
    *   Klik **+ NEW**.
    *   Masukkan detail server Icecast/Shoutcast Anda (Host, Port, Password, Mount).
    *   Simpan profil.

3.  **Connection Method**:
    *   Jika menggunakan versi Cloudflare, biarkan di mode **Cloud Relay**.
    *   Jika server radio Anda support HTTPS & CORS, Anda bisa mencoba mode **Direct HTTP** (Advanced).

4.  **Start Broadcast**:
    *   Kembali ke Dashboard.
    *   Klik tombol **START STREAM**.
    *   Indikator "ON AIR" akan menyala jika terhubung.

## 🛠️ Teknologi

*   **Frontend**: React 19, Tailwind CSS.
*   **Audio**: Web Audio API (Native Browser API).
*   **AI**: Google GenAI SDK (`@google/genai`).
*   **Backend/Proxy**: Cloudflare Pages Functions (Connect API).

## 📄 Lisensi

Proyek ini didistribusikan di bawah lisensi **GNU GPL v3**. Lihat file `LICENSE.md` untuk detail lengkap.

Anda bebas menggunakan, memodifikasi, dan mendistribusikan ulang kode ini, asalkan kode sumber (source code) dari versi modifikasi tersebut juga dibuka untuk publik di bawah lisensi yang sama.

---
*Dibuat dengan ❤️ oleh Komunitas AI Projek.*
