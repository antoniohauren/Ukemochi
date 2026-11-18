<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Nordestino Ksa do Sushi menu. Run once: `php artisan db:seed --class=MenuSeeder`.
 * Each variant gets a print_name of at most 30 chars so ticket lines never wrap.
 */
final class MenuSeeder extends Seeder
{
    public const MAX_LABEL = 30;

    public function run(): void
    {
        if (DB::table('categories')->exists()) {
            $this->command?->warn('Menu already has categories, skipping.');

            return;
        }

        DB::transaction(function (): void {
            $now = now();
            foreach (self::menu() as $catSort => [$category, $items]) {
                $categoryId = DB::table('categories')->insertGetId(
                    ['name' => $category, 'sort' => $catSort, 'created_at' => $now, 'updated_at' => $now],
                );
                foreach ($items as $itemSort => [$name, $note, $variants]) {
                    $itemId = DB::table('items')->insertGetId([
                        'category_id' => $categoryId, 'name' => $name, 'note' => $note,
                        'sort' => $itemSort, 'created_at' => $now, 'updated_at' => $now,
                    ]);
                    foreach ($variants as $variantSort => [$variant, $cents, $label]) {
                        DB::table('variants')->insert([
                            'item_id' => $itemId, 'name' => $variant, 'price_cents' => $cents,
                            'print_name' => $label, 'sort' => $variantSort,
                            'created_at' => $now, 'updated_at' => $now,
                        ]);
                    }
                }
            }
        });
    }

