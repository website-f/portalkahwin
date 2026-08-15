{{--
    Deliberately plain (see emails/rsvp.blade.php): no tables, styled buttons,
    background colours, images or emoji — the outbound relay flags styled HTML as
    spam. The QR itself lives on the pass page behind $passUrl, not inline.
--}}
<!DOCTYPE html>
<html lang="ms">
<head><meta charset="utf-8"></head>
<body>
    <p>Salam {{ $guest->name }},</p>

    <p>
        Terima kasih. Bayaran anda telah diterima dan kehadiran anda ke majlis
        {{ $inv->bride_name }} dan {{ $inv->groom_name }} telah disahkan.
    </p>

    <p>Ringkasan tempahan anda:</p>

    <p>
        Bilangan: {{ $guest->pax }} orang<br>
        Jumlah dibayar: {{ $currency }} {{ number_format((float) $payment->amount, 2) }}<br>
        Rujukan: {{ $payment->reference }}<br>
        @if ($inv->date_label)Tarikh: {{ $inv->date_label }}<br>@endif
        @if ($inv->time_label)Masa: {{ $inv->time_label }}<br>@endif
        @if ($inv->venue_name)Lokasi: {{ $inv->venue_name }}@endif
    </p>

    @if ($passUrl)
        <p>
            Pas kehadiran anda (dengan kod QR untuk masuk ke majlis) boleh dibuka di sini:<br>
            <a href="{{ $passUrl }}">{{ $passUrl }}</a>
        </p>
        <p>Sila tunjukkan kod QR pada pintu masuk. Pautan ini akan luput selepas majlis.</p>
    @endif

    <p>Lihat kad jemputan:<br><a href="{{ $cardUrl }}">{{ $cardUrl }}</a></p>

    <p>
        Terima kasih,<br>
        @if (!empty($brandName)){{ $brandName }}<br>@endif
        PortalKahwin
    </p>
</body>
</html>
