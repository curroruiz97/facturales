/**
 * Production Logger
 *
 * Silences console.log and console.info in production to reduce
 * information exposure and noise. Keeps console.warn and console.error
 * intact so real problems remain visible.
 *
 * Must be loaded BEFORE any other application script.
 */
(function () {
  var isDev =
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.port === '5173';

  if (isDev) return;

  var noop = function () {};
  console.log = noop;
  console.info = noop;
  console.debug = noop;
})();
