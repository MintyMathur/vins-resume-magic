// Resume Tailor — Job Description Extractor
// Injected into the active tab to extract JD text

export function extractJobDescription() {
  const selectors = [
    '.jobs-description',                           // LinkedIn
    '.jobs-description-content',                   // LinkedIn alt
    '[data-automation-id="jobPostingDescription"]', // Workday
    '[data-qa="job-description"]',                 // Lever
    '.posting-requirements',                       // Lever alt
    '#content',                                    // Greenhouse
    '.job-description',                            // Generic
    '.job__description',                           // Generic
    '[class*="job-description"]',                  // Fuzzy match
    '[class*="jobDescription"]',                   // Fuzzy camelCase
    'article',                                     // Semantic fallback
    'main',                                        // Generic fallback
  ];

  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el && el.innerText.trim().length > 200) {
        return el.innerText.trim();
      }
    } catch (e) {
      // Invalid selector, skip
    }
  }

  // Last resort — full body text
  return document.body.innerText.trim();
}
