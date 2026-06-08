/* ============================================
   writing.js — Writing Practice (Mode 1)
   ============================================ */

var activeTooltip = null;

/**
 * Initialize writing practice mode.
 */
function initWriting() {
  // Topic suggestion
  var suggestTopicBtn = document.getElementById('suggest-topic-btn');
  if (suggestTopicBtn) {
    suggestTopicBtn.addEventListener('click', suggestTopic);
  }

  // (Vocabulary panel is always visible, no toggle needed)

  // Load vocabulary suggestions
  var loadVocabBtn = document.getElementById('load-vocab-btn');
  if (loadVocabBtn) {
    loadVocabBtn.addEventListener('click', loadVocabSuggestions);
  }

  // Word counter
  var textarea = document.getElementById('writing-textarea');
  if (textarea) {
    textarea.addEventListener('input', updateWordCount);
  }

  // Submit writing
  var submitBtn = document.getElementById('submit-writing-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', submitWriting);
  }

  // Sidebar toggle
  var sidebarToggle = document.getElementById('toggle-sidebar-btn');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', toggleSidebar);
  }

  // Dismiss tooltips on outside click
  document.addEventListener('click', function(e) {
    if (activeTooltip && !e.target.closest('.error-tooltip') && !e.target.classList.contains('error-highlight')) {
      dismissTooltip();
    }
  });
}

/**
 * Suggest a random topic from the API.
 */
async function suggestTopic() {
  var settings = getSettings();
  var btn = document.getElementById('suggest-topic-btn');
  try {
    var systemInstruction = formatPrompt(SUGGEST_TOPIC_SYSTEM, {
      target_language: settings.targetLanguage,
      native_language: settings.nativeLanguage,
      level: settings.level
    });
    
    var btnText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Generando tema...'; }
    showAiToast('Generando tema...');
    
    var response = await callGeminiAPI(systemInstruction, "Suggest a typical exam topic for this level. Pick a completely random category each time.", true, 1.2);
    var data = response.data;

    var topicInput = document.getElementById('topic-input');
    var topicDesc = document.getElementById('topic-description');

    if (topicInput && data.topic) {
      topicInput.value = data.topic;
    }
    if (topicDesc && data.description) {
      topicDesc.textContent = data.description;
      topicDesc.classList.add('visible');
    }
  } catch (error) {
    alert('Error al sugerir tema: ' + error.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = btnText; }
    hideAiToast();
  }
}

// Vocabulary panel is always visible — no toggle logic needed.

/**
 * Load vocabulary suggestions for the current topic.
 */
async function loadVocabSuggestions() {
  var settings = getSettings();
  var topicInput = document.getElementById('topic-input');
  var topic = topicInput ? topicInput.value.trim() : '';

  if (!topic) {
    alert('Primero escribe o genera un tema.');
    return;
  }

  var btn = document.getElementById('load-vocab-btn');
  try {
    var systemInstruction = formatPrompt(SUGGEST_VOCABULARY_SYSTEM, {
      target_language: settings.targetLanguage,
      native_language: settings.nativeLanguage,
      level: settings.level
    });
    
    var userPrompt = `Generate vocabulary and connectors for the topic: "${topic}" for a ${settings.level} level ${settings.targetLanguage} student.`;
    
    var btnText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Generando vocabulario...'; }
    showAiToast('Generando vocabulario...');
    
    var response = await callGeminiAPI(systemInstruction, userPrompt, true);
    var data = response.data;
    
    // Fallback for missing connector examples
    var connectors = data.connectors || [];
    connectors.forEach(function(c) {
      if (!c.example) c.example = c.connector || '—';
    });

    renderVocabSuggestions(data.words || [], data.connectors || []);
  } catch (error) {
    alert('Error al generar vocabulario: ' + error.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = btnText; }
    hideAiToast();
  }
}

/**
 * Render vocabulary suggestion chips in the grid.
 */
