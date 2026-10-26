/** Throwaway smoke test — boots the real server (tsx) in a temp dir and
 * exercises the new course-create / module-media flows over HTTP. */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, () => { const p = s.address().port; s.close(() => resolve(p)); });
    s.on("error", reject);
  });
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dma-verify-"));
const port = await freePort();
const base = `http://127.0.0.1:${port}`;
let log = "";
const env = {
  ...process.env,
  NODE_ENV: "development",
  PORT: String(port),
  JWT_SECRET: "verify-secret-verify-secret-verify-secret-123",
  SEED_ADMIN_EMAIL: "admin@verify.test",
  SEED_ADMIN_PASSWORD: "Admin-Pw-123!",
  SEED_SUPER_ADMIN_EMAIL: "su@verify.test",
  SEED_SUPER_ADMIN_PASSWORD: "Admin-Pw-123!",
};
delete env.DATABASE_URL; delete env.DIRECT_URL; delete env.SMTP_PASS;

const proc = spawn(process.execPath, [path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs"), path.join(ROOT, "server.ts")], { cwd: tmp, env });
proc.stdout.on("data", d => (log += d));
proc.stderr.on("data", d => (log += d));

const t0 = Date.now();
while (!log.includes("Academy running")) {
  if (Date.now() - t0 > 30000) { console.error("SERVER FAILED TO BOOT:\n" + log); process.exit(1); }
  await new Promise(r => setTimeout(r, 100));
}

async function api(method, url, body, cookie) {
  const res = await fetch(base + url, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  const sc = res.headers.get("set-cookie") || "";
  return { status: res.status, body: json, raw: text, cookie: sc.split(";")[0] };
}

let failures = 0;
function check(name, cond, extra) {
  if (cond) console.log(`  PASS ${name}`);
  else { failures++; console.log(`  FAIL ${name}${extra ? " — " + extra : ""}`); }
}

try {
  // ── Admin flow ────────────────────────────────────────────────────────────
  console.log("[admin]");
  let r = await api("POST", "/api/auth/login", { email: "admin@verify.test", password: "Admin-Pw-123!" });
  check("seeded admin logs in (forced-change flag set)", r.status === 200 && r.body?.user?.mustChangePassword === true, `got ${r.status}`);
  const firstCookie = r.cookie;
  r = await api("GET", "/api/db-state", undefined, firstCookie);
  check("admin APIs blocked until password change", r.status === 403 && r.body?.code === "PASSWORD_CHANGE_REQUIRED", `got ${r.status} ${JSON.stringify(r.body)}`);
  r = await api("POST", "/api/auth/change-password", { currentPassword: "Admin-Pw-123!", newPassword: "New-Admin-Pw-1!" }, firstCookie);
  check("change password succeeds", r.status === 200, `got ${r.status} ${JSON.stringify(r.body)}`);
  r = await api("POST", "/api/auth/login", { email: "admin@verify.test", password: "New-Admin-Pw-1!" });
  const adminLogin = r.cookie;
  const adminName = r.body?.user?.name;
  check("admin login after change", r.status === 200 && !!adminLogin, `got ${r.status}`);

  // create WITH lessons + quizzes + editable created-by name → must be auto-published
  r = await api("POST", "/api/courses/create", {
    title: "Admin Smoke Course", category: "Digital Twin", description: "d",
    instructorName: "Custom Creator Name",
    lessons: [
      { id: "m1", title: "PDF module", type: "pdf", duration: "5 mins", contentUrl: "", isRequired: true },
      { id: "m2", title: "Deck module", type: "pptx", duration: "5 mins", contentUrl: "https://example.com/deck.pptx", isRequired: true },
      { id: "m3", title: "Image module", type: "image", duration: "1 min", contentUrl: "", isRequired: true },
    ],
    quizzes: [{ id: "q1", title: "Quiz", passingScore: 75, questions: [{ id: "qq1", question: "Q?", options: ["a", "b"], correctAnswer: 0 }] }],
  }, adminLogin);
  check("admin create returns success", r.status === 200 && r.body?.status === "success", `got ${r.status} ${JSON.stringify(r.body)?.slice(0, 200)}`);
  const adminCourse = r.body?.course;
  check("admin course auto-published (no approval)", adminCourse?.isPublished === true && adminCourse?.approvalStatus === "approved", JSON.stringify({ p: adminCourse?.isPublished, a: adminCourse?.approvalStatus }));
  check("lessons persisted on create (was the bug)", (adminCourse?.lessons || []).length === 3, `got ${(adminCourse?.lessons || []).length}`);
  check("quizzes persisted on create", (adminCourse?.quizzes || []).length === 1);
  check("editable created-by name honoured", adminCourse?.instructorName === "Custom Creator Name", `got ${adminCourse?.instructorName}`);

  // published immediately in public listing?
  r = await api("GET", "/api/courses");
  check("admin course visible in public list", Array.isArray(r.body) && r.body.some(c => c.id === adminCourse.id));

  // optional created-by name (empty → account name)
  r = await api("POST", "/api/courses/create", { title: "No Name Course", category: "Sustainability" }, adminLogin);
  check("created-by name optional (defaults to account name)", r.status === 200 && r.body?.course?.instructorName === adminName, `got ${r.body?.course?.instructorName} want ${adminName}`);

  // ── Module media upload ───────────────────────────────────────────────────
  console.log("[media]");
  const tinyPdf = Buffer.from("%PDF-1.4 tiny smoke pdf").toString("base64");
  r = await api("POST", "/api/courses/media", { name: "module.pdf", dataUrl: `data:application/pdf;base64,${tinyPdf}` }, adminLogin);
  check("small PDF upload accepted", r.status === 201 && r.body?.status === "success" && r.body.url, `got ${r.status} ${JSON.stringify(r.body)?.slice(0, 160)}`);
  const mediaUrl = r.body?.url;
  if (mediaUrl) {
    const get = await fetch(base + mediaUrl);
    const ct = get.headers.get("content-type") || "";
    const bytes = Buffer.from(await get.arrayBuffer());
    check("uploaded PDF served back with right mime+bytes", get.status === 200 && ct.includes("application/pdf") && bytes.equals(Buffer.from(tinyPdf, "base64")), `got ${get.status} ${ct}`);
  }

  const deck = Buffer.from("PK-zip-ish pptx bytes").toString("base64");
  r = await api("POST", "/api/courses/media", { name: "lecture.pptx", dataUrl: `data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,${deck}` }, adminLogin);
  check("PPTX upload accepted", r.status === 201 && !!r.body?.url, `got ${r.status}`);

  r = await api("POST", "/api/courses/media", { name: "pic.png", dataUrl: `data:image/png;base64,${Buffer.from("png").toString("base64")}` }, adminLogin);
  check("image upload accepted", r.status === 201 && !!r.body?.url, `got ${r.status}`);

  r = await api("POST", "/api/courses/media", { name: "bad.exe", dataUrl: `data:application/octet-stream;base64,${Buffer.from("x").toString("base64")}` }, adminLogin);
  check("disallowed extension rejected (400)", r.status === 400, `got ${r.status}`);

  // 21MB file → must be rejected with 413 (proves the 20MB cap works and the
  // 40MB JSON body limit lets us actually reach the check).
  console.log("[21MB oversized upload]");
  const big = Buffer.alloc(21 * 1024 * 1024, 7).toString("base64");
  r = await api("POST", "/api/courses/media", { name: "huge.pdf", dataUrl: `data:application/pdf;base64,${big}` }, adminLogin);
  check("21MB upload rejected with 413", r.status === 413, `got ${r.status} ${JSON.stringify(r.body)?.slice(0, 120)}`);

  // 20MB-limit path must not be reachable without auth
  r = await api("POST", "/api/courses/media", { name: "anon.pdf", dataUrl: `data:application/pdf;base64,${tinyPdf}` });
  check("anonymous upload rejected (401)", r.status === 401, `got ${r.status}`);

  // ── Instructor flow ───────────────────────────────────────────────────────
  console.log("[instructor]");
  r = await api("POST", "/api/auth/register", { name: "Prof Smoke", email: "instr@verify.test", password: "Instr-Pw-123!", role: "instructor" });
  check("instructor registers", r.status === 201, `got ${r.status}`);
  r = await api("POST", "/api/auth/login", { email: "instr@verify.test", password: "Instr-Pw-123!" });
  check("unapproved instructor cannot log in yet (403)", r.status === 403, `got ${r.status}`);

  // admin approves the instructor account, then the instructor can log in
  r = await api("GET", "/api/admin/users", undefined, adminLogin);
  const instrUser = (r.body?.users || []).find(u => u.email === "instr@verify.test");
  check("admin can list users", !!instrUser, JSON.stringify(r.body)?.slice(0, 120));
  if (instrUser) {
    r = await api("POST", "/api/admin/approve-instructor", { instructorId: instrUser.id }, adminLogin);
    check("admin approves instructor", r.status === 200, `got ${r.status}`);
  }
  r = await api("POST", "/api/auth/login", { email: "instr@verify.test", password: "Instr-Pw-123!" });
  const instrCookie = r.cookie;
  check("approved instructor logs in", r.status === 200 && !!instrCookie, `got ${r.status}`);

  r = await api("POST", "/api/courses/create", {
    title: "Instructor Smoke Course", category: "Industrial Robotics",
    lessons: [{ id: "im1", title: "Video module", type: "video", duration: "9 mins", contentUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", isRequired: true }],
    quizzes: [{ id: "iq1", title: "IQ", passingScore: 75, questions: [{ id: "iqq1", question: "Q?", options: ["a", "b"], correctAnswer: 1 }] }],
  }, instrCookie);
  check("approved instructor create succeeds", r.status === 200 && r.body?.status === "success", `got ${r.status} ${JSON.stringify(r.body)?.slice(0, 160)}`);
  const instrCourse = r.body?.course;
  check("instructor course starts as draft (needs approval)", instrCourse?.isPublished === false && instrCourse?.approvalStatus === "draft");
  check("instructor lessons persisted", (instrCourse?.lessons || []).length === 1);

  // instructor sees their own draft in db-state (was invisible before)
  r = await api("GET", "/api/db-state", undefined, instrCookie);
  check("instructor db-state includes own draft", (r.body?.courses || []).some(c => c.id === instrCourse?.id), `got ${(r.body?.courses || []).length} courses`);

  // students still cannot see the draft
  r = await api("POST", "/api/auth/register", { name: "Stu", email: "stu@verify.test", password: "Stu-Pw-123!" });
  r = await api("GET", "/api/courses");
  check("draft hidden from public list", !(Array.isArray(r.body) && r.body.some(c => c.id === instrCourse?.id)));

  // submit for review → admin approves/publishes via update
  r = await api("POST", "/api/courses/submit-for-review", { courseId: instrCourse.id }, instrCookie);
  check("submit for review works", r.status === 200 && r.body?.status === "success", `got ${r.status}`);
  r = await api("POST", "/api/courses/update", { courseId: instrCourse.id, updates: { isPublished: true, approvalStatus: "approved" } }, adminLogin);
  check("admin publishes after review", r.status === 200 && r.body?.course?.isPublished === true, `got ${r.status}`);

  // instructor can edit own course incl. created-by name
  r = await api("POST", "/api/courses/update", { courseId: instrCourse.id, updates: { instructorName: "Renamed Creator" } }, instrCookie);
  check("owner can edit course + created-by name", r.status === 200 && r.body?.course?.instructorName === "Renamed Creator", `got ${r.status} ${r.body?.course?.instructorName}`);

  // admin can assign a course to another instructor at create time
  r = await api("POST", "/api/courses/create", { title: "Assigned Course", category: "Sustainability", instructorId: instrUser?.id, instructorName: "Team Course" }, adminLogin);
  check("admin can assign course to an instructor", r.status === 200 && r.body?.course?.instructorId === instrUser?.id, `got ${r.status}`);

} finally {
  proc.kill();
  try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch {}
}

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
