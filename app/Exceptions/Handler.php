<?php namespace App\Exceptions;

use Exception;
use Laravel\Lumen\Exceptions\Handler as ExceptionHandler;
use Symfony\Component\HttpKernel\Exception\HttpException;

class Handler extends ExceptionHandler {

    /**
     * A list of the exception types that should not be reported.
     *
     * @var array
     */
    protected $dontReport = [
        'Symfony\Component\HttpKernel\Exception\HttpException'
    ];

    /**
     * Report or log an exception.
     *
     * This is a great spot to send exceptions to Sentry, Bugsnag, etc.
     *
     * @param  \Exception  $err
     * @return void
     */
    public function report(Exception $err)
    {
        return parent::report($err);
    }

    /**
     * Render an exception into an HTTP response.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Exception  $err
     * @return \Illuminate\Http\Response
     */
    public function render($request, Exception $err)
    {
        if($err instanceof HttpException){
            $status = $err->getStatusCode();
            
            if ($status === 404)
            {
                return view("errors.404");
            }
        }

        return parent::render($request, $err);
    }

}
