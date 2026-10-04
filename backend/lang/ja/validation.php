<?php

declare(strict_types=1);

return [

    'after_or_equal' => ':attributeは:date以降を選んでください。',
    'array' => ':attributeの形式が正しくありません。',
    'before_or_equal' => ':attributeは:date以前を選んでください。',
    'between' => [
        'numeric' => ':attributeは:min〜:maxの範囲で入力してください。',
    ],
    'boolean' => ':attributeの形式が正しくありません。',
    'confirmed' => ':attributeが確認用と一致しません。',
    'current_password' => ':attributeが正しくありません。',
    'date' => ':attributeは日付で入力してください。',
    'date_format' => ':attributeの形式が正しくありません。',
    'distinct' => ':attributeに同じ値が含まれています。',
    'email' => ':attributeの形式で入力してください。',
    'in' => '選択された:attributeは正しくありません。',
    'integer' => ':attributeは整数で入力してください。',
    'max' => [
        'array' => ':attributeは:max個以内で選んでください。',
        'numeric' => ':attributeは:max以下で入力してください。',
        'string' => ':attributeは:max文字以内で入力してください。',
    ],
    'min' => [
        'array' => ':attributeは:min個以上選んでください。',
        'numeric' => ':attributeは:min以上で入力してください。',
        'string' => ':attributeは:min文字以上で入力してください。',
    ],
    'required' => ':attributeを入力してください。',
    'required_with' => ':attributeを入力してください。',
    'string' => ':attributeは文字列で入力してください。',
    'unique' => 'この:attributeはすでに使われています。',

    // 「today」のような値を :date にそのまま入れると読めないので、項目ごとに文を決める
    'custom' => [
        'date' => [
            'after_or_equal' => '日付は今日以降を選んでください。',
        ],
        'to' => [
            'max_range' => '期間は:days日以内で指定してください。',
        ],
    ],

    'attributes' => [
        'name' => '名前',
        'email' => 'メールアドレス',
        'password' => 'パスワード',
        'current_password' => '現在のパスワード',
        'date' => '日付',
        'start_hour' => '開始時刻',
        'end_hour' => '終了時刻',
        'booker_name' => '予約者名',
        'weekday' => '平日の料金',
        'weekend' => '土日の料金',
        'days' => '定休日',
        'days.*' => '曜日',
        'reason' => '理由',
        'cancel_reservations' => '予約のキャンセルの確認',
        'search' => '検索語',
        'from' => '開始日',
        'to' => '終了日',
    ],

];
