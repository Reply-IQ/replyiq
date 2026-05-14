/**
 * ReplyIQ Review Widget v1.0
 * Embed your Google rating on any website.
 *
 * Usage:
 *   <div id="replyiq-widget" data-property-id="YOUR_PROPERTY_ID"></div>
 *   <script src="https://app.replyiq.ch/widget.js" async></script>
 *
 * Powered by ReplyIQ — app.replyiq.ch
 */
(function () {
  'use strict';

  function init() {
    const containers = document.querySelectorAll('[id^="replyiq-widget"], .replyiq-widget');
    containers.forEach(function (el) {
      const propertyId = el.getAttribute('data-property-id');
      const theme      = el.getAttribute('data-theme') || 'dark';   // 'dark' | 'light'
      const style      = el.getAttribute('data-style') || 'badge';  // 'badge' | 'card' | 'inline'
      if (!propertyId) { el.innerHTML = '<!-- ReplyIQ: data-property-id missing -->'; return; }
      renderWidget(el, propertyId, theme, style);
    });
  }

  function renderWidget(el, propertyId, theme, widgetStyle) {
    const apiUrl = 'https://app.replyiq.ch/api/widget?id=' + encodeURIComponent(propertyId);

    // Show skeleton while loading
    el.innerHTML = buildSkeleton(theme);

    fetch(apiUrl)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || data.error) { el.innerHTML = ''; return; }
        el.innerHTML = buildWidget(data, theme, widgetStyle);
      })
      .catch(function () { el.innerHTML = ''; });
  }

  function stars(rating, size) {
    size = size || 14;
    var full  = Math.floor(rating);
    var half  = rating % 1 >= 0.5 ? 1 : 0;
    var empty = 5 - full - half;
    var html  = '<span style="display:inline-flex;gap:1px;vertical-align:middle">';
    for (var i = 0; i < full;  i++) html += '<span style="color:#C9A96E;font-size:' + size + 'px">★</span>';
    if (half)                        html += '<span style="color:#C9A96E;font-size:' + size + 'px">⯨</span>';
    for (var j = 0; j < empty; j++) html += '<span style="color:#555;font-size:' + size + 'px">★</span>';
    return html + '</span>';
  }

  function buildSkeleton(theme) {
    var bg = theme === 'light' ? '#f5f5f5' : '#1a1a24';
    return '<div style="background:' + bg + ';border-radius:12px;padding:14px 18px;display:inline-flex;align-items:center;gap:10px;animation:replyiq-pulse 1.5s ease infinite;">' +
           '<div style="width:80px;height:20px;background:#333;border-radius:4px;"></div>' +
           '</div>' +
           '<style>@keyframes replyiq-pulse{0%,100%{opacity:1}50%{opacity:.5}}</style>';
  }

  function buildWidget(data, theme, widgetStyle) {
    var bg      = theme === 'light' ? '#ffffff' : '#1a1a24';
    var border  = theme === 'light' ? '#e0e0e0' : '#2a2a3a';
    var text1   = theme === 'light' ? '#111111' : '#f0f0f5';
    var text2   = theme === 'light' ? '#666666' : '#a0a0b8';
    var rating  = parseFloat(data.rating) || 0;
    var count   = parseInt(data.totalReviews) || 0;
    var name    = data.name || 'ReplyIQ';
    var logoUrl = 'https://app.replyiq.ch/logo-gold.svg';
    var link    = 'https://app.replyiq.ch?utm_source=widget&utm_medium=embed&utm_content=' + encodeURIComponent(name);

    if (widgetStyle === 'badge') {
      return '<a href="' + link + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:10px;background:' + bg + ';border:1px solid ' + border + ';border-radius:50px;padding:8px 16px 8px 10px;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.12);">' +
             '<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#C9A96E,#F59E0B);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">★</div>' +
             '<div>' +
               '<div style="display:flex;align-items:center;gap:6px">' +
                 '<span style="font-size:16px;font-weight:700;color:' + text1 + ';line-height:1">' + rating.toFixed(1) + '</span>' +
                 stars(rating, 13) +
               '</div>' +
               '<div style="font-size:10px;color:' + text2 + ';margin-top:1px">' + count.toLocaleString() + ' reviews · Google</div>' +
             '</div>' +
             '</a>';
    }

    if (widgetStyle === 'card') {
      return '<div style="background:' + bg + ';border:1px solid ' + border + ';border-radius:16px;padding:20px 22px;max-width:240px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.1);">' +
             '<div style="font-size:12px;color:' + text2 + ';margin-bottom:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px">' + name + '</div>' +
             '<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:6px">' +
               '<span style="font-size:36px;font-weight:700;color:#C9A96E;line-height:1">' + rating.toFixed(1) + '</span>' +
               '<span style="font-size:12px;color:' + text2 + '">/ 5.0</span>' +
             '</div>' +
             '<div style="margin-bottom:6px">' + stars(rating, 16) + '</div>' +
             '<div style="font-size:12px;color:' + text2 + ';margin-bottom:16px">' + count.toLocaleString() + ' verified Google reviews</div>' +
             '<a href="' + link + '" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:5px;text-decoration:none;font-size:10px;color:' + text2 + '">' +
               'Powered by <span style="color:#C9A96E;font-weight:700">ReplyIQ</span>' +
             '</a>' +
             '</div>';
    }

    // Inline
    return '<span style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;font-size:14px;color:' + text1 + '">' +
           '<strong style="color:#C9A96E">' + rating.toFixed(1) + '</strong> ' +
           stars(rating, 13) +
           ' <span style="color:' + text2 + ';font-size:12px">(' + count.toLocaleString() + ' reviews)</span>' +
           ' <a href="' + link + '" target="_blank" rel="noopener" style="font-size:10px;color:' + text2 + ';text-decoration:none">via ReplyIQ</a>' +
           '</span>';
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
