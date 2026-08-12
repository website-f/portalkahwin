TAHNIAH, {{ $user->name }}!

Akaun {{ $roleLabel }} anda telah diluluskan.

Terima kasih kerana mendaftar dengan {{ $appName }}. Anda kini boleh log
masuk dan mula menggunakan semua ciri — cipta kad kahwin digital, urus
senarai jemputan, kutip RSVP, atur tempat duduk dan banyak lagi.
@if ($user->company_name)

Syarikat: {{ $user->company_name }}
@endif

Log masuk sekarang:
{{ $loginUrl }}

--
Dihantar melalui {{ $appName }}
