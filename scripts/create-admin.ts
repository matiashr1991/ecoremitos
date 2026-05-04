import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Register via Better Auth API
  const res = await fetch("http://localhost:3000/api/auth/sign-up/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:3000",
    },
    body: JSON.stringify({
      name: "Admin",
      email: process.env.ADMIN_EMAIL 
      password: process.env.ADMIN_PASSWORD 
    }),
  });
  const data = await res.json();
  console.log("Signup result:", JSON.stringify(data, null, 2));

  // Set role to admin
  if (data.user?.id) {
    await prisma.user.update({
      where: { id: data.user.id },
      data: { role: "admin" },
    });
    console.log("✅ Role updated to admin");
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
