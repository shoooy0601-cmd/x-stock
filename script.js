const CLIENT_ID = "dHpEalVBeWRTZ1BpSmNJdXdpdXk6MTpjaQ";

const REDIRECT_URI =
  "https://shoooy0601-cmd.github.io/x-stock/";

const WORKER_URL =
  "https://steep-lake-3c3ax-stock-api.shooo-y0601.workers.dev";

const AUTH_URL =
  "https://x.com/i/oauth2/authorize";

const SCOPES =
  "tweet.read tweet.write users.read offline.access";

const loginButton =
  document.getElementById("loginButton");

const loginStatus =
  document.getElementById("loginStatus");

function randomString(length) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

  const array =
    new Uint8Array(length);

  crypto.getRandomValues(array);

  return Array.from(array)
    .map(x => chars[x % chars.length])
    .join("");
}

async function createChallenge(verifier) {
  const data =
    new TextEncoder().encode(verifier);

  const hash =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  return btoa(
    String.fromCharCode(
      ...new Uint8Array(hash)
    )
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

loginButton.addEventListener(
  "click",
  async () => {
    loginStatus.textContent =
      "Xログインを開始しています…";

    const state =
      randomString(32);

    const verifier =
      randomString(64);

    const challenge =
      await createChallenge(verifier);

    sessionStorage.setItem(
      "x_oauth_state",
      state
    );

    sessionStorage.setItem(
      "x_code_verifier",
      verifier
    );

    const params =
      new URLSearchParams();

    params.set(
      "response_type",
      "code"
    );

    params.set(
      "client_id",
      CLIENT_ID
    );

    params.set(
      "redirect_uri",
      REDIRECT_URI
    );

    params.set(
      "scope",
      SCOPES
    );

    params.set(
      "state",
      state
    );

    params.set(
      "code_challenge",
      challenge
    );

    params.set(
      "code_challenge_method",
      "S256"
    );

    window.location.href =
      AUTH_URL +
      "?" +
      params.toString();
  }
);

async function handleCallback() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const code =
    params.get("code");

  const returnedState =
    params.get("state");

  if (!code) {
    return;
  }

  const savedState =
    sessionStorage.getItem(
      "x_oauth_state"
    );

  const verifier =
    sessionStorage.getItem(
      "x_code_verifier"
    );

  if (
    !savedState ||
    !returnedState ||
    savedState !== returnedState
  ) {
    alert(
      "OAuth認証に失敗しました。"
    );
    return;
  }

  if (!verifier) {
    alert(
      "認証情報が見つかりません。"
    );
    return;
  }

  loginStatus.textContent =
    "Xアカウントに接続しています…";

  const body =
    new URLSearchParams();

  body.set(
    "code",
    code
  );

  body.set(
    "grant_type",
    "authorization_code"
  );

  body.set(
    "client_id",
    CLIENT_ID
  );

  body.set(
    "redirect_uri",
    REDIRECT_URI
  );

  body.set(
    "code_verifier",
    verifier
  );

  try {
    const response =
      await fetch(
        WORKER_URL +
          "/oauth2/token",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded"
          },
          body: body.toString()
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error_description ||
        data.error ||
        "トークン取得に失敗しました"
      );
    }

    sessionStorage.setItem(
      "x_access_token",
      data.access_token
    );

    sessionStorage.removeItem(
      "x_oauth_state"
    );

    sessionStorage.removeItem(
      "x_code_verifier"
    );

    window.history.replaceState(
      {},
      document.title,
      REDIRECT_URI
    );

    loginStatus.textContent =
      "Xアカウントに接続しました。";

    alert(
      "Xアカウントへの接続に成功しました！"
    );

  } catch (error) {
    console.error(error);

    loginStatus.textContent =
      "接続に失敗しました。";

    alert(
      "接続に失敗しました：\n" +
      error.message
    );
  }
}

handleCallback();
