/*
 * Simple JavaScript profiler
 * (c) Copyright 2010 Brett Fattori
 * Licensed under MIT License
 *
 * @author Brett Fattori (bfattori@gmail.com)
 * @author $Author: bfattori $
 * @version $Revision: 104 $
 * @modified $Date: 2010-05-06 18:08:44 -0400 (Thu, 06 May 2010) $
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
    * @param el {DOMElement} A DOM element to write the output to, instead of the console
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
         el.innerHTML = msg;
      } else {
         console.warn("PROFILER RESULTS @ " + d + "\n---------------------------------------------------\n");
         console.info(out);
      }

      Profiler.resetProfiles();
   };
}
