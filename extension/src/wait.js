(function () {
  window.WhatsAppWait = {
    waitForElement: function (selectorList, timeoutMs = 6000) {
      return new Promise((resolve, reject) => {
        const selectors = Array.isArray(selectorList) ? selectorList : [selectorList];
        
        // 1. Verificar se o elemento já existe no DOM
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) return resolve({ element: el, selector: sel });
        }

        let timer = null;
        let observer = null;

        const cleanup = () => {
          if (timer) clearTimeout(timer);
          if (observer) observer.disconnect();
        };

        timer = setTimeout(() => {
          cleanup();
          reject(new Error(`TIMEOUT: Elemento não encontrado (${selectors.join(", ")}) em ${timeoutMs}ms`));
        }, timeoutMs);

        observer = new MutationObserver(() => {
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) {
              cleanup();
              return resolve({ element: el, selector: sel });
            }
          }
        });

        observer.observe(document.body, { childList: true, subtree: true });
      });
    },

    waitForCondition: function (conditionFn, timeoutMs = 6000, intervalMs = 200) {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const check = () => {
          try {
            if (conditionFn()) {
              return resolve(true);
            }
          } catch (e) {}

          if (Date.now() - startTime >= timeoutMs) {
            return reject(new Error(`TIMEOUT: Condição não satisfeita após ${timeoutMs}ms`));
          }

          setTimeout(check, intervalMs);
        };
        check();
      });
    },
  };
})();
