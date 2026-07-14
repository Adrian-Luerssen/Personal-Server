package com.adrianluerssen.personalserver.payments;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class PaymentNotificationParserTest {
    @Test
    public void extractsMerchantBeforeRevolutBalanceBoilerplate() {
        assertEquals(
            "Balboa",
            PaymentNotificationParser.findMerchant("Balboa 🍽 You EUR balance:", "🍽 You EUR balance:")
        );
        assertEquals(
            "Incògnit Bar",
            PaymentNotificationParser.findMerchant("Incògnit Bar 🍽 You EUR balance:", "🍽 You EUR balance:")
        );
    }

    @Test
    public void explicitPaymentLocationWinsOverGenericTitle() {
        assertEquals(
            "Coffee Shop",
            PaymentNotificationParser.findMerchant("Card payment", "You paid 4.20 EUR at Coffee Shop.")
        );
    }

    @Test
    public void preservesUsefulMerchantTitlesWithoutBoilerplate() {
        assertEquals("Mercadona", PaymentNotificationParser.findMerchant("Mercadona", "12.40 EUR"));
    }
}
