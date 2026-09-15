// ========================================
// X-Stock
// X OAuth 2.0 PKCE + Cloudflare Worker
// ========================================

const CLIENT_ID = "dHpEalVBeWRTZ1BpSmNJdXdpdXk6MTpjaQ";

const REDIRECT_URI =
  "https://shoooy0601-cmd.github.io/x-stock/";

const WORKER_URL =
  "https://steep-lake-3c3ax-stock-api.shooo-y0601.workers.dev";

const AUTH_URL =
  "https://x.com/i/oauth2/authorize";

const SCOPES = [
  "tweet.read",
  "tweet.write",
  "users.read",
  "offline.access"
].join(" ");

const loginButton =
  document.getElementById("loginButton");

const loginStatus =
  document.getElementById("loginStatus");

const selectAllButton =
  document.getElementById("selectAllButton");

const deleteButton =
  document.getElementById("deleteButton");

const selectedCount =
  document.getElementById("selectedCount");

const postList =
  document.getElementById("postList");

let posts = [];

function generateRandomString(length = 64) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
    "abcdefghijklmnopqrstuvwxyz" +
    "0123456789-._~";

  const array =
    new Uint8Array(length);

  crypto.getRandomValues(array);

  return Array.from(array)
    .map((x) => chars[x % chars.length])
    .join("");
}

async function sha256(text) {
  const data =
    new TextEncoder().encode(text);

  return await crypto.subtle.digest(
    "SHA-256",
    data
  );
}

function base64UrlEncode(buffer) {
  return btoa(
    String.fromCharCode(
      ...new Uint8Array(buffer)
    )
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function createCodeChallenge(verifier) {
  const hash =
    await sha256(verifier);

  return base64UrlEncode(hash);
}

loginButton.addEventListener(
  "click",
  async () => {
    if (
      !CLIENT_ID ||
      CLIENT_ID === "YOUR_CLIENT_ID_HERE"
    ) {
      alert(
        "X Developer PortalのClient IDを設定してください。"
      );
      return;
    }

    try {
      loginStatus.textContent =
        "Xログインを開始しています…";

      const state =
        generateRandomString(32);

      const codeVerifier =
        generateRandomString(64);

      const codeChallenge =
        await createCodeChallenge(
          codeVerifier
        );

      sessionStorage.setItem(
        "x_oauth_state",
        state
      );

      sessionStorage.setItem(
        "x_code_verifier",
        codeVerifier
      );

      const params =
        new URLSearchParams({
          response_type: "code",
          client_id: CLIENT_ID,
          redirect_uri: REDIRECT_URI,
          scope: SCOPES,
          state: state,
          code_challenge: codeChallenge,
          code_challenge_method: "S256"
        });

      window.location.href =
        `${AUTH_URL}?${params.toString()}`;

    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      loginStatus.textContent =
        "Xログインの開始に失敗しました。";
    }
  }
);

async function handleOAuthCallback() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const code =
    params.get("code");

  const state =
    params.get("state");

  const error =
    params.get("error");

  if (error) {
    loginStatus.textContent =
      "Xログインがキャンセルされました。";
    return;
  }

  if (!code) {
    return;
  }

  const savedState =
    sessionStorage.getItem(
      "x_oauth_state"
    );

  const codeVerifier =
    sessionStorage.getItem(
      "x_code_verifier"
    );

  if (
    !savedState ||
    !codeVerifier
  ) {
    loginStatus.textContent =
      "認証情報が見つかりません。もう一度ログインしてください。";
    return;
  }

  if (state !== savedState) {
    loginStatus.textContent =
      "認証エラー：stateが一致しません。";
    return;
  }

  loginStatus.textContent =
    "Xアカウントに接続しています…";

  try {
    const body =
      new URLSearchParams();

    body.append("code", code);
    body.append(
      "grant_type",
      "authorization_code"
    );
    body.append(
      "client_id",
      CLIENT_ID
    );
    body.append(
      "redirect_uri",
      REDIRECT_URI
    );
    body.append(
      "code_verifier",
      codeVerifier
    );

    const response =
      await fetch(
        `${WORKER_URL}/oauth2/token`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded"
          },
          body:
            body.toString()
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        "TOKEN ERROR:",
        data
      );

      throw new Error(
        data.error_description ||
        data.detail ||
        data.error ||
        `X APIエラー（HTTP ${response.status}）`
      );
    }

    sessionStorage.removeItem(
      "x_oauth_state"
    );

    sessionStorage.removeItem(
      "x_code_verifier"
    );

    sessionStorage.setItem(
      "x_access_token",
      data.access_token
    );

    if (data.refresh_token) {
      sessionStorage.setItem(
        "x_refresh_token",
        data.refresh_token
      );
    }

    window.history.replaceState(
      {},
      document.title,
      REDIRECT_URI
    );

    loginStatus.textContent =
      "Xアカウントに接続しました。";

    await loadMyAccount();

  } catch (error) {
    console.error(
      "OAUTH ERROR:",
      error
    );

    loginStatus.textContent =
      `接続に失敗しました：${error.message}`;
  }
}

async function xApiFetch(
  path,
  options = {}
) {
  const token =
    sessionStorage.getItem(
      "x_access_token"
    );

  if (!token) {
    throw new Error(
      "Xアカウントに接続してください。"
    );
  }

  const headers = {
    ...(options.headers || {}),
    Authorization:
      `Bearer ${token}`
  };

  return await fetch(
    `${WORKER_URL}${path}`,
    {
      ...options,
      headers
    }
  );
}

async function loadMyAccount() {
  try {
    const response =
      await xApiFetch(
        "/2/users/me"
      );

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        "ACCOUNT ERROR:",
        data
      );

      throw new Error(
        data.detail ||
        data.title ||
        "アカウント情報の取得に失敗しました。"
      );
    }

    loginStatus.textContent =
      `接続中：@${data.data.username}`;

    await loadMyPosts(
      data.data.id
    );

  } catch (error) {
    console.error(
      "ACCOUNT ERROR:",
      error
    );

    loginStatus.textContent =
      `アカウント情報の取得に失敗しました：${error.message}`;
  }
}

async function loadMyPosts(userId) {
  postList.innerHTML =
    `
      <div class="empty">
        投稿を読み込んでいます…
      </div>
    `;

  try {
    const response =
      await xApiFetch(
        `/2/users/${userId}/tweets?max_results=100&tweet.fields=created_at,text`
      );

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        "POSTS ERROR:",
        data
      );

      throw new Error(
        data.detail ||
        data.title ||
        "投稿の取得に失敗しました。"
      );
    }

    posts =
      data.data || [];

    renderPosts();

  } catch (error) {
    console.error(
      "POSTS ERROR:",
      error
    );

    postList.innerHTML =
      `
        <div class="empty">
          投稿の取得に失敗しました。
          <br><br>
          ${escapeHtml(error.message)}
        </div>
      `;
  }
}

function renderPosts() {
  if (posts.length === 0) {
    postList.innerHTML =
