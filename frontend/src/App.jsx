import { useEffect, useEffectEvent, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const operations = [
  { label: "Uppercase", value: "uppercase" },
  { label: "Lowercase", value: "lowercase" },
  { label: "Reverse", value: "reverse" },
  { label: "Word Count", value: "word_count" }
];
const operationLabels = Object.fromEntries(
  operations.map((operation) => [operation.value, operation.label])
);

function formatTaskTime(value) {
  if (!value) {
    return "Just now";
  }

  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function AuthForm({ mode, onSubmit, loading }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  function handleChange(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  function submit(event) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <form className="panel form-card" onSubmit={submit}>
      <h2>{mode === "login" ? "Welcome back" : "Create account"}</h2>
      {mode === "register" && (
        <input name="name" placeholder="Name" value={form.name} onChange={handleChange} />
      )}
      <input
        name="email"
        placeholder="Email"
        type="email"
        value={form.email}
        onChange={handleChange}
      />
      <input
        name="password"
        placeholder="Password"
        type="password"
        value={form.password}
        onChange={handleChange}
      />
      <button disabled={loading} type="submit">
        {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
      </button>
    </form>
  );
}

function TaskForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    title: "",
    inputText: "",
    operation: operations[0].value
  });

  async function submit(event) {
    event.preventDefault();
    await onSubmit(form);
    setForm((current) => ({ ...current, title: "", inputText: "" }));
  }

  return (
    <form className="panel task-form" onSubmit={submit}>
      <div className="section-title">
        <h2>New task</h2>
        <span>Queued for background processing</span>
      </div>
      <label className="field-label" htmlFor="task-title">
        Title
      </label>
      <input
        id="task-title"
        placeholder="Task title"
        required
        value={form.title}
        onChange={(event) => setForm({ ...form, title: event.target.value })}
      />
      <label className="field-label" htmlFor="task-input">
        Input text
      </label>
      <textarea
        id="task-input"
        rows="6"
        placeholder="Input text"
        required
        value={form.inputText}
        onChange={(event) => setForm({ ...form, inputText: event.target.value })}
      />
      <label className="field-label" htmlFor="task-operation">
        Operation
      </label>
      <select
        id="task-operation"
        value={form.operation}
        onChange={(event) => setForm({ ...form, operation: event.target.value })}
      >
        {operations.map((operation) => (
          <option key={operation.value} value={operation.value}>
            {operation.label}
          </option>
        ))}
      </select>
      <button disabled={loading} type="submit">
        {loading ? "Submitting..." : "Run task"}
      </button>
    </form>
  );
}

function TaskCard({ task }) {
  return (
    <article className="panel task-card">
      <div className="task-header">
        <div>
          <h3>{task.title}</h3>
          <p>{operationLabels[task.operation] || task.operation}</p>
        </div>
        <span className={`status status-${task.status}`}>{task.status}</span>
      </div>
      <div className="meta-row">
        <span className="meta-chip">{formatTaskTime(task.createdAt)}</span>
        <span className="meta-chip">{task.logs?.length || 0} logs</span>
      </div>
      <div className="content-grid">
        <div className="content-block">
          <strong>Input</strong>
          <p className="task-body">{task.inputText}</p>
        </div>
        <div className="content-block">
          <strong>Result</strong>
          <p>{task.result || "Pending..."}</p>
        </div>
        <div className="content-block">
          <strong>Error</strong>
          <p>{task.errorMessage || "None"}</p>
        </div>
      </div>
      <div className="log-block">
        <strong>Logs</strong>
        <ul>
          {task.logs?.map((log, index) => (
            <li key={`${task._id}-${index}`}>{log}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default function App() {
  const [mode, setMode] = useState("login");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user") || "null")
  );
  const [tasks, setTasks] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const hasActiveTasks = tasks.some(
    (task) => task.status === "pending" || task.status === "running"
  );

  async function request(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });

    const rawBody = await response.text();
    let data = null;

    try {
      data = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(
        data?.message || rawBody || `Request failed with status ${response.status}`
      );
    }
    return data;
  }

  const refreshTasks = useEffectEvent(async () => {
    if (!token || document.visibilityState === "hidden") {
      return;
    }

    try {
      const data = await request("/api/tasks");
      setTasks(data);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  });

  useEffect(() => {
    refreshTasks();
    if (!token) {
      return undefined;
    }

    const intervalMs = hasActiveTasks ? 3000 : 15000;
    const timer = setInterval(() => {
      refreshTasks();
    }, intervalMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshTasks();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // useEffectEvent keeps refreshTasks up to date without re-triggering this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, hasActiveTasks]);

  async function handleAuth(form) {
    setLoading(true);
    setMessage("");

    try {
      const data = await request(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(form)
      });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTask(form) {
    setLoading(true);
    setMessage("");

    try {
      await request("/api/tasks", {
        method: "POST",
        body: JSON.stringify(form)
      });
      await refreshTasks();
      return true;
    } catch (error) {
      setMessage(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
    setTasks([]);
  }

  if (!token) {
    return (
      <main className="auth-shell">
        <section className="hero">
          <p className="eyebrow">DevOps + MERN Assignment</p>
          <h1>AI task platform with async workers, logs, and deployment-ready assets.</h1>
          <p className="lead">
            Register, submit text-processing tasks, and watch the worker pipeline update task
            status in near real time.
          </p>
          {message && <p className="message error">{message}</p>}
        </section>
        <section className="auth-column">
          <div className="tabs">
            <button
              className={mode === "login" ? "active" : ""}
              onClick={() => setMode("login")}
              type="button"
            >
              Login
            </button>
            <button
              className={mode === "register" ? "active" : ""}
              onClick={() => setMode("register")}
              type="button"
            >
              Register
            </button>
          </div>
          <AuthForm mode={mode} onSubmit={handleAuth} loading={loading} />
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <p className="eyebrow">Signed in</p>
          <h1>{user?.name}</h1>
          <p className="topbar-subtitle">Create text-processing jobs and track worker output.</p>
        </div>
        <button className="ghost" onClick={logout} type="button">
          Logout
        </button>
      </header>

      {message && <p className="message error">{message}</p>}

      <section className="dashboard-grid">
        <TaskForm onSubmit={handleCreateTask} loading={loading} />
        <section className="task-list">
          <div className="section-title">
            <h2>Recent tasks</h2>
            <span>{tasks.length} items</span>
          </div>
          {tasks.length === 0 ? (
            <div className="panel empty-state">No tasks yet. Create one to start processing.</div>
          ) : (
            tasks.map((task) => <TaskCard key={task._id} task={task} />)
          )}
        </section>
      </section>
    </main>
  );
}
