(function installPhase3cCardSwapFix() {
  "use strict";

  if (typeof renderCurrentCard !== "function") return;

  let currentRenderToken = 0;

  function cardLabel(card) {
    return `${SUIT_NAMES[card.suit]} ${card.title}`;
  }

  function buildFallback(card) {
    const fallback = document.createElement("div");
    fallback.className = "card-fallback";
    fallback.innerHTML = `${SUIT_SYMBOLS[card.suit]}<br>${card.rank}<br>${card.title}`;
    return fallback;
  }

  function decodeWhenAvailable(img) {
    if (typeof img.decode === "function") {
      return img.decode().catch(() => undefined);
    }
    return Promise.resolve();
  }

  function replaceWhenCurrent(token, card, node) {
    if (token !== currentRenderToken || !els.currentCard || state.current !== card) return;
    els.currentCard.replaceChildren(node);
  }

  renderCurrentCard = function renderCurrentCardWithoutSizeJump() {
    if (!els.currentCard) return;

    const card = state.current;
    const token = ++currentRenderToken;

    if (!card) {
      els.currentCard.replaceChildren();
      els.currentCard.removeAttribute("data-id");
      els.currentCard.setAttribute("aria-label", "沒有目前牌面");
      return;
    }

    els.currentCard.dataset.id = card.id;
    els.currentCard.setAttribute("aria-label", cardLabel(card));

    const existingImage = els.currentCard.querySelector("img");
    if (existingImage && existingImage.dataset.cardImage === card.image) return;

    const nextImage = new Image();
    nextImage.alt = cardLabel(card);
    nextImage.decoding = "async";
    nextImage.loading = "eager";
    nextImage.dataset.cardImage = card.image;

    nextImage.addEventListener(
      "load",
      async () => {
        await decodeWhenAvailable(nextImage);
        replaceWhenCurrent(token, card, nextImage);
      },
      { once: true }
    );

    nextImage.addEventListener(
      "error",
      () => replaceWhenCurrent(token, card, buildFallback(card)),
      { once: true }
    );

    nextImage.src = card.image;

    if (nextImage.complete && nextImage.naturalWidth > 0) {
      decodeWhenAvailable(nextImage).then(() => replaceWhenCurrent(token, card, nextImage));
    }
  };
})();