    /** @return list<array{string, list<array{string, ?string, list<array{string, int, string}>}>}> */
    public static function menu(): array
    {
        return [
            ['Uramaki', self::sized('Ura', ['Meio (4un)', 'Todo (8un)'], [
                ['Salmão', 13, 26],
                ['Salmão cheese', 14, 27],
                ['Salmão grelhado', 13, 26],
                ['Camarão cheese', 13, 25],
                ['Atum grelhado', 12, 23],
                ['Skin cheese', 12, 23],
                ['Kani cheese', 13, 25],
            ])],
            ['Futomaki', self::sized('Futo', ['Meio (5un)', 'Todo (10un)'], [
                ['Salmão', 14, 27],
                ['Salmão cheese', 14, 28],
                ['Salmão grelhado', 14, 27],
                ['Camarão cheese', 13, 26],
                ['Atum manga e pepino', 13, 25, 'Atum Manga Pepino'],
                ['Skin cheese', 12, 24],
                ['Kani salmão cheese', 14, 27, 'Kani Salm Cheese'],
                ['Califórnia', 13, 25],
            ])],
            ['Hots', self::sized('Hot', ['Meio (5un)', 'Todo (10un)'], [
                ['Hot filadélfia', 16, 32, 'Filadélfia'],
                ['Dinamite', 16, 32],
                ['Camarão cheese', 16, 32],
                ['Hot atum grelhado', 16, 32, 'Atum Grelhado'],
            ])],
            ['Kani', self::sized('Kani', ['Meio (4un)', 'Todo (8un)'], [
                ['Kani cheese', 14, 28, 'Cheese'],
                ['Kani shake', 15, 30, 'Shake'],
                ['Kani atum', 13, 25, 'Atum'],
            ])],
            ['Sashimi', self::sized('Sashimi', ['(1un)'], [
                ['Salmão', 6],
            ])],
            ['Onigiri', self::sized('Onigiri', ['(2un)'], [
                ['Salmão grelhado', 26],
                ['Camarão cheese', 24],
                ['Atum grelhado', 23],
                ['Kani skin cheese', 22],
            ])],
            ['Especiais', self::sized('', ['Meio (4un)', 'Todo (8un)'], [
                ['Ura camarão empanado', 14, 28, 'Ura Camarão Empan'],
                ['Ura dragon camarão', 18, 36, 'Dragon Camarão'],
                ['Ura dragon skin', 16, 32, 'Dragon Skin'],
                ['Jyo', 17, 34],
                ['Bora bora', 18, 36],
                ['Salmão maçaricado', 17, 34, 'Salmão Maçaricado'],
                ['Salmão ebi empanado', 18, 36, 'Salmão Ebi Empan'],
            ])],
            ['Guioza', self::sized('Guioza', ['(6un)'], [
                ['Bovina', 18],
                ['Suína', 18],
            ])],
            ['Temaki', [...self::sized('Temaki', [''], [
                ['Salmão cheese', 32],
                ['Salmão maçaricado', 32, 'Salmão Maçaric'],
                ['Salmão cebola roxa', 32, 'Salmão Ceb Roxa'],
                ['Atum grelhado', 29],
                ['Camarão cheese', 30],
                ['Camarão empanado', 31, 'Camarão Empan'],
                ['Skin cheese', 26],
                ['Kani cheese', 26],
            ]), ...self::sized('Temaki Hot', [''], [
                ['Hot salmão cheese', 34, 'Salmão Cheese'],
                ['Hot dinamite', 34, 'Dinamite'],
                ['Hot atum grelhado', 31, 'Atum Grelhado'],
                ['Hot camarão cheese', 32, 'Camarão Chs'],
            ])]],
            // shortcut: Meio priced at half of the menu's (Todo) price, fix in admin if different.
            ['Sushi Dog', self::sized('Dog', ['Meio', 'Todo'], [
                ['Salmão cheese', 19, 38],
                ['Salmão maçaricado', 19, 38],
                ['Dinamite', 19, 38],
                ['Salmão cebola roxa', 19, 38],
                ['Camarão cheese', 18, 36],
                ['Atum grelhado', 17, 34],
                ['Kani cheese', 16, 32],
            ])],
            ['Combos', [
                self::single('Combo 1', 65, 'Combo 1 (22un)', '22 peças: 5 hot dinamite, 5 hot filadélfia, 4 futomaki atum grelhado, 4 uramaki camarão cheese, 2 uramaki skin cheese, 2 uramaki kani cheese'),
                self::single('Combo 2', 90, 'Combo 2 (36un)', '36 peças: 5 hot camarão, 5 hot dinamite, 5 hot filadélfia, 4 uramaki atum grelhado, 4 futomaki camarão cheese, 4 uramaki skin cheese, 3 uramaki salmão, 2 uramaki kani cheese, 4 kani cheese'),
                self::single('Combo 3', 70, 'Combo 3 (24un)', '24 peças: 4 uramaki salmão grelhado, 4 uramaki salmão cheese, 4 uramaki camarão cheese, 4 futomaki skin cheese, 4 futomaki atum grelhado, 4 kani cheese'),
                self::single('Combo Hot', 60, 'Combo Hot (20un)', '20 peças: 5 filadélfia, 5 dinamite, 5 camarão cheese, 5 atum grelhado'),
                self::single('Combo Especial', 70, 'Combo Especial (22un)', '22 peças: 5 hot dinamite, 5 hot camarão, 4 uramaki skin, 4 kani cheese, 2 jyo, 2 bora bora'),
            ]],
            ['Petiscos', [
                self::single('Croquete de cupim', 25, 'Croquete Cupim', 'Bolinho de cupim recheado com queijo, molho da casa'),
                self::single('Coxinha sem massa', 25, 'Coxinha s/ Massa', 'Coxinha de frango sem massa com recheio de catupiry'),
                self::single('Bolinho de caranguejo', 30, 'Bolinho Caranguejo', 'Bolinho de caranguejo, catupiry e molho da casa'),
                self::single('Camarão empanado', 30, 'Camarão Empanado', 'Camarão empanado no catupiry'),
                self::single('Filé com fritas', 50, 'Filé c/ Fritas', 'Carne acebolada em tiras, batata frita ou macaxeira, farofa panko de bacon e molho da casa'),
                self::single('Frango crocante', 50, 'Frango Crocante', 'Frango empanado crocante, batata frita, molho especial e maionese da casa'),
                self::single('Camarão alho e óleo', 25, 'Camarão Alho e Óleo', null),
                self::single('Batata simples', 22, 'Batata Simples', 'Batata frita e molho'),
                self::single('Batata cheddar e bacon', 27, 'Batata Cheddar Bacon', 'Batata frita recheada com cheddar e bacon'),
                self::single('Batata carne e queijo', 27, 'Batata Carne Queijo', 'Batata frita recheada com queijo e carne desfiada'),
                self::single('Macaxeira simples', 22, 'Macaxeira Simples', 'Macaxeira frita e molho'),
                self::single('Macaxeira carne e queijo', 25, 'Macax Carne Queijo', 'Macaxeira frita recheada com queijo e carne desfiada'),
                self::single('Macaxeira calabresa e catupiry', 25, 'Macax Calabresa Catup', 'Macaxeira frita recheada com calabresa e catupiry'),
            ]],
            ['Bebidas', [
                ['Refrigerante lata', null, [
                    ['Coca', 700, 'Coca Lata'], ['Coca Zero', 700, 'Coca Zero Lata'],
                    ['Guaraná', 700, 'Guaraná Lata'], ['Guaraná Zero', 700, 'Guaraná Zero Lata'],
                ]],
                ['Refrigerante litro', null, [
                    ['Coca', 1200, 'Coca Litro'], ['Coca Zero', 1200, 'Coca Zero Litro'],
                    ['Guaraná', 1200, 'Guaraná Litro'], ['Guaraná Zero', 1200, 'Guaraná Zero Litro'],
                ]],
                ['Água', null, [['Mineral', 200, 'Água Mineral'], ['Com gás', 400, 'Água c/ Gás']]],
                ['Suco', null, [['Copo', 700, 'Suco Copo'], ['Jarra', 1500, 'Suco Jarra']]],
                self::single('Long neck Heineken', 12, 'Heineken Long Neck', null),
            ]],
        ];
    }

    /**
     * One item per row, one variant per size; label = "<prefix> <short> <(count) or size>".
     *
     * @param  list<string>  $sizes
     * @param  list<array<int, int|string>>  $rows  [name, reais per size..., optional short label]
     * @return list<array{string, ?string, list<array{string, int, string}>}>
     */
    private static function sized(string $prefix, array $sizes, array $rows): array
    {
        return array_map(function (array $row) use ($prefix, $sizes): array {
            $name = (string) $row[0];
            $short = isset($row[count($sizes) + 1]) ? (string) $row[count($sizes) + 1] : ucwords($name);
            $variants = [];
            foreach ($sizes as $i => $size) {
                // Ticket label keeps only the count, "Meio (4un)" prints as "(4un)", to fit MAX_LABEL.
                $tag = preg_match('/\(.+\)/', $size, $m) === 1 ? $m[0] : $size;
                $label = trim($prefix.' '.$short.' '.$tag);
                $variants[] = [$size, (int) $row[$i + 1] * 100, $label];
            }

            return [$name, null, $variants];
        }, $rows);
    }

    /** @return array{string, ?string, list<array{string, int, string}>} */
    private static function single(string $name, int $reais, string $label, ?string $note): array
    {
        return [$name, $note, [['', $reais * 100, $label]]];
    }
}
