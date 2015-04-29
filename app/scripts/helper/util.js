/**
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

window.IOWA = window.IOWA || {};

IOWA.Util = IOWA.Util || (function() {

  "use strict";

  /**
   * Create a deferred object, allowing a Promise to be fulfilled at a later
   * time.
   * @return {{promise: !Promise, resolve: function(), reject: function()}}
   */
  function createDeferred() {
    var resolveFn;
    var rejectFn;
    var promise = new Promise(function(resolve, reject) {
      resolveFn = resolve;
      rejectFn = reject;
    });
    return {
      promise: promise,
      resolve: resolveFn,
      reject: rejectFn
    };
  }

  // From http://en.wikipedia.org/wiki/Smoothstep
  function smoothStep(start, end, point) {
    if (point <= start) {
      return 0;
    }
    if (point >= end) {
      return 1;
    }
    var x = (point - start) / (end - start); // interpolation
    return x * x * (3 - 2 * x);
  }

  /**
   * Smooth scrolls to the top of an element.
   *
   * @param {Element} el Element to scroll to.
   * @param {number=} opt_duration Optional duration for the animation to
   *     take. If not specified, the element is immediately scrolled to.
   * @param {function()=} opt_callback Callback to execute at the end of the scroll.
   */
  function smoothScroll(el, opt_duration, opt_callback) {
    var duration = opt_duration || 1;

    var scrollContainer = IOWA.Elements.ScrollContainer;

    var startTime = performance.now();
    var endTime = startTime + duration;
    var startTop = scrollContainer.scrollTop;
    var destY = el.getBoundingClientRect().top;

    if (destY === 0) {
      if (opt_callback) {
        opt_callback();
      }
      return; // already at top of element.
    }

    var callback = function(timestamp) {
      if (timestamp < endTime) {
        requestAnimationFrame(callback);
      }

      var point = smoothStep(startTime, endTime, timestamp);
      var scrollTop = Math.round(startTop + (destY * point));

      scrollContainer.scrollTop = scrollTop;

      // All done scrolling.
      if (point === 1 && opt_callback) {
        opt_callback();
      }
    };

    callback(startTime);
  }

  function isIOS() {
    return (/(iPhone|iPad|iPod)/gi).test(navigator.platform);
  }

  function isSafari() {
    var userAgent = navigator.userAgent;
    return (/Safari/gi).test(userAgent) &&
      !(/Chrome/gi).test(userAgent);
  }

  function isIE() {
    var userAgent = navigator.userAgent;
    return (/Trident/gi).test(userAgent);
  }

  function isFF() {
    var userAgent = navigator.userAgent;
    return (/Firefox/gi).test(userAgent);
  }

  function isTouchScreen() {
    return ('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch;
  }

  /**
   * Returns the static base URL of the running app.
   * https://events.google.com/io2015/about -> https://events.google.com/io2015/
   */
  function getStaticBaseURL() {
    return location.href.substring(0, location.href.lastIndexOf('/') + 1);
  }

  /**
   * Use Google's URL shortener to compress an URL for social.
   * @param {string} url - The full url.
   * @return {Promise}
   */
  function shortenURL(url) {
    var SHORTENER_API_URL = 'https://www.googleapis.com/urlshortener/v1/url';
    // TODO: add key to config.
    var SHORTENER_API_KEY = 'AIzaSyBRMm_PwR1cfjT_yLxBiV9PDrwZPRIRLxg';

    var endpoint = SHORTENER_API_URL + '?key=' + SHORTENER_API_KEY;

    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();

      xhr.open('POST', endpoint, true);
      xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');

      xhr.onloadend = function(e) {
        if (this.status === 200) {
          try {
            var data = JSON.parse(this.response);
            resolve(data.id);
          } catch (e) {
            reject('Parsing URL Shortener result failed.');
          }
        } else {
          resolve(url); // resolve with original URL.
        }
      };

      xhr.send(JSON.stringify({longUrl: url}));
    });
  }

  /**
   * Adjusts the size of the ripple to fully cover the parent element.
   * @param {Element} ripple The ripple DOM element.
   * @return {Object} parentRect Parent bounding rect, for reuse.
   */
  var resizeRipple = function(ripple) {
    var parentRect = ripple.parentNode.getBoundingClientRect();
    var radius = Math.floor(Math.sqrt(parentRect.width * parentRect.width +
      parentRect.height * parentRect.height));
    ripple.style.width = 2 * radius + 'px';
    ripple.style.height = 2 * radius + 'px';
    ripple.style.left = -radius + 'px';
    ripple.style.top = -radius + 'px';
    return parentRect;
  };

  /**
   * Reports an error to Google Analytics.
   * Normally, this is done in the window.onerror handler, but this helper method can be used in the
   * catch() of a promise to log rejections.
   * @param {Error|string} error The error to report.
   */
  var reportError = function(error) {
    // Google Analytics has a max size of 500 bytes for the event location field.
    // If we have an error with a stack trace, the trailing 500 bytes are likely to be the most
    // relevant, so grab those.
    var location = (error && typeof error.stack === 'string') ?
      error.stack.slice(-500) : 'Unknown Location';
    IOWA.Analytics.trackError(location, error);
  };

  return {
    createDeferred: createDeferred,
    isFF: isFF,
    isIE: isIE,
    isIOS: isIOS,
    isSafari: isSafari,
    isTouchScreen: isTouchScreen,
    supportsHTMLImports: 'import' in document.createElement('link'),
    smoothScroll: smoothScroll,
    shortenURL: shortenURL,
    getStaticBaseURL: getStaticBaseURL,
    resizeRipple: resizeRipple,
    reportError: reportError
  };

})();
