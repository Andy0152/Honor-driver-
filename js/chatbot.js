/* ===== HONOR DRIVER - Chatbot guidé qui redirige vers WhatsApp ===== */
(function () {
  const WA = "2250152592810"; // 0152592810 (+225)
  const BOT = "Assistant Honor Driver";
  const waLink = t => `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;

  const css = `
  .hdc-btn{position:fixed;right:20px;bottom:92px;width:58px;height:58px;border-radius:50%;background:#ffeb3b;color:#02084b;border:none;font-size:1.6rem;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.3);z-index:95}
  .hdc-win{position:fixed;right:20px;bottom:160px;width:340px;max-width:calc(100vw - 40px);height:500px;max-height:calc(100vh - 190px);background:#fff;border-radius:18px;box-shadow:0 12px 40px rgba(2,8,75,.35);display:none;flex-direction:column;overflow:hidden;z-index:96;font-family:Montserrat,Arial,sans-serif}
  .hdc-win.open{display:flex}
  .hdc-head{background:#02084b;color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;font-weight:700}
  .hdc-head small{display:block;color:#1ca698;font-weight:600}
  .hdc-head button{background:none;border:none;color:#fff;font-size:1.3rem;cursor:pointer}
  .hdc-msgs{flex:1;overflow-y:auto;padding:14px;background:#f5f7fb;display:flex;flex-direction:column;gap:10px}
  .hdc-m{max-width:85%;padding:10px 13px;border-radius:14px;font-size:.88rem;line-height:1.45}
  .hdc-m.bot{background:#fff;color:#1b1f3b;border-bottom-left-radius:4px;align-self:flex-start}
  .hdc-m.me{background:#1ca698;color:#fff;border-bottom-right-radius:4px;align-self:flex-end}
  .hdc-quick{display:flex;gap:6px;flex-wrap:wrap;padding:8px 12px;background:#f5f7fb;min-height:8px}
  .hdc-quick button{border:1.5px solid #1ca698;background:#fff;color:#1ca698;border-radius:50px;padding:6px 13px;font-size:.78rem;font-weight:700;cursor:pointer;font-family:inherit}
  .hdc-quick button:hover{background:#1ca698;color:#fff}
  .hdc-quick .wa{background:#25d366;border-color:#25d366;color:#fff;width:100%;padding:11px;font-size:.88rem}
  .hdc-form{display:flex;border-top:1px solid #e3e6f3}
  .hdc-form input{flex:1;border:none;padding:14px;font-family:inherit;font-size:.9rem;outline:none}
  .hdc-form button{background:#02084b;color:#ffeb3b;border:none;padding:0 18px;font-weight:800;cursor:pointer}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const btn = document.createElement("button"); btn.className = "hdc-btn"; btn.setAttribute("aria-label", "Ouvrir le chat"); btn.textContent = "";
  const win = document.createElement("div"); win.className = "hdc-win";
  win.innerHTML = `<div class="hdc-head"><div>${BOT}<small>● En ligne</small></div><button aria-label="Fermer">✕</button></div>
    <div class="hdc-msgs"></div><div class="hdc-quick"></div>
    <form class="hdc-form"><input placeholder="Écrivez ici..." autocomplete="off"><button>➤</button></form>`;
  document.body.append(btn, win);
  const msgs = win.querySelector(".hdc-msgs"), quick = win.querySelector(".hdc-quick"), input = win.querySelector("input");

  const add = (html, who) => { const d = document.createElement("div"); d.className = "hdc-m " + who; d.innerHTML = html; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; };
  const bot = (html, delay = 400) => new Promise(r => setTimeout(() => { add(html, "bot"); r(); }, delay));
  const clean = s => s.replace(/</g, "&lt;");
  const setChoices = (list, cb, cls) => { quick.innerHTML = ""; list.forEach(c => { const b = document.createElement("button"); b.type = "button"; b.textContent = c; if (cls) b.className = cls; b.onclick = () => { add(clean(c), "me"); cb(c); }; quick.appendChild(b); }); };

  // --- Conversation guidée ---
  let data = {}, onText = null;
  const ask = (q, key, next) => bot(q).then(() => { quick.innerHTML = ""; input.focus(); onText = v => { data[key] = v; onText = null; next(); }; });

  function finish(titre) {
    const lines = [`Bonjour Honor Driver 👋`, `*${titre}*`];
    const labels = { nom: "Nom", depart: "Départ", arrivee: "Destination", date: "Date / heure", vehicule: "Véhicule", message: "Message" };
    Object.keys(labels).forEach(k => { if (data[k]) lines.push(`${labels[k]} : ${data[k]}`); });
    const url = waLink(lines.join("\n"));
    bot("Parfait ✅ Cliquez ci-dessous pour envoyer votre demande à notre équipe sur <b>WhatsApp</b>. Nous vous répondons très vite !").then(() => {
      quick.innerHTML = "";
      const b = document.createElement("button"); b.className = "wa"; b.type = "button"; b.textContent = "💬 Continuer sur WhatsApp";
      b.onclick = () => { window.open(url, "_blank"); };
      quick.appendChild(b);
      const r = document.createElement("button"); r.type = "button"; r.textContent = "↩ Recommencer"; r.onclick = start; quick.appendChild(r);
    });
  }

  function flowReservation() {
    data = {};
    ask("Super ! Quel est votre <b>nom</b> ?", "nom", () =>
    ask(" Quelle est votre adresse de <b>départ</b> ?", "depart", () =>
    ask(" Quelle est votre <b>destination</b> ?", "arrivee", () =>
    ask(" Pour quelle <b>date et heure</b> ? (ex : demain 8h)", "date", () =>
    bot(" Quel <b>véhicule</b> souhaitez-vous ?").then(() =>
      setChoices(["Jetour", "Van Mercedes", "Mercedes Maybach", "Berline de luxe"], v => { data.vehicule = v; finish("NOUVELLE RÉSERVATION"); })
    )))));
  }
  function flowQuestion(titre, intro) {
    data = {};
    ask("Avec plaisir ! Quel est votre <b>nom</b> ?", "nom", () =>
    ask(intro, "message", () => finish(titre)));
  }

  function start() {
    data = {}; onText = null;
    bot("Que souhaitez-vous faire ?", 200).then(() =>
      setChoices([" Réserver une course", " Connaître les tarifs", " Devenir chauffeur", " Autre question"], c => {
        if (c.includes("Réserver")) flowReservation();
        else if (c.includes("tarifs")) bot("Nos courses commencent à partir de <b>3 000 FCFA</b>, selon le trajet et le véhicule. Pour un devis précis, notre équipe vous répond sur WhatsApp.").then(() => flowQuestion("DEMANDE DE DEVIS", "Indiquez votre <b>trajet</b> (départ → destination) :"));
        else if (c.includes("chauffeur")) flowQuestion("CANDIDATURE CHAUFFEUR", "Quel <b>véhicule</b> possédez-vous et depuis combien d'années conduisez-vous ?");
        else flowQuestion("QUESTION", "Quelle est votre <b>question</b> ?");
      }));
  }

  win.querySelector("form").addEventListener("submit", e => { e.preventDefault(); const v = input.value.trim(); if (!v) return; input.value = ""; add(clean(v), "me"); if (onText) onText(v); else bot("Choisissez une option ci-dessous 👇 ou parlez directement à notre équipe sur WhatsApp.").then(start); });
  let first = true;
  const toggle = () => { win.classList.toggle("open"); if (first && win.classList.contains("open")) { first = false; bot("Bonjour 👋 Je suis l'assistant <b>Honor Driver</b>. Je prépare votre demande et je la transmets à notre équipe sur WhatsApp.", 100).then(start); } };
  btn.onclick = toggle; win.querySelector(".hdc-head button").onclick = toggle;
})();
