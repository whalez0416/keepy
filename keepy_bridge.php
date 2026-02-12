<?php
/**
 * Keepy Universal DB Bridge
 * Version: 1.1.1 (Hospital v1 Edition)
 */

error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-KEY');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Config
$API_KEY = 'keepy_secret_2024';
$VERSION = '1.2.0';
$ALLOW_DEBUG = false; 

$execution_trace = [];

function log_trace($step, $msg) {
    global $execution_trace;
    $execution_trace[] = "[".date('H:i:s')."] $step: $msg";
}

/**
 * Filter trace for success responses (Summarization)
 */
function get_success_trace() {
    global $execution_trace;
    $summary = [];
    $seen = [];
    foreach ($execution_trace as $line) {
        if (preg_match('/(CONNECT|DISCOVERY|MAPPING|BOARDS|Fetch)/i', $line, $matches)) {
            $key = strtoupper($matches[1]);
            if (!isset($seen[$key])) {
                $summary[] = $line;
                $seen[$key] = true;
            }
        }
    }
    return $summary;
}

// Security Check
if (isset($_SERVER['HTTP_X_API_KEY']) && $_SERVER['HTTP_X_API_KEY'] !== $API_KEY) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Invalid API key', 'trace' => $execution_trace]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? ($_GET['action'] ?? 'status');

// Step 1: Baseline Status (No DB Access)
if ($action === 'status') {
    echo json_encode([
        'status' => 'ok',
        'service' => 'Keepy Universal Bridge',
        'version' => $VERSION,
        'capabilities' => ['list_boards', 'fetch_posts', 'debug_spam_check']
    ]);
    exit;
}

/**
 * DB Configuration Auto-Discovery
 */
function discover_db_config() {
    log_trace('DB_DISCOVERY', 'Starting auto-discovery...');
    $root = $_SERVER['DOCUMENT_ROOT'];
    
    $configs = [
        ['path' => 'data/dbconfig.php', 'type' => 'gnuboard5'],
        ['path' => '../data/dbconfig.php', 'type' => 'gnuboard5'],
        ['path' => 'wp-config.php', 'type' => 'wordpress'],
        ['path' => '../wp-config.php', 'type' => 'wordpress'],
    ];
    
    foreach ($configs as $cfg) {
        $fullPath = $root . DIRECTORY_SEPARATOR . $cfg['path'];
        if (file_exists($fullPath)) {
            $content = file_get_contents($fullPath);
            log_trace('DB_DISCOVERY', "Found config at: {$cfg['path']} ({$cfg['type']})");
            
            if ($cfg['type'] === 'gnuboard5') {
                preg_match("/G5_MYSQL_HOST', '(.+)'/", $content, $host);
                preg_match("/G5_MYSQL_USER', '(.+)'/", $content, $user);
                preg_match("/G5_MYSQL_PASSWORD', '(.+)'/", $content, $pass);
                preg_match("/G5_MYSQL_DB', '(.+)'/", $content, $db);
                
                if (!empty($host[1])) {
                    return [
                        'host' => $host[1], 'user' => $user[1], 'pass' => $pass[1], 'name' => $db[1], 'cms' => $cfg['type']
                    ];
                }
            }
        }
    }

    log_trace('DB_DISCOVERY', 'No CMS config found. Using manual fallback.');
    return [
        'host' => 'localhost', 'user' => 'minhospital2008', 'pass' => 'minho3114*', 'name' => 'minhospital2008', 'cms' => 'manual'
    ];
}

