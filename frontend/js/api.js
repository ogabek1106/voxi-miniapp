window.API = "https://voxi-miniapp-production.up.railway.app";

window.apiGet = async function (path) {
  const res = await fetch(`${window.API}${path}`);
  const text = await res.text();
  if (!res.ok) throw new Error(text || "API error");
  return JSON.parse(text);
};

window.apiPost = async function (path, body) {
  const res = await fetch(`${window.API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || "API error");
  return JSON.parse(text);
};
