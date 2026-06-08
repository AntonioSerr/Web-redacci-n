/* ============================================
   app.js — Main Application Controller
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
  // Restore settings from localStorage
  restoreSettings();

  // Check API keys
  checkApiKeys();

  // Initialize modules
  initWriting();
  initVocabulary();
  initStructures();

  // Tab navigation
  setupNavigation();

  // Settings button
  setupSettingsButton();

  // Save keys button
  setupSaveKeysButton();

  // Persist select changes
  setupSelectPersistence();

  // Load initial stats
  refreshStats();
});

/* ---------- Settings ---------- */

/**
 * Get the current application settings.
 * @returns {object}
 */
function getSettings() {
  var modelSelect = document.getElementById('ai-model-select');
  var targetSelect = document.getElementById('target-language-select');
  var nativeSelect = document.getElementById('native-language-select');
  var levelSelect = document.getElementById('level-select');

  return {
    provider: 'gemini', // Hardcoded as per refactor
    targetLanguage: targetSelect ? targetSelect.value : 'English',
    nativeLanguage: nativeSelect ? nativeSelect.value : 'Español',
    level: levelSelect ? levelSelect.value : 'B1',
    geminiKey: localStorage.getItem('wt_gemini_key') || ''
  };
}

/**
 * Restore select values from localStorage.
 */
function restoreSettings() {
  var mappings = {
    'ai-model-select': 'wt_model',
    'target-language-select': 'wt_target_lang',
    'native-language-select': 'wt_native_lang',
    'level-select': 'wt_level'
  };

  Object.keys(mappings).forEach(function(selectId) {
    var key = mappings[selectId];
    var stored = localStorage.getItem(key);
    var select = document.getElementById(selectId);

    if (stored && select) {
      // Check if the stored value exists as an option
      var optionExists = Array.from(select.options).some(function(opt) {
        return opt.value === stored;
      });
      if (optionExists) {
        select.value = stored;
      }
    }
  });
}

/**
 * Set up persistence for select elements.
 */
function setupSelectPersistence() {
  var mappings = {
    'ai-model-select': 'wt_model',
    'target-language-select': 'wt_target_lang',
    'native-language-select': 'wt_native_lang',
    'level-select': 'wt_level'
  };

  Object.keys(mappings).forEach(function(selectId) {
    var select = document.getElementById(selectId);
    var key = mappings[selectId];

    if (select) {
      select.addEventListener('change', function() {
        localStorage.setItem(key, select.value);
      });
    }
  });
}

/* ---------- API Keys ---------- */

/**
 * Check if API keys exist and show the modal if not.
 */
function checkApiKeys() {
  var geminiKey = localStorage.getItem('wt_gemini_key');
  
  if (!geminiKey) {
    showApiKeysModal();
  }
}

/**
 * Show the API keys modal and prepopulate.
 */
function showApiKeysModal() {
  var modal = document.getElementById('api-keys-modal');
  var geminiInput = document.getElementById('gemini-key-input');

  if (geminiInput) {
    geminiInput.value = localStorage.getItem('wt_gemini_key') || '';
  }

  if (modal) {
    modal.classList.remove('hidden');
  }
}

/**
 * Hide the API keys modal.
 */
function hideApiKeysModal() {
  var modal = document.getElementById('api-keys-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

/**
 * Set up the settings button to open the modal.
 */
function setupSettingsButton() {
  var settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', showApiKeysModal);
  }
}

/**
 * Set up the save keys button.
 */
function setupSaveKeysButton() {
  var saveBtn = document.getElementById('save-keys-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', function() {
      var geminiInput = document.getElementById('gemini-key-input');

      var geminiKey = geminiInput ? geminiInput.value.trim() : '';

      if (!geminiKey) {
        alert('Introduce tu API key de Gemini para continuar.');
        return;
      }

      localStorage.setItem('wt_gemini_key', geminiKey);
      hideApiKeysModal();
    });
  }
}

/* ---------- Navigation ---------- */

/**
 * Set up tab navigation.
 */
function setupNavigation() {
  var tabs = document.querySelectorAll('.nav-tab');

  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      var mode = tab.getAttribute('data-mode');

      // Update active tab
      tabs.forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');

      // Update active section
      var sections = document.querySelectorAll('.mode-section');
      sections.forEach(function(s) { s.classList.remove('active'); });

      var targetSection = document.getElementById(mode + '-mode');
      if (targetSection) {
        targetSection.classList.add('active');
      }

      // Trigger mode activation callbacks
      if (mode === 'vocabulary') {
        onVocabularyActivated();
      } else if (mode === 'structures') {
        onStructuresActivated();
      } else if (mode === 'errors') {
        if (typeof loadAllErrors === 'function') loadAllErrors();
      }
    });
  });
}

/* ---------- Stats ---------- */

/**
 * Refresh error counts from the server.
 */
async function refreshStats() {
  try {
    var data = getLocalStats();

    var vocabBadge = document.getElementById('vocab-count');
    var structBadge = document.getElementById('struct-count');

    if (vocabBadge) vocabBadge.textContent = '📚 ' + data.vocabulary_errors;
    if (structBadge) structBadge.textContent = '🏗️ ' + data.structure_errors;
  } catch (error) {
    console.error('Error refreshing stats:', error);
  }
}
