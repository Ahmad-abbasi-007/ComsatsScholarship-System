"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from '../../contexts/AuthContext';

interface SavedAccount {
  email: string;
  password?: string;
  name: string;
  role: string;
  lastUsed?: string;
}

const DEFAULT_ACCOUNTS: SavedAccount[] = [
  {
    email: "admin@comsats.edu.pk",
    password: "admin123",
    name: "Super Admin",
    role: "super_admin",
  },
];

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>(DEFAULT_ACCOUNTS);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { login } = useAuth();

  // Load saved accounts on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("savedAdminAccountsList");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = [...parsed];
          if (!merged.some((a) => a.email.toLowerCase() === "admin@comsats.edu.pk")) {
            merged.unshift(DEFAULT_ACCOUNTS[0]);
          }
          setSavedAccounts(merged);
        }
      } else {
        localStorage.setItem("savedAdminAccountsList", JSON.stringify(DEFAULT_ACCOUNTS));
      }

      // Pre-fill last used
      const lastEmail = localStorage.getItem("lastAdminEmail");
      const lastPass = localStorage.getItem("lastAdminPass");
      if (lastEmail) setEmail(lastEmail);
      if (lastPass) setPassword(lastPass);
    } catch (e) {
      console.warn("Could not load stored accounts:", e);
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectAccount = (account: SavedAccount) => {
    setEmail(account.email);
    if (account.password) {
      setPassword(account.password);
    }
    setShowSuggestions(false);
    setError("");
  };

  const handleDeleteAccount = (e: React.MouseEvent, accountEmail: string) => {
    e.stopPropagation();
    const updated = savedAccounts.filter(
      (a) => a.email.toLowerCase() !== accountEmail.toLowerCase()
    );
    setSavedAccounts(updated);
    try {
      localStorage.setItem("savedAdminAccountsList", JSON.stringify(updated));
      if (email.toLowerCase() === accountEmail.toLowerCase()) {
        setEmail("");
        setPassword("");
      }
    } catch (err) {
      console.warn("Could not update stored accounts:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please enter both email and password");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed. Please check your credentials.");
        return;
      }

      // Save account to suggestions list & storage
      if (rememberMe) {
        const newAccount: SavedAccount = {
          email: email.trim(),
          password: password,
          name: data.admin?.name || data.admin?.full_name || "Admin",
          role: data.admin?.role || "super_admin",
          lastUsed: new Date().toISOString(),
        };

        const existingFiltered = savedAccounts.filter(
          (a) => a.email.toLowerCase() !== email.trim().toLowerCase()
        );
        const updatedList = [newAccount, ...existingFiltered];
        setSavedAccounts(updatedList);
        localStorage.setItem("savedAdminAccountsList", JSON.stringify(updatedList));
        localStorage.setItem("lastAdminEmail", email.trim());
        localStorage.setItem("lastAdminPass", password);
      }

      // Native browser credential manager storage prompt (Google Password Manager)
      try {
        if (typeof window !== "undefined" && (window as any).PasswordCredential) {
          const cred = new (window as any).PasswordCredential({
            id: email.trim(),
            password: password,
            name: data.admin?.name || email.trim(),
          });
          if (navigator.credentials && navigator.credentials.store) {
            navigator.credentials.store(cred).catch(() => {});
          }
        }
      } catch (credErr) {
        // Ignore credential manager errors
      }

      // Set auth context & persistent tokens
      login({
        id: data.admin?.id,
        name: data.admin?.name || "Administrator",
        email: data.admin?.email,
        regno: "admin",
        token: data.token,
        type: "admin",
        role: data.admin?.role || "admin",
        is_active: data.admin?.is_active !== undefined ? data.admin.is_active : true,
      });

      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("admin", JSON.stringify(data.admin));

      if (data.admin?.id) {
        localStorage.setItem("adminId", data.admin.id);
      } else {
        localStorage.setItem("adminId", "97bca663-9121-48c4-82c7-b76a03c25ec6");
      }

      setError("");
      router.push("/admin/dashboard");
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredSuggestions = savedAccounts.filter((a) =>
    !email || a.email.toLowerCase().includes(email.toLowerCase()) || a.name.toLowerCase().includes(email.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 mt-16">Admin Portal</h1>
          <p className="text-slate-400">COMSATS Scholarship System</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 rounded-xl shadow-2xl p-8 relative">
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-400/30 rounded-lg text-red-200 text-sm">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} method="POST" action="#" autoComplete="on" className="space-y-5">
            {/* Native HTML5 Datalist for Browser Suggestions */}
            <datalist id="admin-email-suggestions">
              {savedAccounts.map((acc) => (
                <option key={acc.email} value={acc.email}>
                  {acc.name} ({acc.role})
                </option>
              ))}
            </datalist>

            {/* Admin Email with Suggestion Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="admin-email" className="block text-slate-300 text-sm font-medium">
                  Admin Email
                </label>
                {savedAccounts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowSuggestions((prev) => !prev)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition flex items-center gap-1"
                  >
                    <span>⚡ Saved Accounts ({savedAccounts.length})</span>
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  ref={emailInputRef}
                  id="admin-email"
                  name="username"
                  type="email"
                  list="admin-email-suggestions"
                  autoComplete="username email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="admin@comsats.edu.pk"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white placeholder-slate-400 transition duration-200"
                  required
                  disabled={loading}
                />
              </div>

              {/* Email / Account Suggestions Dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1.5 bg-slate-800 border border-slate-600/80 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 bg-slate-700/60 border-b border-slate-600/50 flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span>Email Suggestions</span>
                    <span>Click to auto-fill password</span>
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-700/40">
                    {filteredSuggestions.map((acc) => (
                      <div
                        key={acc.email}
                        onClick={() => handleSelectAccount(acc)}
                        className="p-3 hover:bg-indigo-600/20 cursor-pointer flex items-center justify-between group transition-colors"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow">
                            {acc.name?.charAt(0) || "A"}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-semibold text-white truncate group-hover:text-indigo-300">
                                {acc.email}
                              </p>
                            </div>
                            <p className="text-xs text-slate-400 truncate">
                              {acc.name} • <span className="text-indigo-400">{acc.role || "Admin"}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 pl-2">
                          <span className="text-xs bg-indigo-600/40 text-indigo-300 px-2 py-1 rounded font-medium group-hover:bg-indigo-600 group-hover:text-white transition">
                            Fill
                          </span>
                          {acc.email.toLowerCase() !== "admin@comsats.edu.pk" && (
                            <button
                              type="button"
                              title="Remove saved account"
                              onClick={(e) => handleDeleteAccount(e, acc.email)}
                              className="text-slate-500 hover:text-red-400 p-1 rounded transition opacity-0 group-hover:opacity-100"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="admin-password" className="block text-slate-300 text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white placeholder-slate-400 pr-12 transition duration-200"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-indigo-300 text-sm transition duration-200"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Save Account Checkbox */}
            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500 mr-2"
                />
                Save in email suggestions
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold py-3.5 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg border border-indigo-500/30"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                  Signing In...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Access Admin Panel
                </div>
              )}
            </button>
          </form>

          <div className="mt-6 p-4 bg-slate-700/30 border border-slate-600/30 rounded-lg">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm text-slate-300 font-medium">Restricted Access</p>
                <p className="text-xs text-slate-400 mt-1">
                  Authorized personnel only. All activities are monitored and logged.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link 
            href="/" 
            className="inline-flex items-center text-indigo-400 hover:text-indigo-300 text-sm font-medium transition duration-200"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Student Portal
          </Link>
        </div>
      </div>
    </div>
  );
}