<x-mail.shell :brandName="$brandName ?? null">
    <p style="margin:0 0 14px;">Hi <strong>{{ $guest->name }}</strong>,</p>

    @if ($guest->status === 'attending')
        <p style="margin:0 0 16px;">Terima kasih kerana mengesahkan kehadiran anda ke majlis perkahwinan
            <strong>{{ $inv->bride_name }} &amp; {{ $inv->groom_name }}</strong>. Kehadiran anda amat kami hargai,
            dan kami menantikan untuk meraikan hari bahagia ini bersama anda.</p>
    @else
        <p style="margin:0 0 16px;">Terima kasih kerana memaklumkan kepada kami. Walaupun anda tidak dapat bersama
            pada hari tersebut, doa dan restu anda tetap bermakna buat
            <strong>{{ $inv->bride_name }} &amp; {{ $inv->groom_name }}</strong>.</p>
    @endif

    <p style="margin:0 0 4px;color:#6b6685;font-size:13px;">Ringkasan maklum balas anda:</p>
    <x-mail.details>
        <x-mail.row label="Status" :value="$guest->status === 'attending' ? 'Hadir' : 'Tidak hadir'" />
        <x-mail.row label="Bilangan" :value="$guest->pax . ' orang'" />
        @if ($inv->date_label)<x-mail.row label="Tarikh" :value="$inv->date_label" />@endif
        @if ($inv->time_label)<x-mail.row label="Masa" :value="$inv->time_label" />@endif
        @if ($inv->venue_name)<x-mail.row label="Lokasi" :value="$inv->venue_name" />@endif
    </x-mail.details>

    @if ($seatUrl)
        @if ($seatInfo)
            <p style="margin:16px 0 0;font-size:14px;">Tempat duduk anda: <strong>{{ $seatInfo }}</strong></p>
        @else
            <p style="margin:16px 0 0;font-size:14px;color:#6b6685;">Tempat duduk anda belum ditetapkan oleh tuan rumah. Anda boleh menyemaknya melalui pautan di bawah pada bila-bila masa.</p>
        @endif
        <x-mail.button :href="$seatUrl" label="Lihat meja anda" />
    @endif

    <p style="margin:16px 0 0;font-size:14px;color:#2b2740;">Lihat kad jemputan:<br>
        <a href="{{ $cardUrl }}" style="color:#4a3bc4;word-break:break-all;">{{ $cardUrl }}</a></p>

    <p style="margin:22px 0 0;color:#6b6685;font-size:14px;">Terima kasih,<br>
        @if (!empty($brandName)){{ $brandName }}@else PortalKahwin @endif</p>
</x-mail.shell>
