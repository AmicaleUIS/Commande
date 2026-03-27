const orderForm = document.getElementById("orderForm");
const orderSummary = document.getElementById("orderSummary");
const totalPrice = document.getElementById("totalPrice");
const resetOrderBtn = document.getElementById("resetOrderBtn");

const STORAGE_KEY = "choulette_commande_form_v1";

const fields = {
  nom: document.getElementById("nom"),
  prenom: document.getElementById("prenom"),
  base: document.getElementById("base"),
  baseAutre: document.getElementById("baseAutre"),
  unite: document.getElementById("unite"),

  uBlanche: document.getElementById("uBlanche"),
  uBlonde: document.getElementById("uBlonde"),
  uAmbree: document.getElementById("uAmbree"),

  halfPanache: document.getElementById("halfPanache"),
  halfBlanche: document.getElementById("halfBlanche"),
  halfBlonde: document.getElementById("halfBlonde"),
  halfAmbree: document.getElementById("halfAmbree"),
  halfQtyPanache: document.getElementById("halfQtyPanache"),

  fullPanache: document.getElementById("fullPanache"),
  fullBlanche: document.getElementById("fullBlanche"),
  fullBlonde: document.getElementById("fullBlonde"),
  fullAmbree: document.getElementById("fullAmbree"),
  fullQtyPanache: document.getElementById("fullQtyPanache"),

  message: document.getElementById("message")
};

const ui = {
  baseAutreRow: document.getElementById("baseAutreRow"),

  halfSimpleBlock: document.getElementById("halfSimpleBlock"),
  halfPanacheBlock: document.getElementById("halfPanacheBlock"),
  halfPanacheItems: document.getElementById("halfPanacheItems"),

  fullSimpleBlock: document.getElementById("fullSimpleBlock"),
  fullPanacheBlock: document.getElementById("fullPanacheBlock"),
  fullPanacheItems: document.getElementById("fullPanacheItems")
};

const PRICES = {
  unit: 4,
  half: 23,
  full: 43
};

let suppressAutoSave = false;

/* =========================
   OUTILS
========================= */

function numberValue(input) {
  return Math.max(0, parseInt(input?.value || "0", 10) || 0);
}

function safeTrim(value) {
  return String(value || "").trim();
}

function getBaseValue() {
  if (fields.base.value === "Autre") {
    return safeTrim(fields.baseAutre.value) || "Autre";
  }
  return fields.base.value;
}

/* =========================
   AFFICHAGE CONDITIONNEL
========================= */

function updateConditionalFields() {
  const isBaseAutre = fields.base.value === "Autre";
  ui.baseAutreRow.style.display = isBaseAutre ? "block" : "none";
  fields.baseAutre.required = isBaseAutre;

  ui.halfSimpleBlock.style.display = fields.halfPanache.checked ? "none" : "block";
  ui.halfPanacheBlock.style.display = fields.halfPanache.checked ? "block" : "none";

  ui.fullSimpleBlock.style.display = fields.fullPanache.checked ? "none" : "block";
  ui.fullPanacheBlock.style.display = fields.fullPanache.checked ? "block" : "none";
}

/* =========================
   PANACHAGE
========================= */

function createPanacheCardHTML(type, index, maxPerBox) {
  const title = type === "half" ? "Demi-carton" : "Carton";

  return `
    <div class="panache-card" data-type="${type}" data-index="${index}">
      <h3>${title} ${index + 1}</h3>

      <div class="form-grid three-columns-form">
        <div class="form-row">
          <label>Blanche</label>
          <input type="number" class="${type}-blanche" min="0" max="${maxPerBox}" value="0" />
        </div>

        <div class="form-row">
          <label>Blonde</label>
          <input type="number" class="${type}-blonde" min="0" max="${maxPerBox}" value="0" />
        </div>

        <div class="form-row">
          <label>Ambrée</label>
          <input type="number" class="${type}-ambree" min="0" max="${maxPerBox}" value="0" />
        </div>
      </div>

      <p class="panache-total">
        Total : <strong>0 / ${maxPerBox}</strong>
      </p>
    </div>
  `;
}

function readPanacheCards(container, type) {
  const cards = Array.from(container.querySelectorAll(".panache-card"));

  return cards.map((card, index) => {
    const blanche = numberValue(card.querySelector(`.${type}-blanche`));
    const blonde = numberValue(card.querySelector(`.${type}-blonde`));
    const ambree = numberValue(card.querySelector(`.${type}-ambree`));
    const total = blanche + blonde + ambree;

    return {
      index: index + 1,
      blanche,
      blonde,
      ambree,
      total
    };
  });
}

