(function (root) {
  'use strict';
  var launch = null;
  function safeUrl(value) {
    if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return null;
    try { var parsed = new URL(value); return !parsed.username && !parsed.password ? parsed.href : null; }
    catch (error) { return null; }
  }
  function publicItems(items) {
    var seen = new Set();
    return (Array.isArray(items) ? items : []).filter(function (item) {
      if (!item || item.enabled !== true || typeof item.id !== 'string' || !item.id || seen.has(item.id) || typeof item.title !== 'string' || !item.title.trim() || !safeUrl(item.url)) return false;
      seen.add(item.id); return true;
    }).slice().sort(function (a, b) { return (Number(a.order) || 0) - (Number(b.order) || 0) || a.id.localeCompare(b.id); });
  }
  function element(tag, className, text) {
    var node = root.document.createElement(tag); if (className) node.className = className;
    if (text !== undefined) node.textContent = text; return node;
  }
  function open(options) {
    options = options || {};
    // Only an explicit preview receives a local draft. Public opens always read
    // the checked-in content and never localStorage or developer editor state.
    var preview = options.preview === true;
    var content = preview ? options : root.HeavenlyPicks || { items:[] };
    var items = publicItems(content.items);
    return root.HeavenlyCollectionDialog.open({ id:'heavenly-picks-modal', title:'Syshi’s Picks', render:function (card, close) {
      card.classList.add('heavenly-picks-card');
      if (preview) card.appendChild(element('p', 'heavenly-picks-preview', 'Local draft preview · Public recommendations are unchanged.'));
      var introduction = element('p', 'heavenly-collection-intro', 'A little corner of Newgrounds, chosen for Heavenly.'); card.appendChild(introduction);
      if (!items.length) {
        var empty = element('div', 'heavenly-picks-empty');
        var constellation = element('div', 'heavenly-picks-constellation'); constellation.setAttribute('aria-hidden', 'true');
        constellation.innerHTML = root.HeavenlyIcons.svg('preset:sparkles', '22px');
        empty.appendChild(constellation);
        empty.appendChild(element('span', 'heavenly-picks-eyebrow', 'A collection in the making'));
        empty.appendChild(element('h3', '', 'Good games are worth finding.'));
        empty.appendChild(element('p', '', 'Syshi’s Picks is coming soon. Our Newgrounds recommendations will appear here once they’re ready.'));
        var badge = element('span', 'heavenly-picks-soon', 'Coming Soon'); empty.appendChild(badge); card.appendChild(empty);
      } else {
        var list = element('div', 'heavenly-picks-list'); list.setAttribute('role', 'list');
        items.forEach(function (item) {
          var row = element('article', 'heavenly-pick'); row.setAttribute('role', 'listitem'); row.dataset.pickId = item.id;
          var media = element('div', 'heavenly-pick-media'); media.setAttribute('aria-hidden', 'true');
          var placeholder = element('span', 'heavenly-pick-image-fallback'); placeholder.innerHTML = root.HeavenlyIcons.svg('preset:gamepad', '22px'); media.appendChild(placeholder);
          var imageUrl = safeUrl(item.thumbnail) || safeUrl(item.icon);
          if (imageUrl) {
            var img = element('img', ''); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer';
            img.onload = function () { placeholder.hidden = true; }; img.onerror = function () { img.remove(); };
            img.src = imageUrl; media.appendChild(img);
          } else if (typeof item.icon === 'string' && item.icon.indexOf('preset:') === 0) placeholder.innerHTML = root.HeavenlyIcons.svg(item.icon, '22px');
          row.appendChild(media);
          var copy = element('div', 'heavenly-pick-copy'); copy.appendChild(element('h3', '', item.title));
          if (item.description) copy.appendChild(element('p', '', String(item.description)));
          var actions = element('div', 'heavenly-pick-actions');
          var status = element('p', 'heavenly-pick-status'); status.setAttribute('role', 'status');
          ['proxy', 'direct'].forEach(function (mode) {
            var button = element('button', 'heavenly-collection-button' + (mode === 'proxy' ? ' is-primary' : ''), mode === 'proxy' ? 'Open with Proxy' : 'Open Direct'); button.type = 'button';
            button.setAttribute('aria-label', (mode === 'proxy' ? 'Open with Proxy: ' : 'Open Direct: ') + item.title);
            button.onclick = function () {
              try {
                if (!launch || launch(item.url, mode, item.title) === false) throw new Error('Launch unavailable');
                status.textContent = 'Opening ' + item.title + '. If the destination is unavailable, try the other launch option.';
              } catch (error) { status.textContent = 'This destination could not be opened. Try the other launch option, or return to Newgrounds.'; }
            }; actions.appendChild(button);
          });
          copy.append(actions, status); row.appendChild(copy); list.appendChild(row);
        }); card.appendChild(list);
        card.appendChild(element('p', 'heavenly-picks-availability', 'Game availability depends on Newgrounds and your network. Both launch options remain available.'));
      }
      var footer = element('footer', 'heavenly-collection-actions');
      var back = element('button', 'heavenly-collection-button', preview ? 'Return to Developer HQ' : 'Back to Newgrounds'); back.type = 'button'; back.onclick = close; footer.appendChild(back); card.appendChild(footer);
    }});
  }
  root.HeavenlyPicksUI = { open:open, configure:function (options) { launch = options.launch; }, publicItems:publicItems };
})(window);
