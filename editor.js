// Image upload functionality
console.log('EDITOR.JS LOADED - Starting initialization...');
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM CONTENT LOADED - Running editor functions...');
    // Initialize all image inputs
    const imageInputs = document.querySelectorAll('.image-input');
    
    imageInputs.forEach(input => {
        input.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const imageId = input.id.replace('-input', '-img');
                    const img = document.getElementById(imageId);
                    const container = input.closest('.editable-image') || input.closest('.image-placeholder');
                    const placeholder = container ? container.querySelector('.placeholder-text') : null;
                    const label = container ? container.querySelector('.image-label') : null;
                    
                    // Hide placeholder and label, show image
                    if (placeholder) placeholder.style.display = 'none';
                    if (label) label.style.display = 'none';
                    
                    img.src = event.target.result;
                    img.style.display = 'block';
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'cover';
                    
                    // Store base64 for saving
                    img.dataset.base64 = event.target.result;
                    
                    // Initialize scaling for new image
                    initImageScaling(img);
                };
                reader.readAsDataURL(file);
            }
        });
    });

    // Save functionality
    const saveBtn = document.getElementById('saveBtn');
    const saveStatus = document.getElementById('saveStatus');
    
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            try {
                console.log('SAVE: Starting save process...');
                saveStatus.textContent = 'Saving...';
                saveStatus.style.color = 'var(--burgundy)';
                
                // Get all editable text content (including product names)
                const textContent = {};
                
                // Get all elements with contenteditable or editable-text class
                const editableElements = document.querySelectorAll('[contenteditable="true"], .editable-text');
                editableElements.forEach(el => {
                    // Skip buttons and control elements
                    if (el.tagName === 'BUTTON' || el.closest('.save-controls') || el.closest('.contact-buttons') || 
                        el.closest('.photo-controls') || el.closest('.image-scale-controls')) return;
                    
                    // Generate a valid ID if needed
                    let id = el.id;
                    if (!id || id.trim() === '' || id === '#') {
                        id = 'text-' + Math.random().toString(36).substr(2, 9);
                        el.id = id;
                    }
                    // Preserve HTML structure including line breaks (<br> tags)
                    textContent[id] = el.innerHTML || el.innerText || el.textContent;
                });
                
                // Get all product names
                document.querySelectorAll('.product-name-input').forEach((input, index) => {
                    // Generate a valid ID if needed
                    let id = input.id;
                    if (!id || id.trim() === '' || id === '#') {
                        id = 'product-name-' + index;
                        input.id = id;
                    }
                    textContent[id] = input.value || input.textContent;
                });
                
                console.log('SAVE: Found', Object.keys(textContent).length, 'text elements');
                
                // Get all uploaded images with their base64 data
                const imageData = {};
                const imageContainerMap = new Map(); // Map to track which container has which image
                
                // Get all uploaded images (by src data URI or base64)
                document.querySelectorAll('img.uploaded-image, img[src^="data:"]').forEach((img, index) => {
                    let base64Data = null;
                    
                    // Try to get base64 from dataset first
                    if (img.dataset.base64) {
                        base64Data = img.dataset.base64;
                    } else if (img.src && img.src.startsWith('data:image')) {
                        // Get from src if it's a data URI
                        base64Data = img.src;
                    }
                    
                    if (base64Data) {
                        // Find the container to track structure
                        const container = img.closest('.photo-container, .editable-image, .image-placeholder');
                        const photoBlock = img.closest('.photo-block');
                        
                        if (photoBlock) {
                            // Use a unique identifier based on container structure
                            const productRow = photoBlock.closest('.product-row');
                            if (productRow) {
                                const productIndex = productRow.dataset.productIndex || 
                                    Array.from(document.querySelectorAll('.product-row')).indexOf(productRow);
                                
                                // Find the swipeable container that contains this photo block
                                const swipeableContainer = photoBlock.closest('.photo-swipeable-container');
                                // Get all photo blocks in the swipeable container (including hidden ones)
                                const allPhotoBlocks = swipeableContainer ? 
                                    Array.from(swipeableContainer.querySelectorAll('.photo-block')) :
                                    Array.from(photoBlock.parentElement.querySelectorAll('.photo-block'));
                                
                                const photoIndex = allPhotoBlocks.indexOf(photoBlock);
                                const id = `product-${productIndex}-photo-${photoIndex}`;
                                imageData[id] = base64Data;
                                imageContainerMap.set(id, { container, photoBlock, productRow, swipeableContainer });
                            } else {
                                // Generate a valid ID if needed
                                let id = img.id;
                                if (!id || id.trim() === '' || id === '#') {
                                    id = 'img-' + Math.random().toString(36).substr(2, 9);
                                    img.id = id;
                                }
                                imageData[id] = base64Data;
                                imageContainerMap.set(id, { container, photoBlock: null, productRow: null });
                            }
                        } else {
                            // Generate a valid ID if needed
                            let id = img.id;
                            if (!id || id.trim() === '' || id === '#') {
                                id = 'img-' + Math.random().toString(36).substr(2, 9);
                                img.id = id;
                            }
                            imageData[id] = base64Data;
                            imageContainerMap.set(id, { container, photoBlock: null, productRow: null });
                        }
                    }
                });
                
                console.log('SAVE: Found', Object.keys(imageData).length, 'images');
                
                // Generate the HTML with all changes - wrap in try-catch
                let htmlContent;
                try {
                    console.log('SAVE: Generating HTML...');
                    htmlContent = generateHTML(textContent, imageData, imageContainerMap);
                    console.log('SAVE: HTML generated, length:', htmlContent.length);
                } catch (error) {
                    console.error('SAVE: Error generating HTML:', error);
                    saveStatus.textContent = '✗ Error: Failed to generate HTML - ' + error.message;
                    saveStatus.style.color = '#dc3545';
                    setTimeout(() => {
                        saveStatus.textContent = '';
                    }, 5000);
                    return;
                }
                
                // Create download
                try {
                    console.log('SAVE: Creating download...');
                    const blob = new Blob([htmlContent], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'index.html';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                    saveStatus.textContent = '✓ Saved! HTML file downloaded.';
                    saveStatus.style.color = '#4caf50';
                    console.log('SAVE: Complete');
                } catch (error) {
                    console.error('SAVE: Error creating download:', error);
                    saveStatus.textContent = '✗ Error: Failed to create download - ' + error.message;
                    saveStatus.style.color = '#dc3545';
                }
                
                setTimeout(() => {
                    saveStatus.textContent = '';
                }, 3000);
            } catch (error) {
                console.error('SAVE: Unexpected error:', error);
                saveStatus.textContent = '✗ Error: ' + (error.message || 'Unknown error occurred');
                saveStatus.style.color = '#dc3545';
                setTimeout(() => {
                    saveStatus.textContent = '';
                }, 5000);
            }
        });
    }
    
    function generateHTML(textContent, imageData, imageContainerMap) {
        try {
            console.log('GENERATE HTML: Starting...');
            
            // For very large documents, use a more efficient approach
            // Create a clone of the document
            console.log('GENERATE HTML: Cloning document...');
            const clone = document.cloneNode(true);
            console.log('GENERATE HTML: Document cloned');
            
            // Remove save controls
            const saveControls = clone.querySelector('.save-controls');
            if (saveControls) saveControls.remove();
            
            // Remove editor script
            const scripts = clone.querySelectorAll('script[src="editor.js"]');
            scripts.forEach(s => s.remove());
            
            // Remove all editor UI elements
            clone.querySelectorAll('.add-photo-btn, .change-image-btn, .photo-delete-btn, .text-delete-btn, .section-delete-btn, .photo-controls, .image-scale-controls, .photo-nav-prev, .photo-nav-next').forEach(el => el.remove());
            
            // Update all text content
            Object.keys(textContent).forEach(id => {
                // Skip empty or invalid IDs
                if (!id || id === '#' || id.trim() === '') return;
                
                try {
                    const el = clone.getElementById(id);
                    if (el) {
                        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                            el.value = textContent[id];
                        } else {
                            // Preserve HTML structure including line breaks
                            el.innerHTML = textContent[id];
                        }
                        el.removeAttribute('contenteditable');
                        el.removeAttribute('id');
                        el.classList.remove('editable-text');
                    }
                } catch (error) {
                    console.warn('SAVE: Could not find element with ID:', id, error);
                }
            });
            
            // Update all product names - convert inputs to display text
            clone.querySelectorAll('.product-name-input').forEach((input, index) => {
                try {
                    // Get the corresponding input from the original document by index
                    const originalInputs = Array.from(document.querySelectorAll('.product-name-input'));
                    let productName = '';
                    
                    if (originalInputs[index] && originalInputs[index].value) {
                        productName = originalInputs[index].value;
                    } else if (input.value) {
                        productName = input.value;
                    } else if (input.id && input.id !== '#' && input.id.trim() !== '') {
                        // Try to find by ID if available and valid
                        try {
                            const originalInput = document.getElementById(input.id);
                            if (originalInput && originalInput.value) {
                                productName = originalInput.value;
                            }
                        } catch (e) {
                            // ID selector failed, skip
                            console.warn('SAVE: Invalid ID selector:', input.id);
                        }
                    }
                    
                    // Convert input to text element if we have a product name
                    if (productName && productName.trim() !== '') {
                        // Create a heading element to replace the input
                        const nameElement = document.createElement('h3');
                        nameElement.className = 'product-name';
                        nameElement.textContent = productName.trim();
                        
                        // Apply styling to match the input
                        nameElement.style.cssText = 'font-size: 1.4rem; font-weight: 600; font-family: Inter, sans-serif; text-align: center; color: var(--cream); margin-bottom: 20px; padding: 15px 20px; background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 10px;';
                        
                        // Replace input with text element
                        const productHeader = input.closest('.product-header');
                        if (productHeader) {
                            input.replaceWith(nameElement);
                        } else {
                            // If no header, create one and wrap the name
                            const header = document.createElement('div');
                            header.className = 'product-header';
                            header.appendChild(nameElement);
                            input.parentNode.insertBefore(header, input);
                            input.remove();
                        }
                    } else {
                        // No value, remove the input and its container if empty
                        const productHeader = input.closest('.product-header');
                        if (productHeader && productHeader.children.length === 1) {
                            productHeader.remove();
                        } else {
                            input.remove();
                        }
                    }
                } catch (error) {
                    console.warn('SAVE: Error updating product name:', error);
                }
            });
            
            // Update all images - handle product rows specially
            Object.keys(imageData).forEach(id => {
                // Skip empty or invalid IDs
                if (!id || id === '#' || id.trim() === '') return;
                
                let img = null;
                
                // Try to find by ID first (if it's not a product-* ID)
                if (!id.startsWith('product-')) {
                    try {
                        img = clone.getElementById(id);
                    } catch (error) {
                        console.warn('SAVE: Invalid ID selector:', id, error);
                    }
                }
                
                // If not found by ID, try to find by container structure
                if (!img && id.startsWith('product-')) {
                    const match = id.match(/product-(\d+)-photo-(\d+)/);
                    if (match) {
                        const productIndex = parseInt(match[1]);
                        const photoIndex = parseInt(match[2]);
                        const productRows = clone.querySelectorAll('.product-row');
                        if (productRows[productIndex]) {
                            // Find all photo blocks in swipeable containers
                            const swipeableContainers = productRows[productIndex].querySelectorAll('.photo-swipeable-container');
                            let photoBlocks = [];
                            // Collect all photo blocks from all swipeable containers
                            swipeableContainers.forEach(container => {
                                photoBlocks = photoBlocks.concat(Array.from(container.querySelectorAll('.photo-block')));
                            });
                            // If no swipeable containers, get all photo blocks directly
                            if (photoBlocks.length === 0) {
                                photoBlocks = Array.from(productRows[productIndex].querySelectorAll('.photo-block'));
                            }
                            if (photoBlocks[photoIndex]) {
                                img = photoBlocks[photoIndex].querySelector('img.uploaded-image, img[src^="data:"]');
                            }
                        }
                    }
                }
                
                if (img && imageData[id]) {
                    // Get the original image from the actual document to preserve styles
                    let originalImg = null;
                    if (!id.startsWith('product-')) {
                        try {
                            originalImg = document.getElementById(id);
                        } catch (e) {}
                    } else {
                        // For product photos, find by structure
                        const match = id.match(/product-(\d+)-photo-(\d+)/);
                        if (match) {
                            const productIndex = parseInt(match[1]);
                            const photoIndex = parseInt(match[2]);
                            const productRows = document.querySelectorAll('.product-row');
                            if (productRows[productIndex]) {
                                // Find all photo blocks in swipeable containers
                                const swipeableContainers = productRows[productIndex].querySelectorAll('.photo-swipeable-container');
                                let photoBlocks = [];
                                // Collect all photo blocks from all swipeable containers
                                swipeableContainers.forEach(container => {
                                    photoBlocks = photoBlocks.concat(Array.from(container.querySelectorAll('.photo-block')));
                                });
                                // If no swipeable containers, get all photo blocks directly
                                if (photoBlocks.length === 0) {
                                    photoBlocks = Array.from(productRows[productIndex].querySelectorAll('.photo-block'));
                                }
                                if (photoBlocks[photoIndex]) {
                                    originalImg = photoBlocks[photoIndex].querySelector('img.uploaded-image, img[src^="data:"]');
                                }
                            }
                        }
                    }
                    
                    img.src = imageData[id];
                    img.style.display = 'block';
                    
                    // Preserve original styles if available
                    if (originalImg) {
                        // Preserve object-fit and object-position (for crop/position)
                        if (originalImg.style.objectFit) {
                            img.style.objectFit = originalImg.style.objectFit;
                        } else {
                            img.style.objectFit = 'cover';
                        }
                        
                        if (originalImg.style.objectPosition) {
                            img.style.objectPosition = originalImg.style.objectPosition;
                        }
                        
                        // Preserve transform/scale if set
                        if (originalImg.style.transform) {
                            img.style.transform = originalImg.style.transform;
                        }
                        
                        // Preserve width/height if explicitly set
                        if (originalImg.style.width && originalImg.style.width !== '100%') {
                            img.style.width = originalImg.style.width;
                        } else {
                            img.style.width = '100%';
                        }
                        
                        if (originalImg.style.height && originalImg.style.height !== '100%') {
                            img.style.height = originalImg.style.height;
                        } else {
                            img.style.height = '100%';
                        }
                    } else {
                        // Default styles
                        img.style.width = '100%';
                        img.style.height = '100%';
                        img.style.objectFit = 'cover';
                    }
                    
                    img.removeAttribute('id');
                    img.removeAttribute('data-base64');
                    // Keep uploaded-image class for styling, but clean it up later if needed
                    
                    // Clean up container
                    const container = img.closest('.photo-container, .editable-image, .image-placeholder');
                    if (container) {
                        container.classList.remove('editable-image');
                        container.classList.add('image-placeholder');
                        
                        // Remove all editor elements
                        container.querySelectorAll('.image-input, .image-label, .placeholder-text, .photo-delete-btn, .change-image-btn').forEach(el => el.remove());
                    }
                }
            });
            
            // Process all product rows - ensure all photos are visible and properly styled
            clone.querySelectorAll('.product-row').forEach((productRow, rowIndex) => {
                // Get corresponding original product row to preserve styles
                const originalRows = document.querySelectorAll('.product-row');
                const originalRow = originalRows[rowIndex];
                
                // Collect all photo blocks from all swipeable containers
                let allPhotoBlocks = [];
                const swipeableContainers = productRow.querySelectorAll('.photo-swipeable-container');
                swipeableContainers.forEach(container => {
                    allPhotoBlocks = allPhotoBlocks.concat(Array.from(container.querySelectorAll('.photo-block')));
                });
                // Also get any photo blocks not in swipeable containers
                const otherPhotoBlocks = Array.from(productRow.querySelectorAll('.photo-block')).filter(block => 
                    !block.closest('.photo-swipeable-container')
                );
                allPhotoBlocks = allPhotoBlocks.concat(otherPhotoBlocks);
                
                // For saved HTML: Keep swipeable behavior - show only first photo initially
                // But ensure all photos are in the DOM and accessible
                const hasMultiplePhotos = allPhotoBlocks.length > 1;
                allPhotoBlocks.forEach((photoBlock, blockIndex) => {
                    // In saved HTML, if multiple photos exist, show only first initially
                    // Others will be shown via swipe
                    if (hasMultiplePhotos) {
                        photoBlock.style.display = blockIndex === 0 ? 'block' : 'none';
                    } else {
                        photoBlock.style.display = 'block';
                    }
                    const img = photoBlock.querySelector('img');
                    
                    if (img && img.src && img.src.startsWith('data:')) {
                        img.style.display = 'block';
                        
                        // Find corresponding original photo block to preserve styles
                        if (originalRow) {
                            // Find all original photo blocks in same order
                            const originalSwipeableContainers = originalRow.querySelectorAll('.photo-swipeable-container');
                            let originalAllPhotoBlocks = [];
                            originalSwipeableContainers.forEach(container => {
                                originalAllPhotoBlocks = originalAllPhotoBlocks.concat(Array.from(container.querySelectorAll('.photo-block')));
                            });
                            const originalOtherPhotoBlocks = Array.from(originalRow.querySelectorAll('.photo-block')).filter(block => 
                                !block.closest('.photo-swipeable-container')
                            );
                            originalAllPhotoBlocks = originalAllPhotoBlocks.concat(originalOtherPhotoBlocks);
                            
                            const originalBlock = originalAllPhotoBlocks[blockIndex];
                            if (originalBlock) {
                                const originalImg = originalBlock.querySelector('img.uploaded-image, img[src^="data:"]');
                                if (originalImg) {
                                    // Preserve all image styles
                                    if (originalImg.style.objectFit) {
                                        img.style.objectFit = originalImg.style.objectFit;
                                    }
                                    if (originalImg.style.objectPosition) {
                                        img.style.objectPosition = originalImg.style.objectPosition;
                                    }
                                    if (originalImg.style.transform) {
                                        img.style.transform = originalImg.style.transform;
                                    }
                                    if (originalImg.style.width) {
                                        img.style.width = originalImg.style.width;
                                    }
                                    if (originalImg.style.height) {
                                        img.style.height = originalImg.style.height;
                                    }
                                }
                            }
                        }
                    }
                });
                
                // Keep swipeable functionality in saved HTML - don't remove navigation, add swipe support
                productRow.querySelectorAll('.photo-swipeable-container').forEach(container => {
                    // Remove editor-specific buttons only
                    container.querySelectorAll('.add-photo-btn').forEach(el => el.remove());
                    
                    // Keep navigation buttons and add swipe support to saved HTML
                    const photos = Array.from(container.querySelectorAll('.photo-block'));
                    const totalPhotos = photos.length;
                    
                    if (totalPhotos > 1) {
                        // Ensure swipe indicators are visible
                        let indicatorContainer = container.parentElement.querySelector('.swipe-indicators');
                        if (!indicatorContainer) {
                            indicatorContainer = document.createElement('div');
                            indicatorContainer.className = 'swipe-indicators';
                            indicatorContainer.style.cssText = 'display: flex; justify-content: center; gap: 8px; margin-top: 10px; margin-bottom: 5px; padding: 5px;';
                            container.parentElement.insertBefore(indicatorContainer, container.nextSibling);
                        }
                        
                        // Create dots for each photo
                        indicatorContainer.innerHTML = ''; // Clear existing
                        for (let i = 0; i < totalPhotos; i++) {
                            const dot = document.createElement('div');
                            dot.className = 'swipe-dot';
                            dot.style.cssText = `width: 8px; height: 8px; border-radius: 50%; background: ${i === 0 ? 'rgba(255, 215, 0, 0.9)' : 'rgba(255, 255, 255, 0.3)'}; transition: all 0.3s ease; cursor: pointer;`;
                            indicatorContainer.appendChild(dot);
                        }
                        
                        // Add swipe hint
                        let swipeHint = container.parentElement.querySelector('.swipe-hint');
                        if (!swipeHint) {
                            swipeHint = document.createElement('div');
                            swipeHint.className = 'swipe-hint';
                            swipeHint.innerHTML = '← Swipe to see more →';
                            swipeHint.style.cssText = 'text-align: center; color: rgba(255, 255, 255, 0.6); font-size: 0.85rem; margin-top: 5px; margin-bottom: 10px; padding: 5px;';
                            container.parentElement.insertBefore(swipeHint, container.nextSibling);
                        }
                        
                        // Add touch swipe support
                        let startX = 0;
                        let isDragging = false;
                        let currentIndex = 0;
                        container.dataset.currentIndex = '0';
                        
                        container.addEventListener('touchstart', function(e) {
                            startX = e.touches[0].clientX;
                            isDragging = true;
                        });
                        
                        container.addEventListener('touchend', function(e) {
                            if (!isDragging) return;
                            isDragging = false;
                            currentIndex = parseInt(container.dataset.currentIndex) || 0;
                            const endX = e.changedTouches[0].clientX;
                            const diff = startX - endX;
                            const threshold = 50;
                            
                            if (Math.abs(diff) > threshold) {
                                if (diff > 0 && currentIndex < totalPhotos - 1) {
                                    photos[currentIndex].style.display = 'none';
                                    currentIndex++;
                                    container.dataset.currentIndex = currentIndex.toString();
                                    photos[currentIndex].style.display = 'block';
                                    updateSavedIndicators(indicatorContainer, currentIndex, totalPhotos);
                                } else if (diff < 0 && currentIndex > 0) {
                                    photos[currentIndex].style.display = 'none';
                                    currentIndex--;
                                    container.dataset.currentIndex = currentIndex.toString();
                                    photos[currentIndex].style.display = 'block';
                                    updateSavedIndicators(indicatorContainer, currentIndex, totalPhotos);
                                }
                            }
                        });
                        
                        function updateSavedIndicators(container, current, total) {
                            const dots = container.querySelectorAll('.swipe-dot');
                            dots.forEach((dot, index) => {
                                dot.style.background = index === current ? 'rgba(255, 215, 0, 0.9)' : 'rgba(255, 255, 255, 0.3)';
                            });
                        }
                    }
                });
            });
            
            // Clean up remaining editable elements
            clone.querySelectorAll('.editable-image, .photo-container').forEach(container => {
                const img = container.querySelector('img.uploaded-image, img[src^="data:"]');
                if (img && img.src && img.src.startsWith('data:')) {
                    // Has image, clean up editor elements
                    container.classList.remove('editable-image');
                    container.querySelectorAll('.image-input, .image-label, .placeholder-text, .photo-delete-btn, .change-image-btn, .photo-controls').forEach(el => el.remove());
                } else {
                    // No image, keep placeholder structure
                    container.classList.remove('editable-image');
                    container.querySelectorAll('.image-input, .image-label').forEach(el => el.remove());
                }
            });
            
            // Remove all contenteditable attributes
            clone.querySelectorAll('[contenteditable]').forEach(el => {
                el.removeAttribute('contenteditable');
                el.classList.remove('editable-text');
            });
            
            // Remove all product-name-input elements that might still exist
            clone.querySelectorAll('.product-name-input').forEach(input => {
                // These should have been converted already, but remove any remaining ones
                const productHeader = input.closest('.product-header');
                if (productHeader && productHeader.children.length === 1 && productHeader.children[0] === input) {
                    productHeader.remove();
                } else {
                    input.remove();
                }
            });
            
            // Remove all data attributes used by editor
            clone.querySelectorAll('[data-photo-id], [data-current-index], [data-listener], [data-scale-initialized], [data-has-listeners], [data-product-index]').forEach(el => {
                el.removeAttribute('data-photo-id');
                el.removeAttribute('data-current-index');
                el.removeAttribute('data-listener');
                el.removeAttribute('data-scale-initialized');
                el.removeAttribute('data-has-listeners');
                el.removeAttribute('data-product-index');
            });
            
            // Get HTML
            let html = clone.documentElement.outerHTML;
            
            // Clean up any remaining editor artifacts
            html = html.replace(/contenteditable="true"/gi, '');
            html = html.replace(/class="([^"]*)\beditable-text\b([^"]*)"/gi, 'class="$1$2"');
            html = html.replace(/class="([^"]*)\beditable-image\b([^"]*)"/gi, 'class="$1$2"');
            
            // Remove any remaining product-name-input elements
            html = html.replace(/<input[^>]*class="[^"]*product-name-input[^"]*"[^>]*>/gi, '');
            
            // Clean up empty product-header divs
            html = html.replace(/<div[^>]*class="[^"]*product-header[^"]*"[^>]*>\s*<\/div>/gi, '');
            
            // Add inline script for swipe functionality in saved HTML
            const swipeScript = `
            <script>
            (function() {
                // Initialize swipe functionality for all swipeable containers
                function initSwipeForContainer(container) {
                    const photos = Array.from(container.querySelectorAll('.photo-block'));
                    const totalPhotos = photos.length;
                    if (totalPhotos <= 1) return;
                    
                    let currentIndex = 0;
                    container.dataset.currentIndex = '0';
                    const indicatorContainer = container.parentElement.querySelector('.swipe-indicators');
                    
                    function updateIndicators() {
                        if (!indicatorContainer) return;
                        const dots = indicatorContainer.querySelectorAll('.swipe-dot');
                        dots.forEach((dot, index) => {
                            dot.style.background = index === currentIndex ? 'rgba(255, 215, 0, 0.9)' : 'rgba(255, 255, 255, 0.3)';
                        });
                    }
                    
                    // Touch swipe support
                    let startX = 0;
                    let isDragging = false;
                    
                    container.addEventListener('touchstart', function(e) {
                        startX = e.touches[0].clientX;
                        isDragging = true;
                    });
                    
                    container.addEventListener('touchend', function(e) {
                        if (!isDragging) return;
                        isDragging = false;
                        currentIndex = parseInt(container.dataset.currentIndex) || 0;
                        const endX = e.changedTouches[0].clientX;
                        const diff = startX - endX;
                        const threshold = 50;
                        
                        if (Math.abs(diff) > threshold) {
                            if (diff > 0 && currentIndex < totalPhotos - 1) {
                                photos[currentIndex].style.display = 'none';
                                currentIndex++;
                                container.dataset.currentIndex = currentIndex.toString();
                                photos[currentIndex].style.display = 'block';
                                updateIndicators();
                            } else if (diff < 0 && currentIndex > 0) {
                                photos[currentIndex].style.display = 'none';
                                currentIndex--;
                                container.dataset.currentIndex = currentIndex.toString();
                                photos[currentIndex].style.display = 'block';
                                updateIndicators();
                            }
                        }
                    });
                    
                    // Dot click support
                    if (indicatorContainer) {
                        indicatorContainer.querySelectorAll('.swipe-dot').forEach((dot, index) => {
                            dot.addEventListener('click', function() {
                                if (index !== currentIndex) {
                                    photos[currentIndex].style.display = 'none';
                                    currentIndex = index;
                                    container.dataset.currentIndex = currentIndex.toString();
                                    photos[currentIndex].style.display = 'block';
                                    updateIndicators();
                                }
                            });
                        });
                    }
                    
                    updateIndicators();
                }
                
                // Initialize all swipeable containers when DOM is ready
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', function() {
                        document.querySelectorAll('.photo-swipeable-container').forEach(initSwipeForContainer);
                    });
                } else {
                    document.querySelectorAll('.photo-swipeable-container').forEach(initSwipeForContainer);
                }
            })();
            </script>`;
            
            // Insert script before closing </body> tag
            if (html.includes('</body>')) {
                html = html.replace('</body>', swipeScript + '</body>');
            } else if (html.includes('</html>')) {
                html = html.replace('</html>', swipeScript + '</html>');
            } else {
                html += swipeScript;
            }
            
            // Remove inline display styles that hide elements (but keep other styles)
            // Only remove display:none and display:block when they're the only style
            html = html.replace(/style="\s*display:\s*none\s*"/gi, '');
            html = html.replace(/style="\s*display:\s*block\s*"/gi, '');
            // For styles with multiple properties, only remove display:none and display:block
            html = html.replace(/;\s*display:\s*none\s*(;|")/gi, '$1');
            html = html.replace(/display:\s*none\s*;/gi, '');
            html = html.replace(/;\s*display:\s*block\s*(;|")/gi, '$1');
            html = html.replace(/display:\s*block\s*;/gi, '');
        
            // Format
            html = formatHTML(html);
            
            console.log('GENERATE HTML: Complete');
            return '<!DOCTYPE html>\n' + html;
        } catch (error) {
            console.error('GENERATE HTML: Error:', error);
            throw error; // Re-throw to be caught by caller
        }
    }
    
    function formatHTML(html) {
        try {
            // For very large files, skip formatting to avoid hanging
            if (html.length > 5000000) { // 5MB
                console.log('HTML too large (' + (html.length / 1000000).toFixed(2) + 'MB), skipping formatting');
                return html;
            }
            
            // Basic formatting - add line breaks after tags
            let formatted = html.replace(/></g, '>\n<');
            let indent = 0;
            const lines = formatted.split('\n');
            
            // Limit processing to avoid hanging on huge files
            if (lines.length > 100000) {
                console.log('Too many lines (' + lines.length + '), skipping indentation');
                return formatted;
            }
            
            formatted = lines.map(line => {
                line = line.trim();
                if (!line) return '';
                if (line.startsWith('</')) indent--;
                const indented = '  '.repeat(Math.max(0, indent)) + line;
                if (line.startsWith('<') && !line.startsWith('</') && !line.endsWith('/>') && !line.includes('<script') && !line.includes('<style')) indent++;
                return indented;
            }).filter(line => line).join('\n');
            
            return formatted;
        } catch (error) {
            console.error('Error formatting HTML:', error);
            return html; // Return unformatted HTML if formatting fails
        }
    }
    
    // RESTORE EDITING FUNCTIONALITY: Make all text editable
    function makeTextEditable() {
        console.log('Making text editable...');
        // Find all text elements (p, h1, h2, h3, span with text)
        const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, .intro-text, .section-title, .feature-title, .feature-description, .closing-text, .footer-text, .footer-subtext');
        
        textElements.forEach(el => {
            // Skip if already editable or if it's empty or contains only images
            if (el.classList.contains('editable-text') || el.querySelector('img')) return;
            
            // Skip if it's a delete button or other UI element
            if (el.closest('.section-delete-btn') || el.closest('.save-controls') || el.closest('.contact-buttons') || el.closest('.contact-btn') || el.closest('.text-delete-btn') || el.closest('.photo-delete-btn')) return;
            
            el.classList.add('editable-text');
            el.setAttribute('contenteditable', 'true');
            
            // Only add event listeners if they don't already exist
            if (!el.dataset.hasListeners) {
                el.addEventListener('focus', function() {
                    this.style.outline = '2px dashed var(--burgundy)';
                    this.style.backgroundColor = 'rgba(128, 0, 32, 0.05)';
                });
                el.addEventListener('blur', function() {
                    this.style.outline = '';
                    this.style.backgroundColor = '';
                });
                el.dataset.hasListeners = 'true';
            }
            console.log('Made editable:', el.tagName, el.textContent.substring(0, 30));
        });
    }
    
    // RESTORE IMAGE UPLOAD FUNCTIONALITY: Add upload inputs to all images
    function addImageUploads() {
        console.log('Adding image upload functionality...');
        // Find all images and image containers
        const images = document.querySelectorAll('img');
        const placeholders = document.querySelectorAll('.image-placeholder, .hero-image-placeholder, .gallery-item');
        
        // Process existing images
        images.forEach(img => {
            // Skip if already has upload input or is inside a button/control
            if (img.closest('.section-delete-btn') || img.closest('.save-controls') || 
                img.closest('.contact-buttons') || img.closest('.image-scale-controls') ||
                img.closest('.gallery-nav')) return;
            
            // Find or create container
            let container = img.closest('.editable-image') || img.closest('.image-placeholder') || img.parentElement;
            
            // If container doesn't exist, wrap the image
            if (!container.classList.contains('editable-image') && !container.classList.contains('image-placeholder')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'editable-image';
                wrapper.style.position = 'relative';
                img.parentNode.insertBefore(wrapper, img);
                wrapper.appendChild(img);
                container = wrapper;
            }
            
            container.classList.add('editable-image');
            
            // Check if upload input already exists
            if (container.querySelector('.image-input')) return;
            
            // Create upload input
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.className = 'image-input';
            input.id = `image-input-${Math.random().toString(36).substr(2, 9)}`;
            input.style.display = 'none';
            
            // Create label
            const label = document.createElement('label');
            label.htmlFor = input.id;
            label.className = 'image-label';
            label.textContent = '📷 Upload Image';
            label.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(128, 0, 32, 0.8); color: white; padding: 10px 20px; border-radius: 5px; cursor: pointer; z-index: 10;';
            
            // Create uploaded image element if it doesn't exist
            let uploadedImg = container.querySelector('.uploaded-image');
            if (!uploadedImg) {
                uploadedImg = document.createElement('img');
                uploadedImg.className = 'uploaded-image';
                uploadedImg.id = `uploaded-img-${Math.random().toString(36).substr(2, 9)}`;
                uploadedImg.style.display = 'none';
                container.appendChild(uploadedImg);
            }
            
            // Handle file upload
            input.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        label.style.display = 'none';
                        uploadedImg.src = event.target.result;
                        uploadedImg.style.display = 'block';
                        uploadedImg.style.width = '100%';
                        uploadedImg.style.height = '100%';
                        uploadedImg.style.objectFit = 'cover';
                        uploadedImg.dataset.base64 = event.target.result;
                        
                        // Initialize scaling
                        initImageScaling(uploadedImg);
                    };
                    reader.readAsDataURL(file);
                }
            });
            
            container.appendChild(input);
            if (!img.src || img.src.startsWith('data:image')) {
                container.appendChild(label);
            }
            
            // Move existing image into uploaded-image if it has a src
            if (img.src && !img.classList.contains('uploaded-image')) {
                uploadedImg.src = img.src;
                uploadedImg.style.display = 'block';
                uploadedImg.style.width = '100%';
                uploadedImg.style.height = '100%';
                uploadedImg.style.objectFit = 'cover';
                img.style.display = 'none';
                initImageScaling(uploadedImg);
            }
        });
        
        // Process placeholders
        placeholders.forEach(placeholder => {
            if (placeholder.querySelector('.image-input')) return;
            
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.className = 'image-input';
            input.id = `image-input-${Math.random().toString(36).substr(2, 9)}`;
            input.style.display = 'none';
            
            const label = document.createElement('label');
            label.htmlFor = input.id;
            label.className = 'image-label';
            label.textContent = '📷 Upload Image';
            label.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(128, 0, 32, 0.8); color: white; padding: 10px 20px; border-radius: 5px; cursor: pointer; z-index: 10;';
            
            let uploadedImg = placeholder.querySelector('.uploaded-image');
            if (!uploadedImg) {
                uploadedImg = document.createElement('img');
                uploadedImg.className = 'uploaded-image';
                uploadedImg.id = `uploaded-img-${Math.random().toString(36).substr(2, 9)}`;
                uploadedImg.style.display = 'none';
                placeholder.appendChild(uploadedImg);
            }
            
            input.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        if (placeholder.querySelector('.placeholder-text')) {
                            placeholder.querySelector('.placeholder-text').style.display = 'none';
                        }
                        label.style.display = 'none';
                        uploadedImg.src = event.target.result;
                        uploadedImg.style.display = 'block';
                        uploadedImg.style.width = '100%';
                        uploadedImg.style.height = '100%';
                        uploadedImg.style.objectFit = 'cover';
                        uploadedImg.dataset.base64 = event.target.result;
                        initImageScaling(uploadedImg);
                    };
                    reader.readAsDataURL(file);
                }
            });
            
            placeholder.appendChild(input);
            if (!placeholder.querySelector('.uploaded-image[style*="display: block"]')) {
                placeholder.appendChild(label);
            }
        });
        
        // Visual feedback for image containers
        const imageContainers = document.querySelectorAll('.editable-image, .image-placeholder');
        imageContainers.forEach(container => {
            container.addEventListener('mouseenter', function() {
                if (!this.querySelector('.uploaded-image[style*="display: block"]')) {
                    this.style.border = '2px dashed var(--burgundy)';
                }
            });
            container.addEventListener('mouseleave', function() {
                this.style.border = '';
            });
        });
    }
    
    // Add delete buttons to all text blocks
    function addTextDeleteButtons() {
        try {
            console.log('TEXT DELETE: Starting to add text delete buttons...');
            const textElements = document.querySelectorAll('.editable-text, p, h1, h2, h3, h4, h5, h6, .section-title, .overlay-title, .overlay-subtitle, .image-caption, .testimonial-label, .showcase-text');
            console.log('TEXT DELETE: Found text elements:', textElements.length);
            textElements.forEach((textEl, index) => {
                // Skip if already has delete button or is inside a photo block
                if (textEl.querySelector('.text-delete-btn') || textEl.closest('.photo-block')) {
                    return;
                }
                
                // Skip if parent already has delete button
                if (textEl.parentElement && textEl.parentElement.querySelector('.text-delete-btn')) {
                    return;
                }
                
                // Skip if text element is empty or just whitespace
                if (!textEl.textContent || textEl.textContent.trim() === '') {
                    return;
                }
                
                console.log(`TEXT DELETE: Processing text element ${index}:`, textEl);
                
                // Make sure text element itself is positioned relatively
                const computedStyle = window.getComputedStyle(textEl);
                if (computedStyle.position === 'static') {
                    textEl.style.position = 'relative';
                }
                
                // Make sure parent is also positioned relatively if needed
                const parent = textEl.parentElement;
                if (parent) {
                    const parentStyle = window.getComputedStyle(parent);
                    if (parentStyle.position === 'static') {
                        parent.style.position = 'relative';
                    }
                }
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'text-delete-btn';
                deleteBtn.innerHTML = '×';
                deleteBtn.title = 'Delete this text block';
                deleteBtn.setAttribute('type', 'button');
                deleteBtn.style.cssText = 'position: absolute !important; top: -12px !important; right: -12px !important; background: rgba(220, 53, 69, 0.9) !important; backdrop-filter: blur(10px) !important; border: none !important; color: white !important; width: 28px !important; height: 28px !important; border-radius: 50% !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; font-size: 16px !important; z-index: 10000 !important; opacity: 1 !important; transition: all 0.3s ease !important; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important; pointer-events: auto !important;';
                
                // Make sure button is always on top
                deleteBtn.addEventListener('mousedown', function(e) {
                    console.log('TEXT DELETE BUTTON MOUSEDOWN!', e);
                    e.stopPropagation();
                    // Don't prevent default on mousedown, let click handle it
                }, true); // Use capture phase
                
                deleteBtn.addEventListener('click', function(e) {
                    console.log('TEXT DELETE BUTTON CLICKED!', e, textEl);
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    // Don't prevent default - we want the click to work
                    console.log('About to show confirm dialog for text');
                    const confirmed = confirm('Are you sure you want to delete this text block?');
                    console.log('User confirmed:', confirmed);
                    if (confirmed) {
                        console.log('Deleting text element:', textEl);
                        textEl.style.transition = 'opacity 0.3s ease';
                        textEl.style.opacity = '0';
                        setTimeout(() => {
                            console.log('Removing text element from DOM');
                            textEl.remove();
                        }, 300);
                    }
                    return false;
                }, true); // Use capture phase
                
                // Append delete button to the text element - make sure it's the last child
                textEl.appendChild(deleteBtn);
                console.log(`TEXT DELETE: Added delete button to text element ${index}`);
                
                // Force button to be on top
                setTimeout(() => {
                    deleteBtn.style.zIndex = '10000';
                    deleteBtn.style.pointerEvents = 'auto';
                }, 10);
            });
            console.log('TEXT DELETE: Finished adding text delete buttons');
        } catch (error) {
            console.error('Error adding text delete buttons:', error);
        }
    }
    
    // Call these functions to restore editing - but NOT text delete buttons yet
    // Text delete buttons will be added AFTER product rows are initialized
    makeTextEditable();
    addImageUploads();
    // Don't call addTextDeleteButtons here - it will be called after product rows init
    setTimeout(() => {
        makeTextEditable();
        addImageUploads();
    }, 500);
    setTimeout(() => {
        makeTextEditable();
        addImageUploads();
    }, 1000);

    // 1. ADD DELETE BUTTONS TO ALL SECTIONS
    function addDeleteButtons() {
        try {
            const sections = document.querySelectorAll('section');
            console.log('DELETE BUTTONS: Found sections:', sections.length);
            
            if (sections.length === 0) {
                console.warn('DELETE BUTTONS: No sections found!');
                return;
            }
            
            let added = 0;
            sections.forEach((section, index) => {
                // Skip if delete button already exists
                if (section.querySelector('.section-delete-btn')) {
                    console.log(`DELETE BUTTONS: Section ${index} already has delete button`);
                    return;
                }
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'section-delete-btn';
                deleteBtn.innerHTML = '×';
                deleteBtn.title = 'Delete this section';
                deleteBtn.setAttribute('aria-label', 'Delete section');
                deleteBtn.style.opacity = '1';
                deleteBtn.style.display = 'flex';
                deleteBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    if (confirm('Are you sure you want to delete this section?')) {
                        section.style.transition = 'opacity 0.3s ease';
                        section.style.opacity = '0';
                        setTimeout(() => {
                            section.remove();
                        }, 300);
                    }
                });
                section.style.position = 'relative';
                section.appendChild(deleteBtn);
                added++;
                console.log(`DELETE BUTTONS: Added button to section ${index}`);
            });
            console.log(`DELETE BUTTONS: Added ${added} delete buttons total`);
        } catch (error) {
            console.error('DELETE BUTTONS ERROR:', error);
        }
    }
    
    // DISABLED: Delete buttons removed per user request
    // console.log('DELETE BUTTONS: Calling function now...');
    // addDeleteButtons();
    // setTimeout(() => {
    //     console.log('DELETE BUTTONS: Calling function after 500ms...');
    //     addDeleteButtons();
    // }, 500);
    // setTimeout(() => {
    //     console.log('DELETE BUTTONS: Calling function after 1000ms...');
    //     addDeleteButtons();
    // }, 1000);
    
    // DISABLED: Observer removed per user request (delete buttons are disabled)
    // try {
    //     const observer = new MutationObserver(() => {
    //         setTimeout(addDeleteButtons, 100);
    //     });
    //     observer.observe(document.body, { childList: true, subtree: true });
    // } catch (error) {
    //     console.error('Error setting up observer:', error);
    // }

    // 2. ADD INSTAGRAM AND WHATSAPP BUTTONS UNDER CONTACT ME
    function addContactButtons() {
        try {
            console.log('🔍🔍🔍 CONTACT BUTTONS: FUNCTION CALLED! Starting search...');
            console.log('🔍 CONTACT BUTTONS: Document ready state:', document.readyState);
            
            // Find contact section - check for "CONTACT" in title
            const sections = document.querySelectorAll('section');
            console.log('🔍 CONTACT BUTTONS: Found sections:', sections.length);
            
            if (sections.length === 0) {
                console.error('❌ CONTACT BUTTONS: NO SECTIONS FOUND IN PAGE!');
                // Force add buttons to body for debugging
                const debugDiv = document.createElement('div');
                debugDiv.innerHTML = '🚨 DEBUG: NO SECTIONS FOUND - Adding buttons to body';
                debugDiv.style.cssText = 'background: red !important; color: white !important; padding: 20px !important; margin: 20px !important; font-size: 20px !important; position: fixed !important; top: 0 !important; left: 0 !important; z-index: 99999 !important;';
                document.body.appendChild(debugDiv);
                return;
            }
            
            // Log all section titles for debugging
            sections.forEach((section, index) => {
                const title = section.querySelector('.section-title, h2, h1');
                const titleText = title ? title.textContent : 'NO TITLE';
                console.log(`🔍 CONTACT BUTTONS: Section ${index} title: "${titleText}"`);
            });
            
            let contactSection = null;
            
            sections.forEach((section, index) => {
                const title = section.querySelector('.section-title, h2');
                if (title) {
                    const titleText = title.textContent.toUpperCase();
                    console.log(`CONTACT BUTTONS: Section ${index} title: "${titleText}"`);
                    if (titleText.includes('CONTACT')) {
                        contactSection = section;
                        console.log(`✅ CONTACT BUTTONS: Found contact section at index ${index}`);
                    }
                }
            });
            
            console.log('CONTACT BUTTONS: Contact section found:', !!contactSection);
            
            if (contactSection) {
                const container = contactSection.querySelector('.container') || contactSection;
                console.log('CONTACT BUTTONS: Container found:', container);
                
                // Check if contact buttons already exist
                let contactButtons = container.querySelector('.contact-buttons');
                
                if (!contactButtons) {
                    // Create new contact buttons container
                    contactButtons = document.createElement('div');
                    contactButtons.className = 'contact-buttons';
                    contactButtons.style.display = 'flex';
                    contactButtons.style.gap = '15px';
                    contactButtons.style.marginTop = '30px';
                    contactButtons.style.justifyContent = 'center';
                }
                
                // Check if buttons already exist, if not create them
                let instagramBtn = contactButtons.querySelector('.contact-btn.instagram');
                if (!instagramBtn) {
                    instagramBtn = document.createElement('a');
                    instagramBtn.className = 'contact-btn instagram';
                    instagramBtn.innerHTML = '<span class="contact-btn-icon">📷</span><span class="contact-btn-text">Instagram</span>';
                    instagramBtn.style.display = 'flex';
                    instagramBtn.style.alignItems = 'center';
                    contactButtons.appendChild(instagramBtn);
                }
                
                // Update Instagram button (whether new or existing)
                instagramBtn.href = 'https://www.instagram.com/mandarin.cris?igsh=MXJ3eDZxNGEzZmszOA==';
                instagramBtn.target = '_blank';
                instagramBtn.rel = 'noopener noreferrer';
                
                // Check if WhatsApp button already exists in HTML
                let whatsappBtn = contactButtons.querySelector('.contact-btn.whatsapp');
                
                if (!whatsappBtn) {
                    // Create new WhatsApp button
                    whatsappBtn = document.createElement('a');
                    whatsappBtn.className = 'contact-btn whatsapp';
                    whatsappBtn.innerHTML = '<span class="contact-btn-icon">💬</span><span class="contact-btn-text">WhatsApp</span>';
                    whatsappBtn.style.display = 'flex';
                    whatsappBtn.style.alignItems = 'center';
                    contactButtons.appendChild(whatsappBtn);
                }
                
                // Update WhatsApp button properties (whether new or existing)
                whatsappBtn.href = 'https://wa.me/19495016384';
                whatsappBtn.target = '_blank';
                whatsappBtn.rel = 'noopener noreferrer';
                whatsappBtn.style.pointerEvents = 'auto';
                whatsappBtn.style.cursor = 'pointer';
                whatsappBtn.style.position = 'relative';
                whatsappBtn.style.zIndex = '1000';
                
                console.log('✅ WhatsApp button:', whatsappBtn);
                console.log('✅ WhatsApp button href:', whatsappBtn.href);
                console.log('✅ WhatsApp button parent:', whatsappBtn.parentElement);
                
                // Remove existing event listeners by cloning and replacing
                const newWhatsappBtn = whatsappBtn.cloneNode(true);
                whatsappBtn.parentNode.replaceChild(newWhatsappBtn, whatsappBtn);
                whatsappBtn = newWhatsappBtn;
                
                // Update href again after cloning
                whatsappBtn.href = 'https://wa.me/19495016384';
                whatsappBtn.target = '_blank';
                
                // Multiple event handlers to catch the click
                function handleWhatsAppClick(e) {
                    console.log('🧪🧪🧪 WhatsApp CLICK EVENT:', e);
                    console.log('Event type:', e.type);
                    console.log('Event target:', e.target);
                    console.log('Current target:', e.currentTarget);
                    
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    
                    console.log('Opening WhatsApp link...');
                    const opened = window.open('https://wa.me/19495016384', '_blank', 'noopener,noreferrer');
                    
                    if (!opened) {
                        console.warn('window.open was blocked! Trying alternative method...');
                        window.location.href = 'https://wa.me/19495016384';
                    } else {
                        console.log('✅ WhatsApp link opened successfully');
                    }
                    
                    return false;
                }
                
                // Add multiple event listeners to catch clicks
                whatsappBtn.addEventListener('mousedown', function(e) {
                    console.log('WhatsApp MOUSEDOWN event');
                    e.stopPropagation();
                }, true);
                
                whatsappBtn.addEventListener('click', handleWhatsAppClick, true);
                whatsappBtn.addEventListener('click', handleWhatsAppClick, false);
                
                whatsappBtn.addEventListener('touchend', function(e) {
                    console.log('WhatsApp TOUCHEND event');
                    handleWhatsAppClick(e);
                    e.preventDefault();
                }, true);
                
                whatsappBtn.addEventListener('pointerdown', function(e) {
                    console.log('WhatsApp POINTERDOWN event');
                }, true);
                
                // Debug: Add a simple test link after WhatsApp button to verify WhatsApp links work
                const testLink = document.createElement('a');
                testLink.href = 'https://wa.me/19495016384';
                testLink.target = '_blank';
                testLink.textContent = '🧪 TEST WHATSAPP LINK - Click Me!';
                testLink.className = 'test-whatsapp-link';
                testLink.style.cssText = 'display: block !important; margin-top: 20px !important; padding: 15px 30px !important; background: #ffeb3b !important; color: #000 !important; text-decoration: underline !important; font-weight: bold !important; font-size: 20px !important; border: 5px solid #f57f17 !important; border-radius: 10px !important; z-index: 99999 !important; position: relative !important; pointer-events: auto !important; cursor: pointer !important; width: 100% !important; text-align: center !important;';
                testLink.addEventListener('click', function(e) {
                    console.log('🧪🧪🧪 TEST LINK clicked!', e);
                    e.preventDefault();
                    e.stopPropagation();
                    window.open('https://wa.me/19495016384', '_blank', 'noopener,noreferrer');
                });
                contactButtons.appendChild(testLink);
                
                // Also add a visible debug div
                const debugDiv = document.createElement('div');
                debugDiv.className = 'debug-contact-buttons';
                debugDiv.style.cssText = 'background: #ff6b6b !important; color: white !important; padding: 20px !important; margin-top: 20px !important; border-radius: 10px !important; font-weight: bold !important; font-size: 18px !important; z-index: 99999 !important; position: relative !important; text-align: center !important;';
                debugDiv.innerHTML = '🐛 DEBUG: Contact buttons container created! 🐛';
                contactButtons.appendChild(debugDiv);
                
                // Force add another debug button directly to body as fallback
                const bodyDebugBtn = document.createElement('button');
                bodyDebugBtn.textContent = '🚨 WHATSAPP BUTTON ON BODY';
                bodyDebugBtn.style.cssText = 'position: fixed !important; top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important; background: #ff0000 !important; color: white !important; padding: 20px 40px !important; font-size: 24px !important; font-weight: bold !important; border: 5px solid yellow !important; border-radius: 20px !important; z-index: 999999 !important; cursor: pointer !important;';
                bodyDebugBtn.addEventListener('click', function() {
                    console.log('🚨 BODY DEBUG BUTTON CLICKED!');
                    window.open('https://wa.me/19495016384', '_blank', 'noopener,noreferrer');
                });
                document.body.appendChild(bodyDebugBtn);
                
                console.log('✅✅✅ CONTACT BUTTONS CREATED AND ADDED TO DOM!');
                
                // Try to find where to insert - after title or at end of container
                const title = container.querySelector('.section-title, h2');
                if (title) {
                    // Insert after the title's parent or after the title itself
                    const titleParent = title.parentElement;
                    if (titleParent && titleParent === container) {
                        // Title is direct child of container, insert after it
                        title.parentNode.insertBefore(contactButtons, title.nextSibling);
                    } else {
                        // Find the feature-block or similar container
                        const featureBlock = container.querySelector('.feature-block');
                        if (featureBlock) {
                            container.insertBefore(contactButtons, featureBlock);
                        } else {
                            container.appendChild(contactButtons);
                        }
                    }
                } else {
                    container.appendChild(contactButtons);
                }
                
                console.log('CONTACT BUTTONS: ✅ Successfully added Instagram and WhatsApp buttons!');
                
                // Debug: Log when button is added to DOM
                setTimeout(() => {
                    const btnInDOM = document.querySelector('.contact-btn.whatsapp');
                    console.log('🔍 WhatsApp button in DOM:', btnInDOM);
                    console.log('🔍 WhatsApp button href:', btnInDOM?.href);
                    console.log('🔍 WhatsApp button parent:', btnInDOM?.parentElement);
                    
                    const whatsappInDOM = document.querySelector('.contact-btn.whatsapp');
                    const instagramInDOM = document.querySelector('.contact-btn.instagram');
                    
                    console.log('DEBUG: WhatsApp button found in DOM:', !!whatsappInDOM);
                    console.log('DEBUG: Instagram button found in DOM:', !!instagramInDOM);
                    
                    if (whatsappInDOM) {
                        console.log('DEBUG: WhatsApp button href:', whatsappInDOM.href);
                        console.log('DEBUG: WhatsApp button target:', whatsappInDOM.target);
                        console.log('DEBUG: WhatsApp button onclick:', whatsappInDOM.onclick);
                        
                        // Check for any overlay or blocking elements
                        const rect = whatsappInDOM.getBoundingClientRect();
                        const elementAtPoint = document.elementFromPoint(rect.left + rect.width/2, rect.top + rect.height/2);
                        console.log('DEBUG: Element at WhatsApp button center:', elementAtPoint);
                        console.log('DEBUG: Is element at point the button?', elementAtPoint === whatsappInDOM || whatsappInDOM.contains(elementAtPoint));
                    }
                }, 1000);
            } else {
                console.warn('CONTACT BUTTONS: ❌ Contact section not found!');
            }
        } catch (error) {
            console.error('CONTACT BUTTONS ERROR:', error);
        }
    }
    console.log('🚀 CONTACT BUTTONS: Calling function now...');
    addContactButtons();
    
    // Try multiple times to ensure buttons are added
    setTimeout(() => {
        console.log('🚀 CONTACT BUTTONS: Calling function after 500ms...');
        addContactButtons();
    }, 500);
    
    setTimeout(() => {
        console.log('🚀 CONTACT BUTTONS: Calling function after 1000ms...');
        addContactButtons();
    }, 1000);
    
    setTimeout(() => {
        console.log('🚀 CONTACT BUTTONS: Calling function after 2000ms...');
        addContactButtons();
        
        // Final check - log if buttons exist
        const existingButtons = document.querySelectorAll('.contact-btn, .test-whatsapp-link, .debug-contact-buttons');
        console.log('🚀 CONTACT BUTTONS: Final check - Found buttons in DOM:', existingButtons.length);
        existingButtons.forEach((btn, index) => {
            console.log(`🚀 CONTACT BUTTONS: Button ${index}:`, btn.className, btn.textContent?.substring(0, 30));
        });
        
        // Check if contact section exists at all
        const allSections = document.querySelectorAll('section');
        console.log('🚀 CONTACT BUTTONS: Total sections in page:', allSections.length);
        allSections.forEach((section, index) => {
            const text = section.textContent?.substring(0, 100);
            console.log(`🚀 CONTACT BUTTONS: Section ${index} preview:`, text);
        });
    }, 2000);
    
    // Also try when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 CONTACT BUTTONS: DOM Content Loaded, calling function...');
            addContactButtons();
        });
    }
    
    // Also try on window load
    window.addEventListener('load', function() {
        console.log('🚀 CONTACT BUTTONS: Window loaded, calling function...');
        addContactButtons();
    });

    // 3. RESTRUCTURE GALLERY TO PRODUCT ROWS WITH PHOTO MANAGEMENT
    function initProductRows() {
        try {
            const galleryGrid = document.querySelector('.gallery .gallery-grid');
            if (!galleryGrid) {
                console.log('Gallery grid not found');
                return;
            }
            
            // Check if already converted
            if (galleryGrid.classList.contains('product-rows-container')) {
                console.log('Gallery already restructured');
                return;
            }
            
            console.log('Restructuring gallery to product rows');
            
            galleryGrid.classList.add('product-rows-container');
            
            // Convert each gallery-item into a product row
            const existingItems = Array.from(galleryGrid.querySelectorAll('.gallery-item'));
            existingItems.forEach((item, index) => {
                // Create product row wrapper
                const productRow = document.createElement('div');
                productRow.className = 'product-row';
                productRow.dataset.productIndex = index;
                
                // Extract product name from caption or create default
                const caption = item.querySelector('.image-caption');
                const productName = caption ? caption.textContent.trim() : `Product ${index + 1}`;
                
                // Create product header with name
                const productHeader = document.createElement('div');
                productHeader.className = 'product-header';
                const nameInput = document.createElement('input');
                nameInput.type = 'text';
                nameInput.className = 'product-name-input';
                nameInput.value = productName;
                nameInput.placeholder = 'Product Name';
                productHeader.appendChild(nameInput);
                productRow.appendChild(productHeader);
                
                // Create photos container
                const photosContainer = document.createElement('div');
                photosContainer.className = 'product-photos-container';
                
                // Extract cover image
                const coverImage = item.querySelector('.image-placeholder, .uploaded-image');
                if (coverImage) {
                    // Create cover photo row with swipeable container
                    const coverPhotoRow = createPhotoRow(coverImage, true, photosContainer);
                    photosContainer.appendChild(coverPhotoRow);
                } else {
                    // Create empty cover photo row
                    const coverPhotoRow = createPhotoRow(null, true, photosContainer);
                    photosContainer.appendChild(coverPhotoRow);
                }
                
                productRow.appendChild(photosContainer);
                
                // Replace gallery item with product row
                item.parentNode.insertBefore(productRow, item);
                item.remove();
            });
            
            // REMOVED: Add Product button removed per user request
            // const addProductBtn = document.createElement('button');
            // addProductBtn.className = 'add-product-btn';
            // addProductBtn.innerHTML = '➕ Add New Product';
            // addProductBtn.addEventListener('click', () => addNewProduct(galleryGrid));
            // galleryGrid.appendChild(addProductBtn);
            
            console.log('Gallery successfully restructured to product rows');
        } catch (error) {
            console.error('Error restructuring gallery:', error);
        }
    }
    
    // Create a photo row (for cover photos with swipeable additional photos)
    function createPhotoRow(imageElement, isCover = false, photosContainer) {
        const photoRow = document.createElement('div');
        photoRow.className = 'photo-row';
        if (isCover) photoRow.classList.add('cover-photo-row');
        
        // Create swipeable container for photos
        const swipeableContainer = document.createElement('div');
        swipeableContainer.className = 'photo-swipeable-container';
        
        // Create the first photo block
        const firstPhoto = createPhotoBlock(imageElement, isCover, swipeableContainer);
        swipeableContainer.appendChild(firstPhoto);
        
        photoRow.appendChild(swipeableContainer);
        
        // Add "Add Photo After Cover" button BELOW the swipeable container (not inside it)
        if (isCover) {
            const addAfterBtn = createAddPhotoButton('Add Photo After Cover', swipeableContainer, null, true);
            photoRow.appendChild(addAfterBtn);
            // Ensure button is always visible and properly positioned
            addAfterBtn.style.display = 'block';
            addAfterBtn.style.width = '100%';
            addAfterBtn.style.position = 'relative';
            addAfterBtn.style.zIndex = '100';
            addAfterBtn.style.marginTop = '15px';
        }
        
        // Initialize swipe functionality
        initSwipeableRow(swipeableContainer);
        
        return photoRow;
    }
    
    function createPhotoBlock(imageElement, isCover = false, swipeableContainer) {
        console.log('PHOTO DELETE: Creating photo block, isCover:', isCover);
        const photoBlock = document.createElement('div');
        photoBlock.className = 'photo-block';
        if (isCover) photoBlock.classList.add('cover-photo');
        
        // Create photo container
        const photoContainer = document.createElement('div');
        photoContainer.className = 'photo-container editable-image';
        photoContainer.dataset.photoId = 'photo-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        // Add delete button - position it so it doesn't overlap with upload button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'photo-delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Delete this photo';
        deleteBtn.setAttribute('type', 'button');
        deleteBtn.style.cssText = 'position: absolute !important; top: 10px !important; right: 10px !important; background: rgba(220, 53, 69, 0.9) !important; backdrop-filter: blur(10px) !important; border: none !important; color: white !important; width: 32px !important; height: 32px !important; border-radius: 50% !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; font-size: 20px !important; z-index: 9999 !important; opacity: 1 !important; transition: all 0.3s ease !important; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important; pointer-events: auto !important;';
        
        console.log('PHOTO DELETE: Adding click listener to delete button');
        deleteBtn.addEventListener('click', function(e) {
            console.log('PHOTO DELETE BUTTON CLICKED!', e, photoBlock);
            e.stopPropagation();
            e.stopImmediatePropagation();
            // Don't prevent default - we want the click to work
            console.log('About to show confirm dialog');
            const confirmed = confirm('Are you sure you want to delete this photo?');
            console.log('User confirmed:', confirmed);
            if (confirmed) {
                console.log('Deleting photo block:', photoBlock);
                photoBlock.style.transition = 'opacity 0.3s ease';
                photoBlock.style.opacity = '0';
                setTimeout(() => {
                    console.log('Removing photo block from DOM');
                    if (photoBlock && photoBlock.parentNode) {
                        photoBlock.remove();
                    }
                    // Reinitialize swipe if needed
                    if (swipeableContainer) {
                        const remainingPhotos = swipeableContainer.querySelectorAll('.photo-block');
                        console.log('Remaining photos:', remainingPhotos.length);
                        if (remainingPhotos.length === 0) {
                            // Add a placeholder photo
                            const newPhoto = createPhotoBlock(null, false, swipeableContainer);
                            swipeableContainer.insertBefore(newPhoto, swipeableContainer.querySelector('.add-photo-btn'));
                        }
                        // Reinitialize swipe functionality
                        initSwipeableRow(swipeableContainer);
                    }
                }, 300);
            }
            return false;
        });
        photoContainer.appendChild(deleteBtn);
        console.log('PHOTO DELETE: Delete button appended to container');
        
        // Clone or create image
        let img = null;
        if (imageElement) {
            if (imageElement.tagName === 'DIV') {
                img = imageElement.querySelector('.uploaded-image') || imageElement.querySelector('img');
            } else if (imageElement.tagName === 'IMG') {
                img = imageElement;
            }
        }
        
        if (!img || img.tagName !== 'IMG') {
            // Create new image placeholder elements without innerHTML
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.className = 'image-input';
            input.style.display = 'none';
            
            const label = document.createElement('label');
            label.className = 'image-label';
            label.textContent = '📷 Upload Image';
            label.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(128, 0, 32, 0.8); color: white; padding: 10px 20px; border-radius: 5px; cursor: pointer; z-index: 10; pointer-events: auto;';
            label.htmlFor = input.id || 'input-' + Date.now();
            
            if (!input.id) {
                input.id = 'input-' + Date.now();
            }
            label.htmlFor = input.id;
            
            const uploadedImg = document.createElement('img');
            uploadedImg.className = 'uploaded-image';
            uploadedImg.style.display = 'none';
            
            const placeholder = document.createElement('span');
            placeholder.className = 'placeholder-text';
            placeholder.textContent = 'NEW IMAGE';
            
            photoContainer.appendChild(input);
            photoContainer.appendChild(label);
            photoContainer.appendChild(uploadedImg);
            photoContainer.appendChild(placeholder);
            
            // Ensure delete button stays on top after adding elements
            deleteBtn.style.zIndex = '9999';
            deleteBtn.style.pointerEvents = 'auto';
            // Re-append to ensure it's last (on top)
            photoContainer.appendChild(deleteBtn);
        } else {
            // Use existing image - clone it
            const clonedImg = img.cloneNode(true);
            clonedImg.style.display = 'block';
            clonedImg.style.width = '100%';
            clonedImg.style.height = '100%';
            clonedImg.style.objectFit = 'cover';
            photoContainer.appendChild(clonedImg);
            
            // Add change image button
            const changeBtn = document.createElement('button');
            changeBtn.className = 'change-image-btn';
            changeBtn.innerHTML = '🔄 Change';
            changeBtn.title = 'Change image';
            changeBtn.style.cssText = 'position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); background: rgba(128, 0, 32, 0.8); color: white; padding: 8px 15px; border-radius: 5px; cursor: pointer; z-index: 10; border: none; font-size: 0.85rem;';
            changeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const input = photoContainer.querySelector('.image-input');
                if (input) input.click();
            });
            photoContainer.appendChild(changeBtn);
            
            // Ensure input exists for changing
            if (!photoContainer.querySelector('.image-input')) {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.className = 'image-input';
                input.style.display = 'none';
                photoContainer.appendChild(input);
            }
        }
        
        // Add crop and position controls
        const controls = createPhotoControls(photoContainer);
        photoBlock.appendChild(photoContainer);
        photoBlock.appendChild(controls);
        
        // Initialize image upload
        initPhotoUpload(photoContainer);
        
        return photoBlock;
    }
    
    function initSwipeableRow(swipeableContainer) {
        const photos = Array.from(swipeableContainer.querySelectorAll('.photo-block'));
        const totalPhotos = photos.length;
        
        console.log('INIT SWIPEABLE: Found', totalPhotos, 'photos');
        
        // Store current index in container
        if (!swipeableContainer.dataset.currentIndex) {
            swipeableContainer.dataset.currentIndex = '0';
        }
        let currentIndex = parseInt(swipeableContainer.dataset.currentIndex) || 0;
        
        // Make sure currentIndex is valid
        if (currentIndex >= totalPhotos) {
            currentIndex = totalPhotos - 1;
            if (currentIndex < 0) currentIndex = 0;
            swipeableContainer.dataset.currentIndex = currentIndex.toString();
        }
        if (currentIndex < 0) currentIndex = 0;
        
        // Remove existing navigation buttons
        const existingNav = swipeableContainer.querySelectorAll('.photo-nav-prev, .photo-nav-next');
        existingNav.forEach(nav => nav.remove());
        
        if (totalPhotos <= 1) {
            // Show first photo if only one
            photos.forEach((photo, index) => {
                photo.style.display = index === 0 ? 'block' : 'none';
                photo.style.width = '100%';
                photo.style.flexShrink = '0';
            });
            return; // No need for navigation if only one photo
        }
        
        // Hide all photos except current - use flex display
        photos.forEach((photo, index) => {
            if (index === currentIndex) {
                photo.style.display = 'block';
                photo.style.width = '100%';
                photo.style.flexShrink = '0';
                console.log('INIT SWIPEABLE: Showing photo at index', index);
            } else {
                photo.style.display = 'none';
                photo.style.width = '100%';
                photo.style.flexShrink = '0';
            }
        });
        
        // Update controls visibility for currently visible photo
        updateControlsForVisiblePhoto(photos, currentIndex);
        
        // Add visual swipe indicators (dots) - only one per swipeable container
        // Look in parent element (photo-row) for existing indicators
        const parentElement = swipeableContainer.parentElement;
        let indicatorContainer = parentElement ? parentElement.querySelector('.swipe-indicators') : null;
        
        if (!indicatorContainer) {
            // Create new indicator container
            indicatorContainer = document.createElement('div');
            indicatorContainer.className = 'swipe-indicators';
            indicatorContainer.style.cssText = 'display: flex; justify-content: center; gap: 8px; margin-top: 10px; margin-bottom: 5px; padding: 5px;';
            // Insert after the swipeable container
            if (parentElement) {
                parentElement.insertBefore(indicatorContainer, swipeableContainer.nextSibling);
            } else {
                swipeableContainer.appendChild(indicatorContainer);
            }
        }
        
        // Update indicator function - define it early so buttons can use it
        function updateSwipeIndicators(container, current, total) {
            if (!container) return;
            const dots = container.querySelectorAll('.swipe-dot');
            dots.forEach((dot, index) => {
                dot.style.background = index === current ? 'rgba(255, 215, 0, 0.9)' : 'rgba(255, 255, 255, 0.3)';
            });
        }
        
        // Clear and recreate dots with correct count
        indicatorContainer.innerHTML = '';
        
        // Create dots for each photo
        for (let i = 0; i < totalPhotos; i++) {
            const dot = document.createElement('div');
            dot.className = 'swipe-dot';
            dot.style.cssText = `width: 8px; height: 8px; border-radius: 50%; background: ${i === currentIndex ? 'rgba(255, 215, 0, 0.9)' : 'rgba(255, 255, 255, 0.3)'}; transition: all 0.3s ease; cursor: pointer;`;
            dot.addEventListener('click', () => {
                if (i !== currentIndex) {
                    photos[currentIndex].style.display = 'none';
                    currentIndex = i;
                    swipeableContainer.dataset.currentIndex = currentIndex.toString();
                    photos[currentIndex].style.display = 'block';
                    updateNavigationButtons(prevBtn, nextBtn, currentIndex, totalPhotos);
                    updateControlsForVisiblePhoto(photos, currentIndex);
                    updateSwipeIndicators(indicatorContainer, currentIndex, totalPhotos);
                }
            });
            indicatorContainer.appendChild(dot);
        }
        
        // Add navigation buttons
        const prevBtn = document.createElement('button');
        prevBtn.className = 'photo-nav-prev';
        prevBtn.innerHTML = '‹';
        prevBtn.addEventListener('click', () => {
            currentIndex = parseInt(swipeableContainer.dataset.currentIndex) || 0;
            if (currentIndex > 0) {
                photos[currentIndex].style.display = 'none';
                currentIndex--;
                swipeableContainer.dataset.currentIndex = currentIndex.toString();
                photos[currentIndex].style.display = 'block';
                updateNavigationButtons(prevBtn, nextBtn, currentIndex, totalPhotos);
                updateControlsForVisiblePhoto(photos, currentIndex);
                updateSwipeIndicators(indicatorContainer, currentIndex, totalPhotos);
            }
        });
        
        const nextBtn = document.createElement('button');
        nextBtn.className = 'photo-nav-next';
        nextBtn.innerHTML = '›';
        nextBtn.addEventListener('click', () => {
            currentIndex = parseInt(swipeableContainer.dataset.currentIndex) || 0;
            if (currentIndex < totalPhotos - 1) {
                photos[currentIndex].style.display = 'none';
                currentIndex++;
                swipeableContainer.dataset.currentIndex = currentIndex.toString();
                photos[currentIndex].style.display = 'block';
                updateNavigationButtons(prevBtn, nextBtn, currentIndex, totalPhotos);
                updateControlsForVisiblePhoto(photos, currentIndex);
                updateSwipeIndicators(indicatorContainer, currentIndex, totalPhotos);
            }
        });
        
        swipeableContainer.appendChild(prevBtn);
        swipeableContainer.appendChild(nextBtn);
        
        // Update button visibility
        updateNavigationButtons(prevBtn, nextBtn, currentIndex, totalPhotos);
        
        // Add swipe hint text for mobile (only visible on mobile) - only one per container
        const parentEl = swipeableContainer.parentElement;
        let swipeHint = parentEl ? parentEl.querySelector('.swipe-hint') : null;
        if (!swipeHint && totalPhotos > 1) {
            swipeHint = document.createElement('div');
            swipeHint.className = 'swipe-hint';
            swipeHint.innerHTML = '← Swipe to see more →';
            swipeHint.style.cssText = 'text-align: center; color: rgba(255, 255, 255, 0.6); font-size: 0.85rem; margin-top: 5px; margin-bottom: 10px; padding: 5px; display: none;';
            // Show only on mobile devices
            if (window.innerWidth <= 768 || 'ontouchstart' in window) {
                swipeHint.style.display = 'block';
            }
            if (parentEl) {
                // Insert after indicator container if it exists, otherwise after swipeable container
                const existingIndicator = parentEl.querySelector('.swipe-indicators');
                if (existingIndicator) {
                    parentEl.insertBefore(swipeHint, existingIndicator.nextSibling);
                } else {
                    parentEl.insertBefore(swipeHint, swipeableContainer.nextSibling);
                }
            }
        }
        
        // Touch swipe support
        let startX = 0;
        let isDragging = false;
        
        swipeableContainer.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
        });
        
        swipeableContainer.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            currentIndex = parseInt(swipeableContainer.dataset.currentIndex) || 0;
            const endX = e.changedTouches[0].clientX;
            const diff = startX - endX;
            const threshold = 50;
            
            if (Math.abs(diff) > threshold) {
                if (diff > 0 && currentIndex < totalPhotos - 1) {
                    photos[currentIndex].style.display = 'none';
                    currentIndex++;
                    swipeableContainer.dataset.currentIndex = currentIndex.toString();
                    photos[currentIndex].style.display = 'block';
                    updateNavigationButtons(prevBtn, nextBtn, currentIndex, totalPhotos);
                    updateControlsForVisiblePhoto(photos, currentIndex);
                    updateSwipeIndicators(indicatorContainer, currentIndex, totalPhotos);
                } else if (diff < 0 && currentIndex > 0) {
                    photos[currentIndex].style.display = 'none';
                    currentIndex--;
                    swipeableContainer.dataset.currentIndex = currentIndex.toString();
                    photos[currentIndex].style.display = 'block';
                    updateNavigationButtons(prevBtn, nextBtn, currentIndex, totalPhotos);
                    updateControlsForVisiblePhoto(photos, currentIndex);
                    updateSwipeIndicators(indicatorContainer, currentIndex, totalPhotos);
                }
            }
        });
        
        // Keyboard support for desktop testing (only when container is focused/visible)
        function handleKeyNavigation(e) {
            // Only handle if the container is visible on screen
            const rect = swipeableContainer.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
            if (!isVisible) return;
            
            // Only handle if focused on this product row (or if no other input is focused)
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)) {
                return; // Don't interfere with text editing
            }
            
            if (e.key === 'ArrowLeft' && currentIndex > 0) {
                e.preventDefault();
                photos[currentIndex].style.display = 'none';
                currentIndex--;
                swipeableContainer.dataset.currentIndex = currentIndex.toString();
                photos[currentIndex].style.display = 'block';
                updateNavigationButtons(prevBtn, nextBtn, currentIndex, totalPhotos);
                updateControlsForVisiblePhoto(photos, currentIndex);
                updateSwipeIndicators(indicatorContainer, currentIndex, totalPhotos);
            } else if (e.key === 'ArrowRight' && currentIndex < totalPhotos - 1) {
                e.preventDefault();
                photos[currentIndex].style.display = 'none';
                currentIndex++;
                swipeableContainer.dataset.currentIndex = currentIndex.toString();
                photos[currentIndex].style.display = 'block';
                updateNavigationButtons(prevBtn, nextBtn, currentIndex, totalPhotos);
                updateControlsForVisiblePhoto(photos, currentIndex);
                updateSwipeIndicators(indicatorContainer, currentIndex, totalPhotos);
            }
        }
        
        // Add keyboard listener (only once per container to avoid duplicates)
        if (!swipeableContainer.dataset.keyboardListenerAdded) {
            document.addEventListener('keydown', handleKeyNavigation);
            swipeableContainer.dataset.keyboardListenerAdded = 'true';
        }
        
        // Store update function for external use
        swipeableContainer.updateIndicators = () => updateSwipeIndicators(indicatorContainer, parseInt(swipeableContainer.dataset.currentIndex) || 0, totalPhotos);
    }
    
    function updateNavigationButtons(prevBtn, nextBtn, currentIndex, totalPhotos) {
        if (!prevBtn || !nextBtn) return;
        prevBtn.style.display = currentIndex > 0 ? 'flex' : 'none';
        nextBtn.style.display = currentIndex < totalPhotos - 1 ? 'flex' : 'none';
    }
    
    function updateControlsForVisiblePhoto(photos, currentIndex) {
        // Hide controls for all photos, show only for visible one
        photos.forEach((photo, index) => {
            const controls = photo.querySelector('.photo-controls');
            if (controls) {
                controls.style.display = index === currentIndex ? 'block' : 'none';
            }
        });
    }
    
    function createPhotoControls(photoContainer) {
        const controls = document.createElement('div');
        controls.className = 'photo-controls';
        
        // Crop controls
        const cropSection = document.createElement('div');
        cropSection.className = 'control-section';
        cropSection.innerHTML = '<label>Crop:</label>';
        
        const cropX = createControlInput('X', '0', 'crop-x');
        const cropY = createControlInput('Y', '0', 'crop-y');
        const cropW = createControlInput('W', '100', 'crop-w');
        const cropH = createControlInput('H', '100', 'crop-h');
        
        cropSection.appendChild(cropX);
        cropSection.appendChild(cropY);
        cropSection.appendChild(cropW);
        cropSection.appendChild(cropH);
        
        // Position controls
        const positionSection = document.createElement('div');
        positionSection.className = 'control-section';
        positionSection.innerHTML = '<label>Position:</label>';
        
        const posX = createControlInput('X', '50', 'pos-x');
        const posY = createControlInput('Y', '50', 'pos-y');
        
        positionSection.appendChild(posX);
        positionSection.appendChild(posY);
        
        // Apply button
        const applyBtn = document.createElement('button');
        applyBtn.className = 'apply-controls-btn';
        applyBtn.textContent = 'Apply';
        applyBtn.addEventListener('click', () => applyPhotoControls(photoContainer, cropX, cropY, cropW, cropH, posX, posY));
        
        controls.appendChild(cropSection);
        controls.appendChild(positionSection);
        controls.appendChild(applyBtn);
        
        return controls;
    }
    
    function createControlInput(label, value, className) {
        const wrapper = document.createElement('div');
        wrapper.className = 'control-input-wrapper';
        const labelEl = document.createElement('span');
        labelEl.textContent = label + ':';
        const input = document.createElement('input');
        input.type = 'number';
        input.value = value;
        input.className = className;
        wrapper.appendChild(labelEl);
        wrapper.appendChild(input);
        return wrapper;
    }
    
    function applyPhotoControls(photoContainer, cropX, cropY, cropW, cropH, posX, posY) {
        // Get the currently visible image - check both uploaded-image and regular img tags
        let img = photoContainer.querySelector('.uploaded-image[style*="block"], .uploaded-image:not([style*="none"])');
        if (!img || img.style.display === 'none') {
            img = photoContainer.querySelector('img:not(.photo-delete-btn *)');
        }
        if (!img || (img.style.display === 'none' && !img.src)) {
            console.warn('No visible image found in photo container');
            return;
        }
        
        // Apply crop (using object-position and object-fit)
        const cropXVal = cropX.querySelector('input').value;
        const cropYVal = cropY.querySelector('input').value;
        const cropWVal = cropW.querySelector('input').value;
        const cropHVal = cropH.querySelector('input').value;
        
        // Apply position
        const posXVal = posX.querySelector('input').value;
        const posYVal = posY.querySelector('input').value;
        
        img.style.objectPosition = `${posXVal}% ${posYVal}%`;
        img.style.objectFit = 'cover';
        
        // Store crop values
        img.dataset.cropX = cropXVal;
        img.dataset.cropY = cropYVal;
        img.dataset.cropW = cropWVal;
        img.dataset.cropH = cropHVal;
        img.dataset.posX = posXVal;
        img.dataset.posY = posYVal;
        
        console.log('Applied controls to visible image:', { cropXVal, cropYVal, cropWVal, cropHVal, posXVal, posYVal });
    }
    
    function createAddPhotoButton(text, swipeableContainer, insertAfter = null, isSwipeable = false) {
        const btn = document.createElement('button');
        btn.className = 'add-photo-btn';
        btn.textContent = text;
        btn.style.display = 'flex';
        btn.style.width = '100%';
        btn.style.flexShrink = '0';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.addEventListener('click', () => {
            console.log('ADD PHOTO: Creating new photo block');
            const photoBlock = createPhotoBlock(null, false, swipeableContainer);
            if (insertAfter) {
                swipeableContainer.insertBefore(photoBlock, insertAfter.nextSibling);
            } else {
                // Insert before the add button (last element)
                const addBtn = swipeableContainer.querySelector('.add-photo-btn');
                if (addBtn) {
                    swipeableContainer.insertBefore(photoBlock, addBtn);
                } else {
                    swipeableContainer.appendChild(photoBlock);
                }
            }
            console.log('ADD PHOTO: Photo block added, total photos:', swipeableContainer.querySelectorAll('.photo-block').length);
            // Reinitialize swipe if needed
            if (isSwipeable) {
                // Get all photos AFTER adding the new one
                const allPhotos = Array.from(swipeableContainer.querySelectorAll('.photo-block'));
                console.log('ADD PHOTO: All photos found:', allPhotos.length);
                
                // Find the index of the newly added photo block
                const newIndex = allPhotos.length - 1; // Index of newly added photo
                console.log('ADD PHOTO: Showing newly added photo at index:', newIndex);
                
                // Set current index to show the new photo
                swipeableContainer.dataset.currentIndex = newIndex.toString();
                
                // Make sure the new photo is visible
                photoBlock.style.display = 'block';
                photoBlock.style.width = '100%';
                photoBlock.style.flexShrink = '0';
                
                // Hide all other photos
                allPhotos.forEach((photo, index) => {
                    if (index !== newIndex) {
                        photo.style.display = 'none';
                    }
                });
                
                // Reinitialize swipe functionality
                initSwipeableRow(swipeableContainer);
            }
        });
        return btn;
    }
    
    function initPhotoUpload(photoContainer) {
        console.log('INIT PHOTO UPLOAD: Initializing for container', photoContainer);
        let input = photoContainer.querySelector('.image-input');
        const label = photoContainer.querySelector('.image-label');
        let img = photoContainer.querySelector('.uploaded-image');
        const placeholder = photoContainer.querySelector('.placeholder-text');
        
        console.log('INIT PHOTO UPLOAD: Found elements', { input: !!input, label: !!label, img: !!img, placeholder: !!placeholder });
        
        // Create input if it doesn't exist (for changing images)
        if (!input) {
            console.log('INIT PHOTO UPLOAD: Creating new input');
            input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.className = 'image-input';
            input.style.display = 'none';
            photoContainer.appendChild(input);
        }
        
        // Create img if it doesn't exist
        if (!img) {
            console.log('INIT PHOTO UPLOAD: Creating new img element');
            img = document.createElement('img');
            img.className = 'uploaded-image';
            img.style.display = 'none';
            photoContainer.appendChild(img);
        }
        
        // Remove old listeners by cloning the input
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        input = newInput;
        
        console.log('INIT PHOTO UPLOAD: Input cloned, adding event listener');
        
        input.addEventListener('change', function(e) {
            console.log('IMAGE UPLOAD: File selected', e.target.files);
            const file = e.target.files[0];
            if (file) {
                console.log('IMAGE UPLOAD: Reading file', file.name);
                const reader = new FileReader();
                reader.onload = function(event) {
                    console.log('IMAGE UPLOAD: File loaded, displaying image');
                    if (placeholder) placeholder.style.display = 'none';
                    if (label) label.style.display = 'none';
                    
                    // Make sure img element exists and is properly set up
                    if (!img) {
                        img = photoContainer.querySelector('.uploaded-image');
                        if (!img) {
                            img = document.createElement('img');
                            img.className = 'uploaded-image';
                            photoContainer.appendChild(img);
                        }
                    }
                    
                    img.src = event.target.result;
                    img.style.display = 'block';
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'cover';
                    img.dataset.base64 = event.target.result;
                    
                    console.log('IMAGE UPLOAD: Image displayed, src length:', img.src.length);
                    
                    // Ensure photo container and block are visible
                    const photoBlock = photoContainer.closest('.photo-block');
                    if (photoBlock) {
                        photoBlock.style.display = 'block';
                        console.log('IMAGE UPLOAD: Photo block set to visible');
                    }
                    photoContainer.style.display = 'block';
                    
                    // Add or update change button
                    let changeBtn = photoContainer.querySelector('.change-image-btn');
                    if (!changeBtn) {
                        changeBtn = document.createElement('button');
                        changeBtn.className = 'change-image-btn';
                        changeBtn.innerHTML = '🔄 Change';
                        changeBtn.title = 'Change image';
                        changeBtn.style.cssText = 'position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); background: rgba(128, 0, 32, 0.8); color: white; padding: 8px 15px; border-radius: 5px; cursor: pointer; z-index: 10; border: none; font-size: 0.85rem;';
                        changeBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            input.click();
                        });
                        photoContainer.appendChild(changeBtn);
                    }
                    
                    // Initialize scaling
                    initImageScaling(img);
                    
                    console.log('IMAGE UPLOAD: Complete');
                };
                reader.onerror = function(error) {
                    console.error('IMAGE UPLOAD: Error reading file', error);
                };
                reader.readAsDataURL(file);
            } else {
                console.warn('IMAGE UPLOAD: No file selected');
            }
        });
        
        if (label && !label.hasAttribute('data-listener')) {
            label.setAttribute('data-listener', 'true');
            label.addEventListener('click', function(e) {
                console.log('IMAGE UPLOAD: Label clicked, triggering input');
                e.preventDefault();
                e.stopPropagation();
                if (input) {
                    input.click();
                } else {
                    console.error('IMAGE UPLOAD: Input not found when label clicked');
                }
            });
        } else if (label) {
            // Re-attach listener even if data-listener exists (for newly created photos)
            label.addEventListener('click', function(e) {
                console.log('IMAGE UPLOAD: Label clicked (re-attached), triggering input');
                e.preventDefault();
                e.stopPropagation();
                if (input) {
                    input.click();
                }
            });
        }
    }
    
    function addNewProduct(galleryGrid) {
        const productRow = document.createElement('div');
        productRow.className = 'product-row';
        productRow.dataset.productIndex = galleryGrid.querySelectorAll('.product-row').length;
        
        const productHeader = document.createElement('div');
        productHeader.className = 'product-header';
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'product-name-input';
        nameInput.value = `Product ${productRow.dataset.productIndex + 1}`;
        nameInput.placeholder = 'Product Name';
        productHeader.appendChild(nameInput);
        
        const photosContainer = document.createElement('div');
        photosContainer.className = 'product-photos-container';
        
        // Add cover photo row (with swipeable container)
        const coverPhotoRow = createPhotoRow(null, true, photosContainer);
        photosContainer.appendChild(coverPhotoRow);
        
        productRow.appendChild(productHeader);
        productRow.appendChild(photosContainer);
        
        // Insert before add product button
        const addProductBtn = galleryGrid.querySelector('.add-product-btn');
        galleryGrid.insertBefore(productRow, addProductBtn);
    }
    
    // Initialize product rows (replacing swipeable gallery)
    console.log('PRODUCT ROWS: Calling function now...');
    initProductRows();
    setTimeout(() => {
        console.log('PRODUCT ROWS: Calling function after 500ms...');
        initProductRows();
        // DISABLED: Text delete buttons removed per user request
        // addTextDeleteButtons();
    }, 500);
    setTimeout(() => {
        console.log('PRODUCT ROWS: Calling function after 1000ms...');
        initProductRows();
        // DISABLED: Text delete buttons removed per user request
        // addTextDeleteButtons();
    }, 1000);
    // DISABLED: Text delete buttons removed per user request
    // setTimeout(() => {
    //     // Final call to ensure everything is set up
    //     addTextDeleteButtons();
    // }, 1500);
    

    // 4. IMAGE SCALING FUNCTIONALITY
    function initImageScaling(img) {
        if (img.dataset.scaleInitialized === 'true') return;
        img.dataset.scaleInitialized = 'true';
        
        const container = img.closest('.editable-image') || img.closest('.image-placeholder');
        if (!container) return;
        
        // Check if controls already exist
        if (container.querySelector('.image-scale-controls')) return;
        
        const scaleControls = document.createElement('div');
        scaleControls.className = 'image-scale-controls';
        
        const zoomOut = document.createElement('button');
        zoomOut.className = 'scale-btn';
        zoomOut.type = 'button';
        zoomOut.innerHTML = '−';
        zoomOut.addEventListener('click', (e) => {
            e.stopPropagation();
            adjustScale(img, -10);
        });
        
        const zoomIn = document.createElement('button');
        zoomIn.className = 'scale-btn';
        zoomIn.type = 'button';
        zoomIn.innerHTML = '+';
        zoomIn.addEventListener('click', (e) => {
            e.stopPropagation();
            adjustScale(img, 10);
        });
        
        const resetBtn = document.createElement('button');
        resetBtn.className = 'scale-btn';
        resetBtn.type = 'button';
        resetBtn.innerHTML = '↺';
        resetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            resetScale(img);
        });
        
        const indicator = document.createElement('span');
        indicator.className = 'scale-indicator';
        indicator.textContent = '100%';
        
        scaleControls.appendChild(zoomOut);
        scaleControls.appendChild(zoomIn);
        scaleControls.appendChild(resetBtn);
        scaleControls.appendChild(indicator);
        
        container.appendChild(scaleControls);
        
        // Initialize scale
        if (!img.dataset.scale) {
            img.dataset.scale = '100';
        }
    }
    
    function adjustScale(img, delta) {
        let currentScale = parseFloat(img.dataset.scale || '100');
        currentScale = Math.max(50, Math.min(200, currentScale + delta));
        img.dataset.scale = currentScale.toString();
        img.style.transform = `scale(${currentScale / 100})`;
        img.style.transformOrigin = 'center center';
        
        const container = img.closest('.editable-image') || img.closest('.image-placeholder');
        const indicator = container?.querySelector('.scale-indicator');
        if (indicator) {
            indicator.textContent = Math.round(currentScale) + '%';
        }
    }
    
    function resetScale(img) {
        img.dataset.scale = '100';
        img.style.transform = 'scale(1)';
        img.style.transformOrigin = 'center center';
        const container = img.closest('.editable-image') || img.closest('.image-placeholder');
        const indicator = container?.querySelector('.scale-indicator');
        if (indicator) {
            indicator.textContent = '100%';
        }
    }
    
    // Initialize scaling for all existing images (multiple attempts)
    function initAllImageScaling() {
        try {
            // Find all images - both uploaded and regular img tags
            const uploadedImages = document.querySelectorAll('.uploaded-image[src], .uploaded-image[style*="display: block"]');
            const regularImages = document.querySelectorAll('img:not(.uploaded-image):not([src=""])');
            
            console.log('Found images for scaling - uploaded:', uploadedImages.length, 'regular:', regularImages.length);
            
            uploadedImages.forEach(img => {
                initImageScaling(img);
            });
            
            // Also add scaling to regular images
            regularImages.forEach(img => {
                // Skip UI images
                if (img.closest('.section-delete-btn') || img.closest('.save-controls') || 
                    img.closest('.contact-buttons') || img.closest('.gallery-nav')) return;
                initImageScaling(img);
            });
        } catch (error) {
            console.error('Error initializing image scaling:', error);
        }
    }
    
    // Call multiple times to catch all images
    setTimeout(initAllImageScaling, 200);
    setTimeout(initAllImageScaling, 500);
    setTimeout(initAllImageScaling, 1000);
    setTimeout(initAllImageScaling, 2000);
    
    // Use event delegation for delete buttons to avoid losing listeners
    // This ensures buttons work even if elements are recreated
    document.addEventListener('click', function(e) {
        // Handle photo delete buttons
        if (e.target.classList.contains('photo-delete-btn') || e.target.closest('.photo-delete-btn')) {
            const deleteBtn = e.target.classList.contains('photo-delete-btn') ? e.target : e.target.closest('.photo-delete-btn');
            const photoBlock = deleteBtn.closest('.photo-block');
            if (!photoBlock) return;
            
            console.log('PHOTO DELETE BUTTON CLICKED (delegation)!', e, photoBlock);
            e.stopPropagation();
            e.stopImmediatePropagation();
            e.preventDefault();
            
            const confirmed = confirm('Are you sure you want to delete this photo?');
            console.log('User confirmed:', confirmed);
            if (confirmed) {
                console.log('Deleting photo block:', photoBlock);
                photoBlock.style.transition = 'opacity 0.3s ease';
                photoBlock.style.opacity = '0';
                setTimeout(() => {
                    console.log('Removing photo block from DOM');
                    if (photoBlock && photoBlock.parentNode) {
                        const swipeableContainer = photoBlock.closest('.photo-swipeable-container');
                        photoBlock.remove();
                        
                        // Reinitialize swipe if needed
                        if (swipeableContainer) {
                            const remainingPhotos = swipeableContainer.querySelectorAll('.photo-block');
                            console.log('Remaining photos:', remainingPhotos.length);
                            if (remainingPhotos.length === 0) {
                                // Add a placeholder photo
                                const newPhoto = createPhotoBlock(null, false, swipeableContainer);
                                swipeableContainer.insertBefore(newPhoto, swipeableContainer.querySelector('.add-photo-btn'));
                            }
                            // Reinitialize swipe functionality
                            initSwipeableRow(swipeableContainer);
                        }
                    }
                }, 300);
            }
            return false;
        }
        
        // Handle text delete buttons
        if (e.target.classList.contains('text-delete-btn') || e.target.closest('.text-delete-btn')) {
            const deleteBtn = e.target.classList.contains('text-delete-btn') ? e.target : e.target.closest('.text-delete-btn');
            const textEl = deleteBtn.parentElement;
            if (!textEl) return;
            
            console.log('TEXT DELETE BUTTON CLICKED (delegation)!', e, textEl);
            e.stopPropagation();
            e.stopImmediatePropagation();
            e.preventDefault();
            
            const confirmed = confirm('Are you sure you want to delete this text block?');
            console.log('User confirmed:', confirmed);
            if (confirmed) {
                console.log('Deleting text element:', textEl);
                textEl.style.transition = 'opacity 0.3s ease';
                textEl.style.opacity = '0';
                setTimeout(() => {
                    console.log('Removing text element from DOM');
                    textEl.remove();
                }, 300);
            }
            return false;
        }
    }, true); // Use capture phase
    
    // Also initialize scaling when new images are uploaded
    const originalImageInputs = document.querySelectorAll('.image-input');
    originalImageInputs.forEach(input => {
        input.addEventListener('change', function() {
            setTimeout(() => {
                const imageId = input.id.replace('-input', '-img');
                const img = document.getElementById(imageId);
                if (img && img.src) {
                    initImageScaling(img);
                }
            }, 100);
        });
    });
});
