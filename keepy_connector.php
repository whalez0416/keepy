<?php
/**
 * Keepy Auto DB Connector
 * 이 파일을 홈페이지 루트 디렉토리에 업로드한 후 브라우저에서 실행하세요.
 * (예: https://your-hospital.com/keepy_connector.php)
 */

header('Content-Type: text/html; charset=utf-8');

$target_files = [
    'config.php',
    'common.php',
    'db.php',
    'db_config.php',
    'wp-config.php', // WordPress
    'data/dbconfig.php', // GnuBoard
    'config/db.php',
    '.env', // Laravel/Modern PHP
    '_config.php', // Found via FTP (Custom)
    '_common.php',
    'include/variable.php'
];

$found_info = [
    'host' => '',
    'user' => '',
    'pass' => '',
    'name' => '',
    'domain' => $_SERVER['HTTP_HOST']
];

$scanned_log = [];
$current_dir = __DIR__;
$scanned_log[] = "📍 현재 실행 경로: $current_dir";

// 주변 파일 목록 확인 (진단용)
$dir_files = scandir($current_dir);
$scanned_log[] = "📂 현재 폴더 파일 개수: " . count($dir_files) . "개";

// 그누보드나 워드프레스가 하위 폴더에 있을 경우를 대비한 추가 경로
$sub_dirs = ['', 'bbs', 'gnuboard', 'g5', 'g4', 'wordpress', 'wp'];

function scanFiles($files, $sub_dirs, &$info, &$log) {
    foreach ($sub_dirs as $sub) {
        $base = __DIR__ . ($sub ? '/' . $sub : '');
        if (!is_dir($base)) continue;

        foreach ($files as $file) {
            $path = $base . '/' . $file;
            if (file_exists($path) && !is_dir($path)) {
                $log[] = "✅ 파일 발견: " . ($sub ? "$sub/$file" : $file);
                $content = file_get_contents($path);
                
                // 1. 변수형 탐색 ($mysql_host, $db_host 등)
                $patterns = [
                    'host' => '/\$(?:db_|mysql_)?host\s*=\s*[\'"](.*?)[\'"];/i',
                    'user' => '/\$(?:db_|mysql_)?user\s*=\s*[\'"](.*?)[\'"];/i',
                    'pass' => '/\$(?:db_|mysql_)?(?:pass|password)\s*=\s*[\'"](.*?)[\'"];/i',
                    'name' => '/\$(?:db_|mysql_)?(?:name|database|db)\s*=\s*[\'"](.*?)[\'"];/i'
                ];

                // 2. 상수형 탐색 (define('G5_MYSQL_HOST', '...'))
                $define_patterns = [
                    'host' => '/define\(\s*[\'"](?:G\d_)?(?:MYSQL_|DB_)?HOST[\'"]\s*,\s*[\'"](.*?)[\'"]\s*\);/i',
                    'user' => '/define\(\s*[\'"](?:G\d_)?(?:MYSQL_|DB_)?USER[\'"]\s*,\s*[\'"](.*?)[\'"]\s*\);/i',
                    'pass' => '/define\(\s*[\'"](?:G\d_)?(?:MYSQL_|DB_)?PASSWORD[\'"]\s*,\s*[\'"](.*?)[\'"]\s*\);/i',
                    'name' => '/define\(\s*[\'"](?:G\d_)?(?:MYSQL_|DB_)?(?:DB|NAME)[\'"]\s*,\s*[\'"](.*?)[\'"]\s*\);/i'
                ];
                
                foreach ($patterns as $key => $pattern) {
                    if (empty($info[$key]) && preg_match($pattern, $content, $matches)) {
                        $info[$key] = trim($matches[1], "'\" ");
                        $log[] = "✨ $key 추출 성공 (변수)";
                    }
                }

                foreach ($define_patterns as $key => $define_pattern) {
                    if (empty($info[$key]) && preg_match($define_pattern, $content, $matches)) {
                        $info[$key] = trim($matches[1], "'\" ");
                        $log[] = "✨ $key 추출 성공 (상수)";
                    }
                }
            }
        }
    }
}

// 하위 폴더 1단계 깊이까지 모두 뒤져보기 (Deep Scan)
function deepScan($base_dir, $files, &$info, &$log) {
    $items = scandir($base_dir);
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        $path = $base_dir . '/' . $item;
        
        if (is_dir($path)) {
            // 서브디렉토리 내부에서 파일 찾기
            foreach ($files as $file) {
                $file_path = $path . '/' . $file;
                if (file_exists($file_path)) {
                    $log[] = "🔍 Deep Scan 발견: $item/$file";
                    $content = file_get_contents($file_path);
                    
                    // 정규식 매칭 로직 (변수/상수)
                    $patterns = [
                        'host' => '/[\$define\(]*[\'"](?:G\d_)?(?:MYSQL_|DB_)?HOST[\'"]\s*[=,]\s*[\'"](.*?)[\'"]/i',
                        'user' => '/[\$define\(]*[\'"](?:G\d_)?(?:MYSQL_|DB_)?USER[\'"]\s*[=,]\s*[\'"](.*?)[\'"]/i',
                        'pass' => '/[\$define\(]*[\'"](?:G\d_)?(?:MYSQL_|DB_)?(?:PASSWORD|PASS)[\'"]\s*[=,]\s*[\'"](.*?)[\'"]/i',
                        'name' => '/[\$define\(]*[\'"](?:G\d_)?(?:MYSQL_|DB_)?(?:DB|NAME)[\'"]\s*[=,]\s*[\'"](.*?)[\'"]/i'
                    ];

                    foreach ($patterns as $key => $pattern) {
                        if (empty($info[$key]) && preg_match($pattern, $content, $matches)) {
                            $info[$key] = trim($matches[1], "'\" ");
                            $log[] = "✨ $key 추출 성공 ($item/$file)";
                        }
                    }
                }
            }
        }
    }
}

