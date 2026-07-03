import { firebaseConfig } from "./firebaseConfig.js";
import {
  createToast,
  formatCurrency,
  formatDate,
  confirmDialog,
} from "./utils.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const authToggleButton = document.getElementById("authToggleButton");
const showMyBookings = document.getElementById("showMyBookings");
const closeBookingSection = document.getElementById("closeBookingSection");
const authPanel = document.getElementById("authPanel");
const closeAuthPanel = document.getElementById("closeAuthPanel");
const loginButton = document.getElementById("loginButton");
const registerButton = document.getElementById("registerButton");
const homestayGrid = document.getElementById("homestayGrid");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const detailModal = document.getElementById("detailModal");
const closeModal = document.getElementById("closeModal");
const detailImage = document.getElementById("detailImage");
const detailLocation = document.getElementById("detailLocation");
const detailName = document.getElementById("detailName");
const detailPrice = document.getElementById("detailPrice");
const detailDescription = document.getElementById("detailDescription");
const detailFacilities = document.getElementById("detailFacilities");
const heroImage = document.getElementById("heroImage");
const heroName = document.getElementById("heroName");
const heroLocation = document.getElementById("heroLocation");
const heroStatus = document.getElementById("heroStatus");
const heroDescription = document.getElementById("heroDescription");
const heroCapacity = document.getElementById("heroCapacity");
const heroFacility = document.getElementById("heroFacility");
const heroPrice = document.getElementById("heroPrice");
const heroPrev = document.getElementById("heroPrev");
const heroNext = document.getElementById("heroNext");
const heroIndicators = document.getElementById("heroIndicators");
const heroCard = document.getElementById("heroCard");
const heroPlaceholder = document.getElementById("heroPlaceholder");
const heroCarousel = document.getElementById("heroCarousel");

let currentHeroIndex = 0;
let heroAutoRotateInterval = null;
const checkinDate = document.getElementById("checkinDate");
const checkoutDate = document.getElementById("checkoutDate");
const bookButton = document.getElementById("bookButton");
const bookingSection = document.getElementById("bookingSection");
const bookingList = document.getElementById("bookingList");
const bookingEmptyState = document.getElementById("bookingEmptyState");
const adminLink = document.getElementById("adminLink");
const adminLinkMobile = document.getElementById("adminLinkMobile");
const installButton = document.getElementById("installButton");
let deferredPrompt = null;

const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const googleLoginButton = document.getElementById("googleLoginButton");
const registerName = document.getElementById("registerName");
const registerEmail = document.getElementById("registerEmail");
const registerPassword = document.getElementById("registerPassword");

let homestays = [];
let heroHomestays = [];
let selectedHomestay = null;
let selectedHomestayBookings = [];
let currentUser = null;
let currentUserProfile = null;
let selectedCheckInDate = "";
let selectedCheckOutDate = "";

// Utility functions
function parseISODate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isoDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateString, days) {
  const date = parseISODate(dateString);
  date.setDate(date.getDate() + days);
  return isoDateString(date);
}

function bookedDatesArray() {
  const dates = new Set();
  selectedHomestayBookings
    .filter((b) => b.status !== "rejected")
    .forEach((booking) => {
      let current = parseISODate(booking.checkIn);
      const end = parseISODate(booking.checkOut);
      while (current <= end) {
        dates.add(isoDateString(current));
        current.setDate(current.getDate() + 1);
      }
    });
  return Array.from(dates);
}

let fpCheckin = null;
let fpCheckout = null;