function updatePanacheCardVisual(card, maxPerBox) {
  if (!card) return;

  const inputs = Array.from(card.querySelectorAll("input[type='number']"));
  const total = inputs.reduce((sum, input) => sum + numberValue(input), 0);

  const totalDisplay = card.querySelector(".panache-total strong");
  if (totalDisplay) {
    totalDisplay.textContent = `${total} / ${maxPerBox}`;
  }

  card.classList.remove("is-over", "is-complete");

  if (total > maxPerBox) {
    card.classList.add("is-over");
  } else if (total === maxPerBox) {
    card.classList.add("is-complete");
  }
}

function enforcePanacheLimit(card, maxPerBox) {
  if (!card) return;

  const inputs = Array.from(card.querySelectorAll("input[type='number']"));
  let total = inputs.reduce((sum, input) => sum + numberValue(input), 0);

  if (total > maxPerBox) {
    const activeInput = document.activeElement;

    if (activeInput && inputs.includes(activeInput)) {
      const otherTotal = inputs
        .filter((input) => input !== activeInput)
        .reduce((sum, input) => sum + numberValue(input), 0);

      const maxAllowed = Math.max(0, maxPerBox - otherTotal);
      activeInput.value = String(maxAllowed);
    }
  }

  updatePanacheCardVisual(card, maxPerBox);
}

function attachPanacheCardEvents(container, maxPerBox) {
  container.querySelectorAll("input[type='number']").forEach((input) => {
    input.addEventListener("input", () => {
      const card = input.closest(".panache-card");
      enforcePanacheLimit(card, maxPerBox);
      buildSummary();
      saveFormState();
    });

    input.addEventListener("change", () => {
      const card = input.closest(".panache-card");
      enforcePanacheLimit(card, maxPerBox);
      buildSummary();
      saveFormState();
    });
  });
}

function generatePanacheCards(container, qty, type, maxPerBox, existingCards = []) {
  container.innerHTML = "";

  for (let i = 0; i < qty; i += 1) {
    container.insertAdjacentHTML("beforeend", createPanacheCardHTML(type, i, maxPerBox));
  }

  const cards = Array.from(container.querySelectorAll(".panache-card"));

  cards.forEach((card, index) => {
    const saved = existingCards[index];
    if (!saved) return;

    const blancheInput = card.querySelector(`.${type}-blanche`);
    const blondeInput = card.querySelector(`.${type}-blonde`);
    const ambreeInput = card.querySelector(`.${type}-ambree`);

    if (blancheInput) blancheInput.value = saved.blanche ?? 0;
    if (blondeInput) blondeInput.value = saved.blonde ?? 0;
    if (ambreeInput) ambreeInput.value = saved.ambree ?? 0;
  });

  attachPanacheCardEvents(container, maxPerBox);

  cards.forEach((card) => {
    enforcePanacheLimit(card, maxPerBox);
  });
}

function refreshPanacheSections() {
  const currentHalfCards = readPanacheCards(ui.halfPanacheItems, "half");
  const currentFullCards = readPanacheCards(ui.fullPanacheItems, "full");

  if (fields.halfPanache.checked) {
    generatePanacheCards(
      ui.halfPanacheItems,
      numberValue(fields.halfQtyPanache),
      "half",
      6,
      currentHalfCards
    );
  } else {
    ui.halfPanacheItems.innerHTML = "";
  }

  if (fields.fullPanache.checked) {
    generatePanacheCards(
      ui.fullPanacheItems,
      numberValue(fields.fullQtyPanache),
      "full",
      12,
      currentFullCards
    );
  } else {
    ui.fullPanacheItems.innerHTML = "";
  }
}

function validatePanacheCards(cards, maxPerBox) {
  return cards.every((card) => card.total === maxPerBox);
}

/* =========================
   RÉCAPITULATIF
========================= */

