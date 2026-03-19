// === Categories ===
const CATEGORIES = {
  income: [
    { id: 'luong', name: 'Lương', icon: '💰' },
    { id: 'thuong', name: 'Thưởng', icon: '🎁' },
    { id: 'dautu', name: 'Đầu tư', icon: '📈' },
    { id: 'kinhdoanh', name: 'Kinh doanh', icon: '🏪' },
    { id: 'freelance', name: 'Freelance', icon: '💻' },
    { id: 'khac_in', name: 'Khác', icon: '📥' },
  ],
  expense: [
    { id: 'anuong', name: 'Ăn uống', icon: '🍜' },
    { id: 'dichuyen', name: 'Di chuyển', icon: '🚗' },
    { id: 'muasam', name: 'Mua sắm', icon: '🛒' },
    { id: 'giaitri', name: 'Giải trí', icon: '🎮' },
    { id: 'hoadon', name: 'Hóa đơn', icon: '📄' },
    { id: 'yte', name: 'Y tế', icon: '🏥' },
    { id: 'giaoduc', name: 'Giáo dục', icon: '📚' },
    { id: 'nhadat', name: 'Nhà đất', icon: '🏠' },
    { id: 'khac_ex', name: 'Khác', icon: '📤' },
  ],
};

// Chart color palettes
const EXPENSE_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6',
];
const INCOME_COLORS = ['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

// === State ===
let transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
let currentType = 'expense';
let deleteTargetId = null;

// Chart instances
let chartExpenseDonut = null;
let chartIncomeDonut = null;
let chartDaily = null;

// === DOM Elements ===
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const elBalance = $('#balance');
const elTotalIncome = $('#total-income');
const elTotalExpense = $('#total-expense');
const elTransactionList = $('#transaction-list');
const elFilterMonth = $('#filter-month');
const elFilterType = $('#filter-type');
const elFilterCategory = $('#filter-category');
const elSearch = $('#search');
const elMonthlyTitle = $('#monthly-title');
const elCategoryBreakdown = $('#category-breakdown');
const elDashboardTitle = $('#dashboard-title');

// Modal elements
const elModalOverlay = $('#modal-overlay');
const elDeleteOverlay = $('#delete-overlay');
const elModalTitle = $('#modal-title');
const elForm = $('#transaction-form');
const elFormId = $('#form-id');
const elFormAmount = $('#form-amount');
const elFormCategory = $('#form-category');
const elFormDescription = $('#form-description');
const elFormDate = $('#form-date');
const elToggleExpense = $('#toggle-expense');
const elToggleIncome = $('#toggle-income');

// === Utilities ===
function formatMoney(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
}

function formatMoneyShort(amount) {
  if (amount >= 1000000) return (amount / 1000000).toFixed(1).replace('.0', '') + 'tr';
  if (amount >= 1000) return (amount / 1000).toFixed(0) + 'k';
  return String(amount);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getToday() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getCategoryInfo(type, categoryId) {
  const cats = CATEGORIES[type] || [];
  return cats.find(c => c.id === categoryId) || { id: categoryId, name: categoryId, icon: '❓' };
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getMonthName(monthStr) {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  return `Tháng ${parseInt(month)}/${year}`;
}

function getDaysInMonth(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

// === Data ===
function save() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
}

function addTransaction(tx) {
  transactions.push(tx);
  save();
}

function updateTransaction(id, data) {
  const idx = transactions.findIndex(t => t.id === id);
  if (idx !== -1) {
    transactions[idx] = { ...transactions[idx], ...data };
    save();
  }
}

function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  save();
}

// === Filtering ===
function getFilteredTransactions() {
  let filtered = [...transactions];
  const monthVal = elFilterMonth.value;
  const typeVal = elFilterType.value;
  const catVal = elFilterCategory.value;
  const searchVal = elSearch.value.toLowerCase().trim();

  if (monthVal) {
    filtered = filtered.filter(t => t.date.startsWith(monthVal));
  }
  if (typeVal !== 'all') {
    filtered = filtered.filter(t => t.type === typeVal);
  }
  if (catVal !== 'all') {
    filtered = filtered.filter(t => t.category === catVal);
  }
  if (searchVal) {
    filtered = filtered.filter(t => {
      const cat = getCategoryInfo(t.type, t.category);
      return (
        cat.name.toLowerCase().includes(searchVal) ||
        (t.description || '').toLowerCase().includes(searchVal) ||
        String(t.amount).includes(searchVal)
      );
    });
  }

  filtered.sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  return filtered;
}

function getMonthTransactions(monthStr) {
  return transactions.filter(t => t.date.startsWith(monthStr));
}

// === Rendering ===
function renderSummary() {
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

  elBalance.textContent = formatMoney(balance);
  elTotalIncome.textContent = formatMoney(totalIncome);
  elTotalExpense.textContent = formatMoney(totalExpense);
}

// === Dashboard Charts ===
function renderDashboard() {
  const monthVal = elFilterMonth.value || getCurrentMonth();
  elDashboardTitle.textContent = `Dashboard - ${getMonthName(monthVal)}`;

  const monthTx = getMonthTransactions(monthVal);
  const expenseTx = monthTx.filter(t => t.type === 'expense');
  const incomeTx = monthTx.filter(t => t.type === 'income');

  renderExpenseDonut(expenseTx);
  renderIncomeDonut(incomeTx);
  renderDailyChart(monthTx, monthVal);
  renderStats(monthTx, incomeTx, expenseTx, monthVal);
}

function groupByCategory(txList) {
  const groups = {};
  txList.forEach(t => {
    if (!groups[t.category]) {
      groups[t.category] = { category: t.category, type: t.type, total: 0 };
    }
    groups[t.category].total += t.amount;
  });
  return Object.values(groups).sort((a, b) => b.total - a.total);
}

function renderExpenseDonut(expenseTx) {
  const ctx = $('#chart-expense-donut').getContext('2d');
  const groups = groupByCategory(expenseTx);

  if (chartExpenseDonut) chartExpenseDonut.destroy();

  const totalExpense = groups.reduce((s, g) => s + g.total, 0);

  chartExpenseDonut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: groups.map(g => getCategoryInfo('expense', g.category).name),
      datasets: [{
        data: groups.map(g => g.total),
        backgroundColor: EXPENSE_COLORS.slice(0, groups.length),
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const val = ctx.raw;
              const pct = totalExpense > 0 ? ((val / totalExpense) * 100).toFixed(1) : 0;
              return ` ${formatMoney(val)} (${pct}%)`;
            },
          },
        },
      },
    },
  });

  // Custom legend
  let legendHtml = '';
  groups.forEach((g, i) => {
    const cat = getCategoryInfo('expense', g.category);
    const pct = totalExpense > 0 ? ((g.total / totalExpense) * 100).toFixed(0) : 0;
    legendHtml += `
      <div class="legend-item">
        <span class="legend-dot" style="background:${EXPENSE_COLORS[i]}"></span>
        <span>${cat.icon} ${cat.name}</span>
        <span class="legend-amount">${pct}%</span>
      </div>
    `;
  });
  $('#legend-expense').innerHTML = legendHtml;
}

