<?php
// index.php — SevisBirth CRVS DPI Application

session_start();
require __DIR__ . '/database.php';

const CLIENT_ID        = 'sevisbirth_app';
const REDIRECT_URI     = 'http://localhost:8000/?action=authenticate';
const SEVISPASS_BASE   = 'http://localhost:9000';

// ---------------- Routing ----------------
 $action = $_GET['action'] ?? 'home';

if (!isset($_SESSION['user'])) {
    $public = ['home', 'login', 'authenticate', 'logout'];
    if (!in_array($action, $public, true)) {
        header('Location: ?action=home');
        exit;
    }
}

switch ($action) {
    case 'login':        handleLogin();      break;
    case 'authenticate': handleAuthenticate(); break;
    case 'logout':       handleLogout();     break;

    case 'chw_dashboard':        requireRole(['CHW']);      showChwDashboard();      break;
    case 'chw_submit':           requireRole(['CHW']);      chwSubmit();             break;
    case 'facility_dashboard':   requireRole(['FACILITY']); showFacilityDashboard(); break;
    case 'facility_submit':      requireRole(['FACILITY']); facilitySubmit();        break;
    case 'ward_dashboard':       requireRole(['WARD']);     showWardDashboard();     break;
    case 'ward_approve':         requireRole(['WARD']);     wardApprove();           break;
    case 'cir_dashboard':        requireRole(['CIR']);      showCirDashboard();      break;
    case 'cir_verify':           requireRole(['CIR']);      cirVerify();             break;
    case 'parent_wallet':        requireRole(['PARENT']);   showParentWallet();      break;
    case 'admin_dashboard':      requireRole(['ADMIN']);    showAdminDashboard();    break;
    case 'admin_exception':      requireRole(['ADMIN']);    adminException();        break;

    case 'home':
    default:                     showLogin();               break;
}

// ---------------- Auth Handlers ----------------
function handleLogin() {
    $role = strtoupper($_GET['role'] ?? '');
    $allowed = ['CHW','FACILITY','WARD','CIR','ADMIN','PARENT'];
    if (!in_array($role, $allowed, true)) die("Invalid role");

    $_SESSION['oauth_state'] = bin2hex(random_bytes(16));
    $params = http_build_query([
        'client_id'     => CLIENT_ID,
        'redirect_uri'  => REDIRECT_URI,
        'state'         => $_SESSION['oauth_state'],
        'role'          => $role,
        'response_type' => 'code',
    ]);
    header("Location: " . SEVISPASS_BASE . "/?" . $params);
    exit;
}

function handleAuthenticate() {
    if (!isset($_GET['state'], $_GET['code']) || !isset($_SESSION['oauth_state']) || !hash_equals($_SESSION['oauth_state'], $_GET['state'])) {
        die("OAuth state mismatch — possible CSRF attack blocked.");
    }

    $code = $_GET['code'];
    $post = http_build_query(['client_id' => CLIENT_ID, 'code' => $code, 'grant_type' => 'authorization_code']);

    $ctx = stream_context_create([
        'http' => [
            'method'  => 'POST',
            'header'  => "Content-Type: application/x-www-form-urlencoded\r\n" . "Content-Length: " . strlen($post) . "\r\n",
            'content' => $post,
            'ignore_errors' => true,
        ]
    ]);

    $raw  = @file_get_contents(SEVISPASS_BASE . "/token", false, $ctx);
    $json = json_decode($raw, true);

    if (!$json || !isset($json['id_token'])) die("Token exchange failed. Response: " . htmlspecialchars($raw));

    $parts = explode('.', $json['id_token']);
    $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
    if (!$payload) die("Invalid ID token payload.");

    $_SESSION['user'] = [
        'sp_id' => $payload['sub'],
        'name'  => $payload['name'],
        'tier'  => (int)$payload['tier'],
        'role'  => strtoupper($payload['role']),
    ];

    logAudit($payload['sub'], $payload['role'], 'SSO_LOGIN', null, 'Tier ' . $payload['tier']);

    $map = ['CHW'=>'chw_dashboard','FACILITY'=>'facility_dashboard','WARD'=>'ward_dashboard','CIR'=>'cir_dashboard','ADMIN'=>'admin_dashboard','PARENT'=>'parent_wallet'];
    header("Location: ?action=" . ($map[$_SESSION['user']['role']] ?? 'home'));
    exit;
}

