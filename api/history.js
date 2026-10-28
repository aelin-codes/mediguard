const { getPool, memoryHistory } = require('./db');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const pool = getPool();

    try {
        if (req.method === 'GET') {
            if (pool) {
                const [rows] = await pool.query('SELECT id, action, medicine_name, created_at FROM activity_history ORDER BY created_at DESC LIMIT 50');
                return res.status(200).json(rows);
            } else {
                return res.status(200).json(memoryHistory);
            }
        }
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('History API Error:', err);
        return res.status(500).json({ error: err.message });
    }
};
