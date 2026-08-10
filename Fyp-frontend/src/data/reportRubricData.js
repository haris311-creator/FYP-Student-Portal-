export const reportCriteria = [
  {
    sno: 1,
    criteria: 'Problem Definition and Objectives',
    clo: 'CLO2',
    ga: 'GA3: Problem Analysis',
    weight: 1,
    maxMarks: 5,
    descriptions: {
      1: 'Not written.',
      2: 'The problem statement is somewhat vague, with limited justification. Objectives may lack clarity.',
      3: 'Provides a reasonable problem definition with some justification. Objectives are mostly aligned.',
      4: 'Defines the problem well with adequate justification. Objectives are mostly clear and structured.',
      5: 'Defines the problem with strong justification. Objectives are well-structured and aligned with the problem statement.'
    }
  },
  {
    sno: 2,
    criteria: 'Literature Review',
    clo: 'CLO2',
    ga: 'GA3: Problem Analysis',
    weight: 1,
    maxMarks: 5,
    descriptions: {
      1: 'Minimal or no relevant literature review, lacks coherence.',
      2: 'Some references included but lacks depth in analysis.',
      3: 'Covers relevant literature with minor gaps in analysis.',
      4: 'Good coverage of relevant literature with only minor areas for improvement.',
      5: 'Comprehensive review of relevant literature, demonstrating a clear understanding of existing research and gaps.'
    }
  },
  {
    sno: 3,
    criteria: 'Prototype',
    clo: 'CLO3',
    ga: 'GA4: Design/Development of Solution',
    weight: 1,
    maxMarks: 5,
    descriptions: {
      1: 'Prototype does not align with project requirements or objectives.',
      2: 'Prototype partially meets project requirements but lacks some key components.',
      3: 'Prototype meets most project requirements, with major deviations or improvements needed.',
      4: 'Prototype meets most project requirements, with minor deviations or improvements needed.',
      5: 'Prototype fully meets or exceeds all project requirements and objectives.'
    }
  },
  {
    sno: 4,
    criteria: 'Project Plan',
    clo: 'CLO10',
    ga: 'GA7: Project Management',
    weight: 1,
    maxMarks: 5,
    descriptions: {
      1: 'Weak or missing project plan with vague steps and no clear timeline.',
      2: 'Project plan is present but lacks detailed steps, timeline, and feasibility analysis.',
      3: 'Feasibility and project plan are demonstrated but with minor gaps in structure or execution.',
      4: 'Well-structured project plan with clear steps and minor details missing.',
      5: 'Realistic and well-structured project plan with achievable milestones, detailed tasks, and a well-defined timeline.'
    }
  },
  {
    sno: 5,
    criteria: 'Budget and Business Canvas Model',
    clo: 'CLO6',
    ga: 'GA8: Computing Professionalism and Society',
    weight: 1,
    maxMarks: 5,
    descriptions: {
      1: 'Budget is unclear or missing, and the business canvas model lacks detail or coherence.',
      2: 'Basic budget provided with some justification, and a business canvas model with gaps in explanation.',
      3: 'Budget and business canvas models are present but may lack minor details or clarity in some aspects.',
      4: 'Clear and structured budget with a detailed business canvas model.',
      5: 'Well-defined budget with clear justification, and a comprehensive business canvas model outlining key partners, activities, value propositions, customer relationships, channels, cost structure, and revenue streams.'
    }
  },
  {
    sno: 6,
    criteria: 'Report Structure and Presentation',
    clo: 'CLO8',
    ga: 'GA7: Communication',
    weight: 1,
    maxMarks: 5,
    descriptions: {
      1: 'Poorly organized, difficult to understand, many grammatical errors.',
      2: 'Some organizational issues and moderate grammatical errors.',
      3: 'Well-structured with minor inconsistencies.',
      4: 'Well-structured and formatted with few errors.',
      5: 'Well-organized, clear writing follows the given template, minimal grammatical errors.'
    }
  },
  {
    sno: 7,
    criteria: 'References and Citation',
    clo: 'CLO8',
    ga: 'GA7: Communication',
    weight: 1,
    maxMarks: 5,
    descriptions: {
      1: 'References are inadequate or missing.',
      2: 'Some references missing or improperly formatted.',
      3: 'Mostly correct citation style with minor errors.',
      4: 'Well-referenced with minor citation issues.',
      5: 'Properly formatted references in the required style, all sources cited correctly.'
    }
  }
];