try {
    $dbConfig = discover_db_config();
    $pdo = new PDO(
        "mysql:host={$dbConfig['host']};dbname={$dbConfig['name']};charset=utf8mb4",
        $dbConfig['user'], $dbConfig['pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
    log_trace('DB_CONNECT', "Connected to: {$dbConfig['name']}");

    switch ($action) {
        case 'test_connection':
            echo json_encode(['success' => true, 'cms' => $dbConfig['cms'], 'database' => $dbConfig['name'], 'trace' => get_success_trace()]);
            break;

        case 'list_boards':
            log_trace('LIST_BOARDS', 'Fetching board table candidates...');
            $stmt = $pdo->query("SHOW TABLES");
            $allTables = $stmt->fetchAll(PDO::FETCH_COLUMN);
            $boards = [];
            
            $keywords = ['write_', 'board', 'post', 'consult', 'reserve', 'qna', 'manage'];
            log_trace('LIST_BOARDS', "Checking " . count($allTables) . " tables...");

            foreach ($allTables as $t) {
                $matched = false;
                foreach ($keywords as $kw) {
                    if (stripos($t, $kw) !== false) {
                        $matched = true;
                        break;
                    }
                }

                if ($matched) {
                    try {
                        $cnt = (int)$pdo->query("SELECT COUNT(*) FROM `$t`")->fetchColumn();
                        
                        // Try to find a date column for last_activity
                        $last = null;
                        $dateCols = ['wr_datetime', 'reg_dt', 'created_at', 'post_date', 'date', 'RegDate', 'Reg_Dt', 'RegisteredDate'];
                        
                        // Check columns first to avoid PDO exceptions in a loop
                        $stmtCol = $pdo->query("DESCRIBE `$t` ");
                        $cols = array_column($stmtCol->fetchAll(), 'Field');
                        
                        foreach ($dateCols as $dc) {
                            if (in_array($dc, $cols)) {
                                $last = $pdo->query("SELECT MAX(`$dc`) FROM `$t`")->fetchColumn();
                                break;
                            }
                        }

                        $boards[] = [
                            'table' => $t,
                            'count' => $cnt,
                            'last_activity' => $last
                        ];
                    } catch (Exception $e) {
                        log_trace('LIST_BOARDS_ERR', "Error checking $t: " . $e->getMessage());
                    }
                }
            }
            log_trace('LIST_BOARDS', "Found " . count($boards) . " candidates.");
            echo json_encode(['success' => true, 'boards' => $boards, 'trace' => get_success_trace()]);
            break;

        case 'fetch_recent_posts':
            $table = $input['table'] ?? '';
            $limit = isset($input['limit']) ? (int)$input['limit'] : 10;
            $sinceId = $input['last_id'] ?? 0;
            $sinceDate = $input['since_date'] ?? null;
            
            if (empty($table) || !preg_match('/^[a-zA-Z0-9_]+$/', $table)) {
                echo json_encode(['success' => false, 'error' => 'Invalid table', 'trace' => $execution_trace]);
                break;
            }

            // Adaptive Column Mapping
            $stmt = $pdo->query("DESCRIBE `$table` ");
            $cols = array_column($stmt->fetchAll(), 'Field');
            
            $idCol = $cols[0]; // Fallback to first col
            $subCol = $cols[min(1, count($cols)-1)];
            $contCol = $cols[min(2, count($cols)-1)];
            $dateCol = $cols[min(3, count($cols)-1)];

            $idC = ['wr_id', 'id', 'idx', 'seq', 'no', 'board_idx'];
            $subC = ['wr_subject', 'subject', 'title', 'post_title', 'name'];
            $contC = ['wr_content', 'content', 'post_content', 'memo', 'comment'];
            $dateC = ['wr_datetime', 'reg_dt', 'created_at', 'post_date', 'date', 'regdate', 'reg_dt', 'registereddate'];

            foreach($cols as $c) {
                $lc = strtolower($c);
                if(in_array($lc, $idC)) $idCol = $c;
                if(in_array($lc, $subC)) $subCol = $c;
                if(in_array($lc, $contC)) $contCol = $c;
                if(in_array($lc, $dateC)) $dateCol = $c;
            }
            log_trace('COLUMN_MAPPING', "Mapped: ID($idCol), Sub($subCol), Date($dateCol)");

            // Composite Smart Scan Logic
            $where = "`$idCol` > :since";
            $params = [':since' => $sinceId];

            if ($sinceDate) {
                // If date is provided, scan posts newer than either ID OR Date (Safety Margin)
                $where = "(`$idCol` > :since OR `$dateCol` > :sdate)";
                $params[':sdate'] = $sinceDate;
            }

            $sql = "SELECT `$idCol` as id, `$subCol` as subject, `$contCol` as content, `$dateCol` as date 
                    FROM `$table` WHERE $where ORDER BY `$idCol` ASC LIMIT :limit";
            
            $stmt = $pdo->prepare($sql);
            foreach($params as $k => $v) $stmt->bindValue($k, $v);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();
            
            echo json_encode([
                'success' => true, 
                'posts' => $stmt->fetchAll(), 
                'trace' => get_success_trace(),
                'mapping' => ['id' => $idCol, 'subject' => $subCol, 'content' => $contCol, 'date' => $dateCol]
            ]);
            break;

        case 'debug_spam_check':
            if (!$ALLOW_DEBUG) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Debug mode disabled']);
                break;
            }
            $table = $input['table'] ?? '';
            $pid = $input['post_id'] ?? '';
            log_trace('DEBUG_MODE', "Inspecting Post ID: $pid in $table");
            
            // Re-run mapping logic to return metadata
            $stmt = $pdo->query("DESCRIBE `$table` ");
            $cols = array_column($stmt->fetchAll(), 'Field');
            
            // Dynamic WHERE to avoid PDO 500 errors on missing columns
            $whereParts = [];
            if (in_array('wr_id', $cols)) $whereParts[] = "wr_id = :id";
            if (in_array('id', $cols)) $whereParts[] = "id = :id";
            if (in_array('seq', $cols)) $whereParts[] = "seq = :id";
            
            if (empty($whereParts)) {
                $where = $cols[0] . " = :id"; // Fallback to first col
            } else {
                $where = implode(" OR ", $whereParts);
            }

            $stmt = $pdo->prepare("SELECT * FROM `$table` WHERE $where LIMIT 1");
            $stmt->execute([':id' => $pid]);
            echo json_encode(['success' => true, 'raw_data' => $stmt->fetch(), 'columns' => $cols, 'trace' => $execution_trace]);
            break;

        case 'delete_post':
            $table = $input['table'] ?? '';
            $pid = $input['post_id'] ?? '';
            
            if (empty($table) || empty($pid)) {
                echo json_encode(['success' => false, 'error' => 'Missing table or post_id', 'trace' => $execution_trace]);
                break;
            }

            log_trace('DELETE_POST', "Request to delete ID $pid from $table");

            // Whitelist Check: Only board-like tables allowed
            $is_whitelisted = false;
            $keywords = ['write_', 'board', 'post', 'consult', 'reserve', 'qna', 'manage'];
            foreach ($keywords as $kw) {
                if (stripos($table, $kw) !== false) {
                    $is_whitelisted = true;
                    break;
                }
            }

            if (!$is_whitelisted) {
                log_trace('DELETE_POST', "FORBIDDEN_TABLE: $table");
                echo json_encode(['success' => false, 'error' => 'FORBIDDEN_TABLE', 'trace' => $execution_trace]);
                break;
            }

            // Map ID column
            $stmt = $pdo->query("DESCRIBE `$table` ");
            $cols = array_column($stmt->fetchAll(), 'Field');
            $idCol = $cols[0];
            $idC = ['wr_id', 'id', 'idx', 'seq', 'no', 'board_idx'];
            foreach($cols as $c) {
                if(in_array(strtolower($c), $idC)) {
                    $idCol = $c;
                    break;
                }
            }

            // Check if exists first
            $check = $pdo->prepare("SELECT COUNT(*) FROM `$table` WHERE `$idCol` = :id");
            $check->execute([':id' => $pid]);
            if ((int)$check->fetchColumn() === 0) {
                log_trace('DELETE_POST', "NOT_FOUND: $pid in $table");
                echo json_encode(['success' => false, 'error' => 'NOT_FOUND', 'trace' => $execution_trace]);
                break;
            }

            // Execute Delete
            $stmt = $pdo->prepare("DELETE FROM `$table` WHERE `$idCol` = :id");
            $stmt->execute([':id' => $pid]);
            
            log_trace('DELETE_POST', "Successfully deleted ID $pid");
            echo json_encode(['success' => true, 'trace' => get_success_trace()]);
            break;

        default:
            echo json_encode(['success' => false, 'error' => 'Unknown action', 'trace' => $execution_trace]);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage(), 'trace' => $execution_trace]);
}
