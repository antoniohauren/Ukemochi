<?php

declare(strict_types=1);

namespace App\Domain\Order;

use App\Domain\Payment\PaymentMethod;

/**
 * Who the order is for and how it is delivered. `customerId` links a saved customer, if any.
 * Pay on delivery records the method; `changeForCents` ("troco para") is only for cash.
 */
final readonly class OrderDetails
{
    public function __construct(
        public OrderType $type,
        public string $customerName,
        public ?int $customerId = null,
        public ?string $addressText = null,
        public int $deliveryFeeCents = 0,
        public bool $payOnDelivery = false,
        public ?int $changeForCents = null,
        public ?string $note = null,
        public ?PaymentMethod $payMethod = null,
    ) {
        if (trim($customerName) === '') {
            throw new CustomerNameRequired;
        }
        if ($type === OrderType::Delivery && trim($addressText ?? '') === '') {
            throw new AddressRequired;
        }
        if ($deliveryFeeCents < 0 || ($deliveryFeeCents > 0 && $type !== OrderType::Delivery)) {
            throw new InvalidDeliveryFee;
        }
        if ($changeForCents !== null && $changeForCents < 0) {
            throw new InvalidAmount;
        }
        if ($payOnDelivery !== ($payMethod !== null) || ($changeForCents !== null && $payMethod !== PaymentMethod::Cash)) {
            throw new InvalidPayMethod;
        }
    }
}
