@props(['href', 'label', 'hint' => 'Jika butang tidak berfungsi, salin dan tampal pautan ini:'])
{{-- A bordered (no-fill) button + the raw URL as a fallback, so the link is
     always reachable even if the client strips or ignores the button. --}}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 8px;">
    <tr>
        <td>
            <a href="{{ $href }}" target="_blank" rel="noopener" style="display:inline-block;padding:11px 24px;border:1.5px solid #4a3bc4;border-radius:8px;color:#4a3bc4;text-decoration:none;font-weight:600;font-size:14px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">{{ $label }} &rarr;</a>
        </td>
    </tr>
</table>
<div style="font-size:12px;color:#8a86a0;line-height:1.55;margin-bottom:6px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    {{ $hint }}<br>
    <a href="{{ $href }}" style="color:#4a3bc4;word-break:break-all;">{{ $href }}</a>
</div>
