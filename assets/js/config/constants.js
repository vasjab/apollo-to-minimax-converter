/**
 * Application Constants
 * Contains VAT rates, country codes, and account mappings
 */

// EU VAT Rates by Country Code
export const EU_VAT_RATES = {
    'AT': 20,    // Austria
    'BE': 21,    // Belgium
    'BG': 20,    // Bulgaria
    'HR': 25,    // Croatia
    'CY': 19,    // Cyprus
    'CZ': 21,    // Czech Republic
    'DK': 25,    // Denmark
    'EE': 24,    // Estonia
    'FI': 25.5,  // Finland
    'FR': 20,    // France
    'DE': 19,    // Germany
    'GR': 24,    // Greece
    'HU': 27,    // Hungary
    'IE': 23,    // Ireland
    'IT': 22,    // Italy
    'LV': 21,    // Latvia
    'LT': 21,    // Lithuania
    'LU': 17,    // Luxembourg
    'MT': 18,    // Malta
    'NL': 21,    // Netherlands
    'PL': 23,    // Poland
    'PT': 23,    // Portugal
    'RO': 21,    // Romania
    'SK': 23,    // Slovakia
    'SI': 22,    // Slovenia
    'ES': 21,    // Spain
    'SE': 25     // Sweden
};

// EU Countries with ISO Code Mapping
export const EU_COUNTRIES = {
    'Austria': 'AT', 'Belgium': 'BE', 'Bulgaria': 'BG', 'Croatia': 'HR',
    'Cyprus': 'CY', 'Czech Republic': 'CZ', 'Czechia': 'CZ', 'Denmark': 'DK', 'Estonia': 'EE',
    'Finland': 'FI', 'France': 'FR', 'Germany': 'DE', 'Greece': 'GR',
    'Hungary': 'HU', 'Ireland': 'IE', 'Italy': 'IT', 'Latvia': 'LV',
    'Lithuania': 'LT', 'Luxembourg': 'LU', 'Malta': 'MT', 'Netherlands': 'NL',
    'Poland': 'PL', 'Portugal': 'PT', 'Romania': 'RO', 'Slovakia': 'SK',
    'Slovenia': 'SI', 'Spain': 'ES', 'Sweden': 'SE'
};

// Extended Country Codes (includes EU + other countries)
export const COUNTRY_CODES = {
    ...EU_COUNTRIES,
    'Iceland': 'IS', 'Norway': 'NO', 'Switzerland': 'CH', 'United Kingdom': 'GB',
    'UK': 'GB', 'England': 'GB', 'Scotland': 'GB', 'Wales': 'GB', 'Northern Ireland': 'GB',
    'United States': 'US', 'USA': 'US', 'Canada': 'CA', 'Australia': 'AU', 'Japan': 'JP',
    'South Korea': 'KR', 'China': 'CN', 'India': 'IN', 'Brazil': 'BR',
    'Mexico': 'MX', 'Turkey': 'TR', 'Russia': 'RU', 'Ukraine': 'UA',
    'Serbia': 'RS', 'Bosnia and Herzegovina': 'BA', 'North Macedonia': 'MK',
    'Montenegro': 'ME', 'Albania': 'AL', 'Moldova': 'MD', 'Belarus': 'BY'
};

// Account Mappings by Country Type and Business Type
export const ACCOUNT_MAPPINGS = {
    domestic: {
        receivables: '1200',
        vat: '26000',
        revenue: {
            products: '7620',
            services: '7601',
            goods: '7600',
            materials: '7621'
        }
    },
    eu: {
        receivables: '1211',
        vat: '26002',  // OSS VAT account
        revenue: {
            products: '76301',
            services: '76111',
            goods: '76101',
            materials: '76311'
        }
    },
    third: {
        receivables: '1210',
        vat: '',  // No VAT for third countries
        revenue: {
            products: '76302',
            services: '76112',
            goods: '76102',
            materials: '76312'
        }
    }
};

// Default clearing account
export const DEFAULT_CLEARING_ACCOUNT = '1652';

// Application version
export const APP_VERSION = '2.21';

// Features in current version
export const APP_FEATURES = [
    'Clearing Entries',
    'OSS Structure Fix',
    'Currency fields',
    'VAT Auto-detection',
    'Date format selector'
];
