<?php

declare(strict_types=1);

namespace App\Application;

/** Runs multi-record writes (record + audit row) all-or-nothing. */
interface Transaction
{
    /**
     * @template T
     *
     * @param  \Closure(): T  $work
     * @return T
     */
    public function run(\Closure $work): mixed;
}
