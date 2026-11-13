export interface Course {
  id: string;
  name: string;
  category: "LAW" | "LANGUAGE" | "OTHER";
  description: string | null;
  iconUrl: string | null;
  _count?: { subjects: number; mcqQuestions: number; liveClasses: number };
}

export interface CourseSubscription {
  id: string;
  courseId: string;
  status: "TRIAL" | "ACTIVE" | "EXPIRED" | "CANCELLED";
  startedAt: string;
  expiresAt: string | null;
  course: Course;
}

export interface Subject {
  id: string;
  name: string;
  courseId: string;
}

export interface McqQuestion {
  id: string;
  question: string;
  answerType?: "MCQ" | "TRUE_FALSE_NOT_GIVEN" | "YES_NO_NOT_GIVEN" | "FILL_BLANK" | "SHORT_ANSWER" | "MULTI_BLANK";
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  // Absent on normal /mcq list/getById responses for STUDENT accounts —
  // only present on /mcq/my-mistakes, which is explicitly a review/answer
  // endpoint and shows the correct answer on purpose.
  correctOption?: string;
  correctAnswerText?: string;
  explanation?: string | null;
  subject?: { name: string };
  courseId: string;
  subjectId: string;
  isFreeDemo: boolean;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  audioUrl?: string | null;
}

export interface MockTest {
  id: string;
  title: string;
  courseId: string;
  subjectId: string | null;
  durationMinutes: number;
  isPublished: boolean;
  isFreeDemo: boolean;
  _count?: { questions: number };
}

export interface TestAttemptStart {
  attemptId: string;
  totalQuestions: number;
  durationMinutes: number;
}

export interface TestSectionResult {
  sectionId: string;
  title: string;
  type: "MCQ" | "READING" | "LISTENING" | "WRITING" | "SPEAKING";
  correct?: number;
  total?: number;
  band?: number | null;
  feedback?: string | null;
  status?: "NOT_SUBMITTED" | "PENDING" | "GRADED" | "NOT_AVAILABLE";
}

export interface TestAttemptResult {
  score: number;
  totalQuestions: number;
  percentage: number;
  marksScored?: number;
  totalMarks?: number;
  negativeMarkingApplied?: boolean;
  submittedAt: string;
  sections?: TestSectionResult[];
  overallBand?: number | null;
}
