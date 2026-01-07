# Minimax Invoice XML Converter v2.21

A professional, modular web application that converts invoice data from CSV/Excel files into Minimax-compatible XML format for import into Minimax accounting software.

## Features

- **Multiple Input Formats**: Supports CSV and Excel (.xlsx, .xls) files
- **Smart VAT Detection**: Automatically detects VAT rates from column headers or calculates from amounts
- **Country Classification**: Automatically classifies invoices as domestic, EU, or third-country
- **Customer Management**: Optional customer data export with flexible code generation strategies
- **DDV (VAT Book) Entries**: Automatic generation for domestic Slovenian invoices
- **OSS (One Stop Shop)**: Proper handling of EU cross-border VAT
- **Clearing Entries**: Automatic generation of clearing account entries (v2.21 feature)
- **Multiple Export Options**: Download XML, copy to clipboard, or preview in browser
- **Drag & Drop**: User-friendly file upload with drag-and-drop support
- **Account Mapping**: Customizable account numbers for different business types and countries

## Version History

- **v2.21** (December 2024): Added clearing entries feature
- **v2.20**: OSS structure improvements
- **v2.19**: VAT auto-detection from headers
- **v2.18**: Smart country detection

## Architecture

The application has been refactored from a monolithic 1,814-line HTML file into a professional modular architecture with 21 focused modules.

### Project Structure

```
minimax-converter/
├── index.html                          # Clean HTML (302 lines)
├── README.md                          # This file
├── assets/
│   ├── css/
│   │   ├── main.css                   # Core layout & structure
│   │   ├── components.css             # Buttons, cards, forms
│   │   └── animations.css             # Spinner, transitions
│   └── js/
│       ├── app.js                     # Main entry point
│       ├── config/
│       │   ├── constants.js           # VAT rates, countries, accounts
│       │   └── defaults.js            # Default settings
│       ├── models/
│       │   ├── InvoiceData.js         # Invoice data storage (singleton)
│       │   └── Settings.js            # Settings state (singleton)
│       ├── services/
│       │   ├── FileParser.js          # CSV/Excel parsing
│       │   ├── VATDetector.js         # VAT rate detection
│       │   ├── CustomerCodeGenerator.js  # Customer code generation
│       │   ├── CountryClassifier.js   # Country classification logic
│       │   ├── AccountMapper.js       # Account number mapping
│       │   ├── DateFormatter.js       # Date parsing & formatting
│       │   └── XMLGenerator.js        # Minimax XML generation
│       ├── ui/
│       │   ├── UIManager.js           # Master UI coordinator
│       │   ├── FileUploadUI.js        # File upload interface
│       │   ├── SettingsUI.js          # Settings panel
│       │   ├── PreviewUI.js           # Data preview & stats
│       │   ├── XMLActionsUI.js        # Download/copy/preview
│       │   └── MessageUI.js           # Alerts & messages
│       └── utils/
│           ├── hash.js                # Hash function for customer codes
│           ├── validators.js          # Input validation
│           └── xmlUtils.js            # XML escaping utilities
```

### Module Breakdown

#### Config (2 modules)
- **constants.js**: EU VAT rates, country codes, account mappings
- **defaults.js**: Default application settings

#### Models (2 modules - Singletons)
- **InvoiceData.js**: Central data store for invoice data, column headers, and VAT rates
- **Settings.js**: Application settings with localStorage persistence

#### Services (6 modules)
- **FileParser.js**: Parses CSV (PapaParse) and Excel (XLSX) files, validates data
- **XMLGenerator.js**: Core XML generation logic for Minimax format
- **VATDetector.js**: Detects VAT rates from headers or calculates from amounts
- **CountryClassifier.js**: Classifies countries as domestic/EU/third
- **CustomerCodeGenerator.js**: Generates customer codes (hash/tax/name/timestamp/manual)
- **AccountMapper.js**: Maps account numbers based on country type and business type
- **DateFormatter.js**: Parses Excel serial dates and various string formats

