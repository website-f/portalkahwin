<!DOCTYPE html>
<html lang="ms">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:#f6efe6;font-family:Arial,Helvetica,sans-serif;color:#4a3b33;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
        <div style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e7ddcf;">
            <div style="background:#5b2a45;color:#fff;padding:26px 24px;text-align:center;">
                <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#c9a24b;">Tempat Duduk Anda</div>
                <div style="font-family:Georgia,serif;font-size:26px;margin-top:6px;">{{ $inv->bride_name }} &amp; {{ $inv->groom_name }}</div>
            </div>
            <div style="padding:24px;">
                <p style="font-size:15px;">Salam, <strong>{{ $guest->name }}</strong>!</p>
                <p style="font-size:14px;color:#8a7f76;">Tuan rumah telah menetapkan tempat duduk anda. Berikut adalah meja anda pada hari majlis.</p>

                <div style="background:#f6efe6;border:1px solid #e7ddcf;border-radius:12px;padding:16px;margin-top:16px;text-align:center;">
                    <div style="font-size:12px;color:#8a7f76;text-transform:uppercase;letter-spacing:1px;">Meja Anda</div>
                    <div style="font-family:Georgia,serif;font-size:22px;color:#5b2a45;margin-top:4px;">{{ $seatInfo }}</div>
                    <div style="margin-top:14px;">
                        <a href="{{ $seatUrl }}" style="display:inline-block;background:linear-gradient(135deg,#c9a24b,#b98a2f);color:#241a06;text-decoration:none;padding:11px 20px;border-radius:999px;font-size:14px;font-weight:bold;">Lihat Meja Saya</a>
                    </div>
                </div>

                <table style="width:100%;font-size:14px;border-collapse:collapse;margin-top:16px;">
                    @if ($inv->date_label)<tr><td style="padding:8px 0;color:#8a7f76;">Tarikh</td><td style="padding:8px 0;text-align:right;">{{ $inv->date_label }}</td></tr>@endif
                    @if ($inv->time_label)<tr><td style="padding:8px 0;color:#8a7f76;">Masa</td><td style="padding:8px 0;text-align:right;">{{ $inv->time_label }}</td></tr>@endif
                    @if ($inv->venue_name)<tr><td style="padding:8px 0;color:#8a7f76;">Lokasi</td><td style="padding:8px 0;text-align:right;">{{ $inv->venue_name }}</td></tr>@endif
                </table>

                <div style="text-align:center;margin-top:22px;">
                    <a href="{{ $cardUrl }}" style="display:inline-block;background:#5b2a45;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;">Lihat Kad Jemputan</a>
                </div>
            </div>
        </div>
        <p style="text-align:center;color:#8a7f76;font-size:12px;margin-top:16px;">Dihantar melalui PortalKahwin</p>
    </div>
</body>
</html>
