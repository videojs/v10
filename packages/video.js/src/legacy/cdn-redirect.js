/*!
 * video.js@10 has no player. Unversioned CDN URLs such as https://unpkg.com/video.js/dist/video.min.js follow npm's
 * `latest` tag, so they now reach this file instead of Video.js 8. It loads the same file from video.js@8 on the same
 * CDN. Pin video.js@8 in your CDN URLs to skip this redirect. Video.js 8: https://github.com/videojs/video.js
 */
(function () {
  var script = document.currentScript;
  var path = '__VIDEOJS_8_DIST_PATH__';
  var match = script && /\/video\.js(@[^/]*)?\/dist\//.exec(script.src);
  var src = match
    ? script.src.slice(0, match.index) + '/video.js@8/dist/' + path
    : 'https://cdn.jsdelivr.net/npm/video.js@8/dist/' + path;
  var nonce = script && script.nonce;
  var code = null;

  if (!window.__videojs8CdnRedirectWarned) {
    window.__videojs8CdnRedirectWarned = true;
    console.warn(
      'Unversioned video.js CDN URLs now serve video.js@10, which has no player. This page loads Video.js 8 from ' +
        'video.js@8 instead. Pin video.js@8 in your CDN URLs.'
    );
  }

  // A parser-inserted script: write v8's tag right after this one, so it runs before the page's next script.
  if (script && !script.async && !script.defer && document.readyState === 'loading') {
    document.write('<script src="' + src + '"' + (nonce ? ' nonce="' + nonce + '"' : '') + '></script>');
    return;
  }

  // Loaded async, deferred, or by page code: run v8 before this file finishes, so its load event still means `videojs`
  // is ready. Indirect eval runs it in global scope, as a script tag would. Video.js 8 supports Chrome 53, which predates
  // optional catch bindings, so this file stays ES5.
  try {
    var xhr = new XMLHttpRequest();

    xhr.open('GET', src, false);
    xhr.send();

    if (xhr.status === 200) code = xhr.responseText;
    // oxlint-disable-next-line no-unused-vars
  } catch (error) {
    // A Content Security Policy or permissions policy blocked the request; load v8 with a script tag below.
  }

  if (code !== null) {
    try {
      // oxlint-disable-next-line no-eval
      (0, eval)(code + '\n//# sourceURL=' + src);
      return;
    } catch (error) {
      // A Content Security Policy that blocks eval throws EvalError; anything else came from v8 itself.
      if (!(error instanceof EvalError)) throw error;
    }
  }

  // v8 still loads, but after this file's load event.
  var fallback = document.createElement('script');

  fallback.src = src;
  fallback.async = false;

  if (nonce) fallback.nonce = nonce;

  document.head.appendChild(fallback);
})();
