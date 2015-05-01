<?php

$app->get('/', function() use ($app) {
    return view('index');
});

$app->post('/contact', function() use ($app) {
	$request = $app->make('request');
	
	$data = $request->input();

	$data['referrer'] = $request->server('HTTP_REFERER', '');
	$data['agent'] = $request->server('HTTP_USER_AGENT', '');

	$app->make('mailer')->send(
		[
			'emails.contact',
			'emails.contact_text',
		],
		$data,
		function($message) use($data)
		{
			$message
				->from('noreply@conarwelsh.com', 'ConarWelsh.com')
				->to('conar@sellwelldesigns.com', 'Conar Welsh')
				->subject('Message from ConarWelsh.com');
		}
	);

	return redirect('/');
});