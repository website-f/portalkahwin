<x-mail.shell>
    <p style="margin:0 0 14px;">Salam <strong>{{ $user->name }}</strong>,</p>

    <p style="margin:0 0 16px;">Terima kasih kerana mendaftar dengan {{ $appName }} — platform kad jemputan digital anda.</p>

    @if ($pending)
        <p style="margin:0 0 16px;">Akaun anda sedang menunggu kelulusan pasukan kami. Kami akan menghantar e-mel sebaik sahaja
            akaun anda diluluskan dan sedia untuk digunakan.</p>
    @else
        <p style="margin:0 0 16px;">Akaun anda kini aktif. Anda boleh mula mencipta kad kahwin digital yang cantik,
            mengurus senarai jemputan, mengumpul RSVP dan banyak lagi — semuanya dari satu tempat.</p>

        <x-mail.button :href="$panelUrl" label="Mula sekarang" />
    @endif

    <p style="margin:22px 0 0;color:#6b6685;font-size:14px;">Selamat datang sekali lagi,<br>{{ $appName }}</p>
</x-mail.shell>
