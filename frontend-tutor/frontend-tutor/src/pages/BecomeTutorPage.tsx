import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  BarChart3,
  Video,
  Globe,
  ArrowRight,
  Sparkles,
  Loader2,
  CheckCircle2,
  Lightbulb,
  PenTool,
  Rocket,
  X,
  ShieldCheck,
  TrendingUp,
  Brain,
  Layout,
  MessageSquare,
  ChevronRight
} from 'lucide-react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { buildApiUrl } from "@/lib/api";
import { writeStoredSession, resetSessionHeartbeat } from '@/utils/session';
import type { StoredSession } from '@/types/session';

// --- 1. TYPES & INTERFACES ---
interface TutorApplication {
  fullName: string;
  email: string;
  phone: string;
  headline: string;
  expertiseArea: string;
  yearsExperience: number;
  courseTitle: string;
  availability: string;
  courseDescription: string;
  targetAudience: string;
}

// --- 2. Description helper (client-safe template) ---
const THEME = {
  bg: '#FDFCF0',      // Warm Ivory
  primary: '#B24531', // Deep Burnt Orange
  accent: '#E64833',  // Coral Highlights
  text: '#1E3A47',    // Warm Charcoal
  muted: '#1E3A47/60',
  card: '#FFFFFF',
  secondaryBg: '#F7F3E3' // Subtle layered section bg
};

// --- DESCRIPTION HELPER ---
const generateCourseDescription = async (
  title: string,
  expertise: string,
): Promise<string> => {
  if (!title || !expertise) {
    return "Describe your proposed curriculum, learning objectives, and the skills learners will gain.";
  }

  return [
    `${title} takes learners inside real workflows that ${expertise.toLowerCase()} teams use every day.`,
    "You will define a production-grade project, ship weekly deliverables, and review your work with industry mentors.",
    "By the end, participants graduate with a polished portfolio, repeatable playbooks, and the confidence to lead in their role.",
  ].join(" ");
};

const GrainOverlay = () => (
  <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.035]" style={{ mixBlendMode: 'multiply' }}>
    <svg width="100%" height="100%">
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  </div>
);


