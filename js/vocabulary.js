/* ============================================
   vocabulary.js — Vocabulary Practice (Mode 2)
   ============================================ */

var vocabState = {
  errors: [],
  queue: [],
  currentIndex: 0,
  completed: 0,
  total: 0,
  isChecking: false
};

/**
 * Initialize vocabulary practice mode.
 */
function initVocabulary() {
  var checkBtn = document.getElementById('vocab-check-btn');
  var nextBtn = document.getElementById('vocab-next-btn');
  var restartBtn = document.getElementById('vocab-restart-btn');
  var answerInput = document.getElementById('vocab-answer-input');

  if (checkBtn) {
    checkBtn.addEventListener('click', checkVocabAnswer);
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', showNextVocabWord);
  }

  if (restartBtn) {
    restartBtn.addEventListener('click', loadVocabularyErrors);
  }

  if (answerInput) {
    answerInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!vocabState.isChecking) {
          // If next button is visible, go next; otherwise check
          var nextBtn = document.getElementById('vocab-next-btn');
          if (nextBtn && nextBtn.style.display !== 'none') {
            showNextVocabWord();
          } else {
            checkVocabAnswer();
          }
        }
      }
    });
  }
}

/**
 * Called when the vocabulary tab is activated.
 */
function onVocabularyActivated() {
  loadVocabularyErrors();
}

/**
 * Fetch vocabulary errors from the backend and set up the session.
 */
async function loadVocabularyErrors() {
  try {
    var allErrors = getVocabularyErrors() || [];
    vocabState.errors = allErrors.filter(function(err) {
      return err.original_wrong_word && err.original_wrong_word !== 'N/D';
    });

    if (vocabState.errors.length === 0) {
      showVocabEmpty();
      return;
    }

    // Shuffle the errors
    vocabState.queue = shuffleArray(vocabState.errors.map(function(_, i) { return i; }));
    vocabState.completed = 0;
    vocabState.total = vocabState.queue.length;

    showVocabPractice();
    showCurrentVocabWord();
  } catch (error) {
    console.error('Error loading vocabulary errors:', error);
    showVocabEmpty();
  }
}

/**
 * Show the empty state.
 */
function showVocabEmpty() {
  document.getElementById('vocab-empty').style.display = 'block';
  document.getElementById('vocab-practice').style.display = 'none';
  document.getElementById('vocab-complete').style.display = 'none';
}

/**
 * Show the practice UI.
 */
function showVocabPractice() {
  document.getElementById('vocab-empty').style.display = 'none';
  document.getElementById('vocab-practice').style.display = 'block';
  document.getElementById('vocab-complete').style.display = 'none';
}

/**
 * Show the completion screen.
 */
function showVocabComplete() {
  document.getElementById('vocab-empty').style.display = 'none';
  document.getElementById('vocab-practice').style.display = 'none';
  document.getElementById('vocab-complete').style.display = 'block';
}

/**
 * Display the current vocabulary word to practice.
 */
function showCurrentVocabWord() {
  if (vocabState.queue.length === 0) {
    showVocabComplete();
    return;
  }

  var errorIdx = vocabState.queue[0];
  var error = vocabState.errors[errorIdx];

  var nativeWordEl = document.getElementById('vocab-native-word');
  var progressEl = document.getElementById('vocab-progress');
  var progressBar = document.getElementById('vocab-progress-bar');
  var feedbackEl = document.getElementById('vocab-feedback');
  var nextBtn = document.getElementById('vocab-next-btn');
  var answerInput = document.getElementById('vocab-answer-input');
  var streakEl = document.getElementById('vocab-streak');

  if (nativeWordEl) {
    nativeWordEl.textContent = error.native_translation || '—';
  }

  if (progressEl) {
    progressEl.textContent = vocabState.completed + ' / ' + vocabState.total;
  }

  if (progressBar) {
    var pct = vocabState.total > 0 ? (vocabState.completed / vocabState.total) * 100 : 0;
    progressBar.style.width = pct + '%';
  }

  // Show streak
  if (streakEl) {
    var streak = error.consecutive_correct || 0;
    var dots = '';
    for (var i = 0; i < 5; i++) {
      if (i < streak) {
        dots += '<span class="streak-dot"></span>';
      } else {
        dots += '<span class="streak-dot empty"></span>';
      }
    }
    streakEl.innerHTML = 'Racha: <span class="streak-dots">' + dots + '</span>';
  }

  // Reset UI
  if (feedbackEl) {
    feedbackEl.textContent = '';
    feedbackEl.className = 'practice-feedback';
  }
  if (nextBtn) nextBtn.style.display = 'none';
  
  var checkBtn = document.getElementById('vocab-check-btn');
  if (checkBtn) checkBtn.disabled = false;

  if (answerInput) {
    answerInput.value = '';
    answerInput.disabled = false;
    answerInput.focus();
  }
}

/**
 * Check the user's vocabulary answer.
 */
async function checkVocabAnswer() {
  if (vocabState.isChecking || vocabState.queue.length === 0) return;

  var answerInput = document.getElementById('vocab-answer-input');
  var feedbackEl = document.getElementById('vocab-feedback');
  var nextBtn = document.getElementById('vocab-next-btn');
  var checkBtn = document.getElementById('vocab-check-btn');

  var userAnswer = (answerInput ? answerInput.value.trim() : '');
  if (!userAnswer) {
    if (answerInput) answerInput.focus();
    return;
  }

  var currentError = vocabState.errors[vocabState.queue[0]];
  vocabState.isChecking = true;
  if (checkBtn) checkBtn.disabled = true;

  try {
    var isCorrect = userAnswer.toLowerCase() === currentError.target_word.toLowerCase();
    
    // Update local storage
    updateVocabularyStreak(currentError.target_word, isCorrect);
    
    if (isCorrect) {
      if (feedbackEl) {
        feedbackEl.className = 'practice-feedback correct';
        feedbackEl.textContent = '✅ ¡Correcto!';
      }
      vocabState.queue.shift();
      vocabState.completed++;
      
      var progressEl = document.getElementById('vocab-progress');
      var progressBar = document.getElementById('vocab-progress-bar');
      if (progressEl) progressEl.textContent = vocabState.completed + ' / ' + vocabState.total;
      if (progressBar) {
        var pct = (vocabState.completed / vocabState.total) * 100;
        progressBar.style.width = pct + '%';
      }
    } else {
      // Incorrect — add back to end
      if (feedbackEl) {
        feedbackEl.className = 'practice-feedback incorrect';
        var expectedHtml = '❌ Incorrecto. <br>';
        expectedHtml += 'La respuesta era: <span class="expected">' + escapeHtml(currentError.target_word) + '</span>';
        feedbackEl.innerHTML = expectedHtml;
      }
      // Move to end of queue
      vocabState.queue.push(vocabState.queue.shift());
    }

    if (answerInput) answerInput.disabled = true;
    if (nextBtn) nextBtn.style.display = 'inline-block';

  } catch (error) {
    if (feedbackEl) {
      feedbackEl.className = 'practice-feedback incorrect';
      feedbackEl.textContent = '⚠️ Error: ' + error.message;
    }
  } finally {
    vocabState.isChecking = false;
  }
}

/**
 * Move to the next vocabulary word.
 */
function showNextVocabWord() {
  showCurrentVocabWord();
  refreshStats();
}

/**
 * Shuffle an array (Fisher-Yates).
 */
function shuffleArray(arr) {
  var shuffled = arr.slice();
  for (var i = shuffled.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
}

/**
 * Escape HTML characters.
 */
function escapeHtml(text) {
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