#### UI (6 modules)
- **UIManager.js**: Master coordinator, orchestrates all UI modules and workflow
- **FileUploadUI.js**: File upload interface with drag-and-drop
- **SettingsUI.js**: Settings panel management and event handling
- **PreviewUI.js**: Data preview and statistics display
- **XMLActionsUI.js**: Download, copy to clipboard, and preview functionality
- **MessageUI.js**: Alert and message display system

#### Utils (3 modules)
- **hash.js**: Simple hash function for generating customer codes
- **validators.js**: File and data validation functions
- **xmlUtils.js**: XML/HTML escaping utilities

#### Entry (1 module)
- **app.js**: Application initialization and module coordination

## Getting Started

### Prerequisites

- Modern web browser with ES6 module support:
  - Chrome 61+
  - Firefox 60+
  - Safari 11+
  - Edge 79+

### Running the Application

Since the application uses ES6 modules, it must be served via HTTP (not file://). Use any local HTTP server:

**Option 1: Python**
```bash
cd "Space invoices to Minimax converter"
python3 -m http.server 8000
```

**Option 2: Node.js (http-server)**
```bash
npx http-server -p 8000
```

**Option 3: PHP**
```bash
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## Usage Guide

### Step 1: Upload Invoice Data

1. Click the upload area or drag and drop a CSV or Excel file
2. Supported formats: `.csv`, `.xlsx`, `.xls`
3. File size limit: 30MB

**Expected Columns:**
- `Name` - Customer name (required)
- `Number` or `Invoice number` - Invoice number (required)
- `Date` or `Date issued` - Invoice date (required)
- `Total` - Net amount (required)
- `Total w/ tax` - Gross amount (required)
- `Country` or `Country code` - Customer country (optional, defaults to Slovenia)
- `Tax number` - Customer tax number (optional)
- `Type` - Invoice type (optional, identifies credit notes)
- `Paid` - Payment status (optional)

### Step 2: Configure Settings

**Invoice Type:**
- `IR` - Sales invoices (generates DDV entries for domestic)
- `TR` - Expense invoices

**Business Type:**
- Products
- Services

**Customer Export:**
- Include customers in XML (Yes/No)
- Customer code generation strategy:
  - Hash-based (default)
  - Tax number
  - Name-based
  - Timestamp
  - Manual code column

**Country Detection:**
- Auto (prefers "Country", falls back to "Country code")
- Use "Country" column only
- Use "Country code" column only

**Home Country:** Country for domestic classification (default: Slovenia)

**Default VAT Rate:** S (standard), R (reduced), or Z (zero)

**Date Format:**
- Auto-detect
- DD.MM.YYYY
- MM/DD/YYYY
- YYYY-MM-DD

**Account Numbers:** Customizable for domestic/EU/third-country transactions

### Step 3: Generate XML

1. Click "Generate Minimax XML" button
2. Review success message with statistics (DDV entries, OSS entries, file size)
3. Choose export method:
   - **Download**: Downloads XML file directly
   - **Copy**: Copies XML to clipboard
   - **Preview**: Shows XML in browser for manual copy

### Step 4: Import to Minimax

1. Save the downloaded XML file or paste clipboard content into a text editor and save as `.xml`
2. Open Minimax accounting software
3. Import the XML file using Minimax's import functionality
4. Verify imported invoices, customers, and VAT entries

## XML Structure

The generated XML follows Minimax's import schema v2.21:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<MiniMaxXMLData version="2.21">
  <Stranke>                        <!-- Customers section (optional) -->
    <Stranka>
      <sifra>...</sifra>          <!-- Customer code -->
      <naziv>...</naziv>          <!-- Customer name -->
      <davSt>...</davSt>          <!-- Tax number -->
      <drzava>...</drzava>        <!-- Country code -->
    </Stranka>
  </Stranke>

  <Dokumenti>                      <!-- Invoices section -->
    <Dokument>
      <vrstaDokumenta>IR</vrstaDokumenta>  <!-- Invoice type -->
      <stevilka>...</stevilka>              <!-- Invoice number -->
      <datum>...</datum>                     <!-- Date -->

      <Ddv>                        <!-- VAT section (domestic only) -->
        <stopnjaDdv>...</stopnjaDdv>        <!-- VAT rate code -->
        <osnovaDdv>...</osnovaDdv>          <!-- Net amount -->
        <znesekDdv>...</znesekDdv>          <!-- VAT amount -->
      </Ddv>

      <Knjizbe>                    <!-- Journal entries -->
        <Knjizba>
          <konto>...</konto>       <!-- Account number -->
          <vrsta>D/K</vrsta>       <!-- Debit/Credit -->
          <znesek>...</znesek>     <!-- Amount -->
          <opis>...</opis>         <!-- Description -->
        </Knjizba>
      </Knjizbe>
    </Dokument>
  </Dokumenti>
</MiniMaxXMLData>
```

### Key Features:

1. **Customers Section**: Optional export of unique customers with codes, names, tax numbers, and countries

2. **DDV (VAT Book) Entries**: Automatically generated for domestic invoices when invoice type is "IR"

3. **Journal Entries**: For each invoice:
   - Receivables (debit): Account 1200/1210/1211 depending on country
   - Revenue (credit): Account 76000 (products) or 76100 (services)
   - VAT (credit): Account 26000 (domestic), 26002 (EU), or none (third country)

4. **Clearing Entries** (v2.21): Additional journal entry pair to clearing account:
   - Clearing account (debit): Account 1652 (customizable)
   - Receivables (credit): Account 1200/1210/1211

5. **OSS Structure**: Proper EU VAT handling for cross-border transactions

## Development

### Technology Stack

- **Pure JavaScript**: ES6 modules, no build tools required
- **External Libraries** (CDN):
  - PapaParse 5.4.1 - CSV parsing
  - XLSX 0.18.5 - Excel file parsing
- **Architecture**: Service-oriented with singleton models
- **State Management**: Centralized through InvoiceData and Settings models
- **Module System**: Native browser ES6 modules

### Design Patterns

1. **Singleton Pattern**: Used for InvoiceData and Settings models to provide global state
2. **Module Pattern**: Each file exports focused functionality
3. **Separation of Concerns**: Clear boundaries between UI, services, models, config
4. **Dependency Injection**: Services receive dependencies rather than importing them directly

### Code Quality

- **JSDoc Comments**: All functions documented with parameter types and descriptions
- **File Size**: Each module < 300 lines (most are 100-200 lines)
- **Function Size**: Functions < 50 lines (most are 20-30 lines)
- **Single Responsibility**: Each module has one clear purpose
- **No Global State**: State managed through singleton models
- **Error Handling**: Try-catch blocks with user-friendly error messages

### Adding New Features

1. **New Service**: Add to `assets/js/services/`
   - Export functions as named exports
   - Import in modules that need it
   - Add JSDoc comments

2. **New UI Component**: Add to `assets/js/ui/`
   - Follow existing patterns
   - Wire up in UIManager.js

3. **New Configuration**: Add to `assets/js/config/constants.js` or `defaults.js`

4. **Modify XML Output**: Edit `assets/js/services/XMLGenerator.js`
   - Follow Minimax schema requirements
   - Test with Minimax import

## Testing Strategy

### Manual Testing Checklist

1. **File Upload**:
   - [ ] CSV file upload
   - [ ] Excel file upload
   - [ ] Drag and drop
   - [ ] File size validation (>30MB)
   - [ ] Invalid file type

2. **Data Processing**:
   - [ ] Statistics display correctly
   - [ ] Preview shows first 5 rows
   - [ ] VAT auto-detection from headers
   - [ ] Date parsing (Excel serial dates, various string formats)

3. **Settings**:
   - [ ] Business type selection
   - [ ] Customer inclusion toggle
   - [ ] Customer code generation strategies
   - [ ] Country column selection
   - [ ] Account number overrides
   - [ ] Settings persistence in localStorage

4. **XML Generation**:
   - [ ] Domestic invoices (Slovenia)
   - [ ] EU invoices (with OSS)
   - [ ] Third-country invoices
   - [ ] Credit notes (negative amounts)
   - [ ] Mixed scenarios
   - [ ] DDV entries for domestic
   - [ ] Clearing entries

5. **Export Methods**:
   - [ ] Download XML file
   - [ ] Copy to clipboard
   - [ ] Preview XML
   - [ ] Select all in preview

6. **Error Handling**:
   - [ ] Empty file
   - [ ] Missing required columns
   - [ ] Invalid data formats
   - [ ] Network errors (CDN libraries)

### Test Data

Create sample files with:
- Domestic invoices (Slovenia)
- EU invoices (various VAT rates: 19%, 20%, 21%, 22%, etc.)
- Third country invoices (USA, UK, etc.)
- Credit notes (Type contains "credit")
- Mixed payment status
- Various date formats

### XML Validation

Compare generated XML with original implementation:
1. Parse both XMLs
2. Compare structure
3. Verify amounts match
4. Validate DDV entries
5. Check account numbers
6. Test import in Minimax

## Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 61+ | ✅ Fully supported |
| Firefox | 60+ | ✅ Fully supported |
| Safari | 11+ | ✅ Fully supported |
| Edge | 79+ | ✅ Fully supported |
| IE 11 | - | ❌ Not supported (no ES6 modules) |

## Troubleshooting

### Issue: "Failed to load module"
**Solution**: Ensure you're serving via HTTP, not opening file:// directly. Use a local HTTP server.

### Issue: Libraries not loading (PapaParse, XLSX)
**Solution**: Check internet connection. Libraries are loaded from CDN.

### Issue: XML not downloading
**Solution**:
1. Try "Copy to Clipboard" method
2. Try "Preview XML" and manually copy
3. Check browser's download settings/permissions

### Issue: Incorrect VAT amounts
**Solution**:
1. Verify "Total" and "Total w/ tax" columns are present and correct
2. Check VAT rate detection in column headers
3. Try manual VAT rate override in settings

### Issue: Wrong country classification
**Solution**:
1. Check "Country" or "Country code" columns in source file
2. Verify home country setting
3. Use country column selector in settings

### Issue: Settings not persisting
**Solution**: Check browser localStorage is enabled and not blocked

## Minimax Import Requirements

For successful import into Minimax:
1. XML file must be UTF-8 encoded
2. Version must match: 2.21
3. Account numbers must exist in Minimax chart of accounts
4. Customer codes must be unique
5. Invoice numbers must follow Minimax format requirements
6. Dates must be in YYYY-MM-DD format
7. Amounts must be in decimal format (e.g., 123.45)

## License

This is a private tool for converting Space Invoices export data to Minimax format.

## Support

For issues or questions:
1. Check the Troubleshooting section
2. Review the Usage Guide
3. Verify your input data matches expected column names
4. Test with sample data first

## Credits

- **Original Development**: Monolithic HTML application
- **Refactoring**: Modular ES6 architecture (December 2024)
- **Libraries**: PapaParse (CSV), XLSX (Excel)
- **Target Software**: Minimax Accounting Software

## Changelog

### v2.21 (December 2024) - Modular Refactor
- ✅ Complete modular refactoring (21 modules)
- ✅ Reduced index.html from 1,814 to 302 lines (83% reduction)
- ✅ Professional architecture with clear separation of concerns
- ✅ Comprehensive JSDoc documentation
- ✅ Settings persistence with localStorage
- ✅ Improved error handling and user feedback
- ✅ All original features maintained

### v2.21 (Original)
- ✅ Added clearing entries feature
- ✅ Account 1652 clearing account support

### v2.20
- ✅ OSS structure improvements for EU invoices

### v2.19
- ✅ VAT auto-detection from column headers

### v2.18
- ✅ Smart country detection
