const { getPool, memoryMedicines, memoryHistory } = require('./db');
const { randomUUID } = require('crypto');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const pool = getPool();

    try {
        if (req.method === 'GET') {
            if (pool) {
                const [rows] = await pool.query('SELECT id, name, category, quantity, DATE_FORMAT(expiry_date, "%Y-%m-%d") as expiry_date FROM medicines ORDER BY expiry_date ASC');
                return res.status(200).json({ data: rows, source: 'mysql' });
            } else {
                return res.status(200).json({ data: memoryMedicines, source: 'mysql-memory-fallback' });
            }
        }

        if (req.method === 'POST') {
            const { name, category, quantity, expiry_date } = req.body || {};
            if (!name || !expiry_date || !quantity) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const id = randomUUID();
            const cleanCat = category || 'General';
            const qty = parseInt(quantity, 10);

            if (pool) {
                await pool.query(
                    'INSERT INTO medicines (id, name, category, quantity, expiry_date) VALUES (?, ?, ?, ?, ?)',
                    [id, name, cleanCat, qty, expiry_date]
                );
                await pool.query(
                    'INSERT INTO activity_history (action, medicine_name) VALUES (?, ?)',
                    ['ADDED', name]
                );
                return res.status(201).json({ id, name, category: cleanCat, quantity: qty, expiry_date });
            } else {
                const newMed = { id, name, category: cleanCat, quantity: qty, expiry_date };
                memoryMedicines.push(newMed);
                memoryMedicines.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
                memoryHistory.unshift({
                    id: Date.now(),
                    action: 'ADDED',
                    medicine_name: name,
                    created_at: new Date().toISOString()
                });
                return res.status(201).json(newMed);
            }
        }

        if (req.method === 'PUT') {
            const { id } = req.body || {};
            if (!id) return res.status(400).json({ error: 'Missing medicine ID' });

            if (pool) {
                const [rows] = await pool.query('SELECT * FROM medicines WHERE id = ?', [id]);
                if (rows.length === 0) return res.status(404).json({ error: 'Medicine not found' });

                const current = rows[0];
                if (current.quantity > 1) {
                    const newQty = current.quantity - 1;
                    await pool.query('UPDATE medicines SET quantity = ? WHERE id = ?', [newQty, id]);
                    await pool.query(
                        'INSERT INTO activity_history (action, medicine_name) VALUES (?, ?)',
                        [`USED (1 unit, ${newQty} remaining)`, current.name]
                    );
                    return res.status(200).json({ success: true, quantity: newQty });
                } else {
                    await pool.query('DELETE FROM medicines WHERE id = ?', [id]);
                    await pool.query(
                        'INSERT INTO activity_history (action, medicine_name) VALUES (?, ?)',
                        ['CONSUMED', current.name]
                    );
                    return res.status(200).json({ success: true, quantity: 0 });
                }
            } else {
                const idx = memoryMedicines.findIndex(m => m.id === id);
                if (idx === -1) return res.status(404).json({ error: 'Medicine not found' });

                const current = memoryMedicines[idx];
                if (current.quantity > 1) {
                    current.quantity -= 1;
                    memoryHistory.unshift({
                        id: Date.now(),
                        action: `USED (1 unit, ${current.quantity} remaining)`,
                        medicine_name: current.name,
                        created_at: new Date().toISOString()
                    });
                    return res.status(200).json({ success: true, quantity: current.quantity });
                } else {
                    memoryMedicines.splice(idx, 1);
                    memoryHistory.unshift({
                        id: Date.now(),
                        action: 'CONSUMED',
                        medicine_name: current.name,
                        created_at: new Date().toISOString()
                    });
                    return res.status(200).json({ success: true, quantity: 0 });
                }
            }
        }

        if (req.method === 'DELETE') {
            const { id } = req.body || req.query || {};
            if (!id) return res.status(400).json({ error: 'Missing medicine ID' });

            if (pool) {
                const [rows] = await pool.query('SELECT name FROM medicines WHERE id = ?', [id]);
                const name = rows.length > 0 ? rows[0].name : 'Medicine';
                await pool.query('DELETE FROM medicines WHERE id = ?', [id]);
                await pool.query(
                    'INSERT INTO activity_history (action, medicine_name) VALUES (?, ?)',
                    ['DISCARDED', name]
                );
                return res.status(200).json({ success: true, discarded: name });
            } else {
                const idx = memoryMedicines.findIndex(m => m.id === id);
                const name = idx !== -1 ? memoryMedicines[idx].name : 'Medicine';
                if (idx !== -1) memoryMedicines.splice(idx, 1);
                memoryHistory.unshift({
                    id: Date.now(),
                    action: 'DISCARDED',
                    medicine_name: name,
                    created_at: new Date().toISOString()
                });
                return res.status(200).json({ success: true, discarded: name });
            }
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('API Error:', err);
        return res.status(500).json({ error: err.message });
    }
};
