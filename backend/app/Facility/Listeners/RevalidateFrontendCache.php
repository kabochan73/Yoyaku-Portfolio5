<?php

declare(strict_types=1);

namespace App\Facility\Listeners;

use App\Facility\Events\FacilityChanged;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Support\Facades\Http;

final class RevalidateFrontendCache implements ShouldQueueAfterCommit
{
    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [10, 30];

    public function handle(FacilityChanged $event): void
    {
        $url = config('services.frontend.internal_url');
        $secret = config('services.frontend.revalidate_secret');

        if (! is_string($url) || $url === '' || ! is_string($secret) || $secret === '') {
            return;
        }

        Http::withToken($secret)
            ->timeout(5)
            ->post(rtrim($url, '/').'/internal/revalidate')
            ->throw();
    }
}
