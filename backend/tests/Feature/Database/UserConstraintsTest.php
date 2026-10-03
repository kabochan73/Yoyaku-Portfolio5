<?php

declare(strict_types=1);

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

it('知らないロールのユーザーは作れない', function () {
    expect(fn () => DB::table('users')->insert([
        'name' => '山田太郎',
        'email' => 'taro@example.com',
        'password' => 'password',
        'role' => 'owner',
    ]))->toThrow(QueryException::class, 'users_role_check');
});
