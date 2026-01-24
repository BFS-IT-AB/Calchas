// Automatischer Click-Test beim Laden
(function () {
  console.log("=== CLICK TEST SCRIPT LOADED ===");

  // Warte bis DOM geladen ist
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runTests);
  } else {
    setTimeout(runTests, 2000); // Warte 2 Sekunden damit alles geladen ist
  }

  function runTests() {
    console.log("\n=== RUNNING AUTOMATIC CLICK TESTS ===\n");

    // Test 1: Prüfe ob Cards existieren
    const cards = document.querySelectorAll(".weather-card");
    console.log(`✓ Test 1: Found ${cards.length} weather cards`);

    if (cards.length === 0) {
      console.error("❌ PROBLEM: No weather cards found!");
      return;
    }

    // Test 2: Prüfe Card-Eigenschaften
    cards.forEach((card, i) => {
      const rect = card.getBoundingClientRect();
      const computed = getComputedStyle(card);
      console.log(`Card ${i} (${card.dataset.card}):`, {
        visible: rect.width > 0 && rect.height > 0,
        pointerEvents: computed.pointerEvents,
        cursor: computed.cursor,
        zIndex: computed.zIndex,
        position: {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        },
      });
    });

    // Test 3: Prüfe Element an Card-Position
    if (cards.length > 0) {
      const card = cards[0];
      const rect = card.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const elementAtPoint = document.elementFromPoint(centerX, centerY);

      console.log(`✓ Test 3: Element at first card center:`, elementAtPoint);
      console.log(`  Is it the card? ${elementAtPoint === card}`);
      console.log(`  Is it inside the card? ${card.contains(elementAtPoint)}`);

      if (elementAtPoint !== card && !card.contains(elementAtPoint)) {
        console.error("❌ PROBLEM: Something is covering the card!");

        // Finde was darüber liegt
        let el = elementAtPoint;
        console.log("  Elements at this point (from top to bottom):");
        while (el) {
          const style = getComputedStyle(el);
          console.log(`    - ${el.tagName}#${el.id}.${el.className}`, {
            zIndex: style.zIndex,
            position: style.position,
            pointerEvents: style.pointerEvents,
          });
          el = el.parentElement;
        }
      }
    }

    // Test 4: Prüfe Overlay
    const overlay = document.getElementById("bottom-sheet-overlay");
    if (overlay) {
      const overlayStyle = getComputedStyle(overlay);
      console.log(`✓ Test 4: Overlay status:`, {
        exists: true,
        hidden: overlay.hidden,
        ariaHidden: overlay.getAttribute("aria-hidden"),
        display: overlayStyle.display,
        zIndex: overlayStyle.zIndex,
        pointerEvents: overlayStyle.pointerEvents,
      });

      if (overlayStyle.display !== "none") {
        console.error(
          "❌ PROBLEM: Overlay is visible when it should be hidden!",
        );
      }
      if (
        overlayStyle.pointerEvents === "auto" &&
        overlayStyle.display !== "none"
      ) {
        console.error("❌ PROBLEM: Overlay is blocking clicks!");
      }
    }

    // Test 5: Prüfe ModalController
    console.log(`✓ Test 5: ModalController`, {
      exists: !!window.ModalController,
      openSheet: typeof window.ModalController?.openSheet,
      initCalled: !!window.ModalController?._initialized,
    });

    // Test 6: Prüfe WeatherCards
    console.log(`✓ Test 6: WeatherCards`, {
      exists: !!window.WeatherCards,
      renderFunction: typeof window.WeatherCards?.renderWeatherCards,
      openModalFunction: typeof window.WeatherCards?.openCardDetailModal,
    });

    // Test 7: Simuliere Click auf erste Card
    if (cards.length > 0) {
      console.log("\n✓ Test 7: Simulating click on first card...");
      const firstCard = cards[0];
      const cardType = firstCard.dataset.card;

      console.log(`  Clicking card: ${cardType}`);

      // Simuliere verschiedene Click-Events
      ["mousedown", "mouseup", "click"].forEach((eventType) => {
        const event = new MouseEvent(eventType, {
          bubbles: true,
          cancelable: true,
          view: window,
        });
        firstCard.dispatchEvent(event);
      });

      // Prüfe nach 500ms ob Modal geöffnet wurde
      setTimeout(() => {
        const sheetId = `sheet-${cardType}-detail`;
        const sheet = document.getElementById(sheetId);
        const overlay = document.getElementById("bottom-sheet-overlay");

        console.log(`  After click - Sheet ${sheetId}:`, {
          exists: !!sheet,
          visible: sheet?.classList.contains("bottom-sheet--visible"),
        });
        console.log(`  After click - Overlay:`, {
          hidden: overlay?.hidden,
          ariaHidden: overlay?.getAttribute("aria-hidden"),
          display: getComputedStyle(overlay)?.display,
        });

        if (!sheet || !sheet.classList.contains("bottom-sheet--visible")) {
          console.error("❌ PROBLEM: Modal did not open after click!");
        } else {
          console.log("✅ SUCCESS: Modal opened!");
        }

        console.log("\n=== TESTS COMPLETE ===\n");
      }, 500);
    }
  }
})();
