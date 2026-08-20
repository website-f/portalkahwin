<x-mail.shell>
    <p style="margin:0 0 14px;">Salam <strong>{{ $user->name ?? '' }}</strong>,</p>

    @if ($isPlan)
        <p style="margin:0 0 16px;">Pembayaran anda telah berjaya dan langganan anda kini <strong>aktif</strong>.
            Terima kasih!</p>
    @else
        <p style="margin:0 0 16px;">Pembayaran anda telah berjaya. Terima kasih atas pembelian anda!</p>
    @endif

    <x-mail.details>
        <x-mail.row label="Item" :value="$item" />
        <x-mail.row label="Jumlah" :value="$free ? 'Percuma' : $amount" />
        <x-mail.row label="Rujukan" :value="$reference" />
        @if ($date)
            <x-mail.row label="Tarikh" :value="$date" />
        @endif
    </x-mail.details>

    <p style="margin:16px 0 0;">Anda boleh melihat semua pembelian dan memuat turun resit anda di halaman Pembelian.</p>

    <x-mail.button :href="$purchasesUrl" label="Lihat pembelian saya" />

    <p style="margin:22px 0 0;color:#6b6685;font-size:14px;">Terima kasih,<br>{{ $appName }}</p>
</x-mail.shell>
