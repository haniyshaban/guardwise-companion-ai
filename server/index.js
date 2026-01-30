// GuardWise Backend Server
// Express server with SQLite database for the GuardWise security management platform

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Initialize SQLite Database
const db = new sqlite3.Database('./guardwise.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize Database Tables
function initializeDatabase() {
  db.serialize(() => {
    // Guards table with extended fields
    db.run(`
      CREATE TABLE IF NOT EXISTS guards (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        employee_id TEXT UNIQUE,
        photo_url TEXT,
        status TEXT DEFAULT 'off-duty',
        is_active INTEGER DEFAULT 1,
        onboarding_status TEXT DEFAULT 'pending',
        daily_rate REAL DEFAULT 800,
        date_of_joining TEXT,
        address TEXT,
        emergency_contact TEXT,
        documents TEXT,
        bank_details TEXT,
        uniform_installments TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Shifts table
    db.run(`
      CREATE TABLE IF NOT EXISTS shifts (
        id TEXT PRIMARY KEY,
        guard_id TEXT,
        site_id TEXT,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        location TEXT,
        is_night_shift INTEGER DEFAULT 0,
        status TEXT DEFAULT 'scheduled',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (guard_id) REFERENCES guards(id)
      )
    `);

    // Attendance logs table
    db.run(`
      CREATE TABLE IF NOT EXISTS attendance_logs (
        id TEXT PRIMARY KEY,
        guard_id TEXT NOT NULL,
        shift_id TEXT,
        date TEXT NOT NULL,
        clock_in_time TEXT,
        clock_out_time TEXT,
        within_geofence INTEGER DEFAULT 1,
        selfie_url TEXT,
        location TEXT,
        latitude REAL,
        longitude REAL,
        total_hours REAL,
        status TEXT DEFAULT 'present',
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (guard_id) REFERENCES guards(id),
        FOREIGN KEY (shift_id) REFERENCES shifts(id)
      )
    `);

    // Leave requests table
    db.run(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id TEXT PRIMARY KEY,
        guard_id TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        reason TEXT,
        leave_type TEXT DEFAULT 'casual',
        status TEXT DEFAULT 'pending',
        applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TEXT,
        reviewed_by TEXT,
        admin_notes TEXT,
        FOREIGN KEY (guard_id) REFERENCES guards(id)
      )
    `);

    // Patrol points table
    db.run(`
      CREATE TABLE IF NOT EXISTS patrol_points (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        name TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        radius_meters INTEGER DEFAULT 10,
        point_order INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Patrol logs table
    db.run(`
      CREATE TABLE IF NOT EXISTS patrol_logs (
        id TEXT PRIMARY KEY,
        guard_id TEXT NOT NULL,
        patrol_point_id TEXT NOT NULL,
        patrol_point_name TEXT,
        shift_id TEXT,
        timestamp TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        within_radius INTEGER DEFAULT 0,
        distance_from_point REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (guard_id) REFERENCES guards(id),
        FOREIGN KEY (patrol_point_id) REFERENCES patrol_points(id)
      )
    `);

    // Wake alerts table
    db.run(`
      CREATE TABLE IF NOT EXISTS wake_alerts (
        id TEXT PRIMARY KEY,
        guard_id TEXT NOT NULL,
        shift_id TEXT,
        triggered_at TEXT NOT NULL,
        responded_at TEXT,
        status TEXT DEFAULT 'pending',
        response_time_seconds INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (guard_id) REFERENCES guards(id)
      )
    `);

    // Transport sessions table
    db.run(`
      CREATE TABLE IF NOT EXISTS transport_sessions (
        id TEXT PRIMARY KEY,
        guard_id TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT,
        status TEXT DEFAULT 'active',
        location_history TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (guard_id) REFERENCES guards(id)
      )
    `);

    // Payroll records table
    db.run(`
      CREATE TABLE IF NOT EXISTS payroll_records (
        id TEXT PRIMARY KEY,
        guard_id TEXT NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        total_days_worked INTEGER DEFAULT 0,
        daily_rate REAL,
        gross_pay REAL,
        uniform_deduction REAL DEFAULT 0,
        other_deductions REAL DEFAULT 0,
        net_pay REAL,
        generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'draft',
        FOREIGN KEY (guard_id) REFERENCES guards(id),
        UNIQUE(guard_id, month, year)
      )
    `);

    // Sites table
    db.run(`
      CREATE TABLE IF NOT EXISTS sites (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        latitude REAL,
        longitude REAL,
        geofence_radius INTEGER DEFAULT 100,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables initialized');

    // Insert sample data
    insertSampleData();
  });
}

// Insert sample data
function insertSampleData() {
  // Check if sample data exists
  db.get('SELECT COUNT(*) as count FROM guards', [], (err, row) => {
    if (err || row.count > 0) return;

    // Insert sample guard
    const guardId = uuidv4();
    db.run(`
      INSERT INTO guards (id, name, email, phone, employee_id, is_active, onboarding_status, daily_rate, date_of_joining, bank_details, uniform_installments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      guardId,
      'Rajesh Kumar',
      'rajesh.kumar@guardwise.com',
      '+91 98765 43210',
      'GW-2024-0147',
      1,
      'active',
      800,
      '2024-01-15',
      JSON.stringify({
        accountNumber: '1234567890',
        ifsc: 'SBIN0000000',
        bankName: 'State Bank of India',
        accountHolderName: 'Rajesh Kumar'
      }),
      JSON.stringify({
        totalAmount: 3000,
        remainingAmount: 1500,
        monthlyDeduction: 500,
        startDate: '2024-01-15'
      })
    ]);

    // Insert sample site
    const siteId = uuidv4();
    db.run(`
      INSERT INTO sites (id, name, address, latitude, longitude, geofence_radius)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [siteId, 'Tech Park - Building A', 'Bangalore, Karnataka', 12.9716, 77.5946, 100]);

    // Insert sample patrol points
    const patrolPoints = [
      { name: 'Main Gate', lat: 12.9716, lng: 77.5946, order: 1 },
      { name: 'Parking Area A', lat: 12.9720, lng: 77.5950, order: 2 },
      { name: 'Building A Entrance', lat: 12.9725, lng: 77.5955, order: 3 },
      { name: 'Fire Exit', lat: 12.9718, lng: 77.5960, order: 4 },
      { name: 'Loading Bay', lat: 12.9712, lng: 77.5952, order: 5 },
    ];

    patrolPoints.forEach(point => {
      db.run(`
        INSERT INTO patrol_points (id, site_id, name, latitude, longitude, radius_meters, point_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [uuidv4(), siteId, point.name, point.lat, point.lng, 10, point.order]);
    });

    console.log('Sample data inserted');
  });
}

// ============ API Routes ============

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ Guards ============

// Get all guards
app.get('/api/guards', (req, res) => {
  db.all('SELECT * FROM guards ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const guards = rows.map(row => ({
      ...row,
      isActive: Boolean(row.is_active),
      onboardingStatus: row.onboarding_status,
      dailyRate: row.daily_rate,
      dateOfJoining: row.date_of_joining,
      emergencyContact: row.emergency_contact,
      documents: row.documents ? JSON.parse(row.documents) : null,
      bankDetails: row.bank_details ? JSON.parse(row.bank_details) : null,
      uniformInstallments: row.uniform_installments ? JSON.parse(row.uniform_installments) : null,
    }));
    
    res.json(guards);
  });
});

// Get guard by ID
app.get('/api/guards/:id', (req, res) => {
  db.get('SELECT * FROM guards WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Guard not found' });
    
    const guard = {
      ...row,
      isActive: Boolean(row.is_active),
      onboardingStatus: row.onboarding_status,
      dailyRate: row.daily_rate,
      documents: row.documents ? JSON.parse(row.documents) : null,
      bankDetails: row.bank_details ? JSON.parse(row.bank_details) : null,
      uniformInstallments: row.uniform_installments ? JSON.parse(row.uniform_installments) : null,
    };
    
    res.json(guard);
  });
});

// Create/Enroll new guard
app.post('/api/guards/enroll', upload.fields([
  { name: 'photograph', maxCount: 1 },
  { name: 'aadharDoc', maxCount: 1 },
  { name: 'panDoc', maxCount: 1 },
  { name: 'relievingLetter', maxCount: 1 },
]), (req, res) => {
  const { fullName, email, phone, address, emergencyContact, aadharNumber, panNumber, bankDetails } = req.body;
  const files = req.files;

  const id = uuidv4();
  const employeeId = `GW-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

  const documents = {
    aadharNumber,
    panNumber,
    photographUrl: files?.photograph?.[0]?.path,
    aadharUrl: files?.aadharDoc?.[0]?.path,
    panUrl: files?.panDoc?.[0]?.path,
    relievingLetterUrl: files?.relievingLetter?.[0]?.path,
  };

  db.run(`
    INSERT INTO guards (id, name, email, phone, employee_id, address, emergency_contact, documents, bank_details, onboarding_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, fullName, email, phone, employeeId, address, emergencyContact,
    JSON.stringify(documents),
    typeof bankDetails === 'string' ? bankDetails : JSON.stringify(bankDetails),
    'pending'
  ], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id, employeeId, message: 'Enrollment submitted successfully' });
  });
});

// Update guard profile
app.put('/api/guards/:id', (req, res) => {
  const { name, phone, address, emergencyContact, dailyRate, bankDetails, uniformInstallments } = req.body;
  
  db.run(`
    UPDATE guards 
    SET name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        address = COALESCE(?, address),
        emergency_contact = COALESCE(?, emergency_contact),
        daily_rate = COALESCE(?, daily_rate),
        bank_details = COALESCE(?, bank_details),
        uniform_installments = COALESCE(?, uniform_installments),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    name, phone, address, emergencyContact, dailyRate,
    bankDetails ? JSON.stringify(bankDetails) : null,
    uniformInstallments ? JSON.stringify(uniformInstallments) : null,
    req.params.id
  ], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Guard not found' });
    res.json({ message: 'Guard updated successfully' });
  });
});

// Update onboarding status
app.put('/api/guards/:id/onboarding-status', (req, res) => {
  const { status } = req.body;
  
  if (!['pending', 'verified', 'active'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  db.run(`
    UPDATE guards SET onboarding_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `, [status, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Guard not found' });
    res.json({ message: 'Onboarding status updated' });
  });
});

// Toggle guard active status (Deactivate/Activate)
app.put('/api/guards/:id/toggle-active', (req, res) => {
  db.get('SELECT is_active FROM guards WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Guard not found' });

    const newStatus = row.is_active ? 0 : 1;
    db.run(`
      UPDATE guards SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [newStatus, req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ isActive: Boolean(newStatus), message: `Guard ${newStatus ? 'activated' : 'deactivated'}` });
    });
  });
});

// ============ Attendance ============

// Clock in
app.post('/api/attendance/clock-in', (req, res) => {
  const { guardId, shiftId, latitude, longitude, withinGeofence, selfieUrl } = req.body;
  const id = uuidv4();
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const clockInTime = now.toISOString();

  db.run(`
    INSERT INTO attendance_logs (id, guard_id, shift_id, date, clock_in_time, latitude, longitude, within_geofence, selfie_url, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, guardId, shiftId, date, clockInTime, latitude, longitude, withinGeofence ? 1 : 0, selfieUrl, 'present'], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id, clockInTime, message: 'Clocked in successfully' });
  });
});

// Clock out
app.post('/api/attendance/clock-out', (req, res) => {
  const { guardId, latitude, longitude, withinGeofence, selfieUrl } = req.body;
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const clockOutTime = now.toISOString();

  // Find today's attendance record
  db.get(`
    SELECT * FROM attendance_logs WHERE guard_id = ? AND date = ? AND clock_out_time IS NULL
    ORDER BY clock_in_time DESC LIMIT 1
  `, [guardId, date], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'No active clock-in found' });

    // Calculate total hours
    const clockInTime = new Date(row.clock_in_time);
    const totalHours = (now - clockInTime) / (1000 * 60 * 60);

    db.run(`
      UPDATE attendance_logs 
      SET clock_out_time = ?, total_hours = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [clockOutTime, totalHours.toFixed(2), row.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ clockOutTime, totalHours: totalHours.toFixed(2), message: 'Clocked out successfully' });
    });
  });
});

// Get attendance logs
app.get('/api/attendance/logs', (req, res) => {
  const { guardId, month, year } = req.query;
  let query = 'SELECT * FROM attendance_logs WHERE 1=1';
  const params = [];

  if (guardId) {
    query += ' AND guard_id = ?';
    params.push(guardId);
  }
  if (month && year) {
    query += ' AND strftime("%m", date) = ? AND strftime("%Y", date) = ?';
    params.push(String(month).padStart(2, '0'), String(year));
  }

  query += ' ORDER BY date DESC, clock_in_time DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ============ Leave Management ============

// Submit leave request
app.post('/api/leave/request', (req, res) => {
  const { guardId, startDate, endDate, reason, leaveType } = req.body;
  const id = uuidv4();

  db.run(`
    INSERT INTO leave_requests (id, guard_id, start_date, end_date, reason, leave_type, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [id, guardId, startDate, endDate, reason, leaveType || 'casual', 'pending'], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id, message: 'Leave request submitted' });
  });
});

