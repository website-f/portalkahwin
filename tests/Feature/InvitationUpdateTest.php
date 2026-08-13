<?php

namespace Tests\Feature;

use App\Models\Invitation;
use App\Models\Template;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The editor PUTs the whole invitation back on every change, so a single bad
 * rule anywhere in that payload silently drops the field the host actually
 * edited. These cover the fields most recently added, which is where that risk
 * lives.
 */
class InvitationUpdateTest extends TestCase
{
    use RefreshDatabase;

    private function card(): array
    {
        $user = User::factory()->create(['role' => 'user', 'is_active' => true]);

        Template::create([
            'key' => 'floral', 'name' => 'Floral', 'category' => 'floral',
            'tier' => 'free', 'price_myr' => 0, 'is_active' => true,
            'status' => 'approved', 'sort_order' => 1,
        ]);

        $inv = Invitation::create([
            'user_id' => $user->id,
            'template_key' => 'floral',
            'slug' => 'test-card',
            'status' => 'draft',
            'groom_name' => 'Adam',
            'bride_name' => 'Hawa',
            'bismillah' => true,
            'rsvp_enabled' => true,
        ]);

        Sanctum::actingAs($user);

        return [$user, $inv];
    }

    public function test_section_order_persists_when_the_whole_card_is_sent_back(): void
    {
        [, $inv] = $this->card();

        // Exactly what the editor sends: the entire invitation, reordered.
        $payload = array_merge($inv->fresh()->toArray(), [
            'section_order' => ['gift', 'program', 'location', 'rsvp', 'wishes', 'wishlist', 'contacts', 'gallery'],
        ]);

        $this->putJson("/api/invitations/{$inv->id}", $payload)->assertOk();

        $this->assertSame(
            ['gift', 'program', 'location', 'rsvp', 'wishes', 'wishlist', 'contacts', 'gallery'],
            $inv->fresh()->section_order,
            'section_order was dropped — check the update validation rules.'
        );
    }

    public function test_the_public_card_payload_carries_the_order_and_font(): void
    {
        [, $inv] = $this->card();

        $inv->update([
            'status' => 'published',
            'section_order' => ['gallery', 'gift', 'contacts', 'wishlist', 'wishes', 'rsvp', 'location', 'program'],
            'font_id' => 'great-vibes',
        ]);

        $res = $this->getJson("/api/cards/{$inv->slug}")->assertOk();

        $res->assertJsonPath('data.sectionOrder.0', 'gallery');
        $res->assertJsonPath('data.fontId', 'great-vibes');
    }

    public function test_the_design_cannot_be_swapped_after_creation(): void
    {
        [, $inv] = $this->card();

        Template::create([
            'key' => 'khat', 'name' => 'Khat', 'category' => 'khat',
            'tier' => 'premium', 'price_myr' => 69, 'is_active' => true,
            'status' => 'approved', 'sort_order' => 2,
        ]);

        $this->putJson("/api/invitations/{$inv->id}", ['template_key' => 'khat'])->assertOk();

        $this->assertSame('floral', $inv->fresh()->template_key);
    }
}
