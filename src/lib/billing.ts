
import type { Discount, LineItem, Package } from './types';

interface DiscountedTotal {
    discountedPriceLKR: number;
    discountedPriceUSD: number;
    totalDiscountLKR: number;
    totalDiscountUSD: number;
}

export function calculateDiscountedTotal(pkg: Package): DiscountedTotal {
    let discountedPriceLKR = pkg.priceLKR;
    let discountedPriceUSD = pkg.priceUSD;
    let totalDiscountLKR = 0;
    let totalDiscountUSD = 0;

    if (pkg.discounts) {
        pkg.discounts.forEach(discount => {
            if (discount.type === 'percentage') {
                const discountAmountLKR = (discountedPriceLKR * discount.value) / 100;
                const discountAmountUSD = (discountedPriceUSD * discount.value) / 100;
                totalDiscountLKR += discountAmountLKR;
                totalDiscountUSD += discountAmountUSD;
                discountedPriceLKR -= discountAmountLKR;
                discountedPriceUSD -= discountAmountUSD;
            } else if (discount.type === 'flat') {
                // Assuming flat discount is in LKR, you might need a USD equivalent or separate fields
                const discountAmountLKR = discount.value;
                // A fixed conversion or a separate USD flat discount value would be needed for accuracy
                const exchangeRate = pkg.priceLKR / pkg.priceUSD;
                const discountAmountUSD = exchangeRate > 0 ? discount.value / exchangeRate : 0;
                
                totalDiscountLKR += discountAmountLKR;
                totalDiscountUSD += discountAmountUSD;
                discountedPriceLKR -= discountAmountLKR;
                discountedPriceUSD -= discountAmountUSD;
            }
        });
    }

    return {
        discountedPriceLKR: Math.max(0, discountedPriceLKR),
        discountedPriceUSD: Math.max(0, discountedPriceUSD),
        totalDiscountLKR,
        totalDiscountUSD
    };
}


export function calculateInvoiceTotals(lineItems: LineItem[], discounts: Discount[] = [], taxRate: number = 0) {
    const subtotalLKR = lineItems.reduce((acc, item) => acc + (item.priceLKR * item.quantity), 0);
    const subtotalUSD = lineItems.reduce((acc, item) => acc + (item.priceUSD * item.quantity), 0);

    let totalDiscountLKR = 0;
    let totalDiscountUSD = 0;

    let priceAfterDiscountsLKR = subtotalLKR;
    let priceAfterDiscountsUSD = subtotalUSD;

    discounts.forEach(discount => {
        if (discount.type === 'percentage') {
            const discountAmountLKR = (priceAfterDiscountsLKR * discount.value) / 100;
            const discountAmountUSD = (priceAfterDiscountsUSD * discount.value) / 100;
            totalDiscountLKR += discountAmountLKR;
            totalDiscountUSD += discountAmountUSD;
            priceAfterDiscountsLKR -= discountAmountLKR;
            priceAfterDiscountsUSD -= discountAmountUSD;
        } else if (discount.type === 'flat') {
            totalDiscountLKR += discount.value;
            priceAfterDiscountsLKR -= discount.value;
            // Note: Flat discounts in USD would need separate handling/conversion
        }
    });

    const taxAmountLKR = (priceAfterDiscountsLKR * taxRate) / 100;
    const taxAmountUSD = (priceAfterDiscountsUSD * taxRate) / 100;

    const totalLKR = priceAfterDiscountsLKR + taxAmountLKR;
    const totalUSD = priceAfterDiscountsUSD + taxAmountUSD;

    return {
        subtotalLKR,
        subtotalUSD,
        totalDiscountLKR,
        totalDiscountUSD,
        taxAmountLKR,
        taxAmountUSD,
        totalLKR,
        totalUSD,
    };
}
