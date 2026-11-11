// ==========================================
// CONFIGURATION
// ==========================================
const CONFIG = {
    ITEMS_PER_PAGE: 15,
    STORAGE_KEY: 'moneyManagerData',

    accounts: {
        // --- Personal ---
        cash: {
            name: 'Dompet Cash',
            icon: '💵',
            group: 'personal',
            methods: ['cash']
        },
        gopay: {
            name: 'GoPay',
            icon: '📱',
            group: 'personal',
            methods: ['gopay']
        },
        mandiri: {
            name: 'Bank Mandiri',
            icon: '🏦',
            group: 'personal',
            methods: ['transfer-mandiri']
        },
        bca: {
            name: 'Bank BCA',
            icon: '🏦',
            group: 'personal',
            methods: ['transfer-bca']
        },
        // --- Organization ---
        hadroh: {
            name: 'Uang Donasi Hadroh',
            icon: '🎵',
            group: 'organization',
            methods: ['cash', 'qris', 'transfer-rekening1', 'transfer-rekening2']
        },
        'kas-mahad': {
            name: 'Kas Internal Pengurus Mahad',
            icon: '📋',
            group: 'organization',
            methods: ['cash', 'qris', 'transfer-rekening1', 'transfer-rekening2']
        },
        'infak-jumat': {
            name: 'Infak Jumat',
            icon: '🕌',
            group: 'organization',
            methods: ['cash', 'qris', 'transfer-rekening1', 'transfer-rekening2']
        },
        sanksi: {
            name: 'Sanksi Internal',
            icon: '⚖️',
            group: 'organization',
            methods: ['cash', 'qris', 'transfer-rekening1', 'transfer-rekening2']
        },
        'ika-banin': {
            name: 'IKA Banin',
            icon: '🏠',
            group: 'organization',
            methods: ['cash', 'qris', 'transfer-rekening1', 'transfer-rekening2']
        }
    },

    methodLabels: {
        'cash': 'Cash',
        'gopay': 'GoPay',
        'qris': 'QRIS',
        'transfer-mandiri': 'Transfer Mandiri',
        'transfer-bca': 'Transfer BCA',
        'transfer-rekening1': 'Transfer Rekening 1',
        'transfer-rekening2': 'Transfer Rekening 2'
    }
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
const Utils = {
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    },

    formatDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    },

    formatDateLong(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    },

    formatDateInput(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    getTodayStr() {
        return this.formatDateInput(new Date());
    },

    getCurrentMonthRange() {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
            start: this.formatDateInput(start),
            end: this.formatDateInput(end)
        };
    },

    parseFormattedNumber(str) {
        if (!str) return 0;
        return parseInt(str.replace(/\D/g, ''), 10) || 0;
    },

    formatNumberInput(value) {
        const num = value.replace(/\D/g, '');
        if (!num) return '';
        return new Intl.NumberFormat('id-ID').format(parseInt(num, 10));
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// ==========================================
// DATA MANAGER (localStorage)
// ==========================================
class DataManager {
    constructor() {
        this.data = this._load();
    }

    _load() {
        try {
            const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to load data:', e);
        }
        // Initialize empty data
        const data = {};
        for (const accountId in CONFIG.accounts) {
            data[accountId] = [];
        }
        return data;
    }

    _save() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.error('Failed to save data:', e);
        }
    }

    getTransactions(accountId) {
        return this.data[accountId] || [];
    }

    getAllTransactions() {
        const all = [];
        for (const accountId in this.data) {
            for (const tx of this.data[accountId]) {
                all.push({ ...tx, accountId });
            }
        }
        return all.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    addTransaction(accountId, transaction) {
        if (!this.data[accountId]) {
            this.data[accountId] = [];
        }
        transaction.id = Utils.generateId();
        transaction.createdAt = new Date().toISOString();
        this.data[accountId].push(transaction);
        this._save();
        return transaction;
    }

    updateTransaction(accountId, transactionId, updates) {
        const txs = this.data[accountId];
        if (!txs) return null;
        const idx = txs.findIndex(t => t.id === transactionId);
        if (idx === -1) return null;
        txs[idx] = { ...txs[idx], ...updates, updatedAt: new Date().toISOString() };
        this._save();
        return txs[idx];
    }

    deleteTransaction(accountId, transactionId) {
        const txs = this.data[accountId];
        if (!txs) return false;
        const idx = txs.findIndex(t => t.id === transactionId);
        if (idx === -1) return false;
        txs.splice(idx, 1);
        this._save();
        return true;
    }

    getBalance(accountId) {
        const txs = this.data[accountId] || [];
        return txs.reduce((sum, tx) => {
            return sum + (tx.type === 'income' ? tx.amount : -tx.amount);
        }, 0);
    }

    getStats(accountId) {
        const txs = this.data[accountId] || [];
        const { start, end } = Utils.getCurrentMonthRange();

        let totalIncome = 0, totalExpense = 0;
        let monthIncome = 0, monthExpense = 0;

        for (const tx of txs) {
            if (tx.type === 'income') {
                totalIncome += tx.amount;
                if (tx.date >= start && tx.date <= end) monthIncome += tx.amount;
            } else {
                totalExpense += tx.amount;
                if (tx.date >= start && tx.date <= end) monthExpense += tx.amount;
            }
        }

        return {
            balance: totalIncome - totalExpense,
            totalIncome,
            totalExpense,
            monthIncome,
            monthExpense,
            totalTransactions: txs.length
        };
    }

    getGroupStats(group) {
        let totalBalance = 0;
        let monthIncome = 0;
        let monthExpense = 0;

        for (const accountId in CONFIG.accounts) {
            if (CONFIG.accounts[accountId].group === group) {
                const stats = this.getStats(accountId);
                totalBalance += stats.balance;
                monthIncome += stats.monthIncome;
                monthExpense += stats.monthExpense;
            }
        }

        return { totalBalance, monthIncome, monthExpense };
    }

    getMonthlyData(accountId, months = 6) {
        const txs = accountId ? (this.data[accountId] || []) : this.getAllTransactions();
        const result = [];
        const now = new Date();

        for (let i = months - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStart = Utils.formatDateInput(d);
            const monthEnd = Utils.formatDateInput(new Date(d.getFullYear(), d.getMonth() + 1, 0));
            const monthLabel = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });

            let income = 0, expense = 0;
            for (const tx of txs) {
                const txDate = tx.date;
                if (txDate >= monthStart && txDate <= monthEnd) {
                    if (tx.type === 'income') income += tx.amount;
                    else expense += tx.amount;
                }
            }

            result.push({ label: monthLabel, income, expense });
        }

        return result;
    }
}