function renderVocabSuggestions(words, connectors) {
  var container = document.getElementById('vocab-suggest-content');
  if (!container) return;

  container.innerHTML = '';

  // Words section
  if (words.length > 0) {
    var wordsTitle = document.createElement('h3');
    wordsTitle.className = 'vocab-section-title';
    wordsTitle.textContent = '📖 Palabras clave';
    container.appendChild(wordsTitle);

    var wordsGrid = document.createElement('div');
    wordsGrid.className = 'vocab-chips-grid';

    words.forEach(function(item, idx) {
      var chip = document.createElement('div');
      chip.className = 'vocab-chip';
      chip.style.animationDelay = (idx * 0.05) + 's';

      var wordDiv = document.createElement('div');
      wordDiv.className = 'word';
      wordDiv.textContent = item.word;
      chip.appendChild(wordDiv);

      if (item.translation) {
        var transDiv = document.createElement('div');
        transDiv.className = 'translation';
        transDiv.textContent = item.translation;
        chip.appendChild(transDiv);
      }

      if (item.example) {
        var exampleDiv = document.createElement('div');
        exampleDiv.className = 'example';
        exampleDiv.textContent = '💬 ' + item.example;
        chip.appendChild(exampleDiv);
      }

      wordsGrid.appendChild(chip);
    });
    container.appendChild(wordsGrid);
  }

  // Connectors section
  if (connectors.length > 0) {
    var connectorsTitle = document.createElement('h3');
    connectorsTitle.className = 'vocab-section-title';
    connectorsTitle.textContent = '🔗 Conectores';
    container.appendChild(connectorsTitle);

    var connectorsGrid = document.createElement('div');
    connectorsGrid.className = 'vocab-chips-grid';

    connectors.forEach(function(item, idx) {
      console.log('[DEBUG] Connector item:', JSON.stringify(item));
      var chip = document.createElement('div');
      chip.className = 'vocab-chip connector-chip';
      chip.style.animationDelay = (idx * 0.05) + 's';

      var wordDiv = document.createElement('div');
      wordDiv.className = 'word';
      wordDiv.textContent = item.connector;
      chip.appendChild(wordDiv);

      var transDiv = document.createElement('div');
      transDiv.className = 'translation';
      transDiv.textContent = item.translation || '—';
      chip.appendChild(transDiv);

      var usageDiv = document.createElement('div');
      usageDiv.className = 'chip-detail';
      usageDiv.innerHTML = '<strong>Uso:</strong> ' + escapeHtml(item.usage || '—');
      chip.appendChild(usageDiv);

      var exampleDiv = document.createElement('div');
      exampleDiv.className = 'chip-detail chip-example';
      var exampleText = item.example || item.usage_example || '(sin ejemplo)';
      exampleDiv.innerHTML = '<strong>Ejemplo:</strong> <em>' + escapeHtml(exampleText) + '</em>';
      chip.appendChild(exampleDiv);

      connectorsGrid.appendChild(chip);
    });
    container.appendChild(connectorsGrid);
  }
}

/**
 * Update the word count display.
 */
function updateWordCount() {
  var textarea = document.getElementById('writing-textarea');
  var wordCountEl = document.getElementById('word-count');

  if (textarea && wordCountEl) {
    var text = textarea.value.trim();
    var count = text ? text.split(/\s+/).length : 0;
    wordCountEl.textContent = count + ' palabra' + (count !== 1 ? 's' : '');
  }
}

/**
 * Submit the writing for review.
 */
async function submitWriting() {
  var settings = getSettings();
  var textarea = document.getElementById('writing-textarea');
  var topicInput = document.getElementById('topic-input');

  var text = textarea ? textarea.value.trim() : '';
  var topic = topicInput ? topicInput.value.trim() : '';

  if (!text) {
    alert('Escribe algo antes de enviarlo para revisión.');
    return;
  }

  if (text.split(/\s+/).length < 5) {
    alert('Escribe al menos 5 palabras para una revisión útil.');
    return;
  }

  var btn = document.getElementById('submit-writing-btn');
  try {
    var systemInstruction = formatPrompt(REVIEW_WRITING_SYSTEM, {
      target_language: settings.targetLanguage,
      native_language: settings.nativeLanguage,
      level: settings.level
    });
    
    var userPrompt = `Topic: ${topic}\n\nStudent Text:\n${text}`;
    
    var btnText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Revisando texto...'; }
    showAiToast('La IA está revisando tu texto...');
    
    var response = await callGeminiAPI(systemInstruction, userPrompt, true);
    var data = response.data;
    
    // Save errors locally
    if (data.errors && Array.isArray(data.errors)) {
      data.errors.forEach(function(err) {
        if (err.type === 'vocabulary' || err.type === 'spelling' || err.type === 'collocation') {
          saveVocabularyError({
            original_wrong_word: err.original_text,
            target_word: err.target_word,
            native_translation: err.native_translation,
            explanation: err.explanation
          });
        } else if (err.type === 'grammar') {
          saveStructureError({
            grammar_rule_broken: err.grammar_rule,
            original_wrong_sentence: err.original_text,
            error_explanation: err.explanation,
            suggested_correction: err.suggested_correction || err.correction
          });
        }
      });
    }

    renderReview(data, text);
  } catch (error) {
    alert('Error al revisar: ' + error.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = btnText; }
    hideAiToast();
  }
}

