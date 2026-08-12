{{--
    Deliberately plain. The outbound relay rejects styled HTML as "high
    probability of spam", so this carries no tables, no styled buttons, no
    background colours, no images and no emoji — just paragraphs and bare
    links, mirrored by the text/plain part.

    Seating is only ever mentioned when the host actually has the seating
    capability; $seatUrl is null otherwise, so a normal user's guests never read
    about tables that will not exist.
--}}
<!DOCTYPE html>
<html lang="ms">
<head><meta charset="utf-8"></head>
<body>
    <p>Salam {{ $guest->name }},</p>

    @if ($guest->status === 'attending')
        <p>
            Terima kasih kerana mengesahkan kehadiran anda ke majlis perkahwinan
            {{ $inv->bride_name }} dan {{ $inv->groom_name }}. Kehadiran anda amat kami hargai,
            dan kami menantikan untuk meraikan hari bahagia ini bersama anda.
        </p>
    @else
        <p>
            Terima kasih kerana memaklumkan kepada kami. Walaupun anda tidak dapat bersama
            pada hari tersebut, doa dan restu anda tetap bermakna buat
            {{ $inv->bride_name }} dan {{ $inv->groom_name }}.
        </p>
    @endif

    <p>Berikut adalah ringkasan maklum balas anda:</p>

    <p>
        Status: {{ $guest->status === 'attending' ? 'Hadir' : 'Tidak hadir' }}<br>
        Bilangan: {{ $guest->pax }} orang<br>
        @if ($inv->date_label)Tarikh: {{ $inv->date_label }}<br>@endif
        @if ($inv->time_label)Masa: {{ $inv->time_label }}<br>@endif
        @if ($inv->venue_name)Lokasi: {{ $inv->venue_name }}@endif
    </p>

    @if ($seatUrl)
        @if ($seatInfo)
            <p>Tempat duduk anda: {{ $seatInfo }}</p>
        @else
            <p>Tempat duduk anda belum ditetapkan oleh tuan rumah. Anda boleh menyemak pautan di bawah pada bila-bila masa.</p>
        @endif
        <p>Lihat meja anda:<br><a href="{{ $seatUrl }}">{{ $seatUrl }}</a></p>
    @endif

    <p>Lihat kad jemputan:<br><a href="{{ $cardUrl }}">{{ $cardUrl }}</a></p>

    <p>
        Terima kasih,<br>
        @if (!empty($brandName)){{ $brandName }}<br>@endif
        PortalKahwin
    </p>
</body>
</html>
