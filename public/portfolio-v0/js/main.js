$('nav').hide();
$('.introduction').hide();
$('.hey').hide();
$('.photo').hide();
$('.about').hide();
$('.timeline').hide();
$('.hourglass').hide();
$('.engine-title').hide();
$('.engine').hide();
$('.contact').hide();
// $('body').css({'filter':'blur(5px)','-webkit-filter':'blur(5px)','-moz-filter':'blur(5px)'})
$(document).ready(function() {
  // alert("Tempête galactique détectée... Vaisseau en cours de maintenance !");
  $('.introduction').fadeIn(1000);
// ----SMOOTH SCROLL
  var $root = $('html, body');
  $('a').on('click',function() {
      $root.animate({
          scrollTop: $( $.attr(this, 'href') ).offset().top
      }, 500);
      return false;
  });
// SECTION 1
  $('.close').on('click', function() {
    $('.introduction').fadeOut(500);
    $('.hey').fadeIn(500);
  });
  $('.hey').on('click', function() {
    $('.introduction').fadeIn(500);
    $('.hey').fadeOut(500);
  });
// ON SCROLL
  $(window).scroll(function(){
    var winHeight = $(window).height()-100;
    if ($(this).scrollTop() > winHeight) {
       $('nav').fadeIn(500);
     } else {
       $('nav').fadeOut(500);
     }
    //  SECTION-2
    if ($(this).scrollTop() > ($('#section-2').offset().top-100)) {
     $('.photo').fadeIn(500);
     $('.about').fadeIn(500);
   } else {
     $('.photo').fadeOut(500);
     $('.about').fadeOut(500);
   }
   //  SECTION-3
   if ($(this).scrollTop() > ($('#section-3').offset().top-100)) {
    $('.timeline').fadeIn(500);
    $('.hourglass').fadeIn(500);
  } else {
    $('.timeline').fadeOut(500);
    $('.hourglass').fadeOut(500);
  }
  // Section 4
  if ($(this).scrollTop() > ($('#section-4').offset().top-100)) {
   $('.engine').fadeIn(500);
   $('.engine-title').fadeIn(500);
 } else {
   $('.engine').fadeOut(500);
   $('.engine-title').fadeOut(500);
 }
 // Section 5
 if ($(this).scrollTop() > ($('#section-5').offset().top-1)) {
  $('.contact').fadeIn(500);
} else {
  $('.contact').fadeOut(500);
}
  });
// section-2
$('.photo').on('mouseover', function() {
  $('.photo').css('background-image','url(img/sect2-bg-off.jpg)');
});
$('.photo').on('mouseleave', function() {
  $('.photo').css('background-image','url(img/sect2-bg-on.jpg)');
});
// TIMELINE @ SECTION 3
  var slider = $('.slider').unslider({
    arrows: {
	   prev: '<a class="unslider-arrow prev"><img src="img/prev.svg" alt="Précédent"></a>',
	   next: '<a class="unslider-arrow next"><img src="img/next.svg" alt="Suivant"></a>',
   }
 });
// SECTION 5
  // FORM Auto expand tectarea
  jQuery.each(jQuery('textarea[data-autoresize]'), function() {
    var offset = this.offsetHeight - this.clientHeight;

    var resizeTextarea = function(el) {
        jQuery(el).css('height', 'auto').css('height', el.scrollHeight + offset);
    };
    jQuery(this).on('keyup input', function() { resizeTextarea(this); }).removeAttr('data-autoresize');
  });
  // AJAX
  $("form[action='contact.php']").on('submit', function (e) {
    e.preventDefault();
    var name = $("input[name='name']").val();
    var mail = $("input[name='mail']").val();
    var message = $("textarea[name='message']").val();
    $.post("contact.php", {
      name: name, mail: mail, message: message
      }, function (response) {
        alert(response);
        $("input[name='name']").val("");
        $("input[name='mail']").val("");
        $("textarea[name='message']").val("");
      });
  });
});
