"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from '../../contexts/AuthContext';

interface SavedStudentAccount {
  regno: string;
  name?: string;
  password?: string;
  lastUsed?: string;
}

const DEFAULT_STUDENTS: SavedStudentAccount[] = [
  {
    regno: "FA21-BCS-001",
    name: "Sample Student (FA21-BCS-001)",
    password: "Password@123",
  },
];

export default function StudentLogin() {
  const [prefix, setPrefix] = useState("");
  const [program, setProgram] = useState("");
  const [number, setNumber] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedStudentAccount[]>(DEFAULT_STUDENTS);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { login } = useAuth();

  // Sessions and departments
  const sessions = ['FA21', 'SP21', 'FA22', 'SP22', 'FA23', 'SP23', 'FA24', 'SP24', 'FA25', 'SP25', 'FA26', 'SP26'];
  const departments = ['BCS', 'BSE', 'BBA', 'BEC', 'BDS', 'MCS', 'MSE', 'MBA', 'MEC', 'MDS'];

  // Load saved accounts on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("savedStudentAccountsList");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = [...parsed];
          if (!merged.some((a) => a.regno.toUpperCase() === "FA21-BCS-001")) {
            merged.unshift(DEFAULT_STUDENTS[0]);
          }
          setSavedAccounts(merged);
        }
      } else {
        localStorage.setItem("savedStudentAccountsList", JSON.stringify(DEFAULT_STUDENTS));
      }

      const lastReg = localStorage.getItem("lastStudentRegno");
      const lastPass = localStorage.getItem("lastStudentPass");
      if (lastReg) {
        const parts = lastReg.split('-');
        if (parts.length === 3) {
          setPrefix(parts[0]);
          setProgram(parts[1]);
          setNumber(parts[2]);
        }
      }
      if (lastPass) setPassword(lastPass);
    } catch (e) {
      console.warn("Could not read stored credentials:", e);
    }
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectAccount = (account: SavedStudentAccount) => {
    const parts = account.regno.split('-');
    if (parts.length === 3) {
      setPrefix(parts[0]);
      setProgram(parts[1]);
      setNumber(parts[2]);
    }
    if (account.password) {
      setPassword(account.password);
    }
    setShowSuggestions(false);
    setError("");
  };

  const handleDeleteAccount = (e: React.MouseEvent, regno: string) => {
    e.stopPropagation();
    const updated = savedAccounts.filter(
      (a) => a.regno.toUpperCase() !== regno.toUpperCase()
    );
    setSavedAccounts(updated);
    try {
      localStorage.setItem("savedStudentAccountsList", JSON.stringify(updated));
    } catch (err) {
      console.warn("Could not update stored accounts:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!prefix || !program || !number || !password) {
      setError("All fields are required");
      setLoading(false);
      return;
    }

    const rollNumber = `${prefix}-${program}-${number}`.toUpperCase();

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regno: rollNumber, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      // Save student account to suggestions list
      if (rememberMe) {
        const newAccount: SavedStudentAccount = {
          regno: rollNumber,
          name: data.user.full_name || rollNumber,
          password: password,
          lastUsed: new Date().toISOString(),
        };

        const existingFiltered = savedAccounts.filter(
          (a) => a.regno.toUpperCase() !== rollNumber
        );
        const updatedList = [newAccount, ...existingFiltered];
        setSavedAccounts(updatedList);
        localStorage.setItem("savedStudentAccountsList", JSON.stringify(updatedList));
        localStorage.setItem("lastStudentRegno", rollNumber);
        localStorage.setItem("lastStudentPass", password);
      }

      // Native browser credential manager storage prompt
      try {
        if (typeof window !== "undefined" && (window as any).PasswordCredential) {
          const cred = new (window as any).PasswordCredential({
            id: rollNumber,
            password: password,
            name: data.user.full_name || rollNumber,
          });
          if (navigator.credentials && navigator.credentials.store) {
            navigator.credentials.store(cred).catch(() => {});
          }
        }
      } catch (credErr) {
        // Ignore credential manager errors
      }

      login({
        name: data.user.full_name,
        regno: data.user.regno,
        type: 'student'
      });
      localStorage.setItem('studentToken', data.user.regno);
      localStorage.setItem('studentName', data.user.full_name);
      localStorage.setItem('studentLevel', data.user.level);
      localStorage.setItem('studentRegno', data.user.regno);
      localStorage.setItem('studentEmail', data.user.email);
      localStorage.setItem('isAuthenticated', 'true');

      try {
        const profileRes = await fetch(`/api/get-profile?regno=${data.user.regno}`);
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData.avatar_url) {
            localStorage.setItem('studentAvatar', profileData.avatar_url);
          } else {
            localStorage.removeItem('studentAvatar');
          }
        }
      } catch (profileError) {
        localStorage.removeItem('studentAvatar'); 
      }

      router.push("/student/dashboard");

    } catch (err) {
      setError("Network error. Please check your connection.");
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 px-6 py-8">
      <div className="w-full max-w-sm bg-white/10 backdrop-blur-md border border-blue-400/30 rounded-2xl p-8 shadow-2xl text-white relative">
        <h1 className="text-3xl font-bold text-center mb-6 text-cyan-300">
          Student Login
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-400/50 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        <form className="flex flex-col gap-4 text-sm" onSubmit={handleSubmit} method="POST" action="#" autoComplete="on">
          {/* Registration Number with Suggestions Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-blue-200 text-xs font-medium">
                Registration No <span className="text-red-400">*</span>
              </label>
              {savedAccounts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowSuggestions((prev) => !prev)}
                  className="text-xs text-cyan-300 hover:text-cyan-200 font-medium transition flex items-center gap-1"
                >
                  <span>⚡ Saved Logins ({savedAccounts.length})</span>
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <select
                id="student-session"
                name="session"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                className="w-1/3 px-2 py-2.5 rounded-lg bg-blue-950/40 border border-blue-400/30 focus:outline-none focus:border-cyan-400 text-white"
                required
                disabled={loading}
              >
                <option value="">Session</option>
                {sessions.map((session) => (
                  <option key={session} value={session}>
                    {session}
                  </option>
                ))}
              </select>

              <select
                id="student-dept"
                name="department"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                className="w-1/3 px-2 py-2.5 rounded-lg bg-blue-950/40 border border-blue-400/30 focus:outline-none focus:border-cyan-400 text-white"
                required
                disabled={loading}
              >
                <option value="">Dept</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              <input
                id="student-number"
                name="username"
                type="text"
                autoComplete="username"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="001"
                maxLength={3}
                className="w-1/3 px-2 py-2.5 rounded-lg bg-blue-950/40 border border-blue-400/30 focus:outline-none focus:border-cyan-400 placeholder-blue-300/60 text-white"
                required
                disabled={loading}
              />
            </div>

            {/* Student Suggestions Dropdown */}
            {showSuggestions && savedAccounts.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1.5 bg-blue-950/95 border border-cyan-400/40 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 bg-blue-900/60 border-b border-blue-800 flex items-center justify-between text-[11px] text-cyan-200 font-medium">
                  <span>Saved Student Accounts</span>
                  <span>Click to auto-fill</span>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-blue-900/40">
                  {savedAccounts.map((acc) => (
                    <div
                      key={acc.regno}
                      onClick={() => handleSelectAccount(acc)}
                      className="p-2.5 hover:bg-cyan-500/20 cursor-pointer flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-blue-950 font-bold text-xs flex-shrink-0 shadow">
                          🎓
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white group-hover:text-cyan-300 truncate">
                            {acc.regno}
                          </p>
                          {acc.name && (
                            <p className="text-[10px] text-blue-300 truncate">{acc.name}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 pl-2">
                        <span className="text-[10px] bg-cyan-500/30 text-cyan-200 px-2 py-0.5 rounded font-medium group-hover:bg-cyan-400 group-hover:text-blue-950 transition">
                          Fill
                        </span>
                        {acc.regno !== "FA21-BCS-001" && (
                          <button
                            type="button"
                            title="Remove saved account"
                            onClick={(e) => handleDeleteAccount(e, acc.regno)}
                            className="text-blue-400 hover:text-red-400 p-1 rounded transition opacity-0 group-hover:opacity-100"
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

          {/* Password Input */}
          <div>
            <label className="block text-blue-200 mb-1 text-xs font-medium">
              Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                id="student-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-2.5 rounded-lg bg-blue-950/40 border border-blue-400/30 focus:outline-none focus:border-cyan-400 placeholder-blue-300/60 text-white pr-10"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-300 hover:text-cyan-300 text-xs"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Save Account Checkbox */}
          <div className="flex items-center">
            <label className="flex items-center text-xs text-blue-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-blue-400/40 bg-blue-950/60 text-cyan-400 focus:ring-cyan-400 mr-2"
              />
              Save in suggestions & auto-fill password
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-gradient-to-r from-blue-500 to-cyan-400 text-blue-900 font-semibold py-2.5 rounded-full hover:opacity-90 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <p className="text-center text-sm text-blue-200">
            Don't have an account?{" "}
            <Link href="/register" className="text-cyan-300 hover:underline">
              Sign up here
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
}