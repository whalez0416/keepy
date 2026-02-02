<?php
$content = file_get_contents(__DIR__ . '/mock_hospital/config.php');
echo "Searching in: $content\n\n";

$keys = ['host', 'user', 'pass', 'name'];
$results = [];

foreach ($keys as $key) {
    if (preg_match('/' . $key . '\s*=\s*[\'"](.*?)[\'"]/i', $content, $m)) {
        $results[$key] = $m[1];
        echo "✅ Detected $key: " . ($key === 'pass' ? '********' : $m[1]) . "\n";
    }
}

if (count($results) === 4) {
    echo "\n[결과] 모든 정보를 성공적으로 추출했습니다!\n";
    echo "[전송] Keepy API에 정보를 보안 전송합니다 (https://api.keepy.com/v1/register-db)\n";
    echo "--- 시연 완료 ---\n";
}
