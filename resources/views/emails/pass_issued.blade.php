<x-mail.shell :brandName="$brandName ?? null">
    <p style="margin:0 0 14px;">Hi <strong>{{ $guest->name }}</strong>,</p>

    <p style="margin:0 0 16px;">Terima kasih. Bayaran anda telah diterima dan kehadiran anda ke majlis
        <strong>{{ $inv->bride_name }} &amp; {{ $inv->groom_name }}</strong> telah disahkan.</p>

    <p style="margin:0 0 4px;color:#6b6685;font-size:13px;">Ringkasan tempahan anda:</p>
    <x-mail.details>
        <x-mail.row label="Bilangan" :value="$guest->pax . ' orang'" />
        <x-mail.row label="Jumlah dibayar" :value="$currency . ' ' . number_format((float) $payment->amount, 2)" />
        <x-mail.row label="Rujukan" :value="$payment->reference" />
        @if ($inv->date_label)<x-mail.row label="Tarikh" :value="$inv->date_label" />@endif
        @if ($inv->time_label)<x-mail.row label="Masa" :value="$inv->time_label" />@endif
        @if ($inv->venue_name)<x-mail.row label="Lokasi" :value="$inv->venue_name" />@endif
    </x-mail.details>

    @if ($passUrl)
        <p style="margin:16px 0 0;font-size:14px;">Pas kehadiran anda (dengan kod QR untuk masuk ke majlis):</p>
        <x-mail.button :href="$passUrl" label="Buka pas kehadiran" />
        <p style="margin:6px 0 0;font-size:12.5px;color:#8a86a0;">Sila tunjukkan kod QR pada pintu masuk. Pautan ini akan luput selepas majlis.</p>
    @endif

    <p style="margin:16px 0 0;font-size:14px;color:#2b2740;">Lihat kad jemputan:<br>
        <a href="{{ $cardUrl }}" style="color:#4a3bc4;word-break:break-all;">{{ $cardUrl }}</a></p>

    <p style="margin:22px 0 0;color:#6b6685;font-size:14px;">Terima kasih,<br>
        @if (!empty($brandName)){{ $brandName }}@else PortalKahwin @endif</p>
</x-mail.shell>
