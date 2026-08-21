@props(['brandName' => null])
{{--
    Minimalist, deliverability-first email shell.

    Formatting is kept to what strict relays tolerate: layout tables (expected in
    email), thin BORDERS instead of background-colour fills, system fonts, no
    images and no emoji. Only layout lives in the tiny <style> (mobile padding);
    everything visual is also inlined so clients that strip <style> still render.
--}}
<!DOCTYPE html>
<html lang="ms">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="light">
    <style>
        body { margin: 0; padding: 0; background: #ffffff; }
        .pk-pad { padding: 26px 28px; }
        @media only screen and (max-width: 480px) {
            .pk-pad { padding: 20px 16px !important; }
        }
    </style>
</head>
<body style="margin:0;padding:0;background:#ffffff;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
        <tr>
            <td align="center" style="padding:22px 10px;">
                <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;border:1px solid #e7e4f3;border-radius:12px;">
                    <tr>
                        <td class="pk-pad" style="padding:26px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2b2740;font-size:15px;line-height:1.65;">
                            <div style="border-bottom:2px solid #4a3bc4;padding-bottom:12px;margin-bottom:20px;">
                                @if ($brandName)
                                    {{-- A vendor-branded email is FROM the vendor — no PortalKahwin mark. --}}
                                    <div style="font-weight:700;font-size:17px;color:#2b2740;">{{ $brandName }}</div>
                                @else
                                    <div style="font-weight:700;font-size:17px;color:#4a3bc4;letter-spacing:0.02em;">PortalKahwin</div>
                                @endif
                            </div>

                            {{ $slot }}
                        </td>
                    </tr>
                </table>
                <div style="max-width:560px;margin:12px auto 0;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;color:#a7a3ba;">
                    &copy; {{ $brandName ?: 'PortalKahwin' }}
                </div>
            </td>
        </tr>
    </table>
</body>
</html>
