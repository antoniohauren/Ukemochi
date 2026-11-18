<?php

declare(strict_types=1);

namespace App\Application\Report;

interface ReportReader
{
    public function period(\DateTimeImmutable $from, \DateTimeImmutable $to): PeriodReport;
}
