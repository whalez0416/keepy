<?php
$ftp_server = "minhospital.co.kr";
$ftp_user = "minhospital2008";
$ftp_pass = "minho3114*";

echo "Connecting to $ftp_server...\n";
$conn_id = ftp_connect($ftp_server);

if (!$conn_id) {
    die("❌ Connection failed\n");
}

if (@ftp_login($conn_id, $ftp_user, $ftp_pass)) {
    echo "✅ Connected as $ftp_user\n";
    
    // 1. List Root
    echo "\n[Root Directory List]\n";
    $files = ftp_nlist($conn_id, ".");
    print_r($files);

    // 2. Check for www or public_html
    $target_dir = "";
    if (in_array("www", $files)) $target_dir = "www";
    elseif (in_array("public_html", $files)) $target_dir = "public_html";
    
    if ($target_dir) {
        echo "\n[Listing $target_dir]\n";
        $web_files = ftp_nlist($conn_id, $target_dir);
        print_r($web_files);

        // 3. Try to find GnuBoard config
        // Case A: gnuboard4/5 folder
        foreach ($web_files as $f) {
            if (strpos($f, 'gnu') !== false || strpos($f, 'g5') !== false || $f === 'adm') {
                echo "\n[Suspicious Folder: $f] Checking inside...\n";
                $sub = ftp_nlist($conn_id, "$target_dir/$f");
                print_r($sub);
            }
        }
        
        // Case B: Look for data/dbconfig.php directly
        $db_path = "$target_dir/data/dbconfig.php";
        if (ftp_size($conn_id, $db_path) != -1) {
            echo "\n✅ FOUND CONFIG: $db_path\n";
            
            // Read Content
            $temp_handle = fopen('php://temp', 'r+');
            if (ftp_fget($conn_id, $temp_handle, $db_path, FTP_ASCII)) {
                rewind($temp_handle);
                $content = stream_get_contents($temp_handle);
                echo "\n--- FILE CONTENT START ---\n";
                echo $content;
                echo "\n--- FILE CONTENT END ---\n";
            }
        } else {
             // Case C: Check subfolders like gnuboard4/data/dbconfig.php
             $possible_paths = [
                 "$target_dir/gnuboard4/dbconfig.php",
                 "$target_dir/g4/dbconfig.php",
                 "$target_dir/g5/data/dbconfig.php",
                 "$target_dir/gnuboard5/data/dbconfig.php"
             ];
             foreach ($possible_paths as $p) {
                 if (ftp_size($conn_id, $p) != -1) {
                     echo "\n✅ FOUND CONFIG: $p\n";
                 }
             }
        }

    } else {
        echo "❌ Cannot find web root (www/public_html)\n";
    }

} else {
    echo "❌ Login failed\n";
}

ftp_close($conn_id);
