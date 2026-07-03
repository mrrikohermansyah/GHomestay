import { firebaseConfig } from "./firebaseConfig.js";
import {
  createToast,
  confirmDialog,
  formatCurrency,
  parseCurrency,
} from "./utils.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const logoutButton = document.getElementById("logoutButton");
const createHomestayButton = document.getElementById("createHomestayButton");
const homestayTable = document.getElementById("homestayTable");
const bookingTable = document.getElementById("bookingTable");
const statHomestay = document.getElementById("statHomestay");
const statBooking = document.getElementById("statBooking");
const statPending = document.getElementById("statPending");
const chartHomestay = document.getElementById("chartHomestay");
const chartBooking = document.getElementById("chartBooking");
const chartPending = document.getElementById("chartPending");
const barHomestay = document.getElementById("barHomestay");
const barBooking = document.getElementById("barBooking");
const barPending = document.getElementById("barPending");
const homestayFormModal = document.getElementById("homestayFormModal");
const closeHomestayModal = document.getElementById("closeHomestayModal");
const homestayModalTitle = document.getElementById("homestayModalTitle");
const homestayName = document.getElementById("homestayName");
const homestayDescription = document.getElementById("homestayDescription");
const homestayLocation = document.getElementById("homestayLocation");
const homestayPrice = document.getElementById("homestayPrice");
const homestayCapacity = document.getElementById("homestayCapacity");
const homestayStatus = document.getElementById("homestayStatus");
const homestayFacilities = document.getElementById("homestayFacilities");
const homestayImageUrl = document.getElementById("homestayImage");
const homestayImageWarning = document.getElementById("homestayImageWarning");
const homestayImagePreview = document.getElementById("homestayImagePreview");
const homestayImagePreviewImg = document.getElementById(
  "homestayImagePreviewImg",
);
const saveHomestayButton = document.getElementById("saveHomestayButton");
const homestayShowInHero = document.getElementById("homestayShowInHero");

let userProfile = null;
let homestays = [];
let bookings = [];
let editingHomestayId = null;

function getPrimaryImage(images) {
  if (Array.isArray(images)) {
    return images[0] || "";
  }
  if (typeof images === "string") {
    return images;
  }
  return "";
}

async function fetchUserProfile(uid) {
  const userSnap = await getDoc(doc(db, "users", uid));
  return userSnap.exists() ? userSnap.data() : null;
}

async function requireAdmin(user) {
  if (!user) {
    window.location.href = "index.html";
    return false;
  }

  userProfile = await fetchUserProfile(user.uid);
  if (!userProfile || userProfile.role !== "admin") {
    createToast("Akses admin diperlukan.", "error");
    window.location.href = "index.html";
    return false;
  }

  return true;
}

logoutButton.addEventListener("click", async () => {
  const confirmed = await confirmDialog({
    title: "Konfirmasi Logout",
    message: "Apakah Anda yakin ingin logout dari admin dashboard?",
    confirmText: "Logout",
    cancelText: "Batal",
  });
  if (!confirmed) return;
  await signOut(auth);
  window.location.href = "index.html";
});
createHomestayButton.addEventListener("click", () => openHomestayForm());
closeHomestayModal.addEventListener("click", () =>
  homestayFormModal.classList.add("hidden"),
);

function formatCurrencyInput(input) {
  const cursorPosition = input.selectionStart || 0;
  const digitsBeforeCursor = (
    input.value.slice(0, cursorPosition).match(/\d/g) || []
  ).length;
  const raw = input.value.replace(/\D/g, "");
  const formatted = raw ? formatCurrency(raw) : "";
  input.value = formatted;

  let newCursor = 0;
  if (formatted) {
    let digitsSeen = 0;
    for (let i = 0; i < formatted.length; i += 1) {
      if (/\d/.test(formatted[i])) {
        digitsSeen += 1;
        if (digitsSeen === digitsBeforeCursor) {
          newCursor = i + 1;
          break;
        }
      }
    }
    if (digitsBeforeCursor === 0) newCursor = 0;
    if (newCursor === 0 && digitsBeforeCursor > 0) newCursor = formatted.length;
  }

  input.setSelectionRange(newCursor, newCursor);
}

