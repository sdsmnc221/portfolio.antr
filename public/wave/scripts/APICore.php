<?php 
include "./Helper.php";

class APICore {
    protected $_api_url;
    protected $_db;
    protected $_queries;
    protected $_helper;
    protected $_types;

    public function __construct(
        string $queries,
        string $api_url = "http://antr.tech/wave/dist/scripts/api.php") {
        $this->_api_url = $api_url;
        $this->_db = $this->make_db(); 
        $this->_queries = $this->make_queries($queries);
        $this->_types = $this->make_types();
        $this->_helper = new Helper();
    }

    public function make_db() {
        header("Access-Control-Allow-Origin: *");
        global $pdo;
        $host = "31.220.106.51";
        $port = "";
        $db   = "u850201821_wave";
        $user = "u850201821_awave";
        $pass = "AnTR.tech/wave-2023";
        $charset = "utf8mb4";
        $dsn = "mysql:host=" .$host. ";port=" .$port. ";dbname=" .$db. ";charset=" .$charset;
        $opt = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
        try {
         return $pdo = new PDO($dsn, $user, $pass, $opt);
        } catch (PDOException $e) {
         return "Connection failed: " . $e->getMessage();
        }
    }

    public function get_db() {
        return $this->_db;
    }

    public function destroy_db() {
        $this->_db = null;
    }

    public function make_queries(string $serialized_queries) {
        $queries = [];
        if ($serialized_queries !== "") {
            $temp = explode("&", $serialized_queries);
            foreach ($temp as $serialized_query) {
                $query = explode("=", $serialized_query);
                $queries = array_merge($queries, array($query[0] => $query[1]));
            }

        }
        return $queries;
    }

    public function get_queries() {
        return $this->_queries;
    }

    public function make_types() {
       return ["Chlore", "OxyConcentration", "Oxygene", "pH", "Pression", "Salinite", "TempeAir", "TempeEau"];
    }

    public function create_mock_data() {
        if ($this->_queries["create_mock_data"] === "true") {
            // $sql_lo = "INSERT INTO LiveOverview(NomData, Data) VALUES (:type, :value)";
            // $stmt_lo = $this->_db->prepare($sql_lo);
            // foreach($this->_types as $type) {
            //     $value = $this->_helper->random_float();
            //     echo $type;
                
            //     // Create mock data for LiveOview table for the first time
            //     $stmt_lo->execute([
            //         ":type" => $type,
            //         ":value" => $value
            //     ]);
            //     echo(sprintf("INSERT successful %s into LiveOverView.<br>", $type));
            // }

            $sql = "INSERT INTO %s(valeurs) VALUES (:value)";
            $sql_lo = "UPDATE LiveOverview SET Data=:value WHERE NomData=:type";
            for ($i = 0; $i <= 20; $i++) {
                foreach($this->_types as $type) {
                    $value = $this->_helper->random_float();
    
                    //Create mock data for specific data"s table & update LiveOverview Table
                    $stmt = $this->_db->prepare(sprintf($sql, $type));
                    $stmt_lo = $this->_db->prepare($sql_lo);
                    $stmt->execute([":value" => $value]);
                    $stmt_lo->execute([
                        ":value" => $value,
                        ":type" => $type
                    ]);
                    echo(sprintf("INSERT successful into %s.<br>", $type));
                }
            }

            return "INSERT successful.";
            $this->destroy_db();
        }
    }

    public function create_data() {
        $result = array("error" => "Can not insert new data to the database.");
        if ($this->_queries["create_data"] === "true") {
            $result = array("success" => "Insert successful.");
            $data = array_diff_key($this->_queries, array("create_data" => null));
            foreach ($data as $type=>$value) {
                if (in_array($type, $this->_types)) {
                    $sql = "INSERT INTO %s(valeurs) VALUES (:value)";
                    $sql_lo = "UPDATE LiveOverview SET Data=:value WHERE NomData=:type";

                    $stmt = $this->_db->prepare(sprintf($sql, $type));
                    $stmt_lo = $this->_db->prepare($sql_lo);

                    $stmt->execute([":value" => $value]);
                    $stmt_lo->execute([
                        ":value" => $value,
                        ":type" => $type
                    ]);

                    $result = array_merge($result, array($type=>$value));
                }
            }
        }
        return json_encode($result);
    }

    public function read_latest(string $type) {
        $result = array("error" => "No type matched.");
        if (in_array($type, $this->_types)) {
            $sql = "SELECT * FROM %s ORDER BY ID DESC LIMIT 1";
            $stmt = $this->_db->prepare(sprintf($sql, $type));
            $stmt->execute();
            $result = $stmt->fetch();
        } 
        return json_encode($result);
    }

    public function read_all(string $type) {
        $result = array("error" => "No type matched.");
        if (in_array($type, $this->_types)) {
            $sql = "SELECT * FROM %s ORDER BY ID DESC";
            $stmt = $this->_db->prepare(sprintf($sql, $type));
            $stmt->execute();
            $result = $stmt->fetchAll();
        } 
        return json_encode($result);
    }

    public function read_lo() {
        $result = [];
        foreach($this->_types as $type) {
            $_type = array("type" => $type);
            $_result = (array) json_decode($this->read_latest($type));
            $result[] = array_merge($_type, $_result);
        }
        return json_encode($result);
    }
    
}
?>
