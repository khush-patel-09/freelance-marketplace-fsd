/**
 * auth.js — Client-side authentication helpers
 * Users are stored in localStorage (demo/prototype mode).
 * In production this would call real backend JWT endpoints.
 */

const USERS_KEY = "freelancehub_users";
const SESSION_KEY = "freelancehub_session";

const DEFAULT_USERS = [
  { id: 1, name: "TechNova Corp", email: "employer@technova.com", password: "password123", role: "employer" },
  { id: 2, name: "Khush Patel", email: "khush@freelancehub.com", password: "password123", role: "freelancer" },
];

/** Return all registered users */
export function getUsers() {
  const existing = localStorage.getItem(USERS_KEY);
  if (!existing) {
    localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }
  return JSON.parse(existing);
}

/** Save users array */
function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/** Return the currently logged-in user object, or null */
export function getCurrentUser() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

/** Register a new user. Returns { ok, error } */
export function register({ name, email, password, role }) {
  const users = getUsers();
  if (users.find((u) => u.email === email)) {
    return { ok: false, error: "An account with this email already exists." };
  }
  const user = { id: Date.now(), name, email, password, role };
  users.push(user);
  saveUsers(users);
  return { ok: true };
}

/** Login a user. Returns { ok, user, error } */
export function login({ email, password }) {
  const users = getUsers();
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) {
    return { ok: false, error: "Invalid email or password." };
  }
  // Store session (exclude password)
  const session = { id: user.id, name: user.name, email: user.email, role: user.role };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { ok: true, user: session };
}

/** Logout current user */
export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}

/**
 * Inject auth-aware nav links into every page.
 * Call this once DOMContentLoaded fires.
 * Expects a <div class="nav-auth"></div> placeholder in the nav.
 */
export function renderAuthNav() {
  const container = document.querySelector(".nav-auth");
  if (!container) return;
  const user = getCurrentUser();
  if (user) {
    container.innerHTML = `
      <span class="nav-user-greeting">Hi, ${user.name.split(" ")[0]}</span>
      <a href="dashboard.html" class="nav-link-btn">Dashboard</a>
      <button class="nav-link-btn nav-logout-btn" id="nav-logout-btn">Logout</button>
    `;
    document.getElementById("nav-logout-btn").addEventListener("click", () => {
      logout();
      window.location.href = "index.html";
    });
  } else {
    container.innerHTML = `
      <a href="login.html" class="nav-link-btn">Login</a>
      <a href="signup.html" class="nav-link-btn nav-link-btn--primary">Sign Up</a>
    `;
  }
}

/**
 * Guard a page: if user is not logged in, redirect to login.
 * Optionally restrict to a specific role.
 */
export function requireAuth(role = null) {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = `login.html?next=${encodeURIComponent(window.location.pathname)}`;
    return null;
  }
  if (role && user.role !== role) {
    alert(`This page is only accessible to ${role}s.`);
    window.location.href = "index.html";
    return null;
  }
  return user;
}
