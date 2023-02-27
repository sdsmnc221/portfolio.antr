$('.intro').hide();
if ($(window).scrollTop()===0) {
  $("#navigation").hide();
}
$(document).ready(function() {
   // LAYER PARALLAX

   var ParallaxManager, ParallaxPart;

   ParallaxPart = (function() {

     function ParallaxPart(el) {

       this.el = el;

       this.speed = parseFloat(this.el.getAttribute('data-parallax-speed'));

       this.maxScroll = parseInt(this.el.getAttribute('data-max-scroll'));

     }


     ParallaxPart.prototype.update = function(scrollY) {

       if (scrollY > this.maxScroll) {
         return;
       }

       var offset = -(scrollY * this.speed);

       this.setYTransform(offset);

     };

     ParallaxPart.prototype.setYTransform = function(val) {

       this.el.style.webkitTransform = "translate3d(0, " + val + "px, 0)";

       this.el.style.MozTransform = "translate3d(0, " + val + "px, 0)";

       this.el.style.OTransform = "translate3d(0, " + val + "px, 0)";

       this.el.style.transform = "translate3d(0, " + val + "px, 0)";

       this.el.style.msTransform = "translateY(" + val + "px)";

     };

     return ParallaxPart;

   })();

   ParallaxManager = (function() {

     ParallaxManager.prototype.parts = [];


     function ParallaxManager(elements) {

       if (Array.isArray(elements) && elements.length) {

         this.elements = elements;

       }

       if (typeof elements === 'object' && elements.item) {

         this.elements = Array.prototype.slice.call(elements);

       } else if (typeof elements === 'string') {

         this.elements = document.querySelectorAll(elements);

         if (this.elements.length === 0) {

           throw new Error("Parallax: No elements found");

         }

         this.elements = Array.prototype.slice.call(this.elements);

       } else {

         throw new Error("Parallax: Element variable is not a querySelector string, Array, or NodeList");

       }

       for (var i in this.elements) {

         this.parts.push(new ParallaxPart(this.elements[i]));

       }

       window.addEventListener("scroll", this.onScroll.bind(this));

     }


     ParallaxManager.prototype.onScroll = function() {

       window.requestAnimationFrame(this.scrollHandler.bind(this));

     };


     ParallaxManager.prototype.scrollHandler = function() {

       var scrollY = Math.max(window.pageYOffset, 0);

       for (var i in this.parts) {
         this.parts[i].update(scrollY);
       }

     };

        return ParallaxManager;

   })();


   new ParallaxManager('.parallax-layer');


 // SCROLL BLUR / UNBLUR
 $(window).on('scroll', function() {
   var offset1 = $(window).scrollTop()
   offset1 = offset1 / 100;
  //  var offset2 = 0;
  //  if ($(window).height() < 600) {
  //    if ($(window).height() < 400) {
  //      offset2 = 32 - offset1;
  //    } else {
  //      offset2 = 52 - offset1;
  //    }
  //  } else {
  //    offset2 = 70 - offset1;
  //  }
  //  if (offset2 < 0) {
  //    offset2 = 0;
  //  }
   $(".parallax-layer").css({
     "-webkit-filter": "blur(" + offset1 + "px)",
     "filter": "blur(" + offset1 + "px)"
   })
  //  $(".footer-bg").css({
  //    "-webkit-filter": "blur(" + offset2 + "px)",
  //    "filter": "blur(" + offset2 + "px)"
  //  })
  //  $(".footer-container").css({
  //    "-webkit-filter": "blur(" + offset2 + "px)",
  //    "filter": "blur(" + offset2 + "px)"
  //  })

 });

 // INTRO
 $('.layer-logo .hey').click(function() {
   $('.layer-logo').fadeOut('slow');
   $('.intro').fadeIn('slow');
 });

 $('.intro .hey').click(function() {
  $('.intro').fadeOut('slow');
  $('.layer-logo').fadeIn('slow');
  window.scrollTo(0, 0);
});

 if ($(window).width()<=950) {
   $('.layer-logo .hey img').attr('src','img/header/hey2.svg').fadeIn(400);
 }
 $(window).resize(function(){
  //  if ($('.layer-logo div').is('visible')) {
     if ($(window).width()<=950) {
       $('.layer-logo .hey img').attr('src','').hide().attr('src','img/header/hey2.svg').fadeIn(400);
     } else {
       $('.layer-logo .hey img').attr('src','').hide().attr('src','img/header/hey.svg').fadeIn(400);
     }
  //  }
 });

 // NAVIGATION
   var contentSections = $('.container'),
       navigationItems = $('#navigation a');

   //Navigation behavs
   $(window).scroll(function() {
     if ($(window).scrollTop() > ($(".layer-3").offset().top)) {
       $("#navigation").fadeIn(400);
     } else {
       $("#navigation").fadeOut(400);
     }
   });

   navigationItems.on('click', function(event) {
     event.preventDefault();
     smoothScroll($(this.hash));
   });
   function smoothScroll(target) {
     $('body,html').animate({
         'scrollTop': target.offset().top
       },
       1000
     );
   }

   updateNavigation();
   $(window).on('scroll', function() {
     updateNavigation();
   });
   function updateNavigation() {
     contentSections.each(function() {
       $this = $(this);
       var activeSection = $('nav a[href="#' + $this.attr('id') + '"]').data('number') - 1;
       if (($this.offset().top - $(window).height() / 2 < $(window).scrollTop()) && ($this.offset().top + $this.height() - $(window).height() / 2 > $(window).scrollTop())) {
         navigationItems.eq(activeSection).addClass('is-selected');
       } else {
         navigationItems.eq(activeSection).removeClass('is-selected');
       }
     });
   }

  // MATRIX Rain
   $('#langue').mouseover(function(){
     matrixRain();
   });
   function matrixRain() {
       var binary = document.getElementById("binary");
       var ctx = binary.getContext("2d");
       var string = "01010100010101010101010010100101001010010101001010101010010101001";

       //converting the string into an array of single characters
       string = string.split("");

       var font_size = 14;
       var columns = binary.width / font_size; //number of columns for the rain
       //an array of drops - one per column
       var drops = [];
       //x below is the x coordinate
       //1 = y co-ordinate of the drop(same for every drop initially)
       for (var x = 0; x < columns; x++)
         drops[x] = 1;

     //drawing the characters
     function draw() {
       //Black BG for the canvas
       //translucent BG to show trail
       ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
       ctx.fillRect(0, 0, binary.width, binary.height);

       ctx.fillStyle = "#00BCD4"; //text color
       ctx.font = font_size + "px arial";
       //looping over drops
       for (var i = 0; i < drops.length; i++) {
         //a random chinese character to print
         var text = string[Math.floor(Math.random() * string.length)];
         //x = i*font_size, y = value of drops[i]*font_size
         ctx.fillText(text, i * font_size, drops[i] * font_size);

         //sending the drop back to the top randomly after it has crossed the screen
         //adding a randomness to the reset to make the drops scattered on the Y axis
         if (drops[i] * font_size > binary.height && Math.random() > 0.975)
           drops[i] = 0;

         //incrementing Y coordinate
         drops[i]++;
       }
     }

    setInterval(draw, 40);
   }

   //OTHERS
   getMyAge();
   function getMyAge() {
     var today = new Date();
     var thisYear = today.getFullYear();
     var myAge = thisYear - 1998;
     $('.age').html(myAge);
   }
});
