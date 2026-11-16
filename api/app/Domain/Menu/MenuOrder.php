<?php

declare(strict_types=1);

namespace App\Domain\Menu;

final class MenuOrder
{
    /**
     * New sort per id: its position in `$ids`.
     *
     * @param  list<int>  $ids  the new order
     * @param  list<int>  $current  every id that must be ordered
     * @return array<int, int> id => sort
     *
     * @throws InvalidOrder unless `$ids` is exactly `$current`, each once
     */
    public static function sorts(array $ids, array $current): array
    {
        $given = $ids;
        sort($given);
        sort($current);
        if ($given !== $current) {
            throw new InvalidOrder;
        }

        return array_flip($ids);
    }
}
