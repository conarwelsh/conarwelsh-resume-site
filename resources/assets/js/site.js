(function(){
	'use strict';

	var past, stuck, contact, cssClasses;

	contact = document.getElementById("contact");
	cssClasses = contact.className;

	document.onscroll = function(){
		past = document.body.scrollTop > document.body.offsetHeight;

		if(past && ! stuck){
			stuck = true;
			contact.className = cssClasses + " fixed";
		}
		else if( ! past && stuck){
			stuck = false;
			contact.className = cssClasses;
		}
	};
}());