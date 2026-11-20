/* ===== HONOR DRIVER - Script principal ===== */
const PRIX_MIN = 3000; // prix minimum en FCFA
const CONFIG = {
  whatsapp: "2250152592810",            // 0152592810 avec l'indicatif Côte d'Ivoire (+225)
  email: "Andyyaorony06@gmail.com"      // email qui reçoit les commandes
};

/* ---------- Utilitaires ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v))
};
function toast(msg, err = false) {
  let t = $(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg; t.classList.toggle("err", err); t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 4500);
}
async function hash(txt) {
  try {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
  } catch { return btoa(txt); }
}

/* ---------- Envoi de notifications (email + WhatsApp) ---------- */
// Email : service gratuit FormSubmit (aucun serveur nécessaire).
// A la 1ère commande, FormSubmit envoie un mail d'activation à l'adresse ci-dessus : cliquez sur le lien.
async function sendEmail(subject, data) {
  try {
    const r = await fetch("https://formsubmit.co/ajax/" + CONFIG.email, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ _subject: subject, _template: "table", _captcha: "false", ...data })
    });
    return r.ok;
  } catch { return false; }
}
// WhatsApp : ouvre WhatsApp avec le message déjà rédigé vers le numéro de l'entreprise.
function whatsappLink(text) {
  return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;
}

/* ---------- Menu mobile + état connecté ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const burger = $(".burger"), links = $(".nav-links");
  if (burger) burger.addEventListener("click", () => links.classList.toggle("open"));
  const s = store.get("hd_session", null);
  const u = $(".btn-user");
  if (u && s) u.textContent = "👤 " + s.nom.split(" ")[0];
  const y = $("#year"); if (y) y.textContent = new Date().getFullYear();
  initBooking(); initAuth();
});

/* =====================================================
   PAGE RESERVATION
===================================================== */
const VEHICULES = {
  jetour:  { nom: "Jetour",            places: 4 },
  van:     { nom: "Van Mercedes",      places: 7 },
  maybach: { nom: "Mercedes Maybach",  places: 4 },
  berline: { nom: "Berline de luxe",   places: 4 }
};
function initBooking() {
  const form = $("#bookingForm"); if (!form) return;
  let cat = new URLSearchParams(location.search).get("v") || "jetour";
  if (!VEHICULES[cat]) cat = "jetour";

  const setCat = c => {
    cat = c;
    $$(".cat").forEach(b => b.classList.toggle("active", b.dataset.cat === c));
    $("#vehicule").value = VEHICULES[c].nom;
    $("#passagers").max = VEHICULES[c].places;
  };
  $$(".cat").forEach(b => b.addEventListener("click", () => setCat(b.dataset.cat)));
  setCat(cat);

  // Pré-remplir si connecté
  const s = store.get("hd_session", null);
  if (s) { $("#nom").value = s.nom; $("#tel").value = s.tel || ""; $("#email").value = s.email || ""; }
  $("#date").min = new Date().toISOString().split("T")[0];

  // Adresses récentes (comme inDrive)
  const renderRecent = () => {
    const list = store.get("hd_recent", []);
    const box = $("#recentList");
    box.innerHTML = list.length ? list.map(a => `<button type="button" data-a="${a.replace(/"/g, "&quot;")}">🕘 ${a}</button>`).join("")
                                : `<small style="color:#9aa1ee">Vos dernières destinations apparaîtront ici.</small>`;
    $$("button", box).forEach(b => b.addEventListener("click", () => $("#arrivee").value = b.dataset.a));
  };
  renderRecent();

  // Carte : met à jour l'itinéraire quand on saisit les adresses
  const updateMap = () => {
    const d = $("#depart").value.trim(), a = $("#arrivee").value.trim();
    if (d && a) $("#map").src = `https://www.google.com/maps?output=embed&saddr=${encodeURIComponent(d + ", Abidjan")}&daddr=${encodeURIComponent(a + ", Abidjan")}`;
    else if (a || d) $("#map").src = `https://www.google.com/maps?q=${encodeURIComponent((a || d) + ", Abidjan")}&output=embed`;
  };
  $("#depart").addEventListener("change", updateMap);
  $("#arrivee").addEventListener("change", updateMap);

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    if (f.prix && Number(f.prix) < PRIX_MIN) return toast("Le prix minimum est de 3 000 FCFA.", true);
    const ref = "HD-" + Date.now().toString().slice(-6);
    const prix = f.prix ? f.prix + " FCFA" : "à partir de 3000 FCFA";
    const msg =
`🚖 NOUVELLE COMMANDE HONOR DRIVER
Réf : ${ref}
Client : ${f.nom}
Téléphone : ${f.tel}
Véhicule : ${f.vehicule}
Départ : ${f.depart}
Destination : ${f.arrivee}
Date : ${f.date} à ${f.heure}
Passagers : ${f.passagers}
Offre de prix : ${prix}
Remarques : ${f.note || "-"}`;

    // 1) WhatsApp (ouvert tout de suite pour éviter le blocage des pop-ups)
    window.open(whatsappLink(msg), "_blank");
    // 2) Email
    const ok = await sendEmail("Nouvelle réservation " + ref + " - Honor Driver", {
      Reference: ref, Client: f.nom, Telephone: f.tel, Email_client: f.email || "-",
      Vehicule: f.vehicule, Depart: f.depart, Destination: f.arrivee,
      Date: f.date, Heure: f.heure, Passagers: f.passagers, Offre_prix: prix, Remarques: f.note || "-"
    });

    // 3) Historique local
    const hist = store.get("hd_bookings", []);
    hist.unshift({ ref, ...f, prix, statut: "Envoyée", user: s ? s.email : null, created: new Date().toLocaleString("fr-FR") });
    store.set("hd_bookings", hist);
    const rec = [f.arrivee, ...store.get("hd_recent", []).filter(x => x !== f.arrivee)].slice(0, 5);
    store.set("hd_recent", rec); renderRecent();

    toast(ok ? "✅ Commande " + ref + " envoyée ! Nous vous contactons très vite." : "Commande préparée sur WhatsApp. (Email non confirmé : vérifiez la configuration)", !ok);
    form.reset(); setCat(cat);
  });
}