homestayPrice.addEventListener("focus", () => {
  const value = parseCurrency(homestayPrice.value);
  homestayPrice.value = value ? String(value) : "";
  setTimeout(() => {
    const len = homestayPrice.value.length;
    homestayPrice.setSelectionRange(len, len);
  }, 0);
});
homestayPrice.addEventListener("input", () =>
  formatCurrencyInput(homestayPrice),
);
homestayPrice.addEventListener("blur", () => {
  const value = parseCurrency(homestayPrice.value);
  homestayPrice.value = value ? formatCurrency(value) : "";
});
homestayImageUrl.addEventListener("input", updateImagePreview);
homestayImageUrl.addEventListener("blur", updateImagePreview);
saveHomestayButton.addEventListener("click", saveHomestay);

function isValidAbsoluteUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (err) {
    return false;
  }
}

function updateImagePreview() {
  const rawUrl = homestayImageUrl.value.trim();
  const normalizedUrl = normalizeImageUrl(rawUrl);
  const isValidUrl = normalizedUrl && isValidAbsoluteUrl(normalizedUrl);
  console.log("admin preview normalize", { rawUrl, normalizedUrl, isValidUrl });
  if (!normalizedUrl || !isValidUrl) {
    homestayImagePreview.classList.add("hidden");
    homestayImagePreviewImg.src = "";
    homestayImageWarning.classList.add("hidden");
    return;
  }

  const fallbackUrls = [];
  if (normalizedUrl.includes("drive.google.com/uc?export=download&id=")) {
    const id = normalizedUrl.match(/\bid=([^&]+)/)?.[1];
    if (id) {
      fallbackUrls.push(`https://drive.google.com/thumbnail?id=${id}&sz=2048`);
    }
    fallbackUrls.push(normalizedUrl.replace("export=download", "export=view"));
  }
  if (normalizedUrl.includes("drive.google.com/uc?export=view&id=")) {
    const id = normalizedUrl.match(/\bid=([^&]+)/)?.[1];
    if (id) {
      fallbackUrls.push(`https://drive.google.com/thumbnail?id=${id}&sz=2048`);
    }
    fallbackUrls.push(normalizedUrl.replace("export=view", "export=download"));
  }
  if (
    normalizedUrl.includes("drive.usercontent.google.com/download?id=") ||
    normalizedUrl.includes("usercontent.google.com/download?id=")
  ) {
    const match = normalizedUrl.match(/[\?&]id=([^&]+)/);
    if (match) {
      const id = match[1];
      fallbackUrls.push(`https://drive.google.com/thumbnail?id=${id}&sz=1024`);
      fallbackUrls.push(`https://drive.google.com/uc?export=download&id=${id}`);
    }
  }
  if (normalizedUrl.includes("drive.google.com/uc?export=view&id=")) {
    fallbackUrls.push(normalizedUrl.replace("export=view", "export=download"));
  }
  if (normalizedUrl.includes("drive.google.com/uc?export=download&id=")) {
    fallbackUrls.push(normalizedUrl.replace("export=download", "export=view"));
  }

  const stopPreview = () => {
    homestayImagePreview.classList.add("hidden");
    homestayImagePreviewImg.src = "";
    homestayImageWarning.classList.remove("hidden");
  };

  const tryLoad = (url, index = 0) => {
    console.log("admin preview tryLoad", {
      url,
      index,
      fallbackCount: fallbackUrls.length,
    });
    if (!isValidAbsoluteUrl(url)) {
      stopPreview();
      return;
    }

    const testImage = new Image();
    testImage.onload = () => {
      console.log("admin preview loaded", { url });
      homestayImagePreviewImg.src = url;
      homestayImagePreview.classList.remove("hidden");
      homestayImageWarning.classList.add("hidden");
    };
    testImage.onerror = () => {
      console.log("admin preview load failed", { url, index });
      if (index < fallbackUrls.length) {
        tryLoad(fallbackUrls[index], index + 1);
        return;
      }
      stopPreview();
    };
    testImage.src = url;
  };

  homestayImageWarning.classList.add("hidden");
  homestayImagePreview.classList.add("hidden");
  homestayImagePreviewImg.src = "";
  tryLoad(normalizedUrl);
}

function createSectionCard(title, value, color) {
  return `
    <div class="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <p class="text-sm uppercase tracking-[0.24em] text-slate-500">${title}</p>
      <p class="mt-4 text-3xl font-semibold text-slate-900">${value}</p>
    </div>
  `;
}

