const path = require("path");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-only-session-secret-change-me";

const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
if (!ADMIN_PASSWORD_HASH) {
  console.warn("[WARN] Brak ADMIN_PASSWORD_HASH w .env. Logowanie admina bedzie odrzucane.");
}

const rootDir = __dirname;

function sendHtml(fileName) {
  return (req, res) => {
    res.sendFile(path.join(rootDir, fileName));
  };
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.redirect("/login?next=/admin");
}

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 12
    }
  })
);

app.use("/public", express.static(path.join(rootDir, "public"), { index: false }));
app.get("/index.js", (req, res) => {
  res.sendFile(path.join(rootDir, "index.js"));
});

app.get("/", sendHtml("index.html"));
app.get("/index.html", sendHtml("index.html"));
app.get("/about.html", sendHtml("about.html"));
app.get("/recent.html", sendHtml("recent.html"));
app.get("/work.html", sendHtml("work.html"));
app.get("/contact.html", sendHtml("contact.html"));
app.get("/login", sendHtml("login.html"));

app.get("/admin", requireAdmin, sendHtml("admin.html"));
app.get("/admin.html", (req, res) => res.redirect("/admin"));

app.post("/auth/login", async (req, res) => {
  const { password, next = "/admin" } = req.body || {};
  if (!ADMIN_PASSWORD_HASH || !password) {
    return res.redirect("/login?error=1");
  }

  try {
    const isValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!isValid) {
      return res.redirect("/login?error=1");
    }

    req.session.isAdmin = true;
    return res.redirect(next === "/admin" ? "/admin" : "/admin");
  } catch (error) {
    return res.redirect("/login?error=1");
  }
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.redirect("/login?loggedOut=1");
  });
});

app.use((req, res) => {
  res.status(404).send("Nie znaleziono strony.");
});

app.listen(PORT, () => {
  console.log(`KGW server listening on http://localhost:${PORT}`);
});

