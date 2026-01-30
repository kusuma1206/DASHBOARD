import { useEffect, useMemo, useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { readStoredSession, clearStoredSession, resetSessionHeartbeat } from '@/utils/session';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Mail, Sparkles, Loader2, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEmailSelection } from '@/hooks/useEmailSelection';
import { Checkbox } from '@/components/ui/checkbox';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';


type TutorCourse = {
  courseId: string;
  slug: string;
  title: string;
  description?: string;
  role?: string;
};

type EnrollmentRow = {
  enrollmentId: string;
  enrolledAt: string;
  status: string;
  userId: string;
  fullName: string;
  email: string;
};




type ProgressRow = {
  userId: string;
  fullName: string;
  email: string;
  enrolledAt: string;
  completedModules: number;
  totalModules: number;
  percent: number;
};

type TutorAssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

type Cohort = {
  cohortId: string;
  name: string;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
};


type ActivityLearner = {
  eventId?: string;
  userId: string;
  courseId: string;
  fullName?: string | null;
  email?: string | null;
  moduleNo: number | null;
  topicId: string | null;
  topicTitle?: string | null;
  eventType: string;
  derivedStatus: string | null;
  statusReason: string | null;
  createdAt: string;
};

type ActivitySummary = {
  engaged: number;
  attention_drift: number;
  content_friction: number;
  unknown: number;
};

type CourseTopic = {
  topicId: string;
  topicName: string;
  moduleNo: number;
  moduleName?: string;
};

const NumberTicker = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const [displayValue, setDisplayValue] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (value > 0 && !hasAnimated.current) {
      animate(count, value, {
        duration: 1.2,
        ease: "easeOut",
      });
      hasAnimated.current = true;
    } else if (hasAnimated.current) {
      count.set(value);
    }
  }, [value]);

  useEffect(() => {
    return rounded.onChange((v) => setDisplayValue(v));
  }, [rounded]);

  return <span>{displayValue}{suffix}</span>;
};