function buildSummary() {
  const uBlanche = numberValue(fields.uBlanche);
  const uBlonde = numberValue(fields.uBlonde);
  const uAmbree = numberValue(fields.uAmbree);

  const halfPanache = fields.halfPanache.checked;
  const fullPanache = fields.fullPanache.checked;

  const halfBlanche = numberValue(fields.halfBlanche);
  const halfBlonde = numberValue(fields.halfBlonde);
  const halfAmbree = numberValue(fields.halfAmbree);

  const fullBlanche = numberValue(fields.fullBlanche);
  const fullBlonde = numberValue(fields.fullBlonde);
  const fullAmbree = numberValue(fields.fullAmbree);

  const halfQty = halfPanache
    ? numberValue(fields.halfQtyPanache)
    : halfBlanche + halfBlonde + halfAmbree;

  const fullQty = fullPanache
    ? numberValue(fields.fullQtyPanache)
    : fullBlanche + fullBlonde + fullAmbree;

  const halfCards = halfPanache ? readPanacheCards(ui.halfPanacheItems, "half") : [];
  const fullCards = fullPanache ? readPanacheCards(ui.fullPanacheItems, "full") : [];

  const lines = [];

  if (uBlanche > 0) lines.push(`${uBlanche} bouteille(s) blanche(s) à l’unité`);
  if (uBlonde > 0) lines.push(`${uBlonde} bouteille(s) blonde(s) à l’unité`);
  if (uAmbree > 0) lines.push(`${uAmbree} bouteille(s) ambrée(s) à l’unité`);

  if (halfQty > 0) {
    if (halfPanache) {
      lines.push(`${halfQty} demi-carton(s) panaché(s)`);
      halfCards.forEach((card) => {
        lines.push(
          `- Demi-carton ${card.index} : ${card.blanche} blanche(s), ${card.blonde} blonde(s), ${card.ambree} ambrée(s) (${card.total}/6)`
        );
      });
    } else {
      if (halfBlanche > 0) lines.push(`${halfBlanche} demi-carton(s) blanche`);
      if (halfBlonde > 0) lines.push(`${halfBlonde} demi-carton(s) blonde`);
      if (halfAmbree > 0) lines.push(`${halfAmbree} demi-carton(s) ambrée`);
    }
  }

  if (fullQty > 0) {
    if (fullPanache) {
      lines.push(`${fullQty} carton(s) panaché(s)`);
      fullCards.forEach((card) => {
        lines.push(
          `- Carton ${card.index} : ${card.blanche} blanche(s), ${card.blonde} blonde(s), ${card.ambree} ambrée(s) (${card.total}/12)`
        );
      });
    } else {
      if (fullBlanche > 0) lines.push(`${fullBlanche} carton(s) blanche`);
      if (fullBlonde > 0) lines.push(`${fullBlonde} carton(s) blonde`);
      if (fullAmbree > 0) lines.push(`${fullAmbree} carton(s) ambrée`);
    }
  }

  const total =
    (uBlanche + uBlonde + uAmbree) * PRICES.unit +
    halfQty * PRICES.half +
    fullQty * PRICES.full;

  if (lines.length === 0) {
    orderSummary.textContent = "Aucun article sélectionné pour le moment.";
  } else {
    orderSummary.innerHTML = lines.map((line) => `• ${line}`).join("<br>");
  }

  totalPrice.textContent = `${total} €`;

  return {
    uBlanche,
    uBlonde,
    uAmbree,

    halfPanache,
    halfQty,
    halfBlanche,
    halfBlonde,
    halfAmbree,
    halfCards,

    fullPanache,
    fullQty,
    fullBlanche,
    fullBlonde,
    fullAmbree,
    fullCards,

    total
  };
}

/* =========================
   SAUVEGARDE / RESTAURATION
========================= */

function getFormState() {
  return {
    nom: fields.nom.value,
    prenom: fields.prenom.value,
    base: fields.base.value,
    baseAutre: fields.baseAutre.value,
    unite: fields.unite.value,

    uBlanche: fields.uBlanche.value,
    uBlonde: fields.uBlonde.value,
    uAmbree: fields.uAmbree.value,

    halfPanache: fields.halfPanache.checked,
    halfBlanche: fields.halfBlanche.value,
    halfBlonde: fields.halfBlonde.value,
    halfAmbree: fields.halfAmbree.value,
    halfQtyPanache: fields.halfQtyPanache.value,

    fullPanache: fields.fullPanache.checked,
    fullBlanche: fields.fullBlanche.value,
    fullBlonde: fields.fullBlonde.value,
    fullAmbree: fields.fullAmbree.value,
    fullQtyPanache: fields.fullQtyPanache.value,

    message: fields.message.value,

    halfCards: readPanacheCards(ui.halfPanacheItems, "half"),
    fullCards: readPanacheCards(ui.fullPanacheItems, "full")
  };
}

