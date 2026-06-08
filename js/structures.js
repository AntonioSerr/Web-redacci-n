/* structures.js — Structure Practice (Mode 3) — 3 Sentences */

var structState = {
  errors: [],
  queue: [],
  completed: 0,
  total: 0,
  isChecking: false
};

function initStructures() {
  var checkBtn = document.getElementById('struct-check-btn');
  var nextBtn = document.getElementById('struct-next-btn');
  var restartBtn = document.getElementById('struct-restart-btn');
  
  if (checkBtn) checkBtn.addEventListener('click', checkStructAnswer);
  if (nextBtn) nextBtn.addEventListener('click', showNextStructure);
  if (restartBtn) restartBtn.addEventListener('click', loadStructureErrors);
}

function onStructuresActivated() {
  loadStructureErrors();
}

async function loadStructureErrors() {
  try {
    var allErrors = getStructureErrors() || [];
    structState.errors = allErrors;
    if (structState.errors.length === 0) { showStructEmpty(); return; }
    structState.queue = shuffleArray(structState.errors.map(function(_, i) { return i; }));
    structState.completed = 0;
    structState.total = structState.queue.length;
    showStructPractice();
    showCurrentStructure();
  } catch (error) {
    console.error('Error loading structure errors:', error);
    showStructEmpty();
  }
}

function showStructEmpty() {
  document.getElementById('struct-empty').style.display = 'block';
  document.getElementById('struct-practice').style.display = 'none';
  document.getElementById('struct-complete').style.display = 'none';
}

function showStructPractice() {
  document.getElementById('struct-empty').style.display = 'none';
  document.getElementById('struct-practice').style.display = 'block';
  document.getElementById('struct-complete').style.display = 'none';
}

function showStructComplete() {
  document.getElementById('struct-empty').style.display = 'none';
  document.getElementById('struct-practice').style.display = 'none';
  document.getElementById('struct-complete').style.display = 'block';
}

function showCurrentStructure() {
  if (structState.queue.length === 0) { showStructComplete(); return; }
  var errorIdx = structState.queue[0];
  var error = structState.errors[errorIdx];
  
  var ruleEl = document.getElementById('struct-rule');
  var explanationEl = document.getElementById('struct-explanation');
  var originalEl = document.getElementById('struct-original');
  var correctionEl = document.getElementById('struct-correction');
  var progressEl = document.getElementById('struct-progress');
  var progressBar = document.getElementById('struct-progress-bar');
  var feedbackEl = document.getElementById('struct-feedback');
  var nextBtn = document.getElementById('struct-next-btn');
  
  if (ruleEl) ruleEl.textContent = error.grammar_rule_broken || '—';
  if (explanationEl) explanationEl.textContent = error.error_explanation || '—';
  if (originalEl) originalEl.textContent = error.original_wrong_sentence || '—';
  if (correctionEl) correctionEl.textContent = error.suggested_correction || '—';
  if (progressEl) progressEl.textContent = structState.completed + ' / ' + structState.total;
  if (progressBar) {
    var pct = structState.total > 0 ? (structState.completed / structState.total) * 100 : 0;
    progressBar.style.width = pct + '%';
  }
  
  // Clear inputs and feedback
  for (var i = 1; i <= 3; i++) {
    var input = document.getElementById('struct-sentence-' + i);
    if (input) { input.value = ''; input.disabled = false; }
  }
  if (feedbackEl) feedbackEl.innerHTML = '';
  if (nextBtn) nextBtn.style.display = 'none';
  
  // Focus first input
  var first = document.getElementById('struct-sentence-1');
  if (first) first.focus();
}

