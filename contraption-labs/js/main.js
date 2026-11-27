/* Contraption Labs — main.js : start the sandbox */
(function (CL) {
  'use strict';
  function start() {
    const sb = new CL.Sandbox(document.getElementById('lab'));
    CL.UI.init(sb);
    if (sb.loadSaved()) CL.UI.toast('👋 Welcome back! Your last build is ready.');
    else sb.loadPreset('chain');
    CL.sandbox = sb; // handy for debugging in the browser console
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(window.CL = window.CL || {});