function initFlatpickr() {
  if (typeof flatpickr === "undefined") return;

  if (fpCheckin) fpCheckin.destroy();
  if (fpCheckout) fpCheckout.destroy();

  fpCheckin = flatpickr(checkinDate, {
    dateFormat: "Y-m-d",
    disable: [(date) => isDateUnavailable(isoDateString(date))],
    minDate: checkinDate.min || null,
    onChange(selectedDates, dateStr) {
      selectedCheckInDate = dateStr || "";
      if (dateStr) {
        const minCheckout = addDays(dateStr, 1);
        checkoutDate.min = minCheckout;
        fpCheckout.set("minDate", minCheckout);
        fpCheckout.set("disable", [
          (date) => isDateUnavailable(isoDateString(date)),
        ]);
        checkoutDate.disabled = false;
        if (
          checkoutDate.value &&
          parseISODate(checkoutDate.value) <= parseISODate(dateStr)
        ) {
          checkoutDate.value = "";
          selectedCheckOutDate = "";
          fpCheckout.clear();
        }
      } else {
        checkoutDate.min = checkoutDate.min || null;
        fpCheckout.set("minDate", null);
        fpCheckout.set("disable", [
          (date) => isDateUnavailable(isoDateString(date)),
        ]);
        checkoutDate.disabled = true;
        checkoutDate.value = "";
        selectedCheckOutDate = "";
        fpCheckout.clear();
      }
    },
  });

  fpCheckout = flatpickr(checkoutDate, {
    dateFormat: "Y-m-d",
    disable: [(date) => isDateUnavailable(isoDateString(date))],
    minDate: checkoutDate.min || null,
    onChange(selectedDates, dateStr) {
      selectedCheckOutDate = dateStr || "";
      if (dateStr) {
        const maxCheckin = addDays(dateStr, -1);
        fpCheckin.set("maxDate", maxCheckin);
      } else {
        fpCheckin.set("maxDate", null);
      }
    },
  });
}

function getPrimaryImage(images) {
  if (Array.isArray(images)) {
    return images[0] || "";
  }
  if (typeof images === "string") {
    return images;
  }
  return "";
}

function extractDriveFileId(url) {
  const match = url.match(/\/file\/d\/([^\/\?]+)|[\?&]id=([^&]+)/);
  return match ? match[1] || match[2] : null;
}

function normalizeImageUrl(url) {
  // Clean up the URL first: remove any backticks, quotes, and extra whitespace
  let cleaned = (url || "")
    .trim()
    .replace(/^[`"']+|[`"']+$/g, "")
    .trim();
  if (!cleaned) return "";

  // Ensure we have a proper protocol
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }

  try {
    const parsed = new URL(cleaned);
    const hostname = parsed.hostname.toLowerCase();

    // Handle Google Drive URLs
    if (
      hostname.includes("drive.google.com") ||
      hostname.includes("docs.google.com") ||
      hostname.includes("drive.usercontent.google.com") ||
      hostname.includes("usercontent.google.com")
    ) {
      const id = extractDriveFileId(cleaned);
      if (id) {
        // Use the thumbnail URL with 1254px width (matching user's photo resolution)
        return `https://drive.google.com/thumbnail?id=${id}&sz=w1254`;
      }
    }

    // For other URLs, just use them as is
    return cleaned;
  } catch (err) {
    console.warn("Invalid URL:", url, err);
    return "";
  }
}

function applyImageFallback(img, url, fallbackUrl) {
  const normalized = normalizeImageUrl(url);
  // Clean up the fallback URL too
  const cleanFallback = normalizeImageUrl(fallbackUrl) || fallbackUrl;

  if (!normalized) {
    img.src = cleanFallback;
    return;
  }

  img.onerror = () => {
    img.onerror = null; // Prevent infinite loops
    img.src = cleanFallback;
  };

  img.src = normalized;
}

// Hero carousel functions
function updateHeroIndicators() {
  heroIndicators.innerHTML = "";
  if (heroHomestays.length <= 1) return;

  heroHomestays.forEach((_, index) => {
    const indicator = document.createElement("button");
    indicator.className = `h-2 w-2 rounded-full transition-all cursor-pointer ${
      index === currentHeroIndex ? "bg-slate-900 w-6" : "bg-slate-300"
    }`;
    indicator.addEventListener("click", () => goToHeroIndex(index));
    heroIndicators.appendChild(indicator);
  });
}

function renderFeaturedHomestay() {
  if (!heroHomestays.length) {
    heroPlaceholder.classList.remove("hidden");
    heroCarousel.classList.add("hidden");
    return;
  }

  heroPlaceholder.classList.add("hidden");
  heroCarousel.classList.remove("hidden");

  const featured = heroHomestays[currentHeroIndex];
  if (!featured) return;

  applyImageFallback(
    heroImage,
    getPrimaryImage(featured.images),
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
  );
  heroLocation.textContent = featured.location || "Stay modern";
  heroName.textContent = featured.name || "Homestay Tropis Bali";
  heroStatus.textContent = featured.status
    ? String(featured.status).replace(/^[a-z]/, (s) => s.toUpperCase())
    : "Ready";
  heroDescription.textContent =
    featured.description ||
    "Didesain untuk kenyamanan maksimal, cocok untuk liburan keluarga atau perjalanan kerja.";
  heroCapacity.textContent = featured.capacity
    ? `${featured.capacity} tamu`
    : "2 tamu";
  heroFacility.textContent = featured.facilities?.[0] || "A/C";
  heroPrice.textContent = featured.price
    ? formatCurrency(featured.price)
    : "IDR 300K";

  heroPrev.disabled = heroHomestays.length <= 1;
  heroNext.disabled = heroHomestays.length <= 1;

  updateHeroIndicators();
}

function goToHeroIndex(index) {
  currentHeroIndex = index;
  renderFeaturedHomestay();
  resetHeroAutoRotate();
}

function nextHero() {
  if (heroHomestays.length === 0) return;
  currentHeroIndex = (currentHeroIndex + 1) % heroHomestays.length;
  renderFeaturedHomestay();
}

function prevHero() {
  if (heroHomestays.length === 0) return;
  currentHeroIndex =
    (currentHeroIndex - 1 + heroHomestays.length) % heroHomestays.length;
  renderFeaturedHomestay();
}

function resetHeroAutoRotate() {
  if (heroAutoRotateInterval) {
    clearInterval(heroAutoRotateInterval);
  }
  if (heroHomestays.length > 1) {
    heroAutoRotateInterval = setInterval(nextHero, 5000);
  }
}

// Auth functions
async function fetchUserProfile(uid) {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    return userDoc.exists() ? userDoc.data() : null;
  } catch (error) {
    console.error("Fetch user profile error", error);
    createToast(
      "Gagal mengambil profil pengguna: " +
        (error.code ? error.code + ": " : "") +
        error.message,
      "error",
    );
    return null;
  }
}

