/**
 * File Upload UI Module
 * Handles file upload interface and drag-and-drop
 */

/**
 * Initializes file upload UI
 * Sets up click, drag-and-drop event listeners
 *
 * @param {Function} onFileSelect - Callback when file is selected
 */
export function init(onFileSelect) {
    const fileInput = document.getElementById('dataFile');
    const fileUpload = document.getElementById('fileUpload');

    // File input change event
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            onFileSelect(file);
        }
    });

    // Click to upload
    fileUpload.addEventListener('click', () => fileInput.click());

    // Drag and drop events
    fileUpload.addEventListener('dragover', handleDragOver);
    fileUpload.addEventListener('drop', (e) => handleFileDrop(e, onFileSelect));
    fileUpload.addEventListener('dragenter', (e) => e.preventDefault());
    fileUpload.addEventListener('dragleave', () => {
        fileUpload.classList.remove('dragover');
    });
}

/**
 * Handles dragover event
 *
 * @param {DragEvent} e - Drag event
 */
function handleDragOver(e) {
    e.preventDefault();
    const fileUpload = document.getElementById('fileUpload');
    fileUpload.classList.add('dragover');
}

/**
 * Handles file drop event
 *
 * @param {DragEvent} e - Drop event
 * @param {Function} onFileSelect - File select callback
 */
function handleFileDrop(e, onFileSelect) {
    e.preventDefault();
    const fileUpload = document.getElementById('fileUpload');
    fileUpload.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        onFileSelect(files[0]);
    }
}

/**
 * Resets file input
 */
export function resetFileInput() {
    const fileInput = document.getElementById('dataFile');
    if (fileInput) {
        fileInput.value = '';
    }
}

/**
 * Shows file upload area
 */
export function show() {
    const fileUpload = document.getElementById('fileUpload');
    if (fileUpload) {
        fileUpload.style.display = 'block';
    }
}

/**
 * Hides file upload area
 */
export function hide() {
    const fileUpload = document.getElementById('fileUpload');
    if (fileUpload) {
        fileUpload.style.display = 'none';
    }
}
