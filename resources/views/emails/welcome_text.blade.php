SELAMAT DATANG, {{ $user->name }}!

Terima kasih kerana mendaftar dengan {{ $appName }} — platform kad jemputan
digital anda.
@if ($pending)

Akaun anda sedang menunggu kelulusan pasukan kami. Kami akan menghantar e-mel
sebaik sahaja akaun anda diluluskan dan sedia untuk digunakan.
@else

Akaun anda kini aktif. Anda boleh mula mencipta kad kahwin digital, mengurus
senarai jemputan, mengumpul RSVP dan banyak lagi.

Mula sekarang:
{{ $panelUrl }}
@endif

--
Dihantar melalui {{ $appName }}
