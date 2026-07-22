// Resume Tailor — DOCX Exporter Module (ATS Optimized)
// Converts structured JSON resume into an ATS-compliant Word document (.docx)
// Dynamic file naming: FirstName_LastName_TargetTitle_Resume.docx

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle
} from 'docx';

export function generateAtsFilename(resume) {
  const candidateName = (resume.contact?.name || 'Candidate').trim();
  const targetTitle = (resume.targetJobTitle || 'Tailored').trim();

  const cleanName = candidateName.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
  const cleanTitle = targetTitle.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');

  return `${cleanName}_${cleanTitle}_Resume.docx`;
}

export async function exportToDocx(resume, customFilename = null) {
  const filename = customFilename || generateAtsFilename(resume);
  const children = [];

  // ── Header (Contact Info — ATS Standard) ──
  if (resume.contact) {
    const { name, email, phone, location } = resume.contact;

    if (name) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: name,
              bold: true,
              size: 32, // 16pt
              font: 'Calibri'
            })
          ]
        })
      );
    }

    const contactDetails = [email, phone, location].filter(Boolean).join('  |  ');
    if (contactDetails) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [
            new TextRun({
              text: contactDetails,
              size: 20, // 10pt
              color: '444444',
              font: 'Calibri'
            })
          ]
        })
      );
    }
  }

  // Helper for Section Titles (ATS Standard Upper Case)
  function addSectionHeader(title) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        border: {
          bottom: { color: 'B0B0B0', space: 1, value: BorderStyle.SINGLE, size: 6 }
        },
        children: [
          new TextRun({
            text: title.toUpperCase(),
            bold: true,
            size: 24, // 12pt
            color: '111111',
            font: 'Calibri'
          })
        ]
      })
    );
  }

  // ── Professional Summary ──
  if (resume.summary && resume.summary.trim()) {
    addSectionHeader('Professional Summary');
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: resume.summary.trim(),
            size: 21, // 10.5pt
            font: 'Calibri'
          })
        ]
      })
    );
  }

  // ── Skills & Competencies (Crucial for ATS Parsers) ──
  if (resume.skills && resume.skills.length > 0) {
    addSectionHeader('Technical Skills & Core Competencies');
    const skillsList = Array.isArray(resume.skills) ? resume.skills.join(', ') : resume.skills;

    children.push(
      new Paragraph({
        spacing: { before: 60, after: 180 },
        children: [
          new TextRun({
            text: skillsList,
            size: 21,
            font: 'Calibri'
          })
        ]
      })
    );
  }

  // ── Professional Experience ──
  if (resume.experiences && resume.experiences.length > 0) {
    addSectionHeader('Professional Experience');

    resume.experiences.forEach((exp) => {
      // Company & Dates Row
      const leftPart = [exp.company, exp.location].filter(Boolean).join(', ');
      children.push(
        new Paragraph({
          spacing: { before: 140, after: 40 },
          children: [
            new TextRun({
              text: leftPart,
              bold: true,
              size: 22, // 11pt
              font: 'Calibri'
            }),
            ...(exp.dates ? [
              new TextRun({
                text: `\t${exp.dates}`,
                bold: true,
                size: 20,
                color: '555555',
                font: 'Calibri'
              })
            ] : [])
          ]
        })
      );

      // Title Row
      if (exp.title) {
        children.push(
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: exp.title,
                italics: true,
                size: 21, // 10.5pt
                color: '222222',
                font: 'Calibri'
              })
            ]
          })
        );
      }

      // Bullets (ATS Action-Verb Centric)
      if (exp.bullets && exp.bullets.length > 0) {
        exp.bullets.forEach((bText) => {
          if (!bText || !bText.trim()) return;
          children.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { after: 60 },
              children: [
                new TextRun({
                  text: bText.replace(/^[•\-\*\s]+/, '').trim(),
                  size: 21, // 10.5pt
                  font: 'Calibri'
                })
              ]
            })
          );
        });
      }
    });
  }

  // ── Education ──
  if (resume.education && resume.education.length > 0) {
    addSectionHeader('Education');

    resume.education.forEach((edu) => {
      const leftPart = [edu.degree, edu.institution].filter(Boolean).join(' — ');
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 60 },
          children: [
            new TextRun({
              text: leftPart,
              bold: true,
              size: 21,
              font: 'Calibri'
            }),
            ...(edu.dates ? [
              new TextRun({
                text: `\t${edu.dates}`,
                size: 20,
                color: '555555',
                font: 'Calibri'
              })
            ] : [])
          ]
        })
      );
    });
  }

  // ── Certifications ──
  if (resume.certifications && resume.certifications.length > 0) {
    addSectionHeader('Certifications');

    resume.certifications.forEach((cert) => {
      const certText = [cert.name, cert.issuer, cert.date].filter(Boolean).join(' — ');
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: certText,
              size: 21,
              font: 'Calibri'
            })
          ]
        })
      );
    });
  }

  // Create Document (Standard ATS single-column layout, 0.5in margins)
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,    // 0.5 in
              bottom: 720,
              left: 720,
              right: 720
            }
          }
        },
        children
      }
    ]
  });

  // Pack into blob and trigger download
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