function renderIncomeDonut(incomeTx) {
  const ctx = $('#chart-income-donut').getContext('2d');
  const groups = groupByCategory(incomeTx);

  if (chartIncomeDonut) chartIncomeDonut.destroy();

  const totalIncome = groups.reduce((s, g) => s + g.total, 0);

  chartIncomeDonut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: groups.map(g => getCategoryInfo('income', g.category).name),
      datasets: [{
        data: groups.map(g => g.total),
        backgroundColor: INCOME_COLORS.slice(0, groups.length),
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const val = ctx.raw;
              const pct = totalIncome > 0 ? ((val / totalIncome) * 100).toFixed(1) : 0;
              return ` ${formatMoney(val)} (${pct}%)`;
            },
          },
        },
      },
    },
  });

  // Custom legend
  let legendHtml = '';
  groups.forEach((g, i) => {
    const cat = getCategoryInfo('income', g.category);
    const pct = totalIncome > 0 ? ((g.total / totalIncome) * 100).toFixed(0) : 0;
    legendHtml += `
      <div class="legend-item">
        <span class="legend-dot" style="background:${INCOME_COLORS[i]}"></span>
        <span>${cat.icon} ${cat.name}</span>
        <span class="legend-amount">${pct}%</span>
      </div>
    `;
  });
  $('#legend-income').innerHTML = legendHtml;
}