export default function TutorDashboardPage() {
  const session = readStoredSession();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedLearnerId, setSelectedLearnerId] = useState<string | null>(null);
  const [assistantMessages, setAssistantMessages] = useState<TutorAssistantMessage[]>([]);
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailFormData, setEmailFormData] = useState({ to: '' as string | string[], fullName: '', subject: '', message: '' });
  const [emailSending, setEmailSending] = useState(false);
  const [isImprovingEmail, setIsImprovingEmail] = useState(false);
  const alertSelection = useEmailSelection();
  const enrollmentSelection = useEmailSelection();
  const [isAssistantSheetOpen, setIsAssistantSheetOpen] = useState(false);
  const assistantChatRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  const QUICK_PROMPTS = [
    "Which learners are inactive this week?",
    "Summarize course completion by module",
    "Show engagement trends for my classes"
  ];

  // Manual scroll control for assistant chat
  const scrollAssistantToBottom = () => {
    if (assistantChatRef.current) {
      assistantChatRef.current.scrollTo({
        top: assistantChatRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const scrollAssistantToLastMessage = () => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    if (!session) {
      return;
    }
    resetSessionHeartbeat();
  }, [session]);

  const headers = useMemo(() => {
    if (!session?.accessToken) return undefined;
    const h = new Headers();
    h.set('Authorization', `Bearer ${session.accessToken}`);
    return h;
  }, [session?.accessToken]);

  const {
    data: coursesResponse,
    isLoading: coursesLoading
  } = useQuery<{ courses: TutorCourse[] }>({
    queryKey: ['tutor-courses'],
    enabled: session?.role === 'tutor' || session?.role === 'admin',
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/tutors/me/courses', undefined, headers ? { headers } : undefined);
      return response.json();
    }
  });

  const courses = coursesResponse?.courses ?? [];

  useEffect(() => {
    if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].courseId);
    }
  }, [courses, selectedCourseId]);

  useEffect(() => {
    setAssistantMessages([]);
    setSelectedLearnerId(null);
    setSelectedCohortId(null);
  }, [selectedCourseId]);

  const {
    data: cohortsResponse,
    isLoading: cohortsLoading
  } = useQuery<{ cohorts: Cohort[] }>({
    queryKey: ['tutor-cohorts', selectedCourseId],
    enabled: Boolean(selectedCourseId) && Boolean(headers),
    queryFn: async () => {
      const response = await apiRequest(
        'GET',
        `/api/tutors/${selectedCourseId}/cohorts`,
        undefined,
        headers ? { headers } : undefined
      );
      return response.json();
    }
  });

  const cohorts = useMemo(() => {
    return [...(cohortsResponse?.cohorts ?? [])].sort((a, b) => {
      // Sort by startsAt desc, then by name desc as a fallback
      const dateA = a.startsAt ? new Date(a.startsAt).getTime() : 0;
      const dateB = b.startsAt ? new Date(b.startsAt).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      return b.name.localeCompare(a.name);
    });
  }, [cohortsResponse?.cohorts]);

  useEffect(() => {
    if (cohorts.length > 0 && !selectedCohortId) {
      setSelectedCohortId(cohorts[0].cohortId);
    }
  }, [cohorts, selectedCohortId]);



  const {
    data: enrollmentsResponse,
    isLoading: enrollmentsLoading
  } = useQuery<{ enrollments: EnrollmentRow[] }>({
    queryKey: ['tutor-enrollments', selectedCourseId, selectedCohortId],
    enabled: Boolean(selectedCourseId) && Boolean(headers),
    queryFn: async () => {
      const url = `/api/tutors/${selectedCourseId}/enrollments${selectedCohortId ? `?cohortId=${selectedCohortId}` : ''}`;
      const response = await apiRequest(
        'GET',
        url,
        undefined,
        headers ? { headers } : undefined
      );
      return response.json();
    }
  });

  const { data: progressResponse, isLoading: progressLoading } = useQuery<{ learners: ProgressRow[]; totalModules: number }>({
    queryKey: ['tutor-progress', selectedCourseId, selectedCohortId],
    enabled: Boolean(selectedCourseId) && Boolean(headers),
    queryFn: async () => {
      const url = `/api/tutors/${selectedCourseId}/progress${selectedCohortId ? `?cohortId=${selectedCohortId}` : ''}`;
      const response = await apiRequest(
        'GET',
        url,
        undefined,
        headers ? { headers } : undefined
      );
      return response.json();
    }
  });


  const {
    data: topicsResponse,
    isLoading: topicsLoading
  } = useQuery<{ topics: CourseTopic[] }>({
    queryKey: ['tutor-topics', selectedCourseId],
    enabled: Boolean(selectedCourseId),
    queryFn: async () => {
      const response = await apiRequest(
        'GET',
        `/api/lessons/courses/${selectedCourseId}/topics`,
        undefined,
        headers ? { headers } : undefined
      );
      return response.json();
    }
  });

  const {
    data: activityResponse,
    isLoading: activityLoading,
    isFetching: activityFetching,
    error: activityError
  } = useQuery<{ learners: ActivityLearner[]; summary: ActivitySummary }>({
    queryKey: ['activity-summary', selectedCourseId, selectedCohortId],
    enabled: Boolean(selectedCourseId) && Boolean(headers),
    refetchInterval: 30_000,
    queryFn: async () => {
      const url = `/api/activity/courses/${selectedCourseId}/learners${selectedCohortId ? `?cohortId=${selectedCohortId}` : ''}`;
      const response = await apiRequest(
        'GET',
        url,
        undefined,
        headers ? { headers } : undefined
      );
      return response.json();
    }
  });

  const {
    data: historyResponse,
    isLoading: historyLoading,
    isFetching: historyFetching
  } = useQuery<{ events: ActivityLearner[] }>({
    queryKey: ['activity-history', selectedLearnerId, selectedCourseId],
    enabled: Boolean(selectedLearnerId) && Boolean(selectedCourseId) && Boolean(headers),
    queryFn: async () => {
      const response = await apiRequest(
        'GET',
        `/api/activity/learners/${selectedLearnerId}/history?courseId=${selectedCourseId}&limit=40`,
        undefined,
        headers ? { headers } : undefined
      );
      return response.json();
    }
  });



  const learnerDirectory = useMemo(() => {
    const map = new Map<string, { fullName?: string; email?: string }>();
    (enrollmentsResponse?.enrollments ?? []).forEach((row) => {
      map.set(row.userId, { fullName: row.fullName, email: row.email });
    });
    (progressResponse?.learners ?? []).forEach((row) => {
      if (!map.has(row.userId)) {
        map.set(row.userId, { fullName: row.fullName, email: row.email });
      }
    });
    return map;
  }, [enrollmentsResponse?.enrollments, progressResponse?.learners]);

  const topicTitleLookup = useMemo(() => {
    const map = new Map<string, { title: string; moduleNo: number; moduleName?: string }>();
    (topicsResponse?.topics ?? []).forEach((topic) => {
      map.set(topic.topicId, { title: topic.topicName, moduleNo: topic.moduleNo, moduleName: topic.moduleName });
    });
    return map;
  }, [topicsResponse?.topics]);

  const activitySummary = activityResponse?.summary ?? { engaged: 0, attention_drift: 0, content_friction: 0, unknown: 0 };
  const statusMeta: Record<
    NonNullable<ActivityLearner['derivedStatus']> | 'unknown',
    { label: string; badgeClass: string; description: string; dotClass: string }
  > = {
    engaged: {
      label: 'Engaged',
      badgeClass: 'bg-[#F0FFF4] text-[#38A169]',
      dotClass: 'bg-[#38A169]',
      description: 'Actively interacting with course content.'
    },
    attention_drift: {
      label: 'Attention drift',
      badgeClass: 'bg-[#FFF7ED] text-[#D97706]',
      dotClass: 'bg-[#D97706]',
      description: 'Idle or pause cues observed.'
    },
    content_friction: {
      label: 'Content friction',
      badgeClass: 'bg-[#FFF5F5] text-[#E53E3E]',
      dotClass: 'bg-[#E53E3E]',
      description: 'Learner signaling friction.'
    },
    unknown: {
      label: 'Unknown',
      badgeClass: 'bg-[#F1F5F9] text-[#475569]',
      dotClass: 'bg-[#94A3B8]',
      description: 'Awaiting telemetry events.'
    }
  };

  const selectedLearner = activityResponse?.learners.find((learner) => learner.userId === selectedLearnerId) ?? null;
  const selectedIdentity = selectedLearnerId ? learnerDirectory.get(selectedLearnerId) : null;
  const historyEvents = historyResponse?.events ?? [];
  const sortedHistoryEvents = useMemo(() => {
    return [...historyEvents].sort((a, b) => {
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (diff !== 0) {
        return diff;
      }
      if (a.eventId && b.eventId && a.eventId !== b.eventId) {
        return a.eventId < b.eventId ? 1 : -1;
      }
      return 0;
    });
  }, [historyEvents]);
  const statusOrder: Array<keyof typeof statusMeta> = ['engaged', 'attention_drift', 'content_friction', 'unknown'];

  const formatTimestamp = (timestamp: string) =>
    new Date(timestamp).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', year: 'numeric', month: 'short', day: 'numeric' });

  const EVENT_LABELS: Record<string, string> = {
    'idle.start': 'Idle detected',
    'idle.end': 'Attention resumed',
    'video.play': 'Video started',
    'video.pause': 'Video paused',
    'video.buffer.start': 'Video buffering',
    'video.buffer.end': 'Video resumed',
    'lesson.view': 'Lesson viewed',
    'lesson.locked_click': 'Locked lesson clicked',
    'quiz.fail': 'Quiz attempt failed',
    'quiz.pass': 'Quiz passed',
    'quiz.retry': 'Quiz retried',
    'quiz.progress': 'Quiz progress updated',
    'progress.snapshot': 'Progress snapshot',
    'persona.change': 'Persona updated',
    'notes.saved': 'Notes saved',
    'cold_call.loaded': 'Cold-call prompt opened',
    'cold_call.submit': 'Cold-call response submitted',
    'cold_call.star': 'Cold-call star awarded',
    'cold_call.response_received': 'Tutor responded to cold-call',
    'tutor.prompt': 'Tutor prompt sent',
    'tutor.response_received': 'Tutor response received',
  };

  const STATUS_REASON_LABELS: Record<string, string> = {
    no_interaction: 'No interaction detected',
    tab_hidden: 'Browser tab hidden',
    tab_visible: 'Browser tab visible',
    video_play: 'Video playing',
    video_pause: 'Video paused',
  };

  function friendlyLabel(source: string, dictionary: Record<string, string>): string {
    const normalized = source.toLowerCase();
    if (dictionary[normalized]) {
      return dictionary[normalized];
    }
    if (/\s/.test(source) || /[()]/.test(source)) {
      return source;
    }
    return source
      .replace(/[._]/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function formatEventLabel(eventType: string): string {
    return friendlyLabel(eventType, EVENT_LABELS);
  }

  function formatStatusReason(reason?: string | null): string | null {
    if (!reason) return null;
    return friendlyLabel(reason, STATUS_REASON_LABELS);
  }

  const handleLogout = () => {
    clearStoredSession();
    toast({ title: 'Signed out' });
    setLocation('/become-a-tutor');
  };

  const performAssistantQuery = async (question: string) => {
    if (!selectedCourseId || !question.trim()) {
      return;
    }

    if (!headers) {
      toast({ variant: 'destructive', title: 'Session missing', description: 'Please sign in again.' });
      return;
    }

    const trimmedQuestion = question.trim();
    const userMessage: TutorAssistantMessage = {
      id: `${Date.now()}-${Math.random()}`,
      role: 'user',
      content: trimmedQuestion,
      timestamp: new Date().toISOString()
    };

    setAssistantMessages((prev) => [...prev, userMessage]);
    setAssistantInput('');
    setAssistantLoading(true);

    // Scroll to bottom when user sends a question
    setTimeout(scrollAssistantToBottom, 100);

    try {
      const history = assistantMessages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await apiRequest(
        'POST',
        '/api/tutors/assistant/query',
        {
          courseId: selectedCourseId,
          cohortId: selectedCohortId,
          question: trimmedQuestion,
          history
        },
        { headers }
      );
      const payload = await response.json();
      const assistantMessage: TutorAssistantMessage = {
        id: `${Date.now()}-${Math.random()}`,
        role: 'assistant',
        content: payload?.answer ?? 'No response available.',
        timestamp: new Date().toISOString()
      };
      setAssistantMessages((prev) => [...prev, assistantMessage]);

      // Scroll to the top of the NEW assistant's response
      setTimeout(scrollAssistantToLastMessage, 100);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Assistant unavailable',
        description: error?.message ?? 'Unable to fetch response'
      });
    } finally {
      setAssistantLoading(false);
    }
  };

  const handleAssistantSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await performAssistantQuery(assistantInput);
  };

  const handleOpenEmailModal = (students: { email: string; fullName: string } | Array<{ email: string; fullName: string }>) => {
    if (Array.isArray(students)) {
      if (students.length === 0) return;

      if (students.length === 1) {
        // Treat single student as single even if passed as array via bulk selection
        setEmailFormData({ to: students[0].email, fullName: students[0].fullName, subject: '', message: '' });
      } else {
        setEmailFormData({
          to: students.map(s => s.email),
          fullName: `${students.length} selected learners`,
          subject: '',
          message: ''
        });
      }
    } else {
      setEmailFormData({ to: students.email, fullName: students.fullName, subject: '', message: '' });
    }
    setIsEmailModalOpen(true);
  };

  const handleBulkEmail = (source: 'alert' | 'enrollment') => {
    const selection = source === 'alert' ? alertSelection : enrollmentSelection;
    const studentsToEmail: { email: string; fullName: string }[] = [];

    // Gather details for selected emails from reachable data
    const allLearners = [
      ...(enrollmentsResponse?.enrollments ?? []),
      ...(progressResponse?.learners ?? [])
    ];

    selection.selectedEmails.forEach(email => {
      const learner = allLearners.find(l => l.email === email);
      if (learner) {
        studentsToEmail.push({ email: learner.email, fullName: learner.fullName });
      }
    });

    handleOpenEmailModal(studentsToEmail);
  };

  const handleImproveEmail = async () => {
    if (!emailFormData.message.trim() || !headers) return;

    setIsImprovingEmail(true);
    try {
      // Get current course name for context
      const currentCourse = courses.find(c => c.courseId === selectedCourseId);
      const courseName = currentCourse?.title || 'the course';

      const response = await apiRequest(
        'POST',
        '/api/tutors/email/improve',
        {
          message: emailFormData.message,
          learnerName: emailFormData.fullName,
          courseName: courseName
        },
        { headers }
      );

      const data = await response.json();

      if (data.improvedMessage) {
        setEmailFormData({
          ...emailFormData,
          message: data.improvedMessage
        });

        toast({
          title: 'Message improved',
          description: 'Your message has been enhanced. Review and edit if needed before sending.'
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'AI improvement failed',
        description: error?.message || 'Unable to improve message. Please try again.'
      });
    } finally {
      setIsImprovingEmail(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headers) return;

    setEmailSending(true);
    try {
      await apiRequest(
        'POST',
        '/api/tutors/email',
        {
          to: emailFormData.to,
          subject: emailFormData.subject,
          message: emailFormData.message
        },
        { headers }
      );
      toast({
        title: 'Email sent',
        description: Array.isArray(emailFormData.to)
          ? `Your message has been sent to ${emailFormData.to.length} learners.`
          : `Your message to ${emailFormData.fullName} has been sent.`
      });
      setIsEmailModalOpen(false);
      alertSelection.clearSelection();
      enrollmentSelection.clearSelection();
    } catch (error: any) {
      let errorMessage = 'Failed to send email. Please try again.';

      // Attempt to extract structured error details from the response
      if (error instanceof Error && error.message.includes('{')) {
        try {
          const body = JSON.parse(error.message.substring(error.message.indexOf('{')));
          if (body.details) {
            errorMessage = `${body.message} (${body.details})`;
          } else if (body.message) {
            errorMessage = body.message;
          }
        } catch (e) {
          // Fallback to error message
          errorMessage = error.message;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage
      });
    }
    finally {
      setEmailSending(false);
    }
  };


  const totalEnrollments = enrollmentsResponse?.enrollments?.length ?? 0;
  const averageProgressPercent = useMemo(() => {
    const learners = progressResponse?.learners ?? [];
    if (learners.length === 0) {
      return 0;
    }
    const total = learners.reduce((acc, learner) => acc + learner.percent, 0);
    return Math.floor(total / learners.length);
  }, [progressResponse?.learners]);

  const navItems = [
    { id: 'overview', label: 'Command Center' },
    { id: 'classroom', label: 'Classroom' },
    { id: 'monitoring', label: 'Live Monitor' },
    { id: 'copilot', label: 'AI Copilot' }
  ];

  const overviewStats = [
    {
      label: 'Active learners',
      value: totalEnrollments,
      suffix: '',
      helper: `${activitySummary.engaged} currently engaged`,
      color: 'text-[#3182CE]',
      border: 'border-l-4 border-l-[#90CDF4]',
      bg: 'bg-white'
    },
    {
      label: 'Avg. progress',
      value: averageProgressPercent,
      suffix: '%',
      helper: progressResponse?.totalModules ? `${progressResponse.totalModules} modules tracked` : 'Across current cohort',
      color: 'text-[#38A169]',
      border: 'border-l-4 border-l-[#9AE6B4]',
      bg: 'bg-white'
    },
    {
      label: 'Critical alerts',
      value: activitySummary.content_friction,
      suffix: '',
      helper: 'Content friction signals',
      color: 'text-[#E53E3E]',
      border: 'border-l-4 border-l-[#FEB2B2]',
      bg: 'bg-white'
    }
  ];

  const handleSectionNav = (sectionId: string) => {
    if (sectionId === 'copilot') {
      setIsAssistantSheetOpen(true);
      return;
    }

    if (typeof document === 'undefined') {
      return;
    }
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!session) {
    return (
      <SiteLayout>
        <div className="max-w-3xl mx-auto py-10 px-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sign in required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground text-sm">Use your tutor credentials to access the dashboard.</p>
              <Button onClick={() => setLocation('/become-a-tutor')}>Go to landing page</Button>
            </CardContent>
          </Card>
        </div>
      </SiteLayout>
    );
  }

  if (session.role !== 'tutor' && session.role !== 'admin') {
    return (
      <SiteLayout>
        <div className="max-w-3xl mx-auto py-10 px-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Access restricted</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">This area is only for tutors or admins.</p>
              <Button className="mt-3" onClick={handleLogout} variant="outline">
                Logout
              </Button>
            </CardContent>
          </Card>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="min-h-screen">
        <div className="w-full pb-16 pt-6 text-[#1A202C]">
          <section id="overview" className="border-b border-[#E6EAF0] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#718096]">Tutor Command Center</p>
                <div>
                  <h1 className="text-3xl font-semibold text-[#1A202C]">Welcome back, {session.fullName ?? 'Tutor'}</h1>
                  <p className="text-sm text-[#718096]">
                    Monitor every learner signal, respond to alerts, and guide your class from a single surface.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Select value={selectedCourseId ?? undefined} onValueChange={(value) => setSelectedCourseId(value)}>
                    <SelectTrigger className="w-full border-[#E2E8F0] bg-white text-left text-[#1A202C] sm:w-[280px]">
                      <SelectValue placeholder={coursesLoading ? 'Loading...' : 'Select course'} />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.courseId} value={course.courseId}>
                          {course.title} {course.role ? `(${course.role})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    className="border-[#E2E8F0] text-[#4A5568] hover:bg-[#F8FAFC]"
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                </div>
                {courses.length > 0 && selectedCourseId && (
                  <p className="text-sm text-[#718096]">
                    Showing data for{' '}
                    <span className="font-semibold text-[#1A202C]">
                      {courses.find((c) => c.courseId === selectedCourseId)?.title ?? 'your course'}
                    </span>
                    .
                  </p>
                )}
              </div>
              <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {overviewStats.map((stat) => (
                  <motion.div
                    key={stat.label}
                    whileHover={{
                      y: -2,
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className={`flex flex-col h-full min-h-[140px] rounded-xl border border-[#E6EAF0] p-6 shadow-sm cursor-default transition-all ${stat.bg} ${stat.border}`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#718096]">{stat.label}</p>
                    <div className={`mt-2 text-4xl font-bold tracking-tight ${stat.color}`}>
                      <NumberTicker value={stat.value} suffix={stat.suffix} />
                    </div>
                    <p className="mt-auto pt-4 text-[11px] font-medium text-[#718096] leading-relaxed border-t border-[#EDF2F7]">{stat.helper}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          <nav className="mt-4 flex flex-wrap gap-2 text-sm text-[#718096]" aria-label="Tutor sections">
            {navItems.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => handleSectionNav(item.id)}
                className="rounded-full border border-[#E2E8F0] bg-white px-4 py-1.5 font-medium tracking-wide text-[#4A5568] shadow-sm transition hover:bg-[#F8FAFC] hover:text-[#2D3748] text-xs"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <section id="classroom" className="mt-8 space-y-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#718096]">Classroom</p>
              <h2 className="text-xl font-semibold text-[#1A202C]">Roster & Throughput</h2>
              <p className="text-xs text-[#718096]">Stay on top of enrollments and module completion at a glance.</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="border-[#E6EAF0] bg-white text-[#1A202C] shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                <CardHeader>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-[#1A202C]">Enrollments</CardTitle>
                      <p className="text-sm text-[#718096]">{totalEnrollments} learners in the cohort</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {enrollmentSelection.selectedEmails.size > 0 && (
                        <Button
                          onClick={() => handleBulkEmail('enrollment')}
                          size="sm"
                          className="bg-[#2D3748] text-white hover:bg-[#1A202C] animate-in fade-in zoom-in duration-200 shrink-0"
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Email Group ({enrollmentSelection.selectedEmails.size})
                        </Button>
                      )}
                      <Select value={selectedCohortId ?? undefined} onValueChange={(value) => setSelectedCohortId(value)}>
                        <SelectTrigger className="w-full border-[#E2E8F0] bg-white text-left text-[#1A202C] sm:w-[220px]">
                          <SelectValue placeholder={cohortsLoading ? 'Loading cohorts...' : 'Select cohort batch'} />
                        </SelectTrigger>
                        <SelectContent>
                          {cohorts.map((cohort) => (
                            <SelectItem key={cohort.cohortId} value={cohort.cohortId}>
                              {cohort.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {enrollmentsLoading ? (
                    <p className="text-sm text-[#718096]">Loading enrollments...</p>
                  ) : (enrollmentsResponse?.enrollments ?? []).length === 0 ? (
                    <p className="text-sm text-[#718096]">No enrollments yet.</p>
                  ) : (
                    <div className="max-h-[450px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#E2E8F0] scrollbar-track-transparent hover:scrollbar-thumb-[#CBD5E0] scroll-smooth pr-2">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#F8FAFC] pointer-events-none hover:bg-[#F8FAFC] border-[#EDF2F7]">
                            <TableHead className="w-12">
                              <Checkbox
                                checked={enrollmentSelection.isAllSelected((enrollmentsResponse?.enrollments ?? []).map(e => e.email))}
                                onCheckedChange={() => enrollmentSelection.toggleSelectAll((enrollmentsResponse?.enrollments ?? []).map(e => e.email))}
                                className="border-[#CBD5E0] data-[state=checked]:bg-[#2D3748] data-[state=checked]:border-[#2D3748]"
                              />
                            </TableHead>
                            <TableHead className="text-[#718096] text-[10px] font-bold uppercase tracking-wider">Learner</TableHead>
                            <TableHead className="text-[#718096] text-[10px] font-bold uppercase tracking-wider">Email</TableHead>
                            <TableHead className="text-[#718096] text-[10px] font-bold uppercase tracking-wider">Status</TableHead>
                            <TableHead className="text-[#718096] text-[10px] font-bold uppercase tracking-wider">Enrolled</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(enrollmentsResponse?.enrollments ?? []).map((enrollment) => (
                            <TableRow key={enrollment.enrollmentId} className="border-[#EDF2F7] hover:bg-[#F1F5F9] cursor-pointer group/row transition-colors">
                              <TableCell className="w-12">
                                <Checkbox
                                  checked={enrollmentSelection.selectedEmails.has(enrollment.email)}
                                  onCheckedChange={() => enrollmentSelection.toggleEmailSelection(enrollment.email)}
                                  className="border-[#CBD5E0] data-[state=checked]:bg-[#2D3748] data-[state=checked]:border-[#2D3748]"
                                />
                              </TableCell>
                              <TableCell className="text-[#4A5568] font-semibold py-3 px-4">
                                {enrollment.fullName}
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <div className="flex items-center gap-2 group/email">
                                  <div className="text-[#718096] text-[10px] leading-tight truncate">{enrollment.email}</div>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-[#A0AEC0] hover:text-[#2D3748] hover:bg-[#EDF2F7] rounded-full transition-all shrink-0"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenEmailModal({ email: enrollment.email, fullName: enrollment.fullName });
                                          }}
                                        >
                                          <Mail className="h-3 w-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="bg-[#1A202C] text-white border-0 text-[10px] px-2 py-1">
                                        Email learner
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-tight border ${enrollment.status.toLowerCase() === 'active'
                                    ? 'bg-[#F0FFF4] text-[#38A169] border-[#C6F6D5]'
                                    : 'bg-[#EDF2F7] text-[#475569] border-[#E2E8F0]'
                                  }`}>
                                  {enrollment.status}
                                </span>
                              </TableCell>
                              <TableCell className="text-[#A0AEC0] text-[10px] py-3 px-4 font-medium">{new Date(enrollment.enrolledAt).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-[#E6EAF0] bg-white text-[#1A202C] shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                <CardHeader>
                  <CardTitle className="text-[#1A202C]">Learner progress</CardTitle>
                  <p className="text-xs text-[#718096] font-normal leading-relaxed">
                    Average completion {averageProgressPercent}% across {progressResponse?.totalModules ?? 0} modules
                  </p>
                </CardHeader>
                <CardContent>
                  {progressLoading ? (
                    <p className="text-sm text-[#718096]">Loading progress...</p>
                  ) : (progressResponse?.learners ?? []).length === 0 ? (
                    <p className="text-sm text-[#718096]">No progress yet.</p>
                  ) : (
                    <div className="relative group/scroll">
                      <div className="max-h-[450px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#E2E8F0] scrollbar-track-transparent hover:scrollbar-thumb-[#CBD5E0] scroll-smooth pr-2">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-[#F8FAFC] pointer-events-none border-[#EDF2F7]">
                              <TableHead className="text-[#718096] text-[10px] font-bold uppercase tracking-wider">Learner</TableHead>
                              <TableHead className="text-[#718096] text-[10px] font-bold uppercase tracking-wider">Modules</TableHead>
                              <TableHead className="text-[#718096] text-[10px] font-bold uppercase tracking-wider">Percent</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(() => {
                              const learners = progressResponse?.learners ?? [];
                              return [...learners].sort((a, b) => a.percent - b.percent);
                            })().map((learner) => (
                              <TableRow key={learner.userId} className="border-[#EDF2F7] hover:bg-[#F1F5F9] cursor-pointer transition-colors group/row">

                                <TableCell className="py-2.5 px-4">
                                  <div className="font-semibold text-[#4A5568] leading-tight">{learner.fullName}</div>
                                  <div className="text-[10px] text-[#718096] leading-tight mt-0.5">{learner.email}</div>
                                </TableCell>
                                <TableCell className="text-[#718096] text-[10px] py-2.5 px-4 font-medium">
                                  {learner.completedModules}/{learner.totalModules}
                                </TableCell>
                                <TableCell className="text-[#1A202C] py-2.5 px-4 min-w-[140px]">
                                  <div className="flex items-center gap-3">
                                    <div className="h-2.5 flex-1 rounded-full bg-[#EDF2F7] overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-[#38A169] shadow-sm"
                                        style={{ width: `${learner.percent}%` }}
                                      />
                                    </div>
                                    <span className="text-[11px] font-bold text-[#718096] min-w-[32px] text-right">{learner.percent}%</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent opacity-60" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          <section id="monitoring" className="mt-8 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#718096]">Intervention Zone</p>
                <h2 className="text-xl font-semibold text-[#1A202C]">Engagement & Alerts</h2>
                <p className="text-xs text-[#718096]">
                  Assess signals and take directed action to guide learners back to flow.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {statusOrder.map((key) => (
                <div
                  key={key}
                  className="flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-2 py-0.5 shadow-sm transition hover:border-[#CBD5E0]"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${statusMeta[key].dotClass} animate-pulse`} />
                  <div className="flex items-center gap-1">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#4A5568]">{statusMeta[key].label}</p>
                    <span className="h-1 w-1 rounded-full bg-[#E2E8F0]" />
                    <p className="text-[9px] font-medium text-[#718096]">{activitySummary[key as keyof ActivitySummary]}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-2 mt-4">
              <Card className="border-[#E6EAF0] bg-white text-[#1A202C] shadow-[0_4px_12px_rgba(0,0,0,0.05)] flex flex-col">
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="text-[#1A202C]">Alert Feed</CardTitle>
                    <p className="text-xs text-[#718096]">
                      {activityFetching ? 'Refreshing telemetry...' : 'Snapshots refresh automatically every 30 seconds.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {alertSelection.selectedEmails.size > 0 && (
                      <Button
                        onClick={() => handleBulkEmail('alert')}
                        size="sm"
                        className="bg-[#2D3748] text-white hover:bg-[#1A202C] animate-in fade-in zoom-in duration-200 shrink-0"
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Email Group ({alertSelection.selectedEmails.size})
                      </Button>
                    )}
                    <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-[#F8FAFC] border border-[#EDF2F7]">
                      <Checkbox
                        id="select-all-alerts"
                        checked={alertSelection.isAllSelected((activityResponse?.learners ?? []).map(l => l.email).filter((e): e is string => !!e))}
                        onCheckedChange={() => alertSelection.toggleSelectAll((activityResponse?.learners ?? []).map(l => l.email).filter((e): e is string => !!e))}
                        className="border-[#CBD5E0] data-[state=checked]:bg-[#2D3748] data-[state=checked]:border-[#2D3748]"
                      />
                      <label htmlFor="select-all-alerts" className="text-[10px] font-bold uppercase tracking-wider text-[#718096] cursor-pointer select-none">
                        Select All
                      </label>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  {activityError ? (
                    <p className="text-sm text-[#E53E3E]">
                      Unable to load learner telemetry right now. Please retry shortly.
                    </p>
                  ) : activityLoading ? (
                    <div className="space-y-3">
                      {[0, 1, 2].map((index) => (
                        <Skeleton key={index} className="h-24 w-full rounded-2xl bg-[#F8FAFC]" />
                      ))}
                    </div>
                  ) : (activityResponse?.learners ?? []).length === 0 ? (
                    <p className="text-sm text-[#718096]">
                      No telemetry yet. As learners watch, read, attempt quizzes, or interact with widgets, they will appear here.
                    </p>
                  ) : (
                    <div className="relative group/scroll">
                      <div className="max-h-[450px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#E2E8F0] scrollbar-track-transparent hover:scrollbar-thumb-[#CBD5E0] scroll-smooth pr-2 pb-12">
                        <div className="space-y-2">
                          {(activityResponse?.learners ?? []).map((learner) => {
                            const directoryIdentity = learnerDirectory.get(learner.userId);
                            const identity = {
                              fullName: learner.fullName || directoryIdentity?.fullName,
                              email: learner.email || directoryIdentity?.email
                            };
                            const key = (learner.derivedStatus ?? 'unknown') as keyof typeof statusMeta;
                            const meta = statusMeta[key];
                            const isActive = selectedLearnerId === learner.userId;
                            const reasonLabel = formatStatusReason(learner.statusReason);
                            return (
                              <div key={learner.userId} className="flex items-center gap-3 pr-2">
                                <Checkbox
                                  checked={identity?.email ? alertSelection.selectedEmails.has(identity.email) : false}
                                  onCheckedChange={() => identity?.email && alertSelection.toggleEmailSelection(identity.email)}
                                  disabled={!identity?.email}
                                  className="border-[#CBD5E0] data-[state=checked]:bg-[#2D3748] data-[state=checked]:border-[#2D3748] shrink-0"
                                />
                                <button
                                  type="button"
                                  onClick={() => setSelectedLearnerId(learner.userId)}
                                  className={`flex-1 rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2E8F0] ${isActive ? 'border-[#CBD5E0] bg-[#F8FAFC] shadow-sm' : 'border-[#EDF2F7] bg-white hover:bg-[#F8FAFC]'
                                    }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-[#1A202C] line-clamp-1">
                                        {identity.fullName ?? 'Learner'}{' '}
                                        {!identity.fullName && (
                                          <span className="text-xs text-[#718096]">({learner.userId.slice(0, 6)})</span>
                                        )}
                                      </p>
                                      <p className="text-[11px] text-[#718096] truncate">{identity.email ?? 'Email unavailable'}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <Badge variant="secondary" className={`${meta.badgeClass} border-0 text-[10px]`}>
                                        {meta.label}
                                      </Badge>
                                      {identity?.email && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 text-[#A0AEC0] hover:text-[#2D3748] hover:bg-[#EDF2F7] rounded-full"
                                          title="Email learner about this engagement issue"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenEmailModal({ email: identity.email!, fullName: identity.fullName ?? 'Learner' });
                                          }}
                                        >
                                          <Mail className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  {reasonLabel && <p className="mt-2 text-xs text-[#4A5568] line-clamp-2">{reasonLabel}</p>}
                                  <p className="mt-2 text-[10px] text-[#A0AEC0]">Updated {formatTimestamp(learner.createdAt)}</p>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent opacity-60" />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-[#E6EAF0] bg-white text-[#1A202C] shadow-[0_4px_12px_rgba(0,0,0,0.05)] flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3 min-h-[56px]">
                    <div>
                      <CardTitle className="text-[#1A202C]">Learner detail</CardTitle>
                      {selectedIdentity && (
                        <p className="text-sm text-[#2D3748] font-medium truncate max-w-[200px]">
                          {selectedIdentity.fullName}
                        </p>
                      )}
                    </div>
                    {selectedLearner && (
                      <Badge
                        variant="secondary"
                        className={`${statusMeta[(selectedLearner.derivedStatus ?? 'unknown') as keyof typeof statusMeta].badgeClass} border-0`}
                      >
                        {statusMeta[(selectedLearner.derivedStatus ?? 'unknown') as keyof typeof statusMeta].label}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  {!selectedLearnerId ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-300">
                      <div className="w-16 h-16 rounded-full bg-[#F8FAFC] flex items-center justify-center mb-4">
                        <MessageSquare className="w-8 h-8 text-[#CBD5E0]" />
                      </div>
                      <h3 className="text-lg font-semibold text-[#1A202C]">No learner selected</h3>
                      <p className="text-sm text-[#718096] max-w-[200px] mt-2">
                        Select a learner from the list to view their engagement details and recent activity.
                      </p>
                    </div>
                  ) : (
                    <div className="relative group/scroll">
                      <div className="max-h-[450px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#E2E8F0] scrollbar-track-transparent hover:scrollbar-thumb-[#CBD5E0] scroll-smooth pr-1 pb-12">
                        {historyLoading || historyFetching ? (
                          <div className="space-y-2">
                            {[0, 1, 2].map((index) => (
                              <Skeleton key={index} className="h-20 w-full rounded-xl bg-[#F8FAFC]" />
                            ))}
                          </div>
                        ) : sortedHistoryEvents.length === 0 ? (
                          <div className="text-center py-10 text-slate-500">
                            <p className="text-sm">No events recorded for this learner yet.</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {sortedHistoryEvents.map((event, index) => {
                              const meta = statusMeta[(event.derivedStatus ?? 'unknown') as keyof typeof statusMeta];
                              const eventLabel = formatEventLabel(event.eventType);
                              const reasonLabel = formatStatusReason(event.statusReason);
                              return (
                                <div
                                  key={event.eventId ?? `${event.eventType}-${event.createdAt}-${event.moduleNo ?? 'm'}-${index}`}
                                  className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm hover:border-slate-200 transition"
                                >
                                  <div className="flex items-center justify-between gap-3 mb-2">
                                    <Badge variant="secondary" className={`${meta.badgeClass} border-0 text-[10px]`}>
                                      {meta.label}
                                    </Badge>
                                    <span className="text-[10px] font-medium text-slate-400">{formatTimestamp(event.createdAt)}</span>
                                  </div>
                                  <p className="text-sm font-bold text-slate-900">{eventLabel}</p>
                                  {reasonLabel && <p className="mt-1 text-xs text-slate-600 italic">"{reasonLabel}"</p>}
                                  <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                    <span className="rounded-md bg-slate-50 px-2 py-1">
                                      {(() => {
                                        const topicMeta = event.topicId ? topicTitleLookup.get(event.topicId) : null;
                                        return topicMeta
                                          ? topicMeta.moduleName ?? `Module ${topicMeta.moduleNo}`
                                          : `Module ${event.moduleNo ?? 'n/a'}`;
                                      })()}
                                    </span>
                                    <span className="text-slate-200">•</span>
                                    <span className="truncate">
                                      {(() => {
                                        const topicMeta = event.topicId ? topicTitleLookup.get(event.topicId) : null;
                                        return topicMeta?.title ?? (event.topicId ? `Topic ${event.topicId.slice(0, 8)}` : 'Topic n/a');
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent opacity-60" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

        </div>

        {/* Persistent AI Copilot Button - Anchored horizontally to white surface, fixed to viewport bottom */}
        {!isAssistantSheetOpen && (
          <div className="fixed inset-x-0 bottom-6 z-50 pointer-events-none">
            <div className="mx-auto max-w-[96%] px-6 sm:px-10 flex justify-end">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="pointer-events-auto"
              >
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 0 0px rgba(16, 185, 129, 0)",
                      "0 0 0 10px rgba(16, 185, 129, 0.2)",
                      "0 0 0 0px rgba(16, 185, 129, 0)"
                    ]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="rounded-full"
                >
                  <Button
                    onClick={() => setIsAssistantSheetOpen(true)}
                    className="h-12 px-6 rounded-full bg-[#2D3748] hover:bg-[#1A202C] text-white shadow-xl flex items-center gap-2 group transition-all hover:scale-105 active:scale-95"
                  >
                    <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    <span className="font-semibold tracking-tight text-sm">AI Copilot</span>
                  </Button>
                </motion.div>
              </motion.div>
            </div>
          </div>
        )}

        {/* AI Copilot Side Panel (Sheet) */}
        <Sheet open={isAssistantSheetOpen} onOpenChange={setIsAssistantSheetOpen}>
          <SheetContent side="right" className="w-full sm:max-w-[400px] md:max-w-[450px] p-0 border-l border-slate-200 bg-white flex flex-col">
            <SheetHeader className="p-6 border-b border-slate-200">
              <div className="flex items-center gap-2 text-emerald-600 mb-1">
                <Sparkles className="w-4 h-4" />
                <p className="text-[10px] uppercase tracking-[0.3em] font-bold">AI Copilot</p>
              </div>
              <SheetTitle className="text-xl font-bold text-slate-900">Classroom Analyst</SheetTitle>
            </SheetHeader>

            {/* Quick Suggestions */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-3">Quick Suggestions</p>
              <div className="flex flex-col gap-2">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => performAssistantQuery(prompt)}
                    className="text-left text-sm p-3 rounded-xl border-2 border-emerald-100 bg-white hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-slate-700 hover:text-emerald-700 font-medium shadow-sm"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div
              ref={assistantChatRef}
              className="flex-1 overflow-y-auto p-6 space-y-4"
            >
              {assistantMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-60">
                  <div className="p-4 rounded-full bg-slate-100">
                    <MessageSquare className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500 max-w-[200px]">
                    Ask about enrollments, stuck learners, or classroom engagement.
                  </p>
                </div>
              ) : (
                assistantMessages.map((message, idx) => (
                  <div
                    key={message.id}
                    ref={idx === assistantMessages.length - 1 ? lastMessageRef : null}
                    className={`flex flex-col ${message.role === 'assistant' ? 'items-start' : 'items-end'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.role === 'assistant'
                        ? 'bg-slate-100 text-slate-900 rounded-tl-none'
                        : 'bg-emerald-600 text-white rounded-tr-none shadow-md shadow-emerald-600/20'
                        }`}
                    >
                      <p className="text-[9px] uppercase tracking-wider opacity-60 font-bold mb-1">
                        {message.role === 'assistant' ? 'Copilot' : 'You'}
                      </p>
                      <div className="leading-relaxed assistant-markdown">
                        {message.role === 'assistant' ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        ) : (
                          message.content
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {assistantLoading && (
                <div className="flex items-start">
                  <div className="bg-slate-100 text-slate-900 rounded-2xl rounded-tl-none px-4 py-3 text-sm flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin opacity-60" />
                    <span className="text-xs font-medium opacity-60">Analysing classroom data...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#EDF2F7] bg-white">
              <form onSubmit={handleAssistantSubmit} className="flex flex-row flex-nowrap items-center gap-2">
                <Input
                  value={assistantInput}
                  onChange={(event) => setAssistantInput(event.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAssistantSubmit(e as any);
                    }
                  }}
                  placeholder="Ask about learners..."
                  disabled={!selectedCourseId}
                  className="flex-1 border-[#E2E8F0] focus:border-[#2D3748] bg-white text-[#1A202C] placeholder:text-[#A0AEC0] rounded-xl h-11"
                />
                <Button
                  type="submit"
                  disabled={!selectedCourseId || assistantLoading || !assistantInput.trim()}
                  className="bg-[#2D3748] text-white hover:bg-[#1A202C] shadow-sm rounded-xl px-4 h-11 shrink-0 font-bold whitespace-nowrap"
                >
                  {assistantLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ask'}
                </Button>
              </form>
            </div>
          </SheetContent>
        </Sheet>

        <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
          <DialogContent className="sm:max-w-[500px] border-slate-200 bg-white">
            <DialogHeader>
              <DialogTitle className="text-slate-900">Email Student</DialogTitle>
              <DialogDescription className="text-slate-600">
                Send a direct message to {emailFormData.fullName}.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSendEmail} className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="to" className="text-slate-700">To</Label>
                <Input
                  id="to"
                  value={Array.isArray(emailFormData.to) ? emailFormData.to.join(', ') : emailFormData.to}
                  disabled
                  className="bg-slate-50 text-xs"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="subject" className="text-slate-700">Subject</Label>
                <Input
                  id="subject"
                  required
                  value={emailFormData.subject}
                  onChange={(e) => setEmailFormData({ ...emailFormData, subject: e.target.value })}
                  placeholder="e.g. Feedback on your recent module"
                  className="border-slate-300"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="message" className="text-slate-700">Message</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleImproveEmail}
                    disabled={!emailFormData.message.trim() || isImprovingEmail}
                    className="text-xs h-7"
                  >
                    {isImprovingEmail ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Improving...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-1 h-3 w-3" />
                        AI Improve
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  id="message"
                  required
                  rows={8}
                  value={emailFormData.message}
                  onChange={(e) => setEmailFormData({ ...emailFormData, message: e.target.value })}
                  placeholder="Write your message here..."
                  className="border-slate-300"
                />
                <p className="text-xs text-slate-500">
                  Tip: Write a brief message, then click "AI Improve" to enhance it professionally.
                </p>
              </div>
              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="border-slate-300 text-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={emailSending}
                  className="bg-emerald-600 text-white hover:bg-emerald-500"
                >
                  {emailSending ? 'Sending...' : 'Send Email'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </SiteLayout>
  );
}

