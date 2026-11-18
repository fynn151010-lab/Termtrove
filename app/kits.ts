export type Kit = {
  id: string;
  name: string;
  curriculum: string;
  subject: "Mathematics" | "Biology" | "Physics" | "Music";
  description: string;
  items: string[];
  check: string;
  books: Record<string, string>;
};

export const kits: Kit[] = [
  {
    id: "igcse-maths",
    name: "IGCSE Mathematics Kit",
    curriculum: "IGCSE",
    subject: "Mathematics",
    description:
      "For students getting ready for their first geometry lesson or the next exam paper.",
    items: [
      "Course textbook",
      "Scientific calculator",
      "Compass, ruler and protractor",
    ],
    check:
      "Check the syllabus code and permitted calculator model with your teacher.",
    books: { curriculum: "IGCSE", subject: "Mathematics" },
  },
  {
    id: "sixth-form-biology",
    name: "Sixth Form Biology Kit",
    curriculum: "A Level",
    subject: "Biology",
    description:
      "A reading and practical-work checklist for the start of A Level Biology.",
    items: [
      "Exam-board coursebook",
      "Practical skills workbook",
      "Revision questions",
    ],
    check:
      "Match the exam board and edition, and check whether workbook pages have already been completed.",
    books: { curriculum: "A Level", subject: "Biology" },
  },
  {
    id: "sixth-form-physics",
    name: "Sixth Form Physics Kit",
    curriculum: "IB",
    subject: "Physics",
    description:
      "For a student starting an IB Diploma Physics course at standard or higher level.",
    items: [
      "Physics coursebook",
      "Practice problem book",
      "Course-compatible calculator",
    ],
    check:
      "Confirm the course level and assessment year before choosing an edition.",
    books: { curriculum: "IB", subject: "Physics" },
  },
  {
    id: "beginner-music",
    name: "New Music Student Kit",
    curriculum: "General",
    subject: "Music",
    description: "A starting checklist for a learner taking up an instrument.",
    items: [
      "Beginner instrument",
      "Fitted carrying case",
      "Instrument-specific accessories",
      "Beginner method book",
    ],
    check:
      "Ask your teacher about instrument size and arrange a condition check before agreeing to collect.",
    books: { q: "music" },
  },
];

export function findKits(query: string, curriculum: string, subject: string) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return kits.filter((kit) => {
    const text = [
      kit.name,
      kit.subject,
      kit.curriculum,
      kit.description,
      ...kit.items,
    ]
      .join(" ")
      .toLowerCase();
    return (
      (!curriculum || curriculum === kit.curriculum) &&
      (!subject || subject === kit.subject) &&
      words.every((word) => text.includes(word))
    );
  });
}
