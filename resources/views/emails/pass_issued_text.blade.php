Hi {{ $guest->name }},

Terima kasih. Bayaran anda telah diterima dan kehadiran anda ke majlis {{ $inv->bride_name }} dan {{ $inv->groom_name }} telah disahkan.

Ringkasan tempahan anda:
- Bilangan: {{ $guest->pax }} orang
- Jumlah dibayar: {{ $currency }} {{ number_format((float) $payment->amount, 2) }}
- Rujukan: {{ $payment->reference }}
@if ($inv->date_label)- Tarikh: {{ $inv->date_label }}
@endif
@if ($inv->time_label)- Masa: {{ $inv->time_label }}
@endif
@if ($inv->venue_name)- Lokasi: {{ $inv->venue_name }}
@endif
@if ($passUrl)

Pas kehadiran anda (dengan kod QR untuk masuk ke majlis):
{{ $passUrl }}

Sila tunjukkan kod QR pada pintu masuk. Pautan ini akan luput selepas majlis.
@endif

Lihat kad jemputan:
{{ $cardUrl }}

Terima kasih,
@if (!empty($brandName)){{ $brandName }}
@endif
PortalKahwin