function handleLogout() {
    if (isset($_SESSION['user'])) logAudit($_SESSION['user']['sp_id'], $_SESSION['user']['role'], 'LOGOUT');
    session_destroy();
    header("Location: ?action=home");
    exit;
}

function requireRole(array $roles) {
    if (!isset($_SESSION['user']) || !in_array($_SESSION['user']['role'], $roles, true)) {
        http_response_code(403); die("Access denied. Required role: " . implode(' or ', $roles));
    }
}

function currentUser() { return $_SESSION['user'] ?? null; }

// ---------------- Layout & Views ----------------
function pageHeader($title, $role) {
    $u = currentUser();
    $tierBadge = $u['tier'] == 2 ? '<span class="badge bg-success">Tier 2 Verified</span>' : '<span class="badge bg-warning text-dark">Tier 1 Basic</span>';
    ?><!DOCTYPE html><html lang="en"><head>
    <meta charset="UTF-8">
    <title><?= clean($title) ?> | SevisBirth</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body { background: #f4f6f9; font-family: 'Segoe UI', Roboto, sans-serif; }
        .navbar { background: #1e3a8a; }
        .navbar-brand, .nav-link { color: #fff !important; }
        .card { border: none; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 20px; }
        .card-header { background: #fff; border-bottom: 1px solid #eee; font-weight: 700; }
        .table th { background: #f8f9fa; }
        .stat-card { border-left: 5px solid #1e3a8a; }
        .offline-toggle { cursor: pointer; }
    </style></head><body>
    <nav class="navbar navbar-expand-lg">
        <div class="container">
            <a class="navbar-brand" href="?action=home"><i class="fas fa-baby"></i> SevisBirth <small>CRVS</small></a>
            <div class="ms-auto d-flex align-items-center text-white">
                <span class="me-3">👤 <?= clean($u['name']) ?> (<?= clean($role) ?>) <?= $tierBadge ?></span>
                <a href="?action=logout" class="btn btn-sm btn-outline-light"><i class="fas fa-sign-out-alt"></i> Logout</a>
            </div>
        </div>
    </nav>
    <div class="container mt-4">
    <?php
}
function pageFooter() { ?>
    <hr class="mt-5">
    <footer class="text-center text-muted py-4">
        <small>Secured by SevisPass National Identity (OIDC) | &copy; Government of Papua New Guinea</small>
    </footer>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </body></html>
<?php }

function showLogin() {
    $u = currentUser();
    if ($u) {
        $map = ['CHW'=>'chw_dashboard','FACILITY'=>'facility_dashboard','WARD'=>'ward_dashboard','CIR'=>'cir_dashboard','ADMIN'=>'admin_dashboard','PARENT'=>'parent_wallet'];
        header("Location: ?action=" . ($map[$u['role']] ?? 'home')); exit;
    }
    ?>
    <!DOCTYPE html><html lang="en"><head>
    <meta charset="UTF-8"><title>SevisBirth Secure Portal</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>body{background:linear-gradient(135deg,#1e3a8a 0%,#3182ce 100%);height:100vh;display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',sans-serif}.login-card{background:#fff;width:500px;border-radius:15px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.3)}.login-header{background:#fff;padding:30px;text-align:center;border-bottom:1px solid #eee}.role-btn{display:flex;align-items:center;padding:15px;margin-bottom:10px;text-decoration:none;color:#fff;border-radius:8px;transition:0.2s}.role-btn:hover{transform:translateX(5px);color:#fff;box-shadow:0 4px 12px rgba(0,0,0,0.2)}</style>
    </head><body>
        <div class="login-card">
            <div class="login-header">
                <h3 class="text-primary mb-0">SevisBirth</h3>
                <p class="text-muted mb-0">Papua New Guinea CRVS Digital Public Infrastructure</p>
            </div>
            <div class="p-4">
                <p class="text-muted text-center small mb-3">Select your role to authenticate via SevisPass National ID</p>
                <a href="?action=login&role=CHW" class="role-btn" style="background:#007bff"><i class="fas fa-stethoscope me-3 fs-5"></i> Community Health Worker</a>
                <a href="?action=login&role=FACILITY" class="role-btn" style="background:#17a2b8"><i class="fas fa-hospital me-3 fs-5"></i> Health Facility Admin</a>
                <a href="?action=login&role=WARD" class="role-btn" style="background:#ffc107;color:#333!important"><i class="fas fa-landmark me-3 fs-5"></i> Ward / District Officer</a>
                <a href="?action=login&role=CIR" class="role-btn" style="background:#dc3545"><i class="fas fa-passport me-3 fs-5"></i> PNGCIR National Registrar</a>
                <a href="?action=login&role=ADMIN" class="role-btn" style="background:#343a40"><i class="fas fa-shield-alt me-3 fs-5"></i> System Admin (Analytics)</a>
                <a href="?action=login&role=PARENT" class="role-btn" style="background:#28a745"><i class="fas fa-wallet me-3 fs-5"></i> Parent / Citizen Wallet</a>
            </div>
        </div>
    </body></html>
    <?php
}

// ---------------- CHW (Offline & Consent Focus) ----------------
function showChwDashboard() {
    $db = getDB(); $u = currentUser();
    $records = $db->prepare("SELECT * FROM birth_records WHERE chw_id = ? ORDER BY id DESC");
    $records->execute([$u['sp_id']]);
    $rows = $records->fetchAll();
    pageHeader('CHW Dashboard', 'Community Health Worker'); 
    ?>
    <div class="d-flex justify-content-between align-items-center mb-4">
        <h3><i class="fas fa-stethoscope text-primary"></i> Field Worker Dashboard</h3>
        <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="offlineToggle" onchange="toggleOffline()">
            <label class="form-check-label" for="offlineToggle"><i class="fas fa-wifi"></i> Field Mode (Offline)</label>
        </div>
    </div>

    <div id="syncQueue" class="alert alert-info d-none">
        <i class="fas fa-sync-alt"></i> <strong>Offline Drafts:</strong> You have <span id="draftCount">0</span> birth records saved on this device. <button class="btn btn-sm btn-primary ms-2" onclick="syncDrafts()">Sync Now</button>
    </div>

    <div class="card">
        <div class="card-header"><i class="fas fa-plus-circle"></i> Record Village Birth</div>
        <div class="card-body">
            <form method="post" action="?action=chw_submit" id="birthForm">
                <input type="hidden" name="csrf" value="<?= generateCsrfToken() ?>">
                <div class="row g-3">
                    <div class="col-md-6"><label class="form-label">Child Name</label><input name="child_name" class="form-control" required></div>
                    <div class="col-md-3"><label class="form-label">Date of Birth</label><input type="date" name="dob" class="form-control" required></div>
                    <div class="col-md-3"><label class="form-label">Sex</label><select name="sex" class="form-select"><option>Male</option><option>Female</option></select></div>
                    <div class="col-md-4"><label class="form-label">Birth Weight</label><input name="birth_weight" class="form-control" placeholder="e.g. 3.2kg"></div>
                    <div class="col-md-4"><label class="form-label">Province</label><select name="province" class="form-select"><option>Eastern Highlands</option><option>Morobe</option><option>NCD</option></select></div>
                    <div class="col-md-4"><label class="form-label">Village / Location</label><input name="birth_location" class="form-control" required></div>
                    <div class="col-md-6"><label class="form-label">Mother's SevisPass ID</label><input name="mother_sp_id" class="form-control" placeholder="SP-PARENT-xxx" required></div>
                    <div class="col-md-6"><label class="form-label">Father's SevisPass ID (Optional)</label><input name="father_sp_id" class="form-control"></div>
                    <div class="col-md-12"><label class="form-label">Witness Name (Village Chief/Midwife)</label><input name="witness_name" class="form-control" required></div>
                </div>
                <hr>
                <div class="form-check mb-3">
                    <input class="form-check-input" type="checkbox" id="consent" name="consent" value="1" required>
                    <label class="form-check-label" for="consent">
                        <strong>Data Agreement & Consent</strong><br>
                        <small class="text-muted">I confirm that I have read the data collection agreement to the parent/guardian. They consent to share this biological data with the Civil Registry for the purpose of National ID issuance.</small>
                    </label>
                </div>
                <button class="btn btn-primary" type="submit"><i class="fas fa-save"></i> Submit Record</button>
            </form>
        </div>
    </div>

    <div class="card">
        <div class="card-header"><i class="fas fa-list"></i> My Submissions</div>
        <div class="card-body">
            <table class="table table-hover">
                <thead><tr><th>ID</th><th>Child</th><th>DOB</th><th>Village</th><th>Status</th></tr></thead>
                <tbody>
                <?php foreach ($rows as $r): ?>
                    <tr><td>#<?= $r['id'] ?></td><td><?= clean($r['child_name']) ?></td><td><?= clean($r['dob']) ?></td><td><?= clean($r['birth_location']) ?></td><td><span class="badge bg-secondary"><?= clean($r['status']) ?></span></td></tr>
                <?php endforeach; ?>
                <?php if (!$rows) echo '<tr><td colspan=5 class="text-center text-muted">No records submitted.</td></tr>'; ?>
                </tbody>
            </table>
        </div>
    </div>

    <script>
        // Simulated Offline Storage Logic
        function toggleOffline() {
            let isOffline = document.getElementById('offlineToggle').checked;
            localStorage.setItem('chw_offline', isOffline ? '1' : '0');
            updateDraftCount();
        }
        function updateDraftCount() {
            let drafts = JSON.parse(localStorage.getItem('chw_drafts') || '[]');
            document.getElementById('draftCount').innerText = drafts.length;
            document.getElementById('syncQueue').classList.toggle('d-none', drafts.length === 0);
        }
        function syncDrafts() {
            alert("Simulating Sync... " + localStorage.getItem('chw_drafts') + " would be pushed to server.");
            localStorage.removeItem('chw_drafts');
            updateDraftCount();
        }
        window.onload = function() {
            if(localStorage.getItem('chw_offline') === '1') document.getElementById('offlineToggle').checked = true;
            updateDraftCount();
        }
    </script>
    <?php pageFooter();
}

function chwSubmit() {
    verifyCsrfToken($_POST['csrf'] ?? '');
    if (!isset($_POST['consent'])) die("Error: Data Agreement consent is required to submit.");
    
    $u = currentUser(); $db = getDB();
    $stmt = $db->prepare("INSERT INTO birth_records
        (child_name,dob,sex,birth_weight,birth_type,province,mother_sp_id,father_sp_id,birth_location,chw_id,witness_name,consent_given,status)
        VALUES (?,?,?,?, 'Village', ?, ?, ?, ?, ?, ?, 1, 'Submitted')");
    $stmt->execute([
        $_POST['child_name'], $_POST['dob'], $_POST['sex'], $_POST['birth_weight'],
        $_POST['province'], $_POST['mother_sp_id'], $_POST['father_sp_id'] ?: null,
        $_POST['birth_location'], $u['sp_id'], $_POST['witness_name']
    ]);
    $id = $db->lastInsertId();
    logAudit($u['sp_id'], 'CHW', 'SUBMIT_BIRTH', $id, $_POST['child_name']);
    header("Location: ?action=chw_dashboard");
    exit;
}

// ---------------- FACILITY ----------------
function showFacilityDashboard() {
    $db = getDB(); $u = currentUser();
    $rows = $db->query("SELECT * FROM birth_records WHERE birth_type='Facility' ORDER BY id DESC")->fetchAll();
    pageHeader('Facility Dashboard', 'Health Facility Admin'); ?>
    <div class="row mb-4">
        <div class="col-md-4"><div class="card stat-card p-3"><h5 class="text-muted">Total Facility Births</h5><h2><?= count($rows) ?></h2></div></div>
        <div class="col-md-4"><div class="card stat-card p-3"><h5 class="text-muted">Awaiting Ward Review</h5><h2><?= count(array_filter($rows, fn($r)=>$r['status']==='Submitted')) ?></h2></div></div>
    </div>
    <div class="card">
        <div class="card-header"><i class="fas fa-plus-circle"></i> Record Hospital Birth (HIS Integration)</div>
        <div class="card-body">
            <form method="post" action="?action=facility_submit">
                <input type="hidden" name="csrf" value="<?= generateCsrfToken() ?>">
                <div class="row g-3">
                    <div class="col-md-6"><label class="form-label">Child Name</label><input name="child_name" class="form-control" required></div>
                    <div class="col-md-3"><label class="form-label">Date of Birth</label><input type="date" name="dob" class="form-control" required></div>
                    <div class="col-md-3"><label class="form-label">Sex</label><select name="sex" class="form-select"><option>Male</option><option>Female</option></select></div>
                    <div class="col-md-6"><label class="form-label">Mother's SevisPass ID</label><input name="mother_sp_id" class="form-control" required></div>
                    <div class="col-md-6"><label class="form-label">Facility Name</label><input name="birth_location" class="form-control" value="PMGH" required></div>
                </div>
                <button class="btn btn-info mt-3 text-white" type="submit"><i class="fas fa-paper-plane"></i> Submit to CRVS</button>
            </form>
        </div>
    </div>
    <div class="card">
        <div class="card-header">Facility Registry</div>
        <div class="card-body">
            <table class="table table-hover">
                <thead><tr><th>ID</th><th>Child</th><th>DOB</th><th>Status</th></tr></thead>
                <tbody>
                <?php foreach ($rows as $r): ?>
                    <tr><td>#<?= $r['id'] ?></td><td><?= clean($r['child_name']) ?></td><td><?= clean($r['dob']) ?></td><td><span class="badge bg-secondary"><?= clean($r['status']) ?></span></td></tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
    <?php pageFooter();
}

function facilitySubmit() {
    verifyCsrfToken($_POST['csrf'] ?? '');
    $u = currentUser(); $db = getDB();
    $stmt = $db->prepare("INSERT INTO birth_records
        (child_name,dob,sex,birth_type,province,mother_sp_id,birth_location,facility_id,status)
        VALUES (?,?,?,?, 'NCD', ?, ?, ?, 'Submitted')");
    $stmt->execute([$_POST['child_name'], $_POST['dob'], $_POST['sex'], $_POST['mother_sp_id'], $_POST['birth_location'], $u['sp_id']]);
    $id = $db->lastInsertId();
    logAudit($u['sp_id'], 'FACILITY', 'SUBMIT_FACILITY_BIRTH', $id, $_POST['child_name']);
    header("Location: ?action=facility_dashboard");
    exit;
}

// ---------------- WARD ----------------
function showWardDashboard() {
    $u = currentUser();
    if ($u['tier'] < 2) { die("⛔ Policy Block: Ward approval requires SevisPass Tier 2 (Verified ID)."); }
    $db = getDB();
    $rows = $db->query("SELECT * FROM birth_records WHERE status='Submitted' ORDER BY id DESC")->fetchAll();
    pageHeader('Ward Dashboard', 'Ward / District Officer'); ?>
    <div class="card">
        <div class="card-header bg-warning"><i class="fas fa-landmark"></i> Local Government Verification Queue</div>
        <div class="card-body">
            <table class="table table-hover">
                <thead><tr><th>ID</th><th>Child</th><th>Location</th><th>Type</th><th>Action</th></tr></thead>
                <tbody>
                <?php foreach ($rows as $r): ?>
                    <tr>
                        <td>#<?= $r['id'] ?></td>
                        <td><?= clean($r['child_name']) ?></td>
                        <td><?= clean($r['birth_location']) ?></td>
                        <td><?= clean($r['birth_type']) ?></td>
                        <td><a class="btn btn-sm btn-success" href="?action=ward_approve&id=<?= $r['id'] ?>"><i class="fas fa-check"></i> Verify</a></td>
                    </tr>
                <?php endforeach; ?>
                <?php if (!$rows) echo '<tr><td colspan=5 class="text-center text-muted">No pending records.</td></tr>'; ?>
                </tbody>
            </table>
        </div>
    </div>
    <?php pageFooter();
}

function wardApprove() {
    $u = currentUser();
    if ($u['tier'] < 2) die("Policy block.");
    $db = getDB();
    $db->prepare("UPDATE birth_records SET status='Ward Approved' WHERE id=? AND status='Submitted'")->execute([$_GET['id']]);
    logAudit($u['sp_id'], 'WARD', 'WARD_APPROVE', $_GET['id']);
    header("Location: ?action=ward_dashboard");
    exit;
}

// ---------------- CIR (Official Registry Focus) ----------------
function showCirDashboard() {
    $u = currentUser();
    if ($u['tier'] < 2) die("Tier 2 required.");
    $db = getDB();
    $rows = $db->query("SELECT * FROM birth_records WHERE status IN ('Ward Approved','CIR Approved','Issued') ORDER BY id DESC")->fetchAll();
    pageHeader('CIR National Registry', 'PNGCIR Registrar'); ?>
    <div class="alert alert-danger"><strong><i class="fas fa-gavel"></i> Legal Authority:</strong> You are operating under the Civil Registration Act. All issuances are legally binding.</div>
    
    <div class="card">
        <div class="card-header bg-danger text-white"><i class="fas fa-passport"></i> NID Issuance Queue</div>
        <div class="card-body">
            <table class="table table-hover">
                <thead><tr><th>ID</th><th>Child</th><th>DOB</th><th>Status</th><th>NID</th><th>Action</th></tr></thead>
                <tbody>
                <?php foreach ($rows as $r): ?>
                    <tr>
                        <td>#<?= $r['id'] ?></td>
                        <td><?= clean($r['child_name']) ?></td>
                        <td><?= clean($r['dob']) ?></td>
                        <td><span class="badge bg-secondary"><?= clean($r['status']) ?></span></td>
                        <td><?= $r['nid'] ? clean($r['nid']) : '<i class="text-muted">Pending</i>' ?></td>
                        <td>
                            <?php if ($r['status']==='Ward Approved'): ?>
                                <a class="btn btn-sm btn-outline-danger" href="?action=cir_verify&id=<?= $r['id'] ?>"><i class="fas fa-search"></i> Verify Dossier</a>
                            <?php elseif ($r['status']==='CIR Approved'): ?>
                                <a class="btn btn-sm btn-success" href="?action=cir_verify&id=<?= $r['id'] ?>">Issue NID</a>
                            <?php else: ?> <span class="text-success"><i class="fas fa-check"></i> Complete</span> <?php endif; ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
    <?php pageFooter();
}

function cirVerify() {
    $u = currentUser();
    if ($u['tier'] < 2) die("Tier 2 required.");
    $db = getDB();
    $row = $db->prepare("SELECT * FROM birth_records WHERE id=?");
    $row->execute([$_GET['id']]);
    $r = $row->fetch();
    if (!$r) die("Not found");

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $newStatus = $r['status']==='Ward Approved' ? 'CIR Approved' : 'Issued';
        $nid = $r['nid'] ?: ('NID-' . date('Y') . '-' . str_pad($r['id'], 6, '0', STR_PAD_LEFT));
        $db->prepare("UPDATE birth_records SET status=?, nid=? WHERE id=?")->execute([$newStatus, $nid, $_GET['id']]);
        logAudit($u['sp_id'], 'CIR', $newStatus === 'Issued' ? 'ISSUE_NID' : 'CIR_APPROVE', $_GET['id'], "NID=$nid");
        header("Location: ?action=cir_dashboard");
        exit;
    }

    pageHeader('Verification Dossier', 'CIR Registrar'); ?>
    <div class="row">
        <div class="col-md-8">
            <div class="card">
                <div class="card-header bg-danger text-white">Birth Registration Dossier #<?= $r['id'] ?></div>
                <div class="card-body">
                    <table class="table table-bordered">
                        <tr><th>Child Name</th><td><?= clean($r['child_name']) ?></td></tr>
                        <tr><th>DOB & Sex</th><td><?= clean($r['dob']) ?> (<?= clean($r['sex']) ?>)</td></tr>
                        <tr><th>Birth Type</th><td><?= clean($r['birth_type']) ?> (<?= clean($r['birth_location']) ?>)</td></tr>
                        <tr><th>Mother SP ID</th><td><?= clean($r['mother_sp_id']) ?></td></tr>
                        <tr><th>Witness/Verified By</th><td><?= clean($r['witness_name'] ?: 'Facility Admin') ?></td></tr>
                    </table>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card">
                <div class="card-header">Cross-Reference & Action</div>
                <div class="card-body">
                    <p class="text-muted small">Confirm all details match national records before issuing the National ID (NID).</p>
                    <form method="post">
                        <button class="btn btn-success w-100 mb-2" type="submit"><i class="fas fa-id-card"></i> <?= $r['status']==='Ward Approved' ? 'Approve & Generate NID' : 'Mark as Issued' ?></button>
                        <a href="?action=cir_dashboard" class="btn btn-secondary w-100">Cancel</a>
                    </form>
                </div>
            </div>
        </div>
    </div>
    <?php pageFooter();
}

// ---------------- PARENT (Verifiable Credential) ----------------
function showParentWallet() {
    $u = currentUser(); $db = getDB();
    $stmt = $db->prepare("SELECT * FROM birth_records WHERE mother_sp_id=? OR father_sp_id=? ORDER BY id DESC");
    $stmt->execute([$u['sp_id'], $u['sp_id']]);
    $rows = $stmt->fetchAll();
    if (empty($rows) && $u['sp_id'] === 'SP-PARENT-123') {
        $stmt = $db->prepare("SELECT * FROM birth_records WHERE mother_sp_id='SP-PARENT-123' OR father_sp_id='SP-PARENT-123'");
        $stmt->execute(); $rows = $stmt->fetchAll();
    }
    pageHeader('SevisWallet', 'Parent / Citizen'); ?>
    <div class="card">
        <div class="card-header bg-success text-white"><i class="fas fa-wallet"></i> Digital Credentials</div>
        <div class="card-body">
            <?php if (!$rows): ?>
                <p class="text-center text-muted">No birth records linked to your SevisPass ID.</p>
            <?php endif; ?>
            <?php foreach ($rows as $r): 
                $qrData = urlencode(json_encode(['name'=>$r['child_name'], 'nid'=>$r['nid'], 'dob'=>$r['dob']]));
            ?>
                <div class="d-flex justify-content-between align-items-center border p-3 mb-3 rounded bg-light">
                    <div>
                        <h5 class="mb-1"><?= clean($r['child_name']) ?></h5>
                        <p class="mb-0 text-muted small">DOB: <?= clean($r['dob']) ?> | NID: <?= $r['nid'] ? clean($r['nid']) : 'Pending' ?></p>
                        <?php if($r['nid']): ?>
                        <span class="badge bg-success mt-2">Verified Credential</span>
                        <?php endif; ?>
                    </div>
                    <?php if($r['nid']): ?>
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=<?= $qrData ?>" alt="VC QR">
                    <?php endif; ?>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
    <?php pageFooter();
}

// ---------------- ADMIN ----------------
function showAdminDashboard() {
    $db = getDB();
    $total = $db->query("SELECT COUNT(*) FROM birth_records")->fetchColumn();
    $byProv = $db->query("SELECT province, COUNT(*) c FROM birth_records GROUP BY province")->fetchAll();
    $byType = $db->query("SELECT birth_type, COUNT(*) c FROM birth_records GROUP BY birth_type")->fetchAll();
    $exceptions = $db->query("SELECT * FROM birth_records WHERE status='Exception'")->fetchAll();
    $audit = $db->query("SELECT * FROM audit_log ORDER BY id DESC LIMIT 10")->fetchAll();

    pageHeader('System Analytics', 'System Administrator'); ?>
    <div class="row mb-4">
        <div class="col-md-6"><div class="card p-3 stat-card"><h5>Total Registrations</h5><h2><?= $total ?></h2></div></div>
        <div class="col-md-6"><div class="card p-3 stat-card border-left-danger"><h5>Exception Queue</h5><h2><?= count($exceptions) ?></h2></div></div>
    </div>
    <div class="row">
        <div class="col-md-6"><div class="card"><div class="card-header">Registrations by Province</div><div class="card-body"><canvas id="provChart" height="200"></canvas></div></div></div>
        <div class="col-md-6"><div class="card"><div class="card-header">Facility vs Village</div><div class="card-body"><canvas id="typeChart" height="200"></canvas></div></div></div>
    </div>
    <div class="card mt-4">
        <div class="card-header">Exception Queue</div>
        <div class="card-body">
            <table class="table">
                <tr><th>ID</th><th>Child</th><th>Action</th></tr>
                <?php foreach ($exceptions as $r): ?>
                <tr><td>#<?= $r['id'] ?></td><td><?= clean($r['child_name']) ?></td>
                    <td><a href="?action=admin_exception&id=<?= $r['id'] ?>&do=approve" class="btn btn-sm btn-success">Force Approve</a></td></tr>
                <?php endforeach; ?>
            </table>
        </div>
    </div>
    <div class="card mt-4">
        <div class="card-header">Audit Log</div>
        <div class="card-body">
            <table class="table table-sm">
                <tr><th>Time</th><th>Actor</th><th>Action</th></tr>
                <?php foreach ($audit as $a): ?>
                <tr><td><?= clean($a['created_at']) ?></td><td><?= clean($a['actor_sp_id']) ?></td><td><?= clean($a['action']) ?></td></tr>
                <?php endforeach; ?>
            </table>
        </div>
    </div>
    <script>
        new Chart(document.getElementById('provChart'),{type:'bar',data:{labels:<?= json_encode(array_column($byProv, 'province')) ?>,datasets:[{data:<?= json_encode(array_column($byProv, 'c')) ?>,backgroundColor:'#1e3a8a'}]},options:{plugins:{legend:{display:false}}}});
        new Chart(document.getElementById('typeChart'),{type:'doughnut',data:{labels:<?= json_encode(array_column($byType, 'birth_type')) ?>,datasets:[{data:<?= json_encode(array_column($byType, 'c')) ?>,backgroundColor:['#17a2b8','#28a745']}]},options:{}});
    </script>
    <?php pageFooter();
}

function adminException() {
    $u = currentUser(); $db = getDB(); $id = (int)$_GET['id'];
    $db->prepare("UPDATE birth_records SET status='Ward Approved' WHERE id=?")->execute([$id]);
    logAudit($u['sp_id'], 'ADMIN', 'EXCEPTION_FORCE_APPROVE', $id);
    header("Location: ?action=admin_dashboard");
    exit;
}