async function ensureUserProfile(user, name = null) {
  try {
    const profileRef = doc(db, "users", user.uid);
    const profileSnap = await getDoc(profileRef);
    if (!profileSnap.exists()) {
      await setDoc(profileRef, {
        uid: user.uid,
        name: name || user.displayName || "Pengguna Baru",
        email: user.email,
        role: "user",
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Ensure user profile error", error);
  }
}

async function handleGoogleLogin() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    await ensureUserProfile(user);
    createToast("Login dengan Google berhasil");
    authPanel.classList.add("hidden");
    authPanel.classList.remove("flex");
  } catch (error) {
    console.error("Google login error", error);
    if (
      error.code === "auth/operation-not-supported-in-this-environment" ||
      error.code === "auth/popup-blocked" ||
      error.code === "auth/cancelled-popup-request"
    ) {
      try {
        createToast("Browser memblokir popup, menggunakan redirect.");
        await signInWithRedirect(auth, provider);
      } catch (redirectError) {
        console.error("Google redirect error", redirectError);
        createToast(
          "Gagal login dengan Google: " +
            (redirectError.code ? redirectError.code + ": " : "") +
            redirectError.message,
          "error",
        );
      }
    } else {
      createToast(
        "Gagal login dengan Google: " +
          (error.code ? error.code + ": " : "") +
          error.message,
        "error",
      );
    }
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function handleLogin() {
  const email = loginEmail.value.trim();
  const password = loginPassword.value.trim();
  if (!email || !password) {
    createToast("Email dan password wajib diisi", "error");
    return;
  }
  if (!isValidEmail(email)) {
    createToast("Email tidak valid", "error");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    createToast("Berhasil login");
    authPanel.classList.add("hidden");
    authPanel.classList.remove("flex");
    loginEmail.value = "";
    loginPassword.value = "";
  } catch (error) {
    console.error("Login error", error);
    createToast(
      "Gagal login: " + (error.code ? error.code + ": " : "") + error.message,
      "error",
    );
  }
}

function isStrongPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(
    password,
  );
}

async function handleRegister() {
  const name = registerName.value.trim();
  const email = registerEmail.value.trim();
  const password = registerPassword.value.trim();
  if (!name || !email || !password) {
    createToast("Lengkapi semua data pendaftaran", "error");
    return;
  }
  if (!isValidEmail(email)) {
    createToast("Email tidak valid", "error");
    return;
  }
  if (!isStrongPassword(password)) {
    createToast(
      "Password harus minimal 8 karakter dan berisi angka, huruf besar, huruf kecil, dan simbol",
      "error",
    );
    return;
  }

  try {
    const credentials = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    await setDoc(doc(db, "users", credentials.user.uid), {
      uid: credentials.user.uid,
      name,
      email,
      role: "user",
      createdAt: serverTimestamp(),
    });
    createToast("Registrasi berhasil. Silakan login.");
    registerName.value = "";
    registerEmail.value = "";
    registerPassword.value = "";
    authPanel.classList.add("hidden");
    authPanel.classList.remove("flex");
  } catch (error) {
    console.error("Register error", error);
    createToast(
      "Gagal daftar: " + (error.code ? error.code + ": " : "") + error.message,
      "error",
    );
  }
}

// Booking & date functions
function isDateRangeOverlapping(startA, endA, startB, endB) {
  return (
    parseISODate(startA) <= parseISODate(endB) &&
    parseISODate(startB) <= parseISODate(endA)
  );
}

function isDateInsideRange(date, start, end) {
  const d = parseISODate(date);
  return d >= parseISODate(start) && d <= parseISODate(end);
}

function isDateUnavailable(date) {
  return selectedHomestayBookings.some(
    (booking) =>
      booking.status !== "rejected" &&
      isDateInsideRange(date, booking.checkIn, booking.checkOut),
  );
}

function isRangeUnavailable(checkIn, checkOut) {
  return selectedHomestayBookings.some(
    (booking) =>
      booking.status !== "rejected" &&
      isDateRangeOverlapping(
        checkIn,
        checkOut,
        booking.checkIn,
        booking.checkOut,
      ),
  );
}

async function loadSelectedHomestayBookings(homestayId) {
  const snapshot = await getDocs(
    query(collection(db, "bookings"), where("homestayId", "==", homestayId)),
  );
  selectedHomestayBookings = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  try {
    initFlatpickr();
  } catch (e) {
    /* ignore if flatpickr not loaded */
  }
}

function validateDateSelection(event) {
  const input = event.target;
  const value = input.value;
  if (!value) return;

  if (input === checkinDate) {
    if (isDateUnavailable(value)) {
      createToast(
        "Tanggal check-in tersebut tidak tersedia. Pilih tanggal lain.",
        "error",
      );
      input.value = "";
      selectedCheckInDate = "";
      checkoutDate.disabled = true;
      checkoutDate.value = "";
      selectedCheckOutDate = "";
      fpCheckout?.clear();
      return;
    }
    selectedCheckInDate = value;
    selectedCheckOutDate = "";
    checkoutDate.disabled = false;
    const minCheckout = addDays(value, 1);
    checkoutDate.min = minCheckout;
    fpCheckout?.set("minDate", minCheckout);
    fpCheckout?.set("disable", bookedDatesArray());
    if (
      checkoutDate.value &&
      parseISODate(checkoutDate.value) <= parseISODate(value)
    ) {
      checkoutDate.value = "";
      selectedCheckOutDate = "";
      fpCheckout?.clear();
    }
  }

  if (input === checkoutDate) {
    if (!checkinDate.value) {
      createToast("Pilih tanggal check-in terlebih dahulu.", "error");
      checkoutDate.value = "";
      selectedCheckOutDate = "";
      return;
    }
    if (parseISODate(checkinDate.value) >= parseISODate(value)) {
      createToast("Tanggal check-in harus sebelum tanggal check-out.", "error");
      checkoutDate.value = "";
      selectedCheckOutDate = "";
      return;
    }
    selectedCheckOutDate = value;
  }

  const checkIn = checkinDate.value;
  const checkOut = checkoutDate.value;
  if (checkIn && checkOut && parseISODate(checkIn) >= parseISODate(checkOut)) {
    createToast("Tanggal check-out harus setelah check-in.", "error");
    checkoutDate.value = "";
    selectedCheckOutDate = "";
    return;
  }

  if (checkIn && checkOut && isRangeUnavailable(checkIn, checkOut)) {
    createToast(
      "Rentang tanggal tersebut bentrok dengan booking yang sudah ada. Pilih rentang lain.",
      "error",
    );
    checkoutDate.value = "";
    selectedCheckOutDate = "";
  }
}

async function hasOverlappingBooking(homestayId, checkIn, checkOut) {
  const snapshot = await getDocs(
    query(collection(db, "bookings"), where("homestayId", "==", homestayId)),
  );
  return snapshot.docs.some((doc) => {
    const booking = doc.data();
    if (booking.status === "rejected") return false;
    return isDateRangeOverlapping(
      checkIn,
      checkOut,
      booking.checkIn,
      booking.checkOut,
    );
  });
}

async function handleBooking() {
  if (!currentUser) {
    createToast("Silakan login terlebih dahulu untuk memesan.", "error");
    authPanel.classList.remove("hidden");
    authPanel.classList.add("flex");
    return;
  }

  const checkIn = checkinDate.value;
  const checkOut = checkoutDate.value;
  if (!checkIn || !checkOut) {
    createToast("Pilih tanggal check-in dan check-out.", "error");
    return;
  }

  if (parseISODate(checkIn) >= parseISODate(checkOut)) {
    createToast("Tanggal check-out harus setelah check-in.", "error");
    return;
  }

  try {
    const hasConflict = await hasOverlappingBooking(
      selectedHomestay.id,
      checkIn,
      checkOut,
    );
    if (hasConflict) {
      createToast(
        "Kamar sudah dipesan pada tanggal yang dipilih. Pilih tanggal lain.",
        "error",
      );
      return;
    }

    await addDoc(collection(db, "bookings"), {
      userId: currentUser.uid,
      homestayId: selectedHomestay.id,
      checkIn,
      checkOut,
      status: "pending",
      createdAt: serverTimestamp(),
    });
    await loadSelectedHomestayBookings(selectedHomestay.id);
    createToast("Booking berhasil dibuat. Tunggu persetujuan admin.");
    detailModal.classList.add("hidden");
    detailModal.classList.remove("flex");
    checkinDate.value = "";
    checkoutDate.value = "";
    await renderBookingList();
  } catch (error) {
    createToast("Gagal booking: " + error.message, "error");
  }
}

// Homestay rendering functions
function renderCard(homestay) {
  const primaryImage = getPrimaryImage(homestay.images);
  const card = document.createElement("article");
  card.className =
    "group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl";
  card.innerHTML = `
    <div class="aspect-square overflow-hidden">
      <img data-homestay-image="true" src="${primaryImage || "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80"}" alt="${homestay.name}" class="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
    </div>
    <div class="p-6">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h3 class="text-xl font-semibold text-slate-900">${homestay.name}</h3>
          <p class="mt-2 text-sm text-slate-500">${homestay.location}</p>
        </div>
        <p class="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">${formatCurrency(homestay.price)} / malam</p>
      </div>
      <p class="mt-4 text-sm leading-6 text-slate-600 line-clamp-3">${homestay.description}</p>
      <div class="mt-5 flex flex-wrap gap-2 text-xs text-slate-600">
        ${homestay.facilities
          ?.slice(0, 4)
          .map(
            (item) =>
              `<span class="rounded-2xl bg-slate-100 px-3 py-1">${item}</span>`,
          )
          .join("")}
      </div>
      <button class="mt-6 inline-flex w-full items-center justify-center rounded-3xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">Lihat detail</button>
    </div>
  `;

  card.addEventListener("click", () => openDetailModal(homestay));
  const previewImg = card.querySelector("img[data-homestay-image]");
  if (previewImg) {
    applyImageFallback(
      previewImg,
      primaryImage,
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    );
  }
  return card;
}

async function openDetailModal(homestay) {
  selectedHomestay = homestay;
  selectedCheckInDate = "";
  selectedCheckOutDate = "";
  await loadSelectedHomestayBookings(homestay.id);
  const today = new Date().toISOString().split("T")[0];
  checkinDate.min = today;
  checkoutDate.min = today;
  checkinDate.value = "";
  checkoutDate.value = "";
  checkoutDate.disabled = true;
  try {
    initFlatpickr();
  } catch (e) {
    /* ignore if flatpickr not loaded */
  }
  applyImageFallback(
    detailImage,
    getPrimaryImage(homestay.images),
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
  );
  detailLocation.textContent = homestay.location;
  detailName.textContent = homestay.name;
  detailPrice.textContent = `${formatCurrency(homestay.price)} / malam`;
  detailDescription.textContent = homestay.description;
  detailFacilities.innerHTML =
    homestay.facilities
      ?.map(
        (item) =>
          `<div class="rounded-3xl bg-slate-100 px-3 py-2 text-sm text-slate-600">${item}</div>`,
      )
      .join("") ||
    '<p class="text-slate-500">Tidak ada fasilitas terdaftar.</p>';
  detailModal.classList.remove("hidden");
  detailModal.classList.add("flex");
}

function applyFilterAndSort(items) {
  const searchValue = searchInput.value.toLowerCase();
  const filtered = items.filter((homestay) => {
    return (
      homestay.name.toLowerCase().includes(searchValue) ||
      homestay.location.toLowerCase().includes(searchValue)
    );
  });

  const sortValue = sortSelect.value;
  if (sortValue === "priceAsc") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortValue === "priceDesc") {
    filtered.sort((a, b) => b.price - a.price);
  } else {
    filtered.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
  }

  return filtered;
}

async function renderHomestays() {
  const list = applyFilterAndSort(homestays);
  homestayGrid.innerHTML = "";
  if (!list.length) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  list.forEach((homestay) => homestayGrid.appendChild(renderCard(homestay)));
}

async function renderBookingList() {
  if (!currentUser) return;

  try {
    const q = query(
      collection(db, "bookings"),
      where("userId", "==", currentUser.uid),
    );
    const snapshot = await getDocs(q);
    const bookings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    bookings.sort(
      (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
    );
    bookingList.innerHTML = "";

    if (!bookings.length) {
      bookingEmptyState.classList.remove("hidden");
      return;
    }

    bookingEmptyState.classList.add("hidden");
    bookings.forEach((booking) => {
      const homestay = homestays.find(
        (item) => item.id === booking.homestayId,
      ) || { name: "Homestay tidak tersedia", price: 0 };
      const item = document.createElement("div");
      item.className =
        "rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6";
      item.innerHTML = `
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm uppercase tracking-[0.24em] text-slate-500">${homestay.name}</p>
          <h3 class="mt-2 text-xl font-semibold text-slate-900">${formatDate(booking.checkIn)} - ${formatDate(booking.checkOut)}</h3>
        </div>
        <span class="rounded-full px-3 py-2 text-sm font-semibold ${booking.status === "approved" ? "bg-emerald-100 text-emerald-700" : booking.status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}">${booking.status}</span>
      </div>
      <div class="mt-4 grid gap-2 sm:grid-cols-2">
        <p class="text-sm text-slate-600">Harga per malam: ${formatCurrency(homestay.price)}</p>
        <p class="text-sm text-slate-600">Tanggal booking: ${formatDate(booking.createdAt?.toDate?.() || booking.createdAt)}</p>
      </div>
    `;
      bookingList.appendChild(item);
    });
  } catch (error) {
    console.error("Render booking list error", error);
    createToast(
      "Gagal memuat booking: " +
        (error.code ? error.code + ": " : "") +
        error.message,
      "error",
    );
    bookingList.innerHTML = "";
    bookingEmptyState.classList.add("hidden");
  }
}

// UI state functions
function showLoggedInTools() {
  authToggleButton.innerHTML = `
    <span class="hidden sm:inline">Logout</span>
    <span class="sm:hidden">Logout</span>
  `;
  authToggleButton.onclick = async () => {
    const confirmed = await confirmDialog({
      title: "Konfirmasi Logout",
      message: "Apakah Anda yakin ingin logout?",
      confirmText: "Logout",
      cancelText: "Batal",
    });
    if (!confirmed) return;
    await signOut(auth);
  };
  const isAdmin = currentUserProfile?.role === "admin";
  adminLink.classList.toggle("hidden", !isAdmin);
  adminLinkMobile.classList.toggle("hidden", !isAdmin);
}

function showLoggedOutTools() {
  authToggleButton.innerHTML = `
    <span class="hidden sm:inline">Login / Register</span>
    <span class="sm:hidden">Login</span>
  `;
  authToggleButton.onclick = () => {
    authPanel.classList.remove("hidden");
    authPanel.classList.add("flex");
  };
  adminLink.classList.add("hidden");
  adminLinkMobile.classList.add("hidden");
}

async function updateUserState(user) {
  currentUser = user;
  if (user) {
    currentUserProfile = await fetchUserProfile(user.uid);
    showLoggedInTools();
    await renderBookingList();
  } else {
    currentUserProfile = null;
    showLoggedOutTools();
    bookingSection.classList.add("hidden");
  }
}

// Homestay loading function
async function loadHomestays() {
  try {
    const snapshot = await getDocs(
      query(collection(db, "homestays"), orderBy("createdAt", "desc")),
    );
    homestays = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    heroHomestays = homestays.filter((h) => h.showInHero === true);
    currentHeroIndex = 0;
    renderHomestays();
    renderFeaturedHomestay();
    resetHeroAutoRotate();
  } catch (error) {
    console.error("Load homestays error", error);
    createToast(
      "Gagal memuat homestay: " +
        (error.code ? error.code + ": " : "") +
        error.message,
      "error",
    );
    homestays = [];
    heroHomestays = [];
    renderHomestays();
  }
}

// Event listeners (added after all functions are declared)
closeAuthPanel.addEventListener("click", () => {
  authPanel.classList.add("hidden");
  authPanel.classList.remove("flex");
});
showMyBookings.addEventListener("click", () =>
  bookingSection.classList.remove("hidden"),
);
closeBookingSection.addEventListener("click", () =>
  bookingSection.classList.add("hidden"),
);
closeModal.addEventListener("click", () => {
  detailModal.classList.add("hidden");
  detailModal.classList.remove("flex");
});
checkinDate.addEventListener("change", validateDateSelection);
checkoutDate.addEventListener("change", validateDateSelection);
searchInput.addEventListener("input", renderHomestays);
sortSelect.addEventListener("change", renderHomestays);
loginButton.addEventListener("click", handleLogin);
registerButton.addEventListener("click", handleRegister);
googleLoginButton.addEventListener("click", handleGoogleLogin);
bookButton.addEventListener("click", handleBooking);
heroPrev.addEventListener("click", () => {
  prevHero();
  resetHeroAutoRotate();
});
heroNext.addEventListener("click", () => {
  nextHero();
  resetHeroAutoRotate();
});
heroCard.addEventListener("click", () => {
  if (heroHomestays[currentHeroIndex]) {
    openDetailModal(heroHomestays[currentHeroIndex]);
  }
});

authToggleButton.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !currentUser)
    authPanel.classList.remove("hidden");
});

installButton?.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  if (choice.outcome === "accepted") {
    createToast("Terima kasih! Aplikasi siap digunakan.");
  }
  installButton.classList.add("hidden");
  deferredPrompt = null;
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  installButton?.classList.remove("hidden");
});

window.addEventListener("appinstalled", () => {
  createToast("Aplikasi berhasil diinstal!");
  installButton?.classList.add("hidden");
  deferredPrompt = null;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  });
}

onAuthStateChanged(auth, async (user) => {
  await updateUserState(user);
});

window.addEventListener("DOMContentLoaded", async () => {
  await loadHomestays();

  try {
    const redirectResult = await getRedirectResult(auth);
    if (redirectResult?.user) {
      await ensureUserProfile(redirectResult.user);
      createToast("Login dengan Google berhasil");
      authPanel.classList.add("hidden");
      authPanel.classList.remove("flex");
    }
  } catch (redirectError) {
    console.error("Redirect result error", redirectError);
  }
});
