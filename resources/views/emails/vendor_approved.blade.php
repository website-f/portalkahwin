<x-mail.shell>
    <p style="margin:0 0 14px;">Salam <strong>{{ $user->name }}</strong>,</p>

    <p style="margin:0 0 16px;">Akaun <strong>{{ $roleLabel }}</strong> anda di {{ $appName }} telah diluluskan.</p>

    @if ($user->company_name)
        <x-mail.details>
            <x-mail.row label="Syarikat" :value="$user->company_name" />
        </x-mail.details>
    @endif

    <p style="margin:16px 0 0;">Anda kini boleh log masuk dan mula menggunakan semua ciri — cipta kad kahwin digital,
        urus senarai jemputan, kutip RSVP dan atur tempat duduk.</p>

    <x-mail.button :href="$loginUrl" label="Log masuk" />

    <p style="margin:22px 0 0;color:#6b6685;font-size:14px;">Terima kasih,<br>{{ $appName }}</p>
</x-mail.shell>
