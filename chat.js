// The chat box on Kaelen's public page. The visitor gives a name once; their browser keeps a private id so that
// when they come back, Kaelen knows who they are and their conversation carries on.
(function () {
  var box = document.getElementById('chat'); if (!box) return;
  var API = box.getAttribute('data-api'), KEY = 'kaelen-visitor';
  var $ = function (id) { return document.getElementById(id); };
  var me = null; try { me = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { me = null; }
  var shown = 0, pollTimer = null, fastUntil = 0;

  function api(path, body) {
    return fetch(API + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {})
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Something went wrong.'); return j; }); });
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(me)); } catch (e) { /* private mode: still works this visit */ } }
  function say(text, cls) { $('chat-note').textContent = text || ''; $('chat-note').className = cls || ''; }
  function status(s) {
    var el = $('chat-status');
    if (!s) return;
    if (!s.online) { el.textContent = 'His island is offline right now. Leave a message and he will answer when it is back.'; el.className = 'off'; return; }
    el.textContent = s.asleep ? 'Kaelen is asleep, but may stir to answer you.' : 'Kaelen is on his island now' + (s.activity ? ' (' + s.activity + ')' : '') + (s.weather ? ', and it is ' + s.weather + ' there' : '') + '.';
    el.className = 'on';
  }
  function render(conv, waiting) {
    var log = $('chat-log');
    if (conv.length < shown) { log.innerHTML = ''; shown = 0; }
    for (var i = shown; i < conv.length; i++) {
      var m = conv[i], d = document.createElement('div');
      d.className = 'msg ' + (m.from === 'you' ? 'you' : 'him');
      var who = document.createElement('b'); who.textContent = m.from === 'you' ? me.name : 'Kaelen';
      var p = document.createElement('span'); p.textContent = m.text;
      d.appendChild(who); d.appendChild(p); log.appendChild(d);
    }
    shown = conv.length;
    $('chat-typing').style.display = waiting ? 'block' : 'none';
    log.scrollTop = log.scrollHeight;
  }
  function poll() {
    clearTimeout(pollTimer);
    if (!me) return;
    api('/conv?id=' + encodeURIComponent(me.id)).then(function (j) { render(j.conv || [], j.waiting); status(j.status); if (j.waiting) fastUntil = Math.max(fastUntil, Date.now() + 60000); })
      .catch(function () { /* try again shortly */ })
      .then(function () { pollTimer = setTimeout(poll, Date.now() < fastUntil ? 3000 : 20000); });
  }
  function enter() {
    $('chat-who').style.display = 'none'; $('chat-talk').style.display = 'block';
    $('chat-me').textContent = me.name; poll();
  }
  $('chat-name-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('chat-name').value.trim(); if (!name) { say('Please enter your name.', 'err'); return; }
    say('Saying hello...');
    api('/hello', { name: name }).then(function (j) { me = { id: j.id, name: j.name }; save(); say(''); status(j.status); enter(); }).catch(function (err) { say(err.message, 'err'); });
  });
  $('chat-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var t = $('chat-text').value.trim(); if (!t) return;
    $('chat-send').disabled = true;
    api('/send', { id: me.id, text: t }).then(function (j) { $('chat-text').value = ''; say(''); render(j.conv || [], true); status(j.status); fastUntil = Date.now() + 180000; poll(); })
      .catch(function (err) { say(err.message, 'err'); }).then(function () { $('chat-send').disabled = false; $('chat-text').focus(); });
  });
  $('chat-forget').addEventListener('click', function (e) {
    e.preventDefault(); me = null; try { localStorage.removeItem(KEY); } catch (x) { /* fine */ }
    $('chat-log').innerHTML = ''; shown = 0; $('chat-talk').style.display = 'none'; $('chat-who').style.display = 'block'; $('chat-name').value = '';
  });
  if (me && me.id) {
    api('/hello', { id: me.id, name: me.name }).then(function (j) { me = { id: j.id, name: j.name }; save(); status(j.status); enter(); })
      .catch(function () { me = null; $('chat-who').style.display = 'block'; });
  } else {
    $('chat-who').style.display = 'block';
    api('/status').then(function (j) { status(j.status); }).catch(function () { /* fine */ });
  }
})();
