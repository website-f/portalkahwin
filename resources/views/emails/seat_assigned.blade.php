{{-- Plain by design — see the note in rsvp.blade.php. --}}
<!DOCTYPE html>
<html lang="ms">
<head><meta charset="utf-8"></head>
<body>
    <p>Salam {{ $guest->name }},</p>

    <p>Tuan rumah telah menetapkan tempat duduk anda untuk majlis perkahwinan {{ $inv->bride_name }} dan {{ $inv->groom_name }}.</p>

    <p>Meja anda: {{ $seatInfo }}</p>

    <p>
        @if ($inv->date_label)Tarikh: {{ $inv->date_label }}<br>@endif
        @if ($inv->time_label)Masa: {{ $inv->time_label }}<br>@endif
        @if ($inv->venue_name)Lokasi: {{ $inv->venue_name }}@endif
    </p>

    <p>Lihat meja anda:<br><a href="{{ $seatUrl }}">{{ $seatUrl }}</a></p>

    <p>Lihat kad jemputan:<br><a href="{{ $cardUrl }}">{{ $cardUrl }}</a></p>

    <p>
        Terima kasih,<br>
        @if (!empty($brandName)){{ $brandName }}<br>@endif
        PortalKahwin
    </p>
</body>
</html>
