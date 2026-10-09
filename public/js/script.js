/**
 * script.js — Main client-side logic for FreelanceHub
 * Handles: footer year, tabs, jobs, freelancers, proposals, tasks, geolocation.
 * Auth nav injection is handled via auth.js imported as a module.
 */

import { renderAuthNav, getCurrentUser } from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
  // ── Footer year ──────────────────────────────────────────────
  const footerYear = document.getElementById("footer-year");
  if (footerYear) footerYear.textContent = new Date().getFullYear();

  // ── Auth nav ─────────────────────────────────────────────────
  renderAuthNav();

  // ── Tab switching (used on legacy single-page views) ─────────
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      const panel = document.getElementById(btn.dataset.target);
      if (panel) panel.classList.add("active");
    });
  });

  // ── Jobs ─────────────────────────────────────────────────────
  async function loadJobs() {
    const list = document.getElementById("jobs-list");
    if (!list) return;

    const res  = await fetch("/api/jobs");
    const jobs = await res.json();
    const user = getCurrentUser();

    list.innerHTML = jobs.map((job) => {
      const skills = job.skills
        .map((s) => `<span class="skill-tag">${s}</span>`)
        .join("");

      // "Hire / Pay" button — visible to logged-in employers only
      const hireBtn = user && user.role === "employer"
        ? `<a class="hire-btn" href="payment.html?job=${job.id}">💳 Hire &amp; Pay</a>`
        : user
        ? "" // freelancer — no hire button
        : `<a class="hire-btn hire-btn--ghost" href="login.html">Login to Hire</a>`;

      return `
        <div class="card">
          <h3>${job.title}</h3>
          <p><strong>Budget:</strong> ₹${job.budget.toLocaleString()}</p>
          <p><strong>Location:</strong> ${job.location} · ${job.jobType}</p>
          <p style="margin-top:0.5rem; font-size:0.88rem; color:var(--text-secondary);">${job.description}</p>
          <div style="margin-top:0.75rem;">${skills}</div>
          <div style="margin-top:1rem;">${hireBtn}</div>
        </div>`;
    }).join("");
  }

  // ── Freelancers ───────────────────────────────────────────────
  async function loadFreelancers() {
    const list = document.getElementById("freelancers-list");
    if (!list) return;

    const res         = await fetch("/api/freelancers");
    const freelancers = await res.json();
    const user        = getCurrentUser();

    list.innerHTML = freelancers.map((f) => {
      const skills = f.skills
        .map((s) => `<span class="skill-tag">${s}</span>`)
        .join("");
      const projects = f.projects
        .map((p) => {
          const tech = Array.isArray(p.technology) ? p.technology.join(", ") : p.technology;
          return `<li><strong>${p.title}</strong> — ${tech}</li>`;
        })
        .join("");

      // Trust score badge
      const trustColor = f.trustScore >= 95 ? "#34c759"
                       : f.trustScore >= 85 ? "#ff9f0a"
                       : "#ff3b30";
      const trustBadge = `<span class="trust-badge" style="background:${trustColor}10; color:${trustColor}; border:1px solid ${trustColor}40;">
        ★ ${f.trustScore}% Trust · ${f.completedJobs} jobs done
      </span>`;

      // Flag warning for freelancers with flags
      const flagWarning = f.flagCount > 0
        ? `<p class="flag-warning">⚠️ ${f.flagCount} report${f.flagCount > 1 ? "s" : ""} filed against this freelancer</p>`
        : "";

      // Report button — employers only
      const reportBtn = user && user.role === "employer"
        ? `<button class="report-btn" data-id="${f.id}">🚩 Report Freelancer</button>`
        : "";

      return `
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:0.5rem;">
            <div>
              <h3>${f.name}</h3>
              <p>${f.role} · ${f.location}</p>
            </div>
            ${trustBadge}
          </div>
          <p style="margin-top:0.5rem; font-size:0.88rem; color:var(--text-secondary);">${f.bio}</p>
          <div style="margin-top:0.6rem;">${skills}</div>
          <ul style="margin-top:0.75rem;">${projects}</ul>
          <p style="margin-top:0.5rem; font-size:0.85rem; color:var(--text-secondary);">
            ₹${f.hourlyRate}/hr · ${f.availability}
          </p>
          ${flagWarning}
          <div style="margin-top:0.75rem;">${reportBtn}</div>
        </div>`;
    }).join("");

    // Attach report button events
    list.querySelectorAll(".report-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const confirmed = confirm(
          "Are you sure you want to report this freelancer for misconduct or fraud? This action is logged."
        );
        if (!confirmed) return;
        const res  = await fetch(`/api/freelancers/${btn.dataset.id}/flag`, { method: "PATCH" });
        const data = await res.json();
        if (res.ok) {
          alert(`Report submitted. This freelancer now has ${data.flagCount} flag(s) on their profile.`);
          loadFreelancers(); // refresh to show updated flag count
        } else {
          alert(data.error);
        }
      });
    });
  }

  // ── Proposals kanban ─────────────────────────────────────────
  async function loadProposals() {
    const col = document.getElementById("col-submitted");
    if (!col) return;

    const [proposalsRes, jobsRes, freelancersRes] = await Promise.all([
      fetch("/api/proposals"),
      fetch("/api/jobs"),
      fetch("/api/freelancers"),
    ]);
    const proposals   = await proposalsRes.json();
    const jobs        = await jobsRes.json();
    const freelancers = await freelancersRes.json();

    proposals.forEach((p) => {
      const job = jobs.find((j) => j.id == p.job_id);
      const fl  = freelancers.find((f) => f.id == p.freelancer_id);

      const card       = document.createElement("div");
      card.className   = "proposal-card";
      card.draggable   = true;
      card.id          = `proposal-${p.id}`;
      card.innerHTML   = `<strong>${fl ? fl.name : "Freelancer"}</strong><br>${
        job ? job.title : "Job"
      }<br>Bid: ₹${p.bid_amount.toLocaleString()}`;

      // Place card in correct column based on status
      const targetCol =
        p.status === "Accepted"      ? document.getElementById("col-accepted")
        : p.status === "Shortlisted" ||
          p.status === "Interviewing" ? document.getElementById("col-review")
        : col; // Submitted

      if (targetCol) targetCol.appendChild(card);
    });

    // Drag-and-drop with workflow transition rules
    let draggedCard = null;
    const notice = document.getElementById("kanban-notice");

    document.querySelectorAll(".proposal-card").forEach((card) => {
      card.addEventListener("dragstart", (e) => {
        draggedCard = card;
        e.dataTransfer.setData("text/plain", card.id);
        if (notice) notice.style.display = "none";
      });
      card.addEventListener("dragend", () => {
        draggedCard = null;
        document.querySelectorAll(".kanban-col").forEach((col) => {
          col.classList.remove("drag-over", "drag-invalid");
        });
      });
    });

    document.querySelectorAll(".kanban-col").forEach((column) => {
      column.addEventListener("dragover", (e) => {
        e.preventDefault();
        const sourceCol = draggedCard ? draggedCard.closest(".kanban-col") : null;
        
        // Disallow direct Submitted -> Accepted transition
        if (sourceCol && sourceCol.id === "col-submitted" && column.id === "col-accepted") {
          column.classList.add("drag-invalid");
          column.classList.remove("drag-over");
        } else {
          column.classList.add("drag-over");
          column.classList.remove("drag-invalid");
        }
      });

      column.addEventListener("dragleave", () => {
        column.classList.remove("drag-over", "drag-invalid");
      });

      column.addEventListener("drop", (e) => {
        e.preventDefault();
        column.classList.remove("drag-over", "drag-invalid");

        const id = e.dataTransfer.getData("text/plain");
        const card = document.getElementById(id);
        if (!card) return;

        const sourceCol = card.closest(".kanban-col");

        // Disallow direct move from Submitted to Accepted
        if (sourceCol && sourceCol.id === "col-submitted" && column.id === "col-accepted") {
          if (notice) {
            notice.innerHTML = "⚠️ <strong>Invalid Transition:</strong> Proposals in <em>'Submitted'</em> cannot jump directly to <em>'Accepted'</em>. Please screen and move them to <em>'In Review'</em> first.";
            notice.style.display = "block";
          } else {
            alert("⚠️ Proposals must first go through 'In Review' before being accepted.");
          }
          return;
        }

        if (notice) notice.style.display = "none";
        column.appendChild(card);
      });
    });
  }

  // ── Tasks (localStorage) ─────────────────────────────────────
  const TASKS_KEY = "freelancehub_tasks";

  function getTasks()       { return JSON.parse(localStorage.getItem(TASKS_KEY) || "[]"); }
  function saveTasks(tasks) { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); }

  function renderTasks() {
    const list = document.getElementById("task-list");
    if (!list) return;
    const tasks = getTasks();
    list.innerHTML = tasks
      .map(
        (t) => `
        <li class="${t.completed ? "completed" : ""}" data-id="${t.id}">
          <span>${t.text}</span>
          <button data-action="remove">✕</button>
        </li>`
      )
      .join("");
  }

  const taskForm = document.getElementById("task-form");
  if (taskForm) {
    taskForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("task-input");
      const text  = input.value.trim();
      if (!text) return;
      const tasks = getTasks();
      tasks.push({ id: Date.now(), text, completed: false });
      saveTasks(tasks);
      input.value = "";
      renderTasks();
    });
  }

  const taskList = document.getElementById("task-list");
  if (taskList) {
    taskList.addEventListener("click", (e) => {
      const li = e.target.closest("li");
      if (!li) return;
      const id = Number(li.dataset.id);
      let tasks = getTasks();
      if (e.target.dataset.action === "remove") {
        tasks = tasks.filter((t) => t.id !== id);
      } else {
        tasks = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
      }
      saveTasks(tasks);
      renderTasks();
    });
  }

  // ── Geolocation ───────────────────────────────────────────────
  const locateBtn = document.getElementById("locate-btn");
  if (locateBtn) {
    locateBtn.addEventListener("click", () => {
      const output = document.getElementById("location-output");
      if (!navigator.geolocation) {
        output.textContent = "Geolocation is not supported by your browser.";
        return;
      }
      output.textContent = "Locating…";
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          output.textContent = `📍 You are near latitude ${latitude.toFixed(4)}, longitude ${longitude.toFixed(4)}. Showing freelancers in your area (demo).`;
        },
        (err) => {
          output.textContent = `Unable to fetch location: ${err.message}`;
        }
      );
    });
  }

  // ── Boot all loaders ─────────────────────────────────────────
  loadJobs();
  loadFreelancers();
  loadProposals();
  renderTasks();
});
