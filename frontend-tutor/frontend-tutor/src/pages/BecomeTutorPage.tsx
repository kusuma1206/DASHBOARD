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
  MessageSquare
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
  <div className="mb-16 text-center max-w-3xl mx-auto">
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

const StepItem = ({ id, title, desc }: { id: string; title: string; desc: string }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start center", "center center", "center start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [0.15, 1, 1, 0.15]);
  const scale = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [0.95, 1, 1, 0.95]);
  const fillProgress = useTransform(scrollYProgress, [0, 0.45, 0.55, 1], [0, 1, 1, 1]);

  return (
    <motion.div
      ref={ref}
      style={{ opacity, scale }}
      className="flex flex-col md:flex-row items-center gap-12 md:gap-24 py-16 border-b border-[#1E3A47]/5 last:border-0"
    >
      <div className="relative flex-shrink-0">
        <div className="text-[10rem] md:text-[12rem] font-black leading-none select-none relative"
          style={{
            WebkitTextStroke: '2px rgba(30, 58, 71, 0.08)',
            color: 'transparent',
            letterSpacing: '-0.05em'
          }}
        >
          {id}
          <motion.div
            className="absolute bottom-0 left-0 right-0 overflow-hidden text-[#B24531] pointer-events-none"
            style={{
              height: useTransform(fillProgress, [0, 1], ["0%", "100%"])
            }}
          >
            <div className="text-[10rem] md:text-[12rem] font-black leading-none absolute bottom-0"
              style={{ letterSpacing: '-0.05em' }}
            >
              {id}
            </div>
          </motion.div>
        </div>
      </div>
      <div className="flex-1 text-center md:text-left">
        <h4 className="text-3xl md:text-5xl font-black text-[#1E3A47] tracking-tighter leading-[0.85] max-w-xl">
          {title}
        </h4>
        <p className="mt-6 text-lg md:text-xl text-[#1E3A47]/40 font-bold max-w-2xl leading-relaxed">
          {desc}
        </p>
      </div>
    </motion.div>
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
      desc: "Collaborate with our curriculum experts.",
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
        className="relative pt-32 pb-24 px-6 md:px-12 overflow-hidden"
      >
        {/* Ambient Hero Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1400px] h-full pointer-events-none">
          <div className="absolute top-[-10%] left-[20%] w-[60%] h-[80%] rounded-full bg-orange-100/30 blur-[120px]" />
          <div className="absolute bottom-0 right-[10%] w-[40%] h-[60%] rounded-full bg-amber-50/20 blur-[100px]" />
        </div>

        <div className="max-w-[1400px] mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-8 text-[10px] font-black uppercase tracking-[0.2em] bg-[#B24531]/10 text-[#B24531]"
          >
            New Cohort 2026
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black text-[#1E3A47] tracking-tighter mb-10 leading-[0.9] md:leading-[1.1] min-h-[1.2em]"
          >
            {typedText}
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-12"
          >
            <p className="text-xl md:text-2xl text-[#1E3A47]/60 font-medium max-w-2xl mx-auto leading-relaxed">
              Built with AI-powered tools, transparent earnings, and full creator control.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <motion.button
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => document.getElementById('apply-form')?.scrollIntoView({ behavior: 'smooth' })}
                className="group relative w-full sm:w-auto px-10 py-5 bg-[#B24531] text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-2xl shadow-[#B24531]/20 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 group-hover:translate-x-full transition-transform duration-1000 -translate-x-full" />
                <span className="relative">Apply as Tutor</span>
                {/* Subtle Pulse */}
                <span className="absolute inset-0 rounded-2xl bg-[#B24531] animate-ping opacity-20 scale-110 pointer-events-none" />
              </motion.button>

              <motion.button
                whileHover={{ y: -4, backgroundColor: 'rgba(30, 58, 71, 0.05)' }}
                whileTap={{ scale: 0.98 }}
                onClick={openLoginModal}
                className="w-full sm:w-auto px-10 py-5 border-2 border-[#1E3A47]/10 text-[#1E3A47] font-black text-sm uppercase tracking-widest rounded-2xl transition-all"
              >
                Tutor Login
              </motion.button>
            </div>

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

      {/* Why Teach Section */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={revealVariants}
        className="py-16 px-6 md:px-12 bg-[#F7F3E3]"
      >
        <div className="max-w-[1400px] mx-auto">
          <SectionHeader
            title="Why teach with us?"
            subline="We provide the tools and transparency for you to scale your impact."
          />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <Layout className="w-6 h-6" />,
                title: "Create or Delegate",
                desc: "Design and own your content end-to-end. If you request our team to create content for you, this service is chargeable."
              },
              {
                icon: <TrendingUp className="w-6 h-6" />,
                title: "Earn Transparently",
                desc: "Earn through a revenue split based on course performance. 80/20 split with your APIs, 70/30 with platform APIs."
              },
              {
                icon: <Brain className="w-6 h-6" />,
                title: "Grow With AI",
                desc: "AI-assisted follow-up messaging that helps tutors communicate clearly and professionally with students."
              },
              {
                icon: <BarChart3 className="w-6 h-6" />,
                title: "Track Everything",
                desc: "Monitor enrollments, engagement, payouts, and learner follow-ups in real time."
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="p-8 rounded-[2rem] bg-white border border-[#1E3A47]/5 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#B24531]/5 flex items-center justify-center text-[#B24531] mb-6">
                  {item.icon}
                </div>
                <h4 className="text-xl font-black text-[#1E3A47] mb-4">{item.title}</h4>
                <p className="text-[#1E3A47]/60 font-medium leading-relaxed text-sm">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Step Flow Section - Scroll-Linked Highlighting */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={revealVariants}
        className="py-20 px-6 md:px-12 bg-white relative"
      >
        <div className="max-w-[1200px] mx-auto relative z-10">
          <SectionHeader
            badge="The Process"
            title="How it works"
          />

          <div className="space-y-0">
            {[
              {
                id: "01",
                title: "Submit Idea",
                desc: "Validate demand using platform insights."
              },
              {
                id: "02",
                title: "Design Syllabus",
                desc: "Collaborate with curriculum experts and AI assistance."
              },
              {
                id: "03",
                title: "Launch & Earn",
                desc: "Track engagement, performance, payouts, and learner follow-ups in real time."
              }
            ].map((step) => (
              <StepItem key={step.id} {...step} />
            ))}
          </div>
        </div>
      </motion.section>

      {/* Intelligence Spotlight */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={revealVariants}
        className="py-20 px-6 md:px-12 bg-[#B24531] text-white overflow-hidden relative"
      >
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        </div>

        <div className="max-w-[1400px] mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 mb-12"
          >
            <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-[0.4em] text-white/60">Intelligence Spotlight</span>
          </motion.div>

          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-6xl font-black max-w-5xl mx-auto leading-[1.15] tracking-tight"
          >
            “Know who needs attention, when to intervene, and how to follow up — automatically.”
          </motion.h3>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-12 text-sm font-bold tracking-[0.3em] uppercase text-white/40"
          >
            AI-Driven Tutor Dashboard
          </motion.p>
        </div>
      </motion.section>

      {/* Application Form Section */}
      <motion.section
        id="apply-form"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.05 }}
        variants={revealVariants}
        className="py-24 px-6 md:px-12 bg-[#B24531] relative scroll-mt-20"
      >
        <div className="absolute top-0 left-0 w-full h-1/2 bg-white pointer-events-none" />

        <div className="max-w-[1400px] mx-auto relative z-10">
          <SectionHeader
            badge="Join the Team"
            title="Ready to make an impact?"
            subline="Fill out the form below to apply. We review every application personally."
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-white rounded-[3rem] p-8 md:p-16 shadow-2xl shadow-black/10 border border-[#1E3A47]/5"
          >
            <form onSubmit={handleSubmit} className="space-y-16">
              {/* Personal Details */}
              <div className="space-y-8">
                <div className="flex items-center gap-4 border-b border-[#1E3A47]/10 pb-4">
                  <ShieldCheck className="w-5 h-5 text-[#B24531]" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#B24531]">Personal Details</h4>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {[
                    { label: 'Full Name', name: 'fullName', type: 'text', placeholder: 'John Doe' },
                    { label: 'Email Address', name: 'email', type: 'email', placeholder: 'john@example.com' },
                    { label: 'Phone Number', name: 'phone', type: 'tel', placeholder: '+1 (555) 000-0000' },
                    { label: 'Professional Headline', name: 'headline', type: 'text', placeholder: 'Sr. AI Engineer' }
                  ].map((field) => (
                    <div key={field.name} className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-[#1E3A47]/40 px-1">{field.label}</label>
                      <input
                        type={field.type}
                        name={field.name}
                        value={(formData as any)[field.name]}
                        onChange={handleChange}
                        className="w-full bg-[#FDFCF0] border-2 border-transparent focus:border-[#B24531]/20 rounded-2xl px-6 py-4 text-[#1E3A47] font-bold placeholder-[#1E3A47]/20 focus:outline-none focus:ring-4 focus:ring-[#B24531]/5 transition-all"
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
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#B24531]">Expertise & Proposal</h4>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[#1E3A47]/40 px-1">Area of Expertise</label>
                    <input
                      type="text"
                      name="expertiseArea"
                      value={formData.expertiseArea}
                      onChange={handleChange}
                      className="w-full bg-[#FDFCF0] border-2 border-transparent focus:border-[#B24531]/20 rounded-2xl px-6 py-4 text-[#1E3A47] font-bold placeholder-[#1E3A47]/20 focus:outline-none focus:ring-4 focus:ring-[#B24531]/5 transition-all"
                      placeholder="e.g. LLMs, Python, Computer Vision"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[#1E3A47]/40 px-1">Years of Experience</label>
                    <input
                      type="number"
                      name="yearsExperience"
                      value={formData.yearsExperience}
                      onChange={handleChange}
                      className="w-full bg-[#FDFCF0] border-2 border-transparent focus:border-[#B24531]/20 rounded-2xl px-6 py-4 text-[#1E3A47] font-bold placeholder-[#1E3A47]/20 focus:outline-none focus:ring-4 focus:ring-[#B24531]/5 transition-all"
                      placeholder="e.g. 5"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[#1E3A47]/40 px-1">Proposed Course Title</label>
                    <input
                      type="text"
                      name="courseTitle"
                      value={formData.courseTitle}
                      onChange={handleChange}
                      className="w-full bg-[#FDFCF0] border-2 border-transparent focus:border-[#B24531]/20 rounded-2xl px-6 py-4 text-[#1E3A47] font-bold placeholder-[#1E3A47]/20 focus:outline-none focus:ring-4 focus:ring-[#B24531]/5 transition-all"
                      placeholder="e.g. Advanced RAG Systems"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[#1E3A47]/40 px-1">Availability</label>
                    <div className="relative">
                      <select
                        name="availability"
                        value={formData.availability}
                        onChange={handleChange}
                        className="w-full bg-[#FDFCF0] border-2 border-transparent focus:border-[#B24531]/20 rounded-2xl px-6 py-4 text-[#1E3A47] font-bold appearance-none focus:outline-none focus:ring-4 focus:ring-[#B24531]/5 transition-all cursor-pointer"
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
                      <label className="text-[10px] font-black uppercase tracking-wider text-[#1E3A47]/40">Course Description</label>
                      <button
                        type="button"
                        onClick={handleAiGenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-2 text-[10px] font-black text-[#B24531] hover:text-[#E64833] disabled:opacity-50 transition-colors uppercase tracking-widest bg-[#B24531]/5 px-3 py-1 rounded-full"
                      >
                        {isGenerating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                        {isGenerating ? 'Thinking...' : 'AI Assist'}
                      </button>
                    </div>
                    <textarea
                      name="courseDescription"
                      rows={4}
                      value={formData.courseDescription}
                      onChange={handleChange}
                      className="w-full bg-[#FDFCF0] border-2 border-transparent focus:border-[#B24531]/20 rounded-2xl px-6 py-4 text-[#1E3A47] font-bold placeholder-[#1E3A47]/20 focus:outline-none focus:ring-4 focus:ring-[#B24531]/5 transition-all resize-none"
                      placeholder="Briefly describe the curriculum..."
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[#1E3A47]/40 px-1 pt-1 block">Target Audience</label>
                    <textarea
                      name="targetAudience"
                      rows={4}
                      value={formData.targetAudience}
                      onChange={handleChange}
                      className="w-full bg-[#FDFCF0] border-2 border-transparent focus:border-[#B24531]/20 rounded-2xl px-6 py-4 text-[#1E3A47] font-bold placeholder-[#1E3A47]/20 focus:outline-none focus:ring-4 focus:ring-[#B24531]/5 transition-all resize-none"
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
