/**
 * Message UI Module
 * Handles alerts, messages, and processing indicators
 */

/**
 * Shows a processing/loading indicator
 *
 * @param {string} message - Message to display
 */
export function showProcessing(message) {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = `
        <div class="processing">
            <div class="spinner"></div>
            ${message}
        </div>
    `;
}

/**
 * Hides the processing indicator
 */
export function hideProcessing() {
    const messagesDiv = document.getElementById('messages');
    if (messagesDiv.querySelector('.processing')) {
        messagesDiv.innerHTML = '';
    }
}

/**
 * Shows a message/alert to the user
 * Auto-hides after 8 seconds
 *
 * @param {string} message - Message to display
 * @param {string} type - Message type ('error', 'success', 'info')
 */
export function showMessage(message, type) {
    const messagesDiv = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert alert-${type}`;

    const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    messageDiv.innerHTML = `${icon} ${message}`;

    messagesDiv.innerHTML = '';
    messagesDiv.appendChild(messageDiv);

    // Auto-hide after 8 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 8000);
}

/**
 * Shows an error message
 *
 * @param {string} message - Error message
 */
export function showError(message) {
    showMessage(message, 'error');
}

/**
 * Shows a success message
 *
 * @param {string} message - Success message
 */
export function showSuccess(message) {
    showMessage(message, 'success');
}

/**
 * Shows an info message
 *
 * @param {string} message - Info message
 */
export function showInfo(message) {
    showMessage(message, 'info');
}

/**
 * Clears all messages
 */
export function clearMessages() {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = '';
}
