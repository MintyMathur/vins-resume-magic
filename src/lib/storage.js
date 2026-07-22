// Resume Tailor — Chrome Storage Helpers

export async function saveResume(resume) {
  return chrome.storage.local.set({ resume });
}

export async function loadResume() {
  const result = await chrome.storage.local.get('resume');
  return result.resume || null;
}

export async function saveApiKey(apiKey) {
  return chrome.storage.local.set({ apiKey });
}

export async function loadApiKey() {
  const result = await chrome.storage.local.get('apiKey');
  return result.apiKey || null;
}

export async function saveJobDescription(jd) {
  return chrome.storage.local.set({ jobDescription: jd });
}

export async function loadJobDescription() {
  const result = await chrome.storage.local.get('jobDescription');
  return result.jobDescription || null;
}

export async function saveTailoredResume(tailored) {
  return chrome.storage.local.set({ tailoredResume: tailored });
}

export async function loadTailoredResume() {
  const result = await chrome.storage.local.get('tailoredResume');
  return result.tailoredResume || null;
}
