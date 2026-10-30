declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          prompt: (momentListener?: (notification: GooglePromptNotification) => void) => void;
          renderButton: (parent: HTMLElement, config: Record<string, unknown>) => void;
          cancel: () => void;
        };
      };
    };
  }
}

type GooglePromptNotification = {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  isDismissedMoment: () => boolean;
};

let scriptPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-gis="1"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Could not load Google sign-in.')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleGis = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Google sign-in.'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

function originMismatchHint(): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return (
    `Google blocked this site origin${origin ? ` (${origin})` : ''}. ` +
    'In Google Cloud Console → OAuth Web client → Authorized JavaScript origins, add that exact origin ' +
    '(no path). Include https://carsv.chayhour.xyz and http://127.0.0.1:3000 / http://localhost:3000 for local.'
  );
}

/** Returns a Google ID token (JWT). Prefers One Tap; falls back to a programmatic GIS button click. */
export async function requestGoogleIdToken(clientId: string): Promise<string> {
  if (!clientId) {
    throw new Error('Google sign-in is not configured. Set GOOGLE_CLIENT_ID on the API server.');
  }
  await loadGisScript();
  const id = window.google?.accounts?.id;
  if (!id) {
    throw new Error('Google sign-in is unavailable in this browser.');
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let host: HTMLDivElement | null = null;

    const cleanup = () => {
      try {
        id.cancel();
      } catch {
        /* ignore */
      }
      host?.remove();
      host = null;
    };

    const finish = (credential: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(credential);
    };
    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(message));
    };

    // Classic GIS (not FedCM). FedCM on Firefox often surfaces Error 400: origin_mismatch
    // even when the same Web client works with the popup / button flow.
    id.initialize({
      client_id: clientId,
      callback: (response: { credential?: string }) => {
        if (response?.credential) finish(response.credential);
        else fail('Google did not return a sign-in credential.');
      },
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: false,
      ux_mode: 'popup',
    });

    const tryHiddenButton = () => {
      host = document.createElement('div');
      host.setAttribute('aria-hidden', 'true');
      // Keep off-screen — do not flash a second Google button over the modal.
      host.style.cssText =
        'position:fixed;left:-10000px;top:0;width:320px;height:44px;overflow:hidden;opacity:0;pointer-events:none;';
      document.body.appendChild(host);
      try {
        id.renderButton(host, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: 320,
          locale: 'en',
        });
      } catch {
        fail(originMismatchHint());
        return;
      }
      window.setTimeout(() => {
        if (settled || !host) return;
        const btn = host.querySelector<HTMLElement>('div[role="button"]');
        if (!btn) {
          fail(originMismatchHint());
          return;
        }
        host.style.pointerEvents = 'auto';
        btn.click();
        window.setTimeout(() => {
          if (!settled) {
            fail(
              `Google sign-in was cancelled or blocked. If you saw Error 400: origin_mismatch, ${originMismatchHint()}`,
            );
          }
        }, 120000);
      }, 80);
    };

    id.prompt((notification) => {
      if (settled) return;
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        tryHiddenButton();
      }
    });
  });
}
