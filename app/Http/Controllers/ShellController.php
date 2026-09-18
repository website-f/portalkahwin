<?php

namespace App\Http\Controllers;

use App\Support\AppSeo;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ShellController extends Controller
{
    /**
     * The SPA shell for every non-API path.
     *
     * Still one HTML document for every route — React Router does the routing —
     * but the <head> and the <noscript> fallback are now built per path, so a
     * crawler gets a real title, description, canonical and body text instead of
     * the same empty shell for the whole site.
     */
    public function __invoke(Request $request): View
    {
        return view('app', AppSeo::forPath($request->path(), $request->query())->resolve());
    }
}
