<x-mail.layout>
    <p>{{ $reservation->booker_name }} 様</p>

    @if ($reason === \App\Domain\Reservations\CancellationReason::ByAdmin)
        <p>以下のご予約は、施設にてキャンセルいたしました。ご不明な点はお電話でお問い合わせください。</p>
    @else
        <p>以下のご予約のキャンセルを承りました。</p>
    @endif

    <x-mail.reservation-summary :reservation="$reservation" />

    <p>またのご利用をお待ちしております。</p>
</x-mail.layout>
