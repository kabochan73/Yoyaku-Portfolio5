<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

/**
 * @param  array<string, mixed>  $data
 * @param  array<string, mixed>  $rules
 */
function firstMessage(array $data, array $rules): string
{
    return Validator::make($data, $rules)->errors()->first();
}

it('アプリの言語は日本語', function () {
    expect(app()->getLocale())->toBe('ja');
});

it('入力チェックのメッセージを日本語で返す', function (array $data, array $rules, string $message) {
    expect(firstMessage($data, $rules))->toBe($message);
})->with([
    '必須' => [['name' => ''], ['name' => 'required'], '名前を入力してください。'],
    '文字数の上限' => [['name' => str_repeat('あ', 21)], ['name' => 'string|max:20'], '名前は20文字以内で入力してください。'],
    'パスワードの長さ' => [['password' => 'short'], ['password' => Password::min(8)], 'パスワードは8文字以上で入力してください。'],
    'メールアドレスの形式' => [['email' => 'taro'], ['email' => 'email'], 'メールアドレスの形式で入力してください。'],
    '確認用と一致しない' => [['password' => 'password1', 'password_confirmation' => 'password2'], ['password' => 'confirmed'], 'パスワードが確認用と一致しません。'],
    '0以上の整数' => [['weekday' => -1], ['weekday' => 'integer|min:0'], '平日の料金は0以上で入力してください。'],
    '範囲' => [['start_hour' => 25], ['start_hour' => 'integer|between:0,24'], '開始時刻は0〜24の範囲で入力してください。'],
    '日付の形式' => [['date' => '10/9'], ['date' => 'date_format:Y-m-d'], '日付の形式が正しくありません。'],
    '今日以降' => [['date' => '2000-01-01'], ['date' => 'after_or_equal:today'], '日付は今日以降を選んでください。'],
    '別の項目以降' => [['from' => '2026-10-11', 'to' => '2026-10-05'], ['to' => 'after_or_equal:from'], '終了日は開始日以降を選んでください。'],
    '重複' => [['days' => [3, 3]], ['days.*' => 'distinct'], '曜日に同じ値が含まれています。'],
]);

it('一意のチェック', function () {
    User::factory()->create(['email' => 'taro@example.com']);

    expect(firstMessage(['email' => 'taro@example.com'], ['email' => 'unique:users']))
        ->toBe('このメールアドレスはすでに使われています。');
});

it('ログイン失敗のメッセージ', function () {
    expect(__('auth.failed'))->toBe('メールアドレスまたはパスワードが正しくありません。');
});
