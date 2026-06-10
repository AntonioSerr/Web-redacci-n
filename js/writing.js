/* ============================================
   writing.js — Writing Practice (Mode 1)
   ============================================ */

var activeTooltip = null;
var suggestedTopics = [];

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
    
    var userPrompt = "Suggest a typical exam topic for this level. Pick a completely random category each time.";
    if (suggestedTopics.length > 0) {
      userPrompt += " DO NOT suggest any of these topics: " + suggestedTopics.join(', ');
    }
    
    var response = await callGeminiAPI(systemInstruction, userPrompt, true, 1.7);
    var data = response.data;

    var topicInput = document.getElementById('topic-input');
    var topicDesc = document.getElementById('topic-description');

    if (topicInput && data.topic) {
      topicInput.value = data.topic;
      suggestedTopics.push(data.topic);
      if (suggestedTopics.length > 10) {
        suggestedTopics.shift();
      }
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
    var severityMap = {
      'Suave': 'Empático, constructivo, motivador pero sin omitir ningún error.',
      'Normal': 'Profesional, objetivo y directo.',
      'Exigente': 'Estricto, técnico, sin adornos ni frases de relleno.',
      'Cabrón': 'Sarcástico, humillante, burlón, que se ría de los fallos, pero que NO OMITA NINGÚN ERROR. Debe señalar cada fallo como si fuera una tragedia griega o una muestra de incompetencia absoluta.'
    };
    var severityTone = severityMap[settings.severity] || severityMap['Exigente'];

    var systemInstruction = formatPrompt(REVIEW_WRITING_SYSTEM, {
      target_language: settings.targetLanguage,
      native_language: settings.nativeLanguage,
      level: settings.level,
      severity_tone: severityTone
    });
    
    var userPrompt = `Topic: ${topic}\n\nStudent Text:\n${text}`;
    
    var btnText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Revisando texto...'; }
    showAiToast('La IA está revisando tu texto...');
    
    var response = await callGeminiAPI(systemInstruction, userPrompt, true, 0.2);
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

  // Render exam coaching
  var examCoachingContainer = document.getElementById('exam-coaching-container');
  var examCoachingContent = document.getElementById('exam-coaching-content');
  if (examCoachingContainer && examCoachingContent) {
    if (data.exam_coaching) {
      if (typeof marked !== 'undefined') {
        examCoachingContent.innerHTML = marked.parse(data.exam_coaching);
      } else {
        examCoachingContent.textContent = data.exam_coaching;
      }
      examCoachingContainer.style.display = 'block';
    } else {
      examCoachingContainer.style.display = 'none';
    }
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

  var mappedErrors = [];
  var markedRanges = [];

  errors.forEach(function(error, idx) {
    if (!error.original_text) return;
    
    var occurrences = [];
    var pos = originalText.indexOf(error.original_text);
    while (pos !== -1) {
      occurrences.push(pos);
      pos = originalText.indexOf(error.original_text, pos + 1);
    }
    
    var validOccurrences = occurrences.filter(function(start) {
      var end = start + error.original_text.length;
      return !markedRanges.some(function(range) {
        return Math.max(start, range.start) < Math.min(end, range.end);
      });
    });

    if (validOccurrences.length > 0) {
      var start;
      if (typeof error.start_index !== 'undefined') {
        var closest = validOccurrences[0];
        var minDiff = Math.abs(closest - error.start_index);
        for (var i = 1; i < validOccurrences.length; i++) {
          var diff = Math.abs(validOccurrences[i] - error.start_index);
          if (diff < minDiff) {
            minDiff = diff;
            closest = validOccurrences[i];
          }
        }
        start = closest;
      } else {
        start = validOccurrences[0];
      }

      var end = start + error.original_text.length;

      mappedErrors.push({
        type: error.type,
        original_text: error.original_text,
        correction: error.correction,
        explanation: error.explanation,
        exactStart: start,
        exactEnd: end,
        idx: idx
      });
      
      markedRanges.push({ start: start, end: end });
    }
  });

  mappedErrors.sort(function(a, b) {
    return a.exactStart - b.exactStart;
  });

  var html = '';
  var lastIndex = 0;

  mappedErrors.forEach(function(error) {
    var start = error.exactStart;
    var end = error.exactEnd;

    html += escapeHtml(originalText.substring(lastIndex, start));

    html += '<span class="error-highlight" ' +
      'data-error-idx="' + error.idx + '" ' +
      'data-original="' + escapeAttr(error.original_text) + '" ' +
      'data-correction="' + escapeAttr(error.correction || '') + '" ' +
      'data-explanation="' + escapeAttr(error.explanation || '') + '" ' +
      'data-type="' + escapeAttr(error.type || 'error') + '">' +
      escapeHtml(error.original_text) + '</span>';

    lastIndex = end;
  });

  html += escapeHtml(originalText.substring(lastIndex));

  container.innerHTML = html;

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
