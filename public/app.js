// MediGuard MySQL API Client & Reactive UI Logic
(function() {
    'use strict';

    // Application State
    let medicines = [];
    let userSettings = { name: 'Household User', alert_threshold_days: 30 };
    let activityHistory = [];

    // DOM Elements
    const statTotal = document.getElementById('statTotal');
    const statSafe = document.getElementById('statSafe');
    const statExpiring = document.getElementById('statExpiring');
    const statExpired = document.getElementById('statExpired');
    const alertsSection = document.getElementById('alertsSection');
    const medicineTableBody = document.getElementById('medicineTableBody');
    const historyList = document.getElementById('historyList');
    const thresholdForm = document.getElementById('thresholdForm');
    const thresholdInput = document.getElementById('thresholdInput');
    const userNameLabel = document.getElementById('userName');
    const addMedicineForm = document.getElementById('addMedicineForm');
    const addSubmitBtn = document.getElementById('addSubmitBtn');
    const addError = document.getElementById('addError');
    const toastMessage = document.getElementById('toastMessage');
    const connectionBadge = document.getElementById('connectionBadge');
    const connectionStatusText = document.getElementById('connectionStatusText');

    // Safe Date & Expiry Calculation
    function getDaysLeft(expiryDateStr) {
        if (!expiryDateStr) return 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const cleanDateStr = String(expiryDateStr).split('T')[0];
        const [y, m, d] = cleanDateStr.split('-').map(Number);
        const exp = new Date(y, m - 1, d);
        exp.setHours(0, 0, 0, 0);
        return Math.round((exp - today) / (1000 * 60 * 60 * 24));
    }

    function getStatus(daysLeft, threshold) {
        if (daysLeft < 0) return 'EXPIRED';
        const critThreshold = Math.min(7, threshold);
        if (daysLeft <= critThreshold) return 'CRITICAL';
        if (daysLeft <= threshold) return 'WARNING';
        return 'SAFE';
    }

    function getDaysLeftLabel(daysLeft) {
        if (daysLeft < 0) {
            const ago = Math.abs(daysLeft);
            return `Expired ${ago} ${ago === 1 ? 'day ago' : 'days ago'}`;
        }
        if (daysLeft === 0) return 'Expires today';
        return `${daysLeft} ${daysLeft === 1 ? 'day left' : 'days left'}`;
    }

    function setConnectionStatus(status, label = 'MySQL Connected') {
        if (!connectionBadge) return;
        if (status === 'connected') {
            connectionBadge.className = 'db-badge db-connected';
            connectionStatusText.textContent = label;
        } else if (status === 'error') {
            connectionBadge.className = 'db-badge db-error';
            connectionStatusText.textContent = 'Connection Error';
        } else {
            connectionBadge.className = 'db-badge db-connecting';
            connectionStatusText.textContent = 'Connecting...';
        }
    }

    function showToast(msg, isError = false) {
        if (!toastMessage) return;
        toastMessage.textContent = msg;
        toastMessage.className = `toast-msg ${isError ? 'toast-error' : 'toast-success'}`;
        toastMessage.style.display = 'block';
        setTimeout(() => {
            toastMessage.style.display = 'none';
        }, 4000);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, s => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[s]));
    }

    // Data Fetchers via REST API
    async function fetchAll() {
        setConnectionStatus('connecting');
        try {
            await Promise.all([fetchSettings(), fetchMedicines(), fetchHistory()]);
            setConnectionStatus('connected', 'MySQL Connected');
            render();
        } catch (err) {
            console.error('Failed to load initial data:', err);
            setConnectionStatus('error');
        }
    }

    async function fetchSettings() {
        const res = await fetch('/api/threshold');
        if (!res.ok) throw new Error('Failed to fetch threshold settings');
        const data = await res.json();
        if (data && data.alert_threshold_days) {
            userSettings = data;
            thresholdInput.value = userSettings.alert_threshold_days;
            if (userNameLabel) userNameLabel.textContent = userSettings.name || 'Household User';
        }
    }

    async function fetchMedicines() {
        const res = await fetch('/api/medicines');
        if (!res.ok) throw new Error('Failed to fetch medicines');
        const json = await res.json();
        medicines = Array.isArray(json) ? json : (json.data || []);
    }

    async function fetchHistory() {
        const res = await fetch('/api/history');
        if (!res.ok) throw new Error('Failed to fetch activity history');
        const json = await res.json();
        activityHistory = Array.isArray(json) ? json : (json.data || []);
    }

    // Render Logic
    function render() {
        renderStatsAndAlerts();
        renderTable();
        renderHistory();
    }

    function renderStatsAndAlerts() {
        const threshold = userSettings.alert_threshold_days || 30;
        let safe = 0, expiring = 0, expired = 0;
        const expiredReminders = [];
        const expiringReminders = [];

        medicines.forEach(m => {
            const days = getDaysLeft(m.expiry_date);
            const status = getStatus(days, threshold);

            if (status === 'EXPIRED') {
                expired++;
                expiredReminders.push(`${m.name} (${m.category}) — ${getDaysLeftLabel(days)}. Do not use!`);
            } else if (status === 'SAFE') {
                safe++;
            } else {
                expiring++;
                expiringReminders.push(`${m.name} (${m.category}, Qty: ${m.quantity}) — ${getDaysLeftLabel(days)} [${status}]`);
            }
        });

        statTotal.textContent = medicines.length;
        statSafe.textContent = safe;
        statExpiring.textContent = expiring;
        statExpired.textContent = expired;

        // Render Alert Banners
        let alertsHtml = '';
        if (expiredReminders.length > 0) {
            alertsHtml += `
                <div class="alert-banner alert-red">
                    <strong>EXPIRED MEDICINES — DO NOT USE</strong>
                    <ul>
                        ${expiredReminders.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        if (expiringReminders.length > 0) {
            alertsHtml += `
                <div class="alert-banner alert-amber">
                    <strong>NEARING EXPIRY (Within ${threshold} days)</strong>
                    <ul>
                        ${expiringReminders.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        alertsSection.innerHTML = alertsHtml;
    }

    function renderTable() {
        const threshold = userSettings.alert_threshold_days || 30;
        if (medicines.length === 0) {
            medicineTableBody.innerHTML = `<tr><td colspan="7" class="empty-row">No medicines in cabinet.</td></tr>`;
            return;
        }

        medicineTableBody.innerHTML = medicines.map(m => {
            const days = getDaysLeft(m.expiry_date);
            const status = getStatus(days, threshold);
            const timeline = getDaysLeftLabel(days);

            return `
                <tr class="med-row status-border-${status.toLowerCase()}">
                    <td class="med-name" data-label="Medicine">
                        <span class="med-title">${escapeHtml(m.name)}</span>
                    </td>
                    <td data-label="Category"><span class="cat-pill">${escapeHtml(m.category || 'General')}</span></td>
                    <td data-label="Quantity"><span class="qty-badge">${m.quantity}</span></td>
                    <td data-label="Expiry Date">${m.expiry_date}</td>
                    <td data-label="Timeline"><span class="timeline-text">${escapeHtml(timeline)}</span></td>
                    <td data-label="Status"><span class="badge badge-${status}">${status}</span></td>
                    <td class="actions-cell" data-label="Actions">
                        <button class="btn btn-used" data-action="use" data-id="${m.id}" aria-label="Mark ${escapeHtml(m.name)} as used">Mark as Used</button>
                        <button class="btn btn-discard" data-action="discard" data-id="${m.id}" aria-label="Discard ${escapeHtml(m.name)}">Discard</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderHistory() {
        if (activityHistory.length === 0) {
            historyList.innerHTML = '<li>No activity recorded yet.</li>';
            return;
        }

        historyList.innerHTML = activityHistory.map(entry => {
            const date = new Date(entry.created_at);
            const ts = isNaN(date.getTime()) ? '' : date.toISOString().replace('T', ' ').substring(0, 16);
            return `<li>[${ts}] ${escapeHtml(entry.action)} — ${escapeHtml(entry.medicine_name)}</li>`;
        }).join('');
    }

    // Event Delegation for Table Actions
    medicineTableBody.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;

        const action = btn.getAttribute('data-action');
        const id = btn.getAttribute('data-id');
        const medicine = medicines.find(m => String(m.id) === id);
        if (!medicine) return;

        btn.disabled = true;

        if (action === 'use') {
            try {
                const res = await fetch('/api/medicines', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id })
                });

                if (res.ok) {
                    const result = await res.json();
                    if (result.quantity > 0) {
                        showToast(`Used 1 unit of ${medicine.name}. ${result.quantity} remaining.`);
                    } else {
                        showToast(`Consumed all units of ${medicine.name}.`);
                    }
                    await Promise.all([fetchMedicines(), fetchHistory()]);
                    render();
                } else {
                    showToast('Failed to update medicine quantity', true);
                    btn.disabled = false;
                }
            } catch (err) {
                showToast('Network error updating quantity', true);
                btn.disabled = false;
            }
        } else if (action === 'discard') {
            if (!confirm(`Are you sure you want to discard ${medicine.name}?`)) {
                btn.disabled = false;
                return;
            }

            try {
                const res = await fetch('/api/medicines', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id })
                });

                if (res.ok) {
                    showToast(`Discarded ${medicine.name}.`);
                    await Promise.all([fetchMedicines(), fetchHistory()]);
                    render();
                } else {
                    showToast('Failed to discard medicine', true);
                    btn.disabled = false;
                }
            } catch (err) {
                showToast('Network error discarding medicine', true);
                btn.disabled = false;
            }
        }
    });

    // Form Handlers
    thresholdForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const days = parseInt(thresholdInput.value, 10);
        if (isNaN(days) || days < 1) return;

        try {
            const res = await fetch('/api/threshold', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alert_threshold_days: days })
            });

            if (res.ok) {
                userSettings.alert_threshold_days = days;
                showToast(`Warning threshold updated to ${days} days.`);
                render();
            } else {
                showToast('Failed to update threshold', true);
            }
        } catch (err) {
            showToast('Network error updating threshold', true);
        }
    });

    addMedicineForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        addError.style.display = 'none';

        const name = document.getElementById('medName').value.trim();
        const category = document.getElementById('medCategory').value.trim() || 'General';
        const quantity = parseInt(document.getElementById('medQuantity').value, 10);
        const expiryDate = document.getElementById('medExpiryDate').value;

        if (!name) {
            addError.textContent = 'Medicine name is required.';
            addError.style.display = 'block';
            return;
        }
        if (!expiryDate) {
            addError.textContent = 'Expiry date is required.';
            addError.style.display = 'block';
            return;
        }
        if (isNaN(quantity) || quantity < 1) {
            addError.textContent = 'Quantity must be at least 1.';
            addError.style.display = 'block';
            return;
        }

        addSubmitBtn.disabled = true;
        addSubmitBtn.textContent = 'Adding...';

        try {
            const res = await fetch('/api/medicines', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    category,
                    quantity,
                    expiry_date: expiryDate
                })
            });

            addSubmitBtn.disabled = false;
            addSubmitBtn.textContent = 'Add Medicine';

            if (res.ok) {
                showToast(`Added ${name} to cabinet.`);
                addMedicineForm.reset();
                document.getElementById('medQuantity').value = 1;
                await Promise.all([fetchMedicines(), fetchHistory()]);
                render();
            } else {
                const data = await res.json();
                addError.textContent = 'Error: ' + (data.error || 'Failed to add medicine');
                addError.style.display = 'block';
            }
        } catch (err) {
            addSubmitBtn.disabled = false;
            addSubmitBtn.textContent = 'Add Medicine';
            addError.textContent = 'Network error adding medicine';
            addError.style.display = 'block';
        }
    });

    // Initial Load
    fetchAll();
})();
