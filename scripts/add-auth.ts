import fs from 'fs';
import path from 'path';

const files = [
  'notifications/route.ts',
  'activities/route.ts',
  'policies/route.ts',
  'settings/route.ts',
  'extensions/route.ts'
].map(f => path.join('d:/seven-rocks/dashboard/app/api', f));

const authHeader = `
import { parseSessionCookie, SESSION_COOKIE_NAME } from '../../../lib/auth';
import { cookies } from 'next/headers';

async function checkAdmin() {
  const cookieStore = await cookies();
  const sessionVal = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await parseSessionCookie(sessionVal);
  if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) {
    return false;
  }
  return true;
}
`;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  
  if (content.includes('checkAdmin()')) continue;

  // Insert header right after last import
  const lastImportIndex = content.lastIndexOf('import ');
  const endOfImports = content.indexOf('\n', lastImportIndex) + 1;
  
  content = content.substring(0, endOfImports) + authHeader + content.substring(endOfImports);
  
  // Protect GET
  content = content.replace('export async function GET() {\n  try {', 'export async function GET() {\n  try {\n    if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });');
  
  // Protect POST
  content = content.replace('export async function POST(req: Request) {\n  try {', 'export async function POST(req: Request) {\n  try {\n    if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });');

  // Protect PATCH
  content = content.replace('export async function PATCH(req: Request) {\n  try {', 'export async function PATCH(req: Request) {\n  try {\n    if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });');
  
  fs.writeFileSync(file, content);
  console.log('Updated ' + file);
}
