// MediGuard MySQL Connection Pool and Auto-Init
const mysql = require('mysql2/promise');

let pool = null;

// Initial in-memory sample dataset used if MySQL host is not configured
let memoryMedicines = [
    { id: '1', name: 'Cough Syrup Dextromethorphan', category: 'Respiratory', quantity: 1, expiry_date: '2026-09-27' },
    { id: '2', name: 'Azithromycin 250mg', category: 'Antibiotic', quantity: 6, expiry_date: '2026-10-15' },
    { id: '3', name: 'Amoxicillin 500mg', category: 'Antibiotic', quantity: 10, expiry_date: '2026-10-22' },
    { id: '4', name: 'Salbutamol Inhaler 100mcg', category: 'Respiratory', quantity: 1, expiry_date: '2026-10-31' },
    { id: '5', name: 'Insulin Glargine Pen', category: 'Diabetes', quantity: 2, expiry_date: '2026-11-01' },
    { id: '6', name: 'Omeprazole 20mg', category: 'Gastroenterology', quantity: 14, expiry_date: '2026-11-03' },
    { id: '7', name: 'Ibuprofen 400mg', category: 'Pain Relief', quantity: 20, expiry_date: '2026-11-11' },
    { id: '8', name: 'Ciprofloxacin Eye Drops 0.3%', category: 'Ophthalmic', quantity: 2, expiry_date: '2026-11-15' },
    { id: '9', name: 'Cetirizine 10mg', category: 'Antihistamine', quantity: 15, expiry_date: '2026-11-17' },
    { id: '10', name: 'Metformin 500mg', category: 'Diabetes', quantity: 40, expiry_date: '2026-11-19' },
    { id: '11', name: 'Antacid Gel', category: 'Digestion', quantity: 2, expiry_date: '2027-03-27' },
    { id: '12', name: 'Paracetamol 650mg', category: 'Analgesic', quantity: 30, expiry_date: '2027-04-26' },
    { id: '13', name: 'Vitamin D3 60,000 IU', category: 'Supplement', quantity: 8, expiry_date: '2027-06-25' },
    { id: '14', name: 'Aspirin 75mg', category: 'Cardiovascular', quantity: 60, expiry_date: '2027-08-24' },
    { id: '15', name: 'Antiseptic Ointment', category: 'First Aid', quantity: 3, expiry_date: '2027-10-28' }
];

let memorySettings = { id: 1, name: 'Household User', alert_threshold_days: 30 };

let memoryHistory = [
    { id: 1, action: 'INITIAL_SETUP', medicine_name: 'MySQL Database Schema Migration', created_at: new Date().toISOString() },
    { id: 2, action: 'SEEDED', medicine_name: 'Initial Cabinet Inventory', created_at: new Date().toISOString() }
];

function getPool() {
    if (!process.env.MYSQL_HOST && !process.env.MYSQL_URL) {
        return null;
    }
    if (!pool) {
        if (process.env.MYSQL_URL) {
            pool = mysql.createPool(process.env.MYSQL_URL);
        } else {
            pool = mysql.createPool({
                host: process.env.MYSQL_HOST,
                user: process.env.MYSQL_USER || 'root',
                password: process.env.MYSQL_PASSWORD || '',
                database: process.env.MYSQL_DATABASE || 'mediguard',
                port: parseInt(process.env.MYSQL_PORT || '3306', 10),
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
                ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined
            });
        }
    }
    return pool;
}

module.exports = {
    getPool,
    memoryMedicines,
    memorySettings,
    memoryHistory
};