const SectionHeader = ({ badge, title, subline, light = false }: { badge?: string; title: string; subline?: string; light?: boolean }) => (
  <div className="mb-8 text-center max-w-3xl mx-auto">
    {badge && (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6 text-[10px] font-black uppercase tracking-[0.2em] ${light ? 'bg-white/10 text-white/80' : 'bg-[#B24531]/10 text-[#B24531]'}`}
      >
        {badge}
      </motion.div>
    )}
    <motion.h3
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`text-4xl md:text-5xl font-black tracking-tight mb-4 ${light ? 'text-white' : 'text-[#1E3A47]'}`}
    >
      {title}
    </motion.h3>
    {subline && (
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className={`text-lg font-medium max-w-2xl mx-auto ${light ? 'text-white/60' : 'text-[#1E3A47]/60'}`}
      >
        {subline}
      </motion.p>
    )}
  </div>
);

const CapabilityCard = ({ title, desc, mockup, badge }: { title: string; desc: string; mockup: React.ReactNode; badge: string }) => (
  <motion.div
    whileHover={{ y: -10, scale: 1.02 }}
    className="w-[380px] h-[480px] shrink-0 bg-white/60 backdrop-blur-xl border border-white shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col group transition-all duration-500"
  >
    {/* Mini UI Preview Area */}
    <div className="h-[240px] relative overflow-hidden bg-slate-50/50 flex items-center justify-center p-6 border-b border-slate-100">
      <div className="absolute inset-0 bg-gradient-to-br from-[#B24531]/5 to-transparent opacity-50" />
      <div className="relative z-10 w-full transform group-hover:scale-105 transition-transform duration-700">
        {mockup}
      </div>
    </div>

    {/* Content Area */}
    <div className="p-8 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="px-3 py-1 rounded-full bg-[#B24531]/5 text-[#B24531] text-[10px] font-black uppercase tracking-widest border border-[#B24531]/10">
          {badge}
        </div>
      </div>
      <h4 className="text-xl font-bold text-[#1E3A47] group-hover:text-[#B24531] transition-colors">{title}</h4>
      <p className="text-sm text-[#1E3A47]/60 font-medium leading-relaxed">
        {desc}
      </p>
    </div>
  </motion.div>
);

const MiniCourseBuilder = () => (
  <div className="w-full h-32 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
    <div className="h-6 bg-slate-50 border-b border-slate-100 px-3 flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
      <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
      <div className="h-2 w-16 bg-slate-200 rounded" />
    </div>
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-orange-50 flex items-center justify-center text-[#B24531] text-[8px] font-bold">01</div>
        <div className="h-1.5 w-24 bg-slate-100 rounded" />
      </div>
      <div className="flex items-center gap-2 ml-8">
        <div className="w-4 h-4 rounded-full bg-[#B24531]/10" />
        <div className="h-1.5 w-16 bg-slate-50 rounded" />
      </div>
    </div>
  </div>
);

const MiniEarnings = () => (
  <div className="w-full h-32 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
    <div className="flex justify-between items-start">
      <div className="text-[10px] font-black text-[#1E3A47]/40 uppercase">Split</div>
      <div className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[8px] font-bold">80% Share</div>
    </div>
    <div className="flex items-end gap-1 h-12">
      {[30, 60, 45, 80, 55, 90, 70, 100].map((h, i) => (
        <div key={i} className="flex-1 bg-[#B24531]/20 rounded-t-xs" style={{ height: `${h}%` }} />
      ))}
    </div>
    <div className="text-lg font-black text-[#1E3A47] tracking-tight">$4,290</div>
  </div>
);

const MiniAI = () => (
  <div className="w-full h-32 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
    <div className="flex gap-2">
      <div className="w-5 h-5 shrink-0 rounded-full bg-[#1E3A47] flex items-center justify-center text-white"><Sparkles size={10} /></div>
      <div className="space-y-1.5 flex-1">
        <div className="h-1.5 w-full bg-slate-100 rounded" />
        <div className="h-1.5 w-2/3 bg-slate-100 rounded" />
      </div>
    </div>
    <div className="pl-7">
      <div className="px-3 py-1.5 bg-slate-50 border border-[#B24531]/20 rounded-lg text-[8px] font-bold text-[#B24531] flex justify-between items-center group-hover:bg-[#B24531]/5 transition-colors">
        Suggest follow-up
        <ArrowRight size={8} />
      </div>
    </div>
  </div>
);

const MiniAnalytics = () => (
  <div className="w-full h-32 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex gap-4 items-center">
    <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-[#B24531] flex items-center justify-center relative">
      <span className="text-[10px] font-black text-[#1E3A47]">84%</span>
    </div>
    <div className="flex-1 space-y-2">
      <div className="space-y-1">
        <div className="flex justify-between text-[8px] font-black text-slate-400">
          <span>Active</span>
          <span className="text-emerald-500">+12%</span>
        </div>
        <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full w-2/3 bg-[#B24531]" />
        </div>
      </div>
    </div>
  </div>
);

const CapabilityMarquee = ({ items, reverse = false }: { items: any[]; reverse?: boolean }) => {
  return (
    <div className="flex overflow-hidden relative">
      <motion.div
        animate={{ x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{
          duration: 35,
          repeat: Infinity,
          ease: "linear",
        }}
        className="flex gap-8 py-8 px-4"
      >
        {[...items, ...items].map((item, idx) => (
          <CapabilityCard key={idx} {...item} />
        ))}
      </motion.div>
    </div>
  );
};

const FloatingShapes = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <motion.div
      animate={{
        y: [0, -20, 0],
        x: [0, 15, 0],
        opacity: [0.03, 0.06, 0.03],
      }}
      transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      className="absolute top-[20%] left-[10%] w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-[#B24531] to-transparent blur-[120px]"
    />
    <motion.div
      animate={{
        y: [0, 25, 0],
        x: [0, -15, 0],
        opacity: [0.02, 0.05, 0.02],
      }}
      transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      className="absolute bottom-[20%] right-[5%] w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-[#1E3A47] to-transparent blur-[130px]"
    />
  </div>
);




const JourneyStep = ({ id, title, desc, icon: Icon, isLast }: { id: string; title: string; desc: string; icon: any; isLast: boolean }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <div ref={ref} className="relative flex-1 flex flex-col items-center">
      {/* Connecting Line (Desktop) */}
      {!isLast && (
        <div className="hidden lg:block absolute top-[40px] left-[calc(50%+40px)] right-[calc(-50%+40px)] h-[2px] bg-slate-100/50 z-0">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "100%" }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
            className="h-full bg-gradient-to-r from-[#B24531]/40 to-[#B24531]/10 relative"
          >
            <motion.div
              animate={{ left: ["0%", "100%"], opacity: [0, 1, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#B24531] blur-[2px] shadow-[0_0_8px_rgba(178,69,49,0.8)]"
            />
          </motion.div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: parseInt(id) * 0.2 }}
        className="relative z-10 w-full flex flex-col items-center h-full"
      >
        {/* Step Badge with Glow */}
        <div className="relative mb-8 shrink-0">
          <motion.div
            animate={{
              boxShadow: ["0 0 0 0px rgba(178, 69, 49, 0)", "0 0 0 12px rgba(178, 69, 49, 0.03)", "0 0 0 0px rgba(178, 69, 49, 0)"]
            }}
            whileHover={{
              boxShadow: "0 0 0 15px rgba(178, 69, 49, 0.1)",
              scale: 1.05
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-20 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center shadow-lg relative z-10 transition-all duration-300"
          >
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-[#1E3A47] to-[#B24531]">
              {id}
            </span>
          </motion.div>
          <motion.div
            whileHover={{ rotate: 5, scale: 1.1 }}
            className="absolute -top-4 -right-4 w-12 h-12 rounded-2xl bg-[#B24531]/5 flex items-center justify-center text-[#B24531] shadow-sm z-20 transition-transform duration-300"
          >
            <Icon size={20} className="group-hover:animate-pulse" />
          </motion.div>
        </div>

        {/* Card */}
        <motion.div
          whileHover={{ y: -8 }}
          className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm hover:shadow-xl hover:border-[#B24531]/10 transition-all duration-500 text-center w-full max-w-sm group flex-1 flex flex-col cursor-default"
        >
          <div className="pt-2">
            <h4 className="text-2xl font-bold text-[#1E3A47] mb-6 group-hover:text-[#B24531] transition-colors">{title}</h4>
          </div>
          <div className="flex-1 flex flex-col">
            <p className="text-[#1E3A47]/60 font-medium leading-relaxed text-base">
              {desc}
            </p>
            <div className="flex-1 min-h-[2rem]" /> {/* Flexible empty space */}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

// --- REVEAL VARIANTS ---
const revealVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: "easeOut"
    }
  }
};

// --- 4. MAIN COMPONENT ---
const initialFormState: TutorApplication = {
  fullName: "",
  email: "",
  phone: "",
  headline: "",
  expertiseArea: "",
  yearsExperience: 0,
  courseTitle: "",
  availability: "",
  courseDescription: "",
  targetAudience: "",
};

const BecomeTutor: React.FC = () => {
  const [formData, setFormData] = useState<TutorApplication>({ ...initialFormState });
  const [, setLocation] = useLocation();

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeItem, setActiveItem] = useState<number | null>(null);

  // Typewriter state
  const fullText = "Your knowledge can change a career.";
  const [typedText, setTypedText] = useState("");

  const openLoginModal = () => {
    setLoginError(null);
    setShowLoginModal(true);
  };

  const closeLoginModal = () => {
    setShowLoginModal(false);
    setLoginEmail("");
    setLoginPassword("");
    setLoginError(null);
    setIsLoggingIn(false);
  };

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      setTypedText((prev: string) => fullText.slice(0, index + 1));
      index++;
      if (index === fullText.length) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, []);

  // Scroll Reveal Observer
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1 });

    const elements = document.querySelectorAll('.reveal');
    elements.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, []);

  // --- Scrollytelling Logic for How It Works ---
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: howItWorksScroll } = useScroll({
    target: howItWorksRef,
    offset: ["start start", "end end"]
  });

  // Circle Scaling
  const circleScale = useTransform(howItWorksScroll, [0, 0.25], [0, 35]);

  // Step Opacities
  const step1Opacity = useTransform(howItWorksScroll, [0.25, 0.35, 0.45, 0.5], [0, 1, 1, 0]);
  const step2Opacity = useTransform(howItWorksScroll, [0.5, 0.6, 0.7, 0.8], [0, 1, 1, 0]);
  const step3Opacity = useTransform(howItWorksScroll, [0.8, 0.85, 0.95, 1], [0, 1, 1, 1]);

  const steps = [
    {
      id: "01",
      title: "Submit Idea",
      desc: "Tell us about your expertise and proposed topic.",
      icon: <Lightbulb size={64} className="text-[#E5583E]" />,
      opacity: step1Opacity
    },
    {
      id: "02",
      title: "Design Syllabus",
      desc: "Collaborate with our curriculum experts and AI-powered guidance.",
      icon: <PenTool size={64} className="text-[#E5583E]" />,
      opacity: step2Opacity
    },
    {
      id: "03",
      title: "Launch & Earn",
      desc: "Go live on the platform. Track analytics and get paid.",
      icon: <Rocket size={64} className="text-[#E5583E]" />,
      opacity: step3Opacity
    }
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: TutorApplication) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAiGenerate = async () => {
    if (!formData.courseTitle || !formData.expertiseArea) {
      alert("Please enter a Course Title and Area of Expertise first.");
      return;
    }

    setIsGenerating(true);
    try {
      const description = await generateCourseDescription(formData.courseTitle, formData.expertiseArea);
      setFormData(prev => ({ ...prev, courseDescription: description }));
    } catch (error) {
      console.error("AI Generation failed", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTutorLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError("Please enter both email and password.");
      return;
    }

    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const response = await fetch("/api/tutors/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim().toLowerCase(), password: loginPassword }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message ?? "Wrong email or wrong password");
      }

      const payload = await response.json();
      const session: StoredSession = {
        accessToken: payload.session?.accessToken,
        accessTokenExpiresAt: payload.session?.accessTokenExpiresAt,
        refreshToken: payload.session?.refreshToken,
        refreshTokenExpiresAt: payload.session?.refreshTokenExpiresAt,
        sessionId: payload.session?.sessionId,
        role: payload.user?.role,
        userId: payload.user?.id,
        email: payload.user?.email,
        fullName: payload.user?.fullName,
      };

      writeStoredSession(session);
      resetSessionHeartbeat();

      const userPayload = {
        id: payload.user?.id,
        email: payload.user?.email,
        fullName: payload.user?.fullName,
        role: payload.user?.role,
        tutorId: payload.user?.tutorId,
        displayName: payload.user?.displayName,
      };

      localStorage.setItem("user", JSON.stringify(userPayload));
      localStorage.setItem("isAuthenticated", "true");

      closeLoginModal();
      setLocation("/tutors");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Wrong email or wrong password");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitMessage(null);
    setIsSubmitting(true);

    const payload = {
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phone?.trim() || undefined,
      headline: formData.headline.trim(),
      courseTitle: formData.courseTitle.trim(),
      courseDescription: formData.courseDescription.trim(),
      targetAudience: formData.targetAudience.trim(),
      expertiseArea: formData.expertiseArea.trim(),
      experienceYears: Number(formData.yearsExperience) || 0,
      availability: formData.availability.trim(),
    };

    try {
      const res = await fetch("/api/tutor-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.message ?? "Failed to submit tutor application.");
      }

      setSubmitMessage("Proposal submitted successfully! Our team will be in touch soon.");
      setFormData({ ...initialFormState });
    } catch (error) {
      setSubmitMessage(error instanceof Error ? error.message : "Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#FDFCF0] text-[#1E3A47] overflow-x-hidden font-sans">
      <GrainOverlay />

      {/* Hero Section */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={revealVariants}
        className="relative flex items-center justify-center pt-20 pb-4 px-6 md:px-12 overflow-hidden"
      >
        {/* Ambient Hero Background with subtle animation */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1400px] h-full pointer-events-none">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.4, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-[-5%] left-[20%] w-[60%] h-[70%] rounded-full bg-slate-100/30 blur-[120px]"
          />
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.3, 0.2],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
            className="absolute bottom-5 right-[10%] w-[40%] h-[50%] rounded-full bg-slate-50/20 blur-[100px]"
          />
        </div>

        <div className="max-w-[1400px] mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] bg-white text-slate-500 border border-slate-200 shadow-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            New Cohort 2026
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1E3A47] tracking-tight mb-4 leading-[1.2] max-w-4xl mx-auto drop-shadow-sm py-2"
            style={{ letterSpacing: "-0.02em" }}
          >
            {typedText}
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-8"
          >
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
              className="text-base md:text-lg text-slate-500/80 font-normal max-w-2xl mx-auto leading-relaxed"
            >
              Built with AI-powered tools, transparent earnings, and full creator control.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <motion.button
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => document.getElementById('apply-form')?.scrollIntoView({ behavior: 'smooth' })}
                className="group relative w-full sm:w-auto px-8 py-4 bg-[#B24531] text-white font-semibold text-sm rounded-xl shadow-xl shadow-[#B24531]/20 overflow-hidden transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 group-hover:translate-x-full transition-transform duration-1000 -translate-x-full" />
                <span className="relative">Apply as Tutor</span>
              </motion.button>

              <motion.button
                whileHover={{ y: -4, backgroundColor: 'rgba(30, 58, 71, 0.05)', scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={openLoginModal}
                className="w-full sm:w-auto px-8 py-4 border border-slate-200 bg-white/50 backdrop-blur-sm text-[#1E3A47] font-semibold text-sm rounded-xl transition-all duration-300 shadow-sm"
              >
                Tutor Login
              </motion.button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-sm text-[#1E3A47]/40 font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-4"
            >
              <span className="w-8 h-[1px] bg-[#1E3A47]/20" />
              No upfront costs. No exclusivity. You stay in control.
              <span className="w-8 h-[1px] bg-[#1E3A47]/20" />
            </motion.p>
          </motion.div>
        </div>
      </motion.section>

      {/* Why Teach Section - Live Capability Feed Marquee */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={revealVariants}
        className="pt-12 pb-4 bg-[#FDFCF0] relative overflow-hidden"
      >
        {/* Background Atmosphere */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(#1E3A47 1px, transparent 1px), linear-gradient(90deg, #1E3A47 1px, transparent 1px)',
              backgroundSize: '100px 100px',
              maskImage: 'radial-gradient(circle at center, black, transparent 80%)'
            }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-100/20 blur-[130px] rounded-full" />
        </div>

        <div className="max-w-[1400px] mx-auto px-6 md:px-12 relative z-10 mb-0">
          <SectionHeader
            badge="ECOSYSTEM READY"
            title="Why teach with us?"
            subline="Experience a living platform that works as hard as you do."
          />
        </div>

        {/* The Live Capability Rails */}
        <div className="relative space-y-4 pb-8 pt-2">
          {/* Rail 1: Forward */}
          <CapabilityMarquee
            items={[
              {
                title: "Create or Delegate",
                badge: "Builder",
                mockup: <MiniCourseBuilder />,
                desc: "Design and own your content end-to-end. If you request our team to create content for you, this service is chargeable."
              },
              {
                title: "Earn Transparently",
                badge: "Payouts",
                mockup: <MiniEarnings />,
                desc: "Earn through a revenue split based on course performance. 80/20 split with your APIs, 70/30 with platform APIs."
              },
              {
                title: "Grow With AI",
                badge: "Intelligence",
                mockup: <MiniAI />,
                desc: "AI-assisted follow-up messaging that helps tutors communicate clearly and professionally with students."
              },
              {
                title: "Track Everything",
                badge: "Metrics",
                mockup: <MiniAnalytics />,
                desc: "Monitor enrollments, engagement, payouts, and learner follow-ups in real time."
              }
            ]}
          />

          {/* Horizontal Gradient Overlays */}
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-gradient-to-r from-[#FDFCF0] to-transparent z-20 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-gradient-to-l from-[#FDFCF0] to-transparent z-20 pointer-events-none" />
        </div>

      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={revealVariants}
        className="pt-4 pb-32 px-6 md:px-12 bg-[#FAF9F6] relative overflow-hidden"
      >
        <FloatingShapes />

        <div className="max-w-[1400px] mx-auto relative z-10">
          <SectionHeader
            badge="THE PROCESS"
            title="How it works"
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch mt-16 relative">
            <JourneyStep
              id="01"
              title="Submit Idea"
              desc="Validate real learner demand using platform insights and data signals."
              icon={Lightbulb}
              isLast={false}
            />
            <JourneyStep
              id="02"
              title="Design Syllabus"
              desc="Co-create your syllabus with curriculum experts and AI-powered guidance."
              icon={PenTool}
              isLast={false}
            />
            <JourneyStep
              id="03"
              title="Launch & Earn"
              desc="Launch your course, track performance, and grow earnings with real-time insights."
              icon={Rocket}
              isLast={true}
            />
          </div>
        </div>
      </motion.section>

      {/* Intelligence Spotlight */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={revealVariants}
        className="py-12 px-6 md:px-12 bg-white relative overflow-hidden"
      >
        <div className="max-w-6xl mx-auto bg-[#B24531] rounded-[2rem] py-16 px-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
          </div>

          <div className="max-w-4xl mx-auto text-center relative z-10 text-white">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 mb-6"
            >
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">Intelligence Spotlight</span>
            </motion.div>

            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-2xl md:text-3xl lg:text-4xl font-black leading-tight tracking-tight"
            >
              “Know who needs attention, when to intervene, and how to follow up — automatically.”
            </motion.h3>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="mt-8 text-[10px] font-bold tracking-[0.3em] uppercase text-white/40"
            >
              AI-Driven Tutor Dashboard
            </motion.p>
          </div>
        </div>
      </motion.section>

      {/* Application Form Section */}
      <motion.section
        id="apply-form"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.05 }}
        variants={revealVariants}
        className="py-24 px-6 md:px-12 bg-[#A64632] relative scroll-mt-20"
      >
        <div className="max-w-[1400px] mx-auto relative z-10">
          <SectionHeader
            badge="Join the Team"
            title="Ready to make an impact?"
            subline="Fill out the form below to apply. We review every application personally."
            light
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-[#FDFCF0] rounded-[3rem] p-8 md:p-16 shadow-2xl shadow-black/20 border border-white/10"
          >
            <form onSubmit={handleSubmit} className="space-y-16">
              {/* Personal Details */}
              <div className="space-y-8">
                <div className="flex items-center gap-4 border-b border-[#1E3A47]/10 pb-4">
                  <ShieldCheck className="w-5 h-5 text-[#B24531]" />
                  <h4 className="text-[15px] font-black uppercase tracking-widest text-[#B24531]">Personal Details</h4>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {[
                    { label: 'Full Name', name: 'fullName', type: 'text', placeholder: 'John Doe' },
                    { label: 'Email Address', name: 'email', type: 'email', placeholder: 'john@example.com' },
                    { label: 'Phone Number', name: 'phone', type: 'tel', placeholder: '+1 (555) 000-0000' },
                    { label: 'Professional Headline', name: 'headline', type: 'text', placeholder: 'Sr. AI Engineer' }
                  ].map((field) => (
                    <div key={field.name} className="space-y-2">
                      <label className="text-[13px] font-black uppercase tracking-wider text-[#1E3A47]/40 px-1">{field.label}</label>
                      <input
                        type={field.type}
                        name={field.name}
                        value={(formData as any)[field.name]}
                        onChange={handleChange}
                        className="w-full bg-white border-2 border-transparent focus:border-[#B24531]/20 rounded-2xl px-6 py-4 text-[18px] text-[#1E3A47] font-bold placeholder-[#1E3A47]/20 focus:outline-none focus:ring-4 focus:ring-[#B24531]/5 transition-all"
                        placeholder={field.placeholder}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Expertise & Proposal */}
              <div className="space-y-8">
                <div className="flex items-center gap-4 border-b border-[#1E3A47]/10 pb-4">
                  <Brain className="w-5 h-5 text-[#B24531]" />
                  <h4 className="text-[15px] font-black uppercase tracking-widest text-[#B24531]">Expertise & Proposal</h4>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[13px] font-black uppercase tracking-wider text-[#1E3A47]/40 px-1">Area of Expertise</label>
                    <input
                      type="text"
                      name="expertiseArea"
                      value={formData.expertiseArea}
                      onChange={handleChange}
                      className="w-full bg-white border-2 border-transparent focus:border-[#B24531]/20 rounded-2xl px-6 py-4 text-[18px] text-[#1E3A47] font-bold placeholder-[#1E3A47]/20 focus:outline-none focus:ring-4 focus:ring-[#B24531]/5 transition-all"
                      placeholder="e.g. LLMs, Python, Computer Vision"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-black uppercase tracking-wider text-[#1E3A47]/40 px-1">Years of Experience</label>
                    <input
                      type="number"
                      name="yearsExperience"
                      value={formData.yearsExperience}
                      onChange={handleChange}
                      className="w-full bg-white border-2 border-transparent focus:border-[#B24531]/20 rounded-2xl px-6 py-4 text-[18px] text-[#1E3A47] font-bold placeholder-[#1E3A47]/20 focus:outline-none focus:ring-4 focus:ring-[#B24531]/5 transition-all"
                      placeholder="e.g. 5"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-black uppercase tracking-wider text-[#1E3A47]/40 px-1">Proposed Course Title</label>
                    <input
                      type="text"
                      name="courseTitle"
                      value={formData.courseTitle}
                      onChange={handleChange}
                      className="w-full bg-white border-2 border-transparent focus:border-[#B24531]/20 rounded-2xl px-6 py-4 text-[18px] text-[#1E3A47] font-bold placeholder-[#1E3A47]/20 focus:outline-none focus:ring-4 focus:ring-[#B24531]/5 transition-all"
                      placeholder="e.g. Advanced RAG Systems"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-black uppercase tracking-wider text-[#1E3A47]/40 px-1">Availability</label>
                    <div className="relative">
                      <select
                        name="availability"
                        value={formData.availability}
                        onChange={handleChange}
                        className="w-full bg-white border-2 border-transparent focus:border-[#B24531]/20 rounded-2xl px-6 py-4 text-[18px] text-[#1E3A47] font-bold placeholder-[#1E3A47]/20 focus:outline-none focus:ring-4 focus:ring-[#B24531]/5 transition-all cursor-pointer"
                      >
                        <option value="">Select availability</option>
                        <option value="immediate">Immediately</option>
                        <option value="1month">In 1 month</option>
                        <option value="3months">In 3 months</option>
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-[#B24531]">
                        <ArrowRight className="w-4 h-4 rotate-90" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[13px] font-black uppercase tracking-wider text-[#1E3A47]/40">Course Description</label>
                      <button
                        type="button"
                        onClick={handleAiGenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-2 text-xs font-black text-[#B24531] hover:text-[#E64833] disabled:opacity-50 transition-colors uppercase tracking-widest bg-[#B24531]/5 px-3 py-1 rounded-full"
                      >
                        {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        {isGenerating ? 'Thinking...' : 'AI Assist'}
                      </button>
                    </div>
                    <textarea
                      name="courseDescription"
                      rows={4}
                      value={formData.courseDescription}
                      onChange={handleChange}
                      className="w-full bg-white border-2 border-transparent focus:border-[#B24531]/20 rounded-2xl px-6 py-4 text-[18px] text-[#1E3A47] font-bold placeholder-[#1E3A47]/20 focus:outline-none focus:ring-4 focus:ring-[#B24531]/5 transition-all resize-none"
                      placeholder="Briefly describe the curriculum..."
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[13px] font-black uppercase tracking-wider text-[#1E3A47]/40 px-1 pt-1 block">Target Audience</label>
                    <textarea
                      name="targetAudience"
                      rows={4}
                      value={formData.targetAudience}
                      onChange={handleChange}
                      className="w-full bg-white border-2 border-transparent focus:border-[#B24531]/20 rounded-2xl px-6 py-4 text-[18px] text-[#1E3A47] font-bold placeholder-[#1E3A47]/20 focus:outline-none focus:ring-4 focus:ring-[#B24531]/5 transition-all resize-none"
                      placeholder="Who is this for?"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Action */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-12 pt-12 border-t border-[#1E3A47]/10">
                <div className="flex items-start gap-4 text-[#1E3A47]/40 max-w-sm">
                  <CheckCircle2 size={24} className="text-[#B24531] shrink-0" />
                  <p className="text-xs font-medium leading-relaxed">
                    By submitting, you agree to our Terms. We review every application personally within 48 hours.
                  </p>
                </div>

                <div className="w-full md:w-auto text-center md:text-right space-y-4">
                  <motion.button
                    type="submit"
                    disabled={isSubmitting}
                    whileHover={{ y: -4, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full md:w-auto px-16 py-6 bg-[#B24531] text-white font-black text-lg rounded-2xl shadow-2xl shadow-[#B24531]/20 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Application"}
                    {!isSubmitting && <ArrowRight size={20} strokeWidth={3} />}
                  </motion.button>
                  {submitMessage && (
                    <p className={`text-sm font-bold ${submitMessage.includes('successfully') ? 'text-emerald-600' : 'text-[#B24531]'}`}>
                      {submitMessage}
                    </p>
                  )}
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      </motion.section>

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[100] px-6 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeLoginModal}
              className="absolute inset-0 bg-[#1E3A47]/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg rounded-[3rem] bg-[#FDFCF0] p-12 shadow-2xl text-left border border-[#1E3A47]/5"
            >
              <button
                type="button"
                onClick={closeLoginModal}
                className="absolute right-8 top-8 text-[#1E3A47]/40 hover:text-[#B24531] transition-colors"
              >
                <X size={24} />
              </button>

              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#B24531]">
                  Tutor Console
                </p>
                <h3 className="text-4xl font-black text-[#1E3A47] tracking-tight">Welcome back</h3>
                <p className="text-sm text-[#1E3A47]/60 font-medium">
                  Access your courses, enrollments, and learner progress.
                </p>
              </div>

              <form className="mt-12 space-y-6" onSubmit={handleTutorLogin}>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#1E3A47]/40 px-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full rounded-2xl border-2 border-transparent bg-white px-6 py-4 text-[#1E3A47] font-bold placeholder-[#1E3A47]/20 focus:border-[#B24531]/20 focus:outline-none focus:ring-4 focus:ring-[#B24531]/5 transition-all"
                    placeholder="you@ottolearn.com"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#1E3A47]/40 px-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full rounded-2xl border-2 border-transparent bg-white px-6 py-4 text-[#1E3A47] font-bold placeholder-[#1E3A47]/20 focus:border-[#B24531]/20 focus:outline-none focus:ring-4 focus:ring-[#B24531]/5 transition-all"
                    placeholder="••••••••"
                  />
                </div>

                {loginError && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs font-bold text-[#B24531] bg-[#B24531]/5 rounded-xl px-4 py-3"
                  >
                    {loginError}
                  </motion.p>
                )}

                <motion.button
                  type="submit"
                  disabled={isLoggingIn}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full rounded-2xl bg-[#B24531] py-5 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-[#B24531]/20 transition-all disabled:opacity-50"
                >
                  {isLoggingIn ? "Signing in..." : "Login to Console"}
                </motion.button>

                <p className="text-center text-[10px] font-bold text-[#1E3A47]/40 uppercase tracking-widest">
                  Protected by OttoLearn Security
                </p>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Branding */}
      <motion.footer
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={revealVariants}
        className="py-12 bg-[#FDFCF0] text-center border-t border-[#1E3A47]/5"
      >
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#1E3A47]/20">
          Ottolearn Tutor Platform © 2026
        </p>
      </motion.footer>
    </div>
  );
};

export default BecomeTutor;
