<?php
/**
 * Keepy DB Bridge - 민병원 전용
 * 
 * 이 파일을 민병원 서버의 루트 디렉토리에 업로드하세요.
 * 예: https://minhospital.co.kr/keepy_bridge.php
 * 
 * 보안: 사용 후 반드시 삭제하거나 접근 제한을 설정하세요!
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *'); // CORS 허용
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// OPTIONS 요청 처리 (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 보안: API 키 검증 (선택사항)
$API_KEY = 'keepy_secret_2024'; // 나중에 변경하세요
if (isset($_SERVER['HTTP_X_API_KEY']) && $_SERVER['HTTP_X_API_KEY'] !== $API_KEY) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid API key']);
    exit;
}

// DB 접속 정보 (민병원 실제 정보)
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

    // POST 요청 처리
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? '';

        switch ($action) {
            case 'test_connection':
                // DB 연결 테스트
                echo json_encode([
                    'success' => true,
                    'message' => 'DB 연결 성공',
                    'database' => $DB_NAME
                ]);
                break;

            case 'scan_spam':
                // 스팸 게시글 검색
                $keywords = $input['keywords'] ?? ['카지노', '바다이야기', '도박'];
                $table = $input['table'] ?? 'g5_write_free';
                
                // 테이블 존재 확인
                $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
                if ($stmt->rowCount() === 0) {
                    echo json_encode([
                        'success' => false,
                        'error' => "테이블 '$table'이 존재하지 않습니다"
                    ]);
                    break;
                }

                // 스팸 검색 쿼리 생성
                $conditions = [];
                foreach ($keywords as $keyword) {
                    $conditions[] = "wr_content LIKE :keyword_" . count($conditions);
                }
                $where = implode(' OR ', $conditions);
                
                $sql = "SELECT COUNT(*) as count FROM $table WHERE $where";
                $stmt = $pdo->prepare($sql);
                
                foreach ($keywords as $index => $keyword) {
                    $stmt->bindValue(":keyword_$index", "%$keyword%");
                }
                
                $stmt->execute();
                $result = $stmt->fetch();
                
                echo json_encode([
                    'success' => true,
                    'detected' => (int)$result['count'],
                    'table' => $table,
                    'keywords' => $keywords
                ]);
                break;

            case 'fetch_recent_posts':
                // 최근 게시물 가져오기 (고급 스팸 분석용)
                $table = $input['table'] ?? 'g5_write_free';
                $limit = $input['limit'] ?? 20;
                
                // 테이블 존재 확인
                $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
                if ($stmt->rowCount() === 0) {
                    echo json_encode([
                        'success' => false,
                        'error' => "테이블 '$table'이 존재하지 않습니다"
                    ]);
                    break;
                }
                
                // 최근 게시물 조회 (제목, 내용, 작성자, 전화번호 포함)
                $sql = "SELECT 
                    wr_id, 
                    wr_subject, 
                    wr_content,
                    wr_name,
                    wr_hp,
                    wr_datetime
                FROM $table 
                ORDER BY wr_datetime DESC 
                LIMIT :limit";
                
                $stmt = $pdo->prepare($sql);
                $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
                $stmt->execute();
                
                $posts = $stmt->fetchAll();
                
                echo json_encode([
                    'success' => true,
                    'posts' => $posts,
                    'count' => count($posts),
                    'table' => $table
                ]);
                break;

            case 'delete_spam':
                // 스팸 게시글 삭제 (주의!)
                $keywords = $input['keywords'] ?? ['카지노', '바다이야기'];
                $table = $input['table'] ?? 'g5_write_free';
                
                // 안전 장치: 실제 삭제는 주석 처리
                // 테스트 후 활성화하세요
                /*
                $conditions = [];
                foreach ($keywords as $keyword) {
                    $conditions[] = "wr_content LIKE :keyword_" . count($conditions);
                }
                $where = implode(' OR ', $conditions);
                
                $sql = "DELETE FROM $table WHERE $where";
                $stmt = $pdo->prepare($sql);
                
                foreach ($keywords as $index => $keyword) {
                    $stmt->bindValue(":keyword_$index", "%$keyword%");
                }
                
                $stmt->execute();
                $deleted = $stmt->rowCount();
                */
                
                echo json_encode([
                    'success' => true,
                    'deleted' => 0,
                    'message' => '삭제 기능은 안전을 위해 비활성화되어 있습니다'
                ]);
                break;

            case 'create_test_post':
                // 테스트 글 생성 (온라인 상담 게시판)
                $table = $input['table'] ?? 'g5_write_online';
                $subject = $input['subject'] ?? 'Keepy 시스템 테스트';
                $content = $input['content'] ?? 'Keepy 모니터링 시스템 정상 작동 확인 중입니다.';
                $name = $input['name'] ?? 'Keepy';
                
                // 테이블 존재 확인
                $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
                if ($stmt->rowCount() === 0) {
                    echo json_encode([
                        'success' => false,
                        'error' => "테이블 '$table'이 존재하지 않습니다"
                    ]);
                    break;
                }
                
                // 테이블 구조 확인 (필수 컬럼)
                $stmt = $pdo->query("DESCRIBE $table");
                $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
                
                // 기본 INSERT 쿼리
                $sql = "INSERT INTO $table (
                    wr_subject, 
                    wr_content, 
                    wr_name,
                    wr_datetime,
                    wr_ip,
                    wr_option
                ) VALUES (
                    :subject,
                    :content,
                    :name,
                    NOW(),
                    :ip,
                    'html1'
                )";
                
                $stmt = $pdo->prepare($sql);
                $stmt->bindValue(':subject', $subject);
                $stmt->bindValue(':content', $content);
                $stmt->bindValue(':name', $name);
                $stmt->bindValue(':ip', $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
                
                $stmt->execute();
                $postId = $pdo->lastInsertId();
                
                echo json_encode([
                    'success' => true,
                    'post_id' => $postId,
                    'table' => $table,
                    'message' => '테스트 글이 생성되었습니다'
                ]);
                break;

            case 'delete_post':
                // 특정 글 삭제
                $table = $input['table'] ?? 'g5_write_online';
                $postId = $input['post_id'] ?? null;
                
                if (!$postId) {
                    echo json_encode([
                        'success' => false,
                        'error' => 'post_id가 필요합니다'
                    ]);
                    break;
                }
                
                // 테이블 존재 확인
                $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
                if ($stmt->rowCount() === 0) {
                    echo json_encode([
                        'success' => false,
                        'error' => "테이블 '$table'이 존재하지 않습니다"
                    ]);
                    break;
                }
                
                // 글 삭제
                $sql = "DELETE FROM $table WHERE wr_id = :post_id";
                $stmt = $pdo->prepare($sql);
                $stmt->bindValue(':post_id', $postId);
                $stmt->execute();
                
                $deleted = $stmt->rowCount();
                
                echo json_encode([
                    'success' => true,
                    'deleted' => $deleted,
                    'post_id' => $postId,
                    'message' => $deleted > 0 ? '글이 삭제되었습니다' : '삭제할 글을 찾을 수 없습니다'
                ]);
                break;

            case 'delete_test_posts':
                // Keepy 테스트 글 일괄 삭제 (여러 테이블 검색)
                $keywords = $input['keywords'] ?? ['Keepy', 'keepy', 'KEEPY', '시스템 테스트'];
                $tables = $input['tables'] ?? ['g5_write_online', 'g5_write_counsel', 'g5_write_101', 'g5_write_free', 'g5_write_qa'];
                $totalDeleted = 0;
                
                foreach ($tables as $table) {
                    // 테이블 존재 확인
                    $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
                    if ($stmt->rowCount() === 0) continue;

                    // 조건 생성
                    $conditions = [];
                    foreach ($keywords as $index => $keyword) {
                        $conditions[] = "wr_subject LIKE :keyword_" . $table . "_" . $index;
                    }
                    $where = implode(' OR ', $conditions);
                    
                    $sql = "DELETE FROM $table WHERE $where";
                    $stmt = $pdo->prepare($sql);
                    
                    foreach ($keywords as $index => $keyword) {
                        $stmt->bindValue(":keyword_" . $table . "_" . $index, "%$keyword%");
                    }
                    
                    $stmt->execute();
                    $totalDeleted += $stmt->rowCount();
                }
                
                echo json_encode([
                    'success' => true,
                    'deleted' => $totalDeleted,
                    'message' => "총 $totalDeleted 개의 테스트 글을 삭제했습니다."
                ]);
                break;

            case 'list_tables':
                // 게시판 테이블 목록 조회
                $stmt = $pdo->query("SHOW TABLES LIKE 'g5_write_%'");
                $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
                
                echo json_encode([
                    'success' => true,
                    'tables' => $tables,
                    'count' => count($tables)
                ]);
                break;

            default:
                echo json_encode([
                    'success' => false,
                    'error' => 'Unknown action'
                ]);
        }
    } else {
        // GET 요청: 상태 확인
        echo json_encode([
            'status' => 'ok',
            'service' => 'Keepy DB Bridge',
            'database' => $DB_NAME,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'DB 연결 실패: ' . $e->getMessage()
    ]);
}
?>
