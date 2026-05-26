const year = document.getElementById("year");
year.textContent = new Date().getFullYear();

const root = document.documentElement;
const savedTheme = localStorage.getItem("theme") || "dark";
root.dataset.theme = savedTheme;

document.getElementById("theme-toggle").addEventListener("click", () => {
  const next = root.dataset.theme === "light" ? "dark" : "light";
  root.dataset.theme = next;
  localStorage.setItem("theme", next);
});

const nav = document.getElementById("nav");
document.getElementById("menu-toggle").addEventListener("click", () => {
  nav.classList.toggle("open");
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", () => nav.classList.remove("open"));
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add("visible");
  });
}, { threshold: 0.14 });

document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
