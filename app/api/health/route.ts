import { NextResponse } from 'next/server';
export async function GET() { return NextResponse.json({ status: "ok", paymentPolicy: "Desk Payment Only" }); }
