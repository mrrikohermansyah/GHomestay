export function createToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast fixed right-4 top-4 z-50 w-auto max-w-xs rounded-2xl border px-4 py-3 text-sm shadow-lg transition duration-200 ${type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    toast.classList.add('toast-show');
    setTimeout(() => toast.remove(), 3200);
}

export function confirmDialog({ title = 'Konfirmasi', message = '', confirmText = 'Ya', cancelText = 'Batal' }) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay fixed inset-0 z-[9999] flex items-start justify-center bg-slate-950/60 p-4 overflow-y-auto';
        overlay.innerHTML = `
            <div class="my-8 w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl">
                <h3 class="text-xl font-semibold text-slate-900 mb-4">${title}</h3>
                <p class="text-slate-600 mb-6">${message}</p>
                <div class="flex justify-end gap-3">
                    <button type="button" class="cancel-button rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">${cancelText}</button>
                    <button type="button" class="confirm-button rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">${confirmText}</button>
                </div>
            </div>
        `;

        const cleanup = (value) => {
            overlay.remove();
            resolve(value);
        };

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) cleanup(false);
        });

        overlay.querySelector('.confirm-button').addEventListener('click', () => cleanup(true), { once: true });
        overlay.querySelector('.cancel-button').addEventListener('click', () => cleanup(false), { once: true });

        document.body.appendChild(overlay);
    });
}

export function formatCurrency(value) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value);
}

export function formatDate(value) {
    return value ? new Date(value).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }) : '-';
}

export function parseCurrency(value) {
    if (typeof value !== 'string') return Number(value) || 0;
    const digits = value.replace(/[^0-9]/g, '');
    return digits ? parseInt(digits, 10) : 0;
}

export function parseHash() {
    return window.location.hash.slice(1).split('/').filter(Boolean);
}
