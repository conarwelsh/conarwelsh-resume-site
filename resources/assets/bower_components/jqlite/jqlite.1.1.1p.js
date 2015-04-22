/*!
 * jQLite JavaScript Library v1.1.1p (http://code.google.com/p/jqlite/)
 * This includes a profiler for the selector engine
 *
 * Copyright (c) 2010 Brett Fattori (bfattori@gmail.com)
 * Licensed under the MIT license
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Many thanks to the jQuery team's efforts.  Some code is
 * Copyright (c) 2010, John Resig.  See
 * http://jquery.org/license
 *
 * @author Brett Fattori (bfattori@gmail.com)
 * @author $Author: bfattori $
 * @version $Revision: 144 $
 *
 * Created: 03/29/2010
 * Modified: $Date: 2010-06-21 11:06:36 -0400 (Mon, 21 Jun 2010) $
 */
(function() {

   function now(){
      return +new Date;
   }

   /**
    * profiler.js
    * @author Brett Fattori (bfattori@gmail.com)
    */

   // Allocate a global "static" object for the utility library where we'll
   // keep track of all object instances and global variables managed by this library
   if(!window.Profiler)
   {
      window.Profiler={
         profileStack: [],
         allProfiles: {},
         profiles: []
      };

      /**
       * Add a profile monitor to the stack of running profiles.
       * @param prof {String} The name of the profile
       */
      Profiler.enter = function(prof) {
         var profile = Profiler.allProfiles[prof];
         if (profile == null) {
            // Create a monitor
            profile = Profiler.allProfiles[prof] = {
               name: prof,
               startMS: new Date(),
               execs: 0,
               totalMS: 0,
               instances: 1,
               pushed: false
            };
         } else {
            profile.startMS = profile.instances == 0 ? new Date() : profile.startMS;
            profile.instances++;
         }
         Profiler.profileStack.push(profile);
      };

      /**
       * For every "enter", there needs to be a matching "exit" to
       * tell the profiler to stop timing the contained code.  Note
       * that "exit" doesn't take any parameters.  It is necessary that
       * you properly balance your profile stack.  Too many "exit" calls
       * will result in a stack underflow. Missing calls to "exit" will
       * result in a stack overflow.
       */
      Profiler.exit = function() {
         if (Profiler.profileStack.length == 0) {
            var msg = "Profile stack underflow";
            if (typeof console !== "undefined") { console.error(msg); }
            throw(msg);
         }

         var profile = Profiler.profileStack.pop();
         profile.endMS = new Date();
         profile.execs++;
         profile.instances--;
         profile.totalMS += profile.instances == 0 ? (profile.endMS.getTime() - profile.startMS.getTime()) : 0;
         if (!profile.pushed) {
            // If we haven't remembered it, do that now
            profile.pushed = true;
            Profiler.profiles.push(profile);
         }
      };

      /**
       * Reset any currently running profiles and clear the stack.
       */
      Profiler.resetProfiles = function() {
         Profiler.profileStack = [];
         Profiler.allProfiles = {};
         Profiler.profiles = [];
      };

      /**
       * Dump the profiles that are currently in the stack to a debug window.
       * The profile stack will be cleared after the dump.
       * @param el {Element} A DOM element to write the output to, instead of the console
       */
      Profiler.dump = function(el) {
         if (Profiler.profileStack.length > 0) {
            // overflow - profiles left in stack
            var rProfs = "";
            for (var x in Profiler.profileStack) {
               rProfs += (rProfs.length > 0 ? "," : "") + x;
            }
            throw("Profile stack overflow.  Running profiles: " + rProfs);
         }

         var d = new Date();
         d = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();

         var rev = Profiler.profiles.reverse();
         var totalTime = 0;
         var out = "";
         for (var r in rev) {
            var avg = Math.round(rev[r].totalMS / rev[r].execs);
            totalTime += rev[r].totalMS;
            out += "# " + rev[r].name + " | " + (rev[r].totalMS < 1 ? "<1" : rev[r].totalMS) + " ms | " + rev[r].execs + " @ " + (avg < 1 ? "<1" : avg) + " ms\n";
         }
         out += "# Total Time: | " + totalTime + " ms | \n";

         if (el) {
            var msg = "<table border='1' cellspacing='0' cellpadding='2'><tr><td colspan='3'>PROFILER RESULTS @ " + d + "</td></tr>";
            msg += "<tr><th>Profile Name</th><th>Total</th><th>Execs @ Avg Time</th></tr>";
            out = out.replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/#/g, "<tr><td>")
                    .replace(/\|/g, "</td><td>").replace(/\n/g,"</td></tr>");
            msg += out + "</table>";
            jQL(el).html(msg);
         } else {
            console.warn("PROFILER RESULTS @ " + d + "\n---------------------------------------------------\n");
            console.info(out);
         }

         Profiler.resetProfiles();
      };
   }

   /*
      Simplified DOM selection engine
      START ---------------------------------------------------------
    */
   var parseChunks = function(stringSelector, contextNodes) {
      Profiler.enter("parseChunks");

      try {
         if (stringSelector === "" && contextNodes) {
            return contextNodes;
         }

         var chunks = stringSelector.split(" ");

         // Revise the context nodes
         var chunk = chunks.shift();
         var ctxNode;

         // Is the chunk an Id selector?
         if (chunk.charAt(0) == "#") {
            var idNode = document.getElementById(chunk.substring(1));
            ctxNode = idNode ? [idNode] : [];
         } else {

            var elName = chunk.charAt(0) !== "." ? chunk.split(".")[0] : "*";
            var classes = chunk.split(".");
            var attrs = null;

            // Remove any attributes from the element
            if (elName.indexOf("[") != -1) {
               attrs = elName;
               elName = elName.substr(0, elName.indexOf("["));
            }

            var cFn = function(node) {
               Profiler.enter("parseChunks.cFn");
               try {
                  var aC = arguments.callee;
                  if ((!aC.needClass || hasClasses(node, aC.classes)) &&
                      (!aC.needAttribute || hasAttributes(node, aC.attributes))) {
                     return node;
                  }
               } finally {
                  Profiler.exit();
               }
            };

            // Find tags in the context of the element
            var cnodes = [];
            for (var cxn = 0; cxn < contextNodes.length; cxn++) {
               var x = contextNodes[cxn].getElementsByTagName(elName);
               for (var a = 0;a < x.length; a++) {
                  cnodes.push(x[a]);
               }
            }
            if (classes) {
               classes.shift();
            }
            ctxNode = [];
            cFn.classes = classes;

            if (attrs != null) {
               var b1 = attrs.indexOf("[");
               var b2 = attrs.lastIndexOf("]");
               var as = attrs.substring(b1 + 1,b2);
               var attrib = as.split("][");
            }

            cFn.attributes = attrs != null ? attrib : null;
            cFn.needClass = (chunk.indexOf(".") != -1 && classes.length > 0);
            cFn.needAttribute = (attrs != null);

            for (var j = 0; j < cnodes.length; j++) {
               if (cFn(cnodes[j])) {
                  ctxNode.push(cnodes[j]);
               }
            }
         }

         return parseChunks(chunks.join(" "), ctxNode);
      } finally {
         Profiler.exit("parseChunks");
      }
   };

   var parseSelector = function(selector, context) {

      Profiler.enter("parseSelector");
      try {
         context = context || document;

         if (selector.nodeType && selector.nodeType === DOM_DOCUMENT_NODE) {
            selector = document.body;
            if (selector === null) {
               // Body not ready yet, return the document instead
               return [document];
            }
         }

         if (selector.nodeType && selector.nodeType === DOM_ELEMENT_NODE) {
            // Is the selector already a single DOM node?
            return [selector];
         }

         if (selector.jquery && typeof selector.jquery === "string") {
            // Is the selector a jQL object?
            return selector.toArray();
         }

         if (context) {
            context = cleanUp(context);
         }

         if (jQL.isArray(selector)) {
            // This is already an array of nodes
            return selector;
         } else if (typeof selector === "string") {

            // This is the meat and potatoes
            var nodes = [];
            for (var cN = 0; cN < context.length; cN++) {
               // For each context node, look for the
               // specified node within it
               var ctxNode = [context[cN]];
               if (!jQL.forceSimpleSelectorEngine && ctxNode[0].querySelectorAll) {
                  var nl = ctxNode[0].querySelectorAll(selector);
                  for (var tni = 0; tni < nl.length; tni++) {
                     nodes.push(nl.item(tni));
                  }
               } else {
                  nodes = nodes.concat(parseChunks(selector, ctxNode));
               }
            }
            return nodes;
         } else {
            // What do you want me to do with this?
            return null;
         }
      } finally {
         Profiler.exit();
      }
   };

   var hasClasses = function(node, cArr) {
      Profiler.enter("hasClasses");
      try {
         if (node.className.length == 0) {
            return false;
         }
         var cn = node.className.split(" ");
         var cC = cArr.length;
         for (var c = 0; c < cArr.length; c++) {
            if (jQL.inArray(cArr[c], cn) != -1) {
               cC--;
            }
         }
         return (cC == 0);
      } finally {
         Profiler.exit();
      }
   };

   var hasAttributes = function(node, attrs) {
      Profiler.enter("hasAttributes");
      try {
         var satisfied = true;
         for (var i = 0; i < attrs.length; i++) {
            var tst = attrs[i].split("=");
            var op = (tst[0].indexOf("!") != -1 || tst[0].indexOf("*") != -1) ? tst[0].charAt(tst[0].length - 1) + "=" : "=";
            if (op != "=") {
               tst[0] = tst[0].substring(0, tst[0].length - 1);
            }
            switch (op) {
               case "=": satisfied &= (node.getAttribute(tst[0]) === tst[1]); break;
               case "!=": satisfied &= (node.getAttribute(tst[0]) !== tst[1]); break;
               case "*=": satisfied &= (node.getAttribute(tst[0]).indexOf(tst[1]) != -1); break;
               default: satisfied = false;
            }
         }
         return satisfied;
      } finally {
         Profiler.exit();
      }
   };

   /*
      END -----------------------------------------------------------
      Simplified DOM selection engine
    */

   var gSupportScriptEval = false;

   setTimeout(function() {
      var root = document.body;

      if (!root) {
         setTimeout(arguments.callee, 33);
         return;
      }

      var script = document.createElement("script"),
       id = "i" + new Date().getTime();

      script.type = "text/javascript";
      try {
         script.appendChild( document.createTextNode( "window." + id + "=1;" ) );
      } catch(e) {}

      root.insertBefore( script, root.firstChild );

      // Make sure that the execution of code works by injecting a script
      // tag with appendChild/createTextNode
      // (IE doesn't support this, fails, and uses .text instead)
      var does = true;
      if ( window[ id ] ) {
         delete window[ id ];
      } else {
         does = false;
      }

      root.removeChild( script );
      gSupportScriptEval = does;
   }, 33);

   var stripScripts = function(data) {
      Profiler.enter("stripScripts");
      try {
         // Wrap the data in a dom element
         var div = document.createElement("div");
         div.innerHTML = data;
         // Strip out all scripts
         var scripts = div.getElementsByTagName("script");

         return { scripts: scripts, data: data};
      } finally {
         Profiler.exit();
      }
   };

   var properCase = function(str, skipFirst) {
      Profiler.enter("properCase");
      try {
         skipFirst = skipFirst || false;
         str = (!str ? "" : str.toString().replace(/^\s*|\s*$/g,""));

         var returnString = "";
         if(str.length <= 0){
            return "";
         }

         var ucaseNextFlag = false;

         if(!skipFirst) {
            returnString += str.charAt(0).toUpperCase();
         } else {
            returnString += str.charAt(0);
         }

         for(var counter=1;counter < str.length;counter++) {
            if(ucaseNextFlag) {
               returnString += str.charAt(counter).toUpperCase();
            } else {
               returnString += str.charAt(counter).toLowerCase();
            }
            var character = str.charCodeAt(counter);
            ucaseNextFlag = character == 32 || character == 45 || character == 46;
            if(character == 99 || character == 67) {
               if(str.charCodeAt(counter-1)==77 || str.charCodeAt(counter-1)==109) {
                  ucaseNextFlag = true;
               }
            }
         }
         return returnString;
      } finally {
         Profiler.exit();
      }
   };


   var fixStyleProp = function(name) {
      Profiler.enter("fixStyleProp");
      try {
         var tempName = name.replace(/-/g, " ");
         tempName = properCase(tempName, true);
         return tempName.replace(/ /g, "");
      } finally {
         Profiler.exit();
      }
   };

   //------------------ EVENTS

   /**
    * Associative array of events and their types
    * @private
    */
   var EVENT_TYPES = {click:"MouseEvents",dblclick:"MouseEvents",mousedown:"MouseEvents",mouseup:"MouseEvents",
                      mouseover:"MouseEvents",mousemove:"MouseEvents",mouseout:"MouseEvents",contextmenu:"MouseEvents",
                      keypress:"KeyEvents",keydown:"KeyEvents",keyup:"KeyEvents",load:"HTMLEvents",unload:"HTMLEvents",
                      abort:"HTMLEvents",error:"HTMLEvents",resize:"HTMLEvents",scroll:"HTMLEvents",select:"HTMLEvents",
                      change:"HTMLEvents",submit:"HTMLEvents",reset:"HTMLEvents",focus:"HTMLEvents",blur:"HTMLEvents",
                      touchstart:"MouseEvents",touchend:"MouseEvents",touchmove:"MouseEvents"};

   var createEvent = function(eventType) {
      Profiler.enter("createEvent");
      try {
         if (typeof eventType === "string") {
            eventType = eventType.toLowerCase();
         }

         var evt = null;
         var eventClass = EVENT_TYPES[eventType] || "Event";
         if(document.createEvent) {
            evt = document.createEvent(eventClass);
            evt._eventClass = eventClass;
            if(eventType) {
               evt.initEvent(eventType, true, true);
            }
         }

         if(document.createEventObject) {
            evt = document.createEventObject();
            if(eventType) {
               evt.type = eventType;
               evt._eventClass = eventClass;
            }
         }

         return evt;
      } finally {
         Profiler.exit();
      }
   };

   var fireEvent = function(node, eventType, data) {
      Profiler.enter("fireEvent");
      try {
         var evt = createEvent(eventType);
         if (evt._eventClass !== "Event") {
            evt.data = data;
            return node.dispatchEvent(evt);
         } else {
            var eHandlers = node._handlers || {};
            var handlers = eHandlers[eventType];
            if (handlers) {
               for (var h = 0; h < handlers.length; h++) {
                  var args = jQL.isArray(data) ? data : [];
                  args.unshift(evt);
                  var op = handlers[h].apply(node, args);
                  op = (typeof op == "undefined" ? true : op);
                  if (!op) {
                     break;
                  }
               }
            }
         }
      } finally {
         Profiler.exit();
      }
   };

   var setHandler = function(node, eventType, fn) {
      Profiler.enter("setHandler");
      try {
         if (!jQL.isFunction(fn)) {
            return;
         }

         if (typeof eventType === "string") {
            eventType = eventType.toLowerCase();
         }

         var eventClass = EVENT_TYPES[eventType];
         if (eventType.indexOf("on") == 0) {
            eventType = eventType.substring(2);
         }
         if (eventClass) {
            // Let the browser handle it
            var handler = function(evt) {
               var aC = arguments.callee;
               var args = evt.data || [];
               args.unshift(evt);
               var op = aC.fn.apply(node, args);
               if (typeof op != "undefined" && op === false) {
                  if (evt.preventDefault && evt.stopPropagation) {
                     evt.preventDefault();
                     evt.stopPropagation();
                  } else {
                     evt.returnValue = false;
                     evt.cancelBubble = true;
                  }
                  return false;
               }
               return true;
            };
            handler.fn = fn;
            if (node.addEventListener) {
               node.addEventListener(eventType, handler, false);
            } else {
               node.attachEvent("on" + eventType, handler);
            }
         } else {
            if (!node._handlers) {
               node._handlers = {};
            }
            var handlers = node._handlers[eventType] || [];
            handlers.push(fn);
            node._handlers[eventType] = handlers;
         }
      } finally {
         Profiler.exit();
      }
   };

   /**
    * jQuery "lite"
    *
    * This is a small subset of support for jQuery-like functionality.  It
    * is not intended to be a full replacement, but it will provide some
    * of the functionality which jQuery provides to allow development
    * using jQuery-like syntax.
    */
   var jQL = function(s, e) {
      Profiler.enter("jQL()");
      try {
         return new jQLp().init(s, e);
      } finally {
         Profiler.exit();
      }
   },
   document = window.document,
   hasOwnProperty = Object.prototype.hasOwnProperty,
   toString = Object.prototype.toString,
   push = Array.prototype.push,
   slice = Array.prototype.slice,
   DOM_ELEMENT_NODE = 1,
   DOM_DOCUMENT_NODE = 9,
   readyStack = [],
   isReady = false,
   setReady = false,
   DOMContentLoaded;

   /** 
    * Force the usage of the simplified selector engine. Setting this to true will
    * cause the simplified selector engine to be used, limiting the number of available
    * selectors based on the original (jQLite v1.0.0 - v1.1.0) selector engine.  Keeping
    * the value at "false" will allow jQLite to switch to using [element].querySelectorAll()
    * if it is available.  This provides a speed increase, but it may function differently
    * based on each platform.
    */
   jQL.forceSimpleSelectorEngine = false;

   /**
    * Loop over each object, performing the function for each one
    * @param obj
    * @param fn
    */
   jQL.each = function(obj, fn) {
      Profiler.enter("jQL.each");
      try {
         var name, i = 0,
            length = obj.length,
            isObj = length === undefined || jQL.isFunction(obj);

         if ( isObj ) {
            for ( name in obj ) {
               if ( fn.call( obj[ name ], name, obj[ name ] ) === false ) {
                  break;
               }
            }
         } else {
            for ( var value = obj[0];
               i < length && fn.call( value, i, value ) !== false; value = obj[++i] ) {}
         }

         return obj;
      } finally {
         Profiler.exit();
      }
   };

   /**
    * NoOp function (empty)
    */
   jQL.noop = function() {};

   /**
    * Test if the given object is a function
    * @param obj
    */
   jQL.isFunction = function(obj) {
      return toString.call(obj) === "[object Function]";
   };

   /**
    * Test if the given object is an Array
    * @param obj
    */
   jQL.isArray = function( obj ) {
      return toString.call(obj) === "[object Array]";
   };

   /**
    * Test if the given object is an Object
    * @param obj
    */
   jQL.isPlainObject = function( obj ) {
      Profiler.enter("jQL.isPlainObject");
      try {
         // Make sure that DOM nodes and window objects don't pass through, as well
         if ( !obj || toString.call(obj) !== "[object Object]" || obj.nodeType || obj.setInterval ) {
            return false;
         }

         // Not own constructor property must be Object
         if ( obj.constructor && !hasOwnProperty.call(obj, "constructor")
            && !hasOwnProperty.call(obj.constructor.prototype, "isPrototypeOf") ) {
            return false;
         }

         // Own properties are enumerated firstly
         var key;
         for ( key in obj ) {}
         return key === undefined || hasOwnProperty.call( obj, key );
      } finally {
         Profiler.exit();
      }
   };

   /**
    * Merge two objects into one
    * @param first
    * @param second
    */
   jQL.merge = function( first, second ) {
      Profiler.enter("jQL.merge");
      try {
         var i = first.length, j = 0;

         if ( typeof second.length === "number" ) {
            for ( var l = second.length; j < l; j++ ) {
               first[ i++ ] = second[ j ];
            }
         } else {
            while ( second[j] !== undefined ) {
               first[ i++ ] = second[ j++ ];
            }
         }

         first.length = i;

         return first;
      } finally {
         Profiler.exit();
      }
   };

   jQL.param = function(params) {
      Profiler.enter("jQL.param");
      try {
         var pList = "";
         if (params) {
            jQL.each(params, function(val, name) {
               pList += (pList.length != 0 ? "&" : "") + name + "=" + encodeURIComponent(val);
            });
         }
         return pList;
      } finally {
         Profiler.exit();
      }
   };

   jQL.evalScripts = function(scripts) {
      Profiler.enter("jQL.evalScripts");
      try {
         var head = document.getElementsByTagName("head")[0] || document.documentElement;
         for (var s = 0; s < scripts.length; s++) {

            var script = document.createElement("script");
            script.type = "text/javascript";

            if ( gSupportScriptEval ) {
               script.appendChild( document.createTextNode( scripts[s].text ) );
            } else {
               script.text = scripts[s].text;
            }

            // Use insertBefore instead of appendChild to circumvent an IE6 bug.
            // This arises when a base node is used (#2709).
            head.insertBefore( script, head.firstChild );
            head.removeChild( script );
         }
      } finally {
         Profiler.exit();
      }
   };

   jQL.ready = function() {
      Profiler.enter("jQL.ready");
      try {
         isReady = true;
         while(readyStack.length > 0) {
            var fn = readyStack.shift();
            fn();
         }
      } finally {
         Profiler.exit();
      }
   };

   var expando = "jQuery" + now(), uuid = 0, windowData = {};

   // The following elements throw uncatchable exceptions if you
   // attempt to add expando properties to them.
   jQL.noData = {
      "embed": true,
      "object": true,
      "applet": true
   };

   jQL.cache = {};

   jQL.data = function( elem, name, data ) {
      Profiler.enter("jQL.data");
      try {
         if ( elem.nodeName && jQuery.noData[elem.nodeName.toLowerCase()] ) {
            return;
         }

         elem = elem == window ?
            windowData :
            elem;

         var id = elem[ expando ];

         // Compute a unique ID for the element
         if ( !id ) { id = elem[ expando ] = ++uuid; }

         // Only generate the data cache if we're
         // trying to access or manipulate it
         if ( name && !jQuery.cache[ id ] ) {
            jQuery.cache[ id ] = {};
         }

         // Prevent overriding the named cache with undefined values
         if ( data !== undefined ) {
            jQuery.cache[ id ][ name ] = data;
         }

         // Return the named cache data, or the ID for the element
         return name ?
            jQuery.cache[ id ][ name ] :
            id;
      } finally {
         Profiler.exit();
      }
   };

   jQL.removeData = function( elem, name ) {
      Profiler.enter("jQL.removeData");
      try {
         elem = elem == window ?
            windowData :
            elem;

         var id = elem[ expando ];

         // If we want to remove a specific section of the element's data
         if ( name ) {
            if ( jQuery.cache[ id ] ) {
               // Remove the section of cache data
               delete jQuery.cache[ id ][ name ];

               // If we've removed all the data, remove the element's cache
               name = "";

               for ( name in jQuery.cache[ id ] )
                  break;

               if ( !name ) {
                  jQuery.removeData( elem );
               }
            }

         // Otherwise, we want to remove all of the element's data
         } else {
            // Clean up the element expando
            try {
               delete elem[ expando ];
            } catch(e){
               // IE has trouble directly removing the expando
               // but it's ok with using removeAttribute
               if ( elem.removeAttribute ) {
                  elem.removeAttribute( expando );
               }
            }

            // Completely remove the data cache
            delete jQuery.cache[ id ];
         }
      } finally {
         Profiler.exit();
      }
   };

   jQL.ajax = {
      status: -1,
      statusText: "",
      responseText: null,
      responseXML: null,

      send: function(url, params, sendFn) {
         Profiler.enter("jQL.ajax.send");
         try {
            if (jQL.isFunction(params)) {
               sendFn = params;
               params = {};
            }

            if (!url) {
               return;
            }

            var async = true, uName = null, pWord = null;
            if (typeof params.async !== "undefined") {
               async = params.async;
               delete params.async;
            }

            if (typeof params.username !== "undefined") {
               uName = params.username;
               delete params.username;
            }

            if (typeof params.password !== "undefined") {
               pWord = params.password;
               delete params.password;
            }

            // Poll for readyState == 4
            var p = jQL.param(params);
            if (p.length != 0) {
               url += (url.indexOf("?") == -1 ? "?" : "&") + p;
            }
            var req = new XMLHttpRequest();
            req.open("GET", url, async, uName, pWord);
            req.send();

            if (async) {
               var xCB = function(xhr) {
                  var aC = arguments.callee;
                  if (xhr.status == 200) {
                     jQL.ajax.complete(xhr, aC.cb);
                  } else {
                     jQL.ajax.error(xhr, aC.cb);
                  }
               };
               xCB.cb = sendFn;

               var poll = function() {
                  Profiler.enter("jQL.ajax.send.poll");
                  try {
                     var aC = arguments.callee;
                     if (aC.req.readyState != 4) {
                        setTimeout(aC, 250);
                     } else {
                        aC.xcb(aC.req);
                     }
                  } finally {
                     Profiler.exit();
                  }
               };
               poll.req = req;
               poll.xcb = xCB;

               setTimeout(poll, 250);
            } else {
               // synchronous support?
            }
         } finally {
            Profiler.exit();
         }
      },

      complete: function(xhr, callback) {
         jQL.ajax.status = xhr.status;
         jQL.ajax.responseText = xhr.responseText;
         jQL.ajax.responseXML = xhr.responseXML;
         if (jQL.isFunction(callback)) {
            callback(xhr.responseText, xhr.status);
         }
      },

      error: function(xhr, callback) {
         jQL.ajax.status = xhr.status;
         jQL.ajax.statusText = xhr.statusText;
         if (jQL.isFunction(callback)) {
            callback(xhr.status, xhr.statusText);
         }
      }

   };

   /**
    * Convert the results into an array
    * @param array
    * @param results
    */
   jQL.makeArray = function( array, results ) {
      Profiler.enter("jQL.makeArray");
      try {
         var ret = results || [];
         if ( array != null ) {
            // The window, strings (and functions) also have 'length'
            // The extra typeof function check is to prevent crashes
            // in Safari 2 (See: #3039)
            if ( array.length == null || typeof array === "string" || jQuery.isFunction(array) || (typeof array !== "function" && array.setInterval) ) {
               push.call( ret, array );
            } else {
               jQL.merge( ret, array );
            }
         }

         return ret;
      } finally {
         Profiler.exit();
      }
   };

   jQL.inArray = function(e, arr) {
      Profiler.enter("jQL.inArray");
      try {
         for (var a = 0; a < arr.length; a++) {
            if (arr[a] === e) {
               return a;
            }
         }
         return -1;
      } finally {
         Profiler.exit();
      }
   };

   jQL.trim = function(str) {
      Profiler.enter("jQL.trim");
      try {
         if (str != null) {
            return str.toString().replace(/^\s*|\s*$/g,"");
         } else {
            return "";
         }
      } finally {
         Profiler.exit();
      }
   };

   /**
    * jQLite object
    * @private
    */
   var jQLp = function() {};
   jQLp.prototype = {

      selector: "",
      context: null,
      length: 0,
      jquery: "jqlite-1.1.1p",

      init: function(s, e) {
         Profiler.enter("jQLp.init");
         try {
            if (!s) {
               return this;
            }

            if (s.nodeType) {
               // A simple node
               this.context = this[0] = s;
               this.length = 1;
            } else if (typeof s === "function") {
               // Short-form document.ready()
               this.ready(s);
            } else {
               var els = [];
               if (s.jquery && typeof s.jquery === "string") {
                  // Already jQLite, just grab its elements
                  els = s.toArray();
               } else if (jQL.isArray(s)) {
                  // An array of elements
                  els = s;
               } else if (typeof s === "string" && jQL.trim(s).indexOf("<") == 0 && jQL.trim(s).indexOf(">") != -1) {
                  // This is most likely html, so create an element for them
                  var elm = getParentElem(s);
                  var h = document.createElement(elm);
                  h.innerHTML = s;
                  // Extract the element
                  els = [h.removeChild(h.firstChild)];
                  h = null;
               } else {
                  var selectors;
                  if (s.indexOf(",") != -1) {
                     // Multiple selectors - split them
                     selectors = s.split(",");
                     for (var n = 0; n < selectors.length; n++) {
                        selectors[n] = jQL.trim(selectors[n]);
                     }
                  } else {
                     selectors = [s];
                  }

                  var multi = [];
                  for (var m = 0; m < selectors.length; m++) {
                     multi = multi.concat(parseSelector(selectors[m], e));
                  }
                  els = multi;
               }

               push.apply(this, els);

            }
            return this;
         } finally {
            Profiler.exit();
         }
      },

      // CORE

      each: function(fn) {
         Profiler.enter("jQLp.each");
         try {
            return jQL.each(this, fn);
         } finally {
            Profiler.exit();
         }
      },

      size: function() {
         return this.length;
      },

      toArray: function() {
         return slice.call( this, 0 );
      },

      ready: function(fn) {
         Profiler.enter("jQLp.ready");
         try {
            if (isReady) {
               fn();
            } else {
               readyStack.push(fn);
               return this;
            }
         } finally {
            Profiler.exit();
         }
      },

      data: function( key, value ) {
         Profiler.enter("jQLp.data");
         try {
            if ( typeof key === "undefined" && this.length ) {
               return jQuery.data( this[0] );

            } else if ( typeof key === "object" ) {
               return this.each(function() {
                  jQuery.data( this, key );
               });
            }

            var parts = key.split(".");
            parts[1] = parts[1] ? "." + parts[1] : "";

            if ( value === undefined ) {

               if ( data === undefined && this.length ) {
                  data = jQuery.data( this[0], key );
               }
               return data === undefined && parts[1] ?
                  this.data( parts[0] ) :
                  data;
            } else {
               return this.each(function() {
                  jQuery.data( this, key, value );
               });
            }
         } finally {
            Profiler.exit();
         }
      },

      removeData: function( key ) {
         Profiler.enter("jQLp.removeData");
         try {
            return this.each(function() {
               jQuery.removeData( this, key );
            });
         } finally {
            Profiler.exit();
         }
      },

      // CSS

      addClass: function(cName) {
         Profiler.enter("jQLp.addClass");
         try {
            return this.each(function() {
               if (this.className.length != 0) {
                  var cn = this.className.split(" ");
                  if (jQL.inArray(cName, cn) == -1) {
                     cn.push(cName);
                     this.className = cn.join(" ");
                  }
               } else {
                  this.className = cName;
               }
            });
         } finally {
            Profiler.exit();
         }
      },

      removeClass: function(cName) {
         Profiler.enter("jQLp.removeClass");
         try {
            return this.each(function() {
               if (this.className.length != 0) {
                  var cn = this.className.split(" ");
                  var i = jQL.inArray(cName, cn);
                  if (i != -1) {
                     cn.splice(i, 1);
                     this.className = cn.join(" ");
                  }
               }
            });
         } finally {
            Profiler.exit();
         }
      },

      hasClass: function(cName) {
         Profiler.enter("jQLp.hasClass");
         try{
            if (this[0].className.length == 0) {
               return false;
            }
            return jQL.inArray(cName, this[0].className.split(" ")) != -1;
         } finally {
            Profiler.exit();
         }
      },

      isElementName: function(eName) {
         Profiler.enter("jQLp.isElementName");
         try {
            return (this[0].nodeName.toLowerCase() === eName.toLowerCase());
         } finally {
            Profiler.exit();
         }
      },

      toggleClass: function(cName) {
         Profiler.enter("jQLp.toggleClass");
         try {
            return this.each(function() {
               if (this.className.length == 0) {
                  this.className = cName;
               } else {
                  var cn = this.className.split(" ");
                  var i = jQL.inArray(cName, cn);
                  if (i != -1) {
                     cn.splice(i, 1);
                  } else {
                     cn.push(cName);
                  }
                  this.className = cn.join(" ");
               }
            });
         } finally {
            Profiler.exit();
         }
      },

      hide: function(fn) {
         Profiler.enter("jQLp.hide");
         try {
            return this.each(function() {
               if (this.style && this.style["display"] != null) {
                  if (this.style["display"].toString() != "none") {
                     this._oldDisplay = this.style["display"].toString() || (this.nodeName != "span" ? "block" : "inline");
                     this.style["display"] = "none";
                  }
               }
               if (jQL.isFunction(fn)) {
                  fn(this);
               }
            });
         } finally {
            Profiler.exit();
         }
      },

      show: function(fn) {
         Profiler.enter("jQLp.show");
         try {
            return this.each(function() {
               this.style["display"] = ((this._oldDisplay && this._oldDisplay != "" ? this._oldDisplay : null) || (this.nodeName != "span" ? "block" : "inline"));
               if (jQL.isFunction(fn)) {
                  fn(this);
               }
            });
         } finally {
            Profiler.exit();
         }
      },

      css: function(sel, val) {
         Profiler.enter("jQLp.css");
         try {
            if (typeof sel === "string" && val == null) {
               return this[0].style[fixStyleProp(sel)];
            } else {
               sel = typeof sel === "string" ? makeObj(sel,val) : sel;
               return this.each(function() {
                  var self = this;
                  if (typeof self.style != "undefined") {
                     jQL.each(sel, function(key,value) {
                        value = (typeof value === "number" ? value + "px" : value);
                        var sn = fixStyleProp(key);
                        if (!self.style[sn]) {
                           sn = key;
                        }
                        self.style[sn] = value;
                     });
                  }
               });
            }
         } finally {
            Profiler.exit();
         }
      },

      // AJAX

      load: function(url, params, fn) {
         Profiler.enter("jQLp.load");
         try {
            if (jQL.isFunction(params)) {
               fn = params;
               params = {};
            }
            return this.each(function() {
               var wrapFn = function(data, status) {
                  var aC = arguments.callee;
                  if (data) {
                     // Strip out any scripts first
                     var o = stripScripts(data);
                     aC.elem.innerHTML = o.data;
                     jQL.evalScripts(o.scripts);
                  }
                  if (jQL.isFunction(aC.cback)) {
                     aC.cback(data, status);
                  }
               };
               wrapFn.cback = fn;
               wrapFn.elem = this;
               jQL.ajax.send(url, params, wrapFn);
            });
         } finally {
            Profiler.exit();
         }
      },

      // HTML

      html: function(h) {
         Profiler.enter("jQLp.html");
         try {
            if (!h) {
               return this[0].innerHTML;
            } else {
               return this.each(function() {
                  var o = stripScripts(h);
                  this.innerHTML = o.data;
                  jQL.evalScripts(o.scripts);
               });
            }
         } finally {
            Profiler.exit();
         }
      },

      attr: function(name, value) {
         Profiler.enter("jQLp.attr");
         try {
            if (typeof name === "string" && value == null) {
               if (this[0]) {
                  return this[0].getAttribute(name);
               } else {
                  return "";
               }
            } else {
               return this.each(function() {
                  name = typeof name === "string" ? makeObj(name,value) : name;
                  for (var i in name) {
                     var v = name[i];
                     this.setAttribute(i,v);
                  }
               });
            }
         } finally {
            Profiler.exit();
         }
      },

      eq: function(index) {
         Profiler.enter("jQLp.eq");
         try {
            var elms = this.toArray();
            var elm = index < 0 ? elms[elms.length + index] : elms[index];
            this.context = this[0] = elm;
            this.length = 1;
            return this;
         } finally {
            Profiler.exit();
         }
      },

      first: function() {
         Profiler.enter("jQLp.first");
         try {
            var elms = this.toArray();
            this.context = this[0] = elms[0];
            this.length = 1;
            return this;
         } finally {
            Profiler.exit();
         }
      },

      last: function() {
         Profiler.enter("jQLp.last");
         try {
            var elms = this.toArray();
            this.context = this[0] = elms[elms.length - 1];
            this.length = 1;
            return this;
         } finally {
            Profiler.exit();
         }
      },

      index: function(selector) {
         Profiler.enter("jQLp.index");
         try {
            var idx = -1;
            if (this.length != 0) {
               var itm = this[0];
               if (!selector) {
                  var parent = this.parent();
                  var s = parent[0].firstChild;
                  var arr = [];
                  while (s != null) {
                     if (s.nodeType === DOM_ELEMENT_NODE) {
                        arr.push(s);
                     }
                     s = s.nextSibling;
                  }
                  jQL.each(s, function(i) {
                     if (this === itm) {
                        idx = i;
                        return false;
                     }
                  });
               } else {
                  var elm = jQL(selector)[0];
                  this.each(function(i) {
                     if (this === elm) {
                        idx = i;
                        return false;
                     }
                  });
               }
            }
            return idx;
         } finally {
            Profiler.exit();
         }
      },

      next: function(selector) {
         Profiler.enter("jQLp.next");
         try {
            var arr = [];
            if (!selector) {
               this.each(function() {
                  var elm = this.nextSibling;
                  while (elm != null && elm.nodeType !== DOM_ELEMENT_NODE) {
                     elm = elm.nextSibling;
                  }
                  if (elm != null) {
                     arr.push(elm);
                  }
               });
            } else {
               var pElm = jQL(selector);
               this.each(function() {
                  var us = this.nextSibling;
                  while (us != null && us.nodeType !== DOM_ELEMENT_NODE) {
                     us = us.nextSibling;
                  }
                  if (us != null) {
                     var found = false;
                     pElm.each(function() {
                        if (this == us) {
                           found = true;
                           return false;
                        }
                     });
                     if (found) {
                        arr.push(us);
                     }
                  }
               });
            }
            return jQL(arr);
         } finally {
            Profiler.exit();
         }
      },

      prev: function(selector) {
         Profiler.enter("jQLp.prev");
         try {
            var arr = [];
            if (!selector) {
               this.each(function() {
                  var elm = this.previousSibling;
                  while (elm != null && elm.nodeType !== DOM_ELEMENT_NODE) {
                     elm = elm.previousSibling;
                  }
                  if (elm != null) {
                     arr.push(elm);
                  }
               });
            } else {
               var pElm = jQL(selector);
               this.each(function() {
                  var us = this.previousSibling;
                  while (us != null && us.nodeType !== DOM_ELEMENT_NODE) {
                     us = us.previousSibling;
                  }
                  if (us != null) {
                     var found = false;
                     pElm.each(function() {
                        if (this == us) {
                           found = true;
                           return false;
                        }
                     });
                     if (found) {
                        arr.push(us);
                     }
                  }
               });
            }
            return jQL(arr);
         } finally {
            Profiler.exit();
         }
      },

      parent: function(selector) {
         Profiler.enter("jQLp.parent");
         try {
            var arr = [];
            if (!selector) {
               this.each(function() {
                  arr.push(this.parentNode);
               });
            } else {
               var pElm = jQL(selector);
               this.each(function() {
                  var us = this.parentNode;
                  var found = false;
                  pElm.each(function() {
                     if (this == us) {
                        found = true;
                        return false;
                     }
                  });
                  if (found) {
                     arr.push(us);
                  }
               });
            }
            return jQL(arr);
         } finally {
            Profiler.exit();
         }
      },

      parents: function(selector) {
         Profiler.enter("jQLp.parents");
         try {
            var arr = [];
            if (!selector) {
               this.each(function() {
                  var us = this;
                  while (us != document.body) {
                     us = us.parentNode;
                     arr.push(us);
                  }
               });
            } else {
               var pElm = jQL(selector);
               this.each(function() {
                  var us = this;
                  while (us != document.body) {
                     pElm.each(function() {
                        if (this == us) {
                           arr.push(us);
                        }
                     });
                     us = us.parentNode;
                  }
               });
            }
            return jQL(arr);
         } finally {
            Profiler.exit();
         }
      },

      children: function(selector) {
         Profiler.enter("jQLp.children");
         try {
            var arr = [];
            if (!selector) {
               this.each(function() {
                  var us = this.firstChild;
                  while (us != null) {
                     if (us.nodeType == DOM_ELEMENT_NODE) {
                        arr.push(us);
                     }
                     us = us.nextSibling;
                  }
               });
            } else {
               var cElm = jQL(selector);
               this.each(function() {
                  var us = this.firstChild;
                  while (us != null) {
                     if (us.nodeType == DOM_ELEMENT_NODE) {
                        cElm.each(function() {
                           if (this === us) {
                              arr.push(us);
                           }
                        });
                     }
                     us = us.nextSibling;
                  }
               });
            }
            return jQL(arr);
         } finally {
            Profiler.exit();
         }
      },

      append: function(child) {
         Profiler.enter("jQLp.append");
         try {
            child = cleanUp(child);
            return this.each(function() {
               for (var i = 0; i < child.length; i++) {
                  this.appendChild(child[i]);
               }
            });
         } finally {
            Profiler.exit();
         }
      },

      remove: function(els) {
         Profiler.enter("jQLp.remove");
         try {
            return this.each(function() {
               if (els) {
                  $(els, this).remove();
               } else {
                  var par = this.parentNode;
                  par.removeChild(this);
               }
            });
         } finally {
            Profiler.exit();
         }
      },

      empty: function() {
         Profiler.enter("jQLp.empty");
         try {
            return this.each(function() {
               this.innerHTML = "";
            });
         } finally {
            Profiler.exit();
         }
      },

      val: function(value) {
         Profiler.enter("jQLp.val");
         try {
            if (value == null) {
               var v = null;
               if (this && this.length != 0 && typeof this[0].value != "undefined") {
                  v = this[0].value;
               }
               return v;
            } else {
               return this.each(function() {
                  if (typeof this.value != "undefined") {
                     this.value = value;
                  }
               });
            }
         } finally {
            Profiler.exit();
         }
      },

      // EVENTS

      bind: function(eType, fn) {
         Profiler.enter("jQLp.bind");
         try {
            return this.each(function() {
               setHandler(this, eType, fn);
            });
         } finally {
            Profiler.exit();
         }
      },

      trigger: function(eType, data) {
         Profiler.enter("jQLp.trigger");
         try {
            return this.each(function() {
               return fireEvent(this, eType, data);
            });
         } finally {
            Profiler.exit();
         }
      },

      submit: function(fn) {
         Profiler.enter("jQLp.submit");
         try {
            return this.each(function() {
               if (jQL.isFunction(fn)) {
                  setHandler(this, "onsubmit", fn);
               } else {
                  if (this.submit) {
                     this.submit();
                  }
               }
            });
         } finally {
            Profiler.exit();
         }
      }
   };

   // Cleanup functions for the document ready method
   if ( document.addEventListener ) {
      DOMContentLoaded = function() {
         document.removeEventListener( "DOMContentLoaded", DOMContentLoaded, false );
         jQL.ready();
      };

   } else if ( document.attachEvent ) {
      DOMContentLoaded = function() {
         // Make sure body exists, at least, in case IE gets a little overzealous (ticket #5443).
         if ( document.readyState === "complete" ) {
            document.detachEvent( "onreadystatechange", DOMContentLoaded );
            jQL.ready();
         }
      };
   }

   // Document Ready
   if (!setReady) {
      setReady = true;
      // Catch cases where $(document).ready() is called after the
      // browser event has already occurred.
      if ( document.readyState === "complete" ) {
         return jQL.ready();
      }

      // Mozilla, Opera and webkit nightlies currently support this event
      if ( document.addEventListener ) {
         // Use the handy event callback
         document.addEventListener( "DOMContentLoaded", DOMContentLoaded, false );

         // A fallback to window.onload, that will always work
         window.addEventListener( "load", jQL.ready, false );

      // If IE event model is used
      } else if ( document.attachEvent ) {
         // ensure firing before onload,
         // maybe late but safe also for iframes
         document.attachEvent("onreadystatechange", DOMContentLoaded);

         // A fallback to window.onload, that will always work
         window.attachEvent( "onload", jQL.ready );
      }
   }

   var makeObj = function(sel, val) {
      Profiler.enter("makeObj");
      try {
         var o = {};
         o[sel] = val;
         return o;
      } finally {
         Profiler.exit();
      }
   };

   var cleanUp = function(els) {
      Profiler.enter("cleanUp");
      try {
         if (els.nodeType && (els.nodeType === DOM_ELEMENT_NODE ||
                    els.nodeType === DOM_DOCUMENT_NODE)) {
            els = [els];
         } else if (typeof els === "string") {
            els = jQL(els).toArray();
         } else if (els.jquery && typeof els.jquery === "string") {
            els = els.toArray();
         }
         return els;
      } finally {
         Profiler.exit();
      }
   };

   var getParentElem = function(str) {
      Profiler.enter("getParentElem");
      try {
         var s = jQL.trim(str).toLowerCase();
         return s.indexOf("<option") == 0 ? "SELECT" :
                   s.indexOf("<li") == 0 ? "UL" :
                   s.indexOf("<tr") == 0 ? "TBODY" :
                   s.indexOf("<td") == 0 ? "TR" : "DIV";
      } finally {
         Profiler.exit();
      }
   };

   // -=- This happens last, as long as jQuery isn't already defined
   if (typeof window.jQuery == "undefined") {
      // Export
      window.jQuery = jQL;
      window.jQuery.fn = jQLp.prototype;
      window.$ = window.jQuery;
      window.now = now;
   }

   // Allow extending jQL or jQLp
   jQuery.extend = jQuery.fn.extend = function() {
      Profiler.enter(".extend");
      try {
         // copy reference to target object
         var target = arguments[0] || {}, i = 1, length = arguments.length, deep = false, options, name, src, copy;

         // Handle a deep copy situation
         if ( typeof target === "boolean" ) {
            deep = target;
            target = arguments[1] || {};
            // skip the boolean and the target
            i = 2;
         }

         // Handle case when target is a string or something (possible in deep copy)
         if ( typeof target !== "object" && !jQuery.isFunction(target) ) {
            target = {};
         }

         // extend jQL itself if only one argument is passed
         if ( length === i ) {
            target = this;
            --i;
         }

         for ( ; i < length; i++ ) {
            // Only deal with non-null/undefined values
            if ( (options = arguments[ i ]) != null ) {
               // Extend the base object
               for ( name in options ) {
                  src = target[ name ];
                  copy = options[ name ];

                  // Prevent never-ending loop
                  if ( target === copy ) {
                     continue;
                  }

                  // Recurse if we're merging object literal values or arrays
                  if ( deep && copy && ( jQuery.isPlainObject(copy) || jQuery.isArray(copy) ) ) {
                     var clone = src && ( jQuery.isPlainObject(src) || jQuery.isArray(src) ) ? src
                        : jQuery.isArray(copy) ? [] : {};

                     // Never move original objects, clone them
                     target[ name ] = jQuery.extend( deep, clone, copy );

                  // Don't bring in undefined values
                  } else if ( copy !== undefined ) {
                     target[ name ] = copy;
                  }
               }
            }
         }

         // Return the modified object
         return target;
      } finally {
         Profiler.exit();
      }
   };

   // Wire up events
   jQuery.each("click,dblclick,mouseover,mouseout,mousedown,mouseup,keydown,keypress,keyup,focus,blur,change,select,error,load,unload,scroll,resize,touchstart,touchend,touchmove".split(","),
         function(i, name) {
            jQuery.fn[name] = function(fn) {
               Profiler.enter("jQLp." + name);
               try {
                  return (fn ? this.bind(name, fn) : this.trigger(name));
               } finally {
                  Profiler.exit();
               }
            };
         });
})();