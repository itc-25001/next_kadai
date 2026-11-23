"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import styles from "./page.module.css";

export default function LoginPage() {
  // ：ログインフォームの状態
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  //

  // ：ログイン・新規登録の処理
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      if (mode === "signup") {
        // 新規ユーザーを登録
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });

        if (error) {
          setMessage(error.message);
        } else if (data.session) {
          setMessage("登録とログインが完了しました。");
        } else {
          setMessage(
            "確認メールが届いたら、メール内のリンクを開いてください。",
          );
        }
      } else {
        // 登録済みユーザーがログイン
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setMessage(error.message);
        } else {
          setMessage("ログインに成功しました！");
        }
      }
    } catch {
      setMessage("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }
  //

  return (
    <main className={styles.page}>
      <h1>収支管理アプリ</h1>

      <h2>{mode === "signup" ? "新規登録" : "ログイン"}</h2>

      {/* ：認証フォーム */}
      <form onSubmit={handleSubmit} className={styles.form}>
        <label>
          メールアドレス
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          パスワード
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "処理中..." : mode === "signup" ? "新規登録" : "ログイン"}
        </button>
      </form>

      {/* ：ログインと新規登録を切り替える */}
      <button
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setMessage("");
        }}
      >
        {mode === "signup"
          ? "アカウントをお持ちの方はこちら"
          : "新規登録はこちら"}
      </button>

      <p role="status">{message}</p>
    </main>
  );
}
