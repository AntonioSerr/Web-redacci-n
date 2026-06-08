/* errors.js — Error Warehouse Module */

document.addEventListener('DOMContentLoaded', function() {
  var refreshBtn = document.getElementById('refresh-errors-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadAllErrors);
  }
});

async function loadAllErrors() {
  var vocabList = document.getElementById('warehouse-vocab-list');
  var structList = document.getElementById('warehouse-struct-list');
  
  if (!vocabList || !structList) return;

  vocabList.innerHTML = '<div class="loading-spinner" style="margin: 20px auto;"></div>';
  structList.innerHTML = '<div class="loading-spinner" style="margin: 20px auto;"></div>';

  try {
    // Read from localStorage via storage.js
    var data = getDatabase();
    
    // Render Vocabulary
    vocabList.innerHTML = '';
    var vocabErrors = data.vocabulary_errors || [];
    var validVocabErrors = vocabErrors.filter(function(err) {
      return err.original_wrong_word && err.original_wrong_word !== 'N/D';
    });
    
    if (validVocabErrors.length === 0) {
      vocabList.innerHTML = '<p class="empty-text">No hay errores de vocabulario guardados.</p>';
    } else {
      validVocabErrors.forEach(function(err) {
        var streak = err.consecutive_correct || 0;
        var card = document.createElement('div');
        card.className = 'error-card modern-card';
        card.innerHTML = `
          <div class="card-body">
            <div class="card-row"><span class="card-label" style="width:130px">Error:</span> <span class="card-value error-text">"${escapeHtml(err.original_wrong_word)}"</span></div>
            <div class="card-row"><span class="card-label" style="width:130px">Corrección:</span> <span class="card-value correct-text">${escapeHtml(err.target_word)}</span></div>
            <div class="card-row"><span class="card-label" style="width:130px">Traducción:</span> <span class="card-value">${escapeHtml(err.native_translation || 'Sin traducción')}</span></div>
            <div class="card-row"><span class="card-label" style="width:130px">Racha:</span> <span class="card-value streak-text">🔥 ${streak} aciertos</span></div>
          </div>
          <div class="card-actions">
            <button class="btn-danger delete-vocab-btn" data-word="${escapeHtml(err.target_word)}" title="Eliminar este error">🗑️ Eliminar</button>
          </div>
        `;
        vocabList.appendChild(card);
      });
    }

    // Render Structures
    structList.innerHTML = '';
    var structErrors = data.structure_errors || [];
    if (structErrors.length === 0) {
      structList.innerHTML = '<p class="empty-text">No hay errores de estructura guardados.</p>';
    } else {
      structErrors.forEach(function(err) {
        var streak = err.consecutive_correct || 0;
        var correction = err.suggested_correction || err.grammar_rule_broken;
        var card = document.createElement('div');
        card.className = 'error-card modern-card';
        card.innerHTML = `
          <div class="card-body">
            <div class="card-row"><span class="card-label" style="width:130px">Frase Original:</span> <span class="card-value error-text">"${escapeHtml(err.original_wrong_sentence)}"</span></div>
            <div class="card-row"><span class="card-label" style="width:130px">Regla Gramatical:</span> <span class="card-value" style="color:var(--violet-300); font-weight:bold;">${escapeHtml(err.grammar_rule_broken)}</span></div>
            <div class="card-row"><span class="card-label" style="width:130px">Corrección:</span> <span class="card-value correct-text">${escapeHtml(correction)}</span></div>
            <div class="card-row"><span class="card-label" style="width:130px">Explicación:</span> <span class="card-value explanation-text">${escapeHtml(err.error_explanation || 'Sin explicación')}</span></div>
            <div class="card-row"><span class="card-label" style="width:130px">Racha:</span> <span class="card-value streak-text">🔥 ${streak} aciertos</span></div>
          </div>
          <div class="card-actions">
            <button class="btn-danger delete-struct-btn" data-rule="${escapeHtml(err.grammar_rule_broken)}" title="Eliminar este error">🗑️ Eliminar</button>
          </div>
        `;
        structList.appendChild(card);
      });
    }

    // Attach delete listeners
    attachDeleteListeners();

  } catch (error) {
    vocabList.innerHTML = '<p class="empty-text" style="color:red;">Error al cargar datos.</p>';
    structList.innerHTML = '<p class="empty-text" style="color:red;">Error al cargar datos.</p>';
    console.error(error);
  }
}

function attachDeleteListeners() {
  document.querySelectorAll('.delete-vocab-btn').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var word = this.getAttribute('data-word');
      await deleteVocabError(word, this);
    });
  });

  document.querySelectorAll('.delete-struct-btn').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var rule = this.getAttribute('data-rule');
      await deleteStructError(rule, this);
    });
  });
}

async function deleteVocabError(word, btn) {
  if (confirm('¿Eliminar este error de vocabulario?')) {
    deleteVocabularyError(word);
    loadAllErrors(); // Refresh UI
    if (typeof refreshStats === 'function') refreshStats();
  }
}

async function deleteStructError(rule, btn) {
  if (confirm('¿Eliminar este error de estructura?')) {
    deleteStructureError(rule);
    loadAllErrors(); // Refresh UI
    if (typeof refreshStats === 'function') refreshStats();
  }
}