function saveFormState() {
  if (suppressAutoSave) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getFormState()));
  } catch (error) {
    console.warn("Impossible de sauvegarder le formulaire :", error);
  }
}

function restoreFormState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const state = JSON.parse(raw);

    suppressAutoSave = true;

    fields.nom.value = state.nom ?? "";
    fields.prenom.value = state.prenom ?? "";
    fields.base.value = state.base ?? "";
    fields.baseAutre.value = state.baseAutre ?? "";
    fields.unite.value = state.unite ?? "";

    fields.uBlanche.value = state.uBlanche ?? 0;
    fields.uBlonde.value = state.uBlonde ?? 0;
    fields.uAmbree.value = state.uAmbree ?? 0;

    fields.halfPanache.checked = Boolean(state.halfPanache);
    fields.halfBlanche.value = state.halfBlanche ?? 0;
    fields.halfBlonde.value = state.halfBlonde ?? 0;
    fields.halfAmbree.value = state.halfAmbree ?? 0;
    fields.halfQtyPanache.value = state.halfQtyPanache ?? 0;

    fields.fullPanache.checked = Boolean(state.fullPanache);
    fields.fullBlanche.value = state.fullBlanche ?? 0;
    fields.fullBlonde.value = state.fullBlonde ?? 0;
    fields.fullAmbree.value = state.fullAmbree ?? 0;
    fields.fullQtyPanache.value = state.fullQtyPanache ?? 0;

    fields.message.value = state.message ?? "";

    updateConditionalFields();

    if (fields.halfPanache.checked) {
      generatePanacheCards(
        ui.halfPanacheItems,
        numberValue(fields.halfQtyPanache),
        "half",
        6,
        Array.isArray(state.halfCards) ? state.halfCards : []
      );
    } else {
      ui.halfPanacheItems.innerHTML = "";
    }

    if (fields.fullPanache.checked) {
      generatePanacheCards(
        ui.fullPanacheItems,
        numberValue(fields.fullQtyPanache),
        "full",
        12,
        Array.isArray(state.fullCards) ? state.fullCards : []
      );
    } else {
      ui.fullPanacheItems.innerHTML = "";
    }

    buildSummary();

    suppressAutoSave = false;
    saveFormState();
  } catch (error) {
    suppressAutoSave = false;
    console.warn("Impossible de restaurer le formulaire :", error);
  }
}

function clearOrderForm() {
  suppressAutoSave = true;

  orderForm.reset();

  fields.nom.value = "";
  fields.prenom.value = "";
  fields.base.value = "";
  fields.baseAutre.value = "";
  fields.unite.value = "";

  fields.uBlanche.value = 0;
  fields.uBlonde.value = 0;
  fields.uAmbree.value = 0;

  fields.halfPanache.checked = false;
  fields.halfBlanche.value = 0;
  fields.halfBlonde.value = 0;
  fields.halfAmbree.value = 0;
  fields.halfQtyPanache.value = 0;

  fields.fullPanache.checked = false;
  fields.fullBlanche.value = 0;
  fields.fullBlonde.value = 0;
  fields.fullAmbree.value = 0;
  fields.fullQtyPanache.value = 0;

  fields.message.value = "";

  ui.halfPanacheItems.innerHTML = "";
  ui.fullPanacheItems.innerHTML = "";

  updateConditionalFields();
  buildSummary();

  localStorage.removeItem(STORAGE_KEY);

  suppressAutoSave = false;
}

/* =========================
   ÉVÉNEMENTS
========================= */

function handleSimpleLiveUpdate() {
  updateConditionalFields();
  buildSummary();
  saveFormState();
}

function handlePanacheStructureUpdate() {
  updateConditionalFields();
  refreshPanacheSections();
  buildSummary();
  saveFormState();
}

[
  fields.base,
  fields.baseAutre,
  fields.nom,
  fields.prenom,
  fields.unite,

  fields.uBlanche,
  fields.uBlonde,
  fields.uAmbree,

  fields.halfBlanche,
  fields.halfBlonde,
  fields.halfAmbree,

  fields.fullBlanche,
  fields.fullBlonde,
  fields.fullAmbree,

  fields.message
].forEach((field) => {
  if (!field) return;
  field.addEventListener("input", handleSimpleLiveUpdate);
  field.addEventListener("change", handleSimpleLiveUpdate);
});

