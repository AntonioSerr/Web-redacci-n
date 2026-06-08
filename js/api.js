/* api.js — UI Feedback and Utilities */

var sessionCost = {
  totalIn: 0,
  totalOut: 0,
  totalCost: 0.0
};

// Pricing per 1M tokens (June 2026)
var MODEL_PRICING = {
  gemini: { input: 1.50, output: 9.00 }
};

function showAiToast(text) {
  var toast = document.getElementById('ai-toast');
  var toastText = document.getElementById('ai-toast-text');
  if (toast) {
    toast.style.display = 'flex';
    if (toastText) toastText.textContent = text || 'Procesando con IA...';
  }
}

function hideAiToast() {
  var toast = document.getElementById('ai-toast');
  if (toast) toast.style.display = 'none';
}

/**
 * Update the session cost tracker footer.
 */
function updateCostTracker(tokenUsage, provider) {
  if (!tokenUsage) return;
  
  var promptTokens = tokenUsage.prompt_tokens || 0;
  var completionTokens = tokenUsage.completion_tokens || 0;
  
  sessionCost.totalIn += promptTokens;
  sessionCost.totalOut += completionTokens;
  
  var pricing = MODEL_PRICING[provider] || MODEL_PRICING.gemini;
  var inputCost = (promptTokens / 1000000) * pricing.input;
  var outputCost = (completionTokens / 1000000) * pricing.output;
  sessionCost.totalCost += inputCost + outputCost;
  
  // Update DOM
  var costTotal = document.getElementById('cost-total');
  var costIn = document.getElementById('cost-tokens-in');
  var costOut = document.getElementById('cost-tokens-out');
  var costModel = document.getElementById('cost-model');
  
  if (costTotal) costTotal.textContent = '$' + sessionCost.totalCost.toFixed(4);
  if (costIn) costIn.textContent = sessionCost.totalIn.toLocaleString();
  if (costOut) costOut.textContent = sessionCost.totalOut.toLocaleString();
  if (costModel) {
    var modelName = '✨ Gemini 3.1 Flash Lite';
    costModel.textContent = modelName;
  }
}
