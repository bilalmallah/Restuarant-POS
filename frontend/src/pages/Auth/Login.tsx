import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiLogIn, FiLock, FiUser } from "react-icons/fi";

import brand, { brandInitials } from "../../app/brand";
import { useAppDispatch, useAuth } from "../../hooks/useStore";
import { setCredentials } from "../../features/auth/authSlice";
import { useLoginMutation } from "../../features/posApi";
import { errorMessage } from "../../utils/api";
import { Button, Input } from "../../components/ui/primitives";

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { token } = useAuth();

  const [login, { isLoading }] = useLoginMutation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  const usernameRef = useRef<HTMLInputElement>(null);

  // A shared till is used by whoever is on shift, so the cursor starts in the
  // username box rather than making them reach for the mouse first.
  useEffect(() => usernameRef.current?.focus(), []);

  useEffect(() => {
    if (token) navigate("/dashboard", { replace: true });
  }, [token, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      const user = await login(form).unwrap();
      dispatch(setCredentials(user));
      navigate("/dashboard", { replace: true });
    } catch (caught) {
      setError(errorMessage(caught, "Could not sign in"));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-700 via-brand-800 to-ink-900 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 grid size-16 place-items-center rounded-2xl bg-white text-2xl font-black text-brand-700 shadow-lg">
            {brandInitials}
          </span>
          <h1 className="text-2xl font-extrabold text-white">{brand.name}</h1>
          <p className="mt-1 text-sm text-brand-100">{brand.tagline}</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
          <div>
            <h2 className="text-lg font-bold text-ink-900">Sign in</h2>
            <p className="text-sm text-ink-500">Enter the username your manager gave you</p>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          <Input
            ref={usernameRef}
            label="Username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={form.username}
            onChange={(event) => setForm({ ...form, username: event.target.value })}
            placeholder="admin"
            required
          />

          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            placeholder="••••••••"
            required
          />

          <Button
            type="submit"
            size="lg"
            block
            loading={isLoading}
            icon={<FiLogIn />}
            disabled={!form.username || !form.password}
          >
            Sign in
          </Button>

          <p className="flex items-center justify-center gap-4 pt-1 text-[11px] text-ink-400">
            <span className="flex items-center gap-1">
              <FiUser className="size-3" /> Shared till friendly
            </span>
            <span className="flex items-center gap-1">
              <FiLock className="size-3" /> Session expires on sign out
            </span>
          </p>
        </form>

        <p className="mt-4 text-center text-xs text-brand-200">
          Press <kbd className="rounded bg-white/20 px-1.5 py-0.5 font-bold">F1</kbd> anywhere in the
          app for the keyboard shortcuts guide
        </p>
      </div>
    </div>
  );
};

export default Login;
