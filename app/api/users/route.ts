import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  })
  return NextResponse.json(users)
}


