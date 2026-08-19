<x-mail.shell :brandName="$brandName ?? null">
    <p style="margin:0 0 14px;">Salam <strong>{{ $guest->name }}</strong>,</p>

    <p style="margin:0 0 16px;">Tuan rumah telah menetapkan tempat duduk anda untuk majlis perkahwinan
        <strong>{{ $inv->bride_name }} &amp; {{ $inv->groom_name }}</strong>.</p>

    <x-mail.details>
        <x-mail.row label="Meja anda" :value="$seatInfo" />
        @if ($inv->date_label)<x-mail.row label="Tarikh" :value="$inv->date_label" />@endif
        @if ($inv->time_label)<x-mail.row label="Masa" :value="$inv->time_label" />@endif
        @if ($inv->venue_name)<x-mail.row label="Lokasi" :value="$inv->venue_name" />@endif
    </x-mail.details>

    <x-mail.button :href="$seatUrl" label="Lihat meja anda" />

    <p style="margin:16px 0 0;font-size:14px;color:#2b2740;">Lihat kad jemputan:<br>
        <a href="{{ $cardUrl }}" style="color:#4a3bc4;word-break:break-all;">{{ $cardUrl }}</a></p>

    <p style="margin:22px 0 0;color:#6b6685;font-size:14px;">Terima kasih,<br>
        @if (!empty($brandName)){{ $brandName }}@else PortalKahwin @endif</p>
</x-mail.shell>
