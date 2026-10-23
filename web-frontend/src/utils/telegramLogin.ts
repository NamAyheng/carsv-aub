declare global {
  interface Window {
    onCarSVTelegramAuth?: (user: TelegramLoginUser) => void;
  }
}

export type TelegramLoginUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

/**
 * Opens the Telegram Login Widget overlay and resolves with the auth payload
 * for POST /api/auth/telegram/. BotFather /setdomain must match this site host.
 */
export async function requestTelegramLogin(botUsername: string): Promise<TelegramLoginUser> {
  const bot = (botUsername || '').replace(/^@/, '').trim();
  if (!bot) {
    throw new Error('Telegram sign-in is not configured. Set TELEGRAM_BOT_USERNAME on the API server.');
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const backdrop = document.createElement('div');
    const host = document.createElement('div');

    const cleanup = () => {
      delete window.onCarSVTelegramAuth;
      backdrop.remove();
      host.remove();
    };

    const finish = (user: TelegramLoginUser) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(user);
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(message));
    };

    backdrop.style.cssText =
      'position:fixed;inset:0;background:rgba(2,6,23,.6);z-index:99998;';
    backdrop.onclick = () => fail('Telegram sign-in was cancelled.');

    host.style.cssText =
      'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:99999;' +
      'background:#0f172a;padding:20px;border-radius:14px;border:1px solid #1e293b;' +
      'box-shadow:0 24px 60px rgba(0,0,0,.5);min-width:260px;text-align:center;';

    const title = document.createElement('p');
    title.textContent = 'Continue with Telegram';
    title.style.cssText = 'margin:0 0 12px;color:#e2e8f0;font:600 14px/1.3 system-ui,sans-serif;';
    host.appendChild(title);

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', bot);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-userpic', 'false');
    script.setAttribute('data-onauth', 'onCarSVTelegramAuth(user)');
    host.appendChild(script);

    const hint = document.createElement('p');
    hint.textContent = 'If nothing appears, set /setdomain in BotFather to this site host.';
    hint.style.cssText = 'margin:12px 0 0;color:#64748b;font:12px/1.4 system-ui,sans-serif;';
    host.appendChild(hint);

    window.onCarSVTelegramAuth = (user) => {
      if (!user?.id || !user?.hash || !user?.auth_date) {
        fail('Telegram did not return a valid sign-in payload.');
        return;
      }
      finish(user);
    };

    document.body.appendChild(backdrop);
    document.body.appendChild(host);

    window.setTimeout(() => {
      if (!settled && !host.querySelector('iframe')) {
        fail(
          'Telegram login UI could not start. In BotFather run /setdomain and set carsv-web.onrender.com',
        );
      }
    }, 4000);

    window.setTimeout(() => {
      if (!settled) fail('Telegram sign-in timed out.');
    }, 120000);
  });
}
