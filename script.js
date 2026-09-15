// ========================================
// X-Stock
// X OAuth 2.0 PKCE + X API
// ========================================

// ★ここだけ自分のClient IDに変更
const CLIENT_ID = "dHpEalVBeWRTZ1BpSmNJdXdpdXk6MTpjaQ";

const REDIRECT_URI =
  "https://shoooy0601-cmd.github.io/x-stock/";

const AUTH_URL =
  "https://x.com/i/oauth2/authorize";

const TOKEN_URL =
  "https://api.x.com/2/oauth2/token";

const API_BASE =
  "https://api.x.com/2";

const SCOPES = [
  "tweet.read",
  "tweet.write",
  "users.read",
  "offline.access"
].join(" ");


// ========================================
// HTML elements
// ========================================

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


// ========================================
// PKCE
// ========================================

function generateRandomString(length = 64) {

  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

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


// ========================================
// X Login
// ========================================

loginButton.addEventListener(
  "click",
  async () => {

    if (
      !CLIENT_ID ||
      CLIENT_ID === "YOUR_CLIENT_ID_HERE"
    ) {

      alert(
        "script.js のClient IDが設定されていません。"
      );

      return;
    }

    try {

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

          client_id:
            CLIENT_ID,

          redirect_uri:
            REDIRECT_URI,

          scope:
            SCOPES,

          state:
            state,

          code_challenge:
            codeChallenge,

          code_challenge_method:
            "S256"

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


// ========================================
// OAuth callback
// ========================================

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

    // ==================================
    // Token request
    // ==================================

    const body =
      new URLSearchParams();

    body.append(
      "code",
      code
    );

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


    let response;


    try {

      response =
        await fetch(
          TOKEN_URL,
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

    } catch (networkError) {

      console.error(
        "TOKEN FETCH ERROR:",
        networkError
      );

      throw new Error(
        "Xとの通信に失敗しました。詳細: " +
        (
          networkError.message ||
          networkError
        )
      );
    }


    let data;


    try {

      data =
        await response.json();

    } catch (jsonError) {

      console.error(
        "TOKEN JSON ERROR:",
        jsonError
      );

      throw new Error(
        `Xから正常なJSONが返ってきませんでした。HTTP ${response.status}`
      );
    }


    if (!response.ok) {

      console.error(
        "TOKEN API ERROR:",
        data
      );

      throw new Error(
        data.error_description ||
        data.detail ||
        data.error ||
        `X APIエラー（HTTP ${response.status}）`
      );
    }


    // ==================================
    // Save tokens
    // ==================================

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


    // URLからcodeを消す

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


// ========================================
// Get my account
// ========================================

async function loadMyAccount() {

  const token =
    sessionStorage.getItem(
      "x_access_token"
    );


  if (!token) {

    return;
  }


  try {

    const response =
      await fetch(
        `${API_BASE}/users/me`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      console.error(
        "ACCOUNT API ERROR:",
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


// ========================================
// Get my posts
// ========================================

async function loadMyPosts(userId) {

  const token =
    sessionStorage.getItem(
      "x_access_token"
    );


  postList.innerHTML =
    `<div class="empty">
      投稿を読み込んでいます…
    </div>`;


  try {

    const url =
      `${API_BASE}/users/${userId}/tweets` +
      "?max_results=100" +
      "&tweet.fields=created_at,text";


    const response =
      await fetch(
        url,
        {
          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      console.error(
        "POSTS API ERROR:",
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
      `<div class="empty">
        投稿の取得に失敗しました。<br>
        ${escapeHtml(error.message)}
      </div>`;
  }
}


// ========================================
// Render posts
// ========================================

function renderPosts() {

  if (posts.length === 0) {

    postList.innerHTML =
      `<div class="empty">
        投稿がありません。
      </div>`;

    return;
  }


  postList.innerHTML = "";


  posts.forEach(
    (post) => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "post-item";


      item.innerHTML = `

        <input
          type="checkbox"
          class="post-checkbox"
          data-id="${post.id}"
        >

        <div class="post-content">

          <div class="post-text">
            ${escapeHtml(post.text)}
          </div>

          <div class="post-date">
            ${post.created_at || ""}
          </div>

        </div>

      `;


      const checkbox =
        item.querySelector(
          ".post-checkbox"
        );


      checkbox.addEventListener(
        "change",
        updateSelectedCount
      );


      postList.appendChild(
        item
      );

    }
  );


  updateSelectedCount();
}


// ========================================
// HTML escape
// ========================================

function escapeHtml(text) {

  const div =
    document.createElement(
      "div"
    );

  div.textContent =
    text;

  return div.innerHTML;
}


// ========================================
// Select all
// ========================================

selectAllButton.addEventListener(
  "click",
  () => {

    const checkboxes =
      document.querySelectorAll(
        ".post-checkbox"
      );


    checkboxes.forEach(
      (checkbox) => {

        checkbox.checked =
          true;

      }
    );


    updateSelectedCount();

  }
);


// ========================================
// Selected count
// ========================================

function updateSelectedCount() {

  const checked =
    document.querySelectorAll(
      ".post-checkbox:checked"
    );


  selectedCount.textContent =
    `選択中：${checked.length}件`;


  deleteButton.disabled =
    checked.length === 0;
}


// ========================================
// Delete posts
// ========================================

deleteButton.addEventListener(
  "click",
  async () => {

    const checked =
      document.querySelectorAll(
        ".post-checkbox:checked"
      );


    if (checked.length === 0) {

      return;
    }


    const confirmed =
      confirm(
        `${checked.length}件の投稿を削除します。\n\nこの操作は取り消せません。`
      );


    if (!confirmed) {

      return;
    }


    const token =
      sessionStorage.getItem(
        "x_access_token"
      );


    if (!token) {

      alert(
        "Xアカウントに接続してください。"
      );

      return;
    }


    deleteButton.disabled =
      true;


    let successCount =
      0;


    for (
      const checkbox of checked
    ) {

      const postId =
        checkbox.dataset.id;


      try {

        const response =
          await fetch(
            `${API_BASE}/tweets/${postId}`,
            {
              method: "DELETE",

              headers: {
                Authorization:
                  `Bearer ${token}`
              }
            }
          );


        const data =
          await response.json();


        if (
          response.ok &&
          data.data &&
          data.data.deleted === true
        ) {

          successCount++;

        } else {

          console.error(
            "DELETE ERROR:",
            postId,
            data
          );
        }


      } catch (error) {

        console.error(
          "DELETE NETWORK ERROR:",
          postId,
          error
        );
      }

    }


    alert(
      `${successCount}件の投稿を削除しました。`
    );


    await loadMyAccount();

  }
);


// ========================================
// Start
// ========================================

handleOAuthCallback();


if (
  sessionStorage.getItem(
    "x_access_token"
  )
) {

  loadMyAccount();

}
