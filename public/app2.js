let auth = null;

const loginBox = document.getElementById("loginBox");
const loginBtn = document.getElementById("loginBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const errorBox = document.getElementById("error");
const library = document.getElementById("library");
const songGrid = document.getElementById("songGrid");

const player = document.getElementById("player");
const audio = document.getElementById("audio");
const nowCover = document.getElementById("nowCover");
const nowTitle = document.getElementById("nowTitle");
const nowArtist = document.getElementById("nowArtist");

function getAuthParams() {
  return new URLSearchParams({
    u: auth.username,
    p: auth.password,
    v: "1.16.1",
    c: "custom-music-ui",
    f: "json",
  });
}

async function apiCall(endpoint, params = {}) {
  const query = getAuthParams();

  for (const [key, value] of Object.entries(params)) {
    query.set(key, value);
  }

  const url = `/rest/${endpoint}.view?${query.toString()}`;
  const response = await fetch(url);

,  let json;
  try {
    json = await response.json();
  } catch (err) {
    throw new Error("Could not parse Navidrome response as JSON");
  }

  const subsonic = json["subsonic-response"];

  if (!subsonic) {
    throw new Error("Invalid Navidrome response");
  }

  if (subsonic.status !== "ok") {
    throw new Error(subsonic.error?.message || "Subsonic API error");
  }

  return subsonic;
}

function streamUrl(songId) {
  console.log("STREAM URL:", audio.src);
  const query = getAuthParams();
  query.set("id", songId);
  return `/rest/stream.view?${query.toString()}`;
}

function coverArtUrl(coverArtId, size = 500) {
  const query = getAuthParams();
  query.set("id", coverArtId);
  query.set("size", size);
  return `/rest/getCoverArt.view?${query.toString()}`;
}

function fallbackCover() {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500">
      <rect width="500" height="500" fill="#1e293b"/>
      <circle cx="250" cy="250" r="95" fill="#334155"/>
      <circle cx="250" cy="250" r="28" fill="#64748b"/>
      <text x="250" y="390" text-anchor="middle" fill="#cbd5e1" font-family="Arial" font-size="34">Music</text>
    </svg>
  `);
}

function createSongCard(song) {
  const card = document.createElement("button");
  card.className = "song-card";

  const img = document.createElement("img");
  img.src = song.coverArt ? coverArtUrl(song.coverArt) : fallbackCover();
  img.alt = "";
  img.onerror = () => {
    img.src = fallbackCover();
  };

  const title = document.createElement("strong");
  title.textContent = song.title || "Unknown title";

  const artist = document.createElement("span");
  artist.textContent = song.artist || "Unknown artist";

  card.appendChild(img);
  card.appendChild(title);
  card.appendChild(artist);

  card.addEventListener("click", () => {
    playSong(song);
  });

  return card;
}

async function loadSongs() {
  songGrid.innerHTML = `<p style="color:#94a3b8">Loading songs...</p>`;

  try {
    const data = await apiCall("getRandomSongs", { size: 50 });
    const songs = data.randomSongs?.song || [];

    songGrid.innerHTML = "";

    if (songs.length === 0) {
      songGrid.innerHTML = `
        <p style="color:#fecaca">
          No songs found through API. Try rescanning Navidrome library.
        </p>
      `;
      return;
    }

    songs.forEach((song) => {
      songGrid.appendChild(createSongCard(song));
    });
  } catch (err) {
    songGrid.innerHTML = `<p style="color:#fecaca">Error: ${err.message}</p>`;
  }
}

function playSong(song) {
  nowTitle.textContent = song.title || "Unknown title";
  nowArtist.textContent = song.artist || "Unknown artist";

  nowCover.src = song.coverArt ? coverArtUrl(song.coverArt, 200) : fallbackCover();
  nowCover.onerror = () => {
    nowCover.src = fallbackCover();
  };

  audio.pause();
  audio.removeAttribute("src");
  audio.load();

  audio.src = streamUrl(song.id);
  audio.load();

  player.classList.remove("hidden");

  audio.play().catch((err) => {
    alert("Playback error: " + err.message);
  });
}

async function login() {
  errorBox.textContent = "";

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    errorBox.textContent = "Enter username and password.";
    return;
  }

  auth = { username, password };

  try {
    loginBtn.disabled = true;
    loginBtn.textContent = "Connecting...";

    await apiCall("ping");

    loginBox.classList.add("hidden");
    library.classList.remove("hidden");

    await loadSongs();
  } catch (err) {
    errorBox.textContent = err.message;
    auth = null;
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Connect";
  }
}

loginBtn.addEventListener("click", login);

passwordInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    login();
  }
});

shuffleBtn.addEventListener("click", async () => {
  if (!auth) return;
  await loadSongs();
});
