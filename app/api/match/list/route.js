// app/api/match/list/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Match from "@/modals/Match";

export async function GET() {
  try {
    await dbConnect();
    const matches = await Match.find({}, "matchId players currentIndex").lean();
    return NextResponse.json(matches);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
