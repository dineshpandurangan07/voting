import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, ShieldCheck, CheckCircle2, Eye, EyeOff, KeyRound, ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/api';

export default function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetStep, setResetStep] = useState(null); // null | email | token
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  const DEMO_ACCOUNTS = [
    { label: 'Admin', email: 'admin@veravote.local', password: 'Admin@123' },
    { label: 'Voter', email: 'voter@veravote.local', password: 'Voter@123' },
    { label: 'Officer', email: 'officer@veravote.local', password: 'Officer@123' },
    { label: 'Auditor', email: 'auditor@veravote.local', password: 'Auditor@123' },
  ];

  const fillDemo = (acc) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setShowPassword(false);
    toast.success(`${acc.label} demo account filled — press Sign In`);
  };

  const homeForRole = (role) => (role === 'voter' ? '/voter-dashboard' : '/dashboard');

  useEffect(() => {
    if (isAuthenticated) navigate(homeForRole(user?.role), { replace: true });
  }, [isAuthenticated, navigate, user?.role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setSubmitting(true);
    try {
      const data = await login(email, password);
      toast.success('Welcome back!');
      navigate(homeForRole(data?.role));
    } catch (err) {
      const msg = err?.response?.data?.message || 'Login failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Please enter your email');
      return;
    }
    setResetBusy(true);
    try {
      const res = await authAPI.forgotPassword({ email: resetEmail });
      toast.success('Reset link sent');
      setResetStep('token');
      setResetCode(res.data?.data?.devResetToken || '');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request password reset');
    } finally {
      setResetBusy(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetCode || newPassword.length < 6) {
      toast.error('Enter the reset token and a new password (min 6 characters)');
      return;
    }
    setResetBusy(true);
    try {
      await authAPI.resetPassword({ email: resetEmail, token: resetCode, newPassword });
      toast.success('Password reset successfully — sign in with your new password');
      setResetStep(null);
      setEmail(resetEmail);
      setPassword('');
      setResetCode('');
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-md text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold tracking-tight">VERAVOTE</span>
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Secure, Transparent & Trusted Elections
          </h2>
          <p className="text-primary-100 text-lg mb-10 leading-relaxed">
            Manage your elections with confidence. VERAVOTE provides end-to-end encrypted voting with real-time results and full audit trails.
          </p>
          <div className="space-y-4">
            {['End-to-end ballot encryption', 'Real-time result analytics', 'Full audit trail & compliance'].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary-200 flex-shrink-0" />
                <span className="text-primary-100">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">VERAVOTE</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            {resetStep ? (
              <>
                <button
                  type="button"
                  onClick={() => setResetStep(null)}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 mb-4"
                >
                  <ArrowLeft size={15} /> Back to sign in
                </button>

                {resetStep === 'email' ? (
                  <>
                    <div className="mb-6">
                      <h1 className="text-2xl font-bold text-gray-900">Reset password</h1>
                      <p className="text-sm text-gray-500 mt-1">
                        Enter your account email and we'll create a reset code for you.
                      </p>
                    </div>
                    <form onSubmit={handleForgotSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="email"
                            className="input-field pl-10"
                            placeholder="you@example.com"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            autoComplete="email"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={resetBusy}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 disabled:opacity-50"
                      >
                        {resetBusy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                        Send reset code
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <div className="mb-6">
                      <h1 className="text-2xl font-bold text-gray-900">New password</h1>
                      <p className="text-sm text-gray-500 mt-1">
                        For <span className="font-medium text-gray-700">{resetEmail}</span>
                      </p>
                    </div>
                    <form onSubmit={handleResetSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Reset token</label>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            className="input-field pl-10 font-mono"
                            placeholder="Paste the reset token"
                            value={resetCode}
                            onChange={(e) => setResetCode(e.target.value)}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1.5">
                          Dev mode: your reset token is shown below for convenience.
                        </p>
                        <p className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1.5 mt-1 break-all">
                          {resetCode || 'Request a code first'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="password"
                            className="input-field pl-10"
                            placeholder="Min 6 characters"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            autoComplete="new-password"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={resetBusy}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 disabled:opacity-50"
                      >
                        {resetBusy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                        Set new password
                      </button>
                    </form>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
                  <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        className="input-field pl-10"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="input-field pl-10 pr-10"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span className="text-sm text-gray-600">Remember me</span>
                    </label>
                    <button
                      type="button"
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                      onClick={() => { setResetEmail(''); setResetCode(''); setNewPassword(''); setResetStep('email'); }}
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        Sign In
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-5 border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Demo accounts
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {DEMO_ACCOUNTS.map((acc) => (
                      <button
                        key={acc.label}
                        type="button"
                        onClick={() => fillDemo(acc)}
                        className="text-left px-3 py-2 rounded-lg border border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition-colors"
                      >
                        <span className="block text-xs font-semibold text-gray-800">{acc.label}</span>
                        <span className="block text-[11px] text-gray-500 truncate">{acc.email}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <p className="text-sm text-center text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
