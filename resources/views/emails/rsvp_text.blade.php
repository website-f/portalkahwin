PENGESAHAN KEHADIRAN
{{ $inv->bride_name }} & {{ $inv->groom_name }}

Terima kasih, {{ $guest->name }}!
@if ($guest->status === 'attending')

Kehadiran anda telah direkodkan. Kami tak sabar untuk berjumpa anda.
@else

Terima kasih atas maklum balas anda. Anda akan tetap dalam doa kami.
@endif

Status   : {{ $guest->status === 'attending' ? 'Hadir' : 'Tidak Hadir' }}
Bilangan : {{ $guest->pax }} orang
@if ($inv->date_label)
Tarikh   : {{ $inv->date_label }}
@endif
@if ($inv->time_label)
Masa     : {{ $inv->time_label }}
@endif
@if ($inv->venue_name)
Lokasi   : {{ $inv->venue_name }}
@endif
@if ($seatInfo)

Tempat duduk anda: {{ $seatInfo }}
@elseif ($seatUrl)

Tempat duduk anda belum ditetapkan oleh tuan rumah.
@endif
@if ($seatUrl)

Lihat meja saya:
{{ $seatUrl }}
@endif

Lihat kad jemputan:
{{ $cardUrl }}

--
Made by PortalKahwin — {{ config('app.url') }}