[
  fields.halfPanache,
  fields.halfQtyPanache,
  fields.fullPanache,
  fields.fullQtyPanache
].forEach((field) => {
  if (!field) return;
  field.addEventListener("input", handlePanacheStructureUpdate);
  field.addEventListener("change", handlePanacheStructureUpdate);
});

orderForm.addEventListener("submit", (event) => {
  event.preventDefault();

  updateConditionalFields();

  if (!orderForm.reportValidity()) {
    saveFormState();
    return;
  }

  const summary = buildSummary();

  if (summary.halfPanache && !validatePanacheCards(summary.halfCards, 6)) {
    alert("Chaque demi-carton panaché doit contenir exactement 6 bouteilles.");
    saveFormState();
    return;
  }

  if (summary.fullPanache && !validatePanacheCards(summary.fullCards, 12)) {
    alert("Chaque carton panaché doit contenir exactement 12 bouteilles.");
    saveFormState();
    return;
  }

  const nom = safeTrim(fields.nom.value);
  const prenom = safeTrim(fields.prenom.value);
  const base = getBaseValue();
  const unite = safeTrim(fields.unite.value);
  const message = safeTrim(fields.message.value);

  const bodyLines = [
    "Bonjour,",
    "",
    "Je souhaite effectuer une demande de commande pour La Choulette.",
    "",
    "Informations :",
    `Nom : ${nom}`,
    `Prénom : ${prenom}`,
    `Base d’appartenance : ${base}`,
    `Unité : ${unite}`,
    "",
    "Commande :",
    `Bouteilles blanche(s) à l’unité : ${summary.uBlanche}`,
    `Bouteilles blonde(s) à l’unité : ${summary.uBlonde}`,
    `Bouteilles ambrée(s) à l’unité : ${summary.uAmbree}`
  ];

  if (summary.halfQty > 0) {
    if (summary.halfPanache) {
      bodyLines.push(`Demi-cartons panachés : ${summary.halfQty}`);
      summary.halfCards.forEach((card) => {
        bodyLines.push(
          `Demi-carton ${card.index} : ${card.blanche} blanche(s), ${card.blonde} blonde(s), ${card.ambree} ambrée(s)`
        );
      });
    } else {
      if (summary.halfBlanche > 0) bodyLines.push(`Demi-cartons blanche : ${summary.halfBlanche}`);
      if (summary.halfBlonde > 0) bodyLines.push(`Demi-cartons blonde : ${summary.halfBlonde}`);
      if (summary.halfAmbree > 0) bodyLines.push(`Demi-cartons ambrée : ${summary.halfAmbree}`);
    }
  } else {
    bodyLines.push("Demi-cartons : 0");
  }

  if (summary.fullQty > 0) {
    if (summary.fullPanache) {
      bodyLines.push(`Cartons complets panachés : ${summary.fullQty}`);
      summary.fullCards.forEach((card) => {
        bodyLines.push(
          `Carton ${card.index} : ${card.blanche} blanche(s), ${card.blonde} blonde(s), ${card.ambree} ambrée(s)`
        );
      });
    } else {
      if (summary.fullBlanche > 0) bodyLines.push(`Cartons blanche : ${summary.fullBlanche}`);
      if (summary.fullBlonde > 0) bodyLines.push(`Cartons blonde : ${summary.fullBlonde}`);
      if (summary.fullAmbree > 0) bodyLines.push(`Cartons ambrée : ${summary.fullAmbree}`);
    }
  } else {
    bodyLines.push("Cartons complets : 0");
  }

  bodyLines.push("");
  bodyLines.push(`Total estimatif : ${summary.total} €`);
  bodyLines.push("");

  if (message) {
    bodyLines.push("Précisions complémentaires :");
    bodyLines.push(message);
    bodyLines.push("");
  }

  bodyLines.push("Cordialement.");

  saveFormState();

  const subject = encodeURIComponent(`Commande La Choulette - ${prenom} ${nom}`);
  const body = encodeURIComponent(bodyLines.join("\n"));

  window.location.href =
    `mailto:amicaleuis.m2000@gmail.com?subject=${subject}&body=${body}`;
});

if (resetOrderBtn) {
  resetOrderBtn.addEventListener("click", () => {
    const confirmed = window.confirm("Voulez-vous vraiment vider toute la commande ?");
    if (!confirmed) return;

    clearOrderForm();
  });
}

/* =========================
   INITIALISATION
========================= */

updateConditionalFields();
restoreFormState();
buildSummary();