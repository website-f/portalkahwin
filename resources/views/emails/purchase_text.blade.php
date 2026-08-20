@if ($isPlan)
PEMBAYARAN BERJAYA — LANGGANAN AKTIF
@else
PEMBAYARAN BERJAYA — TERIMA KASIH
@endif

Salam {{ $user->name ?? '' }},
@if ($isPlan)

Pembayaran anda telah berjaya dan langganan anda kini aktif. Terima kasih!
@else

Pembayaran anda telah berjaya. Terima kasih atas pembelian anda!
@endif

Item: {{ $item }}
Jumlah: {{ $free ? 'Percuma' : $amount }}
Rujukan: {{ $reference }}
@if ($date)
Tarikh: {{ $date }}
@endif

Lihat pembelian & resit anda:
{{ $purchasesUrl }}

--
Dihantar melalui {{ $appName }}