function renderHomestayRows() {
  homestayTable.innerHTML = "";
  if (!homestays.length) {
    homestayTable.innerHTML =
      '<div class="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">' +
      '<div class="text-5xl mb-4">🏠</div>' +
      '<p class="text-lg font-medium text-slate-700 mb-2">Belum ada homestay</p>' +
      '<p class="text-sm text-slate-500">Tambahkan homestay baru untuk memulai</p>' +
      "</div>";
    return;
  }

  homestays.forEach((item) => {
    const row = document.createElement("div");
    const primaryImage = getPrimaryImage(item.images);
    row.className =
      "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md";
    row.innerHTML = `
      <div class="flex flex-col sm:flex-row">
        <div class="sm:w-48 h-48 sm:h-auto flex-shrink-0">
          <img src="${primaryImage || "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80"}" alt="${item.name}" class="w-full h-full object-cover">
        </div>
        <div class="flex-1 p-6">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <p class="text-xl font-semibold text-slate-900">${item.name}</p>
                ${item.showInHero ? '<span class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"><span>⭐</span> Hero</span>' : ""}
                <span class="inline-flex items-center gap-1 rounded-full ${item.status === "Ready" ? "bg-emerald-100 text-emerald-700" : item.status === "Booked" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"} px-3 py-1 text-xs font-semibold">${item.status}</span>
              </div>
              <p class="text-sm text-slate-500 mb-2">📍 ${item.location}</p>
              <p class="text-sm text-slate-600 mb-3 line-clamp-2">${item.description}</p>
              <div class="flex flex-wrap gap-2 mb-3">
                ${
                  item.facilities
                    ?.slice(0, 4)
                    .map(
                      (f) =>
                        `<span class="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">${f}</span>`,
                    )
                    .join("") || ""
                }
              </div>
              <p class="text-lg font-bold text-slate-900">${formatCurrency(item.price)} <span class="text-sm font-normal text-slate-500">/ malam</span></p>
            </div>
            <div class="flex flex-col gap-2">
              <button data-id="${item.id}" class="editHomestay inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800 hover:shadow-md">
                <span>✏️</span> Edit
              </button>
              <button data-id="${item.id}" class="deleteHomestay inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm font-semibold text-rose-600 transition-all duration-200 hover:bg-rose-50 hover:border-rose-200">
                <span>🗑️</span> Hapus
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    homestayTable.appendChild(row);
  });

  homestayTable.querySelectorAll(".editHomestay").forEach((button) => {
    button.addEventListener("click", () => openHomestayForm(button.dataset.id));
  });

  homestayTable.querySelectorAll(".deleteHomestay").forEach((button) => {
    button.addEventListener("click", () => deleteHomestay(button.dataset.id));
  });
}

function renderBookingRows() {
  bookingTable.innerHTML = "";
  if (!bookings.length) {
    bookingTable.innerHTML =
      '<div class="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">' +
      '<div class="text-5xl mb-4">📅</div>' +
      '<p class="text-lg font-medium text-slate-700 mb-2">Belum ada booking</p>' +
      '<p class="text-sm text-slate-500">Booking akan muncul di sini ketika ada yang memesan</p>' +
      "</div>";
    return;
  }

  bookings.forEach((item) => {
    const homestay = homestays.find(
      (homestay) => homestay.id === item.homestayId,
    ) || { name: "Homestay tidak tersedia", location: "-" };
    const row = document.createElement("div");
    row.className =
      "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md p-6";
    row.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex-1">
          <p class="text-lg font-semibold text-slate-900 mb-1">${homestay.name}</p>
          <p class="text-sm text-slate-500 mb-2">📍 ${homestay.location}</p>
          <div class="flex items-center gap-4 text-sm">
            <span class="inline-flex items-center gap-1 text-slate-600">
              <span>📅</span> ${item.checkIn} - ${item.checkOut}
            </span>
          </div>
        </div>
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <span class="inline-flex items-center justify-center gap-1 rounded-xl px-4 py-2 text-sm font-semibold ${item.status === "approved" ? "bg-emerald-100 text-emerald-700" : item.status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}">
            ${item.status === "approved" ? "✅" : item.status === "rejected" ? "❌" : "⏳"} ${item.status}
          </span>
          <div class="flex gap-2">
            ${
              item.status === "pending"
                ? `
              <button data-id="${item.id}" data-action="approve" class="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-emerald-700 hover:shadow-md">
                ✅ Approve
              </button>
              <button data-id="${item.id}" data-action="reject" class="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-rose-700 hover:shadow-md">
                ❌ Reject
              </button>
            `
                : ""
            }
            <button data-id="${item.id}" class="deleteBooking inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-50 hover:border-slate-300">
              🗑️ Hapus
            </button>
          </div>
        </div>
      </div>
    `;
    bookingTable.appendChild(row);
  });

  bookingTable.querySelectorAll("button[data-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const bookingId = button.dataset.id;
      const action = button.dataset.action;
      await updateBookingStatus(
        bookingId,
        action === "approve" ? "approved" : "rejected",
      );
    });
  });
  bookingTable.querySelectorAll(".deleteBooking").forEach((button) => {
    button.addEventListener("click", async () => {
      const bookingId = button.dataset.id;
      await deleteBooking(bookingId);
    });
  });
}

