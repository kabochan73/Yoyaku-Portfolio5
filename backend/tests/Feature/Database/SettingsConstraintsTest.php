<?php

declare(strict_types=1);

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

describe('prices', function () {
    it('同じ種類の料金は2行作れない', function () {
        DB::table('prices')->insert(['type' => 'weekday', 'amount_per_hour' => 4000]);

        expect(fn () => DB::table('prices')->insert(['type' => 'weekday', 'amount_per_hour' => 5000]))
            ->toThrow(QueryException::class, 'prices_type_unique');
    });

    it('知らない種類の料金は作れない', function () {
        expect(fn () => DB::table('prices')->insert(['type' => 'holiday', 'amount_per_hour' => 4000]))
            ->toThrow(QueryException::class, 'prices_type_check');
    });

    it('負の金額は作れない', function () {
        expect(fn () => DB::table('prices')->insert(['type' => 'weekday', 'amount_per_hour' => -1]))
            ->toThrow(QueryException::class, 'prices_amount_per_hour_check');
    });
});

describe('regular_holidays', function () {
    it('同じ曜日は2行作れない', function () {
        DB::table('regular_holidays')->insert(['day_of_week' => 1]);

        expect(fn () => DB::table('regular_holidays')->insert(['day_of_week' => 1]))
            ->toThrow(QueryException::class, 'regular_holidays_day_of_week_unique');
    });

    it('0〜6 以外の曜日は作れない', function () {
        expect(fn () => DB::table('regular_holidays')->insert(['day_of_week' => 7]))
            ->toThrow(QueryException::class, 'regular_holidays_day_of_week_check');
    });
});

describe('holidays', function () {
    it('同じ日は2行作れない', function () {
        DB::table('holidays')->insert(['date' => '2026-10-10']);

        expect(fn () => DB::table('holidays')->insert(['date' => '2026-10-10', 'reason' => '設備点検']))
            ->toThrow(QueryException::class, 'holidays_date_unique');
    });

    it('理由が無くても作れる', function () {
        DB::table('holidays')->insert(['date' => '2026-10-10']);

        expect(DB::table('holidays')->value('reason'))->toBeNull();
    });
});
