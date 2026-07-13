<?php
// database.php — SevisBirth CRVS Data Layer (Legal & DPI Compliant)

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
        llg TEXT,
        ward TEXT,
        mother_sp_id TEXT NOT NULL,
        father_sp_id TEXT,
        birth_location TEXT NOT NULL,
        chw_id TEXT,
        facility_id TEXT,
        witness_name TEXT,
        consent_given INTEGER DEFAULT 0,
        consent_timestamp DATETIME,
        status TEXT NOT NULL DEFAULT 'Submitted',
        birth_cert_id TEXT,
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
            (child_name, dob, sex, birth_weight, birth_type, province, llg, ward, mother_sp_id, father_sp_id, birth_location, chw_id, facility_id, witness_name, consent_given, consent_timestamp, status)
            VALUES
            ('Aiden Kumul',  '2024-10-12', 'Male',   '3.2kg', 'Village',  'Eastern Highlands', 'Goroka LLG', 'Ward 3', 'SP-PARENT-123', 'SP-FATHER-001', 'Asaro Village',         'SP-CHW-01', NULL,          'Chief Toma',  1, '2024-10-12 10:00:00', 'Submitted'),
            ('Marie Pangu',  '2024-11-05', 'Female', '2.8kg', 'Village',  'Morobe',            'Huon LLG',   'Ward 1', 'SP-MOTHER-002', NULL,            'Huon District',          'SP-CHW-01', NULL,          'Midwife Sara',1, '2024-11-05 14:00:00', 'Ward Approved'),
            ('John Kaupa',   '2024-12-01', 'Male',   '3.5kg', 'Facility', 'NCD',               'Port Moresby','Ward 5', 'SP-MOTHER-003', 'SP-FATHER-003', 'PMGH Port Moresby',      NULL,        'SP-FAC-01',    NULL,          1, '2024-12-01 08:00:00', 'CIR Approved'),
            ('Grace Soi',    '2024-12-10', 'Female', '2.5kg', 'Facility', 'Eastern Highlands', 'Goroka LLG', 'Ward 2', 'SP-PARENT-123', NULL,            'Goroka Hospital',        NULL,        'SP-FAC-01',    NULL,          1, '2024-12-10 09:00:00', 'Registration Complete'),
            ('Tom Baki',     '2025-01-15', 'Male',   '3.0kg', 'Village',  'Morobe',            'Bulolo LLG', 'Ward 4', 'SP-MOTHER-005', NULL,            'Remote Village B',       'SP-CHW-02', NULL,          'Uncle Baki',  1, '2025-01-15 11:00:00', 'Exception'),
            ('Lucy Hahi',    '2025-02-20', 'Female', '2.9kg', 'Facility', 'NCD',               'Port Moresby','Ward 7', 'SP-MOTHER-006', 'SP-FATHER-006', 'Port Moresby Clinic',    NULL,        'SP-FAC-02',    NULL,          1, '2025-02-20 10:00:00', 'Submitted')
        ");
        $stmt->execute();

        // Give Grace Soi and John Kaupa completed Birth Certificate IDs
        $db->exec("UPDATE birth_records SET birth_cert_id='BC-2024-001234', status='Registration Complete' WHERE child_name='Grace Soi'");
        $db->exec("UPDATE birth_records SET birth_cert_id='BC-2024-001231', status='Registration Complete' WHERE child_name='John Kaupa'");
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
    } catch (Exception $e) {}
}