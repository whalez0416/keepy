<?php
/**
 * Keepy Universal DB Bridge
 * Version: 2.0.0 (Secured Edition)
 *
 * Security:
 *   - Site-specific API key (replaced at deploy time)
 *   - HMAC-SHA256 request signature + timestamp validation (replay attack prevention)
 *   - CORS restricted to Keepy server only
 */

error_reporting(0);

// ── CORS ─────────────────────────────────────────────────────────────────────
// Only allow requests from the Keepy server (Render).
$allowed_origin = 'https://keepy-pqfo.onrender.com';
$request_origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($request_origin === $allowed_origin) {
    header('Access-Control-Allow-Origin: ' . $allowed_origin);
} else {
    // Server-to-server calls (no Origin header) are allowed — origin will be empty.
    // Browser cross-origin calls from unknown origins are blocked.
    if (!empty($request_origin)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Origin not allowed']);
        exit;
    }
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-KEY, X-TIMESTAMP, X-SIGNATURE');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ── Config ────────────────────────────────────────────────────────────────────
// ##KEEPY_API_KEY## is replaced by the deploy script with the site's unique key.
$API_KEY     = '##KEEPY_API_KEY##';
$VERSION     = '2.0.0';
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

// ── Authentication ───────────────────────────────────────────────────────────
/**
 * Validates the incoming request using HMAC-SHA256 signature + timestamp.
 *
 * Required headers:
 *   X-API-KEY   : site-specific API key (matches $API_KEY above)
 *   X-TIMESTAMP : Unix timestamp of request (seconds)
 *   X-SIGNATURE : HMAC-SHA256( api_key . timestamp, api_key )
 *
 * Replay attack prevention: timestamp must be within ±300 seconds of server time.
 */
function validate_request(string $api_key): bool {
    $provided_key  = $_SERVER['HTTP_X_API_KEY']  ?? '';
    $timestamp     = $_SERVER['HTTP_X_TIMESTAMP'] ?? '';
    $signature     = $_SERVER['HTTP_X_SIGNATURE'] ?? '';

    // Key must match
    if (!hash_equals($api_key, $provided_key)) {
        return false;
    }

    // Timestamp must be a valid integer
    if (!ctype_digit($timestamp)) {
        return false;
    }

    // Timestamp must be within ±5 minutes
    $skew = abs(time() - (int)$timestamp);
    if ($skew > 300) {
        return false;
    }

    // Signature must match  HMAC-SHA256( api_key . timestamp, api_key )
    $expected = hash_hmac('sha256', $api_key . $timestamp, $api_key);
    return hash_equals($expected, $signature);
}

// Allow status check without auth (just returns service metadata, no DB access)
$input  = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $input['action'] ?? ($_GET['action'] ?? 'status');

if ($action !== 'status') {
    if (!validate_request($API_KEY)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Unauthorized: invalid key, timestamp, or signature']);
        exit;
    }
}

// ($input and $action already parsed above in the auth block)

// Step 1: Baseline Status (No DB Access — no auth required)
if ($action === 'status') {
    echo json_encode([
        'status'       => 'ok',
        'service'      => 'Keepy Universal Bridge',
        'version'      => $VERSION,
        'auth'         => 'HMAC-SHA256',
        'capabilities' => ['list_boards', 'fetch_posts', 'delete_post'],
    ]);
    exit;
}

// ── DB Connection ────────────────────────────────────────────────────────────
// DB credentials are passed in the signed request body by the Keepy server.
// The bridge file itself stores NO database credentials (maximum security).
try {
    $db_host = $input['db_host'] ?? '';
    $db_user = $input['db_user'] ?? '';
    $db_pass = $input['db_pass'] ?? '';
    $db_name = $input['db_name'] ?? '';
    $db_port = $input['db_port'] ?? '3306';

    if (empty($db_host) || empty($db_user) || empty($db_name)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'DB_PARAMS_MISSING: db_host, db_user, db_name are required in request body.']);
        exit;
    }

    log_trace('DB_CONNECT', "Connecting to {$db_name}@{$db_host}:{$db_port}");

    $pdo = new PDO(
        "mysql:host={$db_host};port={$db_port};dbname={$db_name};charset=utf8mb4",
        $db_user, $db_pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
    log_trace('DB_CONNECT', "Connected to: {$db_name}");


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
