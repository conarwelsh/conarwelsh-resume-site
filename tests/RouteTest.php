<?php

class RouteTest extends TestCase {

    public function testHome()
    {
        $this->call('GET', '/');

        $this->assertResponseOk();
    }

    public function testContact()
    {
    	$this->app->make('mailer')->pretend();

        $this->call('POST', '/contact', [
        	'name' => 'Conar Test',
        	'email' => 'conarw@gmail.com',
        	'msg' => 'this is a test'
    	]);

        $this->assertRedirectedTo('/');
    }

}