// Get leave requests for a guard
app.get('/api/leave/guard/:guardId', (req, res) => {
  db.all(`
    SELECT * FROM leave_requests WHERE guard_id = ? ORDER BY applied_at DESC
  `, [req.params.guardId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get all leave requests (admin)
app.get('/api/leave/all', (req, res) => {
  const { status } = req.query;
  let query = `
    SELECT lr.*, g.name as guard_name, g.employee_id 
    FROM leave_requests lr 
    JOIN guards g ON lr.guard_id = g.id
  `;
  const params = [];

  if (status) {
    query += ' WHERE lr.status = ?';
    params.push(status);
  }

  query += ' ORDER BY lr.applied_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Update leave request status (admin)
app.put('/api/leave/:id/status', (req, res) => {
  const { status, adminNotes, reviewedBy } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  db.run(`
    UPDATE leave_requests 
    SET status = ?, admin_notes = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [status, adminNotes, reviewedBy, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Leave request not found' });
    res.json({ message: `Leave request ${status}` });
  });
});

// Cancel leave request
app.delete('/api/leave/:id', (req, res) => {
  db.run(`DELETE FROM leave_requests WHERE id = ? AND status = 'pending'`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Leave request not found or already processed' });
    res.json({ message: 'Leave request cancelled' });
  });
});

// ============ Patrol ============

// Log patrol point check-in
app.post('/api/patrol/log', (req, res) => {
  const { guardId, patrolPointId, patrolPointName, shiftId, latitude, longitude, withinRadius, distanceFromPoint } = req.body;
  const id = uuidv4();
  const timestamp = new Date().toISOString();

  db.run(`
    INSERT INTO patrol_logs (id, guard_id, patrol_point_id, patrol_point_name, shift_id, timestamp, latitude, longitude, within_radius, distance_from_point)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, guardId, patrolPointId, patrolPointName, shiftId, timestamp, latitude, longitude, withinRadius ? 1 : 0, distanceFromPoint], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id, timestamp, message: 'Patrol point logged' });
  });
});

// Get patrol logs
app.get('/api/patrol/logs', (req, res) => {
  const { guardId, shiftId } = req.query;
  let query = 'SELECT * FROM patrol_logs WHERE 1=1';
  const params = [];

  if (guardId) {
    query += ' AND guard_id = ?';
    params.push(guardId);
  }
  if (shiftId) {
    query += ' AND shift_id = ?';
    params.push(shiftId);
  }

  query += ' ORDER BY timestamp DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get patrol points for a site
app.get('/api/patrol/points/:siteId', (req, res) => {
  db.all(`
    SELECT * FROM patrol_points WHERE site_id = ? ORDER BY point_order
  `, [req.params.siteId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ============ Wake Alerts ============

// Log wake alert
app.post('/api/wake-alerts/log', (req, res) => {
  const { guardId, shiftId, triggeredAt, respondedAt, status, responseTimeSeconds } = req.body;
  const id = uuidv4();

  db.run(`
    INSERT INTO wake_alerts (id, guard_id, shift_id, triggered_at, responded_at, status, response_time_seconds)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [id, guardId, shiftId, triggeredAt, respondedAt, status, responseTimeSeconds], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id, message: 'Wake alert logged' });
  });
});

// Get wake alerts
app.get('/api/wake-alerts', (req, res) => {
  const { guardId, shiftId } = req.query;
  let query = 'SELECT * FROM wake_alerts WHERE 1=1';
  const params = [];

  if (guardId) {
    query += ' AND guard_id = ?';
    params.push(guardId);
  }
  if (shiftId) {
    query += ' AND shift_id = ?';
    params.push(shiftId);
  }

  query += ' ORDER BY triggered_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ============ Transport ============

// Start transport session
app.post('/api/transport/start', (req, res) => {
  const { guardId } = req.body;
  const id = uuidv4();
  const startTime = new Date().toISOString();

  db.run(`
    INSERT INTO transport_sessions (id, guard_id, start_time, status, location_history)
    VALUES (?, ?, ?, ?, ?)
  `, [id, guardId, startTime, 'active', JSON.stringify([])], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id, startTime, message: 'Transport session started' });
  });
});

// End transport session
app.post('/api/transport/:id/end', (req, res) => {
  const endTime = new Date().toISOString();

  db.run(`
    UPDATE transport_sessions SET end_time = ?, status = 'completed' WHERE id = ?
  `, [endTime, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Transport session not found' });
    res.json({ endTime, message: 'Transport session ended' });
  });
});

// Update transport location
app.post('/api/transport/:id/location', (req, res) => {
  const { latitude, longitude } = req.body;
  const timestamp = new Date().toISOString();

  db.get('SELECT location_history FROM transport_sessions WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Transport session not found' });

    const history = JSON.parse(row.location_history || '[]');
    history.push({ timestamp, latitude, longitude });

    db.run(`
      UPDATE transport_sessions SET location_history = ? WHERE id = ?
    `, [JSON.stringify(history), req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Location updated' });
    });
  });
});

// Get active transport sessions (for admin LiveMap)
app.get('/api/transport/active', (req, res) => {
  db.all(`
    SELECT ts.*, g.name as guard_name, g.employee_id
    FROM transport_sessions ts
    JOIN guards g ON ts.guard_id = g.id
    WHERE ts.status = 'active'
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const sessions = rows.map(row => ({
      ...row,
      locationHistory: JSON.parse(row.location_history || '[]')
    }));
    
    res.json(sessions);
  });
});

// ============ Payroll ============

// Calculate and get payroll for a guard
app.get('/api/payroll/:guardId', (req, res) => {
  const { month, year } = req.query;
  const currentMonth = month || new Date().getMonth() + 1;
  const currentYear = year || new Date().getFullYear();

  // First try to get existing payroll record
  db.get(`
    SELECT * FROM payroll_records WHERE guard_id = ? AND month = ? AND year = ?
  `, [req.params.guardId, currentMonth, currentYear], (err, existingPayroll) => {
    if (err) return res.status(500).json({ error: err.message });

    if (existingPayroll) {
      return res.json(existingPayroll);
    }

    // Calculate payroll from attendance
    db.get('SELECT * FROM guards WHERE id = ?', [req.params.guardId], (err, guard) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!guard) return res.status(404).json({ error: 'Guard not found' });

      db.all(`
        SELECT * FROM attendance_logs 
        WHERE guard_id = ? 
        AND strftime('%m', date) = ? 
        AND strftime('%Y', date) = ?
        AND status = 'present'
      `, [req.params.guardId, String(currentMonth).padStart(2, '0'), String(currentYear)], (err, attendanceLogs) => {
        if (err) return res.status(500).json({ error: err.message });

        const totalDaysWorked = attendanceLogs.length;
        const dailyRate = guard.daily_rate || 800;
        const grossPay = totalDaysWorked * dailyRate;
        
        const uniformInstallments = guard.uniform_installments ? JSON.parse(guard.uniform_installments) : null;
        const uniformDeduction = uniformInstallments?.monthlyDeduction || 0;
        const pfDeduction = Math.round(grossPay * 0.12);
        const netPay = grossPay - uniformDeduction - pfDeduction;

        const payroll = {
          id: uuidv4(),
          guardId: req.params.guardId,
          guardName: guard.name,
          month: parseInt(currentMonth),
          year: parseInt(currentYear),
          totalDaysWorked,
          dailyRate,
          grossPay,
          uniformDeduction,
          otherDeductions: pfDeduction,
          netPay,
          generatedAt: new Date().toISOString(),
          status: 'draft'
        };

        res.json(payroll);
      });
    });
  });
});

// Get payroll history for a guard
app.get('/api/payroll/:guardId/history', (req, res) => {
  db.all(`
    SELECT * FROM payroll_records WHERE guard_id = ? ORDER BY year DESC, month DESC
  `, [req.params.guardId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Generate/Finalize payroll (admin)
app.post('/api/payroll/generate', (req, res) => {
  const { guardId, month, year, totalDaysWorked, dailyRate, grossPay, uniformDeduction, otherDeductions, netPay } = req.body;
  const id = uuidv4();

  db.run(`
    INSERT OR REPLACE INTO payroll_records (id, guard_id, month, year, total_days_worked, daily_rate, gross_pay, uniform_deduction, other_deductions, net_pay, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, guardId, month, year, totalDaysWorked, dailyRate, grossPay, uniformDeduction, otherDeductions, netPay, 'finalized'], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id, message: 'Payroll generated' });
  });
});

// Get all payroll records for a month (admin)
app.get('/api/payroll/all/:month/:year', (req, res) => {
  db.all(`
    SELECT pr.*, g.name as guard_name, g.employee_id
    FROM payroll_records pr
    JOIN guards g ON pr.guard_id = g.id
    WHERE pr.month = ? AND pr.year = ?
    ORDER BY g.name
  `, [req.params.month, req.params.year], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ============ Sites ============

// Get all sites
app.get('/api/sites', (req, res) => {
  db.all('SELECT * FROM sites ORDER BY name', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Create site
app.post('/api/sites', (req, res) => {
  const { name, address, latitude, longitude, geofenceRadius } = req.body;
  const id = uuidv4();

  db.run(`
    INSERT INTO sites (id, name, address, latitude, longitude, geofence_radius)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [id, name, address, latitude, longitude, geofenceRadius || 100], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id, message: 'Site created' });
  });
});

// ============ Shifts ============

// Get shifts for a guard
app.get('/api/shifts/guard/:guardId', (req, res) => {
  db.all(`
    SELECT * FROM shifts WHERE guard_id = ? ORDER BY date DESC, start_time
  `, [req.params.guardId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Create shift
app.post('/api/shifts', (req, res) => {
  const { guardId, siteId, date, startTime, endTime, location, isNightShift } = req.body;
  const id = uuidv4();

  db.run(`
    INSERT INTO shifts (id, guard_id, site_id, date, start_time, end_time, location, is_night_shift)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, guardId, siteId, date, startTime, endTime, location, isNightShift ? 1 : 0], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id, message: 'Shift created' });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`GuardWise API server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) console.error('Error closing database:', err);
    else console.log('Database connection closed');
    process.exit(0);
  });
});

module.exports = app;
