/* Contraption Labs — main.js : start the game */
(function (CL) {
  'use strict';
  CL.VERSION = 'Stage 6b';   // shown on the puzzle list, so you can check you have the newest files
  function start() {
    const sb = new CL.Sandbox(document.getElementById('lab'));
    CL.UI.init(sb);
    if (!sb.loadSaved()) sb.loadPreset('chain');
    CL.UI.showLevels(sb);   // open on the puzzle list (free play is one tap away)
    CL.sandbox = sb;        // handy for debugging in the browser console
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(window.CL = window.CL || {});
