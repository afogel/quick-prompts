console.log('Snippet extension loaded!');

// Define snippets array
const snippets = [
  { label: 'Rephrase and Response (Zero Shot)', text: 'Given the question above, rephrase and expand it to better facilitate answering, ensuring all information from the original question is preserved.' },
  { label: 'Induce Reflection', text: 'Break the request into smaller components. For each component, provide an answer. Then, compare your answers and analyze their consistency. If there are contradictions, re-evaluate and repeat at least 3 times, analyze the final components and propose a refined solution. Once complete, summarize your reasoning and suggest next steps for further analysis, include a table with results' },
];

// Keep track of the current target and UI state
let currentTarget = null;
let isUIOpen = false;

function isValidTarget(element) {
  return element.tagName === 'INPUT' || 
         element.tagName === 'TEXTAREA' || 
         (element.getAttribute('contenteditable') === 'true');
}

function isPartOfSnippetUI(element) {
  return element.closest('.snippet-trigger, .snippet-dropdown') !== null;
}

function insertSnippet(input, text) {
  if (input.getAttribute('contenteditable') === 'true') {
    input.textContent = input.textContent + text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.value = input.value.substring(0, start) + text + input.value.substring(end);
    input.selectionStart = input.selectionEnd = start + text.length;
  }
  input.focus();
}

function createSnippetUI(inputElement) {
  console.log('Creating snippet UI for:', inputElement);
  
  // Don't recreate if already exists for this target
  if (currentTarget === inputElement) {
    return;
  }
  
  removeExistingUI();
  currentTarget = inputElement;

  const trigger = document.createElement('div');
  trigger.className = 'snippet-trigger';
  trigger.textContent = '📋';

  const dropdown = document.createElement('div');
  dropdown.className = 'snippet-dropdown';
  
  const search = document.createElement('input');
  search.className = 'snippet-search';
  search.placeholder = 'Search snippets...';
  
  dropdown.appendChild(search);

  const list = document.createElement('div');
  list.className = 'snippet-list';
  snippets.forEach(snippet => {
    const item = document.createElement('div');
    item.className = 'snippet-item';
    item.textContent = snippet.label;
    item.addEventListener('mousedown', (e) => {
      e.preventDefault(); // Prevent focus change
      e.stopPropagation();
      console.log('Inserting snippet:', snippet.text);
      insertSnippet(inputElement, snippet.text);
      closeDropdown(dropdown);
    });
    list.appendChild(item);
  });
  dropdown.appendChild(list);

  function updatePositions() {
    const rect = inputElement.getBoundingClientRect();
    const triggerHeight = 20;
    const padding = 5;
    const viewportHeight = window.innerHeight;
    
    // Position trigger in top-right corner of input
    trigger.style.top = `${rect.top - triggerHeight}px`;  
    trigger.style.right = `${window.innerWidth - rect.right}px`;
    trigger.style.transform = 'translateY(-100%)';  // Move up by its full height
    trigger.style.left = 'auto'; // Clear any previous left value
    
    // Position dropdown relative to trigger when active
    if (dropdown.classList.contains('active')) {
      const dropdownHeight = dropdown.offsetHeight;
      const triggerRect = trigger.getBoundingClientRect();
      
      // Check if we're near the bottom of the viewport
      const distanceFromBottom = viewportHeight - rect.bottom;
      const isNearBottom = distanceFromBottom < (dropdownHeight + padding * 2);
      
      if (isNearBottom) {
        // Show dropdown above the trigger if near bottom
        dropdown.style.top = `${triggerRect.top - dropdownHeight - padding}px`;
      } else {
        // Show dropdown below the trigger if there's space
        dropdown.style.top = `${triggerRect.bottom + padding}px`;
      }
      
      // Align dropdown with the right edge of the input
      dropdown.style.right = `${window.innerWidth - rect.right}px`;
      dropdown.style.left = 'auto'; // Clear any previous left value
      
      // Check left overflow
      const dropdownRect = dropdown.getBoundingClientRect();
      if (dropdownRect.left < padding) {
        dropdown.style.right = 'auto';
        dropdown.style.left = `${padding}px`;
      }
    }
  }

  // Initial positioning
  document.body.appendChild(trigger);
  document.body.appendChild(dropdown);
  updatePositions();

  function closeDropdown(dropdown) {
    dropdown.classList.remove('active');
    isUIOpen = false;
  }

  // Use mousedown instead of click to prevent focus issues
  trigger.addEventListener('mousedown', (e) => {
    e.preventDefault(); // Prevent focus change
    e.stopPropagation();
    
    const wasActive = dropdown.classList.contains('active');
    dropdown.classList.toggle('active');
    isUIOpen = !wasActive;
    
    if (!wasActive) {
      updatePositions();
      // Use requestAnimationFrame to ensure the UI is rendered before focusing
      requestAnimationFrame(() => {
        search.focus();
      });
    }
  });

  search.addEventListener('input', (e) => {
    e.stopPropagation();
    const query = e.target.value.toLowerCase();
    Array.from(list.children).forEach(item => {
      const matches = item.textContent.toLowerCase().includes(query);
      item.style.display = matches ? 'block' : 'none';
    });
  });

  // Prevent search input from triggering new UI creation
  search.addEventListener('focus', (e) => {
    e.stopPropagation();
  });

  // Close dropdown when clicking outside
  document.addEventListener('mousedown', (e) => {
    if (isUIOpen && !dropdown.contains(e.target) && !trigger.contains(e.target)) {
      closeDropdown(dropdown);
    }
  });

  // Update positions on scroll and resize
  window.addEventListener('scroll', updatePositions);
  window.addEventListener('resize', updatePositions);

  // Handle focus out
  inputElement.addEventListener('blur', (e) => {
    // Use setTimeout to allow click events on the UI to fire first
    setTimeout(() => {
      if (!isPartOfSnippetUI(document.activeElement)) {
        removeExistingUI();
      }
    }, 100);
  });
}

function removeExistingUI() {
  const removed = document.querySelectorAll('.snippet-trigger, .snippet-dropdown');
  removed.forEach(el => el.remove());
  isUIOpen = false;
  currentTarget = null;
  console.log('Removed existing UI elements:', removed.length);
}

// Main focus handler
document.addEventListener('focusin', (e) => {
  if (isValidTarget(e.target) && !isPartOfSnippetUI(e.target)) {
    console.log('Valid target focused:', e.target);
    createSnippetUI(e.target);
  }
}, true);