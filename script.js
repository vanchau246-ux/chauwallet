/**
 * Where's Chau Money? - Core Logic
 * Author: AI Assistant
 */

// --- State Management ---
let transactions = JSON.parse(localStorage.getItem('chau_money_transactions')) || [];
let isDarkMode = localStorage.getItem('chau_money_theme') === 'dark';
let categoryChart, dailyChart;

const CATEGORY_COLORS = {
    'Ăn uống': '#F87171', 'Di chuyển': '#FB923C', 'Mua sắm': '#FBBF24',
    'Hóa đơn': '#34D399', 'Giải trí': '#60A5FA', 'Đầu tư': '#818CF8',
    'Tiết kiệm': '#A78BFA', 'Khác': '#94A3B8'
};

// --- Initialization ---
function init() {
    lucide.createIcons();
    updateTheme();
    renderAll();
    
    // Set default dates
    const now = new Date();
    document.getElementById('current-date').innerText = now.toLocaleDateString('vi-VN', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    document.getElementById('input-date').value = now.toISOString().split('T')[0];
}

// --- Core Rendering ---
function renderAll() {
    updateStats();
    renderTransactions();
    renderAIInsights();
    if (!document.getElementById('tab-reports').classList.contains('hidden')) {
        renderCharts();
    }
}

function updateStats() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonth = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const income = thisMonth.filter(t => t.type === 'thu').reduce((s, t) => s + t.amount, 0);
    const expense = thisMonth.filter(t => t.type === 'chi').reduce((s, t) => s + t.amount, 0);
    const balance = transactions.reduce((s, t) => t.type === 'thu' ? s + t.amount : s - t.amount, 0);

    document.getElementById('balance-val').innerText = formatCurrency(balance);
    document.getElementById('income-val').innerText = formatCurrency(income);
    document.getElementById('expense-val').innerText = formatCurrency(expense);

    // Budget Progress (Assume 10M default budget if not set)
    const totalLimit = 10000000; 
    const percent = Math.min(Math.round((expense / totalLimit) * 100), 100);
    document.getElementById('budget-info').innerText = `Đã dùng ${formatCurrency(expense)} / ${formatCurrency(totalLimit)}`;
    document.getElementById('budget-percent').innerText = `${percent}%`;
    document.getElementById('budget-bar').style.width = `${percent}%`;
    
    if (percent > 90) document.getElementById('budget-bar').className = "h-full bg-rose-500 transition-all duration-500";
    else document.getElementById('budget-bar').className = "h-full bg-indigo-500 transition-all duration-500";
}

function renderTransactions() {
    const recent = transactions.slice(0, 5);
    document.getElementById('recent-list').innerHTML = recent.map(t => createTransactionHtml(t)).join('') || 
        '<p class="text-center py-8 opacity-50">Chưa có giao dịch gần đây</p>';
    
    document.getElementById('full-list').innerHTML = transactions.map(t => createTransactionHtml(t)).join('') ||
        '<p class="text-center py-20 opacity-50">Bắt đầu ghi chép để quản lý tiền của bạn!</p>';
    
    lucide.createIcons();
}

function createTransactionHtml(t) {
    const isThu = t.type === 'thu';
    return `
        <div class="glass-card flex items-center justify-between p-4 mb-3">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center ${isThu ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}">
                    <i data-lucide="${isThu ? 'plus' : 'minus'}"></i>
                </div>
                <div>
                    <p class="font-bold">${t.category}</p>
                    <p class="text-xs opacity-60">${t.note || 'Không ghi chú'} • ${t.date}</p>
                </div>
            </div>
            <div class="flex items-center gap-4">
                <p class="font-bold text-lg ${isThu ? 'text-emerald-500' : 'text-rose-500'}">
                    ${isThu ? '+' : '-'}${formatCurrency(t.amount)}
                </p>
                <button onclick="deleteTransaction('${t.id}')" class="text-slate-400 hover:text-rose-500 transition-colors p-2">
                    <i data-lucide="trash-2" size="18"></i>
                </button>
            </div>
        </div>
    `;
}