/* =====================================================
   PAGE ESPACE UTILISATEUR
===================================================== */
function initAuth() {
  const wrap = $("#authWrap"); if (!wrap) return;
  const users = () => store.get("hd_users", []);
  const showTab = id => {
    $$(".auth-tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === id));
    $$(".auth-pane").forEach(p => p.classList.toggle("hidden", p.id !== id));
  };
  $$(".auth-tabs button").forEach(b => b.addEventListener("click", () => showTab(b.dataset.tab)));

  const renderDash = () => {
    const s = store.get("hd_session", null);
    $("#authCard").classList.toggle("hidden", !!s);
    $("#dash").classList.toggle("hidden", !s);
    if (!s) return;
    $("#dName").textContent = s.nom;
    $("#dRole").textContent = s.role === "chauffeur" ? "Chauffeur partenaire" : "Client";
    $("#dInfo").innerHTML = s.role === "chauffeur"
      ? `Statut : <span class="pill">Candidature en cours d'examen</span><br><small>Véhicule : ${s.vehicule || "-"} • Ville : ${s.ville || "-"}</small>`
      : `<small>${s.email} • ${s.tel}</small>`;
    const rows = store.get("hd_bookings", []).filter(b => b.user === s.email);
    $("#dBookings").classList.toggle("hidden", s.role === "chauffeur");
    $("#bookBody").innerHTML = rows.length
      ? rows.map(b => `<tr><td>${b.ref}</td><td>${b.vehicule}</td><td>${b.depart} → ${b.arrivee}</td><td>${b.date} ${b.heure}</td><td>${b.statut}</td></tr>`).join("")
      : `<tr><td colspan="5" class="empty">Aucune réservation pour le moment.</td></tr>`;
  };
  renderDash();

  const register = async (e, role) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    if (users().some(u => u.email.toLowerCase() === f.email.toLowerCase())) return toast("Cet email est déjà inscrit.", true);
    const user = { ...f, role, mdp: await hash(f.mdp), created: new Date().toLocaleString("fr-FR") };
    store.set("hd_users", [...users(), user]);
    const { mdp, ...safe } = user;
    store.set("hd_session", safe);
    // Notifier l'entreprise de la nouvelle inscription
    sendEmail(`Nouvelle inscription ${role} - Honor Driver`, { Role: role, ...safe });
    toast("🎉 Inscription réussie, bienvenue chez Honor Driver !");
    e.target.reset(); renderDash();
  };
  $("#tClient").addEventListener("submit", e => register(e, "client"));
  $("#tChauffeur").addEventListener("submit", e => register(e, "chauffeur"));

  $("#tLogin").addEventListener("submit", async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const h = await hash(f.mdp);
    const u = users().find(x => x.email.toLowerCase() === f.email.toLowerCase() && x.mdp === h);
    if (!u) return toast("Email ou mot de passe incorrect.", true);
    const { mdp, ...safe } = u; store.set("hd_session", safe);
    toast("Connexion réussie ✅"); renderDash();
  });
  $("#logout").addEventListener("click", () => { localStorage.removeItem("hd_session"); renderDash(); const u = $(".btn-user"); if (u) u.textContent = "Mon espace"; });
}
