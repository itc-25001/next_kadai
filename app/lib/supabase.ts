import { createClient } from "@supabase/supabase-js";

// 始め：Supabaseの接続情報
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Supabaseクライアントを作成
export const supabase = createClient(supabaseUrl, supabaseKey);
// 終わり
