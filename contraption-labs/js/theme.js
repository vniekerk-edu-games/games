/* Contraption Labs — theme.js
 * App colour scheme (Contraption Labs only). CSS mirrors these in css/style.css.
 */
(function (CL) {
  'use strict';
  CL.THEME = {
    jem: '#0B2D6B',       // JEM Blue — main background / panels
    bright: '#00AEEF',    // Bright Blue — build mode, highlights
    green: '#8CC63F',     // Learning Green — start / success / learning
    orange: '#FF8C00',    // Play Orange — run mode / stop / play
    yellow: '#FFD200',    // Accent Yellow — selection, ruler, emphasis
    // derived shades of JEM Blue
    jemDeep: '#05153A',   // letterbox
    jemDark: '#071D47',   // lab floor
    jemLight: '#0E3478',  // top of lab gradient
    invalid: '#FF5A5A'    // "can't place here" (universal red)
  };
})(window.CL = window.CL || {});
