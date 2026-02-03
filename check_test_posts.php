<?php
/**
 * 민병원 온라인 상담 게시판 테스트 글 확인 스크립트
 */

// DB 접속 정보
$DB_HOST = 'localhost';
$DB_USER = 'minhospital2008';
$DB_PASS = 'minho3114*';
$DB_NAME = 'minhospital2008';

try {
    $pdo = new PDO(
        "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );

    echo "=== 민병원 온라인 상담 게시판 확인 ===\n\n";

    // 온라인 상담 게시판 테이블명 확인
    $tables = ['g5_write_online', 'g5_write_counsel', 'g5_write_consult'];
    
    foreach ($tables as $table) {
        $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
        if ($stmt->rowCount() > 0) {
            echo "✓ 테이블 발견: $table\n";
            
            // 최근 10개 게시글 조회
            $sql = "SELECT wr_id, wr_subject, wr_name, wr_datetime, wr_content 
                    FROM $table 
                    ORDER BY wr_datetime DESC 
                    LIMIT 10";
            $stmt = $pdo->query($sql);
            $posts = $stmt->fetchAll();
            
            echo "  총 게시글 수: " . count($posts) . "\n\n";
            
            foreach ($posts as $post) {
                echo "  [ID: {$post['wr_id']}] {$post['wr_subject']}\n";
                echo "  작성자: {$post['wr_name']} | 작성일: {$post['wr_datetime']}\n";
                echo "  내용: " . mb_substr(strip_tags($post['wr_content']), 0, 100) . "...\n";
                
                // 테스트 키워드 확인
                $testKeywords = ['테스트', 'test', 'keepy', '검사', 'TEST'];
                $isTest = false;
                foreach ($testKeywords as $keyword) {
                    if (stripos($post['wr_subject'], $keyword) !== false || 
                        stripos($post['wr_content'], $keyword) !== false) {
                        $isTest = true;
                        break;
                    }
                }
                
                if ($isTest) {
                    echo "  ⚠️ 테스트 글로 의심됨!\n";
                }
                echo "  " . str_repeat("-", 60) . "\n\n";
            }
        }
    }

    // 모든 g5_write_ 테이블 목록 조회
    echo "\n=== 전체 게시판 테이블 목록 ===\n";
    $stmt = $pdo->query("SHOW TABLES LIKE 'g5_write_%'");
    $allTables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    foreach ($allTables as $t) {
        echo "- $t\n";
    }

} catch (PDOException $e) {
    echo "DB 연결 실패: " . $e->getMessage() . "\n";
}
?>
