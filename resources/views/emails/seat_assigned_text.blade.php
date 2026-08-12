TEMPAT DUDUK ANDA
{{ $inv->bride_name }} & {{ $inv->groom_name }}

Salam, {{ $guest->name }}!

Tuan rumah telah menetapkan tempat duduk anda.

Meja anda: {{ $seatInfo }}
@if ($inv->date_label)
Tarikh   : {{ $inv->date_label }}
@endif
@if ($inv->time_label)
Masa     : {{ $inv->time_label }}
@endif
@if ($inv->venue_name)
Lokasi   : {{ $inv->venue_name }}
@endif

Lihat meja saya:
{{ $seatUrl }}

Lihat kad jemputan:
{{ $cardUrl }}

--
Made by PortalKahwin — {{ config('app.url') }}
