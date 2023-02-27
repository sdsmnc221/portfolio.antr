<?php
$to = "antr.2201@gmail.com";
$subject = "[Mon CV Web] Un nouveau message de ".$_POST['name'];
$message = "
<html>
<head>
<title>Message envoyé par ".$_POST['name']."</title>
</head>
<body>
<h1>".$_POST['name']." m'a envoyé un message via mon CV Web</h1>
<p>Son adresse mail : ".$_POST['mail']."</p>
<p>Message : ".$_POST['message']."</p>

</body>
</html>
";
  // Préparer le header
$headers = "MIME-Version: 1.0" . "\r\n";
$headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
$headers .= 'From:'.$_POST['courriel']. "\r\n";
$headers .= "X-Mailer: PHP/" . PHP_VERSION."\r\n";

// Envoyer le mail
$mail=mail($to,$subject,$message,$headers);
if($mail){
  echo "Transmission réussie !";
}else{
  echo "Erreur de transmission. Veuillez retransmettre le signal !";
}
?>
