import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/common/Logo";
import { PasswordInput } from "@/components/forms/PasswordInput";
import { toast } from "sonner";
import {
  Loader2,
  Mail,
  Smartphone,
  KeyRound,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { getEmailLockout, getGlobalLockout, recordFailedAttempt, resetAttempts } from "@/utils/auth-limiter";
import { sendWelcomeEmail, sendPasswordResetEmail } from "@/api/email.functions";

type AuthTab = "email-otp" | "sms-otp" | "password";

const passwordSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Min 6 characters"),
  fullName: z.string().min(2, "Enter your name").optional(),
});

export function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Active authentication tab
  const [activeTab, setActiveTab] = useState<AuthTab>("email-otp");

  // Email OTP state
  const [emailOtpAddress, setEmailOtpAddress] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [emailCooldown, setEmailCooldown] = useState(0);

  // SMS OTP state (+91 Indian numbers)
  const [mobileNumber, setMobileNumber] = useState("");
  const [smsOtpSent, setSmsOtpSent] = useState(false);
  const [smsOtpCode, setSmsOtpCode] = useState("");
  const [smsCooldown, setSmsCooldown] = useState(0);
  const [smsConfigError, setSmsConfigError] = useState<string | null>(null);

  // Password fallback state
  const [mode, setMode] = useState<"signin" | "signup" | "forgot-password">("signin");
  const [passwordEmail, setPasswordEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Common UI states
  const [busy, setBusy] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);
  const [isGlobalLockout, setIsGlobalLockout] = useState(false);
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [showCustomEmailInput, setShowCustomEmailInput] = useState(false);

  // Cooldown timer interval ref
  const emailTimerRef = useRef<NodeJS.Timeout | null>(null);
  const smsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Parse redirect query param safely
  const redirect = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("redirect") || undefined
    : undefined;

  // Rate-limiting / lockout monitoring
  useEffect(() => {
    const checkStatus = () => {
      const globalLimit = getGlobalLockout();
      if (globalLimit.locked) {
        setLockoutTime(globalLimit.remainingSeconds);
        setIsGlobalLockout(true);
        return;
      }

      const activeEmail = activeTab === "password" ? passwordEmail : emailOtpAddress;
      if (activeEmail) {
        const emailLimit = getEmailLockout(activeEmail);
        if (emailLimit.locked) {
          setLockoutTime(emailLimit.remainingSeconds);
          setIsGlobalLockout(false);
          return;
        }
      }

      setLockoutTime(0);
    };

    checkStatus();
    const timer = setInterval(checkStatus, 1000);
    return () => clearInterval(timer);
  }, [passwordEmail, emailOtpAddress, activeTab]);

  // Navigate once authenticated
  useEffect(() => {
    if (user) {
      const destination = redirect && redirect.startsWith("/") ? redirect : "/";
      navigate({ to: destination });
    }
  }, [user, navigate, redirect]);

  // Countdown timer handles
  const startEmailCooldown = (seconds = 60) => {
    setEmailCooldown(seconds);
    if (emailTimerRef.current) clearInterval(emailTimerRef.current);
    emailTimerRef.current = setInterval(() => {
      setEmailCooldown((prev) => {
        if (prev <= 1) {
          if (emailTimerRef.current) clearInterval(emailTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startSmsCooldown = (seconds = 60) => {
    setSmsCooldown(seconds);
    if (smsTimerRef.current) clearInterval(smsTimerRef.current);
    smsTimerRef.current = setInterval(() => {
      setSmsCooldown((prev) => {
        if (prev <= 1) {
          if (smsTimerRef.current) clearInterval(smsTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (emailTimerRef.current) clearInterval(emailTimerRef.current);
      if (smsTimerRef.current) clearInterval(smsTimerRef.current);
    };
  }, []);

  // Helpers to mask destination for privacy
  const maskEmail = (mail: string) => {
    const [userPart, domain] = mail.split("@");
    if (!domain) return mail;
    const maskedUser = userPart.length > 2
      ? `${userPart[0]}***${userPart[userPart.length - 1]}`
      : `${userPart}***`;
    return `${maskedUser}@${domain}`;
  };

  const maskPhone = (phone: string) => {
    if (phone.length < 10) return phone;
    return `+91 ${phone.slice(0, 2)}•••• ••${phone.slice(-2)}`;
  };

  // =========================================================================
  // MODULE A: EMAIL OTP HANDLERS
  // =========================================================================
  const handleRequestEmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsed = z.string().email("Please enter a valid email address").safeParse(emailOtpAddress.trim());
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    if (emailCooldown > 0) {
      toast.info(`Please wait ${emailCooldown}s before requesting a new code.`);
      return;
    }

    setBusy(true);
    try {
      const cleanEmail = emailOtpAddress.trim().toLowerCase();
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      setEmailOtpSent(true);
      startEmailCooldown(60);
      toast.success(`Verification code sent to ${maskEmail(cleanEmail)}!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send email verification code");
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyEmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (emailOtpCode.length < 6) {
      toast.error("Please enter the complete 6-digit verification code");
      return;
    }

    setBusy(true);
    try {
      const cleanEmail = emailOtpAddress.trim().toLowerCase();
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: emailOtpCode.trim(),
        type: "email",
      });

      if (error) {
        if (error.message.toLowerCase().includes("expired")) {
          throw new Error("This verification code has expired. Please request a new one.");
        }
        if (error.message.toLowerCase().includes("invalid")) {
          throw new Error("Incorrect code. Please check and try again.");
        }
        throw error;
      }

      if (data.session) {
        resetAttempts(cleanEmail);
        toast.success("Signed in successfully!");
        const destination = redirect && redirect.startsWith("/") ? redirect : "/";
        navigate({ to: destination });
      }
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  // =========================================================================
  // MODULE A: SMS OTP HANDLERS (+91 INDIA)
  // =========================================================================
  const cleanIndianMobile = (input: string) => {
    const digitsOnly = input.replace(/\D/g, "");
    if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
      return digitsOnly.slice(2);
    }
    if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
      return digitsOnly.slice(1);
    }
    return digitsOnly;
  };

  const validateIndianMobile = (phone: string) => {
    const clean = cleanIndianMobile(phone);
    if (!/^[6-9]\d{9}$/.test(clean)) {
      return {
        valid: false,
        error: "Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9)",
      };
    }
    return { valid: true, clean };
  };

  const handleRequestSmsOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSmsConfigError(null);

    const validation = validateIndianMobile(mobileNumber);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    if (smsCooldown > 0) {
      toast.info(`Please wait ${smsCooldown}s before requesting a new code.`);
      return;
    }

    setBusy(true);
    try {
      const e164Phone = `+91${validation.clean}`;
      const { error } = await supabase.auth.signInWithOtp({
        phone: e164Phone,
        options: {
          channel: "sms",
        },
      });

      if (error) {
        // Clear message if SMS provider credentials are not yet configured in Supabase
        if (
          error.message.toLowerCase().includes("provider") ||
          error.message.toLowerCase().includes("gateway") ||
          error.message.toLowerCase().includes("sms_disabled") ||
          error.message.toLowerCase().includes("not configured")
        ) {
          const configMsg =
            "SMS Gateway is not yet activated in your Supabase Auth settings. Please configure Twilio or MessageBird in your Supabase Dashboard, or use Email OTP below.";
          setSmsConfigError(configMsg);
          throw new Error(configMsg);
        }
        throw error;
      }

      setSmsOtpSent(true);
      startSmsCooldown(60);
      toast.success(`Verification code dispatched to ${maskPhone(validation.clean!)}!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to dispatch SMS verification code");
    } finally {
      setBusy(false);
    }
  };

  const handleVerifySmsOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (smsOtpCode.length < 6) {
      toast.error("Please enter the complete 6-digit verification code");
      return;
    }

    setBusy(true);
    try {
      const validation = validateIndianMobile(mobileNumber);
      if (!validation.valid) throw new Error("Invalid phone number format");

      const e164Phone = `+91${validation.clean}`;
      const { data, error } = await supabase.auth.verifyOtp({
        phone: e164Phone,
        token: smsOtpCode.trim(),
        type: "sms",
      });

      if (error) {
        if (error.message.toLowerCase().includes("expired")) {
          throw new Error("This verification code has expired. Please request a new one.");
        }
        if (error.message.toLowerCase().includes("invalid")) {
          throw new Error("Incorrect code. Please check and try again.");
        }
        throw error;
      }

      if (data.session) {
        toast.success("Phone verified! Signed in successfully.");
        const destination = redirect && redirect.startsWith("/") ? redirect : "/";
        navigate({ to: destination });
      }
    } catch (err: any) {
      toast.error(err.message || "Phone verification failed");
    } finally {
      setBusy(false);
    }
  };

  // =========================================================================
  // PASSWORD-BASED SIGN IN & REGISTRATION HANDLER (PRESERVED FALLBACK)
  // =========================================================================
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "forgot-password") {
      const emailParsed = z.string().email("Enter a valid email").safeParse(passwordEmail);
      if (!emailParsed.success) {
        toast.error(emailParsed.error.issues[0].message);
        return;
      }
    } else {
      const parsed = passwordSchema.safeParse({
        email: passwordEmail,
        password,
        fullName: mode === "signup" ? fullName : undefined,
      });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0].message);
        return;
      }
    }

    if (mode === "signup" && !acceptTerms) {
      toast.error("You must accept the Terms & Conditions and Privacy Policy to continue");
      return;
    }

    if (mode === "signin" && lockoutTime > 0) {
      toast.error(
        isGlobalLockout
          ? `Too many failed login attempts on this device. Try again in ${lockoutTime}s.`
          : `Too many failed attempts for this email. Try again in ${lockoutTime}s.`
      );
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: passwordEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to confirm.");

        sendWelcomeEmail({ data: { email: passwordEmail, fullName } }).catch((err) => {
          console.error("Welcome email trigger failure", err);
        });
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: passwordEmail,
          password,
        });
        if (error) {
          const limits = recordFailedAttempt(passwordEmail);
          if (limits.emailLockoutUntil || limits.globalLockoutUntil) {
            toast.error("Too many failed attempts. This account/device has been temporarily locked.");
          }
          throw error;
        }
        resetAttempts(passwordEmail);
        toast.success("Welcome back!");
      } else if (mode === "forgot-password") {
        const result = await sendPasswordResetEmail({
          data: {
            email: passwordEmail,
            redirectTo: `${window.location.origin}/reset-password`,
          },
        });
        if (result?.error) {
          throw new Error(result.error);
        }
        toast.success("Password reset link sent! Check your email inbox.");
        setMode("signin");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  // Mock Google Account Selector (Preserved for Demo)
  const handleGoogleSelect = async (email: string, name: string) => {
    setShowGoogleChooser(false);
    setBusy(true);
    try {
      const mockPassword = "GoogleMockPassword123!";
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: mockPassword,
      });

      if (!signInError && signInData.session) {
        toast.success(`Signed in with Google as ${email}`);
        navigate({ to: redirect && redirect.startsWith("/") ? redirect : "/" });
        return;
      }

      if (signInError && signInError.message.toLowerCase().includes("invalid login credentials")) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password: mockPassword,
          options: { data: { full_name: name } },
        });

        if (!signUpError && signUpData.session) {
          toast.success(`Registered and signed in with Google as ${email}`);
          navigate({ to: redirect && redirect.startsWith("/") ? redirect : "/" });
          return;
        }
      }

      const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
      if (!anonError && anonData.session) {
        toast.success("Signed in with Google (Demo Session)");
        navigate({ to: redirect && redirect.startsWith("/") ? redirect : "/" });
        return;
      }

      const oauthRedirect = redirect && redirect.startsWith("/")
        ? window.location.origin + redirect
        : window.location.origin + "/";
      const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: oauthRedirect });
      if (r.error) toast.error(r.error.message ?? "Google sign-in failed");
    } catch (err: any) {
      toast.error(err.message || "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background font-sans">
      {/* Brand Hero Visual Column */}
      <div className="hidden lg:block relative" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute inset-0 p-16 flex flex-col justify-between">
          <Link to="/">
            <Logo className="h-12 w-auto" />
          </Link>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/25 text-xs font-semibold text-accent mb-4">
              <ShieldCheck className="h-3.5 w-3.5" /> Passwordless OTP Security
            </div>
            <h2 className="font-display text-5xl leading-tight">
              Where every memory
              <br />
              <em className="text-accent not-italic">becomes an heirloom.</em>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-sm leading-relaxed text-sm">
              Sign in effortlessly using instant Email OTP or SMS OTP. Connect directly with over 480 independent artisans across India.
            </p>
          </div>
        </div>
      </div>

      {/* Main Authentication Card Column */}
      <div className="flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link to="/">
              <Logo className="h-10 w-auto" />
            </Link>
          </div>

          <p className="text-xs uppercase tracking-[0.25em] text-accent mb-2 font-bold">
            Customer Authentication
          </p>
          <h1 className="font-display text-3xl sm:text-4xl mb-6">
            Welcome to ViaCraft
          </h1>

          {/* Quick Google Sign In */}
          <button
            onClick={() => setShowGoogleChooser(true)}
            disabled={busy}
            className="w-full mb-6 py-3 rounded-full border border-border bg-card hover:border-accent transition-all text-sm font-medium flex items-center justify-center gap-3 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.9c-.3 1.4-1 2.5-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-7.8z"
              />
              <path
                fill="#34A853"
                d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2.1v2.9C3.9 20.5 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.7 14.1c-.2-.7-.4-1.4-.4-2.1s.1-1.4.4-2.1V7H2.1C1.4 8.5 1 10.2 1 12s.4 3.5 1.1 5l3.6-2.9z"
              />
              <path
                fill="#EA4335"
                d="M12 5.4c1.6 0 3.1.6 4.2 1.6L19.3 4C17.5 2.3 15 1.2 12 1.2 7.7 1.2 3.9 3.7 2.1 7.4l3.6 2.9c.9-2.6 3.4-4.9 6.3-4.9z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-6 text-xs uppercase tracking-wider text-muted-foreground">
            <div className="flex-1 h-px bg-border" />
            <span>or choose method</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Authentication Channel Tabs */}
          <div className="grid grid-cols-3 p-1 rounded-xl bg-muted/60 border border-border mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab("email-otp");
                setEmailOtpSent(false);
              }}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "email-otp"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              Email OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("sms-otp");
                setSmsOtpSent(false);
                setSmsConfigError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "sms-otp"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              SMS OTP
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("password")}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "password"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              Password
            </button>
          </div>

          {/* ============================================================= */}
          {/* TAB 1: EMAIL OTP WORKFLOW */}
          {/* ============================================================= */}
          {activeTab === "email-otp" && (
            <div className="space-y-5">
              {!emailOtpSent ? (
                <form onSubmit={handleRequestEmailOtp} className="space-y-4">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={emailOtpAddress}
                      onChange={(e) => setEmailOtpAddress(e.target.value)}
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-card border border-border focus:border-accent outline-none text-sm transition-colors"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      We'll email you a secure 6-digit one-time verification code.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={busy || !emailOtpAddress.trim()}
                    className="w-full py-3.5 rounded-full bg-primary text-primary-foreground hover:bg-foreground transition-all text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Email Code"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyEmailOtp} className="space-y-5 animate-in fade-in duration-200">
                  <div className="p-4 rounded-2xl border border-accent/20 bg-accent/5 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Enter 6-digit code sent to</p>
                    <p className="text-sm font-semibold text-foreground">{maskEmail(emailOtpAddress)}</p>
                  </div>

                  <div className="flex flex-col items-center justify-center gap-3">
                    <InputOTP
                      maxLength={6}
                      value={emailOtpCode}
                      onChange={(val) => {
                        setEmailOtpCode(val);
                        if (val.length === 6) {
                          setTimeout(() => handleVerifyEmailOtp(), 100);
                        }
                      }}
                    >
                      <InputOTPGroup className="gap-2">
                        <InputOTPSlot index={0} className="h-12 w-11 rounded-lg border text-lg font-bold" />
                        <InputOTPSlot index={1} className="h-12 w-11 rounded-lg border text-lg font-bold" />
                        <InputOTPSlot index={2} className="h-12 w-11 rounded-lg border text-lg font-bold" />
                        <InputOTPSlot index={3} className="h-12 w-11 rounded-lg border text-lg font-bold" />
                        <InputOTPSlot index={4} className="h-12 w-11 rounded-lg border text-lg font-bold" />
                        <InputOTPSlot index={5} className="h-12 w-11 rounded-lg border text-lg font-bold" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <button
                    type="submit"
                    disabled={busy || emailOtpCode.length < 6}
                    className="w-full py-3.5 rounded-full bg-primary text-primary-foreground hover:bg-foreground transition-all text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Continue"}
                  </button>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                    <button
                      type="button"
                      onClick={() => setEmailOtpSent(false)}
                      className="hover:text-accent font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Change email
                    </button>
                    <button
                      type="button"
                      disabled={busy || emailCooldown > 0}
                      onClick={() => handleRequestEmailOtp()}
                      className="hover:text-accent font-medium cursor-pointer disabled:opacity-50"
                    >
                      {emailCooldown > 0 ? (
                        `Resend code in ${emailCooldown}s`
                      ) : (
                        <span className="flex items-center gap-1 text-accent font-semibold">
                          <RefreshCw className="h-3 w-3" /> Resend code
                        </span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ============================================================= */}
          {/* TAB 2: SMS OTP WORKFLOW (+91 INDIA) */}
          {/* ============================================================= */}
          {activeTab === "sms-otp" && (
            <div className="space-y-5">
              {smsConfigError && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs leading-relaxed flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{smsConfigError}</span>
                </div>
              )}

              {!smsOtpSent ? (
                <form onSubmit={handleRequestSmsOtp} className="space-y-4">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Mobile Number (India)
                    </label>
                    <div className="mt-1 flex rounded-xl border border-border bg-card overflow-hidden focus-within:border-accent">
                      <span className="inline-flex items-center px-3.5 bg-muted/40 text-xs font-semibold text-muted-foreground border-r border-border">
                        🇮🇳 +91
                      </span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="98765 43210"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ""))}
                        className="w-full px-4 py-3 bg-transparent outline-none text-sm font-medium tracking-wide"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Enter your 10-digit mobile number. We will deliver a 6-digit SMS OTP.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={busy || mobileNumber.length < 10}
                    className="w-full py-3.5 rounded-full bg-primary text-primary-foreground hover:bg-foreground transition-all text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send SMS Code"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifySmsOtp} className="space-y-5 animate-in fade-in duration-200">
                  <div className="p-4 rounded-2xl border border-accent/20 bg-accent/5 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Enter 6-digit SMS code sent to</p>
                    <p className="text-sm font-semibold text-foreground">{maskPhone(mobileNumber)}</p>
                  </div>

                  <div className="flex flex-col items-center justify-center gap-3">
                    <InputOTP
                      maxLength={6}
                      value={smsOtpCode}
                      onChange={(val) => {
                        setSmsOtpCode(val);
                        if (val.length === 6) {
                          setTimeout(() => handleVerifySmsOtp(), 100);
                        }
                      }}
                    >
                      <InputOTPGroup className="gap-2">
                        <InputOTPSlot index={0} className="h-12 w-11 rounded-lg border text-lg font-bold" />
                        <InputOTPSlot index={1} className="h-12 w-11 rounded-lg border text-lg font-bold" />
                        <InputOTPSlot index={2} className="h-12 w-11 rounded-lg border text-lg font-bold" />
                        <InputOTPSlot index={3} className="h-12 w-11 rounded-lg border text-lg font-bold" />
                        <InputOTPSlot index={4} className="h-12 w-11 rounded-lg border text-lg font-bold" />
                        <InputOTPSlot index={5} className="h-12 w-11 rounded-lg border text-lg font-bold" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <button
                    type="submit"
                    disabled={busy || smsOtpCode.length < 6}
                    className="w-full py-3.5 rounded-full bg-primary text-primary-foreground hover:bg-foreground transition-all text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Continue"}
                  </button>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                    <button
                      type="button"
                      onClick={() => setSmsOtpSent(false)}
                      className="hover:text-accent font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Change number
                    </button>
                    <button
                      type="button"
                      disabled={busy || smsCooldown > 0}
                      onClick={() => handleRequestSmsOtp()}
                      className="hover:text-accent font-medium cursor-pointer disabled:opacity-50"
                    >
                      {smsCooldown > 0 ? (
                        `Resend SMS in ${smsCooldown}s`
                      ) : (
                        <span className="flex items-center gap-1 text-accent font-semibold">
                          <RefreshCw className="h-3 w-3" /> Resend SMS
                        </span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ============================================================= */}
          {/* TAB 3: PASSWORD LOGIN & REGISTRATION (PRESERVED) */}
          {/* ============================================================= */}
          {activeTab === "password" && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Full Name
                  </label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Your legal name"
                    className="mt-1 w-full px-4 py-3 rounded-xl bg-card border border-border focus:border-accent outline-none text-sm"
                  />
                </div>
              )}

              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Email
                </label>
                <input
                  type="email"
                  value={passwordEmail}
                  onChange={(e) => setPasswordEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="mt-1 w-full px-4 py-3 rounded-xl bg-card border border-border focus:border-accent outline-none text-sm"
                />
              </div>

              {mode !== "forgot-password" && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Password
                    </label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={() => setMode("forgot-password")}
                        className="text-xs text-accent hover:underline focus:outline-none cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <PasswordInput
                    id="auth-password"
                    value={password}
                    onChange={setPassword}
                    placeholder="Enter your password"
                  />
                </div>
              )}

              {mode === "signup" && (
                <div className="flex items-start gap-2.5 my-3 select-none">
                  <input
                    type="checkbox"
                    id="accept-terms"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent accent-accent cursor-pointer"
                  />
                  <label htmlFor="accept-terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                    I agree to ViaCraft's{" "}
                    <Link
                      to="/legal/$slug"
                      params={{ slug: "terms-and-conditions" }}
                      target="_blank"
                      className="text-accent hover:underline font-semibold"
                    >
                      Terms & Conditions
                    </Link>{" "}
                    and{" "}
                    <Link
                      to="/legal/$slug"
                      params={{ slug: "privacy-policy" }}
                      target="_blank"
                      className="text-accent hover:underline font-semibold"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </label>
                </div>
              )}

              {mode === "signin" && lockoutTime > 0 && (
                <div className="p-3 bg-red-500/10 text-red-500 rounded-xl text-xs leading-relaxed border border-red-500/20 flex items-center gap-2 animate-pulse">
                  <span className="font-semibold">Security Lockout:</span>
                  <span>
                    {isGlobalLockout
                      ? `Too many failed login attempts on this device. Try again in ${lockoutTime}s.`
                      : `Too many failed attempts for this email. Try again in ${lockoutTime}s.`}
                  </span>
                </div>
              )}

              <button
                disabled={busy || (mode === "signin" && lockoutTime > 0)}
                className="w-full py-3.5 rounded-full bg-primary text-primary-foreground hover:bg-foreground transition-all text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "signin" && lockoutTime > 0
                  ? `Locked out (${lockoutTime}s)`
                  : mode === "signin"
                    ? "Sign in with Password"
                    : mode === "signup"
                      ? "Create Account"
                      : "Send Reset Link"}
              </button>

              <div className="text-center pt-2">
                {mode === "forgot-password" ? (
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="text-xs text-accent hover:underline cursor-pointer"
                  >
                    ← Back to sign in
                  </button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {mode === "signin" ? "Need a password account?" : "Already have a password?"}{" "}
                    <button
                      type="button"
                      onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                      className="text-accent hover:underline font-semibold cursor-pointer"
                    >
                      {mode === "signin" ? "Register here" : "Sign in here"}
                    </button>
                  </p>
                )}
              </div>
            </form>
          )}

          {/* Artisan Onboarding Link */}
          <div className="mt-8 pt-6 border-t border-border/60 text-center">
            <p className="text-xs text-muted-foreground mb-1">Are you an artisan or resin artist?</p>
            <Link
              to="/sell"
              className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1"
            >
              Apply for Vendor Onboarding →
            </Link>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-accent">
              ← Back to marketplace
            </Link>
          </p>
        </div>
      </div>

      {/* Google Account Selector Overlay Modal */}
      {showGoogleChooser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 flex flex-col font-sans text-gray-800">
            <div className="px-8 pt-8 pb-4 flex flex-col items-center text-center">
              <svg className="h-8 w-8 mb-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.9c-.3 1.4-1 2.5-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-7.8z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2.1v2.9C3.9 20.5 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.7 14.1c-.2-.7-.4-1.4-.4-2.1s.1-1.4.4-2.1V7H2.1C1.4 8.5 1 10.2 1 12s.4 3.5 1.1 5l3.6-2.9z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.4c1.6 0 3.1.6 4.2 1.6L19.3 4C17.5 2.3 15 1.2 12 1.2 7.7 1.2 3.9 3.7 2.1 7.4l3.6 2.9c.9-2.6 3.4-4.9 6.3-4.9z"
                />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900">Choose an account</h3>
              <p className="text-sm text-gray-500 mt-1">
                to continue to <span className="font-semibold text-gray-800">ViaCraft</span>
              </p>
            </div>

            <div className="px-6 py-2 max-h-[300px] overflow-y-auto divide-y divide-gray-100 flex-1">
              {[
                { email: "john.doe@gmail.com", name: "John Doe", color: "bg-blue-600" },
                { email: "jane.artisan@gmail.com", name: "Jane Artisan", color: "bg-purple-600" },
                { email: "admin.demo@gmail.com", name: "Admin Demo", color: "bg-amber-600" },
              ].map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleGoogleSelect(acc.email, acc.name)}
                  className="w-full text-left py-3 px-4 flex items-center gap-3 hover:bg-gray-50 transition-colors rounded-lg group cursor-pointer"
                >
                  <div className={`h-8 w-8 rounded-full ${acc.color} text-white flex items-center justify-center text-sm font-semibold shadow-inner`}>
                    {acc.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate group-hover:text-gray-900">{acc.name}</p>
                    <p className="text-xs text-gray-500 truncate">{acc.email}</p>
                  </div>
                </button>
              ))}

              {showCustomEmailInput ? (
                <div className="py-3 px-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        placeholder="you@gmail.com"
                        value={customGoogleEmail}
                        onChange={(e) => setCustomGoogleEmail(e.target.value)}
                        className="flex-1 text-sm text-gray-800 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 bg-white"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && customGoogleEmail) {
                            handleGoogleSelect(customGoogleEmail, customGoogleEmail.split("@")[0]);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customGoogleEmail) {
                            handleGoogleSelect(customGoogleEmail, customGoogleEmail.split("@")[0]);
                          }
                        }}
                        disabled={!customGoogleEmail}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Sign in
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCustomEmailInput(true)}
                  className="w-full text-left py-3 px-4 flex items-center gap-3 hover:bg-gray-50 transition-colors rounded-lg group cursor-pointer"
                >
                  <div className="h-8 w-8 rounded-full bg-gray-100 border border-gray-200 text-gray-600 flex items-center justify-center text-sm font-semibold shadow-inner group-hover:bg-gray-200">
                    +
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate group-hover:text-gray-900">
                      Use another account
                    </p>
                  </div>
                </button>
              )}
            </div>

            <div className="bg-gray-50 px-8 py-4 flex justify-between items-center text-xs text-gray-500 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setShowGoogleChooser(false);
                  setShowCustomEmailInput(false);
                  setCustomGoogleEmail("");
                }}
                className="hover:text-gray-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <div className="flex gap-3">
                <a href="/legal/privacy-policy" target="_blank" className="hover:text-gray-700">Privacy</a>
                <a href="/legal/terms-and-conditions" target="_blank" className="hover:text-gray-700">Terms</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
