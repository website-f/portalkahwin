<!DOCTYPE html>
<html lang="ms">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:#f6efe6;font-family:Arial,Helvetica,sans-serif;color:#4a3b33;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
        <div style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e7ddcf;">
            @if (!empty($brandLogo) || !empty($brandName))
                <div style="padding:14px 24px;text-align:center;border-bottom:1px solid #f0e8db;background:#fff;">
                    @if (!empty($brandLogo))<img src="{{ $brandLogo }}" alt="{{ $brandName }}" style="max-height:36px;max-width:150px;display:inline-block;">@endif
                    @if (!empty($brandName))<div style="font-size:12px;color:#8a7f76;margin-top:{{ !empty($brandLogo) ? '6px' : '0' }};">{{ $brandName }}</div>@endif
                </div>
            @endif
            <div style="background:#5b2a45;color:#fff;padding:26px 24px;text-align:center;">
                <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#c9a24b;">Pengesahan Kehadiran</div>
                <div style="font-family:Georgia,serif;font-size:26px;margin-top:6px;">{{ $inv->bride_name }} &amp; {{ $inv->groom_name }}</div>
            </div>
            <div style="padding:24px;">
                <p style="font-size:15px;">Terima kasih, <strong>{{ $guest->name }}</strong>!</p>
                <p style="font-size:14px;color:#8a7f76;">
                    @if ($guest->status === 'attending')
                        Kehadiran anda telah direkodkan. Kami tak sabar untuk berjumpa anda 🤍
                    @else
                        Terima kasih atas maklum balas anda. Anda akan tetap dalam doa kami.
                    @endif
                </p>

                <table style="width:100%;font-size:14px;border-collapse:collapse;margin-top:14px;">
                    <tr><td style="padding:8px 0;color:#8a7f76;">Status</td><td style="padding:8px 0;text-align:right;font-weight:bold;">{{ $guest->status === 'attending' ? 'Hadir' : 'Tidak Hadir' }}</td></tr>
                    <tr><td style="padding:8px 0;color:#8a7f76;">Bilangan</td><td style="padding:8px 0;text-align:right;">{{ $guest->pax }} orang</td></tr>
                    @if ($inv->date_label)<tr><td style="padding:8px 0;color:#8a7f76;">Tarikh</td><td style="padding:8px 0;text-align:right;">{{ $inv->date_label }}</td></tr>@endif
                    @if ($inv->time_label)<tr><td style="padding:8px 0;color:#8a7f76;">Masa</td><td style="padding:8px 0;text-align:right;">{{ $inv->time_label }}</td></tr>@endif
                    @if ($inv->venue_name)<tr><td style="padding:8px 0;color:#8a7f76;">Lokasi</td><td style="padding:8px 0;text-align:right;">{{ $inv->venue_name }}</td></tr>@endif
                </table>

                @if ($seatInfo || $seatUrl)
                    <div style="background:#f6efe6;border:1px solid #e7ddcf;border-radius:12px;padding:14px 16px;margin-top:16px;text-align:center;">
                        <div style="font-size:12px;color:#8a7f76;text-transform:uppercase;letter-spacing:1px;">Tempat Duduk Anda</div>
                        @if ($seatInfo)
                            <div style="font-family:Georgia,serif;font-size:20px;color:#5b2a45;margin-top:4px;">{{ $seatInfo }}</div>
                        @else
                            <div style="font-size:14px;color:#8a7f76;margin-top:6px;">Belum ditetapkan oleh tuan rumah. Anda boleh menyemak pautan di bawah pada bila-bila masa.</div>
                        @endif
                        @if ($seatUrl)
                            <div style="margin-top:12px;">
                                <a href="{{ $seatUrl }}" style="display:inline-block;background:linear-gradient(135deg,#c9a24b,#b98a2f);color:#241a06;text-decoration:none;padding:11px 20px;border-radius:999px;font-size:14px;font-weight:bold;">Lihat Meja Saya</a>
                            </div>
                        @endif
                    </div>
                @endif

                <div style="text-align:center;margin-top:22px;">
                    <a href="{{ $cardUrl }}" style="display:inline-block;background:#5b2a45;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;">Lihat Kad Jemputan</a>
                </div>
            </div>
        </div>
        <p style="text-align:center;color:#8a7f76;font-size:12px;margin-top:16px;">
            Made by <a href="{{ config('app.url') }}" style="color:#5b2a45;text-decoration:none;font-weight:bold;">PortalKahwin</a>
        </p>
    </div>
</body>
</html>