async function loadHomestays() {
  const snapshot = await getDocs(
    query(collection(db, "homestays"), orderBy("createdAt", "desc")),
  );
  homestays = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  renderHomestayRows();
  updateStats();
}

async function loadBookings() {
  const snapshot = await getDocs(
    query(collection(db, "bookings"), orderBy("createdAt", "desc")),
  );
  bookings = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  renderBookingRows();
  updateStats();
}

function updateStats() {
  const totalHomestays = homestays.length;
  const totalBookings = bookings.length;
  const pendingCount = bookings.filter(
    (item) => item.status === "pending",
  ).length;

  statHomestay.textContent = totalHomestays;
  statBooking.textContent = totalBookings;
  statPending.textContent = pendingCount;
  chartHomestay.textContent = `${totalHomestays}`;
  chartBooking.textContent = `${totalBookings}`;
  chartPending.textContent = `${pendingCount}`;

  const max = Math.max(totalHomestays, totalBookings, pendingCount, 1);
  barHomestay.style.width = `${Math.round((totalHomestays / max) * 100)}%`;
  barBooking.style.width = `${Math.round((totalBookings / max) * 100)}%`;
  barPending.style.width = `${Math.round((pendingCount / max) * 100)}%`;
}

async function openHomestayForm(id = null) {
  editingHomestayId = id;
  if (id) {
    const item = homestays.find((homestay) => homestay.id === id);
    homestayModalTitle.textContent = "Edit Homestay";
    homestayName.value = item.name;
    homestayDescription.value = item.description;
    homestayLocation.value = item.location;
    homestayPrice.value = formatCurrency(item.price);
    homestayCapacity.value = item.capacity ? String(item.capacity) : "";
    homestayStatus.value = item.status || "Ready";
    homestayFacilities.value = item.facilities?.join(", ") || "";
    homestayShowInHero.checked = item.showInHero || false;
    homestayImageUrl.value = getPrimaryImage(item.images);
    updateImagePreview();
  } else {
    homestayModalTitle.textContent = "Tambah Homestay";
    homestayName.value = "";
    homestayDescription.value = "";
    homestayLocation.value = "";
    homestayPrice.value = "";
    homestayFacilities.value = "";
    homestayShowInHero.checked = false; // Default to false
    homestayImageUrl.value = "";
    homestayImageWarning.classList.add("hidden");
    updateImagePreview();
  }
  homestayFormModal.classList.remove("hidden");
}

async function saveHomestay() {
  const name = homestayName.value.trim();
  const description = homestayDescription.value.trim();
  const locationValue = homestayLocation.value.trim();
  const priceValue = parseCurrency(homestayPrice.value);
  const capacityValue = parseInt(homestayCapacity.value.trim(), 10);
  const statusValue = homestayStatus.value;
  const facilities = homestayFacilities.value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const imageUrl = homestayImageUrl.value.trim();
  const showInHeroValue = homestayShowInHero.checked;

  if (
    !name ||
    !description ||
    !locationValue ||
    !priceValue ||
    !capacityValue ||
    facilities.length === 0
  ) {
    createToast("Lengkapi semua field dengan benar.", "error");
    return;
  }

  const normalizedImageUrl = imageUrl ? normalizeImageUrl(imageUrl) : "";
  if (imageUrl && !normalizedImageUrl) {
    createToast(
      "Masukkan URL gambar valid atau tautan Google Drive yang dapat diakses.",
      "error",
    );
    return;
  }

  try {
    if (editingHomestayId) {
      const homestayRef = doc(db, "homestays", editingHomestayId);
      const data = {
        name,
        description,
        location: locationValue,
        price: priceValue,
        capacity: capacityValue,
        status: statusValue,
        facilities,
        showInHero: showInHeroValue,
      };
      if (normalizedImageUrl) {
        data.images = [normalizedImageUrl];
      }
      await updateDoc(homestayRef, data);
      createToast("Homestay berhasil diperbarui.");
    } else {
      await addDoc(collection(db, "homestays"), {
        name,
        description,
        location: locationValue,
        price: priceValue,
        capacity: capacityValue,
        status: statusValue,
        facilities,
        images: normalizedImageUrl ? [normalizedImageUrl] : [],
        showInHero: showInHeroValue,
        createdAt: serverTimestamp(),
      });
      createToast("Homestay berhasil dibuat.");
    }
    homestayFormModal.classList.add("hidden");
    await loadHomestays();
  } catch (error) {
    createToast("Gagal menyimpan homestay: " + error.message, "error");
  }
}

