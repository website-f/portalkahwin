<?php

namespace Tests\Feature;

use App\Models\Invitation;
use Tests\TestCase;

/**
 * MOVABLE_SECTIONS is the baseline every reorder is computed against. If it
 * drifts from the order the templates actually render, an untouched card gets
 * silently rearranged and a host's move lands somewhere other than where the
 * editor's list said it would — which is exactly what happened once already.
 *
 * The templates are the source of truth, so this reads the order back out of
 * them rather than restating it.
 */
class SectionOrderTest extends TestCase
{
    /** @return array<string, array<int, string>> template name => section order */
    private function templateSectionOrders(): array
    {
        $orders = [];

        foreach (glob(resource_path('js/templates/*/index.tsx')) as $file) {
            preg_match_all('/<PkSec name="(\w+)"/', (string) file_get_contents($file), $m);
            if ($m[1] !== []) {
                $orders[basename(dirname($file))] = $m[1];
            }
        }

        return $orders;
    }

    public function test_there_are_templates_to_check(): void
    {
        $this->assertNotEmpty($this->templateSectionOrders(), 'No <PkSec> anchors found in any template.');
    }

    public function test_movable_sections_matches_the_order_templates_render(): void
    {
        foreach ($this->templateSectionOrders() as $template => $order) {
            // A template may omit a section entirely; whatever it does render
            // must appear in the canonical relative order.
            $expected = array_values(array_intersect(Invitation::MOVABLE_SECTIONS, $order));

            $this->assertSame(
                $expected,
                $order,
                "Template [{$template}] renders its sections in a different order than "
                .'Invitation::MOVABLE_SECTIONS. Update the constant — and the matching '
                .'MOVABLE_SECTIONS in resources/js/templates/PkSec.tsx — to match.'
            );
        }
    }

    public function test_php_and_typescript_constants_agree(): void
    {
        $ts = (string) file_get_contents(resource_path('js/templates/PkSec.tsx'));

        $this->assertSame(1, preg_match('/export const MOVABLE_SECTIONS = \[(.*?)\]/s', $ts, $m));

        preg_match_all("/'(\w+)'/", $m[1], $keys);

        $this->assertSame(
            Invitation::MOVABLE_SECTIONS,
            $keys[1],
            'MOVABLE_SECTIONS in PkSec.tsx and Invitation.php have drifted apart.'
        );
    }
}
