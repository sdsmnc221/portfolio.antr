<?php 
//SET Headers
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');    // cache for 1 day
}
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD']))
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS");         
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']))
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    exit(0);
}

//MAIN
include './APICore.php';

$api = new APICore($_SERVER["QUERY_STRING"]);
$queries = $api->get_queries();

if ($api->get_db() instanceof PDO && sizeof($queries) > 0) {
    if (array_key_exists("create_mock_data", $queries)) {
        echo $api->create_mock_data();
    }
    if (array_key_exists("read_latest", $queries)) {
        echo $api->read_latest($queries["read_latest"]);
    }
    if (array_key_exists("read_all", $queries)) {
        echo $api->read_all($queries["read_all"]);
    }
    if (array_key_exists("read_lo", $queries)) {
        echo $api->read_lo();
    }
    if (array_key_exists("create_data", $queries)) {
        echo $api->create_data();
    }
    $api->destroy_db();
}


?>