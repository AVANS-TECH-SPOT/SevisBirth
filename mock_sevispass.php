<?php
// mock_sevispass.php — National Digital Identity Provider (OIDC Mock)

 $method = $_SERVER['REQUEST_METHOD'];
 $path   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($method === 'GET') {
    handleLogin();
} elseif ($method === 'POST') {
    issueMockToken();
} else {
    http_response_code(405);
    die("Method not allowed");
}

function handleLogin() {
    if (!isset($_GET['client_id'], $_GET['redirect_uri'], $_GET['state'], $_GET['role'])) {
        http_response_code(400);
        die("Missing OIDC parameters");
    }

    $redirect_uri = $_GET['redirect_uri'];
    $state        = $_GET['state'];
    $role         = $_GET['role'];
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>SevisPass - National Identity Provider</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
            body { background: #1a202c; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: 'Inter', sans-serif; }
            .idp-box { background: #fff; border-radius: 12px; width: 450px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.3); }
            .idp-header { background: #b34233; color: white; padding: 20px; text-align: center; }
            .idp-body { padding: 30px; }
            .oidc-info { background: #f8f9fa; border-left: 4px solid #b34233; padding: 12px; font-size: 12px; color: #555; margin-bottom: 20px; }
        </style>
    </head>
    <body>
        <div class="idp-box">
            <div class="idp-header">
                <h4 class="mb-0"><i class="fas fa-fingerprint"></i> SevisPass</h4>
                <small>Papua New Guinea National Digital Identity</small>
            </div>
            <div class="idp-body">
                <div class="oidc-info">
                    <strong>OIDC Authorization Request:</strong><br>
                    Connecting <code>SevisBirth_CRVS</code> to your National Identity. Role requested: <strong><?= htmlspecialchars($role) ?></strong>.
                </div>
                <form method="POST" action="/authorize">
                    <input type="hidden" name="redirect_uri" value="<?= htmlspecialchars($redirect_uri) ?>">
                    <input type="hidden" name="state" value="<?= htmlspecialchars($state) ?>">
                    <input type="hidden" name="role" value="<?= htmlspecialchars($role) ?>">
                    
                    <div class="mb-3">
                        <label class="form-label">Identity Tier</label>
                        <select name="tier" class="form-select">
                            <option value="2">Tier 2 — Verified (National ID Card)</option>
                            <option value="1">Tier 1 — Basic (Unverified / Test Policy Block)</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">National ID / Username</label>
                        <input type="text" name="username" class="form-control" value="png.citizen" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Password</label>
                        <input type="password" name="password" class="form-control" value="demo" required>
                    </div>
                    <button type="submit" class="btn btn-danger w-100 py-2">Authorize & Continue</button>
                </form>
            </div>
        </div>
    </body>
    </html>
    <?php
}

function issueMockToken() {
    if (empty($_POST)) {
        parse_str(file_get_contents('php://input'), $_POST);
    }

    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

    if ($path === '/authorize' || isset($_POST['redirect_uri'], $_POST['state'], $_POST['role'])) {
        $redirect_uri = $_POST['redirect_uri'];
        $state        = $_POST['state'];
        $role         = $_POST['role'];
        $tier         = $_POST['tier'] ?? '2';

        $auth_code = "mock_code_" . uniqid();
        $temp_db_file = sys_get_temp_dir() . "/sevispass_mock_" . $auth_code . ".json";

        $user_data = [
            'sub'  => 'SP-' . strtoupper($role) . '-' . rand(100, 999),
            'name' => 'PNG Citizen (' . $role . ')',
            'tier' => $tier,
            'role' => $role,
        ];

        file_put_contents($temp_db_file, json_encode($user_data));

        $sep = strpos($redirect_uri, '?') === false ? '?' : '&';
        header("Location: " . $redirect_uri . $sep . "code=" . $auth_code . "&state=" . $state);
        exit;
    }

    if (($_POST['client_id'] ?? '') !== 'sevisbirth_app') {
        http_response_code(401);
        die("Invalid client");
    }

    $auth_code = $_POST['code'] ?? '';
    $temp_db_file = sys_get_temp_dir() . "/sevispass_mock_" . $auth_code . ".json";

    if (!file_exists($temp_db_file)) {
        http_response_code(400);
        die("Invalid code");
    }

    $user_data = json_decode(file_get_contents($temp_db_file), true);
    unlink($temp_db_file);

    $header    = base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload   = base64url_encode(json_encode([
        'iss'   => 'http://localhost:9000',
        'aud'   => 'sevisbirth_app',
        'sub'   => $user_data['sub'],
        'name'  => $user_data['name'],
        'tier'  => $user_data['tier'],
        'role'  => $user_data['role'],
        'iat'   => time(),
        'exp'   => time() + 3600,
    ]));
    $signature = base64url_encode("mock_signature_data");

    $id_token = "$header.$payload.$signature";

    header('Content-Type: application/json');
    echo json_encode([
        'access_token' => 'mock_access_token_123',
        'token_type'   => 'Bearer',
        'id_token'     => $id_token,
    ]);
    exit;
}

function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}