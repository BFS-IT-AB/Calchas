/**
 * deviceDetection.js - Geräteerkennung für Calchas
 * Erkennt, ob die App auf einem Smartphone oder einem größeren Gerät läuft
 */
(function (global) {
  /**
   * Prüft, ob das aktuelle Gerät ein Smartphone ist
   * @returns {boolean} true wenn Smartphone, false bei Tablet/Desktop
   */
  function isSmartphone() {
    // User Agent prüfen
    const userAgent = navigator.userAgent.toLowerCase();

    // Explizit Tablets ausschließen (auch wenn kleiner Screen)
    const isTablet = /ipad|tablet|kindle/i.test(userAgent);
    if (isTablet) {
      console.log("[DeviceDetection] Tablet erkannt via UA");
      return false;
    }

    // Android ohne "mobile" = Tablet
    if (/android/i.test(userAgent) && !/mobile/i.test(userAgent)) {
      console.log("[DeviceDetection] Android Tablet erkannt");
      return false;
    }

    // Mobile User Agent Patterns
    const mobileUA =
      /android.*mobile|iphone|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent,
      );

    // Screen-Größe - HAUPT-KRITERIUM!
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const hasSmallScreen = screenWidth <= 768;

    console.log("[DeviceDetection] Checks:", {
      screenWidth,
      screenHeight,
      hasSmallScreen,
      mobileUA,
      userAgent: userAgent.substring(0, 80),
    });

    // NEUE LOGIK: Kleiner Screen = Smartphone (inkl. Emulatoren!)
    // Das erlaubt Entwicklern die App im DevTools zu testen
    if (hasSmallScreen) {
      console.log(
        "[DeviceDetection] ✅ Smartphone erkannt (Small Screen ≤768px)",
      );
      return true;
    }

    // Großer Screen = kein Smartphone
    console.log("[DeviceDetection] ❌ Kein Smartphone erkannt (Screen >768px)");
    return false;
  }

  /**
   * Gibt den Gerätetyp als String zurück
   * @returns {string} 'smartphone', 'tablet', oder 'desktop'
   */
  function getDeviceType() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(userAgent);
    const isMobile =
      /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent,
      );

    if (isSmartphone()) {
      return "smartphone";
    } else if (isTablet || (isMobile && window.innerWidth > 768)) {
      return "tablet";
    } else {
      return "desktop";
    }
  }

  /**
   * Prüft, ob die App auf diesem Gerät vollständig funktionieren soll
   * @returns {boolean} true wenn unterstützt (nur Smartphones)
   */
  function isDeviceSupported() {
    return isSmartphone();
  }

  // Export
  global.DeviceDetection = {
    isSmartphone,
    getDeviceType,
    isDeviceSupported,
  };
})(window);
