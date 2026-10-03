@props(['reservation'])

<table style="margin: 16px 0; border-collapse: collapse;">
    <tr>
        <th style="padding: 4px 16px 4px 0; text-align: left; font-weight: normal; color: #71717a;">日付</th>
        <td style="padding: 4px 0;">{{ $reservation->date->locale('ja')->isoFormat('YYYY年M月D日（ddd）') }}</td>
    </tr>
    <tr>
        <th style="padding: 4px 16px 4px 0; text-align: left; font-weight: normal; color: #71717a;">時間</th>
        <td style="padding: 4px 0;">{{ sprintf('%02d:00 〜 %02d:00', $reservation->start_hour, $reservation->end_hour) }}（{{ $reservation->end_hour - $reservation->start_hour }}時間）</td>
    </tr>
    <tr>
        <th style="padding: 4px 16px 4px 0; text-align: left; font-weight: normal; color: #71717a;">料金</th>
        <td style="padding: 4px 0;">¥{{ number_format($reservation->price) }}</td>
    </tr>
</table>