/**
 * Render the review results.
 */
function renderReview(data, originalText) {
  var reviewResults = document.getElementById('review-results');
  if (!reviewResults) return;

  // Render corrected text with error highlights
  renderCorrectedText(data.errors || [], originalText);

  // Render rewritten text
  var rewrittenEl = document.getElementById('rewritten-text');
  if (rewrittenEl) {
    rewrittenEl.textContent = data.rewritten_text || '';
  }

  // Render feedback
  renderFeedback(data.feedback || {});

  // Show results and scroll
  reviewResults.style.display = 'flex';
  reviewResults.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Refresh stats
  refreshStats();
}

/**
 * Render corrected text with clickable error highlights.
 */
function renderCorrectedText(errors, originalText) {
  var container = document.getElementById('corrected-text');
  if (!container) return;

  if (!errors || errors.length === 0) {
    container.innerHTML = '<p class="no-errors">✨ ¡Sin errores detectados! Excelente trabajo.</p>';
    return;
  }

  // Find exact indices for each error
  var mappedErrors = [];
  var searchStartIndex = 0;
  
  // We should try to find them in the general order the LLM provided
  errors.forEach(function(error, idx) {
    if (!error.original_text) return;
    var start = originalText.indexOf(error.original_text, searchStartIndex);
    if (start === -1) {
      start = originalText.indexOf(error.original_text); // Try from beginning
    }
    if (start !== -1) {
      mappedErrors.push({
        type: error.type,
        original_text: error.original_text,
        correction: error.correction,
        explanation: error.explanation,
        exactStart: start,
        exactEnd: start + error.original_text.length,
        idx: idx
      });
      searchStartIndex = start + error.original_text.length;
    }
  });

  // Sort by exactStart
  mappedErrors.sort(function(a, b) {
    return a.exactStart - b.exactStart;
  });

  // Remove overlapping errors
  var filtered = [];
  var lastEnd = -1;
  mappedErrors.forEach(function(error) {
    if (error.exactStart >= lastEnd) {
      filtered.push(error);
      lastEnd = error.exactEnd;
    }
  });

  // Build highlighted HTML
  var html = '';
  var lastIndex = 0;

  filtered.forEach(function(error) {
    var start = error.exactStart;
    var end = error.exactEnd;

    // Text before error
    html += escapeHtml(originalText.substring(lastIndex, start));

    // Error span
    html += '<span class="error-highlight" ' +
      'data-error-idx="' + error.idx + '" ' +
      'data-original="' + escapeAttr(error.original_text) + '" ' +
      'data-correction="' + escapeAttr(error.correction || '') + '" ' +
      'data-explanation="' + escapeAttr(error.explanation || '') + '" ' +
      'data-type="' + escapeAttr(error.type || 'error') + '">' +
      escapeHtml(error.original_text) + '</span>';

    lastIndex = end;
  });

  // Remaining text
  html += escapeHtml(originalText.substring(lastIndex));

  container.innerHTML = html;

  // Attach click listeners to error spans
  var spans = container.querySelectorAll('.error-highlight');
  spans.forEach(function(span) {
    span.addEventListener('click', function(e) {
      e.stopPropagation();
      showErrorTooltip(span);
    });
  });
}

/**
 * Show a tooltip for an error highlight.
 */
