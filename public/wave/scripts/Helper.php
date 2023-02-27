<?php 
class Helper {
    public function __consctruct() {}
    
    public function random_float ($min=0, $max=100) {
        return ($min+lcg_value()*(abs($max-$min)));
     }
}
?>