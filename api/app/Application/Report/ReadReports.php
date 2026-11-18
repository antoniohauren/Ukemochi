<?php

declare(strict_types=1);

namespace App\Application\Report;

/** Sales reports for the admin. */
final readonly class ReadReports
{
    public function __construct(private ReportReader $reader) {}

    public function period(\DateTimeImmutable $from, \DateTimeImmutable $to): PeriodReport
    {
        return $this->reader->period($from, $to);
    }
}
