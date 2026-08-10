export const sessionalCriteria = [
  {
    sno: 1,
    criteria: 'Project Introduction & Literature Review',
    clo: 'CLO2',
    ga: 'GA3: Problem Analysis',
    weight: 2,
    maxMarks: 10,
    descriptions: {
      1: 'Unclear, lacks objectives and background. No citations, weak sources.',
      2: 'Weak objectives, vague background, minimal references.',
      3: 'Basic objectives, some relevant sources, need better structure.',
      4: 'Clear objectives, well-organized background, mostly relevant literature.',
      5: 'Well-structured, strong objectives, comprehensive and properly cited literature.'
    }
  },
  {
    sno: 2,
    criteria: 'Use Cases, ERD, and Prototyping',
    clo: 'CLO3',
    ga: 'GA4: Design/Development of Solution',
    weight: 4,
    maxMarks: 20,
    descriptions: {
      1: 'No diagrams or incorrect structure.',
      2: 'Minimal use cases, weak ERD, and prototype lacks usability.',
      3: 'Basic use cases, partially correct ERD, prototype missing details.',
      4: 'Clear use cases, mostly correct ERD, functional prototype with minor issues.',
      5: 'Comprehensive use cases, well-structured ERD, detailed and user-friendly prototype.'
    }
  },
  {
    sno: 3,
    criteria: 'Proposed Budgeting',
    clo: 'CLO6',
    ga: 'GA8: Computing Professionalism and Society',
    weight: 2,
    maxMarks: 10,
    descriptions: {
      1: 'No justification, unrealistic estimates.',
      2: 'Weak justification, inconsistent costs.',
      3: 'Some realistic estimates but lacks refinement.',
      4: 'Well-researched costs, mostly well-structured.',
      5: 'Highly accurate, well-documented budgeting with clear justifications.'
    }
  },
  {
    sno: 4,
    criteria: 'Business Canvas Model',
    clo: 'CLO6',
    ga: 'GA8: Computing Professionalism and Society',
    weight: 2,
    maxMarks: 10,
    descriptions: {
      1: 'Missing most components, lacks structure.',
      2: 'Few components covered, minimal feasibility.',
      3: 'Some feasibility, lacks strong uniqueness.',
      4: 'Well-structured, feasible with minor innovation.',
      5: 'Comprehensive, innovative, and highly feasible model.'
    }
  }
];
