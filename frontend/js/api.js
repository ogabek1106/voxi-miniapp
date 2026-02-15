window.API = "https://voxi-miniapp-production.up.railway.app";

window.apiGet = async function (path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error("API error");
  return res.json();
};

window.apiPost = async function (path, body) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("API error");
  return res.json();
};

