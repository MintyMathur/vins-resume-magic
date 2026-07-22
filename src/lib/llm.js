// Vin's Resume Magic — LLM Module (Mistral AI API)
// Native JSON mode, ultra-fast & high quality ATS resume tailoring

const API_BASE_URL = 'https://api.mistral.ai/v1';
const API_KEY = '05mCmbSTJW0IgtGVdshYx3HpJgzVz8TT';
const MODEL = 'mistral-small-latest';

const TAILOR_PROMPT = `You are an elite executive resume writer and ATS optimization expert.
Given a candidate's resume text and a target Job Description (JD), your goal is to deeply re-architect and tailor the resume to achieve a 90%+ match with the job responsibilities, required technical skills, and key phrases in the JD, while strictly maintaining factual accuracy and timeline realism.

CRITICAL RULES:
1. HIGH ATS MATCH (90%+):
   - Rewrite summary, experience bullets, and skills to incorporate the core keywords, action verbs, and key responsibilities explicitly requested in the Job Description.
   - Reframing: Rephrase candidate's accomplishments to highlight the exact impact, methods, and responsibilities emphasized in the JD.

2. HISTORICAL ACCURACY & TIMELINE GUARDRAIL:
   - DO NOT add modern AI technologies (e.g., Generative AI, LLMs, RAG, ChatGPT, Claude) to work experience older than 2 years (prior to 2023).
   - Ensure tools, libraries, and frameworks listed for each job role match what was historically prevalent during that role's date range.

3. STRUCTURE & UNTOUCHED METADATA:
   - Preserve company names, job titles, dates, education institutions, and certification names accurately.
   - Extract the target job title from the JD for ATS file naming.

Return ONLY valid JSON matching this exact structure:
{
  "targetJobTitle": "Target role title from JD (e.g., Senior Fullstack Engineer)",
  "contact": { "name": "", "email": "", "phone": "", "location": "" },
  "summary": "Tailored 3-4 sentence professional summary hitting key JD requirements",
  "experiences": [
    {
      "company": "",
      "title": "",
      "dates": "",
      "location": "",
      "originalBullets": ["original bullet 1", "original bullet 2"],
      "tailoredBullets": ["deeply rewritten bullet 1 with JD keywords", "deeply rewritten bullet 2 with JD keywords"]
    }
  ],
  "education": [
    { "institution": "", "degree": "", "dates": "" }
  ],
  "certifications": [
    { "name": "", "issuer": "", "date": "" }
  ],
  "skills": ["Skill 1 (matching JD)", "Skill 2 (matching JD)"]
}`;

export async function tailorResume(resumeText, jobDescription) {
  const response = await fetch(`${API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: TAILOR_PROMPT },
        {
          role: 'user',
          content: `CANDIDATE RESUME:\n${resumeText}\n\n====================\n\nTARGET JOB DESCRIPTION:\n${jobDescription}\n\nPerform deep ATS tailoring (90%+ match). Return JSON only.`
        }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('Invalid Mistral API key.');
    if (response.status === 429) throw new Error('Rate limited by Mistral API. Please wait and try again.');
    throw new Error(err.message || err.error?.message || `Mistral API error (${response.status})`);
  }

  const data = await response.json();
  let text = data.choices?.[0]?.message?.content || '';

  // Extract JSON block using regex for extra safety
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    text = jsonMatch[0];
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    console.error('[Vin\'s Resume Magic] Mistral response parse failed:', text);
    throw new Error('Failed to parse AI response as JSON. Please try again.');
  }

  // Assign IDs to experiences
  parsed.experiences = (parsed.experiences || []).map((exp, i) => ({
    ...exp,
    id: `exp-${Date.now()}-${i}`
  }));

  return parsed;
}
