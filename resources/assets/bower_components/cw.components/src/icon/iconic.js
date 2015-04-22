(function(){
	'use strict';

	var app;

	app.directive('iconic', function(){
		return {
			restrict: 'AEC',
			replace: true,
			template: '<img src="{{ src }}">',
			link: function($scope, $el, attrs){

			}
		};
	});
}());