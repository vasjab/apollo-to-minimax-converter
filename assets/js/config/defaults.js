/**
 * Default Settings Configuration
 */

import { DEFAULT_CLEARING_ACCOUNT } from './constants.js';

export const DEFAULT_SETTINGS = {
    // Document settings
    invoiceType: 'IR',  // IR - Issued Invoice (Izdani Račun)
    businessType: 'products',  // products, services, goods, materials

    // Account settings
    clearingAccount: DEFAULT_CLEARING_ACCOUNT,  // 1652

    // Date settings
    dateFormat: 'auto',  // auto, dmy, mdy, ymd

    // Customer settings
    includeCustomers: true,
    customerCodeLogic: 'hash',  // hash, taxnumber, namebased, timestamp, manual
    customerCodePrefix: 'C',

    // Location settings
    homeCountry: 'Slovenia',
    countryColumn: 'auto',

    // VAT settings
    defaultVATRate: 'S'  // S, Z, P, 0, OP, NE
};
