// === Replace with your actual Cloudinary + n8n values ===
const N8N_WEBHOOK_URL = "https://your-n8n/webhook/report";
const CLOUD_NAME = "your_cloud_name";
const UPLOAD_PRESET = "your_unsigned_preset";

let lat = null, lng = null;
const descEl = document.getElementById("desc");
const photoEl = document.getElementById("photo");
const preview = document.getElementById("preview");
const pDesc = document.getElementById("pDesc");
const pImg = document.getElementById("pImg");
const pLoc = document.getElementById("pLoc");
const locBtn = document.getElementById("locBtn");
const submitBtn = document.getElementById("submitBtn");
const micBtn = document.getElementById("micBtn");
const status = document.getElementById("status");

// --- Live Preview ---
function updatePreview() {
  if (descEl.value || photoEl.files[0] || (lat && lng)) {
    pDesc.textContent = descEl.value || "No description yet";
    if (photoEl.files[0]) {
      pImg.src = URL.createObjectURL(photoEl.files[0]);
      pImg.style.display = "block";
    } else {
      pImg.style.display = "none";
    }
    pLoc.textContent = (lat && lng) ? `📍 ${lat}, ${lng}` : "";
    preview.style.display = "block";
  } else {
    preview.style.display = "none";
  }
}
descEl.addEventListener("input", updatePreview);
photoEl.addEventListener("change", updatePreview);

// --- Voice Input ---
micBtn.onclick = () => {
  if (!('webkitSpeechRecognition' in window)) { alert("Speech recognition not supported"); return; }
  const recog = new webkitSpeechRecognition();
  recog.lang = "en-IN";
  recog.start();
  recog.onresult = (e) => {
    descEl.value += " " + e.results[0][0].transcript;
    updatePreview();
  };
};

// --- Location ---
locBtn.onclick = () => {
  if (!navigator.geolocation) { alert("Geolocation not supported"); return; }
  status.textContent = "📍 Getting location...";
  navigator.geolocation.getCurrentPosition((pos) => {
    lat = pos.coords.latitude.toFixed(6);
    lng = pos.coords.longitude.toFixed(6);
    document.getElementById("locDisplay").textContent = `Lat: ${lat}, Lng: ${lng}`;
    updatePreview();
    status.textContent = "";
  }, () => {
    alert("Location not available");
    status.textContent = "";
  });
};

// --- Cloudinary Upload ---
async function uploadToCloudinary(file) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;
  const fd = new FormData();
  fd.append("upload_preset", UPLOAD_PRESET);
  fd.append("file", file);
  const r = await fetch(url, { method: "POST", body: fd });
  if (!r.ok) throw new Error("Cloudinary upload failed: " + r.status);
  const data = await r.json();
  return data.secure_url;
}

// --- Submit ---
submitBtn.onclick = async () => {
  const desc = descEl.value.trim();
  const file = photoEl.files[0];
  if (!desc) { alert("Please enter a description"); return; }

  submitBtn.disabled = true;
  status.textContent = "⏳ Uploading...";
  status.className = "";

  try {
    let photo_url = "";
    if (file) photo_url = await uploadToCloudinary(file);

    status.textContent = "🚀 Sending report...";
    const payload = { description: desc, lat, lng, photo_url, source: "Web" };

    const r = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!r.ok) throw new Error("n8n returned " + r.status);

    const data = await r.json();
    status.innerHTML = `✅ Submitted!<br>Ticket: ${data.ticket_id || "N/A"}<br>Category: ${data.category || "Unknown"}<br>Sentiment: ${data.sentiment || "Neutral"}`;
    status.className = "success";
  } catch (e) {
    console.error(e);
    status.textContent = "❌ " + e.message;
    status.className = "error";
  } finally {
    submitBtn.disabled = false;
  }
};
