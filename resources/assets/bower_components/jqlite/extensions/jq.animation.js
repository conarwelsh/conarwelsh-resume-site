/*
 * jqAnimation - Animation extension for jQLite
 *
 * Many thanks to the jQuery team's efforts.  Code is
 * Copyright (c) 2010, John Resig.  See
 * http://jquery.org/license
 *
 * This extension is actually the jQuery FX engine as a plugin.  There have been
 * some minor changes to make it less dependent on determining if it works in IE,
 * plus some other additional changes.  But for the most part, this is FX.  The
 * "toggle" type of animation for show/hide isn't supported.
 *
 * @author Brett Fattori (bfattori@gmail.com)
 * @author $Author: bfattori $
 * @version $Revision: 108 $
 *
 * Created: 04/28/2010
 * Modified $Date: 2010-05-18 16:03:35 -0400 (Tue, 18 May 2010) $
 */
(function(jQuery) {
   // exclude the following css properties to add px
   var exclude = /z-?index|font-?weight|opacity|zoom|line-?height/i,
       defaultView = document.defaultView || {};

   var styleFloat = "cssFloat";

   jQuery.props = {
      "for": "htmlFor",
      "class": "className",
      "float": styleFloat,
      cssFloat: styleFloat,
      styleFloat: styleFloat,
      readonly: "readOnly",
      maxlength: "maxLength",
      cellspacing: "cellSpacing",
      rowspan: "rowSpan",
      tabindex: "tabIndex"
   };

   jQuery.extend({
      queue: function( elem, type, data ) {
         if ( elem ){

            type = (type || "fx") + "queue";

            var q = jQuery.data( elem, type );

            if ( !q || jQuery.isArray(data) )
               q = jQuery.data( elem, type, jQuery.makeArray(data) );
            else if( data )
               q.push( data );

         }
         return q;
      },

      dequeue: function( elem, type ){
         var queue = jQuery.queue( elem, type ),
            fn = queue.shift();

         if( !type || type === "fx" )
            fn = queue[0];

         if( fn !== undefined )
            fn.call(elem);
      },

      attr: function( elem, name, value ) {
         // don't set attributes on text and comment nodes
         if (!elem || elem.nodeType == 3 || elem.nodeType == 8)
            return undefined;

         var set = value !== undefined;

         // Try to normalize/fix the name
         name = jQuery.props[ name ] || name;

         // Only do all the following if this is a node (faster for style)
         // IE elem.getAttribute passes even for style
         if ( elem.tagName ) {

            // These attributes require special treatment
            var special = /href|src|style/.test( name );

            // Safari mis-reports the default selected property of a hidden option
            // Accessing the parent's selectedIndex property fixes it
            if ( name == "selected" && elem.parentNode )
               elem.parentNode.selectedIndex;

            // If applicable, access the attribute via the DOM 0 way
            if ( name in elem && !special ) {
               if ( set ){
                  elem[ name ] = value;
               }

               return elem[ name ];
            }

            if ( set )
               // convert the value to a string (all browsers do this but IE) see #1070
               elem.setAttribute( name, "" + value );

            var attr = elem.getAttribute( name );

            // Non-existent attributes return null, we normalize to undefined
            return attr === null ? undefined : attr;
         }

         // elem is actually elem.style ... set the style

         name = name.replace(/-([a-z])/ig, function(all, letter){
            return letter.toUpperCase();
         });

         if ( set )
            elem[ name ] = value;

         return elem[ name ];
      },

      swap: function( elem, options, callback ) {
         var old = {};
         // Remember the old values, and insert the new ones
         for ( var name in options ) {
            old[ name ] = elem.style[ name ];
            elem.style[ name ] = options[ name ];
         }

         callback.call( elem );

         // Revert the old values
         for ( var name in options )
            elem.style[ name ] = old[ name ];
      },

      css: function( elem, name, force, extra ) {
         if ( name == "width" || name == "height" ) {
            var val, props = { position: "absolute", visibility: "hidden", display:"block" }, which = name == "width" ? [ "Left", "Right" ] : [ "Top", "Bottom" ];

            function getWH() {
               val = name == "width" ? elem.offsetWidth : elem.offsetHeight;

               if ( extra === "border" )
                  return;

               jQuery.each( which, function() {
                  if ( !extra )
                     val -= parseFloat(jQuery.curCSS( elem, "padding" + this, true)) || 0;
                  if ( extra === "margin" )
                     val += parseFloat(jQuery.curCSS( elem, "margin" + this, true)) || 0;
                  else
                     val -= parseFloat(jQuery.curCSS( elem, "border" + this + "Width", true)) || 0;
               });
            }

            if ( elem.offsetWidth !== 0 )
               getWH();
            else
               jQuery.swap( elem, props, getWH );

            return Math.max(0, Math.round(val));
         }

         return jQuery.curCSS( elem, name, force );
      },

      prop: function( elem, value, type, i, name ) {
         // Handle executable functions
         if ( jQuery.isFunction( value ) )
            value = value.call( elem, i );

         // Handle passing in a number to a CSS property
         return typeof value === "number" && type == "curCSS" && !exclude.test( name ) ?
            value + "px" :
            value;
      },

      curCSS: function( elem, name, force ) {
         var ret, style = elem.style;

         // Make sure we're using the right name for getting the float value
         if ( name.match( /float/i ) )
            name = styleFloat;

         if ( !force && style && style[ name ] )
            ret = style[ name ];

         else if ( defaultView.getComputedStyle ) {

            // Only "float" is needed here
            if ( name.match( /float/i ) )
               name = "float";

            name = name.replace( /([A-Z])/g, "-$1" ).toLowerCase();

            var computedStyle = defaultView.getComputedStyle( elem, null );

            if ( computedStyle )
               ret = computedStyle.getPropertyValue( name );

            // We should always get a number back from opacity
            if ( name == "opacity" && ret == "" )
               ret = "1";

         } else if ( elem.currentStyle ) {
            var camelCase = name.replace(/\-(\w)/g, function(all, letter){
               return letter.toUpperCase();
            });

            ret = elem.currentStyle[ name ] || elem.currentStyle[ camelCase ];

            // From the awesome hack by Dean Edwards
            // http://erik.eae.net/archives/2007/07/27/18.54.15/#comment-102291

            // If we're not dealing with a regular pixel number
            // but a number that has a weird ending, we need to convert it to pixels
            if ( !/^\d+(px)?$/i.test( ret ) && /^\d/.test( ret ) ) {
               // Remember the original values
               var left = style.left, rsLeft = elem.runtimeStyle.left;

               // Put in the new values to get a computed value out
               elem.runtimeStyle.left = elem.currentStyle.left;
               style.left = ret || 0;
               ret = style.pixelLeft + "px";

               // Revert the changed values
               style.left = left;
               elem.runtimeStyle.left = rsLeft;
            }
         }

         return ret;
      }
   });

   jQuery.fn.extend({

      queue: function(type, data){
         if ( typeof type !== "string" ) {
            data = type;
            type = "fx";
         }

         if ( data === undefined )
            return jQuery.queue( this[0], type );

         return this.each(function(){
            var queue = jQuery.queue( this, type, data );

             if( type == "fx" && queue.length == 1 )
               queue[0].call(this);
         });
      },
      dequeue: function(type){
         return this.each(function(){
            jQuery.dequeue( this, type );
         });
      }
   });

   var elemdisplay = {},
      timerId,
      fxAttrs = [
         // height animations
         [ "height", "marginTop", "marginBottom", "paddingTop", "paddingBottom" ],
         // width animations
         [ "width", "marginLeft", "marginRight", "paddingLeft", "paddingRight" ],
         // opacity animations
         [ "opacity" ]
      ];

   function genFx( type, num ){
      var obj = {};
      jQuery.each( fxAttrs.concat.apply([], fxAttrs.slice(0,num)), function(){
         obj[ this ] = type;
      });
      return obj;
   }

   // Remember the old methods
   var _oldShow = jQuery.fn.show;
   var _oldHide = jQuery.fn.hide;

   jQuery.fn.extend({
      show: function(speed,callback){
         if ( speed && !jQuery.isFunction(speed) ) {
            return this.animate( genFx("show", 3), speed, callback);
         } else {
            return _oldShow.call(this, speed);
         }
      },

      hide: function(speed,callback){
         if ( speed && !jQuery.isFunction(speed) ) {
            return this.animate( genFx("hide", 3), speed, callback);
         } else {
            return _oldHide.call(this, speed);
         }
      },

      fadeTo: function(speed,to,callback){
         return this.animate({opacity: to}, speed, callback);
      },

      animate: function( prop, speed, easing, callback ) {
         var optall = jQuery.speed(speed, easing, callback);

         return this[ optall.queue === false ? "each" : "queue" ](function(){

            var opt = jQuery.extend({}, optall), p,
               self = this;

            for ( p in prop ) {

               if ( ( p == "height" || p == "width" ) && this.style ) {
                  // Store display property
                  opt.display = jQuery.css(this, "display");

                  // Make sure that nothing sneaks out
                  opt.overflow = this.style.overflow;
               }
            }

            if ( opt.overflow != null )
               this.style.overflow = "hidden";

            opt.curAnim = jQuery.extend({}, prop);

            jQuery.each( prop, function(name, val){
               var e = new jQuery.fx( self, opt, name );

               if ( /show|hide/.test(val) )
                  e[ val ]( prop );
               else {
                  var parts = val.toString().match(/^([+-]=)?([\d+-.]+)(.*)$/),
                     start = e.cur(true) || 0;

                  if ( parts ) {
                     var end = parseFloat(parts[2]),
                        unit = parts[3] || "px";

                     // We need to compute starting value
                     if ( unit != "px" ) {
                        self.style[ name ] = (end || 1) + unit;
                        start = ((end || 1) / e.cur(true)) * start;
                        self.style[ name ] = start + unit;
                     }

                     // If a +=/-= token was provided, we're doing a relative animation
                     if ( parts[1] )
                        end = ((parts[1] == "-=" ? -1 : 1) * end) + start;

                     e.custom( start, end, unit );
                  } else
                     e.custom( start, val, "" );
               }
            });

            // For JS strict compliance
            return true;
         });
      },

      stop: function(clearQueue, gotoEnd){
         var timers = jQuery.timers;

         if (clearQueue)
            this.queue([]);

         this.each(function(){
            // go in reverse order so anything added to the queue during the loop is ignored
            for ( var i = timers.length - 1; i >= 0; i-- )
               if ( timers[i].elem == this ) {
                  if (gotoEnd)
                     // force the next step to be the last
                     timers[i](true);
                  timers.splice(i, 1);
               }
         });

         // start the next in the queue if the last step wasn't forced
         if (!gotoEnd)
            this.dequeue();

         return this;
      }

   });

   // Generate shortcuts for custom animations
   jQuery.each({
      slideDown: genFx("show", 1),
      slideUp: genFx("hide", 1),
      fadeIn: { opacity: "show" },
      fadeOut: { opacity: "hide" }
   }, function( name, props ){
      jQuery.fn[ name ] = function( speed, callback ){
         return this.animate( props, speed, callback );
      };
   });

   jQuery.extend({

      speed: function(speed, easing, fn) {
         var opt = typeof speed === "object" ? speed : {
            complete: fn || !fn && easing ||
               jQuery.isFunction( speed ) && speed,
            duration: speed,
            easing: fn && easing || easing && !jQuery.isFunction(easing) && easing
         };

         opt.duration = jQuery.fx.off ? 0 : typeof opt.duration === "number" ? opt.duration :
            jQuery.fx.speeds[opt.duration] || jQuery.fx.speeds._default;

         // Queueing
         opt.old = opt.complete;
         opt.complete = function(){
            if ( opt.queue !== false )
               jQuery(this).dequeue();
            if ( jQuery.isFunction( opt.old ) )
               opt.old.call( this );
         };

         return opt;
      },

      easing: {
         linear: function( p, n, firstNum, diff ) {
            return firstNum + diff * p;
         },
         swing: function( p, n, firstNum, diff ) {
            return ((-Math.cos(p*Math.PI)/2) + 0.5) * diff + firstNum;
         }
      },

      timers: [],

      fx: function( elem, options, prop ){
         this.options = options;
         this.elem = elem;
         this.prop = prop;

         if ( !options.orig )
            options.orig = {};
      }

   });

   jQuery.fx.prototype = {

      // Simple function for setting a style value
      update: function(){
         if ( this.options.step )
            this.options.step.call( this.elem, this.now, this );

         (jQuery.fx.step[this.prop] || jQuery.fx.step._default)( this );

         // Set display property to block for height/width animations
         if ( ( this.prop == "height" || this.prop == "width" ) && this.elem.style )
            this.elem.style.display = "block";
      },

      // Get the current size
      cur: function(force){
         if ( this.elem[this.prop] != null && (!this.elem.style || this.elem.style[this.prop] == null) )
            return this.elem[ this.prop ];

         var r = parseFloat(jQuery.css(this.elem, this.prop, force));
         return r && r > -10000 ? r : parseFloat(jQuery.curCSS(this.elem, this.prop)) || 0;
      },

      // Start an animation from one number to another
      custom: function(from, to, unit){
         this.startTime = now();
         this.start = from;
         this.end = to;
         this.unit = unit || this.unit || "px";
         this.now = this.start;
         this.pos = this.state = 0;

         var self = this;
         function t(gotoEnd){
            return self.step(gotoEnd);
         }

         t.elem = this.elem;

         if ( t() && jQuery.timers.push(t) && !timerId ) {
            timerId = setInterval(function(){
               var timers = jQuery.timers;

               for ( var i = 0; i < timers.length; i++ )
                  if ( !timers[i]() )
                     timers.splice(i--, 1);

               if ( !timers.length ) {
                  clearInterval( timerId );
                  timerId = undefined;
               }
            }, 13);
         }
      },

      // Simple 'show' function
      show: function(){
         // Remember where we started, so that we can go back to it later
         this.options.orig[this.prop] = jQuery.attr( this.elem.style, this.prop );
         this.options.show = true;

         // Begin the animation
         // Make sure that we start at a small width/height to avoid any
         // flash of content
         this.custom(this.prop == "width" || this.prop == "height" ? 1 : 0, this.cur());

         // Start by showing the element
         jQuery(this.elem).show();
      },

      // Simple 'hide' function
      hide: function(){
         // Remember where we started, so that we can go back to it later
         this.options.orig[this.prop] = jQuery.attr( this.elem.style, this.prop );
         this.options.hide = true;

         // Begin the animation
         this.custom(this.cur(), 0);
      },

      // Each step of an animation
      step: function(gotoEnd){
         var t = now();

         if ( gotoEnd || t >= this.options.duration + this.startTime ) {
            this.now = this.end;
            this.pos = this.state = 1;
            this.update();

            this.options.curAnim[ this.prop ] = true;

            var done = true;
            for ( var i in this.options.curAnim )
               if ( this.options.curAnim[i] !== true )
                  done = false;

            if ( done ) {
               if ( this.options.display != null ) {
                  // Reset the overflow
                  this.elem.style.overflow = this.options.overflow;

                  // Reset the display
                  this.elem.style.display = this.options.display;
                  if (jQuery.css(this.elem, "display") == "none" )
                     this.elem.style.display = "block";
               }

               // Hide the element if the "hide" operation was done
               if ( this.options.hide )
                  jQuery(this.elem).hide();

               // Reset the properties, if the item has been hidden or shown
               if ( this.options.hide || this.options.show )
                  for ( var p in this.options.curAnim )
                     jQuery.attr(this.elem.style, p, this.options.orig[p]);

               // Execute the complete function
               this.options.complete.call( this.elem );
            }

            return false;
         } else {
            var n = t - this.startTime;
            this.state = n / this.options.duration;

            // Perform the easing function, defaults to swing
            this.pos = jQuery.easing[this.options.easing || (jQuery.easing.swing ? "swing" : "linear")](this.state, n, 0, 1, this.options.duration);
            this.now = this.start + ((this.end - this.start) * this.pos);

            // Perform the next step of the animation
            this.update();
         }

         return true;
      }

   };

   jQuery.extend( jQuery.fx, {
      speeds:{
         slow: 600,
         fast: 200,
         // Default speed
         _default: 400
      },
      step: {

         opacity: function(fx){
            jQuery.attr(fx.elem.style, "opacity", fx.now);
         },

         _default: function(fx){
            if ( fx.elem.style && fx.elem.style[ fx.prop ] != null )
               fx.elem.style[ fx.prop ] = fx.now + fx.unit;
            else
               fx.elem[ fx.prop ] = fx.now;
         }
      }
   });

})(jQuery);

