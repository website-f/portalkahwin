{{-- Plain by design — see the note in rsvp.blade.php. --}}
<!DOCTYPE html>
<html lang="ms">
<head><meta charset="utf-8"></head>
<body>
    <p>Salam {{ $user->name }},</p>

    <p>Akaun {{ $roleLabel }} anda di {{ $appName }} telah diluluskan.</p>

    @if ($user->company_name)
        <p>Syarikat: {{ $user->company_name }}</p>
    @endif

    <p>Anda kini boleh log masuk dan mula menggunakan semua ciri — cipta kad kahwin digital, urus senarai jemputan, kutip RSVP dan atur tempat duduk.</p>

    <p>Log masuk:<br><a href="{{ $loginUrl }}">{{ $loginUrl }}</a></p>

    <p>Terima kasih,<br>{{ $appName }}</p>
</body>
</html>
