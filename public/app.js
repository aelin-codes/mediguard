// MediGuard Supabase Client & Reactive UI Logic
(function() {
    'use strict';

    const SUPABASE_URL = 'https://ahfygicztfdszpxtohsg.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoZnlnaWN6dGZkc3pweHRvaHNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2OTIzMjIsImV4cCI6MjEwNjI2ODMyMn0.Hrw75vJgNiDLcVEu__9uZVoHi2MuqzEpeEuN7bRopKs';

    // Safe client initialization without global variable shadowing
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        console.error('Supabase library failed to load from CDN.');
        const badge = document.getElementById('connectionBadge');
        if (badge) {
            badge.className = 'db-badge db-error';
            badge.innerHTML = '<span class="dot-status"></span> Library Load Error';
        }
        return;
    }

    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
        
        // Strip potential time/timezone component safely
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

    function setConnectionStatus(status) {
        if (!connectionBadge) return;
        if (status === 'connected') {
            connectionBadge.className = 'db-badge db-connected';
            connectionStatusText.textContent = 'Supabase Connected';
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

    // Data Fetchers
    async function fetchAll() {
        try {
            await Promise.all([fetchSettings(), fetchMedicines(), fetchHistory()]);
            setConnectionStatus('connected');
            render();
        } catch (err) {
            console.error('Failed to load initial data:', err);
            setConnectionStatus('error');
        }
    }

    async function fetchSettings() {
        const { data, error } = await supabaseClient
            .from('user_settings')
            .select('*')
            .eq('id', 1)
            .maybeSingle();

        if (error) throw error;
        if (data) {
            userSettings = data;
            thresholdInput.value = userSettings.alert_threshold_days;
            if (userNameLabel) userNameLabel.textContent = userSettings.name;
        }
    }

    async function fetchMedicines() {
        const { data, error } = await supabaseClient
            .from('medicines')
            .select('*')
            .order('expiry_date', { ascending: true });

        if (error) throw error;
        if (data) {
            medicines = data;
        }
    }

    async function fetchHistory() {
        const { data, error } = await supabaseClient
            .from('activity_history')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        if (data) {
            activityHistory = data;
        }
    }

    // Log Activity
    async function logActivity(action, medicineName) {
        try {
            await supabaseClient
                .from('activity_history')
                .insert([{ action, medicine_name: medicineName }]);
            await fetchHistory();
            renderHistory();
        } catch (e) {
            console.warn('Could not log activity:', e);
        }
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

            // Pass only UUID m.id without vulnerable inline string interpolation
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

    // Event Delegation for Table Actions (Avoids inline onclick quoting/syntax errors)
    medicineTableBody.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;

        const action = btn.getAttribute('data-action');
        const id = btn.getAttribute('data-id');
        const medicine = medicines.find(m => String(m.id) === id);
        if (!medicine) return;

        btn.disabled = true;

        if (action === 'use') {
            if (medicine.quantity > 1) {
                const newQty = medicine.quantity - 1;
                const { error } = await supabaseClient
                    .from('medicines')
                    .update({ quantity: newQty })
                    .eq('id', id);

                if (!error) {
                    showToast(`Used 1 unit of ${medicine.name}. ${newQty} remaining.`);
                    await logActivity(`USED (1 unit, ${newQty} remaining)`, medicine.name);
                    await fetchMedicines();
                    render();
                } else {
                    showToast('Failed to update quantity', true);
                    btn.disabled = false;
                }
            } else {
                const { error } = await supabaseClient
                    .from('medicines')
                    .delete()
                    .eq('id', id);

                if (!error) {
                    showToast(`Consumed all units of ${medicine.name}.`);
                    await logActivity('CONSUMED', medicine.name);
                    await fetchMedicines();
                    render();
                } else {
                    showToast('Failed to consume medicine', true);
                    btn.disabled = false;
                }
            }
        } else if (action === 'discard') {
            if (!confirm(`Are you sure you want to discard ${medicine.name}?`)) {
                btn.disabled = false;
                return;
            }

            const { error } = await supabaseClient
                .from('medicines')
                .delete()
                .eq('id', id);

            if (!error) {
                showToast(`Discarded ${medicine.name}.`);
                await logActivity('DISCARDED', medicine.name);
                await fetchMedicines();
                render();
            } else {
                showToast('Failed to discard medicine', true);
                btn.disabled = false;
            }
        }
    });

    // Form Handlers
    thresholdForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const days = parseInt(thresholdInput.value, 10);
        if (isNaN(days) || days < 1) return;

        const { error } = await supabaseClient
            .from('user_settings')
            .upsert({ id: 1, alert_threshold_days: days });

        if (!error) {
            userSettings.alert_threshold_days = days;
            showToast(`Warning threshold updated to ${days} days.`);
            render();
        } else {
            showToast('Failed to update threshold', true);
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

        // Prevent double submission
        addSubmitBtn.disabled = true;
        addSubmitBtn.textContent = 'Adding...';

        const { error } = await supabaseClient
            .from('medicines')
            .insert([{
                name,
                category,
                quantity,
                expiry_date: expiryDate
            }]);

        addSubmitBtn.disabled = false;
        addSubmitBtn.textContent = 'Add Medicine';

        if (!error) {
            showToast(`Added ${name} to cabinet.`);
            addMedicineForm.reset();
            document.getElementById('medQuantity').value = 1;
            await logActivity('ADDED', name);
            const daysLeft = getDaysLeft(expiryDate);
            if (daysLeft < 0) {
                await logActivity('EXPIRED_DETECTED', name);
            }
            await fetchMedicines();
            render();
        } else {
            addError.textContent = 'Error adding medicine: ' + error.message;
            addError.style.display = 'block';
        }
    });

    // Realtime Subscriptions
    function setupRealtime() {
        supabaseClient.channel('mediguard-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'medicines' }, () => {
                fetchMedicines().then(render);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'user_settings' }, () => {
                fetchSettings().then(render);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_history' }, () => {
                fetchHistory().then(renderHistory);
            })
            .subscribe();
    }

    // Initialize
    fetchAll().then(setupRealtime);
})();
