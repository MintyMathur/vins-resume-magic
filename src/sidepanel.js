// Resume Tailor — Side Panel Main Entry
// Flow: Upload resume (text only) → Import JD → Tailor with AI → Diff → Export

import { saveResume, loadResume, saveJobDescription, loadJobDescription } from './lib/storage.js';
import { extractResumeText } from './lib/resume-parser.js';
import { tailorResume } from './lib/llm.js';
import { extractJobDescription } from './lib/jd-extractor.js';
import { exportToDocx, generateAtsFilename } from './lib/export-docx.js';

document.addEventListener('DOMContentLoaded', async () => {
  // ── State ──
  let resumeText = null;
  let jobDescText = null;
  let tailoredResult = null;

  // ── Init ──
  const stored = await loadResume();
  if (stored && stored.rawText) {
    resumeText = stored.rawText;
  }
  const storedJd = await loadJobDescription();
  if (storedJd) {
    jobDescText = storedJd;
  }

  // Determine initial view
  if (resumeText) {
    showResumePreview(resumeText);
    showView('view-jd');
  } else {
    showView('view-welcome');
  }

  updateStepStates();
  console.log('[Vin\'s Resume Magic] Side panel loaded — v1.0.0');

  // ═══════════════════════════════════════════════════════
  //  VIEW MANAGEMENT
  // ═══════════════════════════════════════════════════════
  function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById(viewId);
    if (el) el.classList.add('active');
  }

  function updateStepStates() {
    setStep('resume', resumeText ? 'completed' : 'pending');
    setStep('jd', resumeText ? (jobDescText ? 'completed' : 'active') : 'pending');
    setStep('tailor', (resumeText && jobDescText) ? (tailoredResult ? 'completed' : 'active') : 'pending');
    setStep('review', tailoredResult ? 'active' : 'pending');

    const btnTailor = document.getElementById('btn-tailor');
    if (btnTailor) {
      btnTailor.disabled = !resumeText || !jobDescText;
    }
  }

  function setStep(step, status) {
    const el = document.querySelector(`.step[data-step="${step}"]`);
    if (!el) return;
    el.classList.remove('active', 'completed');
    if (status === 'active') el.classList.add('active');
    if (status === 'completed') el.classList.add('completed');
    const badge = el.querySelector('.step-status');
    if (badge) {
      badge.textContent = status === 'completed' ? 'Done' : status === 'active' ? 'Active' : 'Pending';
    }
  }

  // ═══════════════════════════════════════════════════════
  //  TOAST
  // ═══════════════════════════════════════════════════════
  function showToast(message, type = 'info', duration = 3500) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      toast.style.transition = 'all 200ms ease';
      setTimeout(() => toast.remove(), 200);
    }, duration);
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ═══════════════════════════════════════════════════════
  //  STEP 1 — UPLOAD RESUME (text extraction only)
  // ═══════════════════════════════════════════════════════
  const fileInput = document.getElementById('file-input');
  const dropZone = document.getElementById('drop-zone');

  document.getElementById('btn-upload-resume').addEventListener('click', () => fileInput.click());

  if (dropZone) {
    ['dragover', 'dragenter'].forEach(evt => {
      dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    });
    ['dragleave', 'dragend'].forEach(evt => {
      dropZone.addEventListener(evt, () => dropZone.classList.remove('drag-over'));
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    });
  }

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
    fileInput.value = '';
  });

  async function handleFile(file) {
    const ext = file.name.toLowerCase().split('.').pop();
    if (!['pdf', 'docx', 'doc'].includes(ext)) {
      showToast('Please upload a .pdf or .docx file', 'error');
      return;
    }

    showView('view-parsing');
    document.getElementById('parsing-filename').textContent = file.name;
    document.getElementById('parsing-title').textContent = 'Extracting Text';
    updateParsingStep('extract', 'active');
    updateParsingStep('ready', 'pending');

    try {
      await sleep(100);
      const text = await extractResumeText(file);

      updateParsingStep('extract', 'completed');
      updateParsingStep('ready', 'completed');
      await sleep(300);

      resumeText = text;
      await saveResume({ rawText: text });

      showResumePreview(text);
      showView('view-jd');
      updateStepStates();
      showToast('Resume text extracted!', 'success');
    } catch (err) {
      console.error('[Resume Tailor] Extract error:', err);
      showToast(err.message || 'Failed to extract text', 'error');
      showView('view-welcome');
    }
  }

  function showResumePreview(text) {
    const preview = document.getElementById('resume-preview-text');
    if (preview) {
      const truncated = text.length > 500 ? text.substring(0, 500) + '...' : text;
      preview.textContent = truncated;
    }
    const charCount = document.getElementById('resume-char-count');
    if (charCount) charCount.textContent = `${text.length.toLocaleString()} characters extracted`;
  }

  function updateParsingStep(step, status) {
    const el = document.querySelector(`.parsing-step[data-step="${step}"]`);
    if (!el) return;
    el.classList.remove('active', 'completed');
    if (status === 'active') el.classList.add('active');
    if (status === 'completed') el.classList.add('completed');
    const dot = el.querySelector('.parsing-dot');
    if (dot && status === 'active') dot.innerHTML = '<div class="spinner-sm"></div>';
    else if (dot && status === 'completed') dot.innerHTML = '✓';
  }

  // Re-upload
  const btnReupload = document.getElementById('btn-reupload');
  if (btnReupload) {
    btnReupload.addEventListener('click', () => fileInput.click());
  }

  // ═══════════════════════════════════════════════════════
  //  STEP 2 — IMPORT JOB DESCRIPTION
  // ═══════════════════════════════════════════════════════
  const jdTextarea = document.getElementById('jd-textarea');
  const btnImportJd = document.getElementById('btn-import-jd');
  const btnClearJd = document.getElementById('btn-clear-jd');
  const btnTailor = document.getElementById('btn-tailor');

  // Import from active tab
  btnImportJd.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        showToast('No active tab found', 'error');
        return;
      }
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
        showToast('Cannot extract from this page', 'warning');
        return;
      }

      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractJobDescription
      });

      if (result && result.length > 50) {
        jdTextarea.value = result;
        jobDescText = result;
        await saveJobDescription(result);
        updateStepStates();
        showToast('Job description imported!', 'success');
      } else {
        showToast('Could not find job description on this page', 'warning');
      }
    } catch (err) {
      console.error('[Resume Tailor] JD import error:', err);
      showToast('Failed to import — try pasting manually', 'error');
    }
  });

  // Clear JD
  btnClearJd.addEventListener('click', async () => {
    jdTextarea.value = '';
    jobDescText = null;
    await saveJobDescription('');
    updateStepStates();
  });

  // Save JD on typing
  jdTextarea.addEventListener('input', async () => {
    jobDescText = jdTextarea.value.trim() || null;
    if (jobDescText) await saveJobDescription(jobDescText);
    updateStepStates();
    // Enable/disable tailor button
    btnTailor.disabled = !resumeText || !jobDescText;
  });

  // Populate JD textarea if we have stored JD
  if (jobDescText && jdTextarea) {
    jdTextarea.value = jobDescText;
  }
  // Set initial tailor button state
  if (btnTailor) btnTailor.disabled = !resumeText || !jobDescText;

  // ═══════════════════════════════════════════════════════
  //  STEP 3 — TAILOR (AI call)
  // ═══════════════════════════════════════════════════════
  btnTailor.addEventListener('click', async () => {
    if (!resumeText || !jobDescText) {
      showToast('Need both resume and job description', 'error');
      return;
    }

    showView('view-parsing');
    document.getElementById('parsing-title').textContent = 'Tailoring with Mistral AI Magic';
    document.getElementById('parsing-filename').textContent = 'Analyzing job description & matching bullets...';
    updateParsingStep('extract', 'completed');
    updateParsingStep('ready', 'active');

    const timerEl = document.getElementById('parsing-timer');
    if (timerEl) timerEl.style.display = 'inline-flex';

    const startTime = Date.now();
    const timerInterval = setInterval(() => {
      const elapsedMs = Date.now() - startTime;
      const secs = (elapsedMs / 1000).toFixed(1);
      if (timerEl) timerEl.textContent = `⏱️ ${secs}s`;
    }, 100);

    const statusMsgs = [
      'Analyzing job description & matching bullets...',
      'Structuring work experience...',
      'Aligning keywords and achievements...',
      'Generating tailored bullet points...'
    ];
    let msgIdx = 0;
    const msgInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % statusMsgs.length;
      document.getElementById('parsing-filename').textContent = statusMsgs[msgIdx];
    }, 2000);

    try {
      tailoredResult = await tailorResume(resumeText, jobDescText);
      clearInterval(msgInterval);
      clearInterval(timerInterval);

      const finalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      if (timerEl) timerEl.textContent = `⏱️ Done in ${finalTime}s`;

      updateParsingStep('ready', 'completed');
      await sleep(300);

      renderDiffView(tailoredResult);
      showView('view-diff');
      updateStepStates();
      showToast(`Resume tailored with Mistral AI in ${finalTime}s!`, 'success');
    } catch (err) {
      clearInterval(msgInterval);
      clearInterval(timerInterval);
      console.error('[Vin\'s Resume Magic] Tailor error:', err);
      showToast(err.message || 'Tailoring failed', 'error');
      showView('view-jd');
    }
  });

  // ═══════════════════════════════════════════════════════
  //  STEP 4 — DIFF VIEW (accept/reject per bullet)
  // ═══════════════════════════════════════════════════════
  function renderDiffView(result) {
    const container = document.getElementById('diff-content');
    container.innerHTML = '';

    // ── Info Banner ──
    const infoDiv = document.createElement('div');
    infoDiv.className = 'diff-info card';
    infoDiv.innerHTML = `
      <div class="diff-info-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2"/><path d="M12 16V12M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <span><strong>Summary, Core Competencies & Experience Bullets</strong> are tailored to 90%+ match the Job Description. Companies, dates & education are factually locked.</span>
      </div>
    `;
    container.appendChild(infoDiv);

    // ── Tailored Professional Summary Card ──
    if (result.summary && result.summary.trim()) {
      const summaryCard = document.createElement('div');
      summaryCard.className = 'card diff-section-card';
      summaryCard.innerHTML = `
        <div class="card-header">
          <div>
            <h3 class="card-title">Tailored Professional Summary</h3>
            <p class="card-subtitle">AI-crafted summary for ${esc(result.targetJobTitle || 'Target Role')}</p>
          </div>
          <span class="badge badge-accent">Tailored</span>
        </div>
        <textarea class="form-textarea" id="diff-summary-input" rows="3">${esc(result.summary.trim())}</textarea>
      `;
      container.appendChild(summaryCard);
    }

    // ── Tailored Technical Skills Card ──
    if (result.skills && result.skills.length > 0) {
      const skillsText = Array.isArray(result.skills) ? result.skills.join(', ') : result.skills;
      const skillsCard = document.createElement('div');
      skillsCard.className = 'card diff-section-card';
      skillsCard.innerHTML = `
        <div class="card-header">
          <div>
            <h3 class="card-title">Technical Skills & Core Competencies</h3>
            <p class="card-subtitle">Extracted & aligned to JD requirements</p>
          </div>
          <span class="badge badge-accent">ATS Aligned</span>
        </div>
        <textarea class="form-textarea" id="diff-skills-input" rows="2">${esc(skillsText)}</textarea>
      `;
      container.appendChild(skillsCard);
    }

    // ── Work Experience Diff Cards ──
    if (!result.experiences || result.experiences.length === 0) {
      const emptyExp = document.createElement('p');
      emptyExp.className = 'text-secondary';
      emptyExp.textContent = 'No work experience section found.';
      container.appendChild(emptyExp);
      return;
    }

    result.experiences.forEach((exp) => {
      const card = document.createElement('div');
      card.className = 'diff-card card';
      card.dataset.expId = exp.id;

      // Header — locked info
      const header = document.createElement('div');
      header.className = 'diff-card-header';
      header.innerHTML = `
        <div>
          <div class="diff-company">${esc(exp.company || '')}</div>
          <div class="diff-meta">${esc(exp.title || '')} ${exp.dates ? '• ' + esc(exp.dates) : ''}</div>
        </div>
        <div class="diff-actions-header">
          <button class="btn btn-ghost btn-sm btn-accept-all" title="Accept all">✓ All</button>
          <button class="btn btn-ghost btn-sm btn-reject-all" title="Reject all">✗ All</button>
        </div>
      `;
      card.appendChild(header);

      // Bullets diff
      const bulletsDiv = document.createElement('div');
      bulletsDiv.className = 'diff-bullets';

      const originals = exp.originalBullets || [];
      const tailored = exp.tailoredBullets || [];
      const count = Math.max(originals.length, tailored.length);

      for (let i = 0; i < count; i++) {
        const orig = originals[i] || '';
        const newB = tailored[i] || '';
        const changed = orig !== newB;

        const row = document.createElement('div');
        row.className = `diff-row ${changed ? 'changed' : 'unchanged'}`;
        row.dataset.index = i;
        row.dataset.accepted = changed ? 'true' : 'true'; // default: accept changes

        row.innerHTML = `
          ${changed ? `
            <div class="diff-original">
              <span class="diff-label">Original</span>
              <p>• ${esc(orig)}</p>
            </div>
            <div class="diff-new">
              <span class="diff-label">Tailored</span>
              <p>• ${esc(newB)}</p>
            </div>
            <button class="btn-toggle-diff" title="Toggle accept/reject">
              <span class="toggle-icon accept">✓</span>
            </button>
          ` : `
            <div class="diff-unchanged-row">
              <p>• ${esc(orig)}</p>
              <span class="badge badge-subtle">Unchanged</span>
            </div>
          `}
        `;

        if (changed) {
          const toggleBtn = row.querySelector('.btn-toggle-diff');
          toggleBtn.addEventListener('click', () => {
            const accepted = row.dataset.accepted === 'true';
            row.dataset.accepted = accepted ? 'false' : 'true';
            row.classList.toggle('rejected', accepted);
            const icon = toggleBtn.querySelector('.toggle-icon');
            icon.textContent = accepted ? '✗' : '✓';
            icon.className = `toggle-icon ${accepted ? 'reject' : 'accept'}`;
          });
        }

        bulletsDiv.appendChild(row);
      }

      card.appendChild(bulletsDiv);

      // Accept/Reject all handlers
      card.querySelector('.btn-accept-all').addEventListener('click', () => {
        card.querySelectorAll('.diff-row.changed').forEach(row => {
          row.dataset.accepted = 'true';
          row.classList.remove('rejected');
          const icon = row.querySelector('.toggle-icon');
          if (icon) { icon.textContent = '✓'; icon.className = 'toggle-icon accept'; }
        });
      });

      card.querySelector('.btn-reject-all').addEventListener('click', () => {
        card.querySelectorAll('.diff-row.changed').forEach(row => {
          row.dataset.accepted = 'false';
          row.classList.add('rejected');
          const icon = row.querySelector('.toggle-icon');
          if (icon) { icon.textContent = '✗'; icon.className = 'toggle-icon reject'; }
        });
      });

      container.appendChild(card);
    });
  }

  // Finalize & Export
  document.getElementById('btn-finalize').addEventListener('click', async () => {
    if (!tailoredResult) return;

    const btn = document.getElementById('btn-finalize');
    btn.disabled = true;
    btn.textContent = 'Exporting...';

    try {
      const editedSummary = document.getElementById('diff-summary-input')?.value.trim() || tailoredResult.summary;
      const editedSkillsRaw = document.getElementById('diff-skills-input')?.value.trim() || '';
      const editedSkills = editedSkillsRaw ? editedSkillsRaw.split(',').map(s => s.trim()).filter(Boolean) : tailoredResult.skills;

      // Build final resume from diff decisions
      const finalResume = {
        targetJobTitle: tailoredResult.targetJobTitle || 'Tailored Role',
        contact: tailoredResult.contact,
        summary: editedSummary,
        experiences: [],
        education: tailoredResult.education,
        certifications: tailoredResult.certifications,
        skills: editedSkills
      };

      document.querySelectorAll('.diff-card').forEach(card => {
        const expId = card.dataset.expId;
        const exp = tailoredResult.experiences.find(e => e.id === expId);
        if (!exp) return;

        const finalBullets = [];
        card.querySelectorAll('.diff-row').forEach(row => {
          const i = parseInt(row.dataset.index);
          const changed = row.classList.contains('changed');
          const accepted = row.dataset.accepted === 'true';

          if (changed && accepted) {
            finalBullets.push(exp.tailoredBullets[i] || exp.originalBullets[i] || '');
          } else {
            finalBullets.push(exp.originalBullets[i] || '');
          }
        });

        finalResume.experiences.push({
          id: exp.id,
          company: exp.company,
          title: exp.title,
          dates: exp.dates,
          location: exp.location,
          bullets: finalBullets
        });
      });

      // Store the finalized resume
      await chrome.storage.local.set({ finalResume });

      // Trigger DOCX Download with dynamic ATS filename
      const filename = generateAtsFilename(finalResume);
      await exportToDocx(finalResume, filename);
      showToast(`Exported: ${filename}`, 'success');
    } catch (err) {
      console.error('[Resume Tailor] Export error:', err);
      showToast('Export failed: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Export .docx';
    }
  });

  // Back to JD from diff
  document.getElementById('btn-back-to-jd').addEventListener('click', () => {
    showView('view-jd');
  });

  // ═══════════════════════════════════════════════════════
  //  SETTINGS (gear icon)
  // ═══════════════════════════════════════════════════════
  document.getElementById('btn-settings').addEventListener('click', () => showView('view-settings'));
  document.getElementById('btn-back-settings').addEventListener('click', () => {
    showView(resumeText ? 'view-jd' : 'view-welcome');
  });

  // ═══════════════════════════════════════════════════════
  //  UTILITIES
  // ═══════════════════════════════════════════════════════
  function esc(str) {
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }
});
