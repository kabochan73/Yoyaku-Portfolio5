<?php

declare(strict_types=1);

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->beforeEach(function () {
        Cache::flush();
        // Http::fake() していない本物の通信は、テストを失敗させる
        Http::preventStrayRequests();
    })
    ->in('Feature');

pest()->extend(TestCase::class)
    ->in('Unit');
