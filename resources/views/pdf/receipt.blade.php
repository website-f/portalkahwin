{{-- Rendered by dompdf, which supports only a conservative slice of CSS:
     plain tables, no flexbox/grid, no webfonts, no CSS variables. --}}
<!DOCTYPE html>
<html lang="ms">
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 26mm 18mm; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #2b2740; }
        h1 { font-size: 20px; margin: 0 0 2px; color: #4a3bc4; }
        .muted { color: #6b6685; }
        .head { border-bottom: 2px solid #4a3bc4; padding-bottom: 10px; margin-bottom: 18px; }
        .meta td { padding: 3px 0; }
        .meta .k { color: #6b6685; width: 110px; }
        table.items { width: 100%; border-collapse: collapse; margin-top: 18px; }
        table.items th { text-align: left; border-bottom: 1px solid #d9d6ea; padding: 7px 0; font-size: 10px;
            text-transform: uppercase; letter-spacing: 1px; color: #6b6685; }
        table.items td { padding: 8px 0; border-bottom: 1px solid #efedf7; }
        .right { text-align: right; }
        .total td { font-size: 14px; font-weight: bold; padding-top: 12px; border: 0; }
        .badge { display: inline-block; padding: 3px 9px; border-radius: 9px; font-size: 10px; font-weight: bold; }
        .paid { background: #e4f3ec; color: #1f7a52; }
        .released { background: #e4f3ec; color: #1f7a52; }
        .pending { background: #fbf1d8; color: #8a6a1e; }
        .failed { background: #fbe6e3; color: #a8443d; }
        .foot { margin-top: 34px; padding-top: 10px; border-top: 1px solid #efedf7; font-size: 10px; color: #8a86a0; }
    </style>
</head>
<body>
    <div class="head">
        @if (!empty($logo))
            <img src="{{ $logo }}" alt="" style="height:32px; margin-bottom:8px;">
        @endif
        @if (!empty($agent_code))
            <div style="font-size:10px; color:#8a7fb0; letter-spacing:0.06em; text-transform:uppercase; font-weight:bold;">Affiliate Agent: {{ $agent_code }}</div>
        @endif
        @if (!empty($company))
            <div style="font-weight:bold; font-size:12px; color:#2b2740;">{{ $company }}</div>
        @endif
        @if (!empty($description))
            <div class="muted" style="margin-top:2px;">{{ $description }}</div>
        @endif
        @if (!empty($address))
            <div class="muted" style="margin-top:2px; white-space:pre-line;">{{ $address }}</div>
        @endif
        @php $contact = array_filter([$phone ?? '', $email ?? '']); @endphp
        @if (!empty($contact))
            <div class="muted" style="margin-top:2px;">{{ implode('  ·  ', $contact) }}</div>
        @endif
        @if (!empty($tax))
            <div class="muted" style="margin-top:2px;">Tax / SST: {{ $tax }}</div>
        @endif
        <div class="muted" style="margin-top:9px; letter-spacing:1px; font-size:10px;">RESIT / RECEIPT</div>
    </div>

    <table class="meta">
        <tr><td class="k">No. Rujukan</td><td><strong>{{ $receipt['reference'] }}</strong></td></tr>
        <tr><td class="k">Tarikh</td><td>{{ $receipt['date'] }}</td></tr>
        <tr><td class="k">Status</td><td>
            <span class="badge {{ $receipt['status'] }}">{{ strtoupper($receipt['status']) }}</span>
        </td></tr>
        <tr><td class="k">Dibilkan kepada</td><td>{{ $receipt['customer'] }}<br><span class="muted">{{ $receipt['email'] }}</span></td></tr>
    </table>

    <table class="items">
        <thead>
            <tr><th>Keterangan</th><th class="right">Jumlah (RM)</th></tr>
        </thead>
        <tbody>
            @foreach ($receipt['items'] as $line)
                <tr>
                    <td>{{ $line['name'] }}</td>
                    <td class="right">{{ number_format((float) $line['amount'], 2) }}</td>
                </tr>
            @endforeach
            <tr class="total">
                <td class="right">Jumlah Keseluruhan</td>
                <td class="right">RM {{ number_format((float) $receipt['amount'], 2) }}</td>
            </tr>
        </tbody>
    </table>

    <div class="foot">
        Resit ini dijana secara automatik dan sah tanpa tandatangan.
        @if (empty($disclaimer))
            <br>
            @php $line = array_filter([$phone ?? '', $website ?? '', $email ?? '']); @endphp
            @foreach ($line as $i => $part)
                @if ($i > 0) &nbsp;&nbsp;&middot;&nbsp;&nbsp; @endif
                <span style="white-space:nowrap;">{{ $part }}</span>
            @endforeach
        @endif
    </div>

    @if (!empty($disclaimer))
        <div class="foot" style="margin-top:10px; border-top:0; color:#8a86a0;">
            {{ $disclaimer }}
        </div>
    @endif
</body>
</html>
