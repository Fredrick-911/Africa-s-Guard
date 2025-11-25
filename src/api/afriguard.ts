const API_BASE = "http://localhost:8000";  

export const detectImage = async (file: File) => {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch(`${API_BASE}/detect/image/`, {
    method: "POST",
    body: form,
  });
  return res.json();
};

export const detectAudio = async (file1: File, file2: File) => {
  const form = new FormData();
  form.append("audio_files", file1);
  form.append("audio_files", file2);
  const res = await fetch(`${API_BASE}/detect/audio/`, {
    method: "POST",
    body: form,
  });
  return res.json();
};

export const detectVideo = async (file: File) => {
  const form = new FormData();
  form.append("video", file);
  const res = await fetch(`${API_BASE}/detect/video/`, {
    method: "POST",
    body: form,
  });
  return res.json();
};