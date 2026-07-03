# Homestay Booking System

A minimal full-stack web application built with HTML, Tailwind CSS, JavaScript, and Firebase. This app includes user authentication, Firestore data management, Firebase Storage image uploads, and an admin dashboard.

## Struktur Proyek

- `index.html` — UI untuk user/customer, landing page, daftar homestay, detail, booking, dan profil.
- `admin.html` — dashboard admin untuk CRUD homestay, melihat booking, dan mengelola status.
- `js/firebaseConfig.example.js` — contoh file environment Firebase.
- `js/app.js` — logika frontend user/customer.
- `js/admin.js` — logika admin dashboard.
- `js/utils.js` — utilitas umum dan toast notification.
- `assets/css/style.css` — tambahan gaya custom.
- `.gitignore` — menyembunyikan file konfigurasi sensitif.

## Setup Firebase

1. Buka [Firebase Console](https://console.firebase.google.com/) dan buat project baru.
2. Tambahkan aplikasi web pada project.
3. Aktifkan `Authentication > Sign-in method > Email/Password`.
4. Buat Firestore database dalam mode `Production` atau `Test`.
5. Buat `Storage` dan izinkan file image upload.
6. Salin konfigurasi Firebase dan buat file baru `js/firebaseConfig.js`.

### `js/firebaseConfig.js`

```js
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

7. Pastikan `js/firebaseConfig.js` ditambahkan ke `.gitignore`.

## Struktur Firestore

- `users` collection
  - `uid`
  - `name`
  - `email`
  - `role` (`user` atau `admin`)

- `homestays` collection
  - `name`
  - `description`
  - `price`
  - `images` (array URL)
  - `location`
  - `facilities` (array string)
  - `createdAt`

- `bookings` collection
  - `userId`
  - `homestayId`
  - `checkIn`
  - `checkOut`
  - `status` (`pending`, `approved`, `rejected`)
  - `createdAt`

## Cara deploy ke GitHub Pages

1. Commit semua file ke repository Git.
2. Buat branch `main` atau `master`.
3. Push ke GitHub.
4. Buka `Settings > Pages` di repository GitHub.
5. Pilih sumber `Deploy from a branch` dan pilih branch utama.
6. Pastikan folder `/` (root) dipilih.
7. Simpan, lalu tunggu GitHub Pages selesai deploy.

> Ketika menggunakan GitHub Pages sebagai SPA, pastikan navigasi menggunakan `hash` URL (contoh: `#/property/abc`).

## Data Dummy untuk Testing

Gunakan Firestore dan tambahkan data collection `homestays` dengan struktur berikut:

```json
{
  "name": "Riverside Minimalist Homestay",
  "description": "Homestay modern dengan pemandangan sungai, akses cepat ke kota, dan layanan check-in fleksibel.",
  "price": 420000,
  "location": "Ubud, Bali",
  "images": ["https://example.com/homestay-1.jpg"],
  "facilities": ["Wi-Fi", "AC", "Dapur", "Parkir"]
}
```

## Cara Integrasi Firebase

- `index.html` dan `admin.html` memanggil modul Firebase JS SDK.
- `js/app.js` mengelola login/register, daftar homestay, detail booking, dan user profile.
- `js/admin.js` mengelola CRUD homestay, upload gambar, dan persetujuan booking.
- Semua koneksi Firebase dikendalikan dari `js/firebaseConfig.js`.

## Catatan Penting

- Anda perlu membuat akun admin secara manual di Firestore dengan `role = "admin"`.
- Pastikan `js/firebaseConfig.js` tidak di-commit.
- `admin.html` hanya dapat diakses oleh pengguna dengan peran `admin`.

---

## Fitur Tambahan (Bonus)

- Filter nama dan lokasi homestay.
- Sorting harga naik/turun.
- Dark mode toggle.
- Chart statistik admin sederhana.

# GHomestay