// ==========================================
// TOAST NOTIFICATION
// ==========================================
const Toast = {
    show(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const icons = { success: '✅', error: '❌', info: 'ℹ️' };
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span>${Utils.escapeHtml(message)}</span>
        `;
        container.appendChild(toast);
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 3000);
    }
};

// ==========================================
// APP CLASS
// ==========================================
class App {
    constructor() {
        this.dm = new DataManager();
        this.currentPage = 'dashboard';
        this.currentAccount = null;
        this.currentFilters = {
            search: '',
            type: 'all',
            dateFrom: '',
            dateTo: ''
        };
        this.currentPagination = { page: 1 };
        this.editingTransaction = null;
        this.deleteTarget = null;
        this.chartInstance = null;
    }

    init() {
        this._setupDate();
        this._setupNavigation();
        this._setupModal();
        this._setupMobileMenu();
        this.navigate('dashboard');
    }

    // --- Setup ---

    _setupDate() {
        const el = document.getElementById('date-display');
        const now = new Date();
        el.textContent = now.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    _setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                const account = item.dataset.account;

                // Update active state
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                item.classList.add('active');

                // Close mobile sidebar
                document.getElementById('sidebar').classList.remove('open');
                document.getElementById('sidebar-overlay').classList.remove('active');

                if (page === 'dashboard') {
                    this.navigate('dashboard');
                } else if (page === 'account' && account) {
                    this.navigate('account', account);
                }
            });
        });
    }

    _setupModal() {
        const form = document.getElementById('transaction-form');
        const overlay = document.getElementById('modal-overlay');
        const closeBtn = document.getElementById('modal-close');
        const cancelBtn = document.getElementById('modal-cancel');
        const deleteOverlay = document.getElementById('delete-modal-overlay');
        const deleteCloseBtn = document.getElementById('delete-modal-close');
        const deleteCancelBtn = document.getElementById('delete-cancel');
        const deleteConfirmBtn = document.getElementById('delete-confirm');

        // Amount formatting
        const amountInput = document.getElementById('form-amount');
        amountInput.addEventListener('input', (e) => {
            const pos = e.target.selectionStart;
            const oldLen = e.target.value.length;
            e.target.value = Utils.formatNumberInput(e.target.value);
            const newLen = e.target.value.length;
            e.target.setSelectionRange(pos + (newLen - oldLen), pos + (newLen - oldLen));
        });

        // Form submit
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this._saveTransaction();
        });

        // Close modal
        const closeModal = () => {
            overlay.classList.remove('active');
            form.reset();
            this.editingTransaction = null;
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        // Delete modal
        const closeDeleteModal = () => {
            deleteOverlay.classList.remove('active');
            this.deleteTarget = null;
        };

        deleteCloseBtn.addEventListener('click', closeDeleteModal);
        deleteCancelBtn.addEventListener('click', closeDeleteModal);
        deleteOverlay.addEventListener('click', (e) => {
            if (e.target === deleteOverlay) closeDeleteModal();
        });

        deleteConfirmBtn.addEventListener('click', () => {
            if (this.deleteTarget) {
                this.dm.deleteTransaction(this.deleteTarget.accountId, this.deleteTarget.transactionId);
                Toast.show('Transaksi berhasil dihapus!', 'success');
                closeDeleteModal();
                this._renderCurrentPage();
            }
        });

        // ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeModal();
                closeDeleteModal();
            }
        });
    }

    _setupMobileMenu() {
        const toggle = document.getElementById('menu-toggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');

        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }

    // --- Navigation ---

    navigate(page, accountId = null) {
        this.currentPage = page;
        this.currentAccount = accountId;
        this.currentPagination.page = 1;
        this.currentFilters = { search: '', type: 'all', dateFrom: '', dateTo: '' };

        const titleEl = document.getElementById('page-title');

        if (page === 'dashboard') {
            titleEl.textContent = '📊 Dashboard';
            this._renderDashboard();
        } else if (page === 'account' && accountId) {
            const acc = CONFIG.accounts[accountId];
            titleEl.textContent = `${acc.icon} ${acc.name}`;
            this._renderAccountPage(accountId);
        }
    }

    _renderCurrentPage() {
        if (this.currentPage === 'dashboard') {
            this._renderDashboard();
        } else if (this.currentPage === 'account') {
            this._renderAccountPage(this.currentAccount);
        }
    }

    // --- Dashboard ---

    _renderDashboard() {
        const content = document.getElementById('app-content');
        const personalStats = this.dm.getGroupStats('personal');
        const orgStats = this.dm.getGroupStats('organization');
        const allMonthly = this.dm.getMonthlyData(null, 6);
        const recentTxs = this.dm.getAllTransactions().slice(0, 10);

        content.innerHTML = `
            <div class="welcome-banner">
                <div class="welcome-title">Selamat Datang! 👋</div>
                <div class="welcome-subtitle">Kelola keuangan pribadi dan organisasi Anda dengan mudah</div>
            </div>

            <div class="stats-grid">
                <div class="stat-card primary">
                    <div class="stat-card-header">
                        <span class="stat-label">Saldo Pribadi</span>
                        <span class="stat-icon">💼</span>
                    </div>
                    <div class="stat-value ${personalStats.totalBalance < 0 ? 'expense' : ''}">${Utils.formatCurrency(personalStats.totalBalance)}</div>
                </div>
                <div class="stat-card info">
                    <div class="stat-card-header">
                        <span class="stat-label">Saldo Organisasi</span>
                        <span class="stat-icon">🏫</span>
                    </div>
                    <div class="stat-value ${orgStats.totalBalance < 0 ? 'expense' : ''}">${Utils.formatCurrency(orgStats.totalBalance)}</div>
                </div>
                <div class="stat-card success">
                    <div class="stat-card-header">
                        <span class="stat-label">Pemasukan Bulan Ini</span>
                        <span class="stat-icon">📈</span>
                    </div>
                    <div class="stat-value income">${Utils.formatCurrency(personalStats.monthIncome + orgStats.monthIncome)}</div>
                </div>
                <div class="stat-card danger">
                    <div class="stat-card-header">
                        <span class="stat-label">Pengeluaran Bulan Ini</span>
                        <span class="stat-icon">📉</span>
                    </div>
                    <div class="stat-value expense">${Utils.formatCurrency(personalStats.monthExpense + orgStats.monthExpense)}</div>
                </div>
            </div>

            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">📊 Grafik Pemasukan & Pengeluaran (6 Bulan Terakhir)</h3>
                </div>
                <div class="chart-container">
                    <canvas id="dashboard-chart"></canvas>
                </div>
            </div>

            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">💼 Akun Keuangan Pribadi</h3>
                </div>
                <div class="accounts-grid">
                    ${this._renderAccountCards('personal')}
                </div>
            </div>

            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">🏫 Akun Keuangan Organisasi</h3>
                </div>
                <div class="accounts-grid">
                    ${this._renderAccountCards('organization')}
                </div>
            </div>

            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">🕐 Transaksi Terakhir</h3>
                </div>
                ${recentTxs.length > 0 ? `
                    <div class="table-wrapper">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Tanggal</th>
                                    <th>Kegiatan</th>
                                    <th>Akun</th>
                                    <th>Tipe</th>
                                    <th>Nominal</th>
                                    <th>Metode</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${recentTxs.map(tx => {
                                    const acc = CONFIG.accounts[tx.accountId];
                                    return `
                                        <tr>
                                            <td class="date-cell">${Utils.formatDate(tx.date)}</td>
                                            <td class="title-cell">${Utils.escapeHtml(tx.title)}</td>
                                            <td><span class="badge method">${acc ? acc.icon + ' ' + acc.name : tx.accountId}</span></td>
                                            <td><span class="badge ${tx.type}">${tx.type === 'income' ? '↗ Masuk' : '↘ Keluar'}</span></td>
                                            <td class="amount ${tx.type}">${tx.type === 'income' ? '+' : '-'}${Utils.formatCurrency(tx.amount)}</td>
                                            <td><span class="badge method">${CONFIG.methodLabels[tx.method] || tx.method}</span></td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div class="empty-state">
                        <div class="empty-icon">📝</div>
                        <div class="empty-title">Belum Ada Transaksi</div>
                        <div class="empty-text">Mulai catat transaksi pertama Anda di salah satu akun</div>
                    </div>
                `}
            </div>
        `;

        // Render chart
        this._renderDashboardChart(allMonthly);

        // Attach account card click handlers
        content.querySelectorAll('.account-card').forEach(card => {
            card.addEventListener('click', () => {
                const accountId = card.dataset.account;
                // Update sidebar active state
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                const navItem = document.querySelector(`.nav-item[data-account="${accountId}"]`);
                if (navItem) navItem.classList.add('active');
                this.navigate('account', accountId);
            });
        });
    }

    _renderAccountCards(group) {
        let html = '';
        for (const id in CONFIG.accounts) {
            const acc = CONFIG.accounts[id];
            if (acc.group !== group) continue;
            const balance = this.dm.getBalance(id);
            html += `
                <div class="account-card" data-account="${id}">
                    <span class="account-card-icon">${acc.icon}</span>
                    <div class="account-card-info">
                        <div class="account-card-name">${acc.name}</div>
                        <div class="account-card-balance ${balance < 0 ? 'negative' : ''}">${Utils.formatCurrency(balance)}</div>
                    </div>
                </div>
            `;
        }
        return html;
    }

    _renderDashboardChart(monthlyData) {
        const canvas = document.getElementById('dashboard-chart');
        if (!canvas) return;

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        const ctx = canvas.getContext('2d');
        this.chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthlyData.map(d => d.label),
                datasets: [
                    {
                        label: 'Pemasukan',
                        data: monthlyData.map(d => d.income),
                        backgroundColor: 'rgba(34, 197, 94, 0.7)',
                        borderColor: 'rgba(34, 197, 94, 1)',
                        borderWidth: 1,
                        borderRadius: 6,
                        borderSkipped: false
                    },
                    {
                        label: 'Pengeluaran',
                        data: monthlyData.map(d => d.expense),
                        backgroundColor: 'rgba(239, 68, 68, 0.7)',
                        borderColor: 'rgba(239, 68, 68, 1)',
                        borderWidth: 1,
                        borderRadius: 6,
                        borderSkipped: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { family: 'Inter', size: 12, weight: '600' }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + Utils.formatCurrency(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => Utils.formatCurrency(value),
                            font: { family: 'Inter', size: 11 }
                        },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    x: {
                        ticks: { font: { family: 'Inter', size: 12, weight: '500' } },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // --- Account Page ---

    _renderAccountPage(accountId) {
        const content = document.getElementById('app-content');
        const acc = CONFIG.accounts[accountId];
        const stats = this.dm.getStats(accountId);

        content.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card primary">
                    <div class="stat-card-header">
                        <span class="stat-label">Saldo</span>
                        <span class="stat-icon">💰</span>
                    </div>
                    <div class="stat-value ${stats.balance < 0 ? 'expense' : ''}">${Utils.formatCurrency(stats.balance)}</div>
                </div>
                <div class="stat-card success">
                    <div class="stat-card-header">
                        <span class="stat-label">Total Pemasukan</span>
                        <span class="stat-icon">📈</span>
                    </div>
                    <div class="stat-value income">${Utils.formatCurrency(stats.totalIncome)}</div>
                </div>
                <div class="stat-card danger">
                    <div class="stat-card-header">
                        <span class="stat-label">Total Pengeluaran</span>
                        <span class="stat-icon">📉</span>
                    </div>
                    <div class="stat-value expense">${Utils.formatCurrency(stats.totalExpense)}</div>
                </div>
                <div class="stat-card warning">
                    <div class="stat-card-header">
                        <span class="stat-label">Jumlah Transaksi</span>
                        <span class="stat-icon">📋</span>
                    </div>
                    <div class="stat-value">${stats.totalTransactions}</div>
                </div>
            </div>

            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">📊 Grafik 6 Bulan Terakhir</h3>
                </div>
                <div class="chart-container">
                    <canvas id="account-chart"></canvas>
                </div>
            </div>

            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">📝 Daftar Transaksi</h3>
                    <div class="d-flex gap-1">
                        <button class="btn btn-secondary btn-sm" id="btn-export">📥 Export CSV</button>
                        <button class="btn btn-primary btn-sm" id="btn-add-transaction">➕ Tambah Transaksi</button>
                    </div>
                </div>
                <div class="toolbar">
                    <div class="search-box">
                        <input type="text" id="filter-search" placeholder="Cari transaksi...">
                    </div>
                    <select class="filter-select" id="filter-type">
                        <option value="all">Semua Tipe</option>
                        <option value="income">Pemasukan</option>
                        <option value="expense">Pengeluaran</option>
                    </select>
                    <input type="date" class="filter-date" id="filter-date-from" title="Dari tanggal">
                    <input type="date" class="filter-date" id="filter-date-to" title="Sampai tanggal">
                </div>
                <div id="transactions-table">
                    <!-- Rendered by JS -->
                </div>
            </div>
        `;

        // Render chart
        const monthlyData = this.dm.getMonthlyData(accountId, 6);
        this._renderAccountChart(monthlyData);

        // Attach event listeners
        this._attachAccountPageEvents(accountId);

        // Render transactions table
        this._renderTransactionsTable(accountId);
    }

    _renderAccountChart(monthlyData) {
        const canvas = document.getElementById('account-chart');
        if (!canvas) return;

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        const ctx = canvas.getContext('2d');
        this.chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthlyData.map(d => d.label),
                datasets: [
                    {
                        label: 'Pemasukan',
                        data: monthlyData.map(d => d.income),
                        backgroundColor: 'rgba(34, 197, 94, 0.7)',
                        borderColor: 'rgba(34, 197, 94, 1)',
                        borderWidth: 1,
                        borderRadius: 6,
                        borderSkipped: false
                    },
                    {
                        label: 'Pengeluaran',
                        data: monthlyData.map(d => d.expense),
                        backgroundColor: 'rgba(239, 68, 68, 0.7)',
                        borderColor: 'rgba(239, 68, 68, 1)',
                        borderWidth: 1,
                        borderRadius: 6,
                        borderSkipped: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { family: 'Inter', size: 12, weight: '600' }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => context.dataset.label + ': ' + Utils.formatCurrency(context.parsed.y)
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => Utils.formatCurrency(value),
                            font: { family: 'Inter', size: 11 }
                        },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    x: {
                        ticks: { font: { family: 'Inter', size: 12, weight: '500' } },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    _attachAccountPageEvents(accountId) {
        // Add transaction button
        document.getElementById('btn-add-transaction').addEventListener('click', () => {
            this._openModal(accountId);
        });

        // Export CSV
        document.getElementById('btn-export').addEventListener('click', () => {
            this._exportCSV(accountId);
        });

        // Filters
        const searchInput = document.getElementById('filter-search');
        const typeSelect = document.getElementById('filter-type');
        const dateFrom = document.getElementById('filter-date-from');
        const dateTo = document.getElementById('filter-date-to');

        const applyFilters = () => {
            this.currentFilters = {
                search: searchInput.value.toLowerCase().trim(),
                type: typeSelect.value,
                dateFrom: dateFrom.value,
                dateTo: dateTo.value
            };
            this.currentPagination.page = 1;
            this._renderTransactionsTable(accountId);
        };

        searchInput.addEventListener('input', applyFilters);
        typeSelect.addEventListener('change', applyFilters);
        dateFrom.addEventListener('change', applyFilters);
        dateTo.addEventListener('change', applyFilters);
    }

    _getFilteredTransactions(accountId) {
        let txs = this.dm.getTransactions(accountId);
        const f = this.currentFilters;

        // Sort by date descending, then by createdAt descending
        txs = [...txs].sort((a, b) => {
            const dateCompare = new Date(b.date) - new Date(a.date);
            if (dateCompare !== 0) return dateCompare;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        if (f.type !== 'all') {
            txs = txs.filter(tx => tx.type === f.type);
        }

        if (f.search) {
            txs = txs.filter(tx =>
                (tx.title && tx.title.toLowerCase().includes(f.search)) ||
                (tx.note && tx.note.toLowerCase().includes(f.search)) ||
                (tx.category && tx.category.toLowerCase().includes(f.search)) ||
                (tx.reference && tx.reference.toLowerCase().includes(f.search))
            );
        }

        if (f.dateFrom) {
            txs = txs.filter(tx => tx.date >= f.dateFrom);
        }
        if (f.dateTo) {
            txs = txs.filter(tx => tx.date <= f.dateTo);
        }

        return txs;
    }

    _renderTransactionsTable(accountId) {
        const container = document.getElementById('transactions-table');
        const txs = this._getFilteredTransactions(accountId);
        const totalItems = txs.length;
        const perPage = CONFIG.ITEMS_PER_PAGE;
        const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
        const page = Math.min(this.currentPagination.page, totalPages);
        const startIdx = (page - 1) * perPage;
        const pageTxs = txs.slice(startIdx, startIdx + perPage);

        // Calculate filtered totals
        const filteredIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const filteredExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

        if (txs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <div class="empty-title">Belum Ada Transaksi</div>
                    <div class="empty-text">Klik tombol "Tambah Transaksi" untuk mencatat transaksi pertama</div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Tanggal</th>
                            <th>Kegiatan</th>
                            <th>Tipe</th>
                            <th>Nominal</th>
                            <th>Metode</th>
                            <th>Kategori</th>
                            <th>Catatan</th>
                            <th>Ref</th>
                            <th class="text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pageTxs.map((tx, i) => `
                            <tr>
                                <td class="text-muted">${startIdx + i + 1}</td>
                                <td class="date-cell">${Utils.formatDate(tx.date)}</td>
                                <td class="title-cell" title="${Utils.escapeHtml(tx.title)}">${Utils.escapeHtml(tx.title)}</td>
                                <td><span class="badge ${tx.type}">${tx.type === 'income' ? '↗ Masuk' : '↘ Keluar'}</span></td>
                                <td class="amount ${tx.type}">${tx.type === 'income' ? '+' : '-'}${Utils.formatCurrency(tx.amount)}</td>
                                <td><span class="badge method">${CONFIG.methodLabels[tx.method] || tx.method}</span></td>
                                <td>${tx.category ? `<span class="badge category">${Utils.escapeHtml(tx.category)}</span>` : '<span class="text-muted">-</span>'}</td>
                                <td class="note-cell" title="${Utils.escapeHtml(tx.note || '')}">${Utils.escapeHtml(tx.note || '-')}</td>
                                <td class="text-muted" style="font-size:11px">${Utils.escapeHtml(tx.reference || '-')}</td>
                                <td class="actions-cell">
                                    <button class="btn-icon edit" data-action="edit" data-id="${tx.id}" title="Edit">✏️</button>
                                    <button class="btn-icon delete" data-action="delete" data-id="${tx.id}" title="Hapus">🗑️</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="summary-row">
                <div class="summary-item">
                    <span class="summary-label">Total Masuk:</span>
                    <span class="summary-value income">${Utils.formatCurrency(filteredIncome)}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Total Keluar:</span>
                    <span class="summary-value expense">${Utils.formatCurrency(filteredExpense)}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Selisih:</span>
                    <span class="summary-value ${filteredIncome - filteredExpense >= 0 ? 'income' : 'expense'}">${Utils.formatCurrency(filteredIncome - filteredExpense)}</span>
                </div>
            </div>
            ${totalPages > 1 ? `
                <div class="pagination">
                    <div class="pagination-info">
                        Menampilkan ${startIdx + 1}-${Math.min(startIdx + perPage, totalItems)} dari ${totalItems} transaksi
                    </div>
                    <div class="pagination-buttons">
                        <button class="pagination-btn" data-page="prev" ${page <= 1 ? 'disabled' : ''}>← Prev</button>
                        ${this._renderPaginationButtons(page, totalPages)}
                        <button class="pagination-btn" data-page="next" ${page >= totalPages ? 'disabled' : ''}>Next →</button>
                    </div>
                </div>
            ` : ''}
        `;

        // Attach row action handlers
        container.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const txId = btn.dataset.id;
                const tx = this.dm.getTransactions(accountId).find(t => t.id === txId);
                if (tx) this._openModal(accountId, tx);
            });
        });

        container.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.deleteTarget = { accountId, transactionId: btn.dataset.id };
                document.getElementById('delete-modal-overlay').classList.add('active');
            });
        });

        // Pagination handlers
        container.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.page;
                if (action === 'prev') this.currentPagination.page = Math.max(1, page - 1);
                else if (action === 'next') this.currentPagination.page = Math.min(totalPages, page + 1);
                else this.currentPagination.page = parseInt(action);
                this._renderTransactionsTable(accountId);
            });
        });
    }

    _renderPaginationButtons(current, total) {
        let buttons = '';
        const maxVisible = 5;
        let start = Math.max(1, current - Math.floor(maxVisible / 2));
        let end = Math.min(total, start + maxVisible - 1);
        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
        }

        if (start > 1) {
            buttons += `<button class="pagination-btn" data-page="1">1</button>`;
            if (start > 2) buttons += `<span style="padding:0 4px;color:#94A3B8">...</span>`;
        }

        for (let i = start; i <= end; i++) {
            buttons += `<button class="pagination-btn ${i === current ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }

        if (end < total) {
            if (end < total - 1) buttons += `<span style="padding:0 4px;color:#94A3B8">...</span>`;
            buttons += `<button class="pagination-btn" data-page="${total}">${total}</button>`;
        }

        return buttons;
    }

    // --- Modal ---

    _openModal(accountId, transaction = null) {
        const overlay = document.getElementById('modal-overlay');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('transaction-form');

        // Set form account
        document.getElementById('form-account').value = accountId;

        // Populate method options
        const methodSelect = document.getElementById('form-method');
        const acc = CONFIG.accounts[accountId];
        methodSelect.innerHTML = acc.methods.map(m =>
            `<option value="${m}">${CONFIG.methodLabels[m]}</option>`
        ).join('');

        if (transaction) {
            // Edit mode
            title.textContent = '✏️ Edit Transaksi';
            document.getElementById('form-id').value = transaction.id;
            document.getElementById('form-date').value = transaction.date;
            document.getElementById('form-title').value = transaction.title;
            document.getElementById('form-type').value = transaction.type;
            document.getElementById('form-amount').value = Utils.formatNumberInput(String(transaction.amount));
            methodSelect.value = transaction.method;
            document.getElementById('form-category').value = transaction.category || '';
            document.getElementById('form-note').value = transaction.note || '';
            document.getElementById('form-reference').value = transaction.reference || '';
            this.editingTransaction = transaction;
        } else {
            // Add mode
            title.textContent = '➕ Tambah Transaksi';
            form.reset();
            document.getElementById('form-id').value = '';
            document.getElementById('form-account').value = accountId;
            document.getElementById('form-date').value = Utils.getTodayStr();
            this.editingTransaction = null;
        }

        overlay.classList.add('active');
        setTimeout(() => document.getElementById('form-title').focus(), 100);
    }

    _saveTransaction() {
        const accountId = document.getElementById('form-account').value;
        const txId = document.getElementById('form-id').value;
        const date = document.getElementById('form-date').value;
        const txTitle = document.getElementById('form-title').value.trim();
        const type = document.getElementById('form-type').value;
        const amountStr = document.getElementById('form-amount').value;
        const method = document.getElementById('form-method').value;
        const category = document.getElementById('form-category').value.trim();
        const note = document.getElementById('form-note').value.trim();
        const reference = document.getElementById('form-reference').value.trim();

        // Validation
        if (!date || !txTitle || !type || !amountStr || !method) {
            Toast.show('Mohon lengkapi semua field yang wajib diisi!', 'error');
            return;
        }

        const amount = Utils.parseFormattedNumber(amountStr);
        if (amount <= 0) {
            Toast.show('Nominal harus lebih dari 0!', 'error');
            return;
        }

        const data = { date, title: txTitle, type, amount, method, category, note, reference };

        if (txId) {
            // Update
            this.dm.updateTransaction(accountId, txId, data);
            Toast.show('Transaksi berhasil diperbarui!', 'success');
        } else {
            // Add
            this.dm.addTransaction(accountId, data);
            Toast.show('Transaksi berhasil ditambahkan!', 'success');
        }

        // Close modal and refresh
        document.getElementById('modal-overlay').classList.remove('active');
        document.getElementById('transaction-form').reset();
        this.editingTransaction = null;

        this._renderCurrentPage();
    }

    // --- Export ---

    _exportCSV(accountId) {
        const acc = CONFIG.accounts[accountId];
        const txs = this._getFilteredTransactions(accountId);

        if (txs.length === 0) {
            Toast.show('Tidak ada data untuk di-export!', 'info');
            return;
        }

        const headers = ['No', 'Tanggal', 'Kegiatan', 'Tipe', 'Nominal', 'Metode Pembayaran', 'Kategori', 'Catatan', 'No Referensi'];
        const rows = txs.map((tx, i) => [
            i + 1,
            tx.date,
            `"${(tx.title || '').replace(/"/g, '""')}"`,
            tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
            tx.type === 'income' ? tx.amount : -tx.amount,
            CONFIG.methodLabels[tx.method] || tx.method,
            `"${(tx.category || '').replace(/"/g, '""')}"`,
            `"${(tx.note || '').replace(/"/g, '""')}"`,
            `"${(tx.reference || '').replace(/"/g, '""')}"`
        ]);

        // Add summary
        const totalIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const totalExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        rows.push([]);
        rows.push(['', '', '', 'Total Pemasukan', totalIncome]);
        rows.push(['', '', '', 'Total Pengeluaran', -totalExpense]);
        rows.push(['', '', '', 'Saldo', totalIncome - totalExpense]);

        const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${acc.name.replace(/\s+/g, '_')}_${Utils.getTodayStr()}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        Toast.show('Data berhasil di-export ke CSV!', 'success');
    }
}

// ==========================================
// INITIALIZE APP
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.init();
});
