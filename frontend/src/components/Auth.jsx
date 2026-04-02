import React, { useState } from "react";

const Auth = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = isLogin ? "/api/login" : "/api/register";

    try {
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Authentication failed");
      }

      // Save token to browser memory and notify the main App
      localStorage.setItem("omnistream_token", data.access_token);
      localStorage.setItem("omnistream_user", data.user_name);
      onAuthSuccess(data.user_name);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Cinematic Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-accent/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Brand Header */}
      <div className="mb-10 text-center relative z-10">
        <h1 className="text-5xl font-black tracking-tighter text-white mb-2">
          OMNI<span className="text-brand-accent">STREAM</span>
        </h1>
        <p className="text-zinc-400 font-medium tracking-widest uppercase text-sm">
          Data Engineering Engine
        </p>
      </div>

      {/* Auth Card */}
      <div className="bg-[#121212] border border-zinc-800 p-10 rounded-3xl shadow-2xl w-full max-w-md relative z-10">
        <h2 className="text-3xl font-black text-white mb-8">
          {isLogin ? "Sign In" : "Create Account"}
        </h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6 text-sm font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">
                Name
              </label>
              <input
                type="text"
                required
                className="w-full bg-zinc-900 text-white border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              className="w-full bg-zinc-900 text-white border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">
              Password
            </label>
            <input
              type="password"
              required
              className="w-full bg-zinc-900 text-white border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-accent hover:bg-brand-accent/80 text-white font-black uppercase tracking-widest py-4 rounded-xl mt-4 transition-all shadow-[0_0_20px_rgba(225,29,72,0.3)] disabled:opacity-50"
          >
            {loading
              ? "Authenticating..."
              : isLogin
                ? "Enter Engine"
                : "Initialize Account"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
          <p className="text-zinc-500 text-sm">
            {isLogin ? "Don't have an access code? " : "Already initialized? "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-brand-accent font-bold hover:text-white transition-colors"
            >
              {isLogin ? "Sign up now." : "Sign in."}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
