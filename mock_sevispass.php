<?php
// mock_sevispass.php — PNG National Digital Identity (SevisPass OIDC Mock)

 $method = $_SERVER['REQUEST_METHOD'];
if ($method === 'GET') handleLogin();
elseif ($method === 'POST') issueMockToken();
else { http_response_code(405); die("Method not allowed"); }

function handleLogin() {
    if (!isset($_GET['client_id'], $_GET['redirect_uri'], $_GET['state'], $_GET['role'])) {
        http_response_code(400); die("Missing OIDC parameters");
    }
    $redirect_uri = $_GET['redirect_uri']; $state = $_GET['state']; $role = $_GET['role'];
    ?>
    <!DOCTYPE html><html lang="en"><head>
    <meta charset="UTF-8"><title>SevisPass - National Digital Identity</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>body{background:#000;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:'Segoe UI',sans-serif}.idp-box{background:#1a1a1a;border:1px solid #BB0A1E;width:450px;padding:30px;border-radius:10px}.idp-header{text-align:center;margin-bottom:20px}.idp-header h3{color:#BB0A1E;margin:0}.idp-header small{color:#FAD201}</style>
    </head><body>
        <div class="idp-box">
            <div class="idp-header">
                <h3><i class="fas fa-fingerprint"></i> SevisPass</h3>
                <small>Papua New Guinea National Digital Identity</small>
            </div>
            <div class="alert alert-warning py-2"><small><strong>Authorization Request:</strong> <code>SevisBirth_CRVS</code> is requesting access to verify your identity for role: <strong><?= htmlspecialchars($role) ?></strong>.</small></div>
            <form method="POST" action="/authorize">
                <input type="hidden" name="redirect_uri" value="<?= htmlspecialchars($redirect_uri) ?>">
                <input type="hidden" name="state" value="<?= htmlspecialchars($state) ?>">
                <input type="hidden" name="role" value="<?= htmlspecialchars($role) ?>">
                <div class="mb-3">
                    <label class="form-label text-muted">Identity Trust Tier</label>
                    <select name="tier" class="form-select bg-dark text-white border-secondary">
                        <option value="2">Tier 2 — Verified (National ID Card)</option>
                        <option value="1">Tier 1 — Basic (Unverified / Test Policy)</option>
                    </select>
                </div>
                <div class="mb-3"><label class="form-label text-muted">National ID / Username</label><input type="text" name="username" class="form-control bg-dark text-white border-secondary" value="png.citizen" required></div>
                <div class="mb-3"><label class="form-label text-muted">Password</label><input type="password" name="password" class="form-control bg-dark text-white border-secondary" value="demo" required></div>
                <button type="submit" class="btn btn-danger w-100 py-2" style="background:#BB0A1E;border:none;">Authorize & Continue</button>
            </form>
        </div>
    </body></html>
    <?php
}

function issueMockToken() {
    if (empty($_POST)) parse_str(file_get_contents('php://input'), $_POST);
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

    if ($path === '/authorize' || isset($_POST['redirect_uri'], $_POST['state'], $_POST['role'])) {
        $auth_code = "mock_code_" . uniqid();
        $temp_db_file = sys_get_temp_dir() . "/sevispass_mock_" . $auth_code . ".json";
        $user_data = [
            'sub'  => 'SP-' . strtoupper($_POST['role']) . '-' . rand(100, 999),
            'name' => 'PNG Citizen (' . $_POST['role'] . ')',
            'tier' => $_POST['tier'] ?? '2', 'role' => $_POST['role'],
        ];
        file_put_contents($temp_db_file, json_encode($user_data));
        $sep = strpos($_POST['redirect_uri'], '?') === false ? '?' : '&';
        header("Location: " . $_POST['redirect_uri'] . $sep . "code=" . $auth_code . "&state=" . $_POST['state']);
        exit;
    }

    if (($_POST['client_id'] ?? '') !== 'sevisbirth_app') { http_response_code(401); die("Invalid client"); }
    $auth_code = $_POST['code'] ?? '';
    $temp_db_file = sys_get_temp_dir() . "/sevispass_mock_" . $auth_code . ".json";
    if (!file_exists($temp_db_file)) { http_response_code(400); die("Invalid code"); }

    $user_data = json_decode(file_get_contents($temp_db_file), true);
    unlink($temp_db_file);

    $header = base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = base64url_encode(json_encode([
        'iss' => 'http://localhost:9000', 'aud' => 'sevisbirth_app', 'sub' => $user_data['sub'],
        'name' => $user_data['name'], 'tier' => $user_data['tier'], 'role' => $user_data['role'],
        'iat' => time(), 'exp' => time() + 3600
    ]));
    $id_token = "$header.$payload." . base64url_encode("mock_signature_data");

    header('Content-Type: application/json');
    echo json_encode(['access_token' => 'mock_access_token_123', 'token_type' => 'Bearer', 'id_token' => $id_token]);
    exit;
}

function base64url_encode($data) { return rtrim(strtr(base64_encode($data), '+/', '-_'), '='); }