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

const postList =
  document.getElementById("postList");

const selectAllButton =
  document.getElementById("selectAllButton");

const deleteButton =
  document.getElementById("deleteButton");

const selectedCount =
  document.getElementById("selectedCount");


let accessToken = "";
let posts = [];


/* =========================
   PKCE
========================= */

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


/* =========================
   Xログイン開始
========================= */

loginButton.addEventListener(
  "click",
  async () => {

    try {

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

    } catch (error) {

      console.error(error);

      loginStatus.textContent =
        "Xログインの開始に失敗しました。";

      alert(
        "Xログインの開始に失敗しました。"
      );
    }
  }
);


/* =========================
   認証コード処理
========================= */

async function handleCallback() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  const code =
    params.get("code");

  const returnedState =
    params.get("state");

  const error =
    params.get("error");

  if (error) {

    console.error(
      "X OAuth error:",
      error
    );

    loginStatus.textContent =
      "Xの認証がキャンセルされました。";

    return;
  }

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
      "OAuth認証の確認に