// 1. 기본 스캔
scanFiles($target_files, $sub_dirs, $found_info, $scanned_log);

// 2. 못 찾았으면 Deep Scan 가동
if (empty($found_info['host'])) {
    $scanned_log[] = "🛰️ 정보를 못 찾아 Deep Scan 모드를 가동합니다...";
    deepScan(__DIR__, $target_files, $found_info, $scanned_log);
}

// API 전송 로직
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['submit_type'])) {
    $data_to_send = [
        'host' => $_POST['host'],
        'user' => $_POST['user'],
        'pass' => $_POST['pass'],
        'name' => $_POST['name'],
        'domain' => $found_info['domain']
    ];

    $ch = curl_init('https://api.keepy.com/v1/register-db');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data_to_send));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code === 200 || $http_code === 201) {
        echo "<style>body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f4f7f9; } .success-box { background: white; padding: 2rem; border-radius: 12px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border-top: 5px solid #10B981; max-width: 400px; }</style>";
        echo "<div class='success-box'>
                <h2>✅ 연결이 완료되었습니다!</h2>
                <p>병원 DB 정보가 Keepy 서버에 안전하게 등록되었습니다.</p>
                <p style='color:red; font-weight:bold;'>보안을 위해 지금 즉시 이 파일(keepy_connector.php)을 서버에서 삭제해주세요.</p>
              </div>";
        die();
    } else {
        $error_msg = "전송 실패 (에러 코드: $http_code)";
    }
}

?>
<!DOCTYPE html>
<html>
<head>
    <title>Keepy Auto Connector</title>
    <style>
        body { font-family: sans-serif; background: #f4f7f9; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .container { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); width: 400px; }
        h1 { color: #2C64F8; font-size: 1.5rem; margin-bottom: 1.5rem; }
        .info-text { font-size: 0.9rem; color: #666; margin-bottom: 1rem; }
        label { display: block; font-size: 0.8rem; color: #333; margin-bottom: 0.3rem; margin-top: 1rem; }
        input { width: 100%; padding: 0.8rem; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
        button { width: 100%; padding: 1rem; background: #2C64F8; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 1.5rem; }
        button:hover { background: #1a4fd4; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Keepy DB 커넥터</h1>
        <p class="info-text">
            <?php if (!empty($found_info['host'])): ?>
                자동으로 DB 정보를 찾았습니다! 정보를 확인 후 아래 버튼을 눌러주세요.
            <?php else: ?>
                DB 정보를 자동으로 찾지 못했습니다. 아래 정보를 수동으로 입력해주세요.
            <?php endif; ?>
        </p>
        
        <?php if (isset($error_msg)) echo "<p style='color:red'>$error_msg</p>"; ?>

        <!-- 진단 로그 추가 -->
        <div style="font-size: 0.75rem; background: #f8f9fa; border: 1px solid #eee; padding: 0.5rem; margin-bottom: 1rem; border-radius: 4px; color: #666;">
            <strong>시스템 진단 로그:</strong>
            <ul style="margin: 0.3rem 0; padding-left: 1.2rem;">
                <?php foreach ($scanned_log as $log): ?>
                    <li><?php echo $log; ?></li>
                <?php endforeach; ?>
            </ul>
            
            <?php if (empty($found_info['host'])): ?>
                <hr style="border: 0; border-top: 1px solid #ddd; margin: 0.5rem 0;">
                <strong>현재 폴더 파일 목록:</strong>
                <div style="max-height: 100px; overflow-y: auto; font-family: monospace; font-size: 0.7rem; margin-top: 0.3rem;">
                    <?php 
                    $list = scandir(__DIR__);
                    foreach ($list as $item) {
                        if ($item === '.' || $item === '..') continue;
                        echo is_dir(__DIR__ . '/' . $item) ? "📁 $item<br>" : "📄 $item<br>";
                    }
                    ?>
                </div>
            <?php endif; ?>
        </div>

        <form method="POST">
            <input type="hidden" name="submit_type" value="manual">
            <label>DB 호스트</label>
            <input type="text" name="host" value="<?php echo htmlspecialchars($found_info['host']); ?>" placeholder="localhost" required>
            
            <label>DB 사용자(ID)</label>
            <input type="text" name="user" value="<?php echo htmlspecialchars($found_info['user']); ?>" placeholder="root" required>
            
            <label>DB 비밀번호</label>
            <input type="password" name="pass" value="<?php echo htmlspecialchars($found_info['pass']); ?>" placeholder="password" required>
            
            <label>DB 이름</label>
            <input type="text" name="name" value="<?php echo htmlspecialchars($found_info['name']); ?>" placeholder="my_db" required>
            
            <button type="submit">Keepy에 연결하기</button>
        </form>
    </div>
</body>
</html>
