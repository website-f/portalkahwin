{{-- Plain by design — see the note in rsvp.blade.php. --}}
<!DOCTYPE html>
<html lang="ms">
<head><meta charset="utf-8"></head>
<body>
    <p>Salam {{ $user->name }},</p>

    <p>Anda telah meminta untuk menetapkan semula kata laluan akaun PortalKahwin anda.</p>

    <p>Kod pengesahan anda: <strong>{{ $code }}</strong></p>

    <p>Kod ini sah selama {{ $ttl }} minit sahaja.</p>

    <p>Jika anda tidak meminta perkara ini, abaikan e-mel ini dan kata laluan anda kekal tidak berubah. Jangan kongsi kod ini dengan sesiapa.</p>

    <p>Terima kasih,<br>PortalKahwin</p>
</body>
</html>
