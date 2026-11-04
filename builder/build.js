// Renders resume JSON (see examples/sample_resume.json) into a two-page A4 .docx.
// Usage: node build.js resume.json out.docx
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, AlignmentType, LevelFormat, TabStopType, BorderStyle } = require('docx');

const FONT = 'Calibri';

const P = (runs, opts = {}) => new Paragraph({ children: runs, spacing: { after: 40, ...(opts.spacing || {}) }, ...opts });
const T = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size || 20, bold: o.bold, italics: o.italics, color: o.color });
const H = (text) => new Paragraph({
  children: [T(text.toUpperCase(), { bold: true, size: 21, color: '1F3864' })],
  spacing: { before: 140, after: 60 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1F3864', space: 1 } },
});
const bullet = (text) => new Paragraph({ numbering: { reference: 'b', level: 0 }, children: richText(text), spacing: { after: 30 } });
// **bold** support
function richText(s) {
  return s.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(x => x.startsWith('**') ? T(x.slice(2, -2), { bold: true }) : T(x));
}
const role = (left, right) => new Paragraph({
  children: [T(left, { bold: true }), T('\t' + right, { bold: true })],
  tabStops: [{ type: TabStopType.RIGHT, position: 10466 }], spacing: { before: 100, after: 30 },
});
const sub = (text) => P([T(text, { bold: true, italics: true, color: '404040' })], { spacing: { before: 60, after: 20 } });

function build(d) {
  const kids = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [T(d.name.toUpperCase(), { bold: true, size: 30, color: '1F3864' })], spacing: { after: 20 } }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [T(d.headline, { bold: true, size: 21 })], spacing: { after: 20 } }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [T(d.tagline || '', { italics: true, size: 19, color: '1F3864' })], spacing: { after: 20 } }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [T(d.contact, { size: 19 })], spacing: { after: 60 } }),
    H('Summary'), P(richText(d.summary), { alignment: AlignmentType.JUSTIFIED }),
    H('Experience'),
  ];
  for (const job of d.jobs) {
    kids.push(role(job.title, job.dates));
    for (const blk of job.blocks) {
      if (blk.h) kids.push(sub(blk.h));
      blk.b.forEach(b => kids.push(bullet(b)));
    }
  }
  kids.push(H('Skills'));
  d.skills.forEach(([k, v]) => kids.push(P([T(k + ': ', { bold: true }), T(v)])));
  kids.push(H('Certifications'));
  kids.push(P([T(d.certs)]));
  kids.push(H('Education'));
  (d.education || [])
    .forEach(([a, b]) => kids.push(new Paragraph({ children: [T(a), T('\t' + b)], tabStops: [{ type: TabStopType.RIGHT, position: 10466 }], spacing: { after: 20 } })));

  return new Document({
    styles: { default: { document: { run: { font: FONT, size: 20 } } } },
    numbering: { config: [{ reference: 'b', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 300, hanging: 220 } } } }] }] },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 620, bottom: 620, left: 720, right: 720 } } }, children: kids }],
  });
}

const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
Packer.toBuffer(build(data)).then(buf => { fs.writeFileSync(process.argv[3], buf); console.log('ok', process.argv[3]); });
