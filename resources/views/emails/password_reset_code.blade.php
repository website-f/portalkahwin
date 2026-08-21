<x-mail.shell>
    <p style="margin:0 0 14px;">Hi <strong>{{ $user->name }}</strong>,</p>

    <p style="margin:0 0 16px;">Anda telah meminta untuk menetapkan semula kata laluan akaun PortalKahwin anda.
        Gunakan kod pengesahan di bawah:</p>

    {{-- The code, boxed with a border (no fill) and wide letter-spacing so it's easy to read/copy. --}}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 16px;">
        <tr>
            <td style="border:1px solid #e7e4f3;border-radius:10px;padding:14px 26px;font-family:'Courier New',Courier,monospace;font-size:30px;font-weight:700;letter-spacing:0.28em;color:#4a3bc4;">{{ $code }}</td>
        </tr>
    </table>

    <p style="margin:0 0 16px;color:#6b6685;font-size:14px;">Kod ini sah selama <strong>{{ $ttl }} minit</strong> sahaja.</p>

    <p style="margin:0;color:#8a86a0;font-size:13px;line-height:1.55;">Jika anda tidak meminta perkara ini, abaikan e-mel ini dan kata laluan anda kekal tidak berubah. Jangan kongsi kod ini dengan sesiapa.</p>

    <p style="margin:22px 0 0;color:#6b6685;font-size:14px;">Terima kasih,<br>PortalKahwin</p>
</x-mail.shell>
