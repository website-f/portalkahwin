<!DOCTYPE html>
<html lang="ms">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:#f5f4fb;font-family:Arial,Helvetica,sans-serif;color:#2b2740;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
        <div style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e6e3f5;">
            <div style="background:#4a3bc4;color:#fff;padding:28px 24px;text-align:center;">
                <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#e8a33d;">{{ $appName }}</div>
                <div style="font-family:Georgia,serif;font-size:26px;margin-top:8px;">Tahniah, {{ $user->name }}! 🎉</div>
            </div>
            <div style="padding:26px 24px;">
                <p style="font-size:16px;margin-top:0;">
                    Akaun <strong>{{ $roleLabel }}</strong> anda telah <strong>diluluskan</strong>.
                </p>
                <p style="font-size:14px;color:#6b6685;line-height:1.6;">
                    Terima kasih kerana mendaftar dengan {{ $appName }}. Anda kini boleh log masuk dan mula
                    menggunakan semua ciri — cipta kad kahwin digital, urus senarai jemputan, kutip RSVP,
                    atur tempat duduk dan banyak lagi.
                </p>

                @if ($user->company_name)
                    <div style="background:#f5f4fb;border:1px solid #e6e3f5;border-radius:12px;padding:12px 16px;margin:16px 0;font-size:14px;">
                        <span style="color:#6b6685;">Syarikat</span>
                        <div style="font-weight:bold;color:#4a3bc4;margin-top:2px;">{{ $user->company_name }}</div>
                    </div>
                @endif

                <div style="text-align:center;margin-top:24px;">
                    <a href="{{ $loginUrl }}" style="display:inline-block;background:#4a3bc4;color:#fff;text-decoration:none;padding:13px 26px;border-radius:999px;font-size:15px;font-weight:bold;">Log Masuk Sekarang</a>
                </div>

                <p style="font-size:13px;color:#8a86a0;margin-top:22px;line-height:1.6;">
                    Jika butang di atas tidak berfungsi, salin pautan ini ke pelayar anda:<br>
                    <a href="{{ $loginUrl }}" style="color:#4a3bc4;word-break:break-all;">{{ $loginUrl }}</a>
                </p>
            </div>
        </div>
        <p style="text-align:center;color:#8a86a0;font-size:12px;margin-top:16px;">
            Made by <a href="{{ $loginUrl }}" style="color:#4a3bc4;text-decoration:none;font-weight:bold;">{{ $appName }}</a>
        </p>
    </div>
</body>
</html>
