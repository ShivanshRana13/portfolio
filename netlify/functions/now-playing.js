const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_NOW_PLAYING_URL = "https://api.spotify.com/v1/me/player/currently-playing";

const json = (statusCode, body, extraHeaders = {}) => ({
  statusCode,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=5",
    ...extraHeaders,
  },
  body: JSON.stringify(body),
});

const getAccessToken = async () => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return { error: "missing_env", message: "Spotify credentials are not configured." };
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    return { error: "token_failed", message: "Could not refresh Spotify access token." };
  }

  const data = await response.json();
  if (typeof data.access_token !== "string") {
    return { error: "token_failed", message: "Spotify did not return an access token." };
  }

  return { accessToken: data.access_token };
};

const getPrimaryArtist = (item) => {
  if (!item || !Array.isArray(item.artists) || item.artists.length === 0) {
    return "";
  }
  return item.artists[0]?.name ?? "";
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  if (event.httpMethod !== "GET") {
    return json(405, { error: "method_not_allowed" });
  }

  try {
    const tokenResult = await getAccessToken();
    if (tokenResult.error) {
      return json(503, tokenResult);
    }

    const response = await fetch(SPOTIFY_NOW_PLAYING_URL, {
      headers: {
        Authorization: `Bearer ${tokenResult.accessToken}`,
      },
    });

    if (response.status === 204) {
      return json(200, { isPlaying: false });
    }

    if (!response.ok) {
      return json(response.status, {
        error: "spotify_failed",
        message: "Could not load currently playing track.",
      });
    }

    const payload = await response.json();
    const item = payload?.item ?? null;
    const artist = getPrimaryArtist(item);
    const track = typeof item?.name === "string" ? item.name : "";
    const trackUrl = typeof item?.external_urls?.spotify === "string" ? item.external_urls.spotify : "";

    return json(200, {
      isPlaying: payload?.is_playing === true,
      artist,
      track,
      trackUrl,
      label: artist ? `Listening to: ${artist}` : track ? `Listening to: ${track}` : "",
    });
  } catch {
    return json(500, { error: "server_error", message: "Unexpected error while loading Spotify data." });
  }
};
