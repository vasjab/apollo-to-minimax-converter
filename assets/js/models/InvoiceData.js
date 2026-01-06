/**
 * Invoice Data Model
 * Manages invoice data storage, retrieval, and statistics
 * Singleton pattern for application-wide data access
 */

/**
 * InvoiceData class - manages invoice data state
 */
class InvoiceData {
    constructor() {
        this.data = [];
        this.columnHeaders = {};
        this.vatRatesByColumn = {};
    }

    /**
     * Sets invoice data and related metadata
     *
     * @param {Array} data - Invoice data array
     * @param {Object} [vatRatesByColumn={}] - VAT rates by column
     * @param {Object} [columnHeaders={}] - Column headers mapping
     */
    setData(data, vatRatesByColumn = {}, columnHeaders = {}) {
        this.data = data || [];
        this.vatRatesByColumn = vatRatesByColumn || {};
        this.columnHeaders = columnHeaders || {};
    }

    /**
     * Gets all invoice data
     *
     * @returns {Array} Invoice data array
     */
    getData() {
        return this.data;
    }

    /**
     * Gets the number of invoices
     *
     * @returns {number} Invoice count
     */
    getCount() {
        return this.data.length;
    }

    /**
     * Gets column headers
     *
     * @returns {Object} Column headers mapping
     */
    getColumnHeaders() {
        return this.columnHeaders;
    }

    /**
     * Gets VAT rates by column
     *
     * @returns {Object} VAT rates mapping
     */
    getVATRatesByColumn() {
        return this.vatRatesByColumn;
    }

    /**
     * Checks if data is loaded
     *
     * @returns {boolean} True if data exists
     */
    hasData() {
        return this.data.length > 0;
    }

    /**
     * Clears all data
     */
    clear() {
        this.data = [];
        this.columnHeaders = {};
        this.vatRatesByColumn = {};
    }

    /**
     * Gets statistics about the invoice data
     *
     * @returns {Object} Statistics object
     */
    getStats() {
        if (!this.hasData()) {
            return {
                totalInvoices: 0,
                uniqueCustomers: 0,
                paidInvoices: 0,
                totalAmount: 0
            };
        }

        const totalInvoices = this.data.length;

        // Calculate total amount
        const totalAmount = this.data.reduce((sum, row) => {
            const amount = parseFloat(row['Total w/ tax'] || row['Total'] || 0);
            return sum + (isNaN(amount) ? 0 : amount);
        }, 0);

        // Count unique customers
        const uniqueCustomers = new Set();
        this.data.forEach(row => {
            if (row['Name']) {
                uniqueCustomers.add(row['Name']);
            }
        });

        // Count paid invoices
        const paidInvoices = this.data.filter(row =>
            row['Paid'] && row['Paid'].toString().toLowerCase() === 'yes'
        ).length;

        return {
            totalInvoices,
            uniqueCustomers: uniqueCustomers.size,
            paidInvoices,
            totalAmount
        };
    }

    /**
     * Gets unique customer names
     *
     * @returns {Array} Array of unique customer names
     */
    getUniqueCustomers() {
        const customers = new Set();
        this.data.forEach(row => {
            if (row['Name']) {
                customers.add(row['Name']);
            }
        });
        return Array.from(customers);
    }

    /**
     * Gets invoice by index
     *
     * @param {number} index - Invoice index
     * @returns {Object|null} Invoice data or null if not found
     */
    getInvoice(index) {
        if (index >= 0 && index < this.data.length) {
            return this.data[index];
        }
        return null;
    }

    /**
     * Filters invoices by criteria
     *
     * @param {Function} filterFn - Filter function
     * @returns {Array} Filtered invoices
     */
    filter(filterFn) {
        return this.data.filter(filterFn);
    }

    /**
     * Gets invoices by customer name
     *
     * @param {string} customerName - Customer name
     * @returns {Array} Invoices for the customer
     */
    getInvoicesByCustomer(customerName) {
        return this.data.filter(row => row['Name'] === customerName);
    }

    /**
     * Counts invoices by country
     *
     * @param {Function} getCountryFn - Function to extract country from row
     * @returns {Object} Country counts {countryName: count}
     */
    countByCountry(getCountryFn) {
        const countryCounts = {};

        this.data.forEach(row => {
            const country = getCountryFn(row);
            if (country) {
                countryCounts[country] = (countryCounts[country] || 0) + 1;
            }
        });

        return countryCounts;
    }

    /**
     * Gets data preview (first N rows)
     *
     * @param {number} [maxRows=5] - Maximum rows to return
     * @returns {Array} Preview data
     */
    getPreview(maxRows = 5) {
        return this.data.slice(0, maxRows);
    }

    /**
     * Exports to JSON string
     *
     * @returns {string} JSON representation
     */
    toJSON() {
        return JSON.stringify({
            data: this.data,
            columnHeaders: this.columnHeaders,
            vatRatesByColumn: this.vatRatesByColumn
        });
    }

    /**
     * Imports from JSON string
     *
     * @param {string} json - JSON string
     */
    fromJSON(json) {
        try {
            const parsed = JSON.parse(json);
            this.data = parsed.data || [];
            this.columnHeaders = parsed.columnHeaders || {};
            this.vatRatesByColumn = parsed.vatRatesByColumn || {};
        } catch (error) {
            console.error('Error importing invoice data from JSON:', error);
        }
    }
}

// Export singleton instance
export default new InvoiceData();