function showErrorTooltip(span) {
  dismissTooltip();

  var original = span.getAttribute('data-original');
  var correction = span.getAttribute('data-correction');
  var explanation = span.getAttribute('data-explanation');
  var errorType = span.getAttribute('data-type');

  var tooltip = document.createElement('div');
  tooltip.className = 'error-tooltip';

  var typeLabel = document.createElement('div');
  typeLabel.className = 'tooltip-type tooltip-type-' + errorType;
  typeLabel.textContent = errorType.charAt(0).toUpperCase() + errorType.slice(1);
  tooltip.appendChild(typeLabel);

  var origDiv = document.createElement('div');
  origDiv.className = 'tooltip-original';
  origDiv.innerHTML = '<strong>Original:</strong> ' + escapeHtml(original);
  tooltip.appendChild(origDiv);

  var corrDiv = document.createElement('div');
  corrDiv.className = 'tooltip-correction';
  corrDiv.innerHTML = '<strong>Corrección:</strong> ' + escapeHtml(correction);
  tooltip.appendChild(corrDiv);

  if (explanation) {
    var explDiv = document.createElement('div');
    explDiv.className = 'tooltip-explanation';
    explDiv.textContent = explanation;
    tooltip.appendChild(explDiv);
  }

  // Position the tooltip
  var rect = span.getBoundingClientRect();
  tooltip.style.position = 'fixed';
  tooltip.style.top = (rect.bottom + 8) + 'px';
  tooltip.style.left = Math.max(10, rect.left - 20) + 'px';
  tooltip.style.zIndex = '10000';

  document.body.appendChild(tooltip);
  activeTooltip = tooltip;

  // Ensure tooltip doesn't go off screen
  var tooltipRect = tooltip.getBoundingClientRect();
  if (tooltipRect.right > window.innerWidth - 10) {
    tooltip.style.left = (window.innerWidth - tooltipRect.width - 10) + 'px';
  }
  if (tooltipRect.bottom > window.innerHeight - 10) {
    tooltip.style.top = (rect.top - tooltipRect.height - 8) + 'px';
  }
}

/**
 * Dismiss the active error tooltip.
 */
function dismissTooltip() {
  if (activeTooltip) {
    activeTooltip.remove();
    activeTooltip = null;
  }
}

/**
 * Render feedback sections (strengths, weaknesses, improvement_tips).
 */
function renderFeedback(feedback) {
  var container = document.getElementById('feedback-content');
  if (!container) return;

  container.innerHTML = '';

  if (feedback.grades) {
    var gradesSection = document.createElement('div');
    gradesSection.className = 'feedback-section feedback-grades';
    
    var title = document.createElement('h3');
    title.textContent = '🎓 Notas y Evaluación';
    gradesSection.appendChild(title);

    var gradesList = document.createElement('ul');
    gradesList.className = 'feedback-list';

    var labels = {
      general: 'General',
      grammar: 'Gramática',
      spelling: 'Ortografía',
      vocabulary: 'Vocabulario'
    };

    Object.keys(labels).forEach(function(key) {
      if (feedback.grades[key] && feedback.grades[key] !== 'N/D') {
        var li = document.createElement('li');
        var strong = document.createElement('strong');
        strong.textContent = labels[key] + ': ';
        li.appendChild(strong);
        
        var span = document.createElement('span');
        if (typeof marked !== 'undefined') {
          span.innerHTML = marked.parseInline(feedback.grades[key]);
        } else {
          span.textContent = feedback.grades[key];
        }
        li.appendChild(span);
        gradesList.appendChild(li);
      }
    });

    if (gradesList.children.length > 0) {
      gradesSection.appendChild(gradesList);
      container.appendChild(gradesSection);
    }
  }

  if (feedback.strengths && feedback.strengths.length > 0) {
    container.appendChild(createFeedbackSection('💪 Puntos fuertes', feedback.strengths, 'feedback-strengths'));
  }

  if (feedback.weaknesses && feedback.weaknesses.length > 0) {
    container.appendChild(createFeedbackSection('⚠️ Áreas de mejora', feedback.weaknesses, 'feedback-weaknesses'));
  }

  if (feedback.improvement_tips && feedback.improvement_tips.length > 0) {
    container.appendChild(createFeedbackSection('💡 Consejos', feedback.improvement_tips, 'feedback-tips'));
  }
}

/**
 * Create a feedback section (strengths/weaknesses/tips).
 */
function createFeedbackSection(title, items, className) {
  var section = document.createElement('div');
  section.className = 'feedback-section ' + className;

  var h3 = document.createElement('h3');
  h3.textContent = title;
  section.appendChild(h3);

  var ul = document.createElement('ul');
  items.forEach(function(item) {
    var li = document.createElement('li');
    if (typeof marked !== 'undefined') {
      li.innerHTML = marked.parseInline(item);
    } else {
      li.textContent = item;
    }
    ul.appendChild(li);
  });
  section.appendChild(ul);

  return section;
}

/**
 * Toggle the review sidebar visibility.
 */
function toggleSidebar() {
  var sidebar = document.getElementById('review-sidebar');
  var toggleBtn = document.getElementById('toggle-sidebar-btn');

  if (sidebar) {
    sidebar.classList.toggle('collapsed');
    if (toggleBtn) {
      toggleBtn.textContent = sidebar.classList.contains('collapsed') ? '▶ Reescritura' : '◀ Reescritura';
    }
  }
}

/**
 * Escape HTML attribute values.
 */
function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