async function deleteHomestay(id) {
  if (!confirm("Hapus homestay ini?")) return;
  try {
    await deleteDoc(doc(db, "homestays", id));
    createToast("Homestay dihapus.");
    await loadHomestays();
  } catch (error) {
    createToast("Gagal menghapus homestay: " + error.message, "error");
  }
}

async function deleteBooking(id) {
  const confirmed = await confirmDialog({
    title: "Hapus Booking",
    message:
      "Apakah Anda yakin ingin menghapus booking ini? Aksi ini tidak dapat dikembalikan.",
    confirmText: "Hapus",
    cancelText: "Batal",
  });
  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "bookings", id));
    createToast("Booking berhasil dihapus.");
    await loadBookings();
  } catch (error) {
    createToast("Gagal menghapus booking: " + error.message, "error");
  }
}

function extractDriveFileId(url) {
  const match = url.match(/\/file\/d\/([^\/\?]+)|[\?&]id=([^&]+)/);
  return match ? match[1] || match[2] : null;
}

function normalizeImageUrl(url) {
  const trimmed = (url || "").trim();
  if (!trimmed) return "";

  let normalized = trimmed;
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  try {
    const parsed = new URL(normalized);
    const hostname = parsed.hostname.toLowerCase();

    if (
      hostname.includes("drive.google.com") ||
      hostname.includes("docs.google.com")
    ) {
      const id = extractDriveFileId(normalized);
      if (id) {
        return `https://drive.google.com/uc?export=view&id=${id}`;
      }
      if (parsed.pathname.includes("/uc")) {
        return normalized;
      }
      if (parsed.pathname.includes("/open")) {
        const openId = parsed.searchParams.get("id");
        return openId
          ? `https://drive.google.com/uc?export=view&id=${openId}`
          : normalized;
      }
    }

    if (
      hostname.includes("drive.usercontent.google.com") ||
      hostname.includes("usercontent.google.com")
    ) {
      const id = extractDriveFileId(normalized);
      return id
        ? `https://drive.google.com/uc?export=download&id=${id}`
        : normalized;
    }

    if (
      hostname.includes("googleusercontent.com") ||
      hostname.includes("dropbox.com") ||
      hostname.includes("imgur.com") ||
      hostname.includes("i.ibb.co") ||
      hostname.includes("cdn")
    ) {
      return normalized;
    }

    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return normalized;
    }
  } catch (err) {
    return "";
  }

  return "";
}

function isDateRangeOverlapping(startA, endA, startB, endB) {
  return new Date(startA) < new Date(endB) && new Date(startB) < new Date(endA);
}

async function updateBookingStatus(id, status) {
  try {
    if (status === "approved") {
      const booking = bookings.find((item) => item.id === id);
      if (booking) {
        const conflict = bookings.some(
          (item) =>
            item.id !== id &&
            item.homestayId === booking.homestayId &&
            item.status === "approved" &&
            isDateRangeOverlapping(
              booking.checkIn,
              booking.checkOut,
              item.checkIn,
              item.checkOut,
            ),
        );
        if (conflict) {
          createToast(
            "Tidak dapat approve booking ini karena sudah ada booking approved yang bentrok.",
            "error",
          );
          return;
        }
      }
    }

    await updateDoc(doc(db, "bookings", id), { status });
    createToast("Status booking diperbarui.");
    await loadBookings();
  } catch (error) {
    createToast("Gagal memperbarui status: " + error.message, "error");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    const isAdmin = await requireAdmin(user);
    if (isAdmin) {
      await loadHomestays();
      await loadBookings();
    }
  });
});