function renderDailyChart(monthTx, monthStr) {
  const ctx = $('#chart-daily').getContext('2d');
  const daysInMonth = getDaysInMonth(monthStr);

  // Group by day
  const incomeByDay = new Array(daysInMonth).fill(0);
  const expenseByDay = new Array(daysInMonth).fill(0);

  monthTx.forEach(t => {
    const day = parseInt(t.date.split('-')[2]) - 1;
    if (t.type === 'income') incomeByDay[day] += t.amount;
    else expenseByDay[day] += t.amount;
  });

  const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  if (chartDaily) chartDaily.destroy();

  chartDaily = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Thu nhập',
          data: incomeByDay,
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderColor: '#10b981',
          borderWidth: 1,
          borderRadius: 3,
          borderSkipped: false,
        },
        {
          label: 'Chi tiêu',
          data: expenseByDay,
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderColor: '#ef4444',
          borderWidth: 1,
          borderRadius: 3,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            borderRadius: 3,
            useBorderRadius: true,
            font: { size: 12, weight: '600' },
            padding: 16,
          },
        },
        tooltip: {
          callbacks: {
            title: (items) => `Ngày ${items[0].label}`,
            label: (ctx) => ` ${ctx.dataset.label}: ${formatMoney(ctx.raw)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 10 },
            maxRotation: 0,
            callback: function(val, idx) {
              // Show every 5th day + day 1
              const day = idx + 1;
              return (day === 1 || day % 5 === 0) ? day : '';
            },
          },
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            font: { size: 11 },
            callback: (val) => formatMoneyShort(val),
          },
          beginAtZero: true,
        },
      },
    },
  });
}

function renderStats(monthTx, incomeTx, expenseTx, monthStr) {
  const totalIncome = incomeTx.reduce((s, t) => s + t.amount, 0);
  const totalExpense = expenseTx.reduce((s, t) => s + t.amount, 0);

  // Savings rate
  const savingsRate = totalIncome > 0
    ? (((totalIncome - totalExpense) / totalIncome) * 100).toFixed(0)
    : 0;
  $('#stat-savings-rate').textContent = savingsRate + '%';
  $('#stat-savings-rate').style.color = savingsRate >= 0 ? '#10b981' : '#ef4444';

  // Average daily expense
  const daysInMonth = getDaysInMonth(monthStr);
  const today = new Date();
  const [y, m] = monthStr.split('-').map(Number);
  const isCurrentMonth = today.getFullYear() === y && (today.getMonth() + 1) === m;
  const daysElapsed = isCurrentMonth ? today.getDate() : daysInMonth;
  const avgDaily = daysElapsed > 0 ? Math.round(totalExpense / daysElapsed) : 0;
  $('#stat-avg-daily').textContent = formatMoneyShort(avgDaily) + '₫';

  // Top expense category
  const groups = groupByCategory(expenseTx);
  if (groups.length > 0) {
    const top = groups[0];
    const cat = getCategoryInfo('expense', top.category);
    $('#stat-top-category').textContent = cat.icon + ' ' + cat.name;
  } else {
    $('#stat-top-category').textContent = '—';
  }

  // Transaction count
  $('#stat-tx-count').textContent = monthTx.length;
}

// === Category Breakdown Bars ===
function renderCategoryBreakdown() {
  const monthVal = elFilterMonth.value || getCurrentMonth();
  elMonthlyTitle.textContent = `Chi tiết danh mục - ${getMonthName(monthVal)}`;

  const monthTx = getMonthTransactions(monthVal);

  if (monthTx.length === 0) {
    elCategoryBreakdown.innerHTML = '<p class="empty-state">Không có dữ liệu tháng này.</p>';
    return;
  }

  const groups = {};
  monthTx.forEach(t => {
    const key = `${t.type}:${t.category}`;
    if (!groups[key]) {
      groups[key] = { type: t.type, category: t.category, total: 0 };
    }
    groups[key].total += t.amount;
  });

  const sorted = Object.values(groups).sort((a, b) => b.total - a.total);
  const maxAmount = Math.max(...sorted.map(g => g.total));
  const totalAll = sorted.reduce((s, g) => s + g.total, 0);

  let html = '';
  sorted.forEach(g => {
    const cat = getCategoryInfo(g.type, g.category);
    const barPct = maxAmount > 0 ? (g.total / maxAmount) * 100 : 0;
    const sharePct = totalAll > 0 ? ((g.total / totalAll) * 100).toFixed(1) : 0;
    html += `
      <div class="cat-bar-container">
        <div class="cat-bar-header">
          <span class="cat-bar-name">${cat.icon} ${cat.name}</span>
          <span>
            <span class="cat-bar-amount">${formatMoney(g.total)}</span>
            <span class="cat-bar-percent">(${sharePct}%)</span>
          </span>
        </div>
        <div class="cat-bar-track">
          <div class="cat-bar-fill ${g.type}" style="width: ${barPct}%"></div>
        </div>
      </div>
    `;
  });

  elCategoryBreakdown.innerHTML = html;
}

function renderTransactions() {
  const filtered = getFilteredTransactions();

  if (filtered.length === 0) {
    const hasAny = transactions.length > 0;
    elTransactionList.innerHTML = `
      <p class="empty-state">
        ${hasAny ? 'Không tìm thấy giao dịch phù hợp.' : 'Chưa có giao dịch nào. Nhấn "+ Thêm giao dịch" để bắt đầu.'}
      </p>
    `;
    return;
  }

  let html = '';
  let lastDate = '';

  filtered.forEach(tx => {
    const cat = getCategoryInfo(tx.type, tx.category);
    const dateLabel = formatDate(tx.date);

    if (dateLabel !== lastDate) {
      html += `<div class="date-header">${dateLabel}</div>`;
      lastDate = dateLabel;
    }

    const sign = tx.type === 'income' ? '+' : '-';

    html += `
      <div class="tx-item" data-id="${tx.id}">
        <div class="tx-icon ${tx.type}">${cat.icon}</div>
        <div class="tx-info">
          <div class="tx-category">${cat.name}</div>
          <div class="tx-description">${tx.description || '—'}</div>
        </div>
        <div class="tx-right">
          <div class="tx-amount ${tx.type}">${sign}${formatMoney(tx.amount)}</div>
        </div>
        <div class="tx-actions">
          <button class="btn-edit" onclick="openEditModal('${tx.id}')" title="Sửa">✏️</button>
          <button class="btn-delete" onclick="confirmDelete('${tx.id}')" title="Xóa">🗑️</button>
        </div>
      </div>
    `;
  });

  elTransactionList.innerHTML = html;
}

function renderFilterCategories() {
  const typeVal = elFilterType.value;
  let cats = [];

  if (typeVal === 'income') {
    cats = CATEGORIES.income;
  } else if (typeVal === 'expense') {
    cats = CATEGORIES.expense;
  } else {
    cats = [...CATEGORIES.income, ...CATEGORIES.expense];
  }

  let html = '<option value="all">Tất cả danh mục</option>';
  cats.forEach(c => {
    html += `<option value="${c.id}">${c.icon} ${c.name}</option>`;
  });
  elFilterCategory.innerHTML = html;
}

function renderAll() {
  renderSummary();
  renderDashboard();
  renderCategoryBreakdown();
  renderTransactions();
}

// === Modal ===
function openAddModal() {
  elFormId.value = '';
  elModalTitle.textContent = 'Thêm giao dịch';
  currentType = 'expense';
  updateTypeToggle();
  updateFormCategories();
  elFormAmount.value = '';
  elFormCategory.value = '';
  elFormDescription.value = '';
  elFormDate.value = getToday();
  elModalOverlay.classList.add('active');
  elFormAmount.focus();
}

function openEditModal(id) {
  const tx = transactions.find(t => t.id === id);
  if (!tx) return;

  elFormId.value = tx.id;
  elModalTitle.textContent = 'Sửa giao dịch';
  currentType = tx.type;
  updateTypeToggle();
  updateFormCategories();
  elFormAmount.value = tx.amount;
  elFormCategory.value = tx.category;
  elFormDescription.value = tx.description || '';
  elFormDate.value = tx.date;
  elModalOverlay.classList.add('active');
}

function closeModal() {
  elModalOverlay.classList.remove('active');
}

function updateTypeToggle() {
  elToggleExpense.classList.toggle('active', currentType === 'expense');
  elToggleIncome.classList.toggle('active', currentType === 'income');
}

function updateFormCategories() {
  const cats = CATEGORIES[currentType];
  let html = '<option value="">-- Chọn danh mục --</option>';
  cats.forEach(c => {
    html += `<option value="${c.id}">${c.icon} ${c.name}</option>`;
  });
  elFormCategory.innerHTML = html;
}

// === Delete Confirmation ===
function confirmDelete(id) {
  deleteTargetId = id;
  elDeleteOverlay.classList.add('active');
}

function closeDeleteModal() {
  deleteTargetId = null;
  elDeleteOverlay.classList.remove('active');
}

// === Event Listeners ===
$('#btn-add').addEventListener('click', openAddModal);

elToggleExpense.addEventListener('click', () => {
  currentType = 'expense';
  updateTypeToggle();
  updateFormCategories();
});

elToggleIncome.addEventListener('click', () => {
  currentType = 'income';
  updateTypeToggle();
  updateFormCategories();
});

elForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const amount = parseInt(elFormAmount.value);
  if (!amount || amount <= 0) return;

  const data = {
    type: currentType,
    amount,
    category: elFormCategory.value,
    description: elFormDescription.value.trim(),
    date: elFormDate.value,
  };

  const editId = elFormId.value;
  if (editId) {
    updateTransaction(editId, data);
  } else {
    addTransaction({
      id: generateId(),
      ...data,
      createdAt: new Date().toISOString(),
    });
  }

  closeModal();
  renderAll();
});

$('#btn-close-modal').addEventListener('click', closeModal);
$('#btn-cancel').addEventListener('click', closeModal);
elModalOverlay.addEventListener('click', (e) => {
  if (e.target === elModalOverlay) closeModal();
});

$('#btn-confirm-delete').addEventListener('click', () => {
  if (deleteTargetId) {
    deleteTransaction(deleteTargetId);
    closeDeleteModal();
    renderAll();
  }
});

$('#btn-cancel-delete').addEventListener('click', closeDeleteModal);
elDeleteOverlay.addEventListener('click', (e) => {
  if (e.target === elDeleteOverlay) closeDeleteModal();
});

elFilterMonth.addEventListener('change', renderAll);
elFilterType.addEventListener('change', () => {
  renderFilterCategories();
  renderAll();
});
elFilterCategory.addEventListener('change', renderAll);
elSearch.addEventListener('input', renderAll);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (elDeleteOverlay.classList.contains('active')) {
      closeDeleteModal();
    } else if (elModalOverlay.classList.contains('active')) {
      closeModal();
    }
  }
});

// === Sample Data (realistic for mid-level IT professional in HCMC) ===
function loadSampleData() {
  const sample = [
    // --- Income ---
    { id: 's01', type: 'income',  amount: 28000000, category: 'luong',     description: 'Lương tháng 2 - công ty FPT',         date: '2026-02-05', createdAt: '2026-02-05T08:00:00Z' },
    { id: 's02', type: 'income',  amount: 8500000,  category: 'freelance', description: 'Dự án landing page cho khách Upwork',  date: '2026-02-12', createdAt: '2026-02-12T20:00:00Z' },
    { id: 's03', type: 'income',  amount: 2000000,  category: 'thuong',    description: 'Thưởng KPI Q1 đợt 1',                 date: '2026-02-20', createdAt: '2026-02-20T09:00:00Z' },
    // --- Rent ---
    { id: 's04', type: 'expense', amount: 7500000,  category: 'nhadat',    description: 'Tiền thuê căn hộ mini Q. Bình Thạnh', date: '2026-02-01', createdAt: '2026-02-01T08:00:00Z' },
    // --- Food & Groceries ---
    { id: 's05', type: 'expense', amount: 850000,   category: 'anuong',    description: 'Đi chợ Bà Chiểu - rau, thịt, trứng', date: '2026-02-02', createdAt: '2026-02-02T07:30:00Z' },
    { id: 's06', type: 'expense', amount: 185000,   category: 'anuong',    description: 'Cơm trưa văn phòng + trà sữa',        date: '2026-02-03', createdAt: '2026-02-03T12:15:00Z' },
    { id: 's07', type: 'expense', amount: 920000,   category: 'anuong',    description: 'Đi chợ tuần 2 - thực phẩm cả tuần',   date: '2026-02-09', createdAt: '2026-02-09T08:00:00Z' },
    { id: 's08', type: 'expense', amount: 450000,   category: 'anuong',    description: 'Ăn lẩu Haidilao với đồng nghiệp',     date: '2026-02-14', createdAt: '2026-02-14T19:00:00Z' },
    { id: 's09', type: 'expense', amount: 780000,   category: 'anuong',    description: 'Đi chợ tuần 3 + mua dầu ăn, gạo',    date: '2026-02-16', createdAt: '2026-02-16T09:00:00Z' },
    { id: 's10', type: 'expense', amount: 320000,   category: 'anuong',    description: 'Order GrabFood - bún bò + pizza',      date: '2026-02-21', createdAt: '2026-02-21T18:30:00Z' },
    // --- Transport ---
    { id: 's11', type: 'expense', amount: 115000,   category: 'dichuyen',  description: 'Đổ xăng RON 95 - xe Wave',            date: '2026-02-04', createdAt: '2026-02-04T17:30:00Z' },
    { id: 's12', type: 'expense', amount: 78000,    category: 'dichuyen',  description: 'GrabBike đi họp khách hàng Q.1',       date: '2026-02-11', createdAt: '2026-02-11T09:00:00Z' },
    { id: 's13', type: 'expense', amount: 120000,   category: 'dichuyen',  description: 'Đổ xăng + gửi xe tháng',              date: '2026-02-18', createdAt: '2026-02-18T17:45:00Z' },
    // --- Utilities ---
    { id: 's14', type: 'expense', amount: 680000,   category: 'hoadon',    description: 'Tiền điện tháng 1 (máy lạnh nhiều)',   date: '2026-02-07', createdAt: '2026-02-07T10:00:00Z' },
    { id: 's15', type: 'expense', amount: 95000,    category: 'hoadon',    description: 'Tiền nước sinh hoạt',                  date: '2026-02-07', createdAt: '2026-02-07T10:05:00Z' },
    { id: 's16', type: 'expense', amount: 220000,   category: 'hoadon',    description: 'Internet VNPT 100Mbps',                date: '2026-02-07', createdAt: '2026-02-07T10:10:00Z' },
    { id: 's17', type: 'expense', amount: 149000,   category: 'hoadon',    description: 'Gói cước VinaPhone 4G - 10GB/ngày',    date: '2026-02-06', createdAt: '2026-02-06T08:00:00Z' },
    // --- Entertainment ---
    { id: 's18', type: 'expense', amount: 150000,   category: 'giaitri',   description: '2 vé CGV xem phim cuối tuần',          date: '2026-02-08', createdAt: '2026-02-08T19:00:00Z' },
    { id: 's19', type: 'expense', amount: 135000,   category: 'giaitri',   description: 'Cafe Highlands với bạn + bánh',        date: '2026-02-15', createdAt: '2026-02-15T15:00:00Z' },
    { id: 's20', type: 'expense', amount: 600000,   category: 'giaitri',   description: 'Gym California tháng 2',               date: '2026-02-01', createdAt: '2026-02-01T06:00:00Z' },
    { id: 's21', type: 'expense', amount: 79000,    category: 'giaitri',   description: 'Spotify Premium tháng 2',              date: '2026-02-01', createdAt: '2026-02-01T00:01:00Z' },
    // --- Shopping ---
    { id: 's22', type: 'expense', amount: 890000,   category: 'muasam',    description: 'Áo sơ mi + quần kaki Uniqlo',          date: '2026-02-10', createdAt: '2026-02-10T14:00:00Z' },
    { id: 's23', type: 'expense', amount: 350000,   category: 'muasam',    description: 'Dầu gội, sữa tắm, kem đánh răng',     date: '2026-02-13', createdAt: '2026-02-13T11:00:00Z' },
    // --- Healthcare ---
    { id: 's24', type: 'expense', amount: 450000,   category: 'yte',       description: 'Khám răng định kỳ - Nha khoa Kim',    date: '2026-02-17', createdAt: '2026-02-17T09:00:00Z' },
    { id: 's25', type: 'expense', amount: 185000,   category: 'yte',       description: 'Thuốc cảm + vitamin C',                date: '2026-02-22', createdAt: '2026-02-22T18:00:00Z' },
    // --- Education ---
    { id: 's26', type: 'expense', amount: 399000,   category: 'giaoduc',   description: 'Khóa Docker & K8s trên Udemy',        date: '2026-02-06', createdAt: '2026-02-06T21:00:00Z' },
    // --- 20 giao dịch bổ sung ---
    { id: 's27', type: 'expense', amount: 165000,   category: 'anuong',    description: 'Bún chả Hà Nội + nước mía',            date: '2026-02-05', createdAt: '2026-02-05T12:00:00Z' },
    { id: 's28', type: 'expense', amount: 540000,   category: 'anuong',    description: 'Đi chợ tuần 4 - cá, tôm, rau củ',     date: '2026-02-23', createdAt: '2026-02-23T08:30:00Z' },
    { id: 's29', type: 'expense', amount: 275000,   category: 'anuong',    description: 'Sinh nhật đồng nghiệp - góp tiền ăn',  date: '2026-02-19', createdAt: '2026-02-19T18:00:00Z' },
    { id: 's30', type: 'expense', amount: 95000,    category: 'anuong',    description: 'Bánh mì Phượng + cafe sáng',            date: '2026-02-24', createdAt: '2026-02-24T07:15:00Z' },
    { id: 's31', type: 'expense', amount: 65000,    category: 'dichuyen',  description: 'Grab đi sân bay đón bạn',               date: '2026-02-22', createdAt: '2026-02-22T14:00:00Z' },
    { id: 's32', type: 'expense', amount: 200000,   category: 'dichuyen',  description: 'Thay nhớt + rửa xe máy',                date: '2026-02-15', createdAt: '2026-02-15T10:00:00Z' },
    { id: 's33', type: 'expense', amount: 1200000,  category: 'muasam',    description: 'Chuột Logitech MX Master 3S',           date: '2026-02-12', createdAt: '2026-02-12T22:00:00Z' },
    { id: 's34', type: 'expense', amount: 250000,   category: 'muasam',    description: 'Sách "Clean Code" + "System Design"',   date: '2026-02-08', createdAt: '2026-02-08T16:00:00Z' },
    { id: 's35', type: 'expense', amount: 180000,   category: 'giaitri',   description: 'Bi-a với nhóm bạn đại học',             date: '2026-02-22', createdAt: '2026-02-22T20:30:00Z' },
    { id: 's36', type: 'expense', amount: 350000,   category: 'giaitri',   description: 'Karaoke team building cuối tuần',       date: '2026-02-21', createdAt: '2026-02-21T21:00:00Z' },
    { id: 's37', type: 'expense', amount: 120000,   category: 'hoadon',    description: 'Phí quản lý chung cư tháng 2',          date: '2026-02-03', createdAt: '2026-02-03T08:00:00Z' },
    { id: 's38', type: 'expense', amount: 299000,   category: 'giaoduc',   description: 'ChatGPT Plus subscription tháng 2',     date: '2026-02-01', createdAt: '2026-02-01T00:05:00Z' },
    { id: 's39', type: 'expense', amount: 750000,   category: 'yte',       description: 'Khám mắt + mua kính mới',               date: '2026-02-10', createdAt: '2026-02-10T09:30:00Z' },
    { id: 's40', type: 'expense', amount: 500000,   category: 'nhadat',    description: 'Mua rèm cửa mới cho phòng ngủ',         date: '2026-02-09', createdAt: '2026-02-09T15:00:00Z' },
    { id: 's41', type: 'income',  amount: 3500000,  category: 'freelance', description: 'Fix bug app React Native cho khách',     date: '2026-02-18', createdAt: '2026-02-18T22:00:00Z' },
    { id: 's42', type: 'income',  amount: 1500000,  category: 'dautu',     description: 'Cổ tức quỹ VFMVN30 Q4/2025',           date: '2026-02-15', createdAt: '2026-02-15T08:00:00Z' },
    { id: 's43', type: 'income',  amount: 500000,   category: 'khac_in',   description: 'Bạn trả lại tiền mượn',                 date: '2026-02-11', createdAt: '2026-02-11T19:00:00Z' },
    { id: 's44', type: 'income',  amount: 2000000,  category: 'kinhdoanh', description: 'Bán template Figma trên Gumroad',       date: '2026-02-23', createdAt: '2026-02-23T14:00:00Z' },
    { id: 's45', type: 'expense', amount: 420000,   category: 'anuong',    description: 'Đãi bạn gái ăn tối Valentine',          date: '2026-02-14', createdAt: '2026-02-14T20:00:00Z' },
    { id: 's46', type: 'expense', amount: 380000,   category: 'muasam',    description: 'Hoa + quà Valentine cho bạn gái',       date: '2026-02-14', createdAt: '2026-02-14T17:00:00Z' },
  ];
  transactions = sample;
  save();
}

// === Init ===
function init() {
  // Force reload sample data if it's the old version (10 items) or empty
  const hasOldData = transactions.length > 0 && transactions.length < 46 && transactions.some(t => t.id && t.id.startsWith('s'));
  if (transactions.length === 0 || hasOldData) {
    loadSampleData();
  }
  elFilterMonth.value = getCurrentMonth();
  renderFilterCategories();
  renderAll();
}

init();
