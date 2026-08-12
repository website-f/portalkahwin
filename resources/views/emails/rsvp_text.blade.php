Salam {{ $guest->name }},
@if ($guest->status === 'attending')

Terima kasih kerana mengesahkan kehadiran anda ke majlis perkahwinan
{{ $inv->bride_name }} dan {{ $inv->groom_name }}. Kehadiran anda amat kami
hargai, dan kami menantikan untuk meraikan hari bahagia ini bersama anda.
@else

Terima kasih kerana memaklumkan kepada kami. Walaupun anda tidak dapat bersama
pada hari tersebut, doa dan restu anda tetap bermakna buat
{{ $inv->bride_name }} dan {{ $inv->groom_name }}.
@endif

Berikut adalah ringkasan maklum balas anda:

Status   : {{ $guest->status === 'attending' ? 'Hadir' : 'Tidak hadir' }}
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
@if ($seatUrl)
@if ($seatInfo)

Tempat duduk anda: {{ $seatInfo }}
@else

Tempat duduk anda belum ditetapkan oleh tuan rumah.
@endif

Lihat meja anda:
{{ $seatUrl }}
@endif

Lihat kad jemputan:
{{ $cardUrl }}

--
Terima kasih,
@if (!empty($brandName)){{ $brandName }}
@endif
PortalKahwin
