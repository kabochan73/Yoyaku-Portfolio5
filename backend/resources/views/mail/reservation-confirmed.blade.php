<x-mail.layout>
    <p>{{ $reservation->booker_name }} 様</p>

    <p>ご予約ありがとうございます。以下の内容で承りました。</p>

    <x-mail.reservation-summary :reservation="$reservation" />

    <p>料金は当日、現地でお支払いください。</p>
    <p>キャンセルはご利用開始時刻までにマイページから行えます。キャンセル料はかかりません。</p>
</x-mail.layout>
