<?php
// database.php — SevisBirth V2 Data Layer (Production Schema)

function getDB() {
    $dbFile = __DIR__ . '/sevisbirth.db';
    $db = new PDO('sqlite:' . $dbFile);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    initSchema($db);
    seedDemoData($db);
    return $db;
}

function initSchema($db) {
    $db->exec("CREATE TABLE IF NOT EXISTS birth_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        child_name TEXT NOT NULL,
        dob TEXT NOT NULL,
        sex TEXT NOT NULL,
        birth_weight TEXT,
        birth_type TEXT,
        province TEXT,
        mother_sp_id TEXT NOT NULL,
        father_sp_id TEXT,
        birth_location TEXT NOT NULL,
        chw_id TEXT,
        facility_id TEXT,
        witness_name TEXT,
        consent_given INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'Submitted',
        nid TEXT,
        rejection_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    $db->exec("CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_sp_id TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        action TEXT NOT NULL,
        record_id INTEGER,
        details TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
}

function seedDemoData($db) {
    $count = $db->query("SELECT COUNT(*) FROM birth_records")->fetchColumn();
    if ($count == 0) {
        $stmt = $db->prepare("INSERT INTO birth_records
            (child_name, dob, sex, birth_weight, birth_type, province, mother_sp_id, father_sp_id, birth_location, chw_id, facility_id, witness_name, consent_given, status)
            VALUES
            ('Aiden Kumul',  '2024-10-12', 'Male',   '3.2kg', 'Village',  'Eastern Highlands', 'SP-PARENT-123', 'SP-FATHER-001', 'Asaro Village',         'SP-CHW-01', NULL,          'Chief Toma',  1, 'Submitted'),
            ('Marie Pangu',  '2024-11-05', 'Female', '2.8kg', 'Village',  'Morobe',            'SP-MOTHER-002', NULL,            'Huon District',          'SP-CHW-01', NULL,          'Midwife Sara',1, 'Ward Approved'),
            ('John Kaupa',   '2024-12-01', 'Male',   '3.5kg', 'Facility', 'NCD',               'SP-MOTHER-003', 'SP-FATHER-003', 'PMGH Port Moresby',      NULL,        'SP-FAC-01',    NULL,          1, 'CIR Approved'),
            ('Grace Soi',    '2024-12-10', 'Female', '2.5kg', 'Facility', 'Eastern Highlands', 'SP-PARENT-123', NULL,            'Goroka Hospital',        NULL,        'SP-FAC-01',    NULL,          1, 'Issued'),
            ('Tom Baki',     '2025-01-15', 'Male',   '3.0kg', 'Village',  'Morobe',            'SP-MOTHER-005', NULL,            'Remote Village B',       'SP-CHW-02', NULL,          'Uncle Baki',  1, 'Exception'),
            ('Lucy Hahi',    '2025-02-20', 'Female', '2.9kg', 'Facility', 'NCD',               'SP-MOTHER-006', 'SP-FATHER-006', 'Port Moresby Clinic',    NULL,        'SP-FAC-02',    NULL,          1, 'Submitted')
        ");
        $stmt->execute();

        $db->exec("UPDATE birth_records SET nid='NID-2024-001234', status='Issued' WHERE child_name='Grace Soi'");
        $db->exec("UPDATE birth_records SET nid='NID-2024-001231', status='Issued' WHERE child_name='John Kaupa'");
    }
}

function clean($data) {
    return htmlspecialchars($data ?? '', ENT_QUOTES, 'UTF-8');
}

function generateCsrfToken() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifyCsrfToken($token) {
    if (!isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $token)) {
        die("CSRF Token Validation Failed! Unauthorized submission blocked.");
    }
}

function logAudit($actor_id, $actor_role, $action, $record_id = null, $details = '') {
    try {
        $db = getDB();
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'CLI';
        $stmt = $db->prepare("INSERT INTO audit_log (actor_sp_id, actor_role, action, record_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$actor_id, $actor_role, $action, $record_id, $details, $ip]);
    } catch (Exception $e) {
        // Fail silently in production logs to not break user flow
    }
}