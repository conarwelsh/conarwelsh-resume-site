<?php

class RouteTest extends TestCase {

    public function testHome()
    {
        $response = $this->call('GET', '/');

        $this->assertResponseOk();
    }

}
