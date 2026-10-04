<?php

declare(strict_types=1);

it('内部ネットワークから来た X-Forwarded-For は利用者の IP として使う', function () {
    $this->withServerVariables(['REMOTE_ADDR' => '172.18.0.5'])
        ->getJson('/api/debug/ip', ['X-Forwarded-For' => '203.0.113.9'])
        ->assertOk()
        ->assertJsonPath('ip', '203.0.113.9');
});

it('外から来た X-Forwarded-For は無視する', function () {
    $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.1'])
        ->getJson('/api/debug/ip', ['X-Forwarded-For' => '203.0.113.9'])
        ->assertOk()
        ->assertJsonPath('ip', '198.51.100.1');
});

it('確認用の口は、本番では設定が無ければ 404', function () {
    app()->detectEnvironment(fn () => 'production');

    $this->getJson('/api/debug/ip')->assertNotFound();

    config(['app.debug_ip_endpoint' => true]);
    $this->getJson('/api/debug/ip')->assertOk();
});