// --- Advanced AI Prediction Logic ---
function renderAIInsights() {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const daysLeft = daysInMonth - dayOfMonth;

    // 1. Calculate Historical Averages
    const pastTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear();
    });

    const monthlyData = {};
    pastTransactions.forEach(t => {
        const d = new Date(t.date);
        const key = `${d.getMonth()}-${d.getFullYear()}`;
        if (!monthlyData[key]) monthlyData[key] = { income: 0, expense: 0 };
        if (t.type === 'thu') monthlyData[key].income += t.amount;
        else monthlyData[key].expense += t.amount;
    });

    const monthsCount = Object.keys(monthlyData).length;
    const histAvgExpense = monthsCount > 0 
        ? Object.values(monthlyData).reduce((a, b) => a + b.expense, 0) / monthsCount 
        : 0;

    // 2. Weighted Prediction
    const currentMonthExpense = transactions
        .filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === now.getMonth() && t.type === 'chi';
        })
        .reduce((s, t) => s + t.amount, 0);

    const dailyCurrent = dayOfMonth > 0 ? currentMonthExpense / dayOfMonth : 0;
    const dailyHist = histAvgExpense / 30;

    // Weight: Early month uses more history, late month uses more current data
    const currentWeight = Math.min(dayOfMonth / 20, 0.9);
    const predictedDaily = (dailyCurrent * currentWeight) + (dailyHist * (1 - currentWeight));
    const predictedEndBalance = (transactions.reduce((s, t) => t.type === 'thu' ? s + t.amount : s - t.amount, 0)) - (predictedDaily * daysLeft);

    // 3. Generate Insight HTML
    let insightHtml = `
        <div class="glass-card flex gap-4 bg-indigo-50/30 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30">
            <div class="p-2 bg-white dark:bg-slate-800 rounded-xl h-fit text-indigo-500"><i data-lucide="trending-up"></i></div>
            <div>
                <h5 class="font-bold text-sm">Dự báo số dư cuối tháng</h5>
                <p class="text-sm opacity-70">Dựa trên thói quen chi tiêu, dự kiến bạn sẽ còn <strong>${formatCurrency(predictedEndBalance)}</strong> vào ngày 30.</p>
            </div>
        </div>
    `;

    // Add saving tip based on top category
    const catTotals = {};
    transactions.filter(t => t.type === 'chi').forEach(t => catTotals[t.category] = (catTotals[t.category] || 0) + t.amount);
    const topCat = Object.entries(catTotals).sort((a,b) => b[1]-a[1])[0];
    
    if (topCat) {
        insightHtml += `
            <div class="glass-card flex gap-4 bg-amber-50/30 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30">
                <div class="p-2 bg-white dark:bg-slate-800 rounded-xl h-fit text-amber-500"><i data-lucide="lightbulb"></i></div>
                <div>
                    <h5 class="font-bold text-sm">Gợi ý tiết kiệm</h5>
                    <p class="text-sm opacity-70">Bạn chi nhiều nhất cho <strong>${topCat[0]}</strong>. Thử giảm 15% mục này để tiết kiệm thêm ${formatCurrency(topCat[1] * 0.15)} nhé!</p>
                </div>
            </div>
        `;
    }

    document.getElementById('ai-insights').innerHTML = insightHtml;
    lucide.createIcons();
}

// --- Charts Logic ---
function renderCharts() {
    const ctx1 = document.getElementById('categoryChart').getContext('2d');
    const categories = Object.keys(CATEGORY_COLORS);
    const data = categories.map(cat => transactions
        .filter(t => t.category === cat && t.type === 'chi')
        .reduce((s, t) => s + t.amount, 0)
    );

    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: data,
                backgroundColor: Object.values(CATEGORY_COLORS),
                borderWidth: 0,
                hoverOffset: 20
            }]
        },
        options: { 
            maintainAspectRatio: false, 
            plugins: { 
                legend: { 
                    position: 'right', 
                    labels: { color: isDarkMode ? '#94A3B8' : '#64748B', usePointStyle: true, padding: 15 } 
                } 
            } 
        }
    });

    const ctx2 = document.getElementById('dailyChart').getContext('2d');
    const last7Days = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
    });

    if (dailyChart) dailyChart.destroy();
    dailyChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: last7Days.map(d => d.split('-').slice(1).reverse().join('/')),
            datasets: [{
                label: 'Chi tiêu',
                data: last7Days.map(date => transactions
                    .filter(t => t.date === date && t.type === 'chi')
                    .reduce((s, t) => s + t.amount, 0)
                ),
                backgroundColor: '#6366f1',
                borderRadius: 8
            }]
        },
        options: { 
            maintainAspectRatio: false,
            scales: {
                y: { display: false },
                x: { grid: { display: false }, ticks: { color: isDarkMode ? '#94A3B8' : '#64748B' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// --- UI Actions ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active', 'text-indigo-600', 'bg-indigo-50', 'dark:bg-indigo-900/20');
        btn.classList.add('text-slate-400');
    });
    const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
    activeBtn.classList.add('active', 'text-indigo-600', 'bg-indigo-50', 'dark:bg-indigo-900/20');
    
    const titles = { dashboard: 'Chào Chau, 👋', transactions: 'Lịch sử giao dịch', reports: 'Báo cáo chi tiết', settings: 'Cài đặt' };
    document.getElementById('page-title').innerText = titles[tabId];
    
    if (tabId === 'reports') setTimeout(renderCharts, 100);
}

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    updateTheme();
}

function updateTheme() {
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
        document.getElementById('theme-text').innerText = 'Giao diện sáng';
        document.getElementById('theme-icon').setAttribute('data-lucide', 'sun');
    } else {
        document.documentElement.classList.remove('dark');
        document.getElementById('theme-text').innerText = 'Giao diện tối';
        document.getElementById('theme-icon').setAttribute('data-lucide', 'moon');
    }
    localStorage.setItem('chau_money_theme', isDarkMode ? 'dark' : 'light');
    lucide.createIcons();
}

function openModal() { document.getElementById('modal').classList.remove('hidden'); }
function closeModal() { document.getElementById('modal').classList.add('hidden'); }

document.getElementById('transaction-form').onsubmit = function(e) {
    e.preventDefault();
    const fd = new FormData(this);
    const t = {
        id: Date.now().toString(),
        type: fd.get('type'),
        date: fd.get('date'),
        category: fd.get('category'),
        amount: Number(fd.get('amount')),
        note: fd.get('note')
    };
    transactions.unshift(t);
    localStorage.setItem('chau_money_transactions', JSON.stringify(transactions));
    this.reset();
    closeModal();
    renderAll();
};

function deleteTransaction(id) {
    if (confirm('Xóa giao dịch này?')) {
        transactions = transactions.filter(t => t.id !== id);
        localStorage.setItem('chau_money_transactions', JSON.stringify(transactions));
        renderAll();
    }
}

function resetData() {
    if (confirm('Bạn có chắc chắn muốn xóa TOÀN BỘ dữ liệu? Thao tác này không thể hoàn tác.')) {
        transactions = [];
        localStorage.clear();
        renderAll();
    }
}

function formatCurrency(num) {
    return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
}

// Launch
window.onload = init;