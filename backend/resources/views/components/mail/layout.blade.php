<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('facility.name') }}</title>
</head>
<body style="margin: 0; padding: 24px; background: #fafafa; color: #18181b; font-family: sans-serif; line-height: 1.7;">
    <div style="max-width: 560px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 8px;">
        {{ $slot }}
    </div>
    <div style="max-width: 560px; margin: 16px auto 0; color: #71717a; font-size: 12px;">
        <p style="margin: 0;">{{ config('facility.name') }}</p>
        <p style="margin: 0;">TEL {{ config('facility.phone') }} / {{ config('facility.email') }}</p>
        <p style="margin: 0;">{{ config('facility.address') }}</p>
    </div>
</body>
</html>
