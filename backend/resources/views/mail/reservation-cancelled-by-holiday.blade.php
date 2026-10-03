<x-mail.layout>
    <p>{{ $reservation->booker_name }} 様</p>

    <p>誠に申し訳ございません。臨時休業のため、以下のご予約をキャンセルさせていただきました。</p>

    @if ($note)
        <p>理由: {{ $note }}</p>
    @endif

    <x-mail.reservation-summary :reservation="$reservation" />

    <p>ご迷惑をおかけいたしますが、別の日時でのご予約をご検討いただけますと幸いです。</p>
</x-mail.layout>
