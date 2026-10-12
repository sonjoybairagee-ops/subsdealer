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

// GET: List all Adobe accounts (for admin panel)
export async function GET() {
  try {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('adobe_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      accounts: data || []
    });
  } catch (err: any) {
    console.error('Error fetching Adobe accounts:', err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// POST: Generate and save a new Adobe account
export async function POST() {
  try {
    const supabase = createAdminClient();
    const { email, password } = generatePermanentCredentials();

    // Save to Supabase adobe_accounts table
    const { data, error } = await supabase
      .from('adobe_accounts')
      .insert([
        { 
          email: email, 
          password: password, 
          is_used: false, 
          created_at: new Date().toISOString() 
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: 'Account generated and saved successfully!',
      account: { email, password } 
    });
  } catch (err: any) {
    console.error('Error saving account:', err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// PATCH: Update account status (mark as used/not used)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, is_used } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Account ID is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('adobe_accounts')
      .update({ is_used, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: 'Account status updated successfully!',
      account: data 
    });
  } catch (err: any) {
    console.error('Error updating account:', err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// DELETE: Delete an account
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Account ID is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    
    const { error } = await supabase
      .from('adobe_accounts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: 'Account deleted successfully!' 
    });
  } catch (err: any) {
    console.error('Error deleting account:', err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
