import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "https://esm.sh/docx@9.7.1";

const NAVY = "123455";
const BLUE_SOFT = "EAF4FB";
const LINE = "B8C6D1";
const LIGHT = "F7FAFC";

const borders = {
  top: { style: BorderStyle.SINGLE, size: 1, color: LINE },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: LINE },
  left: { style: BorderStyle.SINGLE, size: 1, color: LINE },
  right: { style: BorderStyle.SINGLE, size: 1, color: LINE },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: LINE },
  insideVertical: { style: BorderStyle.SINGLE, size: 1, color: LINE },
};

function text(value, fallback = "-") {
  const cleaned = String(value ?? "").trim();
  return cleaned || fallback;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return text(value);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatPeriod(project) {
  const start = project.start_date ? formatDate(project.start_date) : "";
  const end = project.end_date ? formatDate(project.end_date) : "";
  if (start && end) return `${start} to ${end}`;
  return start || end || "-";
}

function cellParagraph(value, options = {}) {
  const values = Array.isArray(value) ? value : [value];
  return values.map((line) =>
    new Paragraph({
      alignment: options.alignment || AlignmentType.LEFT,
      spacing: { after: 0, line: 240 },
      children: [
        new TextRun({
          text: text(line),
          bold: Boolean(options.bold),
          color: options.color || "1D2939",
          size: options.size || 18,
        }),
      ],
    }),
  );
}

function makeCell(value, options = {}) {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    shading: options.fill ? { fill: options.fill } : undefined,
    margins: { top: 90, bottom: 90, left: 100, right: 100 },
    children: cellParagraph(value, options),
  });
}

function heading(textValue, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: 220, after: 100 },
    children: [new TextRun({ text: textValue, color: NAVY, bold: true })],
  });
}

function titleBlock(subtitle) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: "PROJECT INFORMATION",
          bold: true,
          size: 32,
          color: NAVY,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [
        new TextRun({
          text: "Division of System Research and Engineering",
          bold: true,
          size: 23,
          color: NAVY,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: "ICAR Research Complex for NEH Region, Umiam, Meghalaya",
          size: 21,
          color: "344054",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 220 },
      children: [
        new TextRun({
          text: subtitle,
          italics: true,
          size: 18,
          color: "667085",
        }),
      ],
    }),
  ];
}

function detailsTable(submission) {
  const rows = [
    ["Name of Scientist", text(submission.scientist_name)],
    ["Designation", text(submission.designation)],
    ["Employee ID", text(submission.employee_id)],
    ["Email", text(submission.email)],
    ["Mobile", text(submission.mobile)],
    ["Submitted on", formatDate(submission.submitted_at || new Date())],
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders,
    rows: rows.map(
      ([label, value]) =>
        new TableRow({
          children: [
            makeCell(label, { bold: true, fill: BLUE_SOFT, color: NAVY }),
            makeCell(value),
          ],
        }),
    ),
  });
}

function projectDetailTable(project, index) {
  const coPis = Array.isArray(project.co_pis) && project.co_pis.length
    ? project.co_pis.join("; ")
    : "-";
  const rows = [
    ["Project title", text(project.title)],
    ["Your role", text(project.role)],
    ["Principal Investigator", text(project.pi_name)],
    ["Co-Principal Investigator(s)", coPis],
    ["Funding agency", text(project.funding_agency)],
    ["Project category", text(project.category)],
    ["Project status", text(project.status)],
    ["Project period", formatPeriod(project)],
    ["Remarks", text(project.remarks)],
  ];

  return [
    heading(`Project ${index + 1}`, HeadingLevel.HEADING_2),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders,
      rows: rows.map(
        ([label, value]) =>
          new TableRow({
            children: [
              makeCell(label, { bold: true, fill: LIGHT, color: NAVY }),
              makeCell(value),
            ],
          }),
      ),
    }),
  ];
}

export async function createPersonalWord(submission) {
  const children = [
    ...titleBlock("Individual submission"),
    detailsTable(submission),
    heading("Project Details"),
  ];

  (submission.projects || []).forEach((project, index) => {
    children.push(...projectDetailTable(project, index));
  });

  const doc = new Document({
    creator: "Division of System Research and Engineering, ICAR RC for NEH Region",
    title: `Project information - ${text(submission.scientist_name)}`,
    description: "Project information submitted through the ICAR project information portal.",
    sections: [
      {
        properties: {
          page: {
            margin: { top: 900, right: 900, bottom: 900, left: 900 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

function combinedHeaderRow() {
  const headers = [
    "S. No.",
    "Scientist",
    "Designation",
    "Project title",
    "Role",
    "PI / Co-PI(s)",
    "Funding agency",
    "Category / Status / Period",
  ];
  return new TableRow({
    tableHeader: true,
    children: headers.map((header) =>
      makeCell(header, {
        bold: true,
        fill: NAVY,
        color: "FFFFFF",
        alignment: AlignmentType.CENTER,
        size: 16,
      }),
    ),
  });
}

function flattenSubmissions(submissions) {
  const rows = [];
  let serial = 1;
  submissions.forEach((submission) => {
    (submission.projects || []).forEach((project) => {
      const coPis = Array.isArray(project.co_pis) && project.co_pis.length
        ? project.co_pis.join("; ")
        : "-";
      const people = [
        project.pi_name ? `PI: ${project.pi_name}` : "",
        coPis !== "-" ? `Co-PI(s): ${coPis}` : "",
      ].filter(Boolean).join("\n") || "-";
      const summary = [
        text(project.category),
        text(project.status),
        formatPeriod(project),
      ].join("\n");
      rows.push({
        serial: serial++,
        scientist: text(submission.scientist_name),
        designation: text(submission.designation),
        title: text(project.title),
        role: text(project.role),
        people,
        funding: text(project.funding_agency),
        summary,
      });
    });
  });
  return rows;
}

export async function createCombinedWord(submissions) {
  const flattened = flattenSubmissions(submissions);
  const generated = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const tableRows = [combinedHeaderRow()];
  flattened.forEach((item) => {
    tableRows.push(
      new TableRow({
        children: [
          makeCell(String(item.serial), { alignment: AlignmentType.CENTER, size: 15 }),
          makeCell(item.scientist, { size: 15 }),
          makeCell(item.designation, { size: 15 }),
          makeCell(item.title, { size: 15 }),
          makeCell(item.role, { alignment: AlignmentType.CENTER, size: 15 }),
          makeCell(item.people.split("\n"), { size: 15 }),
          makeCell(item.funding, { size: 15 }),
          makeCell(item.summary.split("\n"), { size: 15 }),
        ],
      }),
    );
  });

  if (!flattened.length) {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 8,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "No project records available.", italics: true })],
              }),
            ],
          }),
        ],
      }),
    );
  }

  const children = [
    ...titleBlock("Consolidated project information"),
    new Paragraph({
      spacing: { after: 140 },
      children: [
        new TextRun({ text: `Generated on: ${generated}`, size: 18, color: "667085" }),
        new TextRun({ text: `    Respondents: ${submissions.length}`, size: 18, color: "667085" }),
        new TextRun({ text: `    Projects: ${flattened.length}`, size: 18, color: "667085" }),
      ],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders,
      rows: tableRows,
    }),
  ];

  const doc = new Document({
    creator: "Division of System Research and Engineering, ICAR RC for NEH Region",
    title: "Consolidated Project Information",
    description: "Consolidated project information submitted by divisional scientists.",
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 650, right: 520, bottom: 650, left: 520 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function safeFilename(value) {
  return text(value, "project-information")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "project-information";
}
