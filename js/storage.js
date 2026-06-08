/* ============================================
   storage.js — Local State Management
   ============================================ */

const STORAGE_KEY = 'wt_database';

/**
 * Get the full database from localStorage.
 */
function getDatabase() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Error parsing local database', e);
    }
  }
  return {
    vocabulary_errors: [],
    structure_errors: []
  };
}

/**
 * Save the full database to localStorage.
 */
function saveDatabase(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

/**
 * Get all vocabulary errors.
 */
function getVocabularyErrors() {
  return getDatabase().vocabulary_errors;
}

/**
 * Get all structure errors.
 */
function getStructureErrors() {
  return getDatabase().structure_errors;
}

/**
 * Save a new vocabulary error.
 */
function saveVocabularyError(error) {
  const db = getDatabase();
  // Avoid duplicates
  const exists = db.vocabulary_errors.some(v => v.target_word === error.target_word);
  if (!exists) {
    // Ensure standard shape
    db.vocabulary_errors.push({
      original_wrong_word: error.original_wrong_word || '',
      target_word: error.target_word || '',
      native_translation: error.native_translation || '',
      explanation: error.explanation || '',
      consecutive_correct: 0
    });
    saveDatabase(db);
  }
}

/**
 * Save a new structure error.
 */
function saveStructureError(error) {
  const db = getDatabase();
  // Avoid duplicates
  const exists = db.structure_errors.some(s => s.grammar_rule_broken === error.grammar_rule_broken);
  if (!exists) {
    db.structure_errors.push({
      grammar_rule_broken: error.grammar_rule_broken || '',
      original_wrong_sentence: error.original_wrong_sentence || '',
      error_explanation: error.error_explanation || '',
      suggested_correction: error.suggested_correction || '',
      consecutive_correct: 0
    });
    saveDatabase(db);
  }
}

/**
 * Delete a vocabulary error.
 */
function deleteVocabularyError(word) {
  const db = getDatabase();
  db.vocabulary_errors = db.vocabulary_errors.filter(v => v.target_word !== word);
  saveDatabase(db);
}

/**
 * Delete a structure error.
 */
function deleteStructureError(rule) {
  const db = getDatabase();
  db.structure_errors = db.structure_errors.filter(s => s.grammar_rule_broken !== rule);
  saveDatabase(db);
}

/**
 * Update the streak for a vocabulary word.
 */
function updateVocabularyStreak(word, isCorrect) {
  const db = getDatabase();
  const entry = db.vocabulary_errors.find(v => v.target_word === word);
  if (entry) {
    if (isCorrect) {
      entry.consecutive_correct = (entry.consecutive_correct || 0) + 1;
      // If reached 3, remove it
      if (entry.consecutive_correct >= 3) {
        db.vocabulary_errors = db.vocabulary_errors.filter(v => v.target_word !== word);
      }
    } else {
      entry.consecutive_correct = 0;
    }
    saveDatabase(db);
  }
}

/**
 * Get current stats (counts).
 */
function getLocalStats() {
  const db = getDatabase();
  return {
    vocabulary_errors: db.vocabulary_errors.length,
    structure_errors: db.structure_errors.length
  };
}

// Expose globals
window.getDatabase = getDatabase;
window.getVocabularyErrors = getVocabularyErrors;
window.getStructureErrors = getStructureErrors;
window.saveVocabularyError = saveVocabularyError;
window.saveStructureError = saveStructureError;
window.deleteVocabularyError = deleteVocabularyError;
window.deleteStructureError = deleteStructureError;
window.updateVocabularyStreak = updateVocabularyStreak;
window.getLocalStats = getLocalStats;