async function checkStructAnswer() {
  if (structState.isChecking || structState.queue.length === 0) return;
  
  var sentences = [];
  for (var i = 1; i <= 3; i++) {
    var input = document.getElementById('struct-sentence-' + i);
    var val = input ? input.value.trim() : '';
    if (!val) {
      alert('Debes escribir las 3 frases antes de enviar.');
      if (input) input.focus();
      return;
    }
    sentences.push(val);
  }
  
  var errorIdx = structState.queue[0];
  var error = structState.errors[errorIdx];
  var settings = getSettings();
  var checkBtn = document.getElementById('struct-check-btn');
  
  structState.isChecking = true;
  
  try {
    var systemInstruction = formatPrompt(STRUCTURE_CHECK_SYSTEM, {
      target_language: settings.targetLanguage,
      native_language: settings.nativeLanguage,
      level: settings.level,
      grammar_rule_broken: error.grammar_rule_broken,
      original_wrong_sentence: error.original_wrong_sentence
    });
    
    var userPrompt = "New sentences from the student:\n" + sentences.map((s, i) => `${i+1}. ${s}`).join("\n");
    
    if (checkBtn) { checkBtn.disabled = true; checkBtn.textContent = 'Verificando con IA...'; }
    showAiToast('Verificando 3 frases con IA...');
    
    var response = await callGeminiAPI(systemInstruction, userPrompt, true);
    var data = response.data;
    
    // Manage state if all correct
    if (data.all_correct) {
      deleteStructureError(error.grammar_rule_broken);
    }
    
    renderStructEvaluations(data);
    
    // Disable inputs after check
    for (var i = 1; i <= 3; i++) {
      var input = document.getElementById('struct-sentence-' + i);
      if (input) input.disabled = true;
    }
    
    if (data.all_correct) {
      structState.queue.shift();
      structState.completed++;
      var progressEl = document.getElementById('struct-progress');
      var progressBar = document.getElementById('struct-progress-bar');
      if (progressEl) progressEl.textContent = structState.completed + ' / ' + structState.total;
      if (progressBar) progressBar.style.width = ((structState.completed / structState.total) * 100) + '%';
    }
    // If not all correct, error stays in queue (no shift, no re-queue needed)
    
    var nextBtn = document.getElementById('struct-next-btn');
    if (nextBtn) nextBtn.style.display = 'inline-block';
    
  } catch (err) {
    var feedbackEl = document.getElementById('struct-feedback');
    if (feedbackEl) feedbackEl.innerHTML = '<div class="eval-item incorrect">⚠️ Error: ' + escapeHtml(err.message) + '</div>';
  } finally {
    structState.isChecking = false;
    if (checkBtn) { checkBtn.disabled = false; checkBtn.textContent = 'Comprobar'; }
    hideAiToast();
  }
}

function renderStructEvaluations(data) {
  var container = document.getElementById('struct-feedback');
  if (!container) return;
  container.innerHTML = '';
  
  if (data.all_correct) {
    var header = document.createElement('div');
    header.className = 'eval-item correct';
    header.innerHTML = '<strong>✅ ¡Las 3 frases son correctas!</strong> Este error se ha eliminado permanentemente.';
    container.appendChild(header);
  }
  
  var evaluations = data.evaluations || [];
  evaluations.forEach(function(ev) {
    var item = document.createElement('div');
    item.className = 'eval-item ' + (ev.correct ? 'correct' : 'incorrect');
    var icon = ev.correct ? '✅' : '❌';
    item.innerHTML = '<strong>' + icon + ' Frase ' + ev.sentence_index + ':</strong> ' + escapeHtml(ev.explanation);
    container.appendChild(item);
  });
  
  if (!data.all_correct) {
    var note = document.createElement('div');
    note.style.marginTop = 'var(--space-sm)';
    note.style.fontSize = '0.8rem';
    note.style.color = 'var(--text-muted)';
    note.textContent = 'Corrige las frases incorrectas e inténtalo de nuevo.';
    container.appendChild(note);
  }
}

function showNextStructure() {
  // If last answer was wrong, the error is still at queue[0], so we just re-show it
  // If last answer was correct, queue[0] was shifted, so we show the new front
  showCurrentStructure();
  refreshStats();
}
