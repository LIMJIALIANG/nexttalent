import { Course } from "@/types";

/**
 * Local course database for Module 3: Micro-Learning Recommender.
 * In production, this would be stored in Supabase.
 * Each course has keywords for matching against skill gaps.
 */
export const COURSES_DATABASE: Course[] = [
  {
    id: 1,
    title: "Python for Everybody",
    provider: "Coursera (University of Michigan)",
    url: "https://www.coursera.org/specializations/python",
    keywords: ["python", "programming", "coding", "software development"],
    duration: "8 weeks",
    level: "Beginner",
  },
  {
    id: 2,
    title: "JavaScript: Understanding the Weird Parts",
    provider: "Udemy",
    url: "https://www.udemy.com/course/understand-javascript/",
    keywords: ["javascript", "web development", "frontend", "programming"],
    duration: "12 hours",
    level: "Intermediate",
  },
  {
    id: 3,
    title: "Machine Learning by Andrew Ng",
    provider: "Coursera (Stanford)",
    url: "https://www.coursera.org/learn/machine-learning",
    keywords: [
      "machine learning",
      "ai",
      "artificial intelligence",
      "data science",
      "ml",
    ],
    duration: "11 weeks",
    level: "Intermediate",
  },
  {
    id: 4,
    title: "Data Analysis with Pandas and Python",
    provider: "Udemy",
    url: "https://www.udemy.com/course/data-analysis-with-pandas/",
    keywords: [
      "data analysis",
      "pandas",
      "python",
      "data science",
      "analytics",
    ],
    duration: "19 hours",
    level: "Beginner",
  },
  {
    id: 5,
    title: "SQL for Data Science",
    provider: "Coursera (UC Davis)",
    url: "https://www.coursera.org/learn/sql-for-data-science",
    keywords: ["sql", "database", "data", "data science", "queries"],
    duration: "4 weeks",
    level: "Beginner",
  },
  {
    id: 6,
    title: "React - The Complete Guide",
    provider: "Udemy",
    url: "https://www.udemy.com/course/react-the-complete-guide-incl-redux/",
    keywords: [
      "react",
      "frontend",
      "web development",
      "javascript",
      "ui",
      "user interface",
    ],
    duration: "48 hours",
    level: "Beginner",
  },
  {
    id: 7,
    title: "Google UX Design Professional Certificate",
    provider: "Coursera (Google)",
    url: "https://www.coursera.org/professional-certificates/google-ux-design",
    keywords: [
      "ux",
      "ui",
      "user experience",
      "design",
      "user interface",
      "prototyping",
    ],
    duration: "6 months",
    level: "Beginner",
  },
  {
    id: 8,
    title: "Digital Marketing Specialization",
    provider: "Coursera (University of Illinois)",
    url: "https://www.coursera.org/specializations/digital-marketing",
    keywords: [
      "marketing",
      "digital marketing",
      "seo",
      "social media",
      "branding",
    ],
    duration: "8 months",
    level: "Beginner",
  },
  {
    id: 9,
    title: "Financial Markets",
    provider: "Coursera (Yale)",
    url: "https://www.coursera.org/learn/financial-markets-global",
    keywords: [
      "finance",
      "financial analysis",
      "investment",
      "economics",
      "accounting",
    ],
    duration: "7 weeks",
    level: "Beginner",
  },
  {
    id: 10,
    title: "Introduction to Cloud Computing",
    provider: "Coursera (IBM)",
    url: "https://www.coursera.org/learn/introduction-to-cloud",
    keywords: [
      "cloud",
      "cloud computing",
      "aws",
      "azure",
      "devops",
      "infrastructure",
    ],
    duration: "3 weeks",
    level: "Beginner",
  },
  {
    id: 11,
    title: "Project Management Professional Certificate",
    provider: "Coursera (Google)",
    url: "https://www.coursera.org/professional-certificates/google-project-management",
    keywords: [
      "project management",
      "agile",
      "scrum",
      "leadership",
      "management",
    ],
    duration: "6 months",
    level: "Beginner",
  },
  {
    id: 12,
    title: "Deep Learning Specialization",
    provider: "Coursera (deeplearning.ai)",
    url: "https://www.coursera.org/specializations/deep-learning",
    keywords: [
      "deep learning",
      "neural networks",
      "ai",
      "machine learning",
      "tensorflow",
    ],
    duration: "5 months",
    level: "Advanced",
  },
  {
    id: 13,
    title: "Cybersecurity Fundamentals",
    provider: "edX (RIT)",
    url: "https://www.edx.org/course/cybersecurity-fundamentals",
    keywords: [
      "cybersecurity",
      "security",
      "network security",
      "ethical hacking",
      "information security",
    ],
    duration: "8 weeks",
    level: "Beginner",
  },
  {
    id: 14,
    title: "Public Speaking Specialization",
    provider: "Coursera (University of Washington)",
    url: "https://www.coursera.org/specializations/public-speaking",
    keywords: [
      "communication",
      "public speaking",
      "presentation",
      "soft skills",
      "pitching",
    ],
    duration: "4 months",
    level: "Beginner",
  },
  {
    id: 15,
    title: "Business Strategy Specialization",
    provider: "Coursera (University of Virginia)",
    url: "https://www.coursera.org/specializations/business-strategy",
    keywords: [
      "business strategy",
      "strategy",
      "business development",
      "entrepreneurship",
      "business",
    ],
    duration: "6 months",
    level: "Intermediate",
  },
  {
    id: 16,
    title: "Natural Language Processing Specialization",
    provider: "Coursera (deeplearning.ai)",
    url: "https://www.coursera.org/specializations/natural-language-processing",
    keywords: [
      "nlp",
      "natural language processing",
      "text analysis",
      "ai",
      "machine learning",
    ],
    duration: "4 months",
    level: "Advanced",
  },
  {
    id: 17,
    title: "Blockchain Basics",
    provider: "Coursera (University at Buffalo)",
    url: "https://www.coursera.org/learn/blockchain-basics",
    keywords: [
      "blockchain",
      "cryptocurrency",
      "smart contracts",
      "web3",
      "distributed systems",
    ],
    duration: "4 weeks",
    level: "Beginner",
  },
  {
    id: 18,
    title: "Figma UI/UX Design Essentials",
    provider: "Udemy",
    url: "https://www.udemy.com/course/figma-ux-ui-design-user-experience-tutorial-course/",
    keywords: [
      "figma",
      "ui design",
      "ux design",
      "prototyping",
      "wireframing",
      "design",
    ],
    duration: "14 hours",
    level: "Beginner",
  },
  {
    id: 19,
    title: "DevOps Engineering on AWS",
    provider: "AWS Training",
    url: "https://aws.amazon.com/training/learn-about/devops/",
    keywords: ["devops", "aws", "ci/cd", "deployment", "automation", "cloud"],
    duration: "3 days",
    level: "Intermediate",
  },
  {
    id: 20,
    title: "Statistics with R Specialization",
    provider: "Coursera (Duke University)",
    url: "https://www.coursera.org/specializations/statistics",
    keywords: [
      "statistics",
      "r programming",
      "data science",
      "probability",
      "data analysis",
    ],
    duration: "7 months",
    level: "Beginner",
  },
  {
    id: 21,
    title: "Entrepreneurship Specialization",
    provider: "Coursera (Wharton)",
    url: "https://www.coursera.org/specializations/wharton-entrepreneurship",
    keywords: [
      "entrepreneurship",
      "startup",
      "business plan",
      "venture capital",
      "innovation",
    ],
    duration: "4 months",
    level: "Intermediate",
  },
  {
    id: 22,
    title: "API Design and Fundamentals of Google Cloud",
    provider: "Coursera (Google Cloud)",
    url: "https://www.coursera.org/learn/api-design-apigee-gcp",
    keywords: [
      "api",
      "rest",
      "backend",
      "web services",
      "cloud",
      "software architecture",
    ],
    duration: "3 weeks",
    level: "Intermediate",
  },
  {
    id: 23,
    title: "Data Visualization with Tableau",
    provider: "Coursera (UC Davis)",
    url: "https://www.coursera.org/specializations/data-visualization",
    keywords: [
      "data visualization",
      "tableau",
      "analytics",
      "dashboards",
      "reporting",
    ],
    duration: "5 months",
    level: "Beginner",
  },
  {
    id: 24,
    title: "Prompt Engineering for ChatGPT",
    provider: "Coursera (Vanderbilt)",
    url: "https://www.coursera.org/learn/prompt-engineering",
    keywords: [
      "prompt engineering",
      "chatgpt",
      "ai",
      "generative ai",
      "large language models",
    ],
    duration: "6 hours",
    level: "Beginner",
  },
  {
    id: 25,
    title: "Leadership and Management Skills",
    provider: "LinkedIn Learning",
    url: "https://www.linkedin.com/learning/paths/become-a-manager",
    keywords: [
      "leadership",
      "management",
      "team management",
      "decision making",
      "people skills",
    ],
    duration: "20 hours",
    level: "Intermediate",
  },
];

/**
 * Find matching courses for a list of missing skill keywords.
 * Returns up to 3 courses per skill keyword.
 */
export function findCoursesForSkills(missingSkills: string[]): Record<string, Course[]> {
  const results: Record<string, Course[]> = {};

  for (const skill of missingSkills) {
    const normalizedSkill = skill.toLowerCase().trim();
    const matchingCourses = COURSES_DATABASE.filter((course) =>
      course.keywords.some(
        (keyword) =>
          keyword.includes(normalizedSkill) ||
          normalizedSkill.includes(keyword)
      )
    ).slice(0, 3);

    if (matchingCourses.length > 0) {
      results[skill] = matchingCourses;
    } else {
      // Fallback: find partial matches
      const partialMatches = COURSES_DATABASE.filter((course) =>
        course.keywords.some((keyword) => {
          const skillWords = normalizedSkill.split(" ");
          return skillWords.some(
            (word) => word.length > 3 && keyword.includes(word)
          );
        })
      ).slice(0, 2);

      results[skill] = partialMatches.length > 0 ? partialMatches : [];
    }
  }

  return results;
}
