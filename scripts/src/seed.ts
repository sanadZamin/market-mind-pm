import { db, usersTable, projectsTable, tasksTable } from "@workspace/db";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  // Check if already seeded
  const existing = await db.select().from(usersTable);
  if (existing.length > 0) {
    console.log("Database already seeded.");
    process.exit(0);
  }

  // Create demo users
  const passwordHash = await bcrypt.hash("password123", 10);
  const [alice, bob, carol] = await db.insert(usersTable).values([
    { name: "Alice Johnson", email: "alice@demo.com", passwordHash, role: "admin", avatarUrl: null },
    { name: "Bob Smith", email: "bob@demo.com", passwordHash, role: "member", avatarUrl: null },
    { name: "Carol Williams", email: "carol@demo.com", passwordHash, role: "member", avatarUrl: null },
  ]).returning();

  console.log("Created users");

  // Create demo projects
  const [projectA, projectB] = await db.insert(projectsTable).values([
    {
      name: "Website Redesign",
      description: "Complete overhaul of the company website with modern design",
      color: "#6366f1",
      status: "active",
      ownerId: alice.id,
      startDate: "2026-03-01",
      endDate: "2026-05-31",
    },
    {
      name: "Mobile App v2",
      description: "Second version of the mobile application with new features",
      color: "#10b981",
      status: "active",
      ownerId: alice.id,
      startDate: "2026-02-15",
      endDate: "2026-06-30",
    },
  ]).returning();

  console.log("Created projects");

  // Create demo tasks for project A
  await db.insert(tasksTable).values([
    {
      title: "Design system setup",
      description: "Set up color palette, typography, and component library",
      status: "done",
      priority: "high",
      projectId: projectA.id,
      reporterId: alice.id,
      assigneeId: bob.id,
      startDate: "2026-03-01",
      dueDate: "2026-03-15",
      estimatedHours: 16,
      tags: ["design", "setup"],
      position: 0,
    },
    {
      title: "Homepage layout",
      description: "Create responsive homepage with hero section and feature cards",
      status: "in_progress",
      priority: "high",
      projectId: projectA.id,
      reporterId: alice.id,
      assigneeId: carol.id,
      startDate: "2026-03-10",
      dueDate: "2026-03-25",
      estimatedHours: 24,
      tags: ["frontend", "layout"],
      position: 1,
    },
    {
      title: "Navigation component",
      description: "Build responsive navigation with mobile hamburger menu",
      status: "in_progress",
      priority: "medium",
      projectId: projectA.id,
      reporterId: bob.id,
      assigneeId: bob.id,
      startDate: "2026-03-12",
      dueDate: "2026-03-20",
      estimatedHours: 8,
      tags: ["frontend", "component"],
      position: 2,
    },
    {
      title: "Contact page form",
      description: "Implement contact form with validation and email sending",
      status: "todo",
      priority: "medium",
      projectId: projectA.id,
      reporterId: alice.id,
      assigneeId: null,
      startDate: "2026-03-20",
      dueDate: "2026-04-05",
      estimatedHours: 12,
      tags: ["backend", "form"],
      position: 3,
    },
    {
      title: "SEO optimization",
      description: "Add meta tags, structured data, and sitemap",
      status: "todo",
      priority: "low",
      projectId: projectA.id,
      reporterId: carol.id,
      assigneeId: carol.id,
      startDate: "2026-04-01",
      dueDate: "2026-04-20",
      estimatedHours: 8,
      tags: ["seo"],
      position: 4,
    },
    {
      title: "Performance testing",
      description: "Run Lighthouse audits and fix performance issues",
      status: "in_review",
      priority: "high",
      projectId: projectA.id,
      reporterId: alice.id,
      assigneeId: bob.id,
      startDate: "2026-03-25",
      dueDate: "2026-04-10",
      estimatedHours: 16,
      tags: ["testing", "performance"],
      position: 5,
    },
  ]);

  // Create demo tasks for project B
  await db.insert(tasksTable).values([
    {
      title: "Authentication flow",
      description: "Implement login, registration, and password reset",
      status: "done",
      priority: "urgent",
      projectId: projectB.id,
      reporterId: alice.id,
      assigneeId: alice.id,
      startDate: "2026-02-15",
      dueDate: "2026-03-01",
      estimatedHours: 20,
      tags: ["auth", "backend"],
      position: 0,
    },
    {
      title: "Push notifications",
      description: "Implement push notifications for iOS and Android",
      status: "in_progress",
      priority: "high",
      projectId: projectB.id,
      reporterId: alice.id,
      assigneeId: bob.id,
      startDate: "2026-03-05",
      dueDate: "2026-03-30",
      estimatedHours: 24,
      tags: ["mobile", "notifications"],
      position: 1,
    },
    {
      title: "Offline mode",
      description: "Add offline support with local data sync",
      status: "todo",
      priority: "medium",
      projectId: projectB.id,
      reporterId: carol.id,
      assigneeId: carol.id,
      startDate: "2026-04-01",
      dueDate: "2026-05-15",
      estimatedHours: 40,
      tags: ["mobile", "sync"],
      position: 2,
    },
    {
      title: "Dark mode support",
      description: "Implement dark mode theme toggle",
      status: "todo",
      priority: "low",
      projectId: projectB.id,
      reporterId: bob.id,
      assigneeId: null,
      startDate: "2026-04-15",
      dueDate: "2026-05-01",
      estimatedHours: 12,
      tags: ["ui", "theme"],
      position: 3,
    },
  ]);

  console.log("Created tasks");
  console.log("Seeding complete!");
  console.log("\nDemo accounts:");
  console.log("  alice@demo.com / password123 (admin)");
  console.log("  bob@demo.com / password123");
  console.log("  carol@demo.com / password123");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
