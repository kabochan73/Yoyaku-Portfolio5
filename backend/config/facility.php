<?php

declare(strict_types=1);

return [

    'name' => 'FUTSAL PARK',
    'phone' => env('FACILITY_PHONE', '092-123-4567'),
    'email' => env('FACILITY_EMAIL', 'info@futsalpark.example.com'),
    'address' => '〒000-0000 福岡県福岡市中央区1-2-3',

    'rules' => [
        'open_hour' => 10,
        'close_hour' => 22,
        'min_hours' => 2,
        'max_hours' => 4,
        'booking_window_months' => 1,
        'admin_lookback_months' => 3,
    ],

    'calendar_cache_ttl' => 60,

    // config:cache の後は config の外で env() を読めないので、シーダーはここ経由で読む
    'admin' => [
        'email' => env('ADMIN_EMAIL'),
        'password' => env('ADMIN_PASSWORD'),
    ],

];
