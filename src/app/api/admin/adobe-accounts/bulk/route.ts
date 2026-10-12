import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Generate random credentials for permanent account
function generatePermanentCredentials(domain = "subsdealer.com") {
  const randomStr = crypto.randomBytes(4).toString('hex');
  const email = `adobe_${randomStr}@${domain}`;
  
  // Strong permanent password
  const password = `Ad@${crypto.randomBytes(6).toString('hex')}!9`;
  
  return { email, password };
}

// POST: Generate multiple Adobe accounts at once
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { count = 5 } = body;

    if (count < 1 || count > 50) {
      return NextResponse.json(
        { success: false, error: 'Count must be between 1 and 50' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const accounts = [];

    // Generate multiple accounts
    for (let i = 0; i < count; i++) {
      const { email, password } = generatePermanentCredentials();
      accounts.push({
        email,
        password,
        is_used: false,
        created_at: new Date().toISOString()
      });
    }

    // Bulk insert to Supabase
    const { data, error } = await supabase
      .from('adobe_accounts')
      .insert(accounts)
      .select();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: `${count} accounts generated and saved successfully!`,
      accounts: data 
    });
  } catch (err: any) {
    console.error('Error bulk generating accounts:', err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
