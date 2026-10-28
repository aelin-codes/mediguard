const { getPool, memorySettings } = require('./db');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const pool = getPool();

    try {
        if (req.method === 'GET') {
            if (pool) {
                const [rows] = await pool.query('SELECT name, alert_threshold_days FROM user_settings WHERE id = 1');
                if (rows.length > 0) {
                    return res.status(200).json(rows[0]);
                }
            }
            return res.status(200).json(memorySettings);
        }

        if (req.method === 'POST') {
            const { alert_threshold_days } = req.body || {};
            const days = parseInt(alert_threshold_days, 10);
            if (isNaN(days) || days < 1) {
                return res.status(400).json({ error: 'Threshold must be at least 1 day' });
            }

            if (pool) {
                await pool.query(
                    'INSERT INTO user_settings (id, name, alert_threshold_days) VALUES (1, "Household User", ?) ON DUPLICATE KEY UPDATE alert_threshold_days = ?',
                    [days, days]
                );
                return res.status(200).json({ success: true, alert_threshold_days: days });
            } else {
                memorySettings.alert_threshold_days = days;
                return res.status(200).json({ success: true, alert_threshold_days: days });
            }
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('Threshold API Error:', err);
        return res.status(500).json({ error: err.message });
    }
};